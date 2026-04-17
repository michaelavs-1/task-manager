import { NextResponse } from 'next/server'

const SHEET_ID = '1B031KurcxK-aeiGz8SYYDLlNCcNYvQombA9VIDhKGMo'
const GID = '584902190'

// Column indices (0-based) from "חשבוניות כללי" sheet:
// A=0 מי הוציא | B=1 מי שלח ללקוח | C=2 תאריך חשבונית | D=3 סוג מסמך
// E=4 מס' | F=5 לקוח | G=6 לפני מע"מ | H=7 סה"כ לתשלום | I=8 שולם

export interface InvoiceRow {
  rowIndex: number
  issuedBy: string
  sentTo: string
  date: string
  docType: string
  invoiceNum: string
  client: string
  beforeVat: number
  total: number
  paid: number
  remaining: number
  status: 'paid' | 'partial' | 'unpaid'
}

function parseAmount(val: string): number {
  if (!val) return 0
  const cleaned = val.replace(/[₪,\s]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
    const res = await fetch(csvUrl, { next: { revalidate: 60 } })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: ${res.status}` }, { status: 500 })
    }

    const text = await res.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    if (lines.length < 2) {
      return NextResponse.json({ invoices: [], total: 0 })
    }

    const invoices: InvoiceRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      // Skip empty rows
      const client = cols[5]?.trim() || ''
      const invoiceNum = cols[4]?.trim() || ''
      if (!client && !invoiceNum) continue

      const total = parseAmount(cols[7] || '')
      const paid = parseAmount(cols[8] || '')
      const remaining = Math.max(0, total - paid)

      let status: InvoiceRow['status'] = 'unpaid'
      if (total > 0 && paid >= total) status = 'paid'
      else if (paid > 0) status = 'partial'

      invoices.push({
        rowIndex: i,
        issuedBy: cols[0]?.trim() || '',
        sentTo: cols[1]?.trim() || '',
        date: cols[2]?.trim() || '',
        docType: cols[3]?.trim() || '',
        invoiceNum,
        client,
        beforeVat: parseAmount(cols[6] || ''),
        total,
        paid,
        remaining,
        status,
      })
    }

    return NextResponse.json({ invoices, total: invoices.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
