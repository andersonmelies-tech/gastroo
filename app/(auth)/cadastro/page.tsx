'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CadastroPage() {
  const [step, setStep] = useState(1)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function slugify(text: string) {
    return text.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }
    setLoading(true); setError('')
    try {
      // 1. Criar conta
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
      if (authError) throw new Error(authError.message)
      const userId = authData.user?.id
      if (!userId) throw new Error('Erro ao criar usuário')

      // 2. Criar restaurante
      const slug = slugify(restaurantName) + '-' + Math.random().toString(36).slice(2,6)
      const { data: rest, error: restError } = await supabase
        .from('restaurants').insert({ name: restaurantName, slug, phone, email }).select().single()
      if (restError) throw new Error(restError.message)

      // 3. Vincular como owner
      await supabase.from('restaurant_members').insert({
        restaurant_id: rest.id, user_id: userId, role: 'owner', name: nome
      })

      // 4. Criar sequência de pedidos
      await supabase.from('order_sequences').insert({ restaurant_id: rest.id, last_number: 0 })

      router.push('/onboarding')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', margin: '0 auto 12px', boxShadow: '0 4px 14px rgba(234,88,12,.35)'
          }}>🍽️</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Gastroo</h1>
          <p style={{ color: 'var(--tx2)', fontSize: '.85rem', marginTop: 4 }}>Cadastre seu restaurante — grátis</p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1,2].map(s => (
            <div key={s} style={{
              width: 32, height: 4, borderRadius: 2,
              background: s <= step ? 'var(--brand)' : 'var(--border)'
            }} />
          ))}
        </div>

        <div className="card" style={{ padding: '28px 32px' }}>
          <h2 style={{ marginBottom: 6, fontSize: '1rem' }}>
            {step === 1 ? 'Seus dados de acesso' : 'Dados do restaurante'}
          </h2>
          <p style={{ color: 'var(--tx2)', fontSize: '.78rem', marginBottom: 20 }}>
            {step === 1 ? 'Passo 1 de 2' : 'Passo 2 de 2'}
          </p>

          {error && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '.83rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {step === 1 ? (
              <>
                <div>
                  <label>Seu nome</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} required placeholder="João Silva" />
                </div>
                <div>
                  <label>E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="joao@restaurante.com" />
                </div>
                <div>
                  <label>Senha (mín. 6 caracteres)</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label>Nome do restaurante *</label>
                  <input value={restaurantName} onChange={e => setRestaurantName(e.target.value)} required placeholder="Ex: Sabor & Arte" />
                </div>
                <div>
                  <label>Telefone / WhatsApp</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(47) 99999-0000" />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Criando conta...' : step === 1 ? 'Próximo →' : '🎉 Criar minha conta'}
            </button>

            {step === 2 && (
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                ← Voltar
              </button>
            )}
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '.83rem', color: 'var(--tx2)' }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
        </p>
      </div>
    </div>
  )
}
