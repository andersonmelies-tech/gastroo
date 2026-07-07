'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RestaurantMember } from '@/types/database'

const ROLES: Record<string, { label: string; badge: string }> = {
  owner:   { label: 'Proprietário', badge: 'badge-purple' },
  manager: { label: 'Gerente',      badge: 'badge-blue'   },
  cashier: { label: 'Caixa',        badge: 'badge-orange' },
  waiter:  { label: 'Garçom',       badge: 'badge-green'  },
  cook:    { label: 'Cozinha',      badge: 'badge-yellow' },
}

export default function UsuariosPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<(RestaurantMember & { users: { email: string; full_name?: string } | null })[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'invite' | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('waiter')
  const [saving, setSaving] = useState(false)
  const [currentRole, setCurrentRole] = useState<string>('waiter')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('restaurant_members')
      .select('*, users:user_id(email, full_name)')
      .order('created_at')
    setMembers(data as typeof members ?? [])

    const { data: { user } } = await supabase.auth.getUser()
    const me = (data ?? []).find(m => m.user_id === user?.id)
    if (me) setCurrentRole(me.role)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function updateRole(id: string, role: string) {
    await supabase.from('restaurant_members').update({ role }).eq('id', id)
    load()
  }

  async function deactivate(id: string) {
    if (!confirm('Remover acesso deste usuário?')) return
    await supabase.from('restaurant_members').update({ active: false }).eq('id', id)
    load()
  }

  const canManage = currentRole === 'owner' || currentRole === 'manager'

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-subtitle">{members.filter(m=>m.active).length} membro(s) ativo(s)</div>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setModal('invite')}>+ Convidar</button>
        )}
      </div>

      <div className="card card-p0">
        {loading ? <div className="empty"><p>Carregando...</p></div>
          : members.length === 0 ? <div className="empty"><p>Nenhum usuário</p></div>
          : (
            <table className="tbl">
              <thead><tr><th>Usuário</th><th>E-mail</th><th>Função</th><th>Status</th>{canManage && <th></th>}</tr></thead>
              <tbody>
                {members.map(m => {
                  const role = ROLES[m.role] ?? { label: m.role, badge: 'badge-gray' }
                  return (
                    <tr key={m.id} style={{ opacity: m.active ? 1 : .5 }}>
                      <td style={{ fontWeight: 700 }}>{m.users?.full_name || 'Usuário'}</td>
                      <td style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>{m.users?.email || '—'}</td>
                      <td>
                        {canManage && m.role !== 'owner' ? (
                          <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                            style={{ padding: '3px 8px', fontSize: '.78rem', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {Object.entries(ROLES).filter(([k]) => k !== 'owner').map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        ) : <span className={`badge ${role.badge}`}>{role.label}</span>}
                      </td>
                      <td><span className={`badge ${m.active ? 'badge-green' : 'badge-gray'}`}>{m.active ? 'Ativo' : 'Inativo'}</span></td>
                      {canManage && (
                        <td>
                          {m.role !== 'owner' && m.active && (
                            <button className="btn btn-danger btn-xs" onClick={() => deactivate(m.id)}>Remover</button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Funções e permissões</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {Object.entries(ROLES).map(([k, v]) => (
            <div key={k} style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
              <span className={`badge ${v.badge}`} style={{ marginBottom: 6, display: 'inline-block' }}>{v.label}</span>
              <div style={{ fontSize: '.72rem', color: 'var(--tx2)' }}>
                {k === 'owner'   && 'Acesso total, configurações'}
                {k === 'manager' && 'Relatórios, usuários, config'}
                {k === 'cashier' && 'Caixa, pedidos, cardápio'}
                {k === 'waiter'  && 'Pedidos e mesas'}
                {k === 'cook'    && 'Visualiza pedidos em preparo'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal === 'invite' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 400 }}>
            <div className="modal-header"><h2>Convidar usuário</h2><button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button></div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label>E-mail *</label><input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colaborador@email.com" /></div>
              <div><label>Função</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                  {Object.entries(ROLES).filter(([k]) => k !== 'owner').map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <p style={{ fontSize: '.78rem', color: 'var(--tx2)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 6 }}>
                O usuário precisa criar uma conta no Gastroo com este e-mail e então será vinculado automaticamente ao seu restaurante.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving || !inviteEmail}>{saving ? 'Salvando...' : '📨 Gerar link'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
