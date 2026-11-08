# Kanban Board (React + Supabase)

A drag-and-drop task board with accounts, per-user data and live sync across tabs.

## Features
- **Guest sessions:** no sign-up. On first launch the app signs in anonymously (Supabase Auth) and keeps that guest session in the browser. Every row is tied to the guest's `user_id`, and Row Level Security makes sure each guest can only read and write their own data.
- **Drag and drop:** move cards between columns (`@dnd-kit`). Keyboard works too: focus a card, Space to pick up, arrow keys to move, Space to drop.
- **Automatic sorting:** each column sorts by priority (high → low), then soonest due date; tasks without a due date go last.
- **Realtime sync:** changes made in one tab or device appear in the others instantly (Supabase Realtime).
- **Tasks:** title, description, priority (low / medium / high) and due date, created from a pop-up with a custom calendar.
- **Team:** add team members (name, color, optional avatar image) in the sidebar and assign one or more to each task. Avatars show on cards.
- **Labels:** create custom labels (Bug, Feature, Design…) and put several on a task.
- **Task detail panel:** click a card to edit everything, write comments (oldest first, with timestamps) and see an activity timeline ("Moved from To Do → In Progress · 2 hours ago").
- **Activity history:** recorded by database triggers, so every status change, edit, assignment and label change is logged no matter where it came from.
- **Due date urgency:** overdue, due today and due soon (within 3 days) cards get a colored stripe and badge.
- **Search + filters:** search by title, filter by priority, assignee (or unassigned) and label. Clicking a person or label in the sidebar filters too.
- **Summary:** total, done and overdue counts with a progress bar.
- **Theming:** every font and color lives in `src/theme.css`.

## Setup
1. Create a Supabase project, open **SQL Editor**, and run `supabase/schema.sql`, then `supabase/002_collaboration.sql`.
2. In **Authentication → Sign In / Providers**, turn on **Allow anonymous sign-ins**. (Supabase recommends also enabling CAPTCHA to limit abuse; there's a default limit of 30 guest sign-ins per hour per IP.)
3. `cp .env.example .env` and paste your project URL + publishable key (click **Connect** in the Supabase dashboard).
4. `npm install`
5. `npm run dev`

## Structure
```
supabase/schema.sql             tasks table, per-user RLS policies, realtime
supabase/002_collaboration.sql  team, labels, assignees, comments, activity + triggers
src/theme.css                   ALL fonts + colors (edit this for aesthetics)
src/index.css                   layout and component styles
src/lib/supabase.js             Supabase client
src/api/tasks.js                tasks + their assignees and labels
src/api/team.js                 team members
src/api/labels.js               labels
src/api/comments.js             comments
src/api/activity.js             activity history (read only)
src/lib/dates.js                due date urgency, "2 hours ago"
src/lib/colors.js               color choices for members/labels (from theme.css)
src/context/BoardContext.js     shares members/labels with nested components
src/App.jsx                     creates/reuses the guest session, then shows the board
src/pages/BoardPage.jsx         board state, drag handlers, realtime subscription
src/components/Column.jsx       droppable, sortable column
src/components/TaskCard.jsx     sortable card (+ TaskCardView used for the drag preview)
src/components/TaskModal.jsx    pop-up form for new tasks
src/components/TaskDetailPanel.jsx  edit a task, comments, activity timeline
src/components/Sidebar.jsx      summary, team, labels
src/components/FilterBar.jsx    search + filters
src/components/Avatar.jsx       avatar + overlapping avatar stack
src/components/Pickers.jsx      assignee / label / priority / color pickers
src/components/DatePicker.jsx   custom calendar
```

## How ordering works
`status` decides the column. Inside a column, cards are sorted in the browser by
`priority`, then `due_date`, then `position` (creation order) as a tie-breaker. See
`compareTasks` in `BoardPage.jsx`. Dropping a card in another column saves only its
new status.

## Guest sessions: good to know
- The guest lives in this browser's storage. Clearing site data, a private window or another device means a new, empty guest.
- There's intentionally no Sign out button: a guest who signs out can't get back in.
- Supabase doesn't delete old guests automatically. To clean up guests older than 30 days:
  `delete from auth.users where is_anonymous is true and created_at < now() - interval '30 days';`

## Ideas for later
- Let a guest "save" their board by linking an email (`supabase.auth.updateUser({ email })`)
- Comment and activity realtime (add those tables to the `supabase_realtime` publication)
- Real multi-user teams where members are separate logins
- Shared boards: a `boards` table plus a `board_members` table, with RLS on membership
- Batch position updates in one call with a Postgres function (`supabase.rpc`)
