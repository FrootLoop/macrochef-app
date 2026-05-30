-- ============================================================
-- MacroChef Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Ingredients table
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in (
    'meat','seafood','poultry','egg','dairy','grain','legume','vegetable','fruit','oil','nut','other'
  )),
  calories_per_100g numeric not null,
  protein_per_100g  numeric not null default 0,
  fat_per_100g      numeric not null default 0,
  carbs_per_100g    numeric not null default 0,
  fiber_per_100g    numeric not null default 0,
  sodium_per_100g   numeric not null default 0,
  created_at timestamptz default now()
);

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Recipes
create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  notes text,
  is_public boolean not null default false,
  image_url text,
  target_calories numeric,
  target_protein  numeric,
  target_carbs    numeric,
  target_fiber    numeric,
  target_sodium   numeric,
  total_calories  numeric,
  total_protein   numeric,
  total_fat       numeric,
  total_carbs     numeric,
  total_fiber     numeric,
  total_sodium    numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Recipe ↔ Ingredient junction
create table if not exists recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id),
  grams         numeric not null,
  created_at    timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table ingredients       enable row level security;
alter table profiles          enable row level security;
alter table recipes           enable row level security;
alter table recipe_ingredients enable row level security;

-- Ingredients: public read
create policy "Anyone can read ingredients" on ingredients
  for select using (true);

-- Profiles
create policy "Anyone can read profiles" on profiles
  for select using (true);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Recipes: public recipes visible to all; own recipes visible to owner
create policy "Anyone can read public recipes" on recipes
  for select using (is_public = true or auth.uid() = user_id);
create policy "Users can insert own recipes" on recipes
  for insert with check (auth.uid() = user_id);
create policy "Users can update own recipes" on recipes
  for update using (auth.uid() = user_id);
create policy "Users can delete own recipes" on recipes
  for delete using (auth.uid() = user_id);

-- Recipe ingredients follow recipe visibility
create policy "Anyone can read visible recipe ingredients" on recipe_ingredients
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and (r.is_public = true or r.user_id = auth.uid())
    )
  );
create policy "Users can manage own recipe ingredients" on recipe_ingredients
  for all using (
    exists (
      select 1 from recipes r
      where r.id = recipe_id
        and r.user_id = auth.uid()
    )
  );

-- ============================================================
-- Auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Storage bucket for recipe images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

create policy "Public can read recipe images" on storage.objects
  for select using (bucket_id = 'recipe-images');

create policy "Authenticated users can upload recipe images" on storage.objects
  for insert with check (bucket_id = 'recipe-images' and auth.uid() is not null);

create policy "Users can update own recipe images" on storage.objects
  for update using (bucket_id = 'recipe-images' and auth.uid() is not null);

create policy "Users can delete own recipe images" on storage.objects
  for delete using (bucket_id = 'recipe-images' and auth.uid() is not null);

-- ============================================================
-- Seed Data — Common Supermarket Foods (USDA FoodData Central)
-- All values are per 100g
-- ============================================================

insert into ingredients (name, category, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g, fiber_per_100g, sodium_per_100g) values

-- MEATS
('Chicken Breast, Cooked',      'meat',    165, 31.0,  3.6,  0.0, 0.0,  74),
('Ground Beef, 90% Lean, Cooked','meat',   215, 26.1, 11.7,  0.0, 0.0,  78),
('Pork Tenderloin, Cooked',     'meat',    166, 26.2,  5.6,  0.0, 0.0,  52),
('Ground Turkey, Cooked',       'meat',    218, 27.4, 11.8,  0.0, 0.0,  88),
('Beef Sirloin, Cooked',        'meat',    207, 26.0, 11.0,  0.0, 0.0,  64),

-- SEAFOOD
('Atlantic Salmon, Cooked',     'seafood', 208, 20.4, 13.4,  0.0, 0.0,  59),
('Tuna, Canned in Water',       'seafood', 116, 25.5,  0.8,  0.0, 0.0, 337),
('Tilapia, Cooked',             'seafood', 128, 26.2,  2.7,  0.0, 0.0,  52),
('Shrimp, Cooked',              'seafood',  99, 24.0,  0.3,  0.0, 0.0, 193),
('Cod, Cooked',                 'seafood',  93, 20.4,  0.8,  0.0, 0.0,  73),
('Sardines, Canned in Oil',     'seafood', 208, 24.6, 11.5,  0.0, 0.0, 505),

-- POULTRY
('Turkey Breast, Roasted',      'poultry', 135, 29.9,  1.0,  0.0, 0.0,  63),
('Chicken Thigh, Cooked',       'poultry', 209, 25.9, 10.9,  0.0, 0.0,  88),

-- EGGS
('Eggs, Whole, Cooked',         'egg',     155, 12.6, 10.6,  1.1, 0.0, 124),
('Egg Whites, Cooked',          'egg',      52, 10.9,  0.2,  0.7, 0.0, 166),

-- DAIRY
('Greek Yogurt, Plain, Nonfat', 'dairy',    59, 10.2,  0.4,  3.6, 0.0,  36),
('Cheddar Cheese',              'dairy',   403, 24.9, 33.1,  1.3, 0.0, 621),
('Mozzarella, Part Skim',       'dairy',   254, 24.3, 15.9,  2.8, 0.0, 466),
('Cottage Cheese, 2%',          'dairy',    98, 11.1,  4.3,  3.4, 0.0, 364),
('Whole Milk',                  'dairy',    61,  3.2,  3.3,  4.8, 0.0,  43),
('Heavy Cream',                 'dairy',   345,  2.1, 37.0,  2.8, 0.0,  35),
('Parmesan Cheese, Grated',     'dairy',   420, 35.8, 29.7,  4.1, 0.0, 1184),

-- GRAINS
('Brown Rice, Cooked',          'grain',   112,  2.6,  0.9, 23.5, 1.8,   5),
('White Rice, Cooked',          'grain',   130,  2.7,  0.3, 28.1, 0.4,   1),
('Oats, Rolled, Dry',           'grain',   389, 16.9,  6.9, 66.3,10.6,   2),
('Quinoa, Cooked',              'grain',   120,  4.4,  1.9, 21.3, 2.8,   7),
('Whole Wheat Bread',           'grain',   247, 13.4,  3.4, 41.3, 6.0, 400),
('White Pasta, Cooked',         'grain',   131,  5.0,  1.1, 24.9, 1.8,   1),
('Sweet Potato, Baked',         'grain',    90,  2.0,  0.1, 20.7, 3.3,  36),
('Potato, Baked',               'grain',    93,  2.5,  0.1, 21.1, 2.2,   6),
('Whole Wheat Tortilla',        'grain',   294,  9.2,  6.7, 46.6, 6.7, 468),

-- LEGUMES
('Black Beans, Cooked',         'legume',  132,  8.9,  0.5, 23.7, 8.7,   1),
('Chickpeas, Cooked',           'legume',  164,  8.9,  2.6, 27.4, 7.6,   7),
('Lentils, Cooked',             'legume',  116,  9.0,  0.4, 20.1, 7.9,   2),
('Edamame, Cooked',             'legume',  121, 11.9,  5.2,  8.9, 5.2,   6),
('Kidney Beans, Cooked',        'legume',  127,  8.7,  0.5, 22.8, 6.4,   2),
('Tofu, Firm',                  'legume',   76,  8.2,  4.2,  1.9, 0.3,   7),

-- VEGETABLES
('Broccoli, Raw',               'vegetable', 34, 2.8,  0.4,  6.6, 2.6,  33),
('Spinach, Raw',                'vegetable', 23, 2.9,  0.4,  3.6, 2.2,  79),
('Kale, Raw',                   'vegetable', 49, 4.3,  0.9,  8.8, 3.6,  38),
('Red Bell Pepper, Raw',        'vegetable', 31, 1.0,  0.3,  6.0, 2.1,   4),
('Tomato, Raw',                 'vegetable', 18, 0.9,  0.2,  3.9, 1.2,   5),
('Zucchini, Raw',               'vegetable', 17, 1.2,  0.3,  3.1, 1.0,   8),
('Cucumber, Raw',               'vegetable', 15, 0.7,  0.1,  3.6, 0.5,   2),
('Carrots, Raw',                'vegetable', 41, 0.9,  0.2,  9.6, 2.8,  69),
('Cauliflower, Raw',            'vegetable', 25, 1.9,  0.3,  5.0, 2.0,  30),
('Asparagus, Raw',              'vegetable', 20, 2.2,  0.1,  3.9, 2.1,   2),
('Brussels Sprouts, Raw',       'vegetable', 43, 3.4,  0.3,  8.9, 3.8,  25),
('Celery, Raw',                 'vegetable', 16, 0.7,  0.2,  3.0, 1.6,  80),
('Onion, Raw',                  'vegetable', 40, 1.1,  0.1,  9.3, 1.7,   4),
('Mushrooms, Raw',              'vegetable', 22, 3.1,  0.3,  3.3, 1.0,   5),
('Green Beans, Raw',            'vegetable', 31, 1.8,  0.1,  7.1, 3.4,   6),
('Arugula, Raw',                'vegetable', 25, 2.6,  0.7,  3.7, 1.6,  27),

-- FRUITS
('Banana',                      'fruit',   89,  1.1,  0.3, 22.8, 2.6,   1),
('Apple',                       'fruit',   52,  0.3,  0.2, 13.8, 2.4,   1),
('Blueberries',                 'fruit',   57,  0.7,  0.3, 14.5, 2.4,   1),
('Strawberries',                'fruit',   32,  0.7,  0.3,  7.7, 2.0,   1),
('Orange',                      'fruit',   47,  0.9,  0.1, 11.8, 2.4,   0),
('Avocado',                     'fruit',  160,  2.0, 14.7,  8.5, 6.7,   7),
('Mango',                       'fruit',   60,  0.8,  0.4, 15.0, 1.6,   1),
('Raspberries',                 'fruit',   52,  1.2,  0.7, 11.9, 6.5,   1),
('Grapes',                      'fruit',   69,  0.7,  0.2, 18.1, 0.9,   2),
('Pineapple',                   'fruit',   50,  0.5,  0.1, 13.1, 1.4,   1),
('Watermelon',                  'fruit',   30,  0.6,  0.2,  7.6, 0.4,   1),

-- OILS
('Olive Oil, Extra Virgin',     'oil',    884,  0.0,100.0,  0.0, 0.0,   2),
('Coconut Oil',                 'oil',    892,  0.0, 99.1,  0.0, 0.0,   0),
('Butter, Unsalted',            'oil',    717,  0.9, 81.1,  0.1, 0.0,  11),
('Avocado Oil',                 'oil',    884,  0.0,100.0,  0.0, 0.0,   0),
('Sesame Oil',                  'oil',    884,  0.0,100.0,  0.0, 0.0,   0),

-- NUTS & SEEDS
('Almonds',                     'nut',    579, 21.2, 49.9, 21.6,12.5,   1),
('Peanut Butter, Natural',      'nut',    588, 25.1, 50.4, 19.6, 6.0, 459),
('Walnuts',                     'nut',    654, 15.2, 65.2, 13.7, 6.7,   2),
('Chia Seeds',                  'nut',    486, 16.5, 30.7, 42.1,34.4,  16),
('Flaxseeds, Ground',           'nut',    534, 18.3, 42.2, 28.9,27.3,  30),
('Pumpkin Seeds',               'nut',    559, 30.2, 49.1, 10.7, 6.0,   7),
('Cashews',                     'nut',    553, 18.2, 43.9, 30.2, 3.3,  12),
('Sunflower Seeds',             'nut',    584, 20.8, 51.5, 20.0, 8.6,   9);
