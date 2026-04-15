import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const queries = [
    `CREATE TABLE IF NOT EXISTS artist_meeting_notes (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      artist_name text NOT NULL,
      title text NOT NULL,
      content text NOT NULL,
      meeting_date date NOT NULL,
      created_at timestamptz DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS artist_links (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      artist_name text NOT NULL,
      title text NOT NULL,
      url text NOT NULL,
      category text DEFAULT 'כללי',
      created_at timestamptz DEFAULT now()
    )`,
    `ALTER TABLE artist_meeting_notes ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE artist_links ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY IF NOT EXISTS "allow_all_meeting_notes" ON artist_meeting_notes FOR ALL USING (true) WITH CHECK (true)`,
    `CREATE POLICY IF NOT EXISTS "allow_all_artist_links" ON artist_links FOR ALL USING (true) WITH CHECK (true)`,
  ]

  const results: string[] = []
  for (const q of queries) {
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { query: q }).single()
      results.push(error ? 'ERR: ' + error.message : 'OK')
    } catch (e) {
      results.push('EX: ' + String(e).substring(0, 50))
    }
  }

  return NextResponse.json({ results })
}
