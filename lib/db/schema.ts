import { boolean, date, numeric, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
})

export const wallets = pgTable('wallets', {
  userId: text('user_id').primaryKey(),
  demoBalance: numeric('demo_balance', { precision: 12, scale: 2 }).notNull().default('120.00'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const referralProfiles = pgTable('referral_profiles', {
  userId: text('user_id').primaryKey(),
  referralCode: text('referral_code').notNull().unique(),
  referredBy: text('referred_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('Simulated'),
  details: text('details').notNull(),
  country: text('country'),
  paymentMethod: text('payment_method'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const taskClaims = pgTable('task_claims', {
  userId: text('user_id').notNull(),
  taskKey: text('task_key').notNull(),
  claimedDate: date('claimed_date').notNull().defaultNow(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.taskKey, table.claimedDate] })])

export const supportMessages = pgTable('support_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('Open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
