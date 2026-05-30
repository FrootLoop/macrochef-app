import type {
  SelectedIngredient,
  AdjustedIngredient,
  IngredientRole,
  MacroTargets,
  MacroTotals,
  CalculationResult,
  IngredientCategory,
} from '@/types'

const PROTEIN_CATEGORIES: IngredientCategory[] = ['meat', 'seafood', 'poultry']
const CARB_CATEGORIES: IngredientCategory[] = ['grain', 'fruit', 'vegetable', 'legume']
const FAT_CATEGORIES: IngredientCategory[] = ['oil', 'nut', 'dairy']

function macrosFromGrams(ingredient: SelectedIngredient['ingredient'], grams: number) {
  const factor = grams / 100
  return {
    calories: ingredient.calories_per_100g * factor,
    protein: ingredient.protein_per_100g * factor,
    fat: ingredient.fat_per_100g * factor,
    carbs: ingredient.carbs_per_100g * factor,
    fiber: ingredient.fiber_per_100g * factor,
    sodium: ingredient.sodium_per_100g * factor,
  }
}

function sumTotals(items: AdjustedIngredient[]): MacroTotals {
  const t = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      fat: acc.fat + i.fat,
      carbs: acc.carbs + i.carbs,
      fiber: acc.fiber + i.fiber,
      sodium: acc.sodium + i.sodium,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0 }
  )
  return { ...t, netCarbs: Math.max(0, t.carbs - t.fiber) }
}

function pickByCategory(
  pool: SelectedIngredient[],
  categories: IngredientCategory[],
  macro: 'protein_per_100g' | 'carbs_per_100g' | 'fat_per_100g'
): SelectedIngredient | undefined {
  const inCategory = pool.filter(s => categories.includes(s.ingredient.category))
  if (inCategory.length > 0) {
    return inCategory.sort((a, b) => b.ingredient[macro] - a.ingredient[macro])[0]
  }
  return pool.sort((a, b) => b.ingredient[macro] - a.ingredient[macro])[0]
}

export function calculateRecipe(
  selected: SelectedIngredient[],
  targets: MacroTargets
): CalculationResult {
  if (selected.length === 0) {
    return {
      adjustedIngredients: [],
      totals: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sodium: 0, netCarbs: 0 },
      warnings: [],
    }
  }

  const warnings: string[] = []

  // Separate locked ingredients from auto-adjusted ones
  const locked = selected.filter(s => s.locked)
  const unlocked = selected.filter(s => !s.locked)

  // Assign roles only among unlocked ingredients
  let proteinSource: SelectedIngredient | undefined
  let carbSource: SelectedIngredient | undefined
  let fatSource: SelectedIngredient | undefined

  if (unlocked.length > 0) {
    proteinSource = pickByCategory(unlocked, PROTEIN_CATEGORIES, 'protein_per_100g')
    const afterProtein = unlocked.filter(s => s !== proteinSource)
    if (afterProtein.length > 0) {
      carbSource = pickByCategory(afterProtein, CARB_CATEGORIES, 'carbs_per_100g')
      const afterCarb = afterProtein.filter(s => s !== carbSource)
      if (afterCarb.length > 0) {
        fatSource = pickByCategory(afterCarb, FAT_CATEGORIES, 'fat_per_100g')
      }
    }
  }

  const roleOf = (s: SelectedIngredient): IngredientRole => {
    if (s === proteinSource) return 'protein'
    if (s === carbSource) return 'carb'
    if (s === fatSource) return 'fat'
    return 'other'
  }

  // Start with locked + "other" unlocked ingredients at their current grams
  const others = unlocked.filter(s => s !== proteinSource && s !== carbSource && s !== fatSource)

  const result: AdjustedIngredient[] = [
    ...locked.map(s => ({ ...s, role: 'other' as IngredientRole, ...macrosFromGrams(s.ingredient, s.grams) })),
    ...others.map(s => ({ ...s, role: 'other' as IngredientRole, ...macrosFromGrams(s.ingredient, s.grams) })),
  ]

  const fixedCalories = result.reduce((sum, i) => sum + i.calories, 0)
  const fixedProtein = result.reduce((sum, i) => sum + i.protein, 0)
  const fixedCarbs = result.reduce((sum, i) => sum + i.carbs, 0)

  // Step 1: Protein source
  let proteinGrams = (proteinSource?.grams ?? 100)
  if (proteinSource && targets.protein > 0 && proteinSource.ingredient.protein_per_100g > 0) {
    const remaining = targets.protein - fixedProtein
    proteinGrams = Math.max(0, (remaining * 100) / proteinSource.ingredient.protein_per_100g)
  }
  if (proteinSource) {
    result.push({
      ...proteinSource,
      role: 'protein',
      grams: proteinGrams,
      ...macrosFromGrams(proteinSource.ingredient, proteinGrams),
    })
  }

  // Step 2: Carb source
  let carbGrams = (carbSource?.grams ?? 100)
  if (carbSource && targets.carbs > 0) {
    const remainingCarbs = targets.carbs - fixedCarbs
    if (targets.fiber > 0 && carbSource.ingredient.fiber_per_100g > 0) {
      // Net carbs approach: target net carbs = carbs - fiber, maximize fiber
      const netCarbTarget = targets.carbs - targets.fiber
      const ingredientNetCarbs =
        carbSource.ingredient.carbs_per_100g - carbSource.ingredient.fiber_per_100g
      if (ingredientNetCarbs > 0) {
        carbGrams = Math.max(0, (netCarbTarget * 100) / ingredientNetCarbs)
      } else {
        carbGrams = Math.max(0, (remainingCarbs * 100) / carbSource.ingredient.carbs_per_100g)
      }
    } else {
      carbGrams = Math.max(0, (remainingCarbs * 100) / carbSource.ingredient.carbs_per_100g)
    }
  }
  if (carbSource) {
    result.push({
      ...carbSource,
      role: 'carb',
      grams: carbGrams,
      ...macrosFromGrams(carbSource.ingredient, carbGrams),
    })
  }

  // Step 3: Fat source — fills remaining calorie gap
  let fatGrams = (fatSource?.grams ?? 15)
  if (fatSource && targets.calories > 0 && fatSource.ingredient.calories_per_100g > 0) {
    const currentCalories = result.reduce((sum, i) => sum + i.calories, 0)
    const remainingCalories = targets.calories - currentCalories
    if (remainingCalories > 0) {
      fatGrams = (remainingCalories * 100) / fatSource.ingredient.calories_per_100g
    } else {
      fatGrams = 0
      warnings.push('Calorie target is already met by protein and carb sources — fat ingredient set to 0g.')
    }
  }
  if (fatSource) {
    result.push({
      ...fatSource,
      role: 'fat',
      grams: fatGrams,
      ...macrosFromGrams(fatSource.ingredient, fatGrams),
    })
  }

  // Step 4: Sodium constraint — scale all down proportionally if exceeded
  let totals = sumTotals(result)
  if (targets.maxSodium > 0 && totals.sodium > targets.maxSodium) {
    const scale = targets.maxSodium / totals.sodium
    result.forEach(item => {
      item.grams *= scale
      item.calories *= scale
      item.protein *= scale
      item.fat *= scale
      item.carbs *= scale
      item.fiber *= scale
      item.sodium *= scale
    })
    totals = sumTotals(result)
    warnings.push(`Sodium limit of ${targets.maxSodium}mg exceeded — all ingredient amounts scaled down.`)
  }

  return { adjustedIngredients: result, totals, warnings }
}
