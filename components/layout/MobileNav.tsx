'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mobileNav = [
  { href: '/dashboard',  icon: '◼', label: 'Início' },
  { href: '/comandas',   icon: '🏷️', label: 'Comandas' },
  { href: '/pedidos',    icon: '🧾', label: 'Pedidos' },
  { href: '/caixa',      icon: '💵', label: 'Caixa' },
  { href: '/cardapio',   icon: '📋', label: 'Cardápio' },
]

export default function MobileNav() {
  const pathname = usePathname()
  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }
  return (
    <nav className="mobile-bottom-nav">
      {mobileNav.map(item => (
        <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
          <div className={`mobile-nav-item${isActive(item.href) ? ' active' : ''}`}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: '.6rem', fontWeight: 700, lineHeight: 1 }}>{item.label}</span>
          </div>
        </Link>
      ))}
    </nav>
  )
}
