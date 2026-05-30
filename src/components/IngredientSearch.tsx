'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus } from 'lucide-react'
import type { Ingredient, SelectedIngredient } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  meat: 'bg-red-100 text-red-700',
  seafood: 'bg-blue-100 text-blue-700',
  poultry: 'bg-orange-100 text-orange-700',
  egg: 'bg-yellow-100 text-yellow-700',
  dairy: 'bg-sky-100 text-sky-700',
  grain: 'bg-amber-100 text-amber-700',
  legume: 'bg-lime-100 text-lime-700',
  vegetable: 'bg-green-100 text-green-700',
  fruit: 'bg-pink-100 text-pink-700',
  oil: 'bg-yellow-100 text-yellow-800',
  nut: 'bg-stone-100 text-stone-700',
  other: 'bg-gray-100 text-gray-600',
}

interface Props {
  ingredients: Ingredient[]
  selected: SelectedIngredient[]
  onAdd: (ingredient: Ingredient) => void
}

export default function IngredientSearch({ ingredients, selected, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Ingredient[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    const q = query.toLowerCase()
    const filtered = ingredients
      .filter(i => i.name.toLowerCase().includes(q))
      .slice(0, 12)
    setResults(filtered)
    setOpen(true)
  }, [query, ingredients])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedIds = new Set(selected.map(s => s.ingredient.id))

  function handleAdd(ingredient: Ingredient) {
    onAdd(ingredient)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search ingredients..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map(ingredient => {
            const isSelected = selectedIds.has(ingredient.id)
            return (
              <button
                key={ingredient.id}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 flex items-center justify-between gap-2 disabled:opacity-50"
                onClick={() => handleAdd(ingredient)}
                disabled={isSelected}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{ingredient.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[ingredient.category]}`}>
                      {ingredient.category}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {ingredient.calories_per_100g} kcal · {ingredient.protein_per_100g}g P · {ingredient.carbs_per_100g}g C · {ingredient.fat_per_100g}g F per 100g
                  </div>
                </div>
                {isSelected ? (
                  <span className="text-xs text-gray-400 shrink-0">Added</span>
                ) : (
                  <Plus className="w-4 h-4 text-brand-600 shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {open && results.length === 0 && query && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500 text-center">
          No ingredients found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}

export { CATEGORY_COLORS }
