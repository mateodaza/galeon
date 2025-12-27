import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Galeon',
  description: 'Your payments. Your treasure. Hidden in plain sight.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
