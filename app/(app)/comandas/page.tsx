'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Comanda {
  id: string
  number: string
  status: 'livre' | 'aberta' | 'fechada'
  opened_at: string | null
  closed_at: string | null
  total: number
}

interface ComandaItem {
  id: string
  comanda_id: string
  description: string
  type: 'peso' | 'unidade'
  weight_g: number | null
  quantity: number | null
  unit_price: number | null
  price_per_kg: number | null
  subtotal: number
  created_at: string
}

interface Product {
  id: string
  name: string
  price: number | null
  sold_by_weight: boolean
  price_per_kg: number | null
}

const PAY_METHODS = ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Vale Refeição']

export default function ComandasPage() {
  const supabase = createClient()
  const scanRef = useRef<HTMLInputElement>(null)

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [scanInput, setScanInput] = useState('')
  const [activeComanda, setActiveComanda] = useState<Comanda | null>(null)
  const [items, setItems] = useState<ComandaItem[]>([])
  const [openComandas, setOpenComandas] = useState<Comanda[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [payMethod, setPayMethod] = useState('Dinheiro')
  const [amountPaid, setAmountPaid] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [view, setView] = useState<'scan' | 'lista'>('scan')

  const [itemForm, setItemForm] = useState({
    description: '',
    type: 'peso' as 'peso' | 'unidade',
    weight_g: '',
    quantity: '1',
    price_per_kg: '',
    unit_price: '',
    product_id: '',
  })

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Load restaurant_id once
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('restaurant_members').select('restaurant_id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) setRestaurantId(data.restaurant_id) })
    })
  }, [supabase])

  const loadOpenComandas = useCallback(async () => {
    const { data } = await supabase.from('comandas').select('*')
      .eq('status', 'aberta').order('opened_at', { ascending: false })
    setOpenComandas(data || [])
  }, [supabase])

  const loadProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id,name,price,sold_by_weight,price_per_kg').eq('active', true)
    setProducts(data || [])
  }, [supabase])

  useEffect(() => {
    loadOpenComandas()
    loadProducts()
  }, [loadOpenComandas, loadProducts])

  // Auto-focus scan input when in scan view
  useEffect(() => {
    if (view === 'scan' && !activeComanda) {
      setTimeout(() => scanRef.current?.focus(), 100)
    }
  }, [view, activeComanda])

  const loadComandaItems = useCallback(async (comandaId: string) => {
    const { data } = await supabase.from('comanda_items').select('*')
      .eq('comanda_id', comandaId).order('created_at', { ascending: true })
    setItems(data || [])
  }, [supabase])

  async function openComanda(number: string) {
    if (!number.trim() || !restaurantId) return
    setLoading(true)
    const trimmed = number.trim()

    // Try to find existing comanda
    let { data: comanda } = await supabase.from('comandas').select('*')
      .eq('restaurant_id', restaurantId).eq('number', trimmed).single()

    if (!comanda) {
      // Create new comanda for this PVC card number
      const { data: created } = await supabase.from('comandas').insert({
        restaurant_id: restaurantId, number: trimmed, status: 'aberta', opened_at: new Date().toISOString(), total: 0
      }).select().single()
      comanda = created
    } else if (comanda.status === 'livre' || comanda.status === 'fechada') {
      // Reopen
      const { data: updated } = await supabase.from('comandas').update({
        status: 'aberta', opened_at: new Date().toISOString(), closed_at: null, total: 0
      }).eq('id', comanda.id).select().single()
      comanda = updated
    } else if (comanda.status === 'fechada') {
      alert('Comanda já fechada. Escaneie novamente para reabrir.')
      setLoading(false)
      setScanInput('')
      return
    }

    setActiveComanda(comanda)
    await loadComandaItems(comanda.id)
    loadOpenComandas()
    setScanInput('')
    setLoading(false)
  }

  function handleScanKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      openComanda(scanInput)
    }
  }

  function selectProduct(productId: string) {
    const p = products.find(x => x.id === productId)
    if (!p) return
    setItemForm(f => ({
      ...f,
      product_id: productId,
      description: p.name,
      type: p.sold_by_weight ? 'peso' : 'unidade',
      price_per_kg: p.price_per_kg ? String(p.price_per_kg) : f.price_per_kg,
      unit_price: p.price ? String(p.price) : f.unit_price,
    }))
  }

  function calcSubtotal() {
    if (itemForm.type === 'peso') {
      const g = parseFloat(itemForm.weight_g) || 0
      const pkg = parseFloat(itemForm.price_per_kg) || 0
      return (g / 1000) * pkg
    } else {
      const q = parseFloat(itemForm.quantity) || 1
      const p = parseFloat(itemForm.unit_price) || 0
      return q * p
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!activeComanda || !restaurantId) return
    setSaving(true)

    const subtotal = calcSubtotal()
    await supabase.from('comanda_items').insert({
      comanda_id: activeComanda.id,
      restaurant_id: restaurantId,
      description: itemForm.description,
      type: itemForm.type,
      weight_g: itemForm.type === 'peso' ? parseFloat(itemForm.weight_g) : null,
      quantity: itemForm.type === 'unidade' ? parseFloat(itemForm.quantity) : null,
      unit_price: itemForm.type === 'unidade' ? parseFloat(itemForm.unit_price) : null,
      price_per_kg: itemForm.type === 'peso' ? parseFloat(itemForm.price_per_kg) : null,
      subtotal,
    })

    // Update comanda total
    const newTotal = (activeComanda.total || 0) + subtotal
    await supabase.from('comandas').update({ total: newTotal }).eq('id', activeComanda.id)
    setActiveComanda(c => c ? { ...c, total: newTotal } : c)

    await loadComandaItems(activeComanda.id)
    loadOpenComandas()
    setItemForm({ description: '', type: 'peso', weight_g: '', quantity: '1', price_per_kg: '', unit_price: '', product_id: '' })
    setShowAddItem(false)
    setSaving(false)
  }

  async function deleteItem(item: ComandaItem) {
    if (!activeComanda) return
    if (!confirm('Remover este item?')) return
    setDeleting(item.id)
    await supabase.from('comanda_items').delete().eq('id', item.id)
    const newTotal = Math.max(0, (activeComanda.total || 0) - item.subtotal)
    await supabase.from('comandas').update({ total: newTotal }).eq('id', activeComanda.id)
    setActiveComanda(c => c ? { ...c, total: newTotal } : c)
    await loadComandaItems(activeComanda.id)
    loadOpenComandas()
    setDeleting(null)
  }

  async function closeComanda() {
    if (!activeComanda) return
    setSaving(true)
    await supabase.from('comandas').update({
      status: 'fechada', closed_at: new Date().toISOString()
    }).eq('id', activeComanda.id)
    setActiveComanda(null)
    setItems([])
    setShowClose(false)
    loadOpenComandas()
    setSaving(false)
    // Focus scan input again
    setTimeout(() => scanRef.current?.focus(), 200)
  }

  const troco = parseFloat(amountPaid || '0') - (activeComanda?.total || 0)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, letterSpacing: '-.03em' }}>Comandas</h1>
          <p style={{ color: 'var(--tx2)', fontSize: '.875rem' }}>Escaneie ou digite o número da comanda PVC</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => { setView(v => v === 'scan' ? 'lista' : 'scan'); setActiveComanda(null); setItems([]) }}>
            {view === 'scan' ? `📋 Ver abertas (${openComandas.length})` : '📷 Escanear'}
          </button>
        </div>
      </div>

      {/* SCAN / OPEN COMANDA VIEW */}
      {!activeComanda ? (
        <div>
          {/* Scan box */}
          <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>📦</div>
              <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Escanear comanda</h2>
              <p style={{ color: 'var(--tx2)', fontSize: '.875rem', marginBottom: 20 }}>
                Posicione o leitor na comanda PVC ou digite o número
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  ref={scanRef}
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={handleScanKey}
                  placeholder="Número da comanda (Ex: 042)"
                  style={{ flex: 1, textAlign: 'center', fontSize: '1.3rem', fontWeight: 700, letterSpacing: '.1em', fontFamily: 'var(--font-mono, monospace)' }}
                  autoComplete="off"
                  disabled={loading}
                />
                <button className="btn btn-primary" onClick={() => openComanda(scanInput)} disabled={loading || !scanInput.trim()}>
                  {loading ? '...' : 'Abrir'}
                </button>
              </div>
              <p style={{ color: 'var(--tx2)', fontSize: '.75rem', marginTop: 12 }}>
                O leitor USB envia Enter automaticamente após o scan
              </p>
            </div>
          </div>

          {/* Open comandas list */}
          {openComandas.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontWeight: 700, fontSize: '.95rem' }}>Comandas abertas ({openComandas.length})</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: 16 }}>
                {openComandas.map(c => (
                  <button key={c.id} onClick={() => { setActiveComanda(c); loadComandaItems(c.id) }}
                    style={{ background: 'var(--surface)', border: '2px solid var(--brand)', borderRadius: 10, padding: '14px 12px', cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand)', marginBottom: 4 }}>
                      #{c.number}
                    </div>
                    <div className="stat-value" style={{ fontSize: '1rem', marginBottom: 4 }}>{fmt(c.total)}</div>
                    <div style={{ fontSize: '.72rem', color: 'var(--tx2)' }}>
                      {c.opened_at ? fmtTime(c.opened_at) : '—'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE COMANDA VIEW */
        <div>
          {/* Comanda header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button className="btn" onClick={() => { setActiveComanda(null); setItems([]); setTimeout(() => scanRef.current?.focus(), 100) }}>
                ← Voltar
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand)' }}>
                    #{activeComanda.number}
                  </span>
                  <span className="badge badge-green">Aberta</span>
                </div>
                <div style={{ color: 'var(--tx2)', fontSize: '.8rem' }}>
                  {activeComanda.opened_at ? `Aberta às ${fmtTime(activeComanda.opened_at)}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.75rem', color: 'var(--tx2)', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
                <div className="stat-value" style={{ fontSize: '1.6rem', color: 'var(--brand)' }}>{fmt(activeComanda.total)}</div>
              </div>
              <button className="btn btn-primary" onClick={() => { setAmountPaid(''); setShowClose(true) }} style={{ padding: '10px 20px' }}>
                💵 Fechar comanda
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 700, fontSize: '.95rem' }}>Itens ({items.length})</h2>
              <button className="btn btn-primary" style={{ fontSize: '.82rem', padding: '6px 14px' }} onClick={() => {
                setItemForm({ description: '', type: 'peso', weight_g: '', quantity: '1', price_per_kg: '', unit_price: '', product_id: '' })
                setShowAddItem(true)
              }}>+ Adicionar item</button>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--tx2)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🍽️</div>
                <div>Nenhum item ainda</div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAddItem(true)}>Adicionar primeiro item</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    {['Item', 'Tipo', 'Qtd / Peso', 'Preço', 'Subtotal', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '.75rem', fontWeight: 700, color: 'var(--tx2)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '.875rem' }}>{item.description}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: '.73rem', fontWeight: 700,
                          background: item.type === 'peso' ? '#fef3c7' : '#eff6ff',
                          color: item.type === 'peso' ? '#92400e' : '#1d4ed8' }}>
                          {item.type === 'peso' ? '⚖️ Peso' : '📦 Unid.'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono, monospace)', fontSize: '.85rem' }}>
                        {item.type === 'peso'
                          ? `${item.weight_g}g (${((item.weight_g || 0) / 1000).toFixed(3)} kg)`
                          : `${item.quantity}x`}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '.85rem', color: 'var(--tx2)' }}>
                        {item.type === 'peso'
                          ? `${fmt(item.price_per_kg || 0)}/kg`
                          : fmt(item.unit_price || 0)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--brand)' }}>{fmt(item.subtotal)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => deleteItem(item)} disabled={deleting === item.id}
                          style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 6, padding: '4px 10px', fontSize: '.75rem', cursor: 'pointer' }}>
                          {deleting === item.id ? '...' : 'Remover'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--surface)' }}>
                    <td colSpan={4} style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>TOTAL</td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--brand)' }}>{fmt(activeComanda.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {showAddItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700 }}>Adicionar item — Comanda #{activeComanda?.number}</h2>
              <button onClick={() => setShowAddItem(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--tx2)' }}>✕</button>
            </div>
            <form onSubmit={addItem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Quick select from products */}
              {products.length > 0 && (
                <div>
                  <label>Produto (opcional)</label>
                  <select value={itemForm.product_id} onChange={e => selectProduct(e.target.value)}>
                    <option value="">— selecione um produto ou preencha manualmente —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} {p.sold_by_weight ? `(${fmt(p.price_per_kg || 0)}/kg)` : p.price ? `(${fmt(p.price)})` : ''}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label>Tipo *</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  {(['peso', 'unidade'] as const).map(t => (
                    <button key={t} type="button"
                      onClick={() => setItemForm(f => ({ ...f, type: t }))}
                      style={{ flex: 1, padding: '10px', border: `2px solid ${itemForm.type === t ? 'var(--brand)' : 'var(--border)'}`,
                        borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '.85rem',
                        background: itemForm.type === t ? 'rgba(234,88,12,.1)' : 'transparent',
                        color: itemForm.type === t ? 'var(--brand)' : 'var(--tx2)' }}>
                      {t === 'peso' ? '⚖️ Por Peso' : '📦 Por Unidade'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label>Descrição *</label>
                <input placeholder="Ex: Prato quente, Suco de laranja..." value={itemForm.description}
                  onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} required autoFocus />
              </div>

              {itemForm.type === 'peso' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Peso (gramas) *</label>
                    <input type="number" step="1" min="0" placeholder="Ex: 350"
                      value={itemForm.weight_g} onChange={e => setItemForm(f => ({ ...f, weight_g: e.target.value }))} required
                      style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1.1rem', fontWeight: 700 }} />
                  </div>
                  <div>
                    <label>Preço por kg (R$) *</label>
                    <input type="number" step="0.01" min="0" placeholder="Ex: 59.90"
                      value={itemForm.price_per_kg} onChange={e => setItemForm(f => ({ ...f, price_per_kg: e.target.value }))} required />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label>Quantidade *</label>
                    <input type="number" step="1" min="1" placeholder="1"
                      value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} required />
                  </div>
                  <div>
                    <label>Preço unitário (R$) *</label>
                    <input type="number" step="0.01" min="0" placeholder="Ex: 8.00"
                      value={itemForm.unit_price} onChange={e => setItemForm(f => ({ ...f, unit_price: e.target.value }))} required />
                  </div>
                </div>
              )}

              {/* Subtotal preview */}
              {calcSubtotal() > 0 && (
                <div style={{ background: 'rgba(234,88,12,.08)', border: '1px solid rgba(234,88,12,.2)', borderRadius: 8, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--tx2)' }}>Subtotal</span>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--brand)' }}>{fmt(calcSubtotal())}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn" onClick={() => setShowAddItem(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Adicionando...' : '+ Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE COMANDA MODAL */}
      {showClose && activeComanda && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 700 }}>Fechar Comanda #{activeComanda.number}</h2>
              <button onClick={() => setShowClose(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--tx2)' }}>✕</button>
            </div>

            {/* Items summary */}
            <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '.84rem' }}>
                  <span style={{ color: 'var(--tx2)' }}>
                    {item.description}
                    {item.type === 'peso' ? ` (${item.weight_g}g)` : ` ${item.quantity}x`}
                  </span>
                  <span style={{ fontWeight: 600 }}>{fmt(item.subtotal)}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem' }}>
                <span>Total</span>
                <span style={{ color: 'var(--brand)' }}>{fmt(activeComanda.total)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Forma de pagamento</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  {PAY_METHODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label>Valor recebido (R$)</label>
                <input type="number" step="0.01" min="0" placeholder={String(activeComanda.total)}
                  value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1.2rem', fontWeight: 700 }} />
              </div>
              {parseFloat(amountPaid) > 0 && (
                <div style={{ background: troco >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>{troco >= 0 ? 'Troco' : 'Faltam'}</span>
                  <span style={{ color: troco >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(Math.abs(troco))}</span>
                </div>
              )}
              <button className="btn btn-primary" style={{ padding: '12px', fontSize: '1rem', fontWeight: 800 }}
                onClick={closeComanda} disabled={saving}>
                {saving ? 'Fechando...' : '✅ Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
