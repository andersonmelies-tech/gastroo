'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/types/database'

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Partial<Restaurant>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: member } = await supabase
      .from('restaurant_members')
      .select('restaurant_id')
      .single()
    if (!member) { setLoading(false); return }
    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', member.restaurant_id)
      .single()
    setRestaurant(rest as Restaurant ?? {})
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!restaurant.id) return
    setSaving(true)
    const { id, created_at, ...payload } = restaurant as Restaurant
    await supabase.from('restaurants').update(payload).eq('id', id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="empty"><p>Carregando...</p></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Configurações</div>
          <div className="page-subtitle">Dados do restaurante</div>
        </div>
        {saved && <span className="badge badge-green" style={{ fontSize: '.85rem', padding: '6px 14px' }}>✅ Salvo!</span>}
      </div>

      <form onSubmit={save}>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 18 }}>Dados gerais</h3>
          <div className="fgrid">
            <div><label>Nome do restaurante *</label><input value={restaurant.name ?? ''} onChange={e => setRestaurant(r => ({...r, name: e.target.value}))} required /></div>
            <div><label>Slug (URL)</label><input value={restaurant.slug ?? ''} onChange={e => setRestaurant(r => ({...r, slug: e.target.value.toLowerCase().replace(/\s/g,'-')}))} placeholder="meu-restaurante" /></div>
            <div><label>Telefone</label><input type="tel" value={restaurant.phone ?? ''} onChange={e => setRestaurant(r => ({...r, phone: e.target.value}))} placeholder="(00) 00000-0000" /></div>
            <div><label>E-mail de contato</label><input type="email" value={restaurant.email ?? ''} onChange={e => setRestaurant(r => ({...r, email: e.target.value}))} /></div>
            <div><label>CNPJ</label><input value={restaurant.cnpj ?? ''} onChange={e => setRestaurant(r => ({...r, cnpj: e.target.value}))} placeholder="00.000.000/0000-00" /></div>
            <div className="fg-full"><label>Endereço</label><input value={restaurant.address ?? ''} onChange={e => setRestaurant(r => ({...r, address: e.target.value}))} placeholder="Rua, número, bairro, cidade - UF" /></div>
            <div className="fg-full"><label>Descrição / Bio</label><textarea rows={2} value={restaurant.description ?? ''} onChange={e => setRestaurant(r => ({...r, description: e.target.value}))} /></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 18 }}>Operação</h3>
          <div className="fgrid">
            <div><label>Horário de abertura</label><input type="time" value={restaurant.opening_hours ?? ''} onChange={e => setRestaurant(r => ({...r, opening_hours: e.target.value}))} /></div>
            <div><label>Horário de fechamento</label><input type="time" value={restaurant.closing_hours ?? ''} onChange={e => setRestaurant(r => ({...r, closing_hours: e.target.value}))} /></div>
            <div><label>Taxa de serviço padrão (%)</label><input type="number" min="0" max="30" step="0.5" value={restaurant.service_fee_pct ?? 10} onChange={e => setRestaurant(r => ({...r, service_fee_pct: Number(e.target.value)}))} /></div>
            <div><label>Aceita delivery?</label>
              <select value={restaurant.accepts_delivery ? '1' : '0'} onChange={e => setRestaurant(r => ({...r, accepts_delivery: e.target.value === '1'}))}>
                <option value="1">Sim</option>
                <option value="0">Não</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : '💾 Salvar configurações'}</button>
        </div>
      </form>
    </div>
  )
}
