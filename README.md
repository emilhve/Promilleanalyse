# Promilleanalyse

A minimal web app built with React, Vite, TypeScript, Tailwind CSS, and
Supabase.

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

## Development

Start the Vite development server:

```bash
npm run dev
```

Open the local URL shown in the terminal. The home page confirms that React and
Tailwind CSS are working and performs a table-free Supabase health check.

## Production build

Type-check and create a production build:

```bash
npm run build
```

To preview the built application locally:

```bash
npm run preview
```
