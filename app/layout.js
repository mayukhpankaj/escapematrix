import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata = {
  title: 'Escape Matrix',
  description: 'Track your habits and escape the matrix',
  openGraph: {
    title: 'Escape Matrix - Habit Tracker',
    description: 'Track your habits and escape the matrix',
    image: 'https://res.cloudinary.com/dp8k9xyhd/image/upload/v1767441563/escapematrix_web.png',
    type: 'website',
    url: 'https://escapematrix-app.vercel.app',
    site_name: 'Escape Matrix',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Escape Matrix - Habit Tracker',
    description: 'Track your habits and escape the matrix',
    image: 'https://res.cloudinary.com/dp8k9xyhd/image/upload/v1767441563/escapematrix_web.png',
    site: '@escapematrix_ai',
  },
  other: {
    'instagram:site': 'https://www.instagram.com/escapematrix.ai/',
  },
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
