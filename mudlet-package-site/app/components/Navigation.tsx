'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const Navigation = () => {
  const pathname = usePathname()
  
  return (
    <nav className="flex gap-4 mb-4">
      <Link 
        href="/" 
        className={pathname === '/' ? 'font-bold' : ''}
      >
        Home
      </Link>
      <Link 
        href="/upload"
        className={pathname === '/upload' ? 'font-bold' : ''}
      >
        Upload Package
      </Link>
    </nav>
  )
}
