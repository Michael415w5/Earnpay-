import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { auth } from '@/lib/auth'
import { getDashboardSnapshot } from '@/lib/earnpay-data'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const data = await getDashboardSnapshot(session.user.id, session.user.email, session.user.name)
  return <DashboardShell data={data} />
}
