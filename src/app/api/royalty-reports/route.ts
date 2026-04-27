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
  const source = req.nextUrl.searchParams.get('source') // 'federation' | 'streaming'
  if (!artist) return NextResponse.json({ error: 'artist required' }, { status: 400 })

  let q = sb().from('royalty_reports').select('*').eq('artist_name', artist).order('period', { ascending: false })
  if (source) q = q.eq('source', source)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reports: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { artist_name, source, period, song_revenues, notes } = body
  if (!artist_name || !source || !period)
    return NextResponse.json({ error: 'artist_name, source, period required' }, { status: 400 })

  const { data, error } = await sb()
    .from('royalty_reports')
    .insert([{ artist_name, source, period, song_revenues: song_revenues || [], notes: notes || null }])
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report: data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, song_revenues, notes } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await sb()
    .from('royalty_reports')
    .update({ ...(song_revenues !== undefined && { song_revenues }), ...(notes !== undefined && { notes }) })
    .eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report: data })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await sb().from('royalty_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
