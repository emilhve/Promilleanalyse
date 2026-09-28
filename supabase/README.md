# Supabase database setup

The migration in `migrations/202609280001_session_tracking.sql` creates the
profile, session, participant, and drink schema used by the session feature.
It also installs the required RLS policies, RPC functions, Auth user trigger,
existing-user backfill, and Realtime publication entries.

## Apply through the Supabase dashboard

1. Open the project's **SQL Editor**.
2. Create a new query.
3. Paste the complete migration file into the query.
4. Run it once.

The migration runs in a transaction. If a statement fails, the schema changes
are rolled back rather than being partially applied.

## Apply with the Supabase CLI

After installing the CLI, initialize its project configuration and link the
repository to the hosted project:

```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Do not place the database password, secret key, or service-role key in a
`VITE_` environment variable.

## Verify

After applying the migration:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'sessions', 'session_participants', 'drinks')
order by table_name;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename in ('sessions', 'session_participants', 'drinks')
order by tablename;
```

Existing users without a `display_name` in Auth metadata will have an
incomplete profile row. The application should send those users through the
one-time profile completion flow before they can be added to a session.
