import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  // Stats paralelas
  const [ordersRes, revenueRes, openOrdersRes, tablesRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact' }).gte('created_at', today + 'T00:00:00').neq('status', 'cancelado'),
    supabase.from('cash_entries').select('amount').eq('type', 'entrada').gte('date', today),
    supabase.from('orders').select('id', { count: 'exact' }).in('status', ['aberto', 'em_preparo']),
    supabase.from('tables').select('id, status'),
  ])

  const totalOrders  = ordersRes.count ?? 0
  const totalRevenue = (revenueRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const openOrders   = openOrdersRes.count ?? 0
  const tables       = tablesRes.data ?? []
  const occupiedTables = tables.filter(t => t.status === 'ocupada').length

  // Últimos pedidos
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, type, status, total, customer_name, created_at, tables(number)')
    .order('created_at', { ascending: false })
    .limit(8)

  const statusMap: Record<string, { label: string; cls: string }> = {
    aberto:      { label: 'Aberto',      cls: 'badge-blue' },
    em_preparo:  { label: 'Em preparo',  cls: 'badge-yellow' },
    pronto:      { label: 'Pronto',      cls: 'badge-purple' },
    fechado:     { label: 'Fechado',     cls: 'badge-green' },
    cancelado:   { label: 'Cancelado',   cls: 'badge-red' },
  }

  const typeLabel: Record<string, string> = {
    mesa: '🪑 Mesa', balcao: '🏪 Balcão', delivery: '🛵 Delivery', takeout: '📦 Retirada'
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const stats = [
    { label: 'Pedidos hoje',       value: totalOrders,                       icon: '🧾', color: '#3b82f6', bg: '#eff6ff' },
    { label: 'Faturamento hoje',   value: `R$ ${totalRevenue.toFixed(2).replace('.',',')}`, icon: '💰', color: '#16a34a', bg: '#dcfce7' },
    { label: 'Pedidos em aberto',  value: openOrders,                        icon: '⏳', color: '#d97706', bg: '#fef3c7' },
    { label: 'Mesas ocupadas',     value: `${occupiedTables}/${tables.length}`, icon: '🪑', color: '#7c3aed', bg: '#ede9fe' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <a href="/pedidos/novo" className="btn btn-primary">+ Novo Pedido</a>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Pedidos recentes */}
        <div className="card card-p0">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>Pedidos recentes</h3>
            <a href="/pedidos" style={{ fontSize: '.78rem', color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Ver todos →</a>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th>
                <th>Tipo</th>
                <th>Cliente / Mesa</th>
                <th>Total</th>
                <th>Status</th>
                <th>Horário</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders ?? []).map(o => {
                const st = statusMap[o.status] ?? { label: o.status, cls: 'badge-gray' }
                const tbl = (o.tables as unknown) as { number: string } | null
                return (
                  <tr key={o.id}>
                    <td><span style={{ fontWeight: 700, color: 'var(--brand)' }}>#{o.order_number}</span></td>
                    <td style={{ fontSize: '.78rem', color: 'var(--tx2)' }}>{typeLabel[o.type] ?? o.type}</td>
                    <td style={{ fontWeight: 600 }}>
                      {o.customer_name || (tbl ? `Mesa ${tbl.number}` : '—')}
                    </td>
                    <td style={{ fontWeight: 700 }}>R$ {Number(o.total).toFixed(2).replace('.',',')}</td>
                    <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.78rem' }}>{fmtTime(o.created_at)}</td>
                  </tr>
                )
              })}
              {!recentOrders?.length && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--tx3)' }}>Nenhum pedido hoje</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mesas */}
        <div className="card card-p0">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>Mesas</h3>
            <a href="/mesas" style={{ fontSize: '.78rem', color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Gerenciar →</a>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {tables.map(t => (
              <div key={t.id} style={{
                aspectRatio: '1', borderRadius: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '.78rem', fontWeight: 700,
                background: t.status === 'ocupada' ? 'var(--red-bg)' : t.status === 'reservada' ? 'var(--yellow-bg)' : 'var(--green-bg)',
                color: t.status === 'ocupada' ? 'var(--red)' : t.status === 'reservada' ? 'var(--yellow)' : 'var(--green)',
                border: `1px solid ${t.status === 'ocupada' ? '#fecaca' : t.status === 'reservada' ? '#fde68a' : '#bbf7d0'}`,
                cursor: 'default',
              }}>
                {t.status === 'livre' ? '✓' : t.status === 'ocupada' ? '●' : '○'}
              </div>
            ))}
            {!tables.length && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: 'var(--tx3)', fontSize: '.8rem' }}>
                Nenhuma mesa cadastrada
              </div>
            )}
          </div>
          <div style={{ padding: '8px 16px 14px', display: 'flex', gap: 12, fontSize: '.7rem', color: 'var(--tx2)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />Livre</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', display: 'inline-block' }} />Ocupada</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)', display: 'inline-block' }} />Reservada</span>
          </div>
        </div>
      </div>
    </div>
  )
}
