'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/client'
import type { Recipe } from '@/types'
import { Globe, Lock, Trash2, Camera, ArrowLeft, ChefHat } from 'lucide-react'

function fmt(n: number | null): string {
  if (n == null) return '—'
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: recipeData }, { data: { user } }] = await Promise.all([
        supabase
          .from('recipes')
          .select('*, recipe_ingredients(*, ingredient:ingredients(*))')
          .eq('id', id)
          .single(),
        supabase.auth.getUser(),
      ])
      setRecipe(recipeData)
      setIsOwner(!!user && recipeData?.user_id === user.id)
      setLoading(false)
    }
    load()
  }, [id])

  async function togglePublic() {
    if (!recipe || !isOwner) return
    setToggling(true)
    const { data } = await supabase
      .from('recipes')
      .update({ is_public: !recipe.is_public })
      .eq('id', id)
      .select()
      .single()
    if (data) setRecipe(data)
    setToggling(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this recipe? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('recipes').delete().eq('id', id)
    router.push('/recipes')
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !recipe) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${recipe.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(path, file, { upsert: true })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(path)

      const { data } = await supabase
        .from('recipes')
        .update({ image_url: publicUrl })
        .eq('id', id)
        .select()
        .single()
      if (data) setRecipe(data)
    }
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
          <div className="h-64 bg-gray-200 rounded-xl mb-6" />
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500">Recipe not found or is private.</p>
          <Link href="/recipes" className="text-brand-600 hover:underline text-sm mt-2 block">
            Back to recipes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to recipes
        </Link>

        {/* Hero image */}
        <div className="relative rounded-xl overflow-hidden mb-6 bg-gradient-to-br from-brand-100 to-brand-50">
          {recipe.image_url ? (
            <div className="relative h-64">
              <Image src={recipe.image_url} alt={recipe.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <ChefHat className="w-16 h-16 text-brand-300" />
            </div>
          )}
          {isOwner && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-gray-700 text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition-colors"
            >
              <Camera className="w-4 h-4" />
              {uploading ? 'Uploading...' : recipe.image_url ? 'Change photo' : 'Add photo'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>

        <div className="card">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{recipe.title}</h1>
            <div className="flex items-center gap-2 shrink-0">
              {isOwner && (
                <>
                  <button
                    onClick={togglePublic}
                    disabled={toggling}
                    className="flex items-center gap-1.5 btn-secondary text-sm py-1.5"
                  >
                    {recipe.is_public ? (
                      <><Globe className="w-4 h-4 text-brand-600" /> Public</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Private</>
                    )}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete recipe"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Macro summary */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {[
              { label: 'Calories', value: fmt(recipe.total_calories), unit: 'kcal', color: 'text-amber-700' },
              { label: 'Protein', value: fmt(recipe.total_protein), unit: 'g', color: 'text-red-700' },
              { label: 'Carbs', value: fmt(recipe.total_carbs), unit: 'g', color: 'text-yellow-700' },
              { label: 'Fat', value: fmt(recipe.total_fat), unit: 'g', color: 'text-blue-700' },
              { label: 'Fiber', value: fmt(recipe.total_fiber), unit: 'g', color: 'text-green-700' },
              { label: 'Sodium', value: fmt(recipe.total_sodium), unit: 'mg', color: 'text-gray-700' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="text-center bg-gray-50 rounded-lg p-2">
                <div className={`font-semibold ${color}`}>{value}<span className="text-xs font-normal">{unit}</span></div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {/* Ingredients table */}
          {recipe.recipe_ingredients && recipe.recipe_ingredients.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-gray-900 mb-3">Ingredients</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="text-left pb-2 font-medium">Ingredient</th>
                      <th className="text-right pb-2 font-medium">Grams</th>
                      <th className="text-right pb-2 font-medium">Protein</th>
                      <th className="text-right pb-2 font-medium">Carbs</th>
                      <th className="text-right pb-2 font-medium">Fat</th>
                      <th className="text-right pb-2 font-medium">Fiber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recipe.recipe_ingredients.map(ri => {
                      const ing = ri.ingredient
                      if (!ing) return null
                      const f = ri.grams / 100
                      return (
                        <tr key={ri.id}>
                          <td className="py-2 font-medium text-gray-900">{ing.name}</td>
                          <td className="py-2 text-right text-gray-600">{ri.grams}g</td>
                          <td className="py-2 text-right text-red-700">{fmt(ing.protein_per_100g * f)}g</td>
                          <td className="py-2 text-right text-yellow-700">{fmt(ing.carbs_per_100g * f)}g</td>
                          <td className="py-2 text-right text-blue-700">{fmt(ing.fat_per_100g * f)}g</td>
                          <td className="py-2 text-right text-green-700">{fmt(ing.fiber_per_100g * f)}g</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {recipe.notes && (
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-gray-600 text-sm whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{recipe.notes}</p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Saved {new Date(recipe.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
          </p>
        </div>
      </main>
    </div>
  )
}
