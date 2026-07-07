'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'

export default function ClientesPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'edit' | null>(null)
  const [editing, setEditing] = useState<Partial<Customer> | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data as Customer[] ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const d = editing!
    const payload = {
      name: d.name, phone: d.phone || null, email: d.email || null,
      address: d.address || null, notes: d.notes || null,
    }
    if (d.id) {
      await supabase.from('customers').update(payload).eq('id', d.id)
    } else {
      await supabase.from('customers').insert(payload)
    }
    setSaving(false); setModal(null); setEditing(null); load()
  }

  const filtered = customers.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) || (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-subtitle">{customers.length} cadastrado(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing({}); setModal('edit') }}>+ Novo Cliente</button>
      </div>

      <input placeholder="Buscar por nome, telefone ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16, width: '100%', maxWidth: 420 }} />

      <div className="card card-p0">
        {loading ? <div className="empty"><p>Carregando...</p></div>
          : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">👥</div>
              <h3>{search ? 'Nenhum resultado' : 'Nenhum cliente'}</h3>
              <p>{search ? 'Tente outro termo' : 'Clientes de pedidos delivery/retirada aparecem aqui'}</p>
              {!search && <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { setEditing({}); setModal('edit') }}>+ Cadastrar cliente</button>}
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Endereço</th><th>Obs</th><th></th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>{c.phone || '—'}</td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>{c.email || '—'}</td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.78rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                    <td style={{ color: 'var(--tx3)', fontSize: '.78rem' }}>{c.notes || '—'}</td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => { setEditing({...c}); setModal('edit') }}>✏️</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {modal === 'edit' && editing && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>{editing.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="fgrid">
                  <div className="fg-full"><label>Nome *</label><input value={editing.name ?? ''} onChange={e => setEditing(x => ({...x, name: e.target.value}))} required /></div>
                  <div><label>Telefone</label><input type="tel" value={editing.phone ?? ''} onChange={e => setEditing(x => ({...x, phone: e.target.value}))} placeholder="(00) 00000-0000" /></div>
                  <div><label>E-mail</label><input type="email" value={editing.email ?? ''} onChange={e => setEditing(x => ({...x, email: e.target.value}))} /></div>
                  <div className="fg-full"><label>Endereço</label><input value={editing.address ?? ''} onChange={e => setEditing(x => ({...x, address: e.target.value}))} placeholder="Rua, número, bairro, cidade" /></div>
                  <div className="fg-full"><label>Observações</label><textarea rows={2} value={editing.notes ?? ''} onChange={e => setEditing(x => ({...x, notes: e.target.value}))} /></div>
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
