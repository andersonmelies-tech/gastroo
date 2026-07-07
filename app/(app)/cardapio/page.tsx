'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, Category } from '@/types/database'

export default function CardapioPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeTab, setActiveTab] = useState<'produtos'|'categorias'>('produtos')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'product'|'category'|null>(null)
  const [editing, setEditing] = useState<Partial<Product & Category> | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterCat, setFilterCat] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const [p, c] = await Promise.all([
      supabase.from('products').select('*, categories(name)').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
    ])
    setProducts(p.data as Product[] ?? [])
    setCategories(c.data as Category[] ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const d = editing!
    const payload = {
      name: d.name, description: d.description,
      price: Number(d.price), cost_price: Number(d.cost_price ?? 0),
      category_id: d.category_id || null, unit: d.unit ?? 'un',
      prep_time_min: Number(d.prep_time_min ?? 0),
      serves: Number(d.serves ?? 1), active: d.active !== false,
    }
    if (d.id) {
      await supabase.from('products').update(payload).eq('id', d.id)
    } else {
      await supabase.from('products').insert(payload)
    }
    setSaving(false); setModal(null); setEditing(null); load()
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const d = editing!
    const payload = { name: d.name, description: d.description, sort_order: Number(d.sort_order ?? 0) }
    if (d.id) {
      await supabase.from('categories').update(payload).eq('id', d.id)
    } else {
      await supabase.from('categories').insert(payload)
    }
    setSaving(false); setModal(null); setEditing(null); load()
  }

  async function toggleProduct(id: string, active: boolean) {
    await supabase.from('products').update({ active: !active }).eq('id', id)
    load()
  }

  const filtered = filterCat === 'all' ? products : products.filter(p => p.category_id === filterCat)

  const fmtPrice = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`
  const margin = (p: Product) => p.cost_price > 0
    ? Math.round(((p.price - p.cost_price) / p.price) * 100)
    : null

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cardápio</div>
          <div className="page-subtitle">{products.length} itens · {categories.length} categorias</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => { setEditing({}); setModal('category') }}>+ Categoria</button>
          <button className="btn btn-primary" onClick={() => { setEditing({ active: true }); setModal('product') }}>+ Produto</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab==='produtos'?'active':''}`} onClick={() => setActiveTab('produtos')}>
          🍽️ Produtos ({products.length})
        </button>
        <button className={`tab-btn ${activeTab==='categorias'?'active':''}`} onClick={() => setActiveTab('categorias')}>
          📁 Categorias ({categories.length})
        </button>
      </div>

      {activeTab === 'produtos' && (
        <>
          {/* Filtro por categoria */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm ${filterCat==='all'?'btn-primary':'btn-secondary'}`} onClick={() => setFilterCat('all')}>
              Todos
            </button>
            {categories.map(c => (
              <button key={c.id} className={`btn btn-sm ${filterCat===c.id?'btn-primary':'btn-secondary'}`} onClick={() => setFilterCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>

          <div className="card card-p0">
            {loading ? (
              <div className="empty"><p>Carregando...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🍽️</div>
                <h3>Nenhum produto</h3>
                <p>Adicione itens ao seu cardápio</p>
                <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { setEditing({ active: true }); setModal('product') }}>
                  + Adicionar produto
                </button>
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Produto</th>
                    <th>Categoria</th>
                    <th style={{ textAlign: 'right' }}>Preço</th>
                    <th style={{ textAlign: 'right' }}>Custo</th>
                    <th style={{ textAlign: 'right' }}>Margem</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const m = margin(p)
                    return (
                      <tr key={p.id} style={{ opacity: p.active ? 1 : .5 }}>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--tx)' }}>{p.name}</div>
                          {p.description && <div style={{ fontSize: '.72rem', color: 'var(--tx2)', marginTop: 2 }}>{p.description}</div>}
                          <div style={{ fontSize: '.7rem', color: 'var(--tx3)', marginTop: 1 }}>
                            {p.prep_time_min > 0 && `${p.prep_time_min}min · `}{p.unit} · rende {p.serves}
                          </div>
                        </td>
                        <td>
                          {p.categories ? (
                            <span className="badge badge-gray">{(p.categories as unknown as { name: string }).name}</span>
                          ) : <span style={{ color: 'var(--tx3)' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmtPrice(p.price)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--tx2)', fontSize: '.82rem' }}>
                          {p.cost_price > 0 ? fmtPrice(p.cost_price) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {m !== null ? (
                            <span style={{ color: m >= 40 ? 'var(--green)' : m >= 20 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                              {m}%
                            </span>
                          ) : <span style={{ color: 'var(--tx3)' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>
                            {p.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => { setEditing({...p}); setModal('product') }}>✏️</button>
                            <button className="btn btn-ghost btn-xs" onClick={() => toggleProduct(p.id, p.active)}>
                              {p.active ? '○' : '●'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'categorias' && (
        <div className="card card-p0">
          {categories.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📁</div>
              <h3>Nenhuma categoria</h3>
              <p>Organize seu cardápio com categorias</p>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => { setEditing({}); setModal('category') }}>
                + Criar categoria
              </button>
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>Nome</th><th>Descrição</th><th>Ordem</th><th>Produtos</th><th></th></tr></thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td style={{ color: 'var(--tx2)', fontSize: '.82rem' }}>{c.description || '—'}</td>
                    <td style={{ color: 'var(--tx2)' }}>{c.sort_order}</td>
                    <td>{products.filter(p => p.category_id === c.id).length}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditing({...c}); setModal('category') }}>✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Produto */}
      {modal === 'product' && editing && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2>{editing.id ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={saveProduct}>
              <div className="modal-body">
                <div className="fgrid">
                  <div className="fg-full"><label>Nome *</label><input value={editing.name ?? ''} onChange={e => setEditing(x => ({...x, name: e.target.value}))} required /></div>
                  <div className="fg-full"><label>Descrição</label><textarea rows={2} value={editing.description ?? ''} onChange={e => setEditing(x => ({...x, description: e.target.value}))} /></div>
                  <div><label>Preço (R$) *</label><input type="number" step="0.01" min="0" value={editing.price ?? ''} onChange={e => setEditing(x => ({...x, price: Number(e.target.value)}))} required /></div>
                  <div><label>Custo (R$)</label><input type="number" step="0.01" min="0" value={editing.cost_price ?? ''} onChange={e => setEditing(x => ({...x, cost_price: Number(e.target.value)}))} /></div>
                  <div><label>Categoria</label>
                    <select value={editing.category_id ?? ''} onChange={e => setEditing(x => ({...x, category_id: e.target.value || null}))}>
                      <option value="">Sem categoria</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div><label>Unidade</label>
                    <select value={editing.unit ?? 'un'} onChange={e => setEditing(x => ({...x, unit: e.target.value}))}>
                      <option value="un">un (unidade)</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L (litro)</option>
                      <option value="ml">ml</option>
                      <option value="porcao">porção</option>
                    </select>
                  </div>
                  <div><label>Tempo de preparo (min)</label><input type="number" min="0" value={editing.prep_time_min ?? 0} onChange={e => setEditing(x => ({...x, prep_time_min: Number(e.target.value)}))} /></div>
                  <div><label>Rende (porções)</label><input type="number" min="1" value={editing.serves ?? 1} onChange={e => setEditing(x => ({...x, serves: Number(e.target.value)}))} /></div>
                  <div><label>Status</label>
                    <select value={editing.active !== false ? '1' : '0'} onChange={e => setEditing(x => ({...x, active: e.target.value === '1'}))}>
                      <option value="1">Ativo</option>
                      <option value="0">Inativo</option>
                    </select>
                  </div>
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

      {/* Modal Categoria */}
      {modal === 'category' && editing && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="modal-box" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>{editing.id ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={saveCategory}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div><label>Nome *</label><input value={editing.name ?? ''} onChange={e => setEditing(x => ({...x, name: e.target.value}))} required /></div>
                <div><label>Descrição</label><input value={editing.description ?? ''} onChange={e => setEditing(x => ({...x, description: e.target.value}))} /></div>
                <div><label>Ordem de exibição</label><input type="number" min="0" value={editing.sort_order ?? 0} onChange={e => setEditing(x => ({...x, sort_order: Number(e.target.value)}))} /></div>
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
