import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * 856 — דו"ח ניכויים שנתי: סיכום ניכוי מס במקור לספקים.
 * כולל: זיהוי המקבל, סכום תשלום, סכום שנוכה.
 * כרגע — מחשב מתקבולים ששולמו ובהם נוכה מס (invoices.tax_withheld>0).
 * בעתיד — גם תשלומים לספקים שנוכה מהם מס.
 * GET /api/accounting/reports/withholding-856?year=2026
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  // Withholding that was deducted FROM us (invoices we issued)
  const { data: invs } = await supa
    .from('invoices')
    .select('invoice_num, date, client, client_tax_id, paid, tax_withheld, total')
    .gte('date', from)
    .lte('date', to)
    .gt('tax_withheld', 0)

  const byClient: Record<string, { client: string; tax_id: string; payments: number; withheld: number; count: number }> = {}
  for (const inv of (invs || []) as Array<{ invoice_num: string; date: string; client: string; client_tax_id: string | null; paid: number; tax_withheld: number }>) {
    const key = (inv.client_tax_id || '').replace(/\D/g, '') || `__${inv.client}`
    if (!byClient[key]) byClient[key] = { client: inv.client, tax_id: inv.client_tax_id || '', payments: 0, withheld: 0, count: 0 }
    byClient[key].payments += Number(inv.paid) || 0
    byClient[key].withheld += Number(inv.tax_withheld) || 0
    byClient[key].count    += 1
  }

  const rows = Object.entries(byClient).map(([key, v]) => ({
    vat_id: key.startsWith('__') ? '' : key,
    client: v.client,
    count: v.count,
    gross_payments:   Math.round(v.payments * 100) / 100,
    tax_withheld:     Math.round(v.withheld * 100) / 100,
  }))

  // Withholding that WE deducted from suppliers (future: via payments to suppliers)
  // Currently not tracked in source docs — leave empty for now.
  const suppliers: Array<{ vat_id: string; supplier: string; gross_payments: number; tax_withheld: number }> = []

  const totals = {
    inward_gross:    rows.reduce((t, r) => t + r.gross_payments, 0),
    inward_withheld: rows.reduce((t, r) => t + r.tax_withheld, 0),
    outward_gross:    suppliers.reduce((t, r) => t + r.gross_payments, 0),
    outward_withheld: suppliers.reduce((t, r) => t + r.tax_withheld, 0),
  }

  return NextResponse.json({
    year, from, to,
    note: 'ניכויים שנוכו לנו מופיעים תחת inward. ניכויים שניכינו — תחת outward (עתידי).',
    inward:  rows.sort((a, b) => b.tax_withheld - a.tax_withheld),
    outward: suppliers,
    totals,
  })
}
