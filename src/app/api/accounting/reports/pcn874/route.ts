import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * PCN874 — קובץ מע"מ מפורט חודשי.
 * פורמט: שורת כותרת (A) + שורות עסקה (S עסקאות, L תשומות) + שורת סיכום (M).
 * מחזיר טקסט ASCII באורך שורה קבוע (תואם מבנה רשות המיסים).
 * GET /api/accounting/reports/pcn874?year=2026&month=4&vat_id=<ח.פ.>
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year  = Number(searchParams.get('year')  || now.getFullYear())
  const month = Number(searchParams.get('month') || (now.getMonth() + 1))
  const vatId = (searchParams.get('vat_id') || '000000000').replace(/\D/g, '').padStart(9, '0').slice(0, 9)

  const mm = String(month).padStart(2, '0')
  const from = `${year}-${mm}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`

  // Invoices in period
  const { data: invs } = await supa
    .from('invoices')
    .select('id, invoice_num, date, client, client_tax_id, before_vat, total')
    .gte('date', from)
    .lte('date', to)
    .order('date')

  // Expenses in period
  const { data: exps } = await supa
    .from('expenses')
    .select('id, supplier, supplier_tax_id, month, amount, vat, total')
    .gte('month', from.slice(0, 7))
    .lte('month', to.slice(0, 7))
    .order('month')

  // Build fixed-width records (simplified spec — matches common open-source converters)
  const pad = (s: string | number, n: number, c = ' ', right = true) => {
    const v = String(s ?? '')
    if (v.length >= n) return v.slice(0, n)
    return right ? v.padEnd(n, c) : v.padStart(n, c)
  }
  const digits = (s: string, n: number) => (String(s ?? '').replace(/\D/g, '').padStart(n, '0').slice(-n))

  const ilDate = (d: string) => (d || '').replace(/\D/g, '').padStart(8, '0').slice(0, 8)

  const header = [
    'A010',                          // record type
    digits(vatId, 9),                // VAT ID
    digits(String(year) + mm, 6),    // period YYYYMM
    pad('001', 15, '0', false),      // serial
  ].join('')

  const salesLines: string[] = []
  let totalSalesVat = 0
  let totalSalesAmt = 0
  for (const inv of invs || []) {
    const base = Math.round(Number(inv.before_vat) || 0)
    const vat  = Math.round((Number(inv.total) || 0) - base)
    totalSalesAmt += base
    totalSalesVat += vat
    salesLines.push([
      'S200',
      digits(String(inv.client_tax_id || '0'), 9),
      ilDate(String(inv.date)),
      pad(String(inv.invoice_num || inv.id), 20, ' ', true),
      pad(String(base), 11, '0', false),
      pad(String(vat), 9, '0', false),
    ].join(''))
  }

  const purchLines: string[] = []
  let totalPurchVat = 0
  let totalPurchAmt = 0
  for (const e of exps || []) {
    const base = Math.round(Number(e.amount) || 0)
    const vat  = Math.round(Number(e.vat) || 0)
    totalPurchAmt += base
    totalPurchVat += vat
    const ref = String(e.id).slice(0, 20)
    const mStr = String(e.month || `${year}-${mm}`).replace(/-/g, '').padStart(8, '0').slice(0, 8) + '15'
    purchLines.push([
      'L100',
      digits(String(e.supplier_tax_id || '0'), 9),
      mStr.slice(0, 8),
      pad(ref, 20, ' ', true),
      pad(String(base), 11, '0', false),
      pad(String(vat), 9, '0', false),
    ].join(''))
  }

  const trailer = [
    'M100',
    pad(String(totalSalesAmt), 15, '0', false),
    pad(String(totalSalesVat), 15, '0', false),
    pad(String(totalPurchAmt), 15, '0', false),
    pad(String(totalPurchVat), 15, '0', false),
    pad(String((salesLines.length + purchLines.length + 2)), 9, '0', false), // total records
  ].join('')

  const text = [header, ...salesLines, ...purchLines, trailer].join('\r\n') + '\r\n'

  const format = searchParams.get('format') || 'text'
  if (format === 'json') {
    return NextResponse.json({
      period: { year, month, from, to },
      vat_id: vatId,
      totals: {
        sales_amount: totalSalesAmt,
        sales_vat:    totalSalesVat,
        purch_amount: totalPurchAmt,
        purch_vat:    totalPurchVat,
      },
      sales_count:     salesLines.length,
      purchases_count: purchLines.length,
      text,
    })
  }
  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="PCN874_${vatId}_${year}${mm}.txt"`,
    },
  })
}
