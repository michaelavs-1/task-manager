/**
 * ONE-TIME setup route — creates forecast_invoices table if it doesn't exist.
 * Self-deletes instructions: remove this file after first successful run.
 */
import { NextResponse } from 'next/server'

const SQL = `
  CREATE TABLE IF NOT EXISTS forecast_invoices (
    id                SERIAL PRIMARY KEY,
    client            TEXT NOT NULL DEFAULT '',
    client_id         INTEGER,
    project_id        TEXT,
    description       TEXT DEFAULT '',
    expected_date     TEXT DEFAULT '',
    amount_before_vat NUMERIC(12,2) DEFAULT 0,
    vat               NUMERIC(12,2) DEFAULT 0,
    total             NUMERIC(12,2) DEFAULT 0,
    confidence        TEXT DEFAULT 'סביר',
    notes             TEXT DEFAULT '',
    created_at        TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE forecast_invoices ENABLE ROW LEVEL SECURITY;

  DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'forecast_invoices' AND policyname = 'allow_anon_all'
    ) THEN
      CREATE POLICY allow_anon_all ON forecast_invoices
        FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
  END $$;
`

export async function GET() {
  const pgUrl = process.env.POSTGRES_URL_NON_POOLING
            || process.env.POSTGRES_URL
            || process.env.DATABASE_URL

  // ── Path A: direct postgres via pg ───────────────────────────────────
  if (pgUrl) {
    try {
      const { Client } = await import('pg')
      const client = new Client({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })
      await client.connect()
      await client.query(SQL)
      await client.end()
      return NextResponse.json({ ok: true, method: 'pg', message: 'forecast_invoices table ready' })
    } catch (e) {
      return NextResponse.json({ ok: false, method: 'pg', error: String(e) }, { status: 500 })
    }
  }

  // ── Path B: Supabase Management API (needs SUPABASE_ACCESS_TOKEN env) ─
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref   = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
                  .replace('https://', '').split('.')[0]

  if (token && ref) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: SQL }),
      }
    )
    const body = await res.json()
    if (res.ok) return NextResponse.json({ ok: true, method: 'management-api' })
    return NextResponse.json({ ok: false, method: 'management-api', error: body }, { status: 500 })
  }

  return NextResponse.json({
    ok: false,
    error: 'No POSTGRES_URL or SUPABASE_ACCESS_TOKEN found in env',
    hint: 'Add SUPABASE_ACCESS_TOKEN to Vercel env vars then call this endpoint',
  }, { status: 500 })
}
