import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * Budget vs Actual report.
 * GET /api/accounting/budgets/variance?year=2026
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())

  const { data: budgets, error: bErr } = await supa
    .from('budgets')
    .select('*, accounts(id, code, name_he, account_type)')
    .eq('fiscal_year', year)
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  const { data: lines, error: lErr } = await supa
    .from('je_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, status)')
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.entry_date', `${year}-01-01`)
    .lte('journal_entries.entry_date', `${year}-12-31`)
  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 })

  // Aggregate actuals by (account_id, month)
  const actuals: Record<string, Record<number, number>> = {}
  for (const l of (lines || []) as unknown as Array<{ account_id: string; debit: number; credit: number; journal_entries: { entry_date: string } }>) {
    const mo = Number(l.journal_entries.entry_date.slice(5, 7))
    const amt = (Number(l.debit) || 0) - (Number(l.credit) || 0)
    if (!actuals[l.account_id]) actuals[l.account_id] = {}
    actuals[l.account_id][mo] = (actuals[l.account_id][mo] || 0) + amt
  }

  type Budget = { fiscal_year: number; month: number; account_id: string; budgeted_amount: number; accounts: { id: string; code: string; name_he: string; account_type: string } | null }
  const rows = (budgets || [] as Budget[]).map((b: unknown) => {
    const x = b as Budget
    const type = x.accounts?.account_type || ''
    const isCreditNatural = ['revenue','liability','equity','contra_asset','contra_revenue'].includes(type)
    const rawActual = (actuals[x.account_id] || {})[x.month] || 0
    const actual = isCreditNatural ? -rawActual : rawActual
    const budget = Number(x.budgeted_amount) || 0
    const variance = actual - budget
    const variancePct = budget !== 0 ? (variance / budget) * 100 : null
    return {
      month: x.month,
      account_code: x.accounts?.code,
      name_he: x.accounts?.name_he,
      account_type: type,
      budget: Math.round(budget * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variance_pct: variancePct != null ? Math.round(variancePct * 10) / 10 : null,
    }
  })

  return NextResponse.json({ year, rows })
}
