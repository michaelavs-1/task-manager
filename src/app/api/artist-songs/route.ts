import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Ensure table exists (idempotent)
async function ensureTable() {
  const sb = getSupabase()
  try {
    await sb.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS artist_songs (
          id          BIGSERIAL PRIMARY KEY,
          artist_name TEXT NOT NULL,
          title       TEXT NOT NULL,
          year        TEXT,
          isrc        TEXT,
          status      TEXT DEFAULT 'יצא לאור',
          master_pct        NUMERIC(5,2),
          publishing_pct    NUMERIC(5,2),
          writers           TEXT,
          producers         TEXT,
          label             TEXT,
          notes             TEXT,
          created_at  TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS artist_songs_artist_idx ON artist_songs(artist_name);
      `
    })
  } catch { /* ignore if rpc not available */ }
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get('artist')
  if (!artist) return NextResponse.json({ error: 'artist required' }, { status: 400 })

  const sb = getSupabase()
  const { data, error } = await sb
    .from('artist_songs')
    .select('*')
    .eq('artist_name', artist)
    .order('year', { ascending: false })
    .order('title', { ascending: true })

  if (error) {
    // Table might not exist yet — try to create it then retry
    await ensureTable()
    const { data: data2, error: e2 } = await sb
      .from('artist_songs')
      .select('*')
      .eq('artist_name', artist)
      .order('year', { ascending: false })
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
    return NextResponse.json({ songs: data2 || [] })
  }

  return NextResponse.json({ songs: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body.artist_name || !body.title)
    return NextResponse.json({ error: 'artist_name and title required' }, { status: 400 })

  const sb = getSupabase()
  const { data, error } = await sb
    .from('artist_songs')
    .insert([{
      artist_name:       body.artist_name,
      title:             body.title,
      year:              body.year || null,
      isrc:              body.isrc || null,
      master_pct:        body.master_pct ?? null,
      publishing_pct:    body.publishing_pct ?? null,
      master_owners:     body.master_owners ?? null,
      publishing_owners: body.publishing_owners ?? null,
      writers:           body.writers || null,
      producers:         body.producers || null,
      label:             body.label || null,
      notes:             body.notes || null,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ song: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['title','year','isrc','master_pct','publishing_pct','master_owners','publishing_owners','writers','producers','label','notes','revenue','federation_revenue','streaming_revenue']
  const patch: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in fields) patch[k] = fields[k] })

  const sb = getSupabase()
  const { data, error } = await sb
    .from('artist_songs')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ song: data })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const sb = getSupabase()
  const { error } = await sb.from('artist_songs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
