import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * טופס 6111 — דו"ח כספי שנתי התאמה למס.
 * סוכם יתרות לפי code_6111 של כל חשבון (כפי שנקבע בתוכנית חשבונות).
 * GET /api/accounting/reports/form-6111?year=2026
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const { data: accts, error: aErr } = await supa
    .from('accounts')
    .select('id, code, name_he, account_type, code_6111')
    .not('code_6111', 'is', null)
    .order('code_6111')
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

  const { data: lines, error: lErr } = await supa
    .from('je_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, status)')
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

  // Aggregate by code_6111
  const byForm: Record<string, { code_6111: string; total: number; accounts: Array<{ code: string; name_he: string; amount: number }> }> = {}
  for (const a of accts || []) {
    const s = sums[a.id as string] || { debit: 0, credit: 0 }
    const net = s.debit - s.credit
    const isCreditNatural = ['revenue','liability','equity','contra_asset','contra_revenue'].includes(a.account_type as string)
    const amt = isCreditNatural ? -net : net
    const key = a.code_6111 as string
    if (!byForm[key]) byForm[key] = { code_6111: key, total: 0, accounts: [] }
    byForm[key].total += amt
    if (Math.abs(amt) > 0.005) {
      byForm[key].accounts.push({
        code: a.code as string,
        name_he: a.name_he as string,
        amount: Math.round(amt * 100) / 100,
      })
    }
  }

  const rows = Object.values(byForm)
    .map(r => ({ ...r, total: Math.round(r.total * 100) / 100 }))
    .filter(r => Math.abs(r.total) > 0.005)
    .sort((a, b) => a.code_6111.localeCompare(b.code_6111))

  return NextResponse.json({
    year, from, to,
    rows,
    note: 'הסכומים לפי סיווג 6111 (ראה עמודת code_6111 בחשבונות). ייצוא BKMV בהמשך.',
  })
}
