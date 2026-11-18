export const earningTasks = [
  { id: 'daily-check-in', title: 'Daily check-in', description: 'Start your day with a quick account check-in.', reward: '0.20', icon: 'sunrise' },
  { id: 'read-earning-guide', title: 'Read the earning guide', description: 'Review the basics of how demo rewards work.', reward: '0.35', icon: 'book-open' },
  { id: 'security-check', title: 'Review safety tips', description: 'Take a moment to review account safety.', reward: '0.25', icon: 'shield-check' },
] as const

export type DashboardTransaction = {
  id: string
  type: string
  amount: string
  status: string
  details: string
  createdAt: Date
}

export type DashboardSnapshot = {
  name: string
  email: string
  role: string
  balance: string
  referralCode: string
  referralCount: number
  claimedTaskIds: string[]
  transactions: DashboardTransaction[]
  supportMessages: { id: string; subject: string; status: string; createdAt: Date }[]
}

export type AdminSnapshot = {
  users: { id: string; name: string; email: string; role: string; createdAt: Date }[]
  transactions: (DashboardTransaction & { userName: string; userEmail: string; userId: string })[]
  totalUsers: number
  totalTransactions: number
  totalSupportMessages: number
}
