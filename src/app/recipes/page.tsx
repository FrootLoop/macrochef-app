'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import RecipeCard from '@/components/RecipeCard'
import { createClient } from '@/lib/supabase/client'
import type { Recipe } from '@/types'
import { Globe, Lock } from 'lucide-react'

type Filter = 'mine' | 'public'

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('mine')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user)
      if (!data.user) setFilter('public')
    })
  }, [])

  useEffect(() => {
    async function fetchRecipes() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      let query = supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter === 'mine' && user) {
        query = query.eq('user_id', user.id)
      } else {
        query = query.eq('is_public', true)
      }

      const { data } = await query
      setRecipes(data ?? [])
      setLoading(false)
    }
    fetchRecipes()
  }, [filter])

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
            <p className="text-gray-500 text-sm mt-1">
              {filter === 'mine' ? 'Your saved recipes' : 'Recipes shared by the community'}
            </p>
          </div>

          {isLoggedIn && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setFilter('mine')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'mine' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                Mine
              </button>
              <button
                onClick={() => setFilter('public')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'public' ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Public
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-40 -mx-4 -mt-4 mb-3 rounded-t-xl bg-gray-200" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="font-medium text-gray-600">
              {filter === 'mine' ? 'You haven\'t saved any recipes yet' : 'No public recipes yet'}
            </p>
            <p className="text-sm mt-1">
              <a href="/" className="text-brand-600 hover:underline">Build a recipe</a> and save it
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
