import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const isChatPage = location.pathname === '/chat' || location.pathname === '/agent'

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {!isChatPage && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {!isChatPage && <Footer />}
    </div>
  )
}
