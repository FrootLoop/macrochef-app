'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AdjustedIngredient, MacroTargets, MacroTotals } from '@/types'

interface Props {
  adjustedIngredients: AdjustedIngredient[]
  targets: MacroTargets
  totals: MacroTotals
  notes: string
  onClose: () => void
  onSaved: (recipeId: string) => void
}

export default function SaveRecipeModal({
  adjustedIngredients,
  targets,
  totals,
  notes,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSave() {
    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not signed in.')
      setSaving(false)
      return
    }

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        title: title.trim(),
        notes: notes || null,
        is_public: isPublic,
        target_calories: targets.calories || null,
        target_protein: targets.protein || null,
        target_carbs: targets.carbs || null,
        target_fiber: targets.fiber || null,
        target_sodium: targets.maxSodium || null,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_fat: totals.fat,
        total_carbs: totals.carbs,
        total_fiber: totals.fiber,
        total_sodium: totals.sodium,
      })
      .select()
      .single()

    if (recipeError || !recipe) {
      setError(recipeError?.message ?? 'Failed to save recipe.')
      setSaving(false)
      return
    }

    const ingredientRows = adjustedIngredients.map(item => ({
      recipe_id: recipe.id,
      ingredient_id: item.ingredient.id,
      grams: Math.round(item.grams * 10) / 10,
    }))

    const { error: ingredientsError } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientRows)

    if (ingredientsError) {
      setError(ingredientsError.message)
      setSaving(false)
      return
    }

    onSaved(recipe.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Save Recipe</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Title</label>
            <input
              className="input"
              placeholder="e.g. High-Protein Chicken Bowl"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-brand-600"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
            />
            <div>
              <div className="text-sm font-medium text-gray-700">Make public</div>
              <div className="text-xs text-gray-500">Anyone can see this recipe</div>
            </div>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
            <div className="font-medium text-gray-700 mb-2">Recipe summary</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="font-semibold text-gray-900">{Math.round(totals.calories)}</div><div className="text-xs text-gray-500">kcal</div></div>
              <div><div className="font-semibold text-red-700">{Math.round(totals.protein)}g</div><div className="text-xs text-gray-500">protein</div></div>
              <div><div className="font-semibold text-yellow-700">{Math.round(totals.carbs)}g</div><div className="text-xs text-gray-500">carbs</div></div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Save Recipe'}
          </button>
        </div>
      </div>
    </div>
  )
}
