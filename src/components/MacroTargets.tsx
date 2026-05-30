'use client'

import type { MacroTargets } from '@/types'

interface Props {
  targets: MacroTargets
  onChange: (targets: MacroTargets) => void
}

interface SliderConfig {
  key: keyof MacroTargets
  label: string
  unit: string
  min: number
  max: number
  step: number
  color: string
  hint?: string
}

const SLIDERS: SliderConfig[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', min: 0, max: 3000, step: 50, color: 'accent-amber-500' },
  { key: 'protein', label: 'Protein', unit: 'g', min: 0, max: 200, step: 5, color: 'accent-red-500' },
  { key: 'carbs', label: 'Carbs', unit: 'g', min: 0, max: 400, step: 5, color: 'accent-yellow-500' },
  { key: 'fiber', label: 'Fiber', unit: 'g', min: 0, max: 60, step: 1, color: 'accent-green-600', hint: 'Set with Carbs for Net Carbs mode' },
  { key: 'maxSodium', label: 'Max Sodium', unit: 'mg', min: 0, max: 5000, step: 100, color: 'accent-blue-500', hint: '0 = no limit' },
]

export default function MacroTargets({ targets, onChange }: Props) {
  function set(key: keyof MacroTargets, value: number) {
    onChange({ ...targets, [key]: value })
  }

  return (
    <div className="space-y-4">
      {SLIDERS.map(({ key, label, unit, min, max, step, color, hint }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="w-20 text-right border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={targets[key]}
                min={min}
                max={max}
                step={step}
                onChange={e => set(key, Math.max(min, Math.min(max, Number(e.target.value))))}
              />
              <span className="text-xs text-gray-500 w-8">{unit}</span>
            </div>
          </div>
          <input
            type="range"
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 ${color}`}
            min={min}
            max={max}
            step={step}
            value={targets[key]}
            onChange={e => set(key, Number(e.target.value))}
          />
          {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
        </div>
      ))}
    </div>
  )
}
