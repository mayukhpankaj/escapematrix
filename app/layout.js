import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'Escape Matrix - Habit Tracker',
  description: 'Track your habits and escape the matrix',
}

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
