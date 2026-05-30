'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChefHat, BookOpen, LogIn, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-brand-700 font-bold text-lg">
            <ChefHat className="w-6 h-6" />
            MacroChef
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/recipes"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Recipes
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  {user.email?.split('@')[0]}
                </span>
                <button onClick={signOut} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
