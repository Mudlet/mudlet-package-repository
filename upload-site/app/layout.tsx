import './globals.css'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { Auth } from './components/Auth'
import { Navigation } from './components/Navigation'
import { SessionProvider } from './components/SessionProvider'

const inter = Inter({ subsets: ['latin'] })

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <SessionProvider session={session}>
          <header className="bg-white border-b shadow-sm">
            <div className="max-w-6xl mx-auto">
              <Auth />
              <Navigation />
            </div>
          </header>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  )
}
