import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * Cash-flow report, indirect method — בסיס: תנועות בחשבונות מזומן/בנק (1010–1040).
 * Classifies each posted JE touching cash into operating / investing / financing based on source_type.
 * GET /api/accounting/reports/cash-flow?from=2026-01-01&to=2026-12-31
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const from = searchParams.get('from') || `${year}-01-01`
  const to   = searchParams.get('to')   || `${year}-12-31`

  // Cash accounts
  const { data: cashAccts } = await supa
    .from('accounts')
    .select('id, code, name_he')
    .in('code', ['1010','1020','1030','1040'])

  const cashIds = (cashAccts || []).map(a => a.id as string)
  if (cashIds.length === 0) {
    return NextResponse.json({ error: 'No cash accounts found' }, { status: 500 })
  }

  // Fetch ALL lines in cash accounts in the window — we'll classify by JE source_type
  const { data: lines, error } = await supa
    .from('je_lines')
    .select('debit, credit, account_id, je_id, journal_entries!inner(entry_date, status, source_type, description)')
    .in('account_id', cashIds)
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = { debit: number; credit: number; je: { entry_date: string; source_type: string; description: string } }
  const rows = (lines || []) as unknown as Array<{ debit: number; credit: number; journal_entries: { entry_date: string; source_type: string; description: string } }>

  // Classification rules
  const classify = (src: string): 'operating' | 'investing' | 'financing' => {
    if (['invoice','invoice_payment','expense','expense_payment','payroll'].includes(src)) return 'operating'
    if (['depreciation','opening','closing','adjustment','manual'].includes(src)) return 'operating'
    if (['asset_purchase','asset_disposal'].includes(src)) return 'investing'
    if (['loan','owner_draw','capital_in','dividend'].includes(src)) return 'financing'
    return 'operating'
  }

  // Opening cash balance (before 'from')
  const { data: priorLines } = await supa
    .from('je_lines')
    .select('debit, credit, journal_entries!inner(entry_date, status)')
    .in('account_id', cashIds)
    .eq('journal_entries.status', 'posted')
    .lt('journal_entries.entry_date', from)

  let opening = 0
  for (const l of (priorLines || []) as Array<{ debit: number; credit: number }>) {
    opening += (Number(l.debit) || 0) - (Number(l.credit) || 0)
  }

  const byActivity = { operating: 0, investing: 0, financing: 0 }
  const monthly: Record<string, { operating: number; investing: number; financing: number; total: number }> = {}
  const bySource: Record<string, { inflow: number; outflow: number; net: number }> = {}

  for (const l of rows) {
    const j = l.journal_entries
    const net = (Number(l.debit) || 0) - (Number(l.credit) || 0)  // + = cash in, − = cash out
    const act = classify(j.source_type)
    byActivity[act] += net

    const ym = (j.entry_date || '').slice(0, 7)
    if (!monthly[ym]) monthly[ym] = { operating: 0, investing: 0, financing: 0, total: 0 }
    monthly[ym][act] += net
    monthly[ym].total += net

    if (!bySource[j.source_type]) bySource[j.source_type] = { inflow: 0, outflow: 0, net: 0 }
    if (net > 0) bySource[j.source_type].inflow += net
    else bySource[j.source_type].outflow += -net
    bySource[j.source_type].net += net
  }

  const r2 = (n: number) => Math.round(n * 100) / 100
  const totalChange = byActivity.operating + byActivity.investing + byActivity.financing
  const closing = opening + totalChange

  return NextResponse.json({
    period: { from, to, year },
    opening_cash:  r2(opening),
    closing_cash:  r2(closing),
    net_change:    r2(totalChange),
    operating:     r2(byActivity.operating),
    investing:     r2(byActivity.investing),
    financing:     r2(byActivity.financing),
    monthly: Object.fromEntries(
      Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b))
        .map(([k, v]) => [k, { operating: r2(v.operating), investing: r2(v.investing), financing: r2(v.financing), total: r2(v.total) }])
    ),
    by_source: Object.fromEntries(
      Object.entries(bySource).map(([k, v]) => [k, { inflow: r2(v.inflow), outflow: r2(v.outflow), net: r2(v.net) }])
    ),
  })
}
