'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function EsqueciSenhaPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) { setError('Erro ao enviar email. Verifique o endereço.'); setLoading(false); return }
    setSent(true)
    setLoading(false)
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
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>📧</div>
              <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Email enviado!</h2>
              <p style={{ color: 'var(--tx2)', fontSize: '.875rem', marginBottom: 20 }}>
                Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
              </p>
              <Link href="/login" className="btn btn-primary btn-lg" style={{ display: 'block', textAlign: 'center' }}>
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ marginBottom: 6, fontSize: '1.1rem', fontWeight: 800 }}>Recuperar senha</h2>
              <p style={{ color: 'var(--tx2)', fontSize: '.83rem', marginBottom: 20 }}>
                Digite seu email e enviaremos um link para redefinir sua senha.
              </p>
              {error && (
                <div style={{ background: 'var(--red-bg)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: '.83rem', marginBottom: 16 }}>{error}</div>
              )}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label>E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com" autoFocus />
                </div>
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: '.83rem', color: 'var(--tx2)' }}>
          <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>← Voltar para o login</Link>
        </p>
      </div>
    </div>
  )
}
