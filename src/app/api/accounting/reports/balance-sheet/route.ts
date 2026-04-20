import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

/**
 * Balance Sheet as of a date.
 * GET /api/accounting/reports/balance-sheet?as_of=2026-04-20
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const asOf = searchParams.get('as_of') || new Date().toISOString().slice(0, 10)

  const { data: accts, error: aErr } = await supa
    .from('accounts')
    .select('id, code, name_he, account_type, code_6111')
    .order('code')
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  const { data: lines, error: lErr } = await supa
    .from('je_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, status)')
    .eq('journal_entries.status', 'posted')
    .lte('journal_entries.entry_date', asOf)
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  const sums: Record<string, { debit: number; credit: number }> = {}
  for (const l of (lines || []) as Array<{ account_id: string; debit: number; credit: number }>) {
    if (!sums[l.account_id]) sums[l.account_id] = { debit: 0, credit: 0 }
    sums[l.account_id].debit  += Number(l.debit)  || 0
    sums[l.account_id].credit += Number(l.credit) || 0
  }

  const assets: Array<{ code: string; name_he: string; amount: number }> = []
  const liabilities: Array<{ code: string; name_he: string; amount: number }> = []
  const equity: Array<{ code: string; name_he: string; amount: number }> = []
  let retainedEarnings = 0

  for (const a of accts || []) {
    const s = sums[a.id as string] || { debit: 0, credit: 0 }
    const net = s.debit - s.credit
    if (a.account_type === 'asset') {
      if (Math.abs(net) > 0.005) assets.push({ code: a.code as string, name_he: a.name_he as string, amount: Math.round(net * 100) / 100 })
    } else if (a.account_type === 'contra_asset') {
      const amt = -net
      if (Math.abs(amt) > 0.005) assets.push({ code: a.code as string, name_he: a.name_he as string, amount: Math.round(-amt * 100) / 100 })
    } else if (a.account_type === 'liability') {
      const amt = -net
      if (Math.abs(amt) > 0.005) liabilities.push({ code: a.code as string, name_he: a.name_he as string, amount: Math.round(amt * 100) / 100 })
    } else if (a.account_type === 'equity') {
      const amt = -net
      if (Math.abs(amt) > 0.005) equity.push({ code: a.code as string, name_he: a.name_he as string, amount: Math.round(amt * 100) / 100 })
    } else if (a.account_type === 'revenue') {
      retainedEarnings += (s.credit - s.debit)
    } else if (a.account_type === 'expense') {
      retainedEarnings -= (s.debit - s.credit)
    }
  }

  if (Math.abs(retainedEarnings) > 0.005) {
    equity.push({ code: 'CY', name_he: 'רווח (הפסד) לשנה שוטפת', amount: Math.round(retainedEarnings * 100) / 100 })
  }

  const totalAssets      = assets.reduce((t, r) => t + r.amount, 0)
  const totalLiabilities = liabilities.reduce((t, r) => t + r.amount, 0)
  const totalEquity      = equity.reduce((t, r) => t + r.amount, 0)

  return NextResponse.json({
    as_of: asOf,
    assets,
    liabilities,
    equity,
    total_assets:      Math.round(totalAssets * 100) / 100,
    total_liabilities: Math.round(totalLiabilities * 100) / 100,
    total_equity:      Math.round(totalEquity * 100) / 100,
    total_liab_equity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
    balanced:          Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  })
}
