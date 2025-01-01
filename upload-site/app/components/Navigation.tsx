'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const Navigation = () => {
  const pathname = usePathname()
  
  return (
    <nav className="flex items-center gap-6 py-4">
      <Link 
        href="/" 
        className={`text-lg hover:text-blue-600 transition-colors ${pathname === '/' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
      >
        Package Repository
      </Link>
      <Link 
        href="/upload"
        className={`text-lg hover:text-blue-600 transition-colors ${pathname === '/upload' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
      >
        Upload Package
      </Link>
    </nav>
  )
}
