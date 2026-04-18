import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Mar 26' — 16 columns, notes at r[14] (new מאזן בוחן col at r[13])
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTbSGGOVXESrSzFqHyFXdGNbpW_s7O6AVR8JF8MLzSXsLpJ5XCv3syW038Vp0pIapEWfYJ35hDXH_GJ/pub?gid=1486977680&single=true&output=csv'

const MONTH = '2026-03'
const YEAR_SHORT = '26'
const NOTES_COL = 14

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
  'YUZ': 'a86ce097-c757-4b46-90cc-9095039d5889',
}

const SUBSECTION_HEADERS = new Set<string>([
  'הוצאות קבועות',
  'הוצאות משתנות',
])

function mapVatStatus(raw: string): string {
  const v = (raw || '').trim()
  if (v === 'מורשה') return 'taxable'
  if (v === 'פטור') return 'exempt'
  if (v === 'עמותה') return 'nonprofit'
  if (v === 'לא עוסק') return 'nonprofit'
  return 'taxable'
}

function parseAmount(raw: string): number {
  if (!raw) return 0
  const cleaned = raw
    .replace(/[₪$,\s"]/g, '')
    .replace(/[^\d.\-]/g, '')
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

type PreparedExpense = {
  project_id: string | null
  supplier: string
  description: string
  vat_status: string
  amount: number
  vat: number
  total: number
  paid: number
  payment_date: string
  has_invoice: boolean
  month: string
  notes: string
}

async function prepareExpenses() {
  const res = await fetch(CSV_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error('CSV fetch failed: ' + res.status)
  const csv = await res.text()
  const rows = parseCSV(csv)

  const prepared: PreparedExpense[] = []
  const skipped: { row: number; reason: string; raw: string[] }[] = []
  let currentProject: string | null = null

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const first = (r[0] || '').trim()
    const second = (r[1] || '').trim()
    const rest = r.slice(2)
    const restAllEmpty = rest.every(c => !(c || '').trim())

    if (!r.some(c => (c || '').trim())) continue

    if (first === 'קיים ספק במערכת?') continue
    // Skip the preamble link row: "קישור ל..."
    if (first.startsWith('קישור') && restAllEmpty && !second) continue

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

    if (first === 'סה״כ' || first === 'סה"כ' || (r[3] || '').includes('סה״כ') || (r[3] || '').includes('סה"כ')) continue
    if (!first && !second && !(r[2] || '').trim() && !(r[3] || '').trim() && (r[4] || '').includes('₪')) continue

    const supplier = second
    const description = (r[2] || '').trim()
    const vatStatusRaw = (r[3] || '').trim()
    const amount = parseAmount(r[4] || '')
    const vat = parseAmount(r[5] || '')
    const total = parseAmount(r[6] || '')
    const paid = parseAmount(r[8] || '')
    const paymentDateRaw = (r[10] || '').trim()
    const hasInvoiceRaw = (r[11] || '').trim().toUpperCase()
    const uploadedRaw = (r[12] || '').trim().toUpperCase()
    const noteA = (r[NOTES_COL] || '').trim()

    if (!supplier && !description && total === 0 && amount === 0) {
      skipped.push({ row: i, reason: 'empty', raw: r })
      continue
    }

    const noteParts: string[] = []
    if (uploadedRaw === 'FALSE') noteParts.push('טרם הועלה לסאמיט')
    if (noteA) noteParts.push(noteA)

    prepared.push({
      project_id: currentProject,
      supplier,
      description,
      vat_status: mapVatStatus(vatStatusRaw),
      amount,
      vat,
      total,
      paid,
      payment_date: parseDate(paymentDateRaw),
      has_invoice: hasInvoiceRaw === 'TRUE',
      month: MONTH,
      notes: noteParts.join(' · '),
    })
  }

  return { prepared, skipped }
}

export async function GET() {
  try {
    const { prepared, skipped } = await prepareExpenses()
    const existing = await supabase.from('expenses').select('id').eq('month', MONTH)
    return NextResponse.json({
      month: MONTH,
      existing_in_db: existing.data?.length || 0,
      would_insert: prepared.length,
      skipped: skipped.length,
      sample: prepared.slice(0, 10),
      all: prepared,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const force = url.searchParams.get('force') === '1'

    const existing = await supabase.from('expenses').select('id').eq('month', MONTH)
    const existingCount = existing.data?.length || 0
    if (existingCount > 0 && !force) {
      return NextResponse.json({
        aborted: true,
        reason: `month ${MONTH} already has ${existingCount} expenses; pass ?force=1 to import anyway`,
      }, { status: 409 })
    }

    const { prepared, skipped } = await prepareExpenses()
    if (prepared.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: skipped.length, error: 'no rows parsed' })
    }

    const { data, error } = await supabase.from('expenses').insert(prepared).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      month: MONTH,
      inserted: data?.length || 0,
      skipped: skipped.length,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
