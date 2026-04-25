import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * Bank transactions — list + import.
 * GET  /api/accounting/bank/transactions?account_id=...&from=...&to=...
 * POST /api/accounting/bank/transactions  { account_id, rows: [{ date, description, amount, reference }] }
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const from = searchParams.get('from')
  const to   = searchParams.get('to')
  const status = searchParams.get('status')

  let q = supa
    .from('bank_transactions')
    .select('*, bank_accounts(name, code, account_code)')
    .order('date', { ascending: false })
    .limit(2000)
  if (accountId) q = q.eq('bank_account_id', accountId)
  if (from) q = q.gte('date', from)
  if (to)   q = q.lte('date', to)
  if (status) q = q.eq('match_status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transactions: data || [] })
}

export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const accountId = body.account_id
  const rows = (body.rows || []) as Array<{ date: string; description: string; amount: number; reference?: string; balance?: number }>
  if (!accountId || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'account_id + rows required' }, { status: 400 })
  }

  const payload = rows.map(r => ({
    bank_account_id: accountId,
    date:            r.date,
    description:     r.description,
    amount:          Number(r.amount) || 0,
    reference:       r.reference || null,
    balance_after:   r.balance != null ? Number(r.balance) : null,
    match_status:    'unmatched',
  }))

  const { data, error } = await supa.from('bank_transactions').insert(payload).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: (data || []).length, transactions: data || [] })
}
