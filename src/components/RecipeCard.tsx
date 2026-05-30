import Link from 'next/link'
import Image from 'next/image'
import { Globe, Lock } from 'lucide-react'
import type { Recipe } from '@/types'

function fmt(n: number | null): string {
  if (n == null) return '—'
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="card hover:shadow-md transition-shadow group block">
      {recipe.image_url ? (
        <div className="relative h-40 -mx-4 -mt-4 mb-3 rounded-t-xl overflow-hidden">
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-40 -mx-4 -mt-4 mb-3 rounded-t-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
          <span className="text-4xl">🍽️</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 leading-tight line-clamp-2 group-hover:text-brand-700 transition-colors">
          {recipe.title}
        </h3>
        <span className="shrink-0 text-gray-400 mt-0.5">
          {recipe.is_public ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 mt-3">
        {[
          { label: 'kcal', value: fmt(recipe.total_calories), color: 'text-amber-700' },
          { label: 'protein', value: `${fmt(recipe.total_protein)}g`, color: 'text-red-700' },
          { label: 'carbs', value: `${fmt(recipe.total_carbs)}g`, color: 'text-yellow-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center bg-gray-50 rounded-lg py-1.5">
            <div className={`font-semibold text-sm ${color}`}>{value}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-gray-400">
        {new Date(recipe.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </Link>
  )
}
