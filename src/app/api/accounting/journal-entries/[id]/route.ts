import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin, reverseJournalEntry } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  const { data, error } = await supa
    .from('journal_entries')
    .select('*, je_lines(*, accounts(code, name_he, account_type))')
    .eq('id', params.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reverseId = await reverseJournalEntry(params.id, 'מחיקה ידנית')
    return NextResponse.json({ ok: true, reversal_id: reverseId })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
