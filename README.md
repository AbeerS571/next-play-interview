# Kanban Board (React + Supabase)

## Setup
1. Create a Supabase project, open **SQL Editor**, and run `supabase/schema.sql`.
2. `cp .env.example .env` and paste your project URL + anon key.
3. `npm install`
4. `npm run dev`

## Structure
```
supabase/schema.sql       tasks table, RLS policies, seed rows
src/lib/supabase.js       Supabase client
src/api/tasks.js          fetch / create / move / delete
src/pages/BoardPage.jsx   board state + drag-end handler
src/components/Column.jsx     droppable column
src/components/TaskCard.jsx   draggable card
src/components/NewTaskForm.jsx
```

## Next steps
- Reorder within a column (`@dnd-kit/sortable`)
- Realtime sync (`supabase.channel(...).on('postgres_changes', ...)`)
- Auth + per-user RLS (add `user_id uuid references auth.users`)
