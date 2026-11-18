'use client'

import { useMemo, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BadgeHelp, BookOpen, Check, CheckCircle2,
  ChevronDown, CircleDollarSign, Copy, CreditCard, Gift, House, LogOut, Menu, Search,
  Settings2, ShieldCheck, Sparkles, Sunrise, Wallet, WalletCards, X,
} from 'lucide-react'
import { claimDailyTask, saveProfile, sendSupportMessage, simulateDeposit, simulateWithdrawal, type ActionResult } from '@/app/actions'
import { authClient } from '@/lib/auth-client'
import { earningTasks, type DashboardSnapshot } from '@/lib/earnpay-shared'

type View = 'overview' | 'tasks' | 'deposit' | 'withdraw' | 'referrals' | 'transactions' | 'support' | 'settings'
type Props = { data: DashboardSnapshot }

const navigation: { id: View; label: string; icon: typeof House }[] = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'tasks', label: 'Daily tasks', icon: Sparkles },
  { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
  { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
  { id: 'referrals', label: 'Referrals', icon: Gift },
  { id: 'transactions', label: 'Activity', icon: ArrowLeftRight },
  { id: 'support', label: 'Support', icon: BadgeHelp },
  { id: 'settings', label: 'Settings', icon: Settings2 },
]

const countries = ['United States', 'United Kingdom', 'Canada', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'India', 'Bangladesh', 'Philippines']
const withdrawalMethods = ['Bank Account', 'Chime', 'PayPal', 'Cash App', 'Venmo', 'Apple Pay', 'Zelle', 'Interac e-Transfer', 'Wise']
const depositMethods = ['Bank transfer demo', 'Card demo', 'Digital wallet demo']

function formatUsd(value: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
}

function displayDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'EP'
}

export function DashboardShell({ data }: Props) {
  const router = useRouter()
  const [activeView, setActiveView] = useState<View>('overview')
  const [notice, setNotice] = useState('')
  const [pending, startTransition] = useTransition()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const todayTasks = useMemo(() => earningTasks, [])
  const taskEarnings = data.transactions.filter((tx) => tx.type === 'Earning task').reduce((sum, tx) => sum + Number(tx.amount), 0)

  function runAction(action: () => Promise<ActionResult>) {
    setNotice('')
    startTransition(async () => {
      try {
        const result = await action()
        setNotice(result.message)
        if (result.ok) router.refresh()
      } catch {
        setNotice('We couldn’t complete that action. Please try again.')
      }
    })
  }

  function onTaskClaim(taskId: string) {
    runAction(() => claimDailyTask(taskId))
  }

  function onDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runAction(() => simulateDeposit(String(form.get('amount') ?? ''), String(form.get('method') ?? '')))
    event.currentTarget.reset()
  }

  function onWithdraw(amount: string, country: string, method: string, onComplete: () => void) {
    setNotice('')
    startTransition(async () => {
      try {
        const result = await simulateWithdrawal(amount, country, method)
        setNotice(result.message)
        if (result.ok) {
          router.refresh()
          onComplete()
        }
      } catch {
        setNotice('We couldn’t complete that action. Please try again.')
      }
    })
  }

  function onProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runAction(() => saveProfile(String(form.get('name') ?? '')))
  }

  function onSupportSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runAction(() => sendSupportMessage(String(form.get('subject') ?? ''), String(form.get('message') ?? '')))
    event.currentTarget.reset()
  }

  async function copyReferralLink() {
    const link = `${window.location.origin}/sign-up?ref=${encodeURIComponent(data.referralCode)}`
    try {
      await navigator.clipboard.writeText(link)
      setNotice('Your referral link is copied and ready to share.')
    } catch {
      setNotice(link)
    }
  }

  function signOut() {
    startTransition(async () => {
      await authClient.signOut()
      router.replace('/sign-in')
      router.refresh()
    })
  }

  function chooseView(id: View) {
    setActiveView(id)
    setMobileMenuOpen(false)
    setNotice('')
  }

  const activeItem = navigation.find((item) => item.id === activeView) ?? navigation[0]
  const ActiveIcon = activeItem.icon

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <Link href="/dashboard" className="brand"><span className="brand-icon"><WalletCards /></span>EarnPay</Link>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={`nav-link ${activeView === id ? 'nav-link-active' : ''}`} onClick={() => chooseView(id)} aria-current={activeView === id ? 'page' : undefined}>
              <Icon /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><ShieldCheck /></span><strong>Built for clarity</strong><p>Your account activity and payment options, all in one place.</p></div>
          {data.role === 'admin' && <Link href="/admin" className="admin-link"><ShieldCheck /> Admin dashboard</Link>}
          <button type="button" className="nav-link" onClick={signOut}><LogOut /><span>Sign out</span></button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button type="button" className="icon-button menu-toggle" aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X /> : <Menu />}</button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{activeItem.label}</strong></div>
          <div className="topbar-tools">
            <button type="button" className="user-menu" onClick={() => chooseView('settings')} aria-label="Open profile settings"><span className="avatar">{initials(data.name)}</span><span className="user-menu-name">{data.name}</span><ChevronDown /></button>
          </div>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <div><div className="eyebrow">{activeView === 'overview' ? 'YOUR MONEY, AT A GLANCE' : 'EARNPAY WORKSPACE'}</div><h1>{activeView === 'overview' ? `Good day, ${data.name.split(' ')[0]}` : activeItem.label}</h1><p>{activeView === 'overview' ? 'Here’s what’s happening with your account today.' : headingCopy(activeView)}</p></div>
            <button type="button" className="button button-quiet page-search" onClick={() => chooseView('transactions')}><Search /> Search activity</button>
          </div>

          {notice && <div className="inline-notice" role="status" aria-live="polite">{notice}</div>}

          {activeView === 'overview' && <Overview data={data} taskEarnings={taskEarnings} pending={pending} onClaim={onTaskClaim} onView={chooseView} />}
          {activeView === 'tasks' && <TaskList data={data} tasks={todayTasks} pending={pending} onClaim={onTaskClaim} />}
          {activeView === 'deposit' && <DepositPanel pending={pending} onSubmit={onDeposit} />}
          {activeView === 'withdraw' && <WithdrawPanel balance={data.balance} pending={pending} onSubmit={onWithdraw} />}
          {activeView === 'referrals' && <ReferralPanel data={data} onCopy={copyReferralLink} />}
          {activeView === 'transactions' && <TransactionPanel transactions={data.transactions} />}
          {activeView === 'support' && <SupportPanel data={data} pending={pending} onSubmit={onSupportSend} />}
          {activeView === 'settings' && <SettingsPanel data={data} pending={pending} onSubmit={onProfileSave} onSignOut={signOut} />}

          <footer className="page-footer"><span>EarnPay · Account workspace</span><span>USD account activity</span></footer>
        </main>
      </div>
    </div>
  )
}

function headingCopy(view: View) {
  const copy: Record<View, string> = {
    overview: '', tasks: 'Complete daily activities and track your progress.', deposit: 'Add funds to your account using an available payment method.', withdraw: 'Choose an amount and payout method to review your request.', referrals: 'Invite friends with your personal referral link.', transactions: 'A clear record of your recent account activity.', support: 'Send a message to the EarnPay support team.', settings: 'Manage your profile and sign-in session.',
  }
  return copy[view]
}

function Overview({ data, taskEarnings, pending, onClaim, onView }: { data: DashboardSnapshot; taskEarnings: number; pending: boolean; onClaim: (id: string) => void; onView: (view: View) => void }) {
  const activity = data.transactions.slice(0, 4)
  const openTasks = earningTasks.filter((task) => !data.claimedTaskIds.includes(task.id))
  return (
    <>
      <section className="overview-grid">
        <div className="balance-card">
          <div className="balance-card-head"><div><span className="balance-label">AVAILABLE BALANCE</span><div className="balance-amount">{formatUsd(data.balance)}</div></div><span className="balance-icon"><Wallet /></span></div>
          <div className="balance-bottom"><span><span className="balance-led" /> Preview balance · not redeemable</span><span>USD</span></div>
          <div className="balance-actions"><button type="button" onClick={() => onView('deposit')}><ArrowDownLeft /> Add funds</button><button type="button" onClick={() => onView('withdraw')}><ArrowUpRight /> Withdraw</button></div>
        </div>
        <div className="quick-card"><div className="quick-card-heading"><span className="metric-icon mint"><Sparkles /></span><span className="metric-caption">Demo task rewards</span></div><div className="metric-value">{formatUsd(taskEarnings)}</div><div className="metric-note">From recent daily activities</div><button type="button" className="text-link" onClick={() => onView('tasks')}>View earning tasks <ArrowRightSmall /></button></div>
      </section>
      <section className="stat-row">
        <StatCard label="Completed tasks" value={`${data.claimedTaskIds.length} / ${earningTasks.length}`} icon={<CheckCircle2 />} note="Today" />
        <StatCard label="People referred" value={String(data.referralCount)} icon={<Gift />} note="Total invites" />
        <StatCard label="Recent activity" value={String(data.transactions.length)} icon={<ArrowLeftRight />} note="Recorded events" />
      </section>
      <section className="content-grid overview-lower">
        <div className="surface-card task-preview-card"><div className="card-heading"><div><h2>Today’s tasks</h2><p>Small steps, sample rewards.</p></div><button type="button" className="text-link" onClick={() => onView('tasks')}>See all <ArrowRightSmall /></button></div>
          <div className="task-preview-list">{openTasks.slice(0, 2).map((task) => <TaskRow key={task.id} task={task} pending={pending} onClaim={onClaim} compact />)}{openTasks.length === 0 && <p className="muted-copy">You’re all caught up. New demo tasks reset daily.</p>}</div>
        </div>
        <div className="surface-card activity-card"><div className="card-heading"><div><h2>Recent activity</h2><p>Latest simulated account changes.</p></div><button type="button" className="icon-button" aria-label="View all activity" onClick={() => onView('transactions')}><ArrowLeftRight /></button></div>
          {activity.length ? <div className="activity-list">{activity.map((tx) => <TransactionItem key={tx.id} tx={tx} />)}</div> : <EmptyState icon={<ArrowLeftRight />} title="No activity yet" text="When you complete a task, it will appear here." />}
        </div>
      </section>
    </>
  )
}

function ArrowRightSmall() { return <span aria-hidden="true">→</span> }

function StatCard({ label, value, icon, note }: { label: string; value: string; icon: ReactNode; note: string }) {
  return <div className="surface-card stat-card"><div className="stat-card-top"><span className="metric-icon lilac">{icon}</span><span className="stat-note">{note}</span></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
}

function TaskList({ data, tasks, pending, onClaim }: { data: DashboardSnapshot; tasks: typeof earningTasks; pending: boolean; onClaim: (id: string) => void }) {
  return <section className="surface-card section-card"><div className="card-heading"><div><h2>Daily earning tasks</h2><p>Rewards are simulated and added to your demo balance only.</p></div><span className="task-reset"><Sunrise /> Resets daily</span></div><div className="task-list">{tasks.map((task) => <TaskRow key={task.id} task={task} pending={pending} onClaim={onClaim} claimed={data.claimedTaskIds.includes(task.id)} />)}</div><p className="fine-print">Demo rewards are not cash, do not have monetary value, and cannot be withdrawn.</p></section>
}

function TaskRow({ task, pending, onClaim, claimed = false, compact = false }: { task: (typeof earningTasks)[number]; pending: boolean; onClaim: (id: string) => void; claimed?: boolean; compact?: boolean }) {
  const TaskIcon = task.icon === 'sunrise' ? Sunrise : task.icon === 'book-open' ? BookOpen : ShieldCheck
  return <div className={`task-row ${compact ? 'task-row-compact' : ''}`}><span className="task-icon"><TaskIcon /></span><div className="task-copy"><strong>{task.title}</strong><span>{task.description}</span></div><span className="task-reward">+{formatUsd(task.reward)}</span><button className={`button ${claimed ? 'button-complete' : 'button-outline'}`} type="button" onClick={() => onClaim(task.id)} disabled={claimed || pending}>{claimed ? <><Check /> Claimed</> : pending ? 'Working…' : 'Claim demo'}</button></div>
}

function DepositPanel({ pending, onSubmit }: { pending: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="form-layout"><section className="surface-card section-card"><div className="card-heading"><div><h2>Simulate a deposit</h2><p>Add sample USD to explore the wallet flow.</p></div><span className="metric-icon lilac"><ArrowDownLeft /></span></div><form className="form-stack" onSubmit={onSubmit}><label className="field-label">Amount in USD<div className="input-with-prefix"><span>$</span><input name="amount" type="number" min="0.01" max="5000" step="0.01" placeholder="0.00" required /></div></label><label className="field-label">Demo payment method<select name="method" required defaultValue=""><option value="" disabled>Choose a demo method</option>{depositMethods.map((method) => <option key={method}>{method}</option>)}</select></label><button type="submit" className="button button-primary" disabled={pending}>{pending ? 'Adding sample funds…' : 'Add simulated funds'}</button></form><div className="inline-warning"><ShieldCheck /><span>No card or bank details are collected. This does not initiate a real payment.</span></div></section><aside className="surface-card side-info"><span className="metric-icon mint"><CircleDollarSign /></span><h3>Safe to explore</h3><p>Deposits increase your sample wallet balance only. The amount is not charged, held, or transferred.</p><div className="info-divider" /><span className="small-label">PAYMENT PROVIDER</span><strong>Not connected</strong></aside></div>
}

function WithdrawPanel({ balance, pending, onSubmit }: { balance: string; pending: boolean; onSubmit: (amount: string, country: string, method: string, onComplete: () => void) => void }) {
  const [step, setStep] = useState(1)
  const [amount, setAmount] = useState('')
  const [country, setCountry] = useState('')
  const [method, setMethod] = useState('')
  const [confirmedPreview, setConfirmedPreview] = useState(false)
  const [error, setError] = useState('')
  const availableBalance = Number(balance)
  const requestedAmount = Number(amount)
  const stepLabels = ['Amount', 'Method', 'Country', 'Review', 'Complete']

  function continueFlow() {
    setError('')
    if (step === 1) {
      if (!Number.isFinite(requestedAmount) || requestedAmount < 1000) {
        setError('The minimum withdrawal amount is $1,000.00.')
        return
      }
      if (requestedAmount > 5000) {
        setError('The maximum withdrawal amount is $5,000.00.')
        return
      }
      if (requestedAmount > availableBalance) {
        setError('Your available balance is below the requested amount.')
        return
      }
    }
    if (step === 2 && !withdrawalMethods.includes(method)) {
      setError('Choose a payout method to continue.')
      return
    }
    if (step === 3 && !countries.includes(country)) {
      setError('Choose a country to continue.')
      return
    }
    if (step === 4) {
      if (!confirmedPreview) {
        setError('Confirm that you understand this is a preview request.')
        return
      }
      onSubmit(amount, country, method, () => setStep(5))
      return
    }
    setStep((current) => current + 1)
  }

  function restartFlow() {
    setAmount('')
    setCountry('')
    setMethod('')
    setConfirmedPreview(false)
    setError('')
    setStep(1)
  }

  return <div className="withdrawal-layout">
    <section className="surface-card withdrawal-card">
      <div className="withdrawal-balance"><div><span className="small-label">AVAILABLE BALANCE</span><strong>{formatUsd(balance)}</strong><span>Preview funds · not redeemable</span></div><span className="withdrawal-balance-icon"><Wallet /></span></div>
      <div className="withdrawal-progress" role="progressbar" aria-label={`Step ${step} of 5`} aria-valuemin={1} aria-valuemax={5} aria-valuenow={step}>
        {stepLabels.map((label, index) => <div key={label} className={`withdrawal-progress-step ${step >= index + 1 ? 'withdrawal-progress-active' : ''}`}><span>{step > index + 1 ? <Check /> : index + 1}</span><small>{label}</small></div>)}
      </div>
      <div className="withdrawal-step-heading"><span>STEP {step} OF 5</span><h2>{['Choose an amount', 'Select a payout method', 'Choose your country', 'Review your request', 'Request recorded'][step - 1]}</h2><p>{['Withdrawals start at $1,000.00.', 'Choose where you would like to receive a payout.', 'Select the country for this payout method.', 'Check the details before recording your request.', 'Your request was added to account activity.'][step - 1]}</p></div>

      {step === 1 && <div className="withdrawal-step-content"><label className="field-label" htmlFor="withdrawal-amount">Withdrawal amount<div className="input-with-prefix"><span>$</span><input id="withdrawal-amount" name="amount" type="number" min="1000" max="5000" step="0.01" placeholder="1,000.00" value={amount} onChange={(event) => setAmount(event.target.value)} aria-describedby="withdrawal-limit" required /></div></label><div className="withdrawal-field-note" id="withdrawal-limit">Minimum $1,000.00 <span>·</span> Maximum $5,000.00</div><button type="button" className="button button-primary button-wide" onClick={continueFlow}>Continue <ArrowUpRight /></button></div>}

      {step === 2 && <div className="withdrawal-step-content"><label className="field-label" htmlFor="withdrawal-method">Payout method<select id="withdrawal-method" name="method" value={method} onChange={(event) => setMethod(event.target.value)} required><option value="" disabled>Select a payout method</option>{withdrawalMethods.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="withdrawal-step-actions"><button type="button" className="button button-quiet" onClick={() => setStep(1)}>Back</button><button type="button" className="button button-primary" onClick={continueFlow}>Continue <ArrowUpRight /></button></div></div>}

      {step === 3 && <div className="withdrawal-step-content"><label className="field-label" htmlFor="withdrawal-country">Country or region<select id="withdrawal-country" name="country" value={country} onChange={(event) => setCountry(event.target.value)} required><option value="" disabled>Select a country</option>{countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><div className="withdrawal-field-note">No account, card, or wallet credentials are collected.</div><div className="withdrawal-step-actions"><button type="button" className="button button-quiet" onClick={() => setStep(2)}>Back</button><button type="button" className="button button-primary" onClick={continueFlow}>Review request <ArrowUpRight /></button></div></div>}

      {step === 4 && <div className="withdrawal-step-content"><dl className="withdrawal-review"><div><dt>Amount</dt><dd>{formatUsd(requestedAmount)}</dd></div><div><dt>Payout method</dt><dd>{method}</dd></div><div><dt>Country or region</dt><dd>{country}</dd></div><div><dt>Remaining preview balance</dt><dd>{formatUsd(availableBalance - requestedAmount)}</dd></div></dl><label className="withdrawal-confirm"><input type="checkbox" checked={confirmedPreview} onChange={(event) => setConfirmedPreview(event.target.checked)} /><span>I understand this is a preview request. No payment provider is connected and no money will be transferred.</span></label><div className="withdrawal-step-actions"><button type="button" className="button button-quiet" onClick={() => setStep(3)}>Back</button><button type="button" className="button button-primary" disabled={pending} onClick={continueFlow}>{pending ? 'Recording…' : 'Record preview request'} <ArrowUpRight /></button></div></div>}

      {step === 5 && <div className="withdrawal-complete"><span className="withdrawal-complete-icon"><CheckCircle2 /></span><strong>{formatUsd(requestedAmount)} preview request recorded</strong><p>It appears in your account activity. No money was sent.</p><button type="button" className="button button-outline" onClick={restartFlow}>Start another request</button></div>}
      {error && <p className="withdrawal-error" role="alert">{error}</p>}
    </section>
    <aside className="surface-card withdrawal-info"><span className="metric-icon lilac"><CreditCard /></span><h3>Withdrawal details</h3><div className="withdrawal-info-row"><span>Minimum</span><strong>$1,000.00</strong></div><div className="withdrawal-info-row"><span>Maximum</span><strong>$5,000.00</strong></div><div className="withdrawal-info-row"><span>Settlement</span><strong>Provider not connected</strong></div><p>Preview balances are not cash. This flow records a sample request and does not contact a bank or payment service.</p></aside>
  </div>
}

function ReferralPanel({ data, onCopy }: { data: DashboardSnapshot; onCopy: () => void }) {
  const link = `/sign-up?ref=${encodeURIComponent(data.referralCode)}`
  return <div className="referral-layout"><section className="referral-hero"><span className="referral-icon"><Gift /></span><span className="eyebrow light-eyebrow">GROW TOGETHER</span><h2>Invite a friend.<br />Share the experience.</h2><p>Your link tracks demo sign-ups. No referral payouts are issued.</p><div className="referral-code">{data.referralCode}</div></section><section className="surface-card section-card referral-link-card"><span className="small-label">YOUR PERSONAL INVITE LINK</span><div className="referral-link-row"><input aria-label="Referral link" readOnly value={link} /><button type="button" className="button button-primary" onClick={onCopy}><Copy /> Copy link</button></div><div className="referral-total"><span className="metric-icon lilac"><Gift /></span><div><strong>{data.referralCount}</strong><span>friends joined</span></div></div><p className="fine-print">Referral tracking is for demonstration. No commissions or cash rewards are paid.</p></section></div>
}

function TransactionPanel({ transactions }: { transactions: DashboardSnapshot['transactions'] }) {
  return <section className="surface-card section-card"><div className="card-heading"><div><h2>Transaction history</h2><p>Recent account activity and payment records.</p></div></div>{transactions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Activity</th><th>Type</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactions.map((tx) => <tr key={tx.id}><td><strong>{tx.details}</strong><span className="table-subtext">Ref {tx.id.slice(0, 8)}</span></td><td>{tx.type}</td><td>{displayDate(tx.createdAt)}</td><td className={`amount-cell ${tx.type === 'Earning task' || tx.type === 'Demo deposit' ? 'positive' : ''}`}>{tx.type === 'Demo withdrawal' ? '−' : '+'}{formatUsd(tx.amount)}</td><td><span className="status-badge">{tx.status}</span></td></tr>)}</tbody></table></div> : <EmptyState icon={<ArrowLeftRight />} title="No transactions yet" text="Your recent account activity will appear here." />}</section>
}

function TransactionItem({ tx }: { tx: DashboardSnapshot['transactions'][number] }) {
  const isPositive = tx.type !== 'Demo withdrawal'
  return <div className="activity-item"><span className={`activity-icon ${isPositive ? 'activity-positive' : 'activity-negative'}`}>{isPositive ? <ArrowDownLeft /> : <ArrowUpRight />}</span><span className="activity-copy"><strong>{tx.details}</strong><small>{displayDate(tx.createdAt)} · {tx.status}</small></span><strong className={isPositive ? 'positive' : ''}>{isPositive ? '+' : '−'}{formatUsd(tx.amount)}</strong></div>
}

function SupportPanel({ data, pending, onSubmit }: { data: DashboardSnapshot; pending: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="content-grid support-layout"><section className="surface-card section-card"><div className="card-heading"><div><h2>Send a message</h2><p>Messages are stored securely in your account.</p></div><span className="metric-icon lilac"><BadgeHelp /></span></div><form className="form-stack" onSubmit={onSubmit}><label className="field-label">Subject<input name="subject" type="text" minLength={3} maxLength={100} placeholder="What can we help with?" required /></label><label className="field-label">Message<textarea name="message" minLength={10} maxLength={1600} rows={5} placeholder="Describe your question or feedback…" required /></label><button type="submit" className="button button-primary" disabled={pending}>{pending ? 'Sending…' : 'Send message'}</button></form></section><section className="surface-card section-card"><div className="card-heading"><div><h2>Recent messages</h2><p>Your support history.</p></div></div>{data.supportMessages.length ? <div className="support-history">{data.supportMessages.map((item) => <div key={item.id} className="support-history-item"><strong>{item.subject}</strong><span>{displayDate(item.createdAt)}</span><span className="status-badge">{item.status}</span></div>)}</div> : <EmptyState icon={<BadgeHelp />} title="No messages yet" text="Your conversations will show up here." />}</section></div>
}

function SettingsPanel({ data, pending, onSubmit, onSignOut }: { data: DashboardSnapshot; pending: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onSignOut: () => void }) {
  return <div className="settings-layout"><section className="surface-card section-card"><div className="card-heading"><div><h2>Profile details</h2><p>Update the name shown on your account.</p></div><span className="avatar avatar-large">{initials(data.name)}</span></div><form className="form-stack" onSubmit={onSubmit}><label className="field-label">Full name<input name="name" type="text" defaultValue={data.name} minLength={2} maxLength={60} required /></label><label className="field-label">Email address<input type="email" value={data.email} readOnly disabled /></label><button type="submit" className="button button-primary" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button></form></section><section className="surface-card section-card settings-security"><span className="metric-icon mint"><ShieldCheck /></span><h2>Account security</h2><p>Your account uses secure email and password authentication. Passwords are handled by Better Auth and never stored in plain text.</p><div className="account-role"><span>Access level</span><strong>{data.role === 'admin' ? 'Administrator' : 'Member'}</strong></div><button type="button" className="button button-outline" onClick={onSignOut}><LogOut /> Sign out</button></section></div>
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state"><span className="metric-icon lilac">{icon}</span><strong>{title}</strong><span>{text}</span></div>
}
