'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Email ou senha incorretos.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', boxShadow: '0 4px 14px rgba(234,88,12,.35)', padding: 10
          }}>
            <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
              <line x1="10" y1="4" x2="10" y2="14" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="7"  y1="4" x2="7"  y2="10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="13" y1="4" x2="13" y2="10" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M7 10 Q10 13.5 13 10" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <line x1="10" y1="13" x2="10" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M22 4 C22 4 25 7 25 13 L22 15" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="22" y1="4" x2="22" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--tx)' }}>Gastroo</h1>
          <p style={{ color: 'var(--tx2)', fontSize: '.85rem', marginTop: 4 }}>ERP para restaurantes</p>
        </div>

        <div className="card" style={{ padding: '28px 32px' }}>
          <h2 style={{ marginBottom: 20, fontSize: '1.1rem' }}>Entrar na sua conta</h2>

          {error && (
            <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '.83rem', marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <label style={{ margin: 0 }}>Senha</label>
                <Link href="/esqueci-senha" style={{ fontSize: '.72rem', color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
                  Esqueci minha senha
                </Link>
              </div>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '.83rem', color: 'var(--tx2)' }}>
          Não tem conta?{' '}
          <Link href="/cadastro" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>
            Cadastre seu restaurante
          </Link>
        </p>
      </div>
    </div>
  )
}
