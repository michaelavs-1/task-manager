import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTbSGGOVXESrSzFqHyFXdGNbpW_s7O6AVR8JF8MLzSXsLpJ5XCv3syW038Vp0pIapEWfYJ35hDXH_GJ/pub?gid=642807336&single=true&output=csv'

const MONTH = '2025-11'
const YEAR_SHORT = '25'

const SECTION_TO_PROJECT: Record<string, string> = {
  'אקו': '992799f7-990a-405a-90a2-5e281a99e805',
  'ג׳ימבו': 'c0eb746a-8d58-4e3e-b28f-06a2eed16704',
  "ג'ימבו": 'c0eb746a-8d58-4e3e-b28f-06a2eed16704',
  'שיווק': '25da510b-b033-443d-aaf8-8e0618a7c554',
  'הפקות': 'fa154ee8-fe24-4627-a731-3cfc0fc0bd58',
  'הנהלה והוצאות כלליות': '7de3ce88-3c5d-4939-bad6-6a0fd0af8945',
  'מאור אשכנזי': 'ff494596-4f01-450f-a1aa-52bcd76072e7',
  'אלי לוזון': '096d4af8-06bb-45fa-9d5d-769df3290d00',
  'אומנים כללי': '292adb0e-8ed8-4632-a63a-13c60f77ee36',
}

const SUBSECTION_HEADERS = new Set<string>(['הוצאות קבועות', 'הוצאות משתנות'])

function parseAmount(raw: string): number {
  if (!raw) return 0
  const cleaned = raw.replace(/[₪$,\s"]/g, '').replace(/[^\d.\-]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseDate(raw: string): string {
  const t = (raw || '').trim()
  if (!t) return ''
  const m = t.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?$/)
  if (!m) return ''
  const d = m[1].padStart(2, '0')
  const mo = m[2].padStart(2, '0')
  const yr = m[3] ? (m[3].length === 4 ? m[3].slice(-2) : m[3]) : YEAR_SHORT
  return `${d}.${mo}.${yr}`
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let i = 0
  const n = text.length
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  while (i < n) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue }
      if (c === '"') { inQuotes = false; i++; continue }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { cur.push(field); field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; i++; continue }
    field += c; i++
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur) }
  return rows
}

type CsvRow = {
  project_id: string | null
  supplier: string
  description: string
  total: number
  payment_date: string
}

async function parseCsvRows(): Promise<CsvRow[]> {
  const res = await fetch(CSV_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error('CSV fetch failed: ' + res.status)
  const csv = await res.text()
  const rows = parseCSV(csv)

  const out: CsvRow[] = []
  let currentProject: string | null = null

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const first = (r[0] || '').trim()
    const second = (r[1] || '').trim()
    const rest = r.slice(2)
    const restAllEmpty = rest.every(c => !(c || '').trim())

    if (!r.some(c => (c || '').trim())) continue

    // Section header
    if (first && restAllEmpty && !second) {
      if (SUBSECTION_HEADERS.has(first)) continue
      currentProject = SECTION_TO_PROJECT[first] || null
      if (!currentProject) {
        for (const k of Object.keys(SECTION_TO_PROJECT)) {
          if (first.includes(k) || k.includes(first)) { currentProject = SECTION_TO_PROJECT[k]; break }
        }
      }
      continue
    }

    // Totals row
    if (first === 'סה״כ' || first === 'סה"כ' || (r[3] || '').includes('סה״כ') || (r[3] || '').includes('סה"כ')) continue
    if (!first && !second && !(r[2] || '').trim() && !(r[3] || '').trim() && (r[4] || '').includes('₪')) continue

    const supplier = second
    const description = (r[2] || '').trim()
    const total = parseAmount(r[6] || '')
    // Nov 25 has payment_date at column index 9
    const paymentDateRaw = (r[9] || '').trim()

    if (!supplier && !description && total === 0) continue

    out.push({
      project_id: currentProject,
      supplier,
      description,
      total,
      payment_date: parseDate(paymentDateRaw),
    })
  }
  return out
}

type Expense = {
  id: number
  project_id: string | null
  supplier: string
  description: string
  total: number
  payment_date: string
  month: string
}

function norm(s: string): string {
  return (s || '').trim().toLowerCase()
}

function findMatch(csv: CsvRow, pool: Expense[]): Expense | null {
  // 1. Exact match on (project_id, description, total)
  const byProjDescTotal = pool.filter(e =>
    e.project_id === csv.project_id &&
    norm(e.description) === norm(csv.description) &&
    Math.abs((e.total || 0) - csv.total) < 0.5
  )
  if (byProjDescTotal.length === 1) return byProjDescTotal[0]

  // 2. If ambiguous, disambiguate by supplier substring
  if (byProjDescTotal.length > 1) {
    const withSupplier = byProjDescTotal.filter(e =>
      norm(e.supplier).includes(norm(csv.supplier)) ||
      norm(csv.supplier).includes(norm(e.supplier)) ||
      norm(e.description).includes(norm(csv.supplier))
    )
    if (withSupplier.length >= 1) return withSupplier[0]
    return byProjDescTotal[0] // first pick
  }

  // 3. Fallback: match by (project_id, total) + supplier fuzzy
  const byProjTotal = pool.filter(e =>
    e.project_id === csv.project_id &&
    Math.abs((e.total || 0) - csv.total) < 0.5 &&
    (norm(e.supplier).includes(norm(csv.supplier)) ||
     norm(csv.supplier).includes(norm(e.supplier)) ||
     (csv.supplier && norm(e.description).includes(norm(csv.supplier))) ||
     (e.supplier && norm(csv.description).includes(norm(e.supplier))))
  )
  if (byProjTotal.length >= 1) return byProjTotal[0]

  // 4. Last resort: match by (description, total) ignoring project
  const byDescTotal = pool.filter(e =>
    norm(e.description) === norm(csv.description) &&
    Math.abs((e.total || 0) - csv.total) < 0.5
  )
  if (byDescTotal.length === 1) return byDescTotal[0]

  return null
}

async function buildPlan() {
  const csvRows = await parseCsvRows()
  const { data: dbRows, error } = await supabase
    .from('expenses')
    .select('id, project_id, supplier, description, total, payment_date, month')
    .eq('month', MONTH)

  if (error) throw new Error(error.message)

  const pool: Expense[] = dbRows || []
  const used = new Set<number>()

  const plan: Array<{
    csv: CsvRow
    matched: Expense | null
    newDate: string
    willChange: boolean
  }> = []

  for (const csv of csvRows) {
    const remaining = pool.filter(e => !used.has(e.id))
    const m = findMatch(csv, remaining)
    if (m) used.add(m.id)
    plan.push({
      csv,
      matched: m,
      newDate: csv.payment_date,
      willChange: Boolean(m) && m!.payment_date !== csv.payment_date,
    })
  }

  return { plan, pool, csvRows }
}

export async function GET() {
  try {
    const { plan, pool } = await buildPlan()
    const unmatched = plan.filter(p => !p.matched)
    const toUpdate = plan.filter(p => p.willChange)
    const unchanged = plan.filter(p => p.matched && !p.willChange)
    const unusedDb = pool.filter(e => !plan.some(p => p.matched?.id === e.id))

    return NextResponse.json({
      month: MONTH,
      csv_rows: plan.length,
      db_rows: pool.length,
      would_update: toUpdate.length,
      unchanged: unchanged.length,
      unmatched_in_csv: unmatched.length,
      unused_in_db: unusedDb.length,
      sample_updates: toUpdate.slice(0, 10).map(p => ({
        id: p.matched!.id,
        supplier: p.matched!.supplier,
        description: p.matched!.description,
        total: p.matched!.total,
        old_date: p.matched!.payment_date,
        new_date: p.newDate,
      })),
      unmatched: unmatched.slice(0, 20).map(p => p.csv),
      unused: unusedDb.slice(0, 20).map(e => ({
        id: e.id, supplier: e.supplier, description: e.description, total: e.total, payment_date: e.payment_date,
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST() {
  try {
    const { plan } = await buildPlan()
    const toUpdate = plan.filter(p => p.willChange && p.matched)

    let ok = 0
    const errors: unknown[] = []
    for (const p of toUpdate) {
      const { error } = await supabase
        .from('expenses')
        .update({ payment_date: p.newDate })
        .eq('id', p.matched!.id)
      if (error) errors.push({ id: p.matched!.id, err: error.message })
      else ok++
    }

    return NextResponse.json({
      month: MONTH,
      attempted: toUpdate.length,
      updated: ok,
      errors: errors.length,
      error_details: errors.slice(0, 10),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
