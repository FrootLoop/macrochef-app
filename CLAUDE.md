# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

MacroChef — a nutrition recipe builder. Users pick ingredients, set macro targets (calories, protein, carbs, fiber, sodium), and the app auto-calculates ingredient grams in real time. Recipes can be saved, made public/private, and viewed with a photo.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (auth + Postgres + storage) · Vercel

## Commands

```bash
npm install          # install deps
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
```

## Setup

1. Create a Supabase project at supabase.com
2. Run `supabase/schema.sql` in the Supabase SQL Editor — creates tables, RLS, trigger, storage bucket, and seeds ~70 ingredients
3. Copy `.env.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy to Vercel: add those same env vars in the Vercel project settings

## Architecture

```
src/
├── app/
│   ├── page.tsx               # Main recipe builder (client component, all state here)
│   ├── login/ signup/         # Supabase email+password auth pages
│   ├── recipes/
│   │   ├── page.tsx           # Recipe list (mine / public toggle)
│   │   └── [id]/page.tsx      # Recipe detail with image upload, public toggle, delete
│   └── api/
│       ├── ingredients/       # GET all ingredients (cached 1h)
│       └── auth/callback/     # Supabase auth code exchange
├── components/
│   ├── Navbar.tsx             # Auth state, nav links
│   ├── IngredientSearch.tsx   # Debounced search dropdown over ingredients list
│   ├── MacroTargets.tsx       # Sliders + number inputs for calorie/macro targets
│   ├── RecipeResult.tsx       # Ingredient table with calculated grams, macro bars, notes, save
│   ├── SaveRecipeModal.tsx    # Title + public/private modal, writes recipe + recipe_ingredients
│   └── RecipeCard.tsx         # Card for recipe list grid
├── lib/
│   ├── supabase/client.ts     # Browser Supabase client (@supabase/ssr)
│   ├── supabase/server.ts     # Server Supabase client (used in API routes)
│   └── macroCalculator.ts    # Pure function: calculateRecipe(selected, targets) → result
└── types/index.ts             # All shared TypeScript interfaces
```

## Macro Calculation Algorithm (`src/lib/macroCalculator.ts`)

`calculateRecipe(selected, targets)` assigns roles then solves for grams:

1. **Protein source** — highest protein/100g in `[meat, seafood, poultry]` category (else highest overall). Grams solved so `protein_per_100g × grams/100 = target_protein` (minus contribution from locked/other ingredients).
2. **Carb source** — highest carbs/100g in `[grain, fruit, vegetable, legume]` (else highest overall). If both `carbs` and `fiber` targets are set, uses **Net Carbs mode**: `netCarbTarget = carbs − fiber`, solves using `ingredientNetCarbs = carbs_per_100g − fiber_per_100g`.
3. **Fat source** — highest fat/100g in `[oil, nut, dairy]` (else highest overall). Grams fill the **remaining calorie gap**: `remainingCalories = target_calories − sum(all other ingredients)`.
4. **Sodium cap** — if total sodium exceeds `maxSodium` target, all grams scale down proportionally.

Locking an ingredient (🔒) excludes it from auto-adjustment; its grams are user-set and counted as fixed contribution before the roles are solved.

## Database Schema

- `ingredients` — ~70 USDA-sourced foods, all values per 100g, seeded by schema.sql
- `recipes` — owned by `profiles.id`, stores targets + computed totals + public flag + image_url
- `recipe_ingredients` — junction with grams per ingredient
- `profiles` — auto-created via trigger on `auth.users` insert

RLS: ingredients are public read. Recipes are readable if `is_public` or `user_id = auth.uid()`. Recipe ingredients follow recipe visibility.

## Key Patterns

- All Supabase auth state is read client-side via `supabase.auth.onAuthStateChange` — no server-side session dependency in page components.
- Ingredients are fetched once from `/api/ingredients` (server-cached) and filtered client-side for the search dropdown.
- The recipe builder is entirely client-side state (`useState` + `useMemo` on `calculateRecipe`). No server round-trips until Save.
- Image upload goes directly to Supabase Storage `recipe-images` bucket; the public URL is then stored in `recipes.image_url`.
