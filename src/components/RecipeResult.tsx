'use client'

import { Lock, Unlock, X, AlertTriangle } from 'lucide-react'
import type { AdjustedIngredient, MacroTargets, MacroTotals, SelectedIngredient } from '@/types'
import { CATEGORY_COLORS } from './IngredientSearch'

const ROLE_BADGES: Record<string, string> = {
  protein: 'bg-red-100 text-red-700 border-red-200',
  carb: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  fat: 'bg-blue-100 text-blue-700 border-blue-200',
  other: 'bg-gray-100 text-gray-500 border-gray-200',
}

const ROLE_LABELS: Record<string, string> = {
  protein: 'Protein source',
  carb: 'Carb source',
  fat: 'Fat source',
  other: 'Other',
}

interface Props {
  adjustedIngredients: AdjustedIngredient[]
  totals: MacroTotals
  targets: MacroTargets
  warnings: string[]
  notes: string
  onNotesChange: (notes: string) => void
  onUpdateGrams: (ingredientId: string, grams: number) => void
  onToggleLock: (ingredientId: string) => void
  onRemove: (ingredientId: string) => void
  onSave: () => void
  canSave: boolean
  isLoggedIn: boolean
}

function pct(value: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, (value / target) * 100)
}

function fmt(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)
}

export default function RecipeResult({
  adjustedIngredients,
  totals,
  targets,
  warnings,
  notes,
  onNotesChange,
  onUpdateGrams,
  onToggleLock,
  onRemove,
  onSave,
  canSave,
  isLoggedIn,
}: Props) {
  if (adjustedIngredients.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">Add ingredients to start building your recipe</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Ingredient rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left pb-2 font-medium">Ingredient</th>
              <th className="text-right pb-2 font-medium w-20">Grams</th>
              <th className="text-right pb-2 font-medium w-14">kcal</th>
              <th className="text-right pb-2 font-medium w-14">Protein</th>
              <th className="text-right pb-2 font-medium w-14">Carbs</th>
              <th className="text-right pb-2 font-medium w-14">Fat</th>
              <th className="text-right pb-2 font-medium w-14">Fiber</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {adjustedIngredients.map(item => (
              <tr key={item.ingredient.id} className="group">
                <td className="py-2 pr-2">
                  <div className="font-medium text-gray-900 leading-tight">{item.ingredient.name}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${ROLE_BADGES[item.role]}`}>
                    {ROLE_LABELS[item.role]}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <input
                    type="number"
                    className="w-16 text-right border border-gray-200 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                    value={Math.round(item.grams)}
                    min={0}
                    onChange={e => onUpdateGrams(item.ingredient.id, Number(e.target.value))}
                    onFocus={() => !item.locked && onToggleLock(item.ingredient.id)}
                  />
                </td>
                <td className="py-2 text-right text-gray-700">{fmt(item.calories)}</td>
                <td className="py-2 text-right text-red-700">{fmt(item.protein)}g</td>
                <td className="py-2 text-right text-yellow-700">{fmt(item.carbs)}g</td>
                <td className="py-2 text-right text-blue-700">{fmt(item.fat)}g</td>
                <td className="py-2 text-right text-green-700">{fmt(item.fiber)}g</td>
                <td className="py-2 pl-2">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onToggleLock(item.ingredient.id)}
                      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      title={item.locked ? 'Unlock (auto-adjust)' : 'Lock amount'}
                    >
                      {item.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => onRemove(item.ingredient.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-semibold">
              <td className="pt-3 text-gray-700">Total</td>
              <td></td>
              <td className="pt-3 text-right">{fmt(totals.calories)}</td>
              <td className="pt-3 text-right text-red-700">{fmt(totals.protein)}g</td>
              <td className="pt-3 text-right text-yellow-700">{fmt(totals.carbs)}g</td>
              <td className="pt-3 text-right text-blue-700">{fmt(totals.fat)}g</td>
              <td className="pt-3 text-right text-green-700">{fmt(totals.fiber)}g</td>
              <td></td>
            </tr>
            {(targets.calories > 0 || targets.protein > 0 || targets.carbs > 0) && (
              <tr className="text-xs text-gray-400">
                <td className="pt-1">Target</td>
                <td></td>
                <td className="pt-1 text-right">{targets.calories > 0 ? targets.calories : '—'}</td>
                <td className="pt-1 text-right">{targets.protein > 0 ? `${targets.protein}g` : '—'}</td>
                <td className="pt-1 text-right">{targets.carbs > 0 ? `${targets.carbs}g` : '—'}</td>
                <td className="pt-1 text-right">—</td>
                <td className="pt-1 text-right">{targets.fiber > 0 ? `${targets.fiber}g` : '—'}</td>
                <td></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* Net carbs callout */}
      {targets.fiber > 0 && targets.carbs > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
          Net Carbs (carbs − fiber): <strong>{fmt(totals.netCarbs)}g</strong>
          {' '}(target: {targets.carbs - targets.fiber}g)
        </div>
      )}

      {/* Macro bars */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Calories', value: totals.calories, target: targets.calories, color: 'bg-amber-400', unit: 'kcal' },
          { label: 'Protein', value: totals.protein, target: targets.protein, color: 'bg-red-400', unit: 'g' },
          { label: 'Carbs', value: totals.carbs, target: targets.carbs, color: 'bg-yellow-400', unit: 'g' },
          { label: 'Fiber', value: totals.fiber, target: targets.fiber, color: 'bg-green-500', unit: 'g' },
        ].map(({ label, value, target, color, unit }) => (
          target > 0 && (
            <div key={label} className="bg-gray-50 rounded-lg p-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{label}</span>
                <span>{fmt(value)}/{target}{unit}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${color} ${pct(value, target) > 100 ? 'opacity-70' : ''}`}
                  style={{ width: `${Math.min(pct(value, target), 100)}%` }}
                />
              </div>
            </div>
          )
        ))}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          className="input min-h-[80px] resize-none"
          placeholder="Add cooking notes, condiments, spices, suggestions..."
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        {isLoggedIn ? (
          <button onClick={onSave} className="btn-primary" disabled={!canSave}>
            Save Recipe
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            <a href="/login" className="text-brand-600 hover:underline">Sign in</a> to save recipes
          </div>
        )}
      </div>
    </div>
  )
}
