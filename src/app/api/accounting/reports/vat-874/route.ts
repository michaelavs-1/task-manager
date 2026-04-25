import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * דיווח מע"מ 874 — תקופתי (חודשי/דו-חודשי).
 * מקובל: סך המכירות (עסקאות חייבות) ומס עסקאות (2310),
 *        סך תשומות ומע"מ תשומות (2320, ציוד 2321).
 * GET /api/accounting/reports/vat-874?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const now = new Date()
  const ym = now.toISOString().slice(0, 7)
  const from = searchParams.get('from') || `${ym}-01`
  const to   = searchParams.get('to')   || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  // Sum credits to 2310 (output VAT) and debits to 2320/2321 (input VAT)
  const outputVatCodes = ['2310']
  const inputVatCodes  = ['2320','2321']

  // Revenue accounts (for sales total — taxable)
  const { data: accts } = await supa
    .from('accounts')
    .select('id, code, account_type')
    .order('code')
  const accountByCode = new Map<string, { id: string; account_type: string }>()
  for (const a of accts || []) accountByCode.set(a.code as string, { id: a.id as string, account_type: a.account_type as string })

  // Lines in period
  const { data: lines, error } = await supa
    .from('je_lines')
    .select('account_id, debit, credit, journal_entries!inner(entry_date, status, source_type)')
    .eq('journal_entries.status', 'posted')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type L = { account_id: string; debit: number; credit: number; journal_entries: { source_type: string } }
  const rows = (lines || []) as unknown as L[]

  const idToInfo = new Map<string, { code: string; type: string }>()
  for (const a of accts || []) idToInfo.set(a.id as string, { code: a.code as string, type: a.account_type as string })

  let sales = 0            // credits in revenue accounts (taxable)
  let outputVat = 0        // credits in 2310
  let purchasesGoods = 0   // debits in expense accounts (excluding VAT)
  let purchasesAssets = 0  // debits in asset accounts 1700+ (fixed assets)
  let inputVat = 0
  let inputVatAssets = 0

  for (const l of rows) {
    const info = idToInfo.get(l.account_id)
    if (!info) continue
    const d = Number(l.debit) || 0
    const c = Number(l.credit) || 0
    if (outputVatCodes.includes(info.code)) {
      outputVat += (c - d)  // credit-natural
    } else if (info.code === '2320') {
      inputVat += (d - c)
    } else if (info.code === '2321') {
      inputVatAssets += (d - c)
    } else if (info.type === 'revenue') {
      sales += (c - d)
    } else if (info.type === 'expense') {
      purchasesGoods += (d - c)
    } else if (info.type === 'asset' && /^17\d{2}$/.test(info.code)) {
      purchasesAssets += (d - c)
    }
  }

  const r2 = (n: number) => Math.round(n * 100) / 100
  const totalInputVat = inputVat + inputVatAssets
  const vatToPay = outputVat - totalInputVat

  return NextResponse.json({
    period: { from, to },
    sales_total:        r2(sales),
    output_vat:         r2(outputVat),
    purchases_goods:    r2(purchasesGoods),
    purchases_assets:   r2(purchasesAssets),
    input_vat:          r2(inputVat),
    input_vat_assets:   r2(inputVatAssets),
    total_input_vat:    r2(totalInputVat),
    vat_to_pay:         r2(vatToPay),
    note: 'הנתונים כוללים רק יומנים בסטטוס posted. לתיקונים — צור יומן התאמה.',
  })
}
