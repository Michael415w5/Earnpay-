import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminConsole } from '@/components/admin-console'
import { auth } from '@/lib/auth'
import { getAdminSnapshot, getDashboardSnapshot } from '@/lib/earnpay-data'

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  await getDashboardSnapshot(session.user.id, session.user.email, session.user.name)
  const data = await getAdminSnapshot(session.user.id)
  if (data === null) redirect('/dashboard')

  return <AdminConsole adminName={session.user.name} data={data} />
}
