'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type EntryType = 'receita' | 'despesa' | 'investimento'
type Recurrence = 'unica' | 'mensal' | 'anual'

interface FinancialEntry {
  id: string
  date: string
  type: EntryType
  category: string
  description: string
  amount: number
  payment_method: string | null
  recurrence: Recurrence
  notes: string | null
}

const CATEGORIES: Record<EntryType, { value: string; label: string }[]> = {
  receita: [
    { value: 'receita_operacional', label: 'Receita Operacional' },
    { value: 'receita_delivery', label: 'Delivery / App' },
    { value: 'receita_eventos', label: 'Eventos / Reservas' },
    { value: 'receita_outros', label: 'Outros' },
  ],
  despesa: [
    { value: 'custo_fixo', label: 'Custo Fixo' },
    { value: 'custo_variavel', label: 'Custo Variável' },
    { value: 'folha_pagamento', label: 'Folha de Pagamento' },
    { value: 'aluguel', label: 'Aluguel / Imóvel' },
    { value: 'fornecedor', label: 'Fornecedor / Compras' },
    { value: 'marketing', label: 'Marketing / Publicidade' },
    { value: 'manutencao', label: 'Manutenção / Reparos' },
    { value: 'imposto', label: 'Impostos / Taxas' },
    { value: 'energia', label: 'Energia / Água / Gás' },
    { value: 'despesa_outros', label: 'Outros' },
  ],
  investimento: [
    { value: 'investimento_inicial', label: 'Investimento Inicial' },
    { value: 'equipamento', label: 'Equipamentos' },
    { value: 'reforma', label: 'Reforma / Obras' },
    { value: 'tecnologia', label: 'Tecnologia / Software' },
    { value: 'investimento_outros', label: 'Outros' },
  ],
}

const PAYMENT_METHODS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'outros', label: 'Outros' },
]

const TYPE_LABELS: Record<EntryType, string> = {
  receita: 'Receita',
  despesa: 'Despesa',
  investimento: 'Investimento',
}

const TYPE_COLORS: Record<EntryType, string> = {
  receita: '#16a34a',
  despesa: '#dc2626',
  investimento: '#2563eb',
}

const PERIOD_OPTIONS = [
  { value: 'mes', label: 'Este mês' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'ano', label: 'Este ano' },
  { value: 'tudo', label: 'Tudo' },
]

function getPeriodDates(period: string): { from: string; to: string } | null {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (period === 'mes') return { from: new Date(y, m, 1).toISOString().slice(0,10), to: new Date(y, m+1, 0).toISOString().slice(0,10) }
  if (period === 'trimestre') {
    const qStart = Math.floor(m / 3) * 3
    return { from: new Date(y, qStart, 1).toISOString().slice(0,10), to: new Date(y, qStart+3, 0).toISOString().slice(0,10) }
  }
  if (period === 'semestre') {
    const sStart = m < 6 ? 0 : 6
    return { from: new Date(y, sStart, 1).toISOString().slice(0,10), to: new Date(y, sStart+6, 0).toISOString().slice(0,10) }
  }
  if (period === 'ano') return { from: `${y}-01-01`, to: `${y}-12-31` }
  return null
}

export default function FinanceiroPage() {
  const supabase = createClient()

  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('mes')
  const [filterType, setFilterType] = useState<EntryType | 'todos'>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editEntry, setEditEntry] = useState<FinancialEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'despesa' as EntryType,
    category: 'custo_fixo',
    description: '',
    amount: '',
    payment_method: 'pix',
    recurrence: 'unica' as Recurrence,
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const dates = getPeriodDates(period)
    let q = supabase.from('financial_entries').select('*').order('date', { ascending: false })
    if (dates) q = q.gte('date', dates.from).lte('date', dates.to)
    const { data } = await q
    setEntries(data || [])
    setLoading(false)
  }, [supabase, period])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditEntry(null)
    setForm({ date: new Date().toISOString().slice(0,10), type: 'despesa', category: 'custo_fixo', description: '', amount: '', payment_method: 'pix', recurrence: 'unica', notes: '' })
    setShowForm(true)
  }

  function openEdit(e: FinancialEntry) {
    setEditEntry(e)
    setForm({ date: e.date, type: e.type, category: e.category, description: e.description, amount: String(e.amount), payment_method: e.payment_method || 'pix', recurrence: e.recurrence, notes: e.notes || '' })
    setShowForm(true)
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    const payload = { ...form, amount: parseFloat(form.amount) }
    if (editEntry) {
      await supabase.from('financial_entries').update(payload).eq('id', editEntry.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: member } = await supabase.from('restaurant_members').select('restaurant_id').eq('user_id', user!.id).single()
      await supabase.from('financial_entries').insert({ ...payload, restaurant_id: member!.restaurant_id })
    }
    setSaving(false)
    setShowForm(false)
    load()
  }

  async function deleteEntry(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    setDeleting(id)
    await supabase.from('financial_entries').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  const filtered = filterType === 'todos' ? entries : entries.filter(e => e.type === filterType)

  const totals = entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + Number(e.amount)
    return acc
  }, {} as Record<string, number>)

  const resultado = (totals.receita || 0) - (totals.despesa || 0)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')

  const getCatLabel = (type: EntryType, cat: string) =>
    CATEGORIES[type]?.find(c => c.value === cat)?.label || cat

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, letterSpacing: '-.03em' }}>Financeiro</h1>
          <p style={{ color: 'var(--tx2)', fontSize: '.875rem' }}>Lançamentos, custos e investimentos</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo lançamento</button>
      </div>

      {/* Period + Type filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 8, padding: 4 }}>
          {PERIOD_OPTIONS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600,
                background: period === p.value ? 'var(--brand)' : 'transparent',
                color: period === p.value ? '#fff' : 'var(--tx2)' }}>
              {p.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface)', borderRadius: 8, padding: 4 }}>
          {(['todos', 'receita', 'despesa', 'investimento'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '.8rem', fontWeight: 600,
                background: filterType === t ? (t === 'todos' ? '#1a1a1a' : TYPE_COLORS[t]) : 'transparent',
                color: filterType === t ? '#fff' : 'var(--tx2)' }}>
              {t === 'todos' ? 'Todos' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Receitas', value: totals.receita || 0, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Despesas', value: totals.despesa || 0, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Investimentos', value: totals.investimento || 0, color: '#2563eb', bg: '#eff6ff' },
          { label: resultado >= 0 ? 'Lucro' : 'Prejuízo', value: Math.abs(resultado), color: resultado >= 0 ? '#16a34a' : '#dc2626', bg: resultado >= 0 ? '#f0fdf4' : '#fef2f2' },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>{k.label}</div>
            <div className="stat-value" style={{ fontSize: '1.35rem', color: k.color }}>{fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: '.95rem' }}>Lançamentos ({filtered.length})</h2>
        </div>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx2)' }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--tx2)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>💸</div>
            <div>Nenhum lançamento neste período</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openNew}>Adicionar primeiro lançamento</button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface)' }}>
                {['Data', 'Tipo', 'Categoria', 'Descrição', 'Recorrência', 'Valor', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '.75rem', fontWeight: 700, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: '.85rem', color: 'var(--tx2)', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '.75rem', fontWeight: 700,
                      background: TYPE_COLORS[e.type] + '22', color: TYPE_COLORS[e.type] }}>
                      {TYPE_LABELS[e.type]}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '.85rem', color: 'var(--tx2)' }}>{getCatLabel(e.type, e.category)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '.875rem', fontWeight: 500 }}>
                    {e.description}
                    {e.notes && <div style={{ fontSize: '.75rem', color: 'var(--tx2)', marginTop: 2 }}>{e.notes}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '.8rem', color: 'var(--tx2)' }}>
                    {e.recurrence === 'unica' ? 'Única' : e.recurrence === 'mensal' ? 'Mensal' : 'Anual'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '.9rem', whiteSpace: 'nowrap',
                    color: TYPE_COLORS[e.type] }}>
                    {e.type === 'receita' ? '+' : '-'} {fmt(e.amount)}
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openEdit(e)} className="btn" style={{ marginRight: 6, fontSize: '.78rem', padding: '4px 10px' }}>Editar</button>
                    <button onClick={() => deleteEntry(e.id)} disabled={deleting === e.id}
                      style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 6, padding: '4px 10px', fontSize: '.78rem', cursor: 'pointer' }}>
                      {deleting === e.id ? '...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700, fontSize: '1.05rem' }}>{editEntry ? 'Editar lançamento' : 'Novo lançamento'}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--tx2)' }}>✕</button>
            </div>
            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Type */}
              <div>
                <label>Tipo *</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {(['receita', 'despesa', 'investimento'] as EntryType[]).map(t => (
                    <button key={t} type="button"
                      onClick={() => setForm(f => ({ ...f, type: t, category: CATEGORIES[t][0].value }))}
                      style={{ flex: 1, padding: '8px 0', border: `2px solid ${form.type === t ? TYPE_COLORS[t] : 'var(--border)'}`,
                        borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.82rem',
                        background: form.type === t ? TYPE_COLORS[t] + '18' : 'transparent',
                        color: form.type === t ? TYPE_COLORS[t] : 'var(--tx2)' }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label>Data *</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                </div>
                <div>
                  <label>Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0,00" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                </div>
              </div>

              <div>
                <label>Categoria *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES[form.type].map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label>Descrição *</label>
                <input placeholder="Ex: Aluguel de dezembro, Compra de insumos..." value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label>Forma de pagamento</label>
                  <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                    {PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label>Recorrência</label>
                  <select value={form.recurrence} onChange={e => setForm(f => ({ ...f, recurrence: e.target.value as Recurrence }))}>
                    <option value="unica">Única</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label>Observações</label>
                <textarea rows={2} placeholder="Notas adicionais..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editEntry ? 'Salvar alterações' : 'Adicionar lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
