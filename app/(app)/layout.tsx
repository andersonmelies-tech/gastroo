import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar restaurante do usuário
  const { data: member } = await supabase
    .from('restaurant_members')
    .select('restaurant_id, role, restaurants(name)')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  if (!member) redirect('/onboarding')

  const restaurant = (member.restaurants as unknown) as { name: string } | null

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar restaurantName={restaurant?.name} />
      <main style={{
        flex: 1,
        marginLeft: 'var(--sidebar-w)',
        minHeight: '100vh',
        background: 'var(--bg)',
      }}>
        <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
