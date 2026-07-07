'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Table } from '@/types/database'

const STATUS_OPTS = [
  { value: 'livre',     label: 'Livre',     badge: 'badge-green'  },
  { value: 'ocupada',   label: 'Ocupada',   badge: 'badge-red'    },
  { value: 'reservada', label: 'Reservada', badge: 'badge-yellow' },
  { value: 'bloqueada', label: 'Bloqueada', badge: 'badge-gray'   },
]

export default function MesasPage() {
  const supabase = createClient()
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'edit' | null>(null)
  const [editing, setEditing] = useState<Partial<Table> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tables').select('*').order('number')
    setTables(data as Table[] ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const d = editing!
    const payload = {
      number: String(d.number), capacity: Number(d.capacity ?? 4),
      location: d.location || null, active: d.active !== false,
    }
    if (d.id) {
      await supabase.from('tables').update(payload).eq('id', d.id)
    } else {
      await supabase.from('tables').insert({ ...payload, status: 'livre' })
    }
    setSaving(false); setModal(null); setEditing(null); load()
  }

  async function setStatus(id: string, status: string) {
    await supabase.from('tables').update({ status }).eq('id', id)
    load()
  }

  async function deleteTable(id: string) {
    if (!confirm('Remover esta mesa?')) return
    await supabase.from('tables').delete().eq('id', id)
    load()
  }

  const counts = STATUS_OPTS.reduce((acc, s) => {
    acc[s.value] = tables.filter(t => t.status === s.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mesas</div>
          <div className="page-subtitle">{tables.length} mesas · {counts.livre ?? 0} livres · {counts.ocupada ?? 0} ocupadas</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing({ active: true, capacity: 4 }); setModal('edit') }}>+ Nova Mesa</button>
      </div>

      {/* Grid visual */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {loading ? <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--tx2)' }}>Carregando...</div>
          : tables.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🪑</div>
              <p style={{ color: 'var(--tx2)' }}>Nenhuma mesa cadastrada</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => { setEditing({ active: true, capacity: 4 }); setModal('edit') }}>+ Adicionar mesa</button>
            </div>
          ) : tables.map(t => {
            const st = STATUS_OPTS.find(s => s.value === t.status) ?? STATUS_OPTS[0]
            return (
              <div key={t.id} style={{
                borderRadius: 12, border: `2px solid ${t.status === 'livre' ? '#bbf7d0' : t.status === 'ocupada' ? '#fecaca' : t.status === 'reservada' ? '#fde68a' : '#e2e8f0'}`,
                background: t.status === 'livre' ? 'var(--green-bg)' : t.status === 'ocupada' ? 'var(--red-bg)' : t.status === 'reservada' ? 'var(--yellow-bg)' : 'var(--bg)',
                padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <div style={{ fontSize: '1.4rem' }}>{t.status === 'livre' ? '🟢' : t.status === 'ocupada' ? '🔴' : t.status === 'reservada' ? '🟡' : '⚫'}</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Mesa {t.number}</div>
                <div style={{ fontSize: '.72rem', color: 'var(--tx2)' }}>{t.capacity} lugares</div>
                {t.location && <div style={{ fontSize: '.68rem', color: 'var(--tx3)' }}>{t.location}</div>}
                <span className={`badge ${st.badge}`} style={{ fontSize: '.65rem' }}>{st.label}</span>
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => { setEditing({...t}); setModal('edit') }}>✏️</button>
                  {t.status !== 'livre' && (
                    <button className="btn btn-ghost btn-xs" onClick={() => setStatus(t.id, 'livre')} title="Liberar">✓</button>
                  )}
                </div>
              </div>
            )
          })}
      </div>

      {/* Tabela detalhada */}
      {tables.length > 0 && (
        <div className="card card-p0">
          <table className="tbl">
            <thead><tr><th>Mesa</th><th>Capacidade</th><th>Localização</th><th>Status</th><th>Ativa</th><th></th></tr></thead>
            <tbody>
              {tables.map(t => {
                const st = STATUS_OPTS.find(s => s.value === t.status) ?? STATUS_OPTS[0]
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 700 }}>Mesa {t.number}</td>
                    <td>{t.capacity} lugares</td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>{t.location || '—'}</td>
                    <td>
                      <select value={t.status} onChange={e => setStatus(t.id, e.target.value)}
                        style={{ padding: '3px 8px', fontSize: '.78rem', borderRadius: 6, border: '1px solid var(--border)' }}>
                        {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td><span className={`badge ${t.active ? 'badge-green' : 'badge-gray'}`}>{t.active ? 'Sim' : 'Não'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditing({...t}); setModal('edit') }}>✏️</button>
                        <button className="btn btn-danger btn-xs" onClick={() => deleteTable(t.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'edit' && editing && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>{editing.id ? 'Editar Mesa' : 'Nova Mesa'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label>Número / Nome *</label><input value={editing.number ?? ''} onChange={e => setEditing(x => ({...x, number: e.target.value}))} placeholder="Ex: 1, 2, VIP, Varanda" required /></div>
                <div><label>Capacidade (pessoas)</label><input type="number" min="1" max="30" value={editing.capacity ?? 4} onChange={e => setEditing(x => ({...x, capacity: Number(e.target.value)}))} /></div>
                <div><label>Localização</label><input value={editing.location ?? ''} onChange={e => setEditing(x => ({...x, location: e.target.value}))} placeholder="Ex: Salão, Varanda, VIP..." /></div>
                <div><label>Status</label>
                  <select value={editing.active !== false ? '1' : '0'} onChange={e => setEditing(x => ({...x, active: e.target.value === '1'}))}>
                    <option value="1">Ativa</option>
                    <option value="0">Inativa</option>
                  </select>
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
    </div>
  )
}
