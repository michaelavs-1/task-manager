/**
 * Core accounting helpers — double-entry GL operations.
 * Used by API routes to auto-generate balanced journal entries
 * whenever source documents (invoice, expense, payment, depreciation) are created.
 */

import { createClient } from '@supabase/supabase-js'

export const supaAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
export type JELineInput = {
  account_code: string
  debit?: number
  credit?: number
  memo?: string
  project_id?: string | null
  artist_name?: string | null
  cost_center?: string | null
}

export type JEInput = {
  entry_date: string     // 'YYYY-MM-DD'
  description: string
  source_type: 'invoice' | 'expense' | 'payment' | 'invoice_payment' | 'expense_payment' |
                'payroll' | 'depreciation' | 'opening' | 'closing' | 'manual' | 'adjustment' | 'bank'
  source_id?: string | null
  reference?: string | null
  status?: 'draft' | 'posted'
  created_by?: string
  lines: JELineInput[]
}

export type JEOutput = {
  id: string
  entry_date: string
  description: string
  source_type: string
  source_id: string | null
  status: string
  lines: Array<{ id: string; account_id: string; account_code?: string; debit: number; credit: number; memo: string; project_id: string | null; artist_name: string | null }>
}

// ─────────────────────────────────────────────────────────────────
// Utility: rounding
// ─────────────────────────────────────────────────────────────────
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

// ─────────────────────────────────────────────────────────────────
// VAT rate lookup
// ─────────────────────────────────────────────────────────────────
export async function vatRateOn(date: string): Promise<number> {
  const supa = supaAdmin()
  const { data } = await supa
    .from('vat_rates')
    .select('rate, effective_from')
    .lte('effective_from', date)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.rate ?? 0.18
}

// ─────────────────────────────────────────────────────────────────
// Account lookup — cached per request
// ─────────────────────────────────────────────────────────────────
const _acctCache: Record<string, string> = {}
export async function accountIdByCode(code: string): Promise<string | null> {
  if (_acctCache[code]) return _acctCache[code]
  const supa = supaAdmin()
  const { data } = await supa.from('accounts').select('id').eq('code', code).maybeSingle()
  if (data?.id) {
    _acctCache[code] = data.id
    return data.id
  }
  return null
}

// ─────────────────────────────────────────────────────────────────
// Core: create a balanced journal entry
// Atomic-ish: insert header, insert all lines, update status to posted
// If any line fails → delete the header.
// ─────────────────────────────────────────────────────────────────
export async function createJournalEntry(input: JEInput): Promise<string> {
  const supa = supaAdmin()

  // Validate balance
  const totalDebit  = round2(input.lines.reduce((s, l) => s + (l.debit  || 0), 0))
  const totalCredit = round2(input.lines.reduce((s, l) => s + (l.credit || 0), 0))
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Unbalanced JE for "${input.description}": debit=${totalDebit}, credit=${totalCredit}`
    )
  }
  if (totalDebit === 0) {
    throw new Error(`Empty JE for "${input.description}"`)
  }

  // Resolve account_code → account_id
  const codes = Array.from(new Set(input.lines.map(l => l.account_code)))
  const { data: accts, error: acctErr } = await supa
    .from('accounts')
    .select('id, code')
    .in('code', codes)
  if (acctErr) throw acctErr
  const codeMap = new Map<string, string>()
  for (const a of accts || []) codeMap.set(a.code as string, a.id as string)
  for (const code of codes) {
    if (!codeMap.has(code)) throw new Error(`Account code not found: ${code}`)
  }

  // Insert header as draft first
  const { data: je, error: jeErr } = await supa
    .from('journal_entries')
    .insert([{
      entry_date:  input.entry_date,
      description: input.description,
      source_type: input.source_type,
      source_id:   input.source_id ?? null,
      reference:   input.reference ?? null,
      status:      'draft',
      created_by:  input.created_by ?? 'system',
    }])
    .select('id')
    .single()
  if (jeErr || !je) throw jeErr || new Error('Failed to create JE header')

  // Insert lines
  const linesPayload = input.lines.map((l, idx) => ({
    je_id:       je.id,
    account_id:  codeMap.get(l.account_code)!,
    debit:       round2(l.debit  || 0),
    credit:      round2(l.credit || 0),
    memo:        l.memo || '',
    project_id:  l.project_id ?? null,
    artist_name: l.artist_name ?? null,
    cost_center: l.cost_center ?? null,
    line_order:  idx,
  }))
  const { error: linesErr } = await supa.from('je_lines').insert(linesPayload)
  if (linesErr) {
    await supa.from('journal_entries').delete().eq('id', je.id)
    throw linesErr
  }

  // Flip to posted (trigger re-validates balance)
  const wantedStatus = input.status ?? 'posted'
  if (wantedStatus === 'posted') {
    const { error: postErr } = await supa
      .from('journal_entries')
      .update({ status: 'posted', posted_at: new Date().toISOString() })
      .eq('id', je.id)
    if (postErr) {
      await supa.from('journal_entries').delete().eq('id', je.id)
      throw postErr
    }
  }
  return je.id
}

// ─────────────────────────────────────────────────────────────────
// Reverse an existing JE (create opposite entries; mark original 'reversed')
// ─────────────────────────────────────────────────────────────────
export async function reverseJournalEntry(jeId: string, reason?: string): Promise<string> {
  const supa = supaAdmin()
  const { data: original, error } = await supa
    .from('journal_entries')
    .select('id, entry_date, description, source_type, source_id, status, je_lines(*, accounts(code))')
    .eq('id', jeId)
    .single()
  if (error || !original) throw error || new Error('JE not found')
  if (original.status !== 'posted') throw new Error(`Can only reverse a posted JE (status=${original.status})`)

  const lines: JELineInput[] = (original.je_lines as unknown as Array<{ debit: number; credit: number; memo: string; project_id: string | null; artist_name: string | null; accounts: { code: string } | null }>).map(l => ({
    account_code: (l.accounts?.code) || '9999',
    debit:  l.credit,     // swap
    credit: l.debit,
    memo:   `REVERSE: ${l.memo}`,
    project_id:  l.project_id,
    artist_name: l.artist_name,
  }))

  const reverseId = await createJournalEntry({
    entry_date:  new Date().toISOString().slice(0, 10),
    description: `ביטול: ${original.description}${reason ? ` (${reason})` : ''}`,
    source_type: 'adjustment',
    source_id:   jeId,
    reference:   `REV-${jeId.slice(0, 8)}`,
    lines,
  })

  await supa
    .from('journal_entries')
    .update({ status: 'reversed', reversed_by: reverseId })
    .eq('id', jeId)

  return reverseId
}

// ─────────────────────────────────────────────────────────────────
// Map free-text expense description to an expense GL account code
// ─────────────────────────────────────────────────────────────────
const EXPENSE_KEYWORDS: Array<[RegExp, string]> = [
  [/דלק|סונול|פז/i,                  '6610'],
  [/רכב|חניה|כביש|ביטוח רכב/i,        '6620'],
  [/טיסה|מלון|airbnb|נסיע/i,         '6600'],
  [/פרסום|פייסבוק|גוגל|אינסטגרם|tiktok|facebook|google/i, '6510'],
  [/ייעוץ|ייעץ|יועץ/i,                '6320'],
  [/רו"ח|רו״ח|רואה חשבון|הנה״ח|הנהלת חשבונות/i, '6300'],
  [/עו"ד|עו״ד|עורך דין/i,             '6310'],
  [/שכ[״"]?ד|שכר דירה|השכרה|שכירות/i,  '6200'],
  [/ארנונה/i,                         '6210'],
  [/חשמל/i,                           '6220'],
  [/מים\b/i,                          '6230'],
  [/ניקיון/i,                         '6240'],
  [/אינטרנט|bezeq|בזק|hot|סלקום|פרטנר|תקשורת/i, '6700'],
  [/תוכנה|saas|שרת|אחסון|cloud|AWS|google|supabase|vercel|dropbox|adobe/i, '6720'],
  [/ביטוח(?! לאומי)(?! רכב)/i,         '6800'],
  [/עמלת|בנק/i,                       '7110'],
  [/שכר|משכורת|בונוס/i,                '6000'],
  [/הפקה|ייצור|צילום|סאונד|אולפן/i,    '6530'],
  [/אירוע|הופעה|מפיק/i,               '6530'],
  [/משרד|כתיבה|נייר/i,                '6400'],
  [/דפוס|הדפסה/i,                     '6410'],
]

export function mapExpenseToAccount(description: string): string {
  const desc = (description || '').toString()
  for (const [re, code] of EXPENSE_KEYWORDS) {
    if (re.test(desc)) return code
  }
  return '6990' // default: "הוצאות אחרות"
}

// ─────────────────────────────────────────────────────────────────
// Israeli-date helpers (DD.MM.YYYY ↔ YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────
export function ilToIso(s: string): string {
  if (!s) return new Date().toISOString().slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/)
  if (!m) return new Date().toISOString().slice(0, 10)
  const [, d, mo, y] = m
  const year = y.length === 2 ? `20${y}` : y
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

export function isoToIl(s: string): string {
  if (!s) return ''
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return s
  return `${m[3]}.${m[2]}.${m[1]}`
}

// ─────────────────────────────────────────────────────────────────
// JE builders for common business events
// ─────────────────────────────────────────────────────────────────

/**
 * Invoice issued: AR ↑, Revenue ↑, VAT Payable ↑
 */
export async function bookInvoiceIssued(inv: {
  id: string | number
  date: string
  client: string
  client_tax_id?: string
  before_vat: number
  total: number
  invoice_num: string
  project_id?: string | null
}): Promise<string> {
  const vat = round2(inv.total - inv.before_vat)
  const lines: JELineInput[] = [
    { account_code: '1150', debit:  round2(inv.total),      memo: inv.client, project_id: inv.project_id ?? undefined },
    { account_code: '4000', credit: round2(inv.before_vat), memo: `חשבונית ${inv.invoice_num}`, project_id: inv.project_id ?? undefined },
  ]
  if (vat > 0.005) {
    lines.push({ account_code: '2310', credit: vat, memo: `מע"מ חשבונית ${inv.invoice_num}` })
  }
  return createJournalEntry({
    entry_date:  ilToIso(inv.date),
    description: `חשבונית ${inv.invoice_num} — ${inv.client}`,
    source_type: 'invoice',
    source_id:   String(inv.id),
    reference:   inv.invoice_num,
    lines,
  })
}

/**
 * Invoice payment received (possibly net of withholding tax): Bank ↑, WHT-receivable ↑, AR ↓
 */
export async function bookInvoicePayment(inv: {
  id: string | number
  total: number
  paid: number
  tax_withheld: number
  payment_date?: string
  client: string
  invoice_num: string
  project_id?: string | null
}): Promise<string> {
  const paid = round2(inv.paid)
  const wht  = round2(inv.tax_withheld || 0)
  const ar   = round2(paid + wht)

  const lines: JELineInput[] = [
    { account_code: '1010', debit: paid, memo: `תקבול ${inv.invoice_num}` },
  ]
  if (wht > 0.005) {
    lines.push({ account_code: '2550', debit: wht, memo: `מס מקור שנוכה לנו — ${inv.client}` })
  }
  lines.push({ account_code: '1150', credit: ar, memo: inv.client, project_id: inv.project_id ?? undefined })

  return createJournalEntry({
    entry_date:  ilToIso(inv.payment_date || new Date().toISOString().slice(0, 10)),
    description: `תקבול חשבונית ${inv.invoice_num} — ${inv.client}`,
    source_type: 'invoice_payment',
    source_id:   String(inv.id),
    reference:   inv.invoice_num,
    lines,
  })
}

/**
 * Expense booked: Expense ↑, VAT input ↑, AP ↑
 */
export async function bookExpenseIncurred(exp: {
  id: string | number
  supplier: string
  description: string
  amount: number      // before VAT
  vat: number
  total: number
  month: string
  project_id?: string | null
  account_code?: string | null
}): Promise<string> {
  const code = exp.account_code || mapExpenseToAccount(exp.description || exp.supplier)
  const month = (exp.month || '').match(/^(\d{4})-(\d{2})/)
  const date = month ? `${month[1]}-${month[2]}-15` : new Date().toISOString().slice(0, 10)

  const lines: JELineInput[] = [
    { account_code: code, debit: round2(exp.amount), memo: `${exp.supplier} — ${exp.description}`, project_id: exp.project_id ?? undefined },
  ]
  if (exp.vat && Math.abs(exp.vat) > 0.005) {
    lines.push({ account_code: '2320', debit: round2(exp.vat), memo: `מע"מ תשומות — ${exp.supplier}` })
  }
  lines.push({ account_code: '2000', credit: round2(exp.total), memo: exp.supplier })

  return createJournalEntry({
    entry_date:  date,
    description: `הוצאה — ${exp.supplier}${exp.description ? ` — ${exp.description}` : ''}`,
    source_type: 'expense',
    source_id:   String(exp.id),
    lines,
  })
}

/**
 * Expense payment: AP ↓, Bank ↓
 */
export async function bookExpensePayment(exp: {
  id: string | number
  supplier: string
  paid: number
  payment_date?: string
  description?: string
}): Promise<string> {
  const paid = round2(exp.paid)
  if (paid < 0.01) throw new Error('Payment must be positive')
  return createJournalEntry({
    entry_date:  ilToIso(exp.payment_date || new Date().toISOString().slice(0, 10)),
    description: `תשלום לספק — ${exp.supplier}${exp.description ? ` — ${exp.description}` : ''}`,
    source_type: 'expense_payment',
    source_id:   String(exp.id),
    lines: [
      { account_code: '2000', debit:  paid, memo: exp.supplier },
      { account_code: '1010', credit: paid, memo: `תשלום לספק ${exp.supplier}` },
    ],
  })
}

/**
 * Depreciation — monthly straight-line
 */
export async function bookDepreciation(fa: {
  id: string
  description: string
  acquisition_cost: number
  salvage_value: number
  useful_life_months: number
  account_depexp_code: string
  account_accdep_code: string
  as_of: string   // YYYY-MM-DD
}): Promise<string> {
  const monthlyDep = round2(
    Math.max(0, (fa.acquisition_cost - fa.salvage_value) / fa.useful_life_months)
  )
  if (monthlyDep < 0.01) throw new Error('Depreciation is zero')
  return createJournalEntry({
    entry_date:  fa.as_of,
    description: `פחת חודשי — ${fa.description}`,
    source_type: 'depreciation',
    source_id:   fa.id,
    lines: [
      { account_code: fa.account_depexp_code, debit:  monthlyDep, memo: fa.description },
      { account_code: fa.account_accdep_code, credit: monthlyDep, memo: fa.description },
    ],
  })
}

// ─────────────────────────────────────────────────────────────────
// Unbook (delete the JE when source doc is deleted)
// ─────────────────────────────────────────────────────────────────
export async function unbookBySource(sourceType: string, sourceId: string): Promise<void> {
  const supa = supaAdmin()
  const { data: jes } = await supa
    .from('journal_entries')
    .select('id, status')
    .eq('source_type', sourceType)
    .eq('source_id', String(sourceId))
  for (const je of jes || []) {
    if (je.status === 'posted') {
      try { await reverseJournalEntry(je.id, 'מקור נמחק') } catch { /* ignore */ }
    } else {
      await supa.from('journal_entries').delete().eq('id', je.id)
    }
  }
}
