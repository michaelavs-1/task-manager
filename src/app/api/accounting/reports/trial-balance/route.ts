import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const asOf = searchParams.get('as_of') || new Date().toISOString().slice(0, 10)
  const from = searchParams.get('from') // optional: restrict to period
  const to   = searchParams.get('to') || asOf

  const { data: accts, error: aErr } = await supa
    .from('accounts')
    .select('id, code, name_he, account_type, code_6111')
    .order('code')
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  // Fetch lines within period
  let q = supa
    .from('je_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, status)')
    .eq('journal_entries.status', 'posted')
    .lte('journal_entries.entry_date', to)
  if (from) q = q.gte('journal_entries.entry_date', from)

  const { data: lines, error: lErr } = await q
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  const sums: Record<string, { debit: number; credit: number }> = {}
  for (const l of (lines || []) as Array<{ account_id: string; debit: number; credit: number }>) {
    if (!sums[l.account_id]) sums[l.account_id] = { debit: 0, credit: 0 }
    sums[l.account_id].debit  += Number(l.debit)  || 0
    sums[l.account_id].credit += Number(l.credit) || 0
  }

  const rows = (accts || []).map(a => {
    const s = sums[a.id as string] || { debit: 0, credit: 0 }
    const net = s.debit - s.credit
    const naturalDebit  = ['asset','expense','contra_revenue'].includes(a.account_type as string)
    const finalDebit    = naturalDebit ? Math.max(0, net) : Math.max(0, -net)
    const finalCredit   = naturalDebit ? Math.max(0, -net) : Math.max(0, net)
    return {
      account_id: a.id,
      code:       a.code,
      name_he:    a.name_he,
      account_type: a.account_type,
      code_6111:  a.code_6111,
      debit:      Math.round(s.debit * 100) / 100,
      credit:     Math.round(s.credit * 100) / 100,
      balance_debit:  Math.round(finalDebit * 100) / 100,
      balance_credit: Math.round(finalCredit * 100) / 100,
    }
  })

  const totals = rows.reduce(
    (t, r) => ({ debit: t.debit + r.balance_debit, credit: t.credit + r.balance_credit }),
    { debit: 0, credit: 0 }
  )

  return NextResponse.json({
    as_of: to,
    from,
    rows: rows.filter(r => r.balance_debit > 0.005 || r.balance_credit > 0.005 || r.debit > 0.005 || r.credit > 0.005),
    totals: {
      debit: Math.round(totals.debit * 100) / 100,
      credit: Math.round(totals.credit * 100) / 100,
      balanced: Math.abs(totals.debit - totals.credit) < 0.01,
    }
  })
}
