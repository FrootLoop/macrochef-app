export type IngredientCategory =
  | 'meat'
  | 'seafood'
  | 'poultry'
  | 'egg'
  | 'dairy'
  | 'grain'
  | 'legume'
  | 'vegetable'
  | 'fruit'
  | 'oil'
  | 'nut'
  | 'other'

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  calories_per_100g: number
  protein_per_100g: number
  fat_per_100g: number
  carbs_per_100g: number
  fiber_per_100g: number
  sodium_per_100g: number
}

export interface SelectedIngredient {
  ingredient: Ingredient
  grams: number
  locked: boolean
}

export type IngredientRole = 'protein' | 'carb' | 'fat' | 'other'

export interface AdjustedIngredient extends SelectedIngredient {
  role: IngredientRole
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
}

export interface MacroTargets {
  calories: number
  protein: number
  carbs: number
  fiber: number
  maxSodium: number
}

export interface MacroTotals {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  sodium: number
  netCarbs: number
}

export interface CalculationResult {
  adjustedIngredients: AdjustedIngredient[]
  totals: MacroTotals
  warnings: string[]
}

export interface Recipe {
  id: string
  user_id: string
  title: string
  notes: string | null
  is_public: boolean
  image_url: string | null
  target_calories: number | null
  target_protein: number | null
  target_carbs: number | null
  target_fiber: number | null
  target_sodium: number | null
  total_calories: number | null
  total_protein: number | null
  total_fat: number | null
  total_carbs: number | null
  total_fiber: number | null
  total_sodium: number | null
  created_at: string
  updated_at: string
  recipe_ingredients?: RecipeIngredientRow[]
  profiles?: { username: string | null }
}

export interface RecipeIngredientRow {
  id: string
  recipe_id: string
  ingredient_id: string
  grams: number
  ingredient?: Ingredient
}
