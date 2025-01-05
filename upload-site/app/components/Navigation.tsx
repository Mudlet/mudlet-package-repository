'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export const Navigation = () => {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden sm:flex items-center gap-6 py-4 px-6">
        <Link 
          href="/" 
          className={`text-lg hover:text-blue-600 transition-colors ${pathname === '/' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
        >
          Home
        </Link>
        <Link 
          href="/packages"
          className={`text-lg hover:text-blue-600 transition-colors ${pathname === '/packages' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
        >
          All packages
        </Link>
        <Link 
          href="/upload"
          className={`text-lg hover:text-blue-600 transition-colors ${pathname === '/upload' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
        >
          Upload package
        </Link>
      </nav>

      {/* Mobile Navigation */}
      <nav className="sm:hidden">
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-4 text-gray-700"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute left-0 right-0 bg-white shadow-lg px-4 py-2">
            <Link 
              href="/" 
              className={`block py-2 text-lg hover:text-blue-600 transition-colors ${pathname === '/' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/packages"
              className={`block py-2 text-lg hover:text-blue-600 transition-colors ${pathname === '/packages' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              All packages
            </Link>
            <Link 
              href="/upload"
              className={`block py-2 text-lg hover:text-blue-600 transition-colors ${pathname === '/upload' ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Upload package
            </Link>
          </div>
        )}
      </nav>
    </>
  )
}
