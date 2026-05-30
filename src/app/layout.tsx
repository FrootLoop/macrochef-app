import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MacroChef',
  description: 'Build meals that hit your macro targets exactly.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
