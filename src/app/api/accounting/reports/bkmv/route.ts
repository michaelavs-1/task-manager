import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

/**
 * BKMV — קובץ ביקורת רשות המיסים (סעיף 36 לתקנות מס הכנסה).
 * פורמט: INI.TXT + BKMVDATA.TXT.
 * מייצא רשומות A100 (כותרת עסק), B100 (תנועות), C100 (חשבוניות), D100 (תקבולים), Z100 (סיכום).
 * שדות באורך קבוע — ברירת מחדל: encoding UTF-8, RTL.
 * GET /api/accounting/reports/bkmv?year=2026&vat_id=<ח.פ.>&format=text
 */
export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())
  const vatId = (searchParams.get('vat_id') || '000000000').replace(/\D/g, '').padStart(9, '0').slice(0, 9)
  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const pad = (s: string | number, n: number, c = ' ', right = true) => {
    const v = String(s ?? '')
    if (v.length >= n) return v.slice(0, n)
    return right ? v.padEnd(n, c) : v.padStart(n, c)
  }
  const digits = (s: string | number, n: number) =>
    String(s ?? '').replace(/\D/g, '').padStart(n, '0').slice(-n)
  const amt = (n: number, len = 15) => {
    const v = Math.round((Number(n) || 0) * 100) // agorot
    const sign = v < 0 ? '-' : ''
    return sign + pad(String(Math.abs(v)), len - sign.length, '0', false)
  }
  const ilDate = (d: string) => (d || '').replace(/\D/g, '').padStart(8, '0').slice(0, 8)

  // Fetch data
  const [{ data: invs }, { data: exps }, { data: jes }] = await Promise.all([
    supa.from('invoices').select('id, invoice_num, date, client, client_tax_id, before_vat, total, paid, tax_withheld, payment_date')
        .gte('date', from).lte('date', to).order('date'),
    supa.from('expenses').select('id, supplier, supplier_tax_id, description, month, amount, vat, total, paid')
        .gte('month', from.slice(0, 7)).lte('month', to.slice(0, 7)).order('month'),
    supa.from('journal_entries').select('id, entry_date, description, source_type, source_id, reference, je_lines(debit, credit, accounts(code, name_he))')
        .eq('status', 'posted').gte('entry_date', from).lte('entry_date', to).order('entry_date'),
  ])

  const records: string[] = []
  let seq = 0
  const nextSeq = () => { seq++; return digits(String(seq), 9) }

  // A100 — header
  records.push([
    'A100',
    nextSeq(),
    digits(vatId, 9),
    ilDate(`${year}-12-31`),
    pad('Task-Manager', 50, ' ', true),
    '2.00',                  // version
    pad('', 40, ' ', true),  // software name
  ].join(''))

  // C100 — invoices (docs)
  for (const inv of invs || []) {
    records.push([
      'C100',
      nextSeq(),
      digits(vatId, 9),
      '320',  // doc type: חשבונית מס
      pad(String(inv.invoice_num || inv.id), 20, ' ', true),
      ilDate(String(inv.date)),
      digits(String(inv.client_tax_id || '0'), 9),
      pad(String(inv.client || ''), 50, ' ', true),
      amt(Number(inv.before_vat) || 0),
      amt(Number(inv.total) - Number(inv.before_vat) || 0),
      amt(Number(inv.total) || 0),
    ].join(''))
  }

  // D100 — cash receipts for invoices with paid>0
  for (const inv of invs || []) {
    const paid = Number(inv.paid) || 0
    if (paid <= 0) continue
    records.push([
      'D100',
      nextSeq(),
      digits(vatId, 9),
      pad(String(inv.invoice_num || inv.id), 20, ' ', true),
      ilDate(String(inv.payment_date || inv.date)),
      amt(paid),
      amt(Number(inv.tax_withheld) || 0),
    ].join(''))
  }

  // B100 — GL lines
  type JE = { id: string; entry_date: string; description: string; source_type: string; source_id: string | null; reference: string | null; je_lines: Array<{ debit: number; credit: number; accounts: { code: string; name_he: string } | null }> }
  for (const je of (jes || []) as unknown as JE[]) {
    for (const l of je.je_lines || []) {
      const d = Number(l.debit) || 0
      const c = Number(l.credit) || 0
      if (d === 0 && c === 0) continue
      records.push([
        'B100',
        nextSeq(),
        digits(vatId, 9),
        ilDate(je.entry_date),
        pad(String(je.reference || je.id.slice(0, 10)), 20, ' ', true),
        pad(String(l.accounts?.code || ''), 15, ' ', true),
        pad(String(l.accounts?.name_he || ''), 50, ' ', true),
        amt(d),
        amt(c),
        pad(String(je.description).slice(0, 50), 50, ' ', true),
      ].join(''))
    }
  }

  // Z100 — trailer
  records.push([
    'Z100',
    nextSeq(),
    digits(vatId, 9),
    pad(String(seq), 12, '0', false),  // total records above
  ].join(''))

  const bkmvText = records.join('\r\n') + '\r\n'
  const iniText = [
    'A000' + digits(vatId, 9) + pad(String(year), 4, '0', false) + pad('001', 10, '0', false),
    'Z900' + digits(vatId, 9) + pad(String(records.length), 10, '0', false),
  ].join('\r\n') + '\r\n'

  const format = searchParams.get('format') || 'text'
  if (format === 'json') {
    return NextResponse.json({
      year, vat_id: vatId,
      record_count: records.length,
      ini: iniText,
      data: bkmvText,
    })
  }
  // Default: return BKMVDATA.TXT
  const fileKind = searchParams.get('file') || 'data'
  const payload = fileKind === 'ini' ? iniText : bkmvText
  const fname = fileKind === 'ini' ? 'INI.TXT' : 'BKMVDATA.TXT'
  return new Response(payload, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fname}"`,
    },
  })
}
