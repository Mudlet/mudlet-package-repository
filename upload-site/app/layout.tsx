import './globals.css'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { Auth } from './components/Auth'
import { Navigation } from './components/Navigation'
import { SessionProvider } from './components/SessionProvider'
import { ThemeProvider } from './components/ThemeProvider'
import { ThemeToggle } from './components/ThemeToggle'
import { Metadata } from 'next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: {
    default: 'Mudlet packages',
    template: '%s — Mudlet packages',
  },
  description: 'Browse, preview and share packages for the Mudlet MUD client',
  icons: {
    icon: '/mudlet-package-repo.ico'
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <ThemeProvider>
          <SessionProvider session={session}>
            <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
                <div className="flex items-center gap-2 sm:gap-6">
                  <Link
                    href="/"
                    className="flex shrink-0 items-center gap-2 rounded-md font-semibold tracking-tight"
                  >
                    <svg
                      className="h-6 w-6 text-accent"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
                    </svg>
                    <span className="hidden sm:inline">Mudlet packages</span>
                  </Link>
                  <Navigation />
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ThemeToggle />
                  <Auth />
                </div>
              </div>
            </header>
            <div className="mx-auto max-w-6xl px-4">
              {children}
            </div>
            <footer className="mt-16 border-t border-border">
              <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Packages are hosted in the{' '}
                  <a
                    href="https://github.com/Mudlet/mudlet-package-repository"
                    className="text-accent hover:text-accent-hover"
                  >
                    mudlet-package-repository
                  </a>{' '}
                  on GitHub.
                </p>
                <p>
                  <a href="https://www.mudlet.org" className="text-accent hover:text-accent-hover">
                    Mudlet
                  </a>
                  {' · '}
                  <a href="https://discordapp.com/invite/kuYvMQ9" className="text-accent hover:text-accent-hover">
                    Discord
                  </a>
                </p>
              </div>
            </footer>
          </SessionProvider>
        </ThemeProvider>
        <SpeedInsights/>
      </body>
    </html>
  )
}
