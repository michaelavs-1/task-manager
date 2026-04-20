import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

/**
 * Profit & Loss for a period.
 * GET /api/accounting/reports/pnl?from=2026-01-01&to=2026-12-31
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const from = searchParams.get('from') || `${year}-01-01`
  const to   = searchParams.get('to')   || `${year}-12-31`

  const { data: accts, error: aErr } = await supa
    .from('accounts')
    .select('id, code, name_he, account_type, code_6111')
    .in('account_type', ['revenue','expense','contra_revenue'])
    .order('code')
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  const acctIds = (accts || []).map(a => a.id)
  const { data: lines, error: lErr } = await supa
    .from('je_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, status)')
    .in('account_id', acctIds)
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  const sums: Record<string, { debit: number; credit: number }> = {}
  for (const l of (lines || []) as Array<{ account_id: string; debit: number; credit: number }>) {
    if (!sums[l.account_id]) sums[l.account_id] = { debit: 0, credit: 0 }
    sums[l.account_id].debit  += Number(l.debit)  || 0
    sums[l.account_id].credit += Number(l.credit) || 0
  }

  const revenue: Array<{ code: string; name_he: string; amount: number }> = []
  const expense: Array<{ code: string; name_he: string; amount: number }> = []
  for (const a of accts || []) {
    const s = sums[a.id as string] || { debit: 0, credit: 0 }
    if (a.account_type === 'revenue') {
      const amt = s.credit - s.debit
      if (Math.abs(amt) > 0.005) revenue.push({ code: a.code as string, name_he: a.name_he as string, amount: Math.round(amt * 100) / 100 })
    } else if (a.account_type === 'expense') {
      const amt = s.debit - s.credit
      if (Math.abs(amt) > 0.005) expense.push({ code: a.code as string, name_he: a.name_he as string, amount: Math.round(amt * 100) / 100 })
    }
  }

  const totalRevenue = revenue.reduce((t, r) => t + r.amount, 0)
  const totalExpense = expense.reduce((t, r) => t + r.amount, 0)

  return NextResponse.json({
    period: { from, to, year },
    revenue,
    expense,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_expense: Math.round(totalExpense * 100) / 100,
    net_profit:    Math.round((totalRevenue - totalExpense) * 100) / 100,
  })
}
