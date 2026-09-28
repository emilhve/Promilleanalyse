# Promilleanalyse

A minimal web app built with React, Vite, TypeScript, Tailwind CSS, and
Supabase.

The repository also contains reusable, UI-independent logic for estimating
blood alcohol concentration (promille) over time.

## Prerequisites

- Node.js 20.19+ or 22.12+
- npm (included with Node.js)
- A Supabase project

Check your installed versions with:

```bash
node --version
npm --version
```

## Install

Install the project dependencies:

```bash
npm install
```

## BAC calculation

Run the terminal example:

```bash
npm run bac:example
```

Run the unit tests:

```bash
npm test
```

The reusable calculation functions and `Drink` model are in
`src/lib/bac.ts`. The terminal example uses an 80 kg male and the drinks from
the example scenario, without loading the web application.

### Simplified assumptions

- Pure alcohol weighs 0.789 grams per milliliter.
- Maximum contribution uses the simplified Widmark formula: alcohol grams
  divided by body weight and a distribution factor (0.68 male, 0.55 female).
- Each drink absorbs linearly over 45 minutes from its own timestamp.
- Alcohol is eliminated from the running total at a constant 0.15 promille per
  hour while alcohol is present.
- Results are clamped to zero and do not account for food, drinking speed,
  health, medication, or individual metabolism.

This is a simplified educational estimate. It must not be used to decide
whether it is safe or legal to drive or perform another safety-critical task.

## Configure Supabase

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env.local
```

Then fill in both values in `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Find these values in the Supabase dashboard under your project's **Connect**
dialog or **Settings > API Keys**. Use a publishable key in this client-side
application; never place a Supabase secret key in a `VITE_` environment
variable.

Restart the development server after changing environment variables.

### Authentication and users

The app uses Supabase Auth for email/password registration and sign-in. Users
created from the **Create account** tab are stored by Supabase in its protected
`auth.users` schema; no separate public users table or schema change is needed
for authentication.

Body weight and the sex/distribution choice are collected during registration
and stored in the user's Supabase Auth `user_metadata`. The calculator loads
those values after sign-in instead of asking for them again. Existing accounts
without this metadata receive a one-time profile setup screen.

Signed-in users can view their email, account role, weight, and calculation sex
on the read-only **Settings** page. These values are not displayed in the
calculator or shared navigation.

In the Supabase dashboard:

1. Open **Authentication > Sign In / Providers** and ensure the Email provider
   is enabled.
2. Decide whether new users must confirm their email. Hosted projects normally
   enable confirmation by default.
3. Under **Authentication > URL Configuration**, set the Site URL and add the
   local development URL (normally `http://localhost:5173`) as an allowed
   redirect URL.
4. View and manage registered accounts under **Authentication > Users**.

For production email confirmations, configure a custom SMTP provider rather
than relying on Supabase's limited default email service.

### Database migrations

The session database schema is versioned under `supabase/migrations`. See
`supabase/README.md` for SQL Editor and Supabase CLI application instructions.

## Development

Start the Vite development server:

```bash
npm run dev
```

Open the local URL shown in the terminal. The home page lets a user enter body
details and multiple drinks, including amount, alcohol percentage, and
consumption time, then calculates the estimate using the reusable BAC module.

## Production build

Type-check and create a production build:

```bash
npm run build
```

To preview the built application locally:

```bash
npm run preview
```
