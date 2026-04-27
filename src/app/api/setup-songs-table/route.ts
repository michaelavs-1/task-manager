import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

const SQL = `
  CREATE TABLE IF NOT EXISTS artist_songs (
    id             BIGSERIAL PRIMARY KEY,
    artist_name    TEXT NOT NULL,
    title          TEXT NOT NULL,
    year           TEXT,
    isrc           TEXT,
    status         TEXT DEFAULT 'יצא לאור',
    master_pct     NUMERIC(5,2),
    publishing_pct NUMERIC(5,2),
    writers        TEXT,
    producers      TEXT,
    label          TEXT,
    notes          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS artist_songs_artist_idx ON artist_songs(artist_name);
  ALTER TABLE IF EXISTS artist_songs ENABLE ROW LEVEL SECURITY;
  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT FROM pg_policies WHERE tablename='artist_songs' AND policyname='allow_all_artist_songs'
    ) THEN
      CREATE POLICY allow_all_artist_songs ON artist_songs FOR ALL USING (true) WITH CHECK (true);
    END IF;
  END $$;
`

export async function GET() {
  // Try DATABASE_URL first (if set in Vercel)
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

  if (!dbUrl) {
    // Fallback: construct from Supabase URL + db password env var
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const projectRef = supaUrl.replace('https://', '').replace('.supabase.co', '')
    const dbPassword = process.env.SUPABASE_DB_PASSWORD

    if (!dbPassword) {
      return NextResponse.json({
        error: 'No DATABASE_URL or SUPABASE_DB_PASSWORD env var found',
        hint: 'Add DATABASE_URL to Vercel env vars (find it in Supabase → Settings → Database → Connection String)',
        project: projectRef,
      }, { status: 500 })
    }

    const client = new Client({
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: dbPassword,
      ssl: { rejectUnauthorized: false },
    })
    await client.connect()
    await client.query(SQL)
    await client.end()
    return NextResponse.json({ ok: true, method: 'supabase_db_password' })
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  await client.query(SQL)
  await client.end()
  return NextResponse.json({ ok: true, method: 'database_url' })
}
