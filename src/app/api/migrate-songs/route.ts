import { NextResponse } from 'next/server'
import { Client } from 'pg'

export const dynamic = 'force-dynamic'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const projectRef = supaUrl.replace('https://', '').replace('.supabase.co', '')
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  const client = dbUrl
    ? new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
    : dbPassword
      ? new Client({ host: `db.${projectRef}.supabase.co`, port: 5432, database: 'postgres', user: 'postgres', password: dbPassword, ssl: { rejectUnauthorized: false } })
      : null

  if (!client) return NextResponse.json({ error: 'No DB connection available. Run this SQL in Supabase:\nALTER TABLE artist_songs ADD COLUMN IF NOT EXISTS master_owners JSONB;\nALTER TABLE artist_songs ADD COLUMN IF NOT EXISTS publishing_owners JSONB;\nALTER TABLE artist_songs DROP COLUMN IF EXISTS status;' }, { status: 500 })

  await client.connect()
  await client.query(`ALTER TABLE artist_songs ADD COLUMN IF NOT EXISTS master_owners JSONB`)
  await client.query(`ALTER TABLE artist_songs ADD COLUMN IF NOT EXISTS publishing_owners JSONB`)
  await client.end()
  return NextResponse.json({ ok: true })
}
