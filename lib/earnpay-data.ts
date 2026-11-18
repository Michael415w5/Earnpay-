import 'server-only'
import { randomBytes } from 'node:crypto'
import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { referralProfiles, supportMessages, taskClaims, transactions, user, wallets } from '@/lib/db/schema'
import type { AdminSnapshot, DashboardSnapshot, DashboardTransaction } from '@/lib/earnpay-shared'


export async function ensureAccount(userId: string, email: string, name: string, referralCode?: string) {
  await db.insert(wallets).values({ userId }).onConflictDoNothing()

  const [profile] = await db.select({ userId: referralProfiles.userId, referralCode: referralProfiles.referralCode })
    .from(referralProfiles)
    .where(eq(referralProfiles.userId, userId))
    .limit(1)

  if (!profile) {
    let referredBy: string | null = null
    if (referralCode) {
      const [referrer] = await db.select({ userId: referralProfiles.userId, referralCode: referralProfiles.referralCode })
        .from(referralProfiles)
        .where(eq(referralProfiles.referralCode, referralCode.trim().toUpperCase()))
        .limit(1)
      if (referrer && referrer.userId !== userId) referredBy = referrer.referralCode
    }

    await db.insert(referralProfiles).values({
      userId,
      referralCode: randomBytes(5).toString('hex').toUpperCase(),
      referredBy,
    }).onConflictDoNothing()
  }

  const adminEmail = process.env.EARNPAY_ADMIN_EMAIL?.trim().toLowerCase()
  if (adminEmail && email.trim().toLowerCase() === adminEmail) {
    await db.update(user).set({ role: 'admin', updatedAt: new Date() }).where(eq(user.id, userId))
  }

  const [accountUser] = await db.select({ name: user.name, email: user.email, role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)

  return accountUser ?? { name, email, role: 'user' }
}

export async function getDashboardSnapshot(userId: string, email: string, name: string): Promise<DashboardSnapshot> {
  const accountUser = await ensureAccount(userId, email, name)
  const [wallet] = await db.select({ balance: wallets.demoBalance }).from(wallets).where(eq(wallets.userId, userId)).limit(1)
  const [profile] = await db.select({ referralCode: referralProfiles.referralCode }).from(referralProfiles).where(eq(referralProfiles.userId, userId)).limit(1)
  const [referrals] = await db.select({ total: count() }).from(referralProfiles).where(eq(referralProfiles.referredBy, profile.referralCode))
  const today = new Date().toISOString().slice(0, 10)
  const claimedToday = await db.select({ taskKey: taskClaims.taskKey }).from(taskClaims)
    .where(and(eq(taskClaims.userId, userId), eq(taskClaims.claimedDate, today)))
  const filteredClaimedTaskIds = claimedToday.map((claim) => claim.taskKey)
  const [latestTransactions, messages] = await Promise.all([
    db.select({ id: transactions.id, type: transactions.type, amount: transactions.amount, status: transactions.status, details: transactions.details, createdAt: transactions.createdAt })
      .from(transactions).where(eq(transactions.userId, userId)).orderBy(desc(transactions.createdAt)).limit(12),
    db.select({ id: supportMessages.id, subject: supportMessages.subject, status: supportMessages.status, createdAt: supportMessages.createdAt })
      .from(supportMessages).where(eq(supportMessages.userId, userId)).orderBy(desc(supportMessages.createdAt)).limit(5),
  ])
  return {
    name: accountUser.name,
    email: accountUser.email,
    role: accountUser.role,
    balance: wallet?.balance ?? '120.00',
    referralCode: profile.referralCode,
    referralCount: referrals?.total ?? 0,
    claimedTaskIds: filteredClaimedTaskIds,
    transactions: latestTransactions,
    supportMessages: messages,
  }
}

export async function getAdminSnapshot(requesterId: string): Promise<AdminSnapshot | null> {
  const [requester] = await db.select({ role: user.role }).from(user).where(eq(user.id, requesterId)).limit(1)
  if (requester?.role !== 'admin') return null

  const [users, totalUsers, totalTransactions, totalSupportMessages, recentTransactions] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
      .from(user).orderBy(desc(user.createdAt)).limit(100),
    db.select({ total: count() }).from(user),
    db.select({ total: count() }).from(transactions),
    db.select({ total: count() }).from(supportMessages),
    db.select({ id: transactions.id, type: transactions.type, amount: transactions.amount, status: transactions.status, details: transactions.details, createdAt: transactions.createdAt, userId: transactions.userId, userName: user.name, userEmail: user.email })
      .from(transactions).leftJoin(user, eq(transactions.userId, user.id)).orderBy(desc(transactions.createdAt)).limit(30),
  ])

  return {
    users,
    transactions: recentTransactions.map((row) => ({ ...row, userName: row.userName ?? 'Unknown user', userEmail: row.userEmail ?? '', userId: row.userId })),
    totalUsers: totalUsers[0]?.total ?? 0,
    totalTransactions: totalTransactions[0]?.total ?? 0,
    totalSupportMessages: totalSupportMessages[0]?.total ?? 0,
  }
}
