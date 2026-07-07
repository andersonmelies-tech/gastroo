'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')
      const { data: rest, error: restErr } = await supabase.from('restaurants').insert({
        name, slug, phone: phone || null, active: true,
      }).select().single()
      if (restErr) throw restErr

      const { error: memErr } = await supabase.from('restaurant_members').insert({
        restaurant_id: rest.id, user_id: user.id, role: 'owner', active: true,
      })
      if (memErr) throw memErr

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const e = err as { message?: string; details?: string; hint?: string }
      setError(e?.message || 'Erro ao criar restaurante')
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'var(--brand)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', margin: '0 auto 16px' }}>🍽️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Bem-vindo ao Gastroo!</h1>
          <p style={{ color: 'var(--tx2)' }}>Configure seu restaurante para começar</p>
        </div>

        <div className="card">
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Nome do restaurante *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Restaurante do João" required autoFocus />
            </div>
            <div>
              <label>Telefone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            {error && <div style={{ color: 'var(--red)', fontSize: '.83rem', background: 'var(--red-bg)', padding: '8px 12px', borderRadius: 6 }}>{error}</div>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving || !name.trim()}>
              {saving ? 'Criando...' : '🚀 Criar meu restaurante'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
