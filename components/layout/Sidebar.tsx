'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard',      icon: '◼', label: 'Dashboard' },
  { href: '/pedidos',        icon: '🧾', label: 'Pedidos' },
  { href: '/comandas',       icon: '🏷️', label: 'Comandas' },
  { href: '/mesas',          icon: '🪑', label: 'Mesas' },
  { href: '/cardapio',       icon: '📋', label: 'Cardápio' },
  { href: '/caixa',          icon: '💵', label: 'Caixa' },
  { href: '/estoque',        icon: '📦', label: 'Estoque' },
  { href: '/clientes',       icon: '👥', label: 'Clientes' },
  { href: '/financeiro',     icon: '💰', label: 'Financeiro' },
  { href: '/relatorios',     icon: '📊', label: 'Relatórios' },
]

const navBottom = [
  { href: '/usuarios',       icon: '👤', label: 'Usuários' },
  { href: '/configuracoes',  icon: '⚙️', label: 'Configurações' },
]

export default function Sidebar({ restaurantName }: { restaurantName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0,
      zIndex: 100, borderRight: '1px solid #1a1a1a'
    }}>
      {/* Logo */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: 'var(--brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            flexShrink: 0
          }}>🍽️</div>
          <div>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '.95rem', lineHeight: 1.2, letterSpacing: '-.02em' }}>gastroo</div>
            <div style={{ color: '#ea580c', fontSize: '.67rem', lineHeight: 1.2, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>
              {restaurantName || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {nav.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, marginBottom: 2, transition: 'all .15s', cursor: 'pointer',
              background: isActive(item.href) ? 'rgba(234,88,12,.15)' : 'transparent',
              borderLeft: isActive(item.href) ? '3px solid var(--sb-accent)' : '3px solid transparent',
            }}>
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{
                fontSize: '.83rem', fontWeight: isActive(item.href) ? 700 : 500,
                color: isActive(item.href) ? '#fff' : 'var(--sb-tx)',
              }}>{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* Bottom nav */}
      <div style={{ padding: '8px 8px', borderTop: '1px solid #1a1a1a' }}>
        {navBottom.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 8, marginBottom: 2, transition: 'all .15s',
              background: isActive(item.href) ? 'rgba(234,88,12,.15)' : 'transparent',
              borderLeft: isActive(item.href) ? '3px solid var(--sb-accent)' : '3px solid transparent',
            }}>
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{item.icon}</span>
              <span style={{
                fontSize: '.83rem', fontWeight: 500,
                color: isActive(item.href) ? '#fff' : 'var(--sb-tx)',
              }}>{item.label}</span>
            </div>
          </Link>
        ))}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
          borderRadius: 8, width: '100%', background: 'transparent', border: 'none',
          cursor: 'pointer', marginTop: 4
        }}>
          <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>↩</span>
          <span style={{ fontSize: '.83rem', fontWeight: 500, color: 'var(--sb-tx)' }}>Sair</span>
        </button>
      </div>
    </aside>
  )
}
