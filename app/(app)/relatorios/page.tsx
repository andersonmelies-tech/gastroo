'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface OrderRow {
  id: string; order_number: number; type: string; status: string
  total: number; created_at: string; payment_method: string | null
  customer_name: string | null
}

interface ProductRank { name: string; qty: number; revenue: number }

export default function RelatoriosPage() {
  const supabase = createClient()
  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [productRank, setProductRank] = useState<ProductRank[]>([])
  const [loading, setLoading] = useState(true)

  function getRange(p: typeof period) {
    const now = new Date()
    if (p === 'hoje') {
      const d = now.toISOString().split('T')[0]
      return { from: d + 'T00:00:00', to: d + 'T23:59:59' }
    }
    if (p === 'semana') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diff))
      return { from: monday.toISOString().split('T')[0] + 'T00:00:00', to: new Date().toISOString() }
    }
    // mes
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: first.toISOString().split('T')[0] + 'T00:00:00', to: new Date().toISOString() }
  }

  const load = useCallback(async () => {
    setLoading(true)
    const range = getRange(period)
    const { data: ords } = await supabase
      .from('orders')
      .select('id, order_number, type, status, total, created_at, payment_method, customer_name')
      .gte('created_at', range.from)
      .lte('created_at', range.to)
      .neq('status', 'cancelado')
      .order('created_at', { ascending: false })

    setOrders(ords as OrderRow[] ?? [])

    // Produtos mais vendidos
    const { data: items } = await supabase
      .from('order_items')
      .select('product_name, quantity, total_price, orders!inner(created_at, status)')
      .gte('orders.created_at', range.from)
      .lte('orders.created_at', range.to)
      .neq('orders.status', 'cancelado')

    if (items) {
      const map: Record<string, ProductRank> = {}
      items.forEach((i) => {
        const name = i.product_name
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 }
        map[name].qty += i.quantity
        map[name].revenue += Number(i.total_price)
      })
      setProductRank(Object.values(map).sort((a,b) => b.qty - a.qty).slice(0, 10))
    }

    setLoading(false)
  }, [supabase, period])

  useEffect(() => { load() }, [load])

  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0)
  const avgTicket    = orders.length > 0 ? totalRevenue / orders.length : 0

  const byType   = orders.reduce((acc, o) => { acc[o.type] = (acc[o.type] || 0) + 1; return acc }, {} as Record<string,number>)
  const byMethod = orders.reduce((acc, o) => {
    const m = o.payment_method || 'Outros'
    acc[m] = (acc[m] || 0) + Number(o.total); return acc
  }, {} as Record<string,number>)

  const typeLabels: Record<string,string> = { mesa:'🪑 Mesa', balcao:'🏪 Balcão', delivery:'🛵 Delivery', takeout:'📦 Retirada' }
  const fmt = (v: number) => `R$ ${v.toFixed(2).replace('.',',')}`

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Relatórios</div>
          <div className="page-subtitle">Análise de desempenho</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['hoje','semana','mes'] as const).map(p => (
            <button key={p} className={`btn btn-sm ${period===p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPeriod(p)}>
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Esta semana' : 'Este mês'}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="empty"><p>Carregando...</p></div> : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Pedidos', value: orders.length, icon: '🧾', color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Faturamento', value: fmt(totalRevenue), icon: '💰', color: '#16a34a', bg: '#dcfce7' },
              { label: 'Ticket médio', value: fmt(avgTicket), icon: '🎫', color: '#7c3aed', bg: '#ede9fe' },
              { label: 'Pedidos cancelados', value: '—', icon: '✕', color: '#dc2626', bg: '#fee2e2' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}><span style={{ fontSize: '1.2rem' }}>{s.icon}</span></div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Por tipo de pedido */}
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Pedidos por tipo</h3>
              {Object.entries(byType).length === 0 ? <p style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>Sem dados</p>
                : Object.entries(byType).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: '.83rem', flex: 1 }}>{typeLabels[type] ?? type}</span>
                  <div style={{ flex: 2, height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--brand)', borderRadius: 4, width: `${(count / orders.length) * 100}%` }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '.83rem', minWidth: 30, textAlign: 'right' }}>{count}</span>
                </div>
              ))}
            </div>

            {/* Por forma de pagamento */}
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Faturamento por pagamento</h3>
              {Object.entries(byMethod).length === 0 ? <p style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>Sem dados</p>
                : Object.entries(byMethod).sort((a,b) => b[1]-a[1]).map(([method, amount]) => (
                <div key={method} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: '.83rem', flex: 1 }}>{method}</span>
                  <div style={{ flex: 2, height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#16a34a', borderRadius: 4, width: `${(amount / totalRevenue) * 100}%` }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '.83rem', minWidth: 90, textAlign: 'right' }}>{fmt(amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking de produtos */}
          {productRank.length > 0 && (
            <div className="card card-p0" style={{ marginBottom: 24 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h3>🏆 Produtos mais vendidos</h3></div>
              <table className="tbl">
                <thead><tr><th>#</th><th>Produto</th><th style={{textAlign:'right'}}>Qtd</th><th style={{textAlign:'right'}}>Faturamento</th></tr></thead>
                <tbody>
                  {productRank.map((p, i) => (
                    <tr key={p.name}>
                      <td style={{ fontWeight: 700, color: i < 3 ? 'var(--brand)' : 'var(--tx2)', fontSize: i < 3 ? '1rem' : '.82rem' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{p.qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmt(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Lista de pedidos */}
          <div className="card card-p0">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><h3>Todos os pedidos</h3></div>
            {orders.length === 0 ? <div className="empty"><p>Nenhum pedido no período</p></div> : (
              <table className="tbl">
                <thead><tr><th>#</th><th>Tipo</th><th>Cliente</th><th>Pagamento</th><th style={{textAlign:'right'}}>Total</th><th>Horário</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700, color: 'var(--brand)' }}>#{o.order_number}</td>
                      <td style={{ fontSize: '.78rem', color: 'var(--tx2)' }}>{typeLabels[o.type] ?? o.type}</td>
                      <td>{o.customer_name || '—'}</td>
                      <td style={{ fontSize: '.78rem', color: 'var(--tx2)' }}>{o.payment_method || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmt(Number(o.total))}</td>
                      <td style={{ fontSize: '.78rem', color: 'var(--tx2)' }}>{new Date(o.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
