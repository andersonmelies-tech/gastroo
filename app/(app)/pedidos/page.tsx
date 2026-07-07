'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Order, Product, Table } from '@/types/database'

const STATUS: Record<string, { label: string; badge: string; next?: string; nextLabel?: string }> = {
  aberto:     { label: 'Aberto',     badge: 'badge-blue',   next: 'em_preparo', nextLabel: '▶ Iniciar' },
  em_preparo: { label: 'Em preparo', badge: 'badge-yellow', next: 'pronto',     nextLabel: '✅ Pronto' },
  pronto:     { label: 'Pronto',     badge: 'badge-purple', next: 'fechado',    nextLabel: '💵 Fechar' },
  fechado:    { label: 'Fechado',    badge: 'badge-green' },
  cancelado:  { label: 'Cancelado',  badge: 'badge-red' },
}

const TYPES: Record<string, string> = {
  mesa: '🪑 Mesa', balcao: '🏪 Balcão', delivery: '🛵 Delivery', takeout: '📦 Retirada'
}

const PAY_METHODS = ['Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Pix', 'Vale Refeição']

export default function PedidosPage() {
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ativos')
  const [modal, setModal] = useState<'new'|'view'|null>(null)
  const [selected, setSelected] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)

  // New order form
  const [newType, setNewType] = useState<'mesa'|'balcao'|'delivery'|'takeout'>('mesa')
  const [newTable, setNewTable] = useState('')
  const [newCustomer, setNewCustomer] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newItems, setNewItems] = useState<{ product_id: string; name: string; qty: number; price: number; notes: string }[]>([])
  const [payMethod, setPayMethod] = useState('Dinheiro')
  const [discount, setDiscount] = useState(0)
  const [serviceFee, setServiceFee] = useState(10)

  const load = useCallback(async () => {
    setLoading(true)
    const [o, p, t] = await Promise.all([
      supabase.from('orders').select('*, tables(number, id), order_items(*)').order('created_at', { ascending: false }).limit(100),
      supabase.from('products').select('*').eq('active', true).order('name'),
      supabase.from('tables').select('*').order('number'),
    ])
    setOrders(o.data as Order[] ?? [])
    setProducts(p.data as Product[] ?? [])
    setTables(t.data as Table[] ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function addItem(pid: string) {
    const prod = products.find(p => p.id === pid)
    if (!prod) return
    setNewItems(items => {
      const ex = items.find(i => i.product_id === pid)
      if (ex) return items.map(i => i.product_id === pid ? {...i, qty: i.qty+1} : i)
      return [...items, { product_id: pid, name: prod.name, qty: 1, price: prod.price, notes: '' }]
    })
  }

  function removeItem(pid: string) {
    setNewItems(items => items.filter(i => i.product_id !== pid))
  }

  function itemTotal(items: typeof newItems) {
    return items.reduce((s, i) => s + i.qty * i.price, 0)
  }

  const subtotal = itemTotal(newItems)
  const sfee = newType === 'mesa' ? subtotal * (serviceFee / 100) : 0
  const total = subtotal + sfee - discount

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!newItems.length) { alert('Adicione pelo menos um item'); return }
    setSaving(true)
    try {
      // Get next order number
      const { data: seq } = await supabase.rpc('next_order_number', {
        p_restaurant_id: (await supabase.from('restaurant_members').select('restaurant_id').single()).data?.restaurant_id
      })
      const tableId = newType === 'mesa' ? newTable || null : null
      const { data: order, error } = await supabase.from('orders').insert({
        type: newType, table_id: tableId, order_number: seq,
        customer_name: newCustomer || null, customer_phone: newPhone || null,
        customer_address: newAddress || null, notes: newNotes || null,
        subtotal, service_fee: sfee, discount, total, payment_method: payMethod,
        status: 'aberto',
      }).select().single()
      if (error) throw error

      await supabase.from('order_items').insert(
        newItems.map(i => ({
          order_id: order.id, product_id: i.product_id, product_name: i.name,
          quantity: i.qty, unit_price: i.price, total_price: i.qty * i.price, notes: i.notes || null,
        }))
      )

      // Se mesa, marcar como ocupada
      if (tableId) {
        await supabase.from('tables').update({ status: 'ocupada' }).eq('id', tableId)
      }

      setModal(null); resetForm(); load()
    } catch (err) { alert('Erro ao criar pedido') }
    setSaving(false)
  }

  function resetForm() {
    setNewType('mesa'); setNewTable(''); setNewCustomer(''); setNewPhone('')
    setNewAddress(''); setNewNotes(''); setNewItems([]); setDiscount(0); setServiceFee(10)
  }

  async function advanceStatus(order: Order) {
    const st = STATUS[order.status]
    if (!st.next) return
    const updates: Record<string, unknown> = { status: st.next }
    if (st.next === 'fechado') {
      updates.closed_at = new Date().toISOString()
      updates.paid_at = new Date().toISOString()
      // Registrar no caixa
      await supabase.from('cash_entries').insert({
        type: 'entrada', description: `Pedido #${order.order_number}`,
        amount: order.total, category: 'venda',
        payment_method: order.payment_method ?? 'Dinheiro',
        order_id: order.id, date: new Date().toISOString().split('T')[0],
      })
      // Liberar mesa se houver
      if (order.table_id) {
        await supabase.from('tables').update({ status: 'livre' }).eq('id', order.table_id)
      }
    }
    await supabase.from('orders').update(updates).eq('id', order.id)
    load()
  }

  async function cancelOrder(id: string) {
    if (!confirm('Cancelar este pedido?')) return
    const order = orders.find(o => o.id === id)
    await supabase.from('orders').update({ status: 'cancelado' }).eq('id', id)
    if (order?.table_id) await supabase.from('tables').update({ status: 'livre' }).eq('id', order.table_id)
    load()
  }

  const filtered = orders.filter(o => {
    if (filter === 'ativos') return ['aberto','em_preparo','pronto'].includes(o.status)
    if (filter === 'hoje') {
      const today = new Date().toISOString().split('T')[0]
      return o.created_at.startsWith(today)
    }
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Pedidos</div>
          <div className="page-subtitle">{filtered.length} pedido(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setModal('new') }}>+ Novo Pedido</button>
      </div>

      <div className="tabs">
        {[['ativos','⏳ Ativos'], ['hoje','📅 Hoje'], ['todos','📋 Todos']].map(([v,l]) => (
          <button key={v} className={`tab-btn ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="card card-p0">
        {loading ? <div className="empty"><p>Carregando...</p></div> :
         filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <h3>Nenhum pedido</h3>
            <p>Clique em "Novo Pedido" para começar</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>#</th><th>Tipo / Mesa</th><th>Cliente</th>
                <th>Itens</th><th style={{textAlign:'right'}}>Total</th>
                <th>Status</th><th>Horário</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const st = STATUS[o.status] ?? { label: o.status, badge: 'badge-gray' }
                const tbl = o.tables as { number: string } | null
                const items = o.order_items ?? []
                return (
                  <tr key={o.id}>
                    <td><span style={{ fontWeight: 800, color: 'var(--brand)' }}>#{o.order_number}</span></td>
                    <td>
                      <div style={{ fontSize: '.78rem' }}>{TYPES[o.type] ?? o.type}</div>
                      {tbl && <div style={{ fontSize: '.7rem', color: 'var(--tx2)' }}>Mesa {tbl.number}</div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{o.customer_name || '—'}</td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.8rem' }}>{items.length} item(s)</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>R$ {Number(o.total).toFixed(2).replace('.',',')}</td>
                    <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.78rem' }}>
                      {new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {st.next && (
                          <button className="btn btn-primary btn-xs" onClick={() => advanceStatus(o)}>
                            {st.nextLabel}
                          </button>
                        )}
                        <button className="btn btn-ghost btn-xs" onClick={() => { setSelected(o); setModal('view') }}>👁</button>
                        {['aberto','em_preparo'].includes(o.status) && (
                          <button className="btn btn-danger btn-xs" onClick={() => cancelOrder(o.id)}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Novo Pedido */}
      {modal === 'new' && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <h2>Novo Pedido</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={createOrder}>
              <div className="modal-body">
                {/* Tipo */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['mesa','balcao','delivery','takeout'] as const).map(t => (
                    <button key={t} type="button"
                      className={`btn btn-sm ${newType===t?'btn-primary':'btn-secondary'}`}
                      onClick={() => setNewType(t)}
                    >{TYPES[t]}</button>
                  ))}
                </div>

                <div className="fgrid" style={{ marginBottom: 14 }}>
                  {newType === 'mesa' && (
                    <div><label>Mesa</label>
                      <select value={newTable} onChange={e => setNewTable(e.target.value)}>
                        <option value="">Balcão / Sem mesa</option>
                        {tables.filter(t=>t.status==='livre').map(t => (
                          <option key={t.id} value={t.id}>Mesa {t.number} ({t.capacity} lugares)</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div><label>Cliente (opcional)</label><input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} placeholder="Nome do cliente" /></div>
                  <div><label>Telefone</label><input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(00) 00000-0000" /></div>
                  {newType === 'delivery' && (
                    <div className="fg-full"><label>Endereço de entrega</label><input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Rua, número, bairro" /></div>
                  )}
                  <div className="fg-full"><label>Observações</label><textarea rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Alergias, preferências..." /></div>
                </div>

                {/* Itens */}
                <div style={{ marginBottom: 12 }}>
                  <label>Adicionar itens</label>
                  <select onChange={e => { if(e.target.value) { addItem(e.target.value); e.target.value = '' } }} style={{ marginBottom: 8 }}>
                    <option value="">Selecione um produto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2).replace('.',',')}</option>
                    ))}
                  </select>
                </div>

                {newItems.length > 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    {newItems.map(i => (
                      <div key={i.product_id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: '.83rem' }}>{i.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => {
                            if(i.qty <= 1) removeItem(i.product_id)
                            else setNewItems(items => items.map(x => x.product_id===i.product_id ? {...x,qty:x.qty-1} : x))
                          }}>−</button>
                          <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{i.qty}</span>
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setNewItems(items => items.map(x => x.product_id===i.product_id ? {...x,qty:x.qty+1} : x))}>+</button>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--green)', minWidth: 70, textAlign: 'right', fontSize: '.83rem' }}>R$ {(i.qty*i.price).toFixed(2).replace('.',',')}</span>
                        <button type="button" className="btn btn-ghost btn-xs" onClick={() => removeItem(i.product_id)} style={{ color: 'var(--red)' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totais */}
                <div className="fgrid">
                  <div><label>Desconto (R$)</label><input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(Number(e.target.value))} /></div>
                  {newType === 'mesa' && <div><label>Taxa de serviço (%)</label><input type="number" min="0" max="30" value={serviceFee} onChange={e => setServiceFee(Number(e.target.value))} /></div>}
                  <div><label>Forma de pagamento</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                      {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px 14px', marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--tx2)', marginBottom: 4 }}>
                    <span>Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.',',')}</span>
                  </div>
                  {sfee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--tx2)', marginBottom: 4 }}>
                    <span>Taxa de serviço ({serviceFee}%)</span><span>R$ {sfee.toFixed(2).replace('.',',')}</span>
                  </div>}
                  {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', color: 'var(--red)', marginBottom: 4 }}>
                    <span>Desconto</span><span>− R$ {discount.toFixed(2).replace('.',',')}</span>
                  </div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                    <span>Total</span><span style={{ color: 'var(--green)' }}>R$ {total.toFixed(2).replace('.',',')}</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !newItems.length}>{saving ? 'Abrindo...' : '🧾 Abrir Pedido'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Pedido */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2>Pedido #{selected.order_number}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className={`badge ${STATUS[selected.status]?.badge ?? 'badge-gray'}`}>{STATUS[selected.status]?.label ?? selected.status}</span>
                <span className="badge badge-gray">{TYPES[selected.type] ?? selected.type}</span>
                {selected.tables && <span className="badge badge-gray">Mesa {(selected.tables as {number:string}).number}</span>}
              </div>
              {selected.customer_name && <div style={{ marginBottom: 8, fontSize: '.83rem' }}><strong>Cliente:</strong> {selected.customer_name} {selected.customer_phone && `· ${selected.customer_phone}`}</div>}
              {selected.notes && <div style={{ marginBottom: 8, fontSize: '.82rem', color: 'var(--tx2)' }}>📝 {selected.notes}</div>}

              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                {(selected.order_items ?? []).map(i => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: '.83rem' }}>
                    <span><strong>{i.quantity}x</strong> {i.product_name}</span>
                    <span style={{ fontWeight: 700 }}>R$ {Number(i.total_price).toFixed(2).replace('.',',')}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: 'var(--tx2)' }}>Subtotal</span><span>R$ {Number(selected.subtotal).toFixed(2).replace('.',',')}</span>
                </div>
                {Number(selected.service_fee) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: 'var(--tx2)' }}>Taxa serviço</span><span>R$ {Number(selected.service_fee).toFixed(2).replace('.',',')}</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                  <span>Total</span><span style={{ color: 'var(--green)' }}>R$ {Number(selected.total).toFixed(2).replace('.',',')}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>
              {STATUS[selected.status]?.next && (
                <button className="btn btn-primary" onClick={() => { advanceStatus(selected); setModal(null) }}>
                  {STATUS[selected.status].nextLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
