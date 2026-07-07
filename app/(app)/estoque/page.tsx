'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ingredient } from '@/types/database'

const UNITS = ['kg', 'g', 'L', 'ml', 'un', 'cx', 'pct', 'dz']
const MOV_TYPES = [
  { value: 'entrada', label: '↑ Entrada / Compra' },
  { value: 'saida',   label: '↓ Saída / Consumo' },
  { value: 'ajuste',  label: '⚙ Ajuste de Inventário' },
  { value: 'perda',   label: '🗑 Perda / Descarte' },
]

export default function EstoquePage() {
  const supabase = createClient()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'edit' | 'mov' | null>(null)
  const [editing, setEditing] = useState<Partial<Ingredient> | null>(null)
  const [movItem, setMovItem] = useState<Ingredient | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [showLow, setShowLow] = useState(false)

  // Movement form
  const [movType, setMovType] = useState('entrada')
  const [movQty, setMovQty] = useState('')
  const [movNotes, setMovNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('ingredients').select('*').order('name')
    setIngredients(data as Ingredient[] ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const d = editing!
    const payload = {
      name: d.name, unit: d.unit ?? 'kg',
      current_stock: Number(d.current_stock ?? 0),
      min_stock: Number(d.min_stock ?? 0),
      cost_per_unit: Number(d.cost_per_unit ?? 0),
      supplier: d.supplier || null,
    }
    if (d.id) {
      await supabase.from('ingredients').update(payload).eq('id', d.id)
    } else {
      await supabase.from('ingredients').insert(payload)
    }
    setSaving(false); setModal(null); setEditing(null); load()
  }

  async function addMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!movItem) return
    setSaving(true)
    const qty = Number(movQty)
    const newStock = movType === 'entrada'
      ? movItem.current_stock + qty
      : movType === 'ajuste'
        ? qty
        : Math.max(0, movItem.current_stock - qty)

    await supabase.from('ingredient_movements').insert({
      ingredient_id: movItem.id, type: movType, quantity: qty,
      notes: movNotes || null, date: new Date().toISOString().split('T')[0],
    })
    await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', movItem.id)
    setSaving(false); setModal(null); setMovQty(''); setMovNotes(''); load()
  }

  const filtered = ingredients
    .filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()))
    .filter(i => !showLow || i.current_stock <= i.min_stock)

  const lowCount = ingredients.filter(i => i.current_stock <= i.min_stock && i.min_stock > 0).length

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Estoque</div>
          <div className="page-subtitle">{ingredients.length} ingredientes{lowCount > 0 ? ` · ⚠️ ${lowCount} abaixo do mínimo` : ''}</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing({ unit: 'kg' }); setModal('edit') }}>+ Ingrediente</button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input placeholder="Buscar ingrediente..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className={`btn btn-sm ${showLow ? 'btn-danger' : 'btn-secondary'}`} onClick={() => setShowLow(v => !v)}>
          ⚠️ Estoque baixo {lowCount > 0 && `(${lowCount})`}
        </button>
      </div>

      <div className="card card-p0">
        {loading ? <div className="empty"><p>Carregando...</p></div>
          : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <h3>{search ? 'Nenhum resultado' : 'Nenhum ingrediente'}</h3>
              <p>{search ? 'Tente outro termo' : 'Cadastre ingredientes para controlar o estoque'}</p>
              {!search && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { setEditing({ unit: 'kg' }); setModal('edit') }}>+ Adicionar ingrediente</button>}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ingrediente</th><th>Fornecedor</th>
                  <th style={{ textAlign: 'right' }}>Estoque atual</th>
                  <th style={{ textAlign: 'right' }}>Mínimo</th>
                  <th style={{ textAlign: 'right' }}>Custo/un</th>
                  <th>Situação</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const isLow = i.min_stock > 0 && i.current_stock <= i.min_stock
                  const isOut = i.current_stock <= 0
                  return (
                    <tr key={i.id} style={{ background: isOut ? '#fff5f5' : isLow ? '#fffbeb' : undefined }}>
                      <td style={{ fontWeight: 700 }}>{i.name}</td>
                      <td style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>{i.supplier || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: isOut ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--green)' }}>
                        {i.current_stock} {i.unit}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--tx2)', fontSize: '.82rem' }}>{i.min_stock > 0 ? `${i.min_stock} ${i.unit}` : '—'}</td>
                      <td style={{ textAlign: 'right', color: 'var(--tx2)', fontSize: '.82rem' }}>
                        {i.cost_per_unit > 0 ? `R$ ${Number(i.cost_per_unit).toFixed(2).replace('.',',')}` : '—'}
                      </td>
                      <td>
                        {isOut ? <span className="badge badge-red">Sem estoque</span>
                          : isLow ? <span className="badge badge-yellow">Estoque baixo</span>
                          : <span className="badge badge-green">OK</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-primary btn-xs" onClick={() => { setMovItem(i); setMovType('entrada'); setModal('mov') }} title="Movimentar">+/-</button>
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditing({...i}); setModal('edit') }}>✏️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      {/* Modal ingrediente */}
      {modal === 'edit' && editing && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>{editing.id ? 'Editar Ingrediente' : 'Novo Ingrediente'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="fgrid">
                  <div className="fg-full"><label>Nome *</label><input value={editing.name ?? ''} onChange={e => setEditing(x => ({...x, name: e.target.value}))} required /></div>
                  <div><label>Unidade</label>
                    <select value={editing.unit ?? 'kg'} onChange={e => setEditing(x => ({...x, unit: e.target.value}))}>
                      {UNITS.map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div><label>Estoque atual</label><input type="number" step="0.001" min="0" value={editing.current_stock ?? 0} onChange={e => setEditing(x => ({...x, current_stock: Number(e.target.value)}))} /></div>
                  <div><label>Estoque mínimo</label><input type="number" step="0.001" min="0" value={editing.min_stock ?? 0} onChange={e => setEditing(x => ({...x, min_stock: Number(e.target.value)}))} /></div>
                  <div><label>Custo por unidade (R$)</label><input type="number" step="0.01" min="0" value={editing.cost_per_unit ?? 0} onChange={e => setEditing(x => ({...x, cost_per_unit: Number(e.target.value)}))} /></div>
                  <div><label>Fornecedor</label><input value={editing.supplier ?? ''} onChange={e => setEditing(x => ({...x, supplier: e.target.value}))} /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal movimentação */}
      {modal === 'mov' && movItem && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Movimentar: {movItem.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={addMovement}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '8px 12px', fontSize: '.83rem', color: 'var(--tx2)' }}>
                  Estoque atual: <strong style={{ color: 'var(--tx)' }}>{movItem.current_stock} {movItem.unit}</strong>
                </div>
                <div><label>Tipo</label>
                  <select value={movType} onChange={e => setMovType(e.target.value)}>
                    {MOV_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div><label>{movType === 'ajuste' ? 'Novo saldo' : 'Quantidade'} ({movItem.unit}) *</label>
                  <input type="number" step="0.001" min="0" value={movQty} onChange={e => setMovQty(e.target.value)} required autoFocus />
                </div>
                <div><label>Observação</label><input value={movNotes} onChange={e => setMovNotes(e.target.value)} placeholder="Opcional..." /></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '📦 Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
