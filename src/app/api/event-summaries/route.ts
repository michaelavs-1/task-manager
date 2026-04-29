import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const artist = req.nextUrl.searchParams.get('artist')
  if (!artist) return NextResponse.json({ error: 'artist required' }, { status: 400 })
  const { data, error } = await sb()
    .from('event_summaries')
    .select('*')
    .eq('artist_name', artist)
    .order('event_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ summaries: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { artist_name, event_name, event_date, revenue, expenses, notes, monday_id } = body
  if (!artist_name || !event_name) return NextResponse.json({ error: 'artist_name and event_name required' }, { status: 400 })
  const { data, error } = await sb()
    .from('event_summaries')
    .insert([{ artist_name, event_name, event_date: event_date || null, revenue: revenue ?? 0, expenses: expenses ?? 0, notes: notes || null, monday_id: monday_id || null }])
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ summary: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const allowed = ['revenue','expenses','notes','event_name','event_date']
  const patch: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in fields) patch[k] = fields[k] })
  const { data, error } = await sb().from('event_summaries').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ summary: data })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await sb().from('event_summaries').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
