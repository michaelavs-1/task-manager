import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin, createJournalEntry, type JELineInput } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  const source_type = searchParams.get('source_type')
  const status = searchParams.get('status')
  const account_code = searchParams.get('account_code')
  const limit = Math.min(Number(searchParams.get('limit') || 500), 5000)

  let q = supa
    .from('journal_entries')
    .select('id, entry_date, description, source_type, source_id, reference, status, created_by, posted_at, reversed_by, je_lines(id, account_id, debit, credit, memo, project_id, artist_name, accounts(code, name_he, account_type))')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (from)  q = q.gte('entry_date', from)
  if (to)    q = q.lte('entry_date', to)
  if (source_type) q = q.eq('source_type', source_type)
  if (status)      q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Client-side filter by account_code (nested filter)
  let rows = (data || []) as unknown as Array<{ id: string; entry_date: string; description: string; status: string; je_lines: Array<{ accounts?: { code: string } }> }>
  if (account_code) {
    rows = rows.filter(e => (e.je_lines || []).some(l => l.accounts?.code === account_code))
  }
  return NextResponse.json({ entries: rows })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  try {
    const lines: JELineInput[] = (body.lines || []).map((l: { account_code: string; debit?: number; credit?: number; memo?: string; project_id?: string | null; artist_name?: string | null; cost_center?: string | null }) => ({
      account_code: l.account_code,
      debit:  Number(l.debit  || 0),
      credit: Number(l.credit || 0),
      memo:   l.memo || '',
      project_id:  l.project_id ?? null,
      artist_name: l.artist_name ?? null,
      cost_center: l.cost_center ?? null,
    }))
    const jeId = await createJournalEntry({
      entry_date:  body.entry_date || new Date().toISOString().slice(0, 10),
      description: body.description || '',
      source_type: body.source_type || 'manual',
      source_id:   body.source_id || null,
      reference:   body.reference || null,
      status:      body.status === 'draft' ? 'draft' : 'posted',
      created_by:  body.created_by || 'user',
      lines,
    })
    return NextResponse.json({ id: jeId })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
