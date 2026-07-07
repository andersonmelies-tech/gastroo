'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CashSession, CashEntry } from '@/types/database'

const PAY_METHODS = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Pix', 'Vale Refeição', 'Outro']
const CATEGORIES_IN  = ['venda', 'entrada_manual', 'sangria_devolucao']
const CATEGORIES_OUT = ['troco', 'despesa', 'sangria', 'retirada']

export default function CaixaPage() {
  const supabase = createClient()
  const [session, setSession] = useState<CashSession | null>(null)
  const [entries, setEntries] = useState<CashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'open' | 'entry' | 'close' | null>(null)
  const [saving, setSaving] = useState(false)

  // Open session form
  const [openAmount, setOpenAmount] = useState('0')

  // Entry form
  const [entryType, setEntryType] = useState<'entrada' | 'saida'>('entrada')
  const [entryDesc, setEntryDesc] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryMethod, setEntryMethod] = useState('Dinheiro')
  const [entryCategory, setEntryCategory] = useState('entrada_manual')

  const load = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data: sess } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('date', today)
      .is('closed_at', null)
      .maybeSingle()
    setSession(sess as CashSession | null)
    if (sess) {
      const { data } = await supabase
        .from('cash_entries')
        .select('*')
        .eq('session_id', sess.id)
        .order('created_at', { ascending: false })
      setEntries(data as CashEntry[] ?? [])
    } else {
      setEntries([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function openSession(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('cash_sessions').insert({
      date: new Date().toISOString().split('T')[0],
      opening_balance: Number(openAmount),
      status: 'aberto',
    })
    setSaving(false); setModal(null); setOpenAmount('0'); load()
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    await supabase.from('cash_entries').insert({
      session_id: session.id, type: entryType,
      description: entryDesc, amount: Number(entryAmount),
      category: entryCategory, payment_method: entryMethod,
      date: new Date().toISOString().split('T')[0],
    })
    setSaving(false); setModal(null); setEntryDesc(''); setEntryAmount(''); load()
  }

  async function closeSession() {
    if (!session || !confirm('Fechar o caixa agora?')) return
    setSaving(true)
    const totalIn  = entries.filter(e => e.type === 'entrada').reduce((s,e) => s + Number(e.amount), 0)
    const totalOut = entries.filter(e => e.type === 'saida').reduce((s,e) => s + Number(e.amount), 0)
    const balance  = Number(session.opening_balance) + totalIn - totalOut
    await supabase.from('cash_sessions').update({
      status: 'fechado', closed_at: new Date().toISOString(),
      total_income: totalIn, total_expenses: totalOut, closing_balance: balance,
    }).eq('id', session.id)
    setSaving(false); setModal(null); load()
  }

  const totalIn  = entries.filter(e => e.type === 'entrada').reduce((s,e) => s + Number(e.amount), 0)
  const totalOut = entries.filter(e => e.type === 'saida').reduce((s,e) => s + Number(e.amount), 0)
  const balance  = (session ? Number(session.opening_balance) : 0) + totalIn - totalOut

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.',',')}`

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Caixa</div>
          <div className="page-subtitle">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {session ? (
            <>
              <button className="btn btn-secondary" onClick={() => { setEntryType('saida'); setEntryCategory('despesa'); setModal('entry') }}>− Saída</button>
              <button className="btn btn-primary" onClick={() => { setEntryType('entrada'); setEntryCategory('entrada_manual'); setModal('entry') }}>+ Entrada</button>
              <button className="btn btn-danger" onClick={closeSession} disabled={saving}>Fechar Caixa</button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setModal('open')}>▶ Abrir Caixa</button>
          )}
        </div>
      </div>

      {loading ? <div className="empty"><p>Carregando...</p></div> : !session ? (
        <div className="empty">
          <div className="empty-icon">💵</div>
          <h3>Caixa fechado</h3>
          <p>Abra o caixa para registrar movimentações de hoje</p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setModal('open')}>▶ Abrir Caixa</button>
        </div>
      ) : (
        <>
          {/* Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Saldo abertura', value: fmt(Number(session.opening_balance)), color: '#3b82f6', bg: '#eff6ff', icon: '🔓' },
              { label: 'Total entradas', value: fmt(totalIn),  color: '#16a34a', bg: '#dcfce7', icon: '↑' },
              { label: 'Total saídas',   value: fmt(totalOut), color: '#dc2626', bg: '#fee2e2', icon: '↓' },
              { label: 'Saldo atual',    value: fmt(balance),  color: balance >= 0 ? '#16a34a' : '#dc2626', bg: balance >= 0 ? '#dcfce7' : '#fee2e2', icon: '💰' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}><span style={{ fontSize: '1.2rem' }}>{s.icon}</span></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Movimentações */}
          <div className="card card-p0">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3>Movimentações</h3>
            </div>
            {entries.length === 0 ? (
              <div className="empty"><p>Nenhuma movimentação ainda</p></div>
            ) : (
              <table className="tbl">
                <thead><tr><th>Hora</th><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th style={{textAlign:'right'}}>Valor</th></tr></thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--tx2)', fontSize: '.78rem' }}>
                        {new Date(e.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      </td>
                      <td style={{ fontWeight: 600 }}>{e.description}</td>
                      <td><span className="badge badge-gray" style={{ fontSize: '.65rem' }}>{e.category}</span></td>
                      <td style={{ color: 'var(--tx2)', fontSize: '.78rem' }}>{e.payment_method}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: e.type === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
                        {e.type === 'entrada' ? '+' : '−'} {fmt(Number(e.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Modal abrir caixa */}
      {modal === 'open' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-header"><h2>Abrir Caixa</h2><button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button></div>
            <form onSubmit={openSession}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label>Troco inicial (R$)</label><input type="number" step="0.01" min="0" value={openAmount} onChange={e => setOpenAmount(e.target.value)} autoFocus /></div>
                <p style={{ fontSize: '.8rem', color: 'var(--tx2)' }}>Informe o valor em espécie disponível no caixa para troco.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Abrindo...' : '▶ Abrir Caixa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal lançamento */}
      {modal === 'entry' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h2>Novo Lançamento</h2><button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button></div>
            <form onSubmit={addEntry}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['entrada','saida'] as const).map(t => (
                    <button key={t} type="button" className={`btn btn-sm flex-1 ${entryType===t ? (t==='entrada' ? 'btn-primary' : 'btn-danger') : 'btn-secondary'}`}
                      onClick={() => { setEntryType(t); setEntryCategory(t==='entrada' ? 'entrada_manual' : 'despesa') }}>
                      {t === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                    </button>
                  ))}
                </div>
                <div><label>Descrição *</label><input value={entryDesc} onChange={e => setEntryDesc(e.target.value)} required autoFocus /></div>
                <div><label>Valor (R$) *</label><input type="number" step="0.01" min="0.01" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} required /></div>
                <div><label>Categoria</label>
                  <select value={entryCategory} onChange={e => setEntryCategory(e.target.value)}>
                    {(entryType === 'entrada' ? CATEGORIES_IN : CATEGORIES_OUT).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label>Forma de pagamento</label>
                  <select value={entryMethod} onChange={e => setEntryMethod(e.target.value)}>
                    {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '💾 Lançar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
