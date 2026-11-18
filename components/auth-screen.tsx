'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, LockKeyhole, WalletCards } from 'lucide-react'
import { initializeAccount } from '@/app/actions'
import { authClient } from '@/lib/auth-client'

type AuthScreenProps = { mode: 'sign-in' | 'sign-up' }

export function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const isSignUp = mode === 'sign-up'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nativeEvent = event.nativeEvent as SubmitEvent & { isComposing?: boolean; keyCode?: number }
    if (nativeEvent.isComposing || nativeEvent.keyCode === 229) return
    setError('')
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    startTransition(async () => {
      const result = isSignUp
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password })

      if (result.error) {
        setError('We couldn’t complete that request. Check your details and try again.')
        return
      }

      if (isSignUp) {
        const referralCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') ?? undefined : undefined
        await initializeAccount(referralCode)
      }
      router.push('/dashboard')
      router.refresh()
    })
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="About EarnPay">
        <Link href="/sign-in" className="brand brand-light"><span className="brand-icon"><WalletCards /></span>EarnPay</Link>
        <div className="story-copy">
          <span className="eyebrow light-eyebrow">A clearer way to earn</span>
          <h1>Make your everyday progress<br /><em>count.</em></h1>
          <p>Track demo earnings, complete daily activities and share your invite link from one simple dashboard.</p>
          <div className="story-points">
            <span><CheckCircle2 /> Clear activity history</span>
            <span><CheckCircle2 /> Daily earning challenges</span>
            <span><CheckCircle2 /> A demo wallet with no real funds</span>
          </div>
        </div>
        <p className="auth-footnote">EarnPay is a product demo. No real payments are processed.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <span className="mobile-brand brand"><span className="brand-icon"><WalletCards /></span>EarnPay</span>
          <div className="auth-kicker"><LockKeyhole /> SECURE ACCOUNT ACCESS</div>
          <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subtitle">{isSignUp ? 'Set up your profile and start exploring EarnPay.' : 'Sign in to continue to your EarnPay dashboard.'}</p>
          <form className="form-stack" onSubmit={handleSubmit}>
            {isSignUp && <label className="field-label">Full name<input name="name" type="text" autoComplete="name" placeholder="Alex Morgan" minLength={2} maxLength={60} required /></label>}
            <label className="field-label">Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label className="field-label">Password<input name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={isSignUp ? 10 : 1} placeholder={isSignUp ? 'At least 10 characters' : 'Enter your password'} required /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="button button-primary button-wide" type="submit" disabled={pending}>
              {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'} {!pending && <ArrowRight />}
            </button>
          </form>
          <p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to EarnPay?'} <Link href={isSignUp ? '/sign-in' : '/sign-up'}>{isSignUp ? 'Sign in' : 'Create an account'}</Link></p>
          <div className="demo-callout"><span className="demo-dot" /><p><strong>Demo wallet notice</strong><br />Any displayed balances, rewards and payment activity are simulated until a verified payment provider is connected.</p></div>
        </div>
      </section>
    </main>
  )
}
