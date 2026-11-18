import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EarnPay — Simple earnings, made clear',
  description: 'A transparent USD earning dashboard with daily tasks, referrals, and a clearly labeled demo wallet.',
  applicationName: 'EarnPay',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f7f5fb',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
