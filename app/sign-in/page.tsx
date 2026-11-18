import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthScreen } from '@/components/auth-screen'
import { auth } from '@/lib/auth'

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')
  return <AuthScreen mode="sign-in" />
}
