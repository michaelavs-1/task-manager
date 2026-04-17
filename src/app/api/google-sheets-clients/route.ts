import { NextResponse } from 'next/server'

const SHEET_ID = '1B031KurcxK-aeiGz8SYYDLlNCcNYvQombA9VIDhKGMo'
const GID = '584902190'

// Column indices (0-based) — "חשבוניות כללי" sheet:
// A=0 מי הוציא | B=1 מי שלח | C=2 תאריך | D=3 סוג | E=4 מס' | F=5 לקוח | G=6 לפני מע"מ | H=7 סה"כ | I=8 שולם
const COL_CLIENT = 5        // F — לקוח
const COL_TOTAL = 7         // H — סה"כ לתשלום
const COL_PAID = 8          // I — שולם

interface ClientRow {
  name: string
  invoiceCount: number
  totalAmount: number
  paidAmount: number
}

function parseAmount(val: string): number {
  if (!val) return 0
  // Remove currency symbols, commas, spaces
  const cleaned = val.replace(/[₪,\s]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
    const res = await fetch(csvUrl, { next: { revalidate: 300 } })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch sheet: ${res.status}` }, { status: 500 })
    }

    const text = await res.text()
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

    if (lines.length < 2) {
      return NextResponse.json({ clients: [], total: 0 })
    }

    // Parse CSV rows (skip header row at index 0)
    const clientMap: Record<string, ClientRow> = {}

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i])
      const clientName = cols[COL_CLIENT]?.trim()
      if (!clientName || clientName === '' || clientName === '—') continue

      if (!clientMap[clientName]) {
        clientMap[clientName] = { name: clientName, invoiceCount: 0, totalAmount: 0, paidAmount: 0 }
      }

      clientMap[clientName].invoiceCount++
      clientMap[clientName].totalAmount += parseAmount(cols[COL_TOTAL] || '')
      clientMap[clientName].paidAmount += parseAmount(cols[COL_PAID] || '')
    }

    const clients = Object.values(clientMap).sort((a, b) => b.invoiceCount - a.invoiceCount)
    return NextResponse.json({ clients, total: clients.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
