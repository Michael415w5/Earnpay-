'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ArrowLeft, ArrowUpRight, BadgeCheck, Building2, CircleDollarSign, ShieldCheck, Users } from 'lucide-react'
import { reviewManagedTransaction, updateManagedUserRole } from '@/app/actions'
import type { AdminSnapshot } from '@/lib/earnpay-shared'

function formatUsd(value: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value))
}

function displayDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

export function AdminConsole({ adminName, data }: { adminName: string; data: AdminSnapshot }) {
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState('')

  function changeRole(userId: string, role: string) {
    startTransition(async () => {
      const result = await updateManagedUserRole(userId, role)
      setNotice(result.message)
    })
  }

  function review(transactionId: string, decision: 'reviewed' | 'declined') {
    startTransition(async () => {
      const result = await reviewManagedTransaction(transactionId, decision)
      setNotice(result.message)
    })
  }

  return <main className="admin-page"><header className="admin-topbar"><Link href="/dashboard" className="brand"><span className="brand-icon"><Building2 /></span>EarnPay <span className="admin-wordmark">Admin</span></Link><Link href="/dashboard" className="button button-quiet"><ArrowLeft /> Back to dashboard</Link></header><div className="admin-content"><div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>Operations overview</h1><p>Welcome, {adminName}. Manage accounts and review simulated activity.</p></div><span className="admin-secure"><ShieldCheck /> Protected admin access</span></div><div className="demo-banner"><ShieldCheck /><p><strong>Demo operations only</strong><span>These controls manage EarnPay demo records. No payment, deposit, or withdrawal is connected.</span></p></div>{notice && <div className="inline-notice" role="status">{notice}</div>}<section className="admin-stat-grid"><AdminStat icon={<Users />} label="Registered users" value={data.totalUsers} /><AdminStat icon={<ArrowUpRight />} label="Demo transactions" value={data.totalTransactions} /><AdminStat icon={<BadgeCheck />} label="Support messages" value={data.totalSupportMessages} /></section><section className="surface-card section-card admin-section"><div className="card-heading"><div><h2>User management</h2><p>Up to 100 most recent accounts.</p></div></div>{data.users.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>User</th><th>Joined</th><th>Role</th><th>Access</th></tr></thead><tbody>{data.users.map((member) => <UserRow key={member.id} member={member} pending={pending} onRoleChange={changeRole} />)}</tbody></table></div> : <div className="empty-state"><span className="metric-icon lilac"><Users /></span><strong>No users yet</strong></div>}</section><section className="surface-card section-card admin-section"><div className="card-heading"><div><h2>Transaction review</h2><p>Internal review actions update demo statuses only.</p></div><span className="metric-icon peach"><CircleDollarSign /></span></div>{data.transactions.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Account</th><th>Activity</th><th>Date</th><th>Amount</th><th>Status</th><th>Review</th></tr></thead><tbody>{data.transactions.map((tx) => <tr key={tx.id}><td><strong>{tx.userName}</strong><span className="table-subtext">{tx.userEmail}</span></td><td><strong>{tx.details}</strong><span className="table-subtext">{tx.type}</span></td><td>{displayDate(tx.createdAt)}</td><td>{formatUsd(tx.amount)}</td><td><span className="status-badge">{tx.status}</span></td><td><div className="review-actions"><button type="button" className="button button-outline button-small" disabled={pending || tx.status !== 'Simulated'} onClick={() => review(tx.id, 'reviewed')}>Review</button><button type="button" className="button button-quiet button-small" disabled={pending || tx.status !== 'Simulated'} onClick={() => review(tx.id, 'declined')}>Decline</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><span className="metric-icon lilac"><CircleDollarSign /></span><strong>No activity to review</strong><span>Demo requests will appear here.</span></div>}</section><p className="admin-footer">Admin actions are recorded for demo management only. EarnPay does not hold or transfer funds.</p></div></main>
}

function AdminStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="surface-card admin-stat"><span className="metric-icon lilac">{icon}</span><div><strong>{value}</strong><span>{label}</span></div></div>
}

function UserRow({ member, pending, onRoleChange }: { member: AdminSnapshot['users'][number]; pending: boolean; onRoleChange: (userId: string, role: string) => void }) {
  const [role, setRole] = useState(member.role)
  return <tr><td><strong>{member.name}</strong><span className="table-subtext">{member.email}</span></td><td>{displayDate(member.createdAt)}</td><td><span className={`role-badge ${role === 'admin' ? 'role-admin' : ''}`}>{role}</span></td><td><div className="role-control"><select aria-label={`Role for ${member.name}`} value={role} onChange={(event) => setRole(event.target.value)}><option value="user">Member</option><option value="admin">Admin</option></select><button type="button" className="button button-outline button-small" disabled={pending || role === member.role} onClick={() => onRoleChange(member.id, role)}>Save</button></div></td></tr>
}
