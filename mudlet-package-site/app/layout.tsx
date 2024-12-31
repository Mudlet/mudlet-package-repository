import './globals.css'
import { Inter } from 'next/font/google'
import { getServerSession } from 'next-auth'
import { Auth } from './components/Auth'
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
      <body className={inter.className}>
        <SessionProvider session={session}>
          <header className="p-4 border-b">
            <Auth />
          </header>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
