'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import IngredientSearch from '@/components/IngredientSearch'
import MacroTargets from '@/components/MacroTargets'
import RecipeResult from '@/components/RecipeResult'
import SaveRecipeModal from '@/components/SaveRecipeModal'
import { createClient } from '@/lib/supabase/client'
import { calculateRecipe } from '@/lib/macroCalculator'
import type { Ingredient, SelectedIngredient, MacroTargets as MacroTargetsType } from '@/types'
import { CATEGORY_COLORS } from '@/components/IngredientSearch'
import { Lock, Unlock, X } from 'lucide-react'

const DEFAULT_TARGETS: MacroTargetsType = {
  calories: 600,
  protein: 40,
  carbs: 60,
  fiber: 0,
  maxSodium: 0,
}

export default function HomePage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [selected, setSelected] = useState<SelectedIngredient[]>([])
  const [targets, setTargets] = useState<MacroTargetsType>(DEFAULT_TARGETS)
  const [notes, setNotes] = useState('')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    fetch('/api/ingredients')
      .then(r => r.json())
      .then(data => {
        setIngredients(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const { adjustedIngredients, totals, warnings } = useMemo(
    () => calculateRecipe(selected, targets),
    [selected, targets]
  )

  function addIngredient(ingredient: Ingredient) {
    if (selected.find(s => s.ingredient.id === ingredient.id)) return
    setSelected(prev => [...prev, { ingredient, grams: 100, locked: false }])
  }

  function removeIngredient(id: string) {
    setSelected(prev => prev.filter(s => s.ingredient.id !== id))
  }

  function updateGrams(id: string, grams: number) {
    setSelected(prev =>
      prev.map(s =>
        s.ingredient.id === id ? { ...s, grams: Math.max(0, grams), locked: true } : s
      )
    )
  }

  function toggleLock(id: string) {
    setSelected(prev =>
      prev.map(s =>
        s.ingredient.id === id ? { ...s, locked: !s.locked } : s
      )
    )
  }

  function handleSaved(recipeId: string) {
    setShowSaveModal(false)
    router.push(`/recipes/${recipeId}`)
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Recipe Builder</h1>
          <p className="text-gray-500 text-sm mt-1">
            Select ingredients and set macro targets — amounts adjust automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Ingredients */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-3">Ingredients</h2>
              {loading ? (
                <div className="text-sm text-gray-400 py-4 text-center">Loading ingredients...</div>
              ) : (
                <IngredientSearch
                  ingredients={ingredients}
                  selected={selected}
                  onAdd={addIngredient}
                />
              )}

              {selected.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Selected</h3>
                  {selected.map(s => {
                    const adjusted = adjustedIngredients.find(a => a.ingredient.id === s.ingredient.id)
                    return (
                      <div
                        key={s.ingredient.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                      >
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[s.ingredient.category]}`}
                        >
                          {s.ingredient.category}
                        </span>
                        <span className="flex-1 truncate font-medium text-gray-800">{s.ingredient.name}</span>
                        <span className="text-gray-500 shrink-0 w-14 text-right">
                          {adjusted ? `${Math.round(adjusted.grams)}g` : `${s.grams}g`}
                        </span>
                        <button
                          onClick={() => toggleLock(s.ingredient.id)}
                          className="text-gray-400 hover:text-gray-600 shrink-0"
                          title={s.locked ? 'Locked — click to auto-adjust' : 'Click to lock amount'}
                        >
                          {s.locked ? <Lock className="w-3.5 h-3.5 text-brand-600" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => removeIngredient(s.ingredient.id)}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {selected.length === 0 && !loading && (
                <p className="text-sm text-gray-400 mt-4 text-center py-6">
                  Search above to add ingredients
                </p>
              )}
            </div>

            {/* Macro targets */}
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Macro Targets</h2>
              <MacroTargets targets={targets} onChange={setTargets} />
            </div>
          </div>

          {/* Right: Recipe Result */}
          <div className="lg:col-span-3">
            <div className="card">
              <h2 className="font-semibold text-gray-900 mb-4">Recipe</h2>
              <RecipeResult
                adjustedIngredients={adjustedIngredients}
                totals={totals}
                targets={targets}
                warnings={warnings}
                notes={notes}
                onNotesChange={setNotes}
                onUpdateGrams={updateGrams}
                onToggleLock={toggleLock}
                onRemove={removeIngredient}
                onSave={() => setShowSaveModal(true)}
                canSave={adjustedIngredients.length > 0}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </div>
      </main>

      {showSaveModal && (
        <SaveRecipeModal
          adjustedIngredients={adjustedIngredients}
          targets={targets}
          totals={totals}
          notes={notes}
          onClose={() => setShowSaveModal(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
