'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RedefinirSenhaPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase troca o hash da URL por uma sessão ao carregar
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('Erro ao redefinir senha. Tente novamente.'); setLoading(false); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 14px rgba(234,88,12,.35)', padding: 10 }}>
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
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Gastroo</h1>
        </div>

        <div className="card" style={{ padding: '28px 32px' }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>✅</div>
              <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Senha redefinida!</h2>
              <p style={{ color: 'var(--tx2)', fontSize: '.875rem' }}>Redirecionando para o login...</p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🔗</div>
              <p style={{ color: 'var(--tx2)' }}>Validando link de recuperação...</p>
              <p style={{ color: 'var(--tx3)', fontSize: '.8rem', marginTop: 8 }}>Se demorar, volte ao email e clique no link novamente.</p>
              <Link href="/esqueci-senha" style={{ color: 'var(--brand)', fontSize: '.83rem', fontWeight: 600, textDecoration: 'none', display: 'block', marginTop: 16 }}>
                Reenviar email
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: 6, fontSize: '1.1rem', fontWeight: 800 }}>Nova senha</h2>
              <p style={{ color: 'var(--tx2)', fontSize: '.83rem', marginBottom: 20 }}>Digite e confirme sua nova senha.</p>
              {error && (
                <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '.83rem', marginBottom: 16 }}>{error}</div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label>Nova senha</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" autoFocus />
                </div>
                <div>
                  <label>Confirmar senha</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Repita a senha" />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
