# Promilleanalyse

A React, Vite, TypeScript, Tailwind CSS, and Supabase application for tracking
estimated blood alcohol concentration during shared sessions.

Administrators create a named session, select registered users, and start it.
Participants can then log drinks while everyone in that session sees the drink
log and an estimated BAC graph for each participant. A session closes
automatically 18 hours after it starts.

> This is a simplified educational estimate. Never use it to decide whether it
> is safe or legal to drive or perform another safety-critical activity.

## Requirements

- Node.js 20.19+ or 22.12+
- npm (included with Node.js)
- A Supabase project

Check your versions with `node --version` and `npm --version`.

## Install

```bash
npm install
```

## Environment configuration

Create a local environment file from the committed example:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux, use `cp .env.example .env.local`.

Fill in both values in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Find these values in the Supabase dashboard's **Connect** dialog or under
**Settings > API Keys**. Only use the publishable key in this browser app.
Never put a secret key, service-role key, or database password in a `VITE_`
variable. Local environment files are ignored by Git.

Restart Vite after changing environment variables.

## Supabase setup

The database migration is in
`supabase/migrations/202609280001_session_tracking.sql`. It creates profiles,
sessions, participant snapshots, drinks, RLS policies, server-side operations,
the Auth profile trigger, and Realtime publication entries.

The repository is configured for the Supabase CLI. To link a new checkout and
apply pending migrations:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The current hosted project has already received the included migration. More
database details and SQL Editor instructions are in `supabase/README.md`.

### Authentication configuration

In the Supabase dashboard:

1. Enable Email under **Authentication > Sign In / Providers**.
2. Choose whether registration requires email confirmation.
3. Under **Authentication > URL Configuration**, set the Site URL and add your
   development URL, normally `http://localhost:5173`, as a redirect URL.
4. Create accounts through the app. Registration collects a display name,
   weight, and calculation sex once. Existing accounts receive the same
   one-time setup after sign-in.

Profiles are stored in `public.profiles` and are read-only in the app after
completion. The calculation uses distribution factor `0.68` for male and
`0.55` for female.

### Make a user an administrator

Create the account first, then run this in the Supabase SQL Editor with your
own email address:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"app_role":"admin"}'::jsonb
where lower(email) = lower('your-email@example.com');
```

Sign out and sign back in afterward so the refreshed access token contains the
admin role. All other accounts default to the user role. Admin authorization is
also checked in the database; hiding admin controls in the UI is not the only
protection.

## Run locally

```bash
npm run dev
```

Open the URL printed by Vite. The workflow is:

1. Register or sign in.
2. An admin creates a draft and selects participants.
3. The admin starts the session, beginning its exact 18-hour lifetime.
4. Participants log amount in mL and ABV. The database supplies the timestamp.
5. Realtime updates refresh the shared drink log and per-person graphs. BAC
   timelines are recalculated on five-minute boundaries.

## Build and tests

Type-check and build the production application:

```bash
npm run build
```

Run the calculation unit tests:

```bash
npm test
```

Run the terminal-only BAC example:

```bash
npm run bac:example
```

Preview the production build with `npm run preview`.

## Calculation assumptions

- Pure alcohol grams: `volume_ml * (abv / 100) * 0.789`.
- Maximum promille: alcohol grams divided by body weight and the selected
  distribution factor.
- Each drink absorbs linearly over 45 minutes from its own timestamp.
- Alcohol is eliminated at a constant `0.15 ‰` per hour while present.
- Results never go below zero.
- Estimates do not account for food, drinking speed, health, medication, or
  individual metabolism.

Reusable calculation functions are in `src/lib/bac.ts`.
