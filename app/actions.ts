'use server'

import { randomUUID } from 'node:crypto'
import { and, eq, gte, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { supportMessages, taskClaims, transactions, user, wallets } from '@/lib/db/schema'
import { ensureAccount } from '@/lib/earnpay-data'
import { earningTasks } from '@/lib/earnpay-shared'

export type ActionResult = { ok: boolean; message: string }

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

async function requireAdmin() {
  const sessionUser = await getSessionUser()
  await ensureAccount(sessionUser.id, sessionUser.email, sessionUser.name)
  const [currentUser] = await db.select({ role: user.role }).from(user).where(eq(user.id, sessionUser.id)).limit(1)
  if (currentUser?.role !== 'admin') throw new Error('Forbidden')
  return sessionUser
}

function amountInCents(value: unknown) {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 5000) return null
  return Math.round(amount * 100)
}

function money(cents: number) {
  return (cents / 100).toFixed(2)
}

export async function initializeAccount(referralCode?: string): Promise<ActionResult> {
  const currentUser = await getSessionUser()
  await ensureAccount(currentUser.id, currentUser.email, currentUser.name, referralCode)
  return { ok: true, message: 'Account is ready.' }
}

export async function claimDailyTask(taskId: string): Promise<ActionResult> {
  const currentUser = await getSessionUser()
  const task = earningTasks.find((item) => item.id === taskId)
  if (!task) return { ok: false, message: 'That task is not available.' }
  await ensureAccount(currentUser.id, currentUser.email, currentUser.name)

  const today = new Date().toISOString().slice(0, 10)
  const result = await db.transaction(async (tx) => {
    const [claim] = await tx.insert(taskClaims).values({ userId: currentUser.id, taskKey: task.id, claimedDate: today, amount: task.reward })
      .onConflictDoNothing().returning({ taskKey: taskClaims.taskKey })
    if (!claim) return false
    await tx.update(wallets).set({ demoBalance: sql`${wallets.demoBalance} + ${task.reward}`, updatedAt: new Date() }).where(eq(wallets.userId, currentUser.id))
    await tx.insert(transactions).values({ id: randomUUID(), userId: currentUser.id, type: 'Earning task', amount: task.reward, status: 'Simulated', details: task.title })
    return true
  })

  if (!result) return { ok: false, message: 'You already claimed this task today.' }
  revalidatePath('/dashboard')
  return { ok: true, message: `Demo reward of $${task.reward} added to your sample balance.` }
}

export async function simulateDeposit(rawAmount: unknown, method: string): Promise<ActionResult> {
  const currentUser = await getSessionUser()
  const cents = amountInCents(rawAmount)
  const methods = ['Bank transfer demo', 'Card demo', 'Digital wallet demo']
  if (!cents) return { ok: false, message: 'Enter an amount between $0.01 and $5,000.' }
  if (!methods.includes(method)) return { ok: false, message: 'Choose a listed demo method.' }
  await ensureAccount(currentUser.id, currentUser.email, currentUser.name)

  const amount = money(cents)
  await db.transaction(async (tx) => {
    await tx.update(wallets).set({ demoBalance: sql`${wallets.demoBalance} + ${amount}`, updatedAt: new Date() }).where(eq(wallets.userId, currentUser.id))
    await tx.insert(transactions).values({ id: randomUUID(), userId: currentUser.id, type: 'Demo deposit', amount, status: 'Simulated', details: `Demo top-up · ${method}` })
  })
  revalidatePath('/dashboard')
  return { ok: true, message: `A simulated $${amount} deposit was added. No payment was made.` }
}

export async function simulateWithdrawal(rawAmount: unknown, country: string, method: string): Promise<ActionResult> {
  const currentUser = await getSessionUser()
  const cents = amountInCents(rawAmount)
  const countries = ['United States', 'United Kingdom', 'Canada', 'Nigeria', 'Ghana', 'Kenya', 'South Africa', 'India', 'Bangladesh', 'Philippines']
  const methods = ['Bank Account', 'Chime', 'PayPal', 'Cash App', 'Venmo', 'Apple Pay', 'Zelle', 'Interac e-Transfer', 'Wise']
  if (!cents || cents < 100000) return { ok: false, message: 'Withdrawals start at $1,000.00 and cannot exceed $5,000.00.' }
  if (!countries.includes(country) || !methods.includes(method)) return { ok: false, message: 'Choose a listed country and payout method.' }
  await ensureAccount(currentUser.id, currentUser.email, currentUser.name)

  const amount = money(cents)
  const success = await db.transaction(async (tx) => {
    const [updatedWallet] = await tx.update(wallets)
      .set({ demoBalance: sql`${wallets.demoBalance} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(wallets.userId, currentUser.id), gte(wallets.demoBalance, amount)))
      .returning({ userId: wallets.userId })
    if (!updatedWallet) return false
    await tx.insert(transactions).values({
      id: randomUUID(), userId: currentUser.id, type: 'Demo withdrawal', amount,
      status: 'Simulated', details: `Demo withdrawal request · ${country} · ${method}`, country, paymentMethod: method,
    })
    return true
  })

  if (!success) return { ok: false, message: 'Your sample balance is not high enough for that request.' }
  revalidatePath('/dashboard')
  return { ok: true, message: `Your $${amount} withdrawal request was simulated. No money was transferred.` }
}

export async function saveProfile(rawName: string): Promise<ActionResult> {
  const currentUser = await getSessionUser()
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 60)
  if (name.length < 2) return { ok: false, message: 'Enter a name with at least two characters.' }
  await db.update(user).set({ name, updatedAt: new Date() }).where(eq(user.id, currentUser.id))
  revalidatePath('/dashboard')
  return { ok: true, message: 'Profile updated.' }
}

export async function sendSupportMessage(subjectValue: string, messageValue: string): Promise<ActionResult> {
  const currentUser = await getSessionUser()
  const subject = subjectValue.trim().slice(0, 100)
  const message = messageValue.trim().slice(0, 1600)
  if (subject.length < 3 || message.length < 10) return { ok: false, message: 'Add a subject and a message of at least 10 characters.' }
  await db.insert(supportMessages).values({ id: randomUUID(), userId: currentUser.id, subject, message })
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { ok: true, message: 'Your support message was received.' }
}

export async function updateManagedUserRole(targetUserId: string, role: string): Promise<ActionResult> {
  const currentUser = await requireAdmin()
  if (targetUserId === currentUser.id) return { ok: false, message: 'Your own admin role cannot be changed here.' }
  if (!['admin', 'user'].includes(role)) return { ok: false, message: 'Choose a valid role.' }
  await db.update(user).set({ role, updatedAt: new Date() }).where(eq(user.id, targetUserId))
  revalidatePath('/admin')
  return { ok: true, message: 'User role updated.' }
}

export async function reviewManagedTransaction(transactionId: string, decision: string): Promise<ActionResult> {
  await requireAdmin()
  if (!['reviewed', 'declined'].includes(decision)) return { ok: false, message: 'Choose a valid review action.' }
  const status = decision === 'reviewed' ? 'Admin reviewed · simulated' : 'Declined · simulated'
  await db.update(transactions).set({ status }).where(eq(transactions.id, transactionId))
  revalidatePath('/admin')
  revalidatePath('/dashboard')
  return { ok: true, message: 'The simulated request status was updated.' }
}
