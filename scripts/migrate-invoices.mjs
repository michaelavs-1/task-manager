/**
 * One-time migration: Google Sheets → Supabase invoices table
 * Run ONCE from ~/task-manager:
 *   node scripts/migrate-invoices.mjs
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

// ── Load env from .env.local ──────────────────────────────────────────────────
function loadEnv() {
  try {
    const raw = readFileSync('.env.local', 'utf8')
    const env = {}
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      env[key] = val
    }
    return env
  } catch {
    console.error('Could not read .env.local — make sure you run from ~/task-manager')
    process.exit(1)
  }
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else current += ch
  }
  result.push(current)
  return result
}

function parseAmount(val = '') {
  const n = parseFloat(val.replace(/[₪,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

// ── Main ──────────────────────────────────────────────────────────────────────
const SHEET_ID = '1B031KurcxK-aeiGz8SYYDLlNCcNYvQombA9VIDhKGMo'
const GID      = '584902190'

async function main() {
  const env = loadEnv()
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  console.log('Fetching Google Sheets CSV...')
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
  )
  if (!res.ok) {
    console.error('Failed to fetch sheet:', res.status)
    process.exit(1)
  }

  const text = await res.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  console.log(`Sheet has ${lines.length - 1} data rows (excluding header)`)

  const invoices = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    const client     = cols[5]?.trim() || ''
    const invoiceNum = cols[4]?.trim() || ''
    if (!client && !invoiceNum) continue   // skip blank rows

    invoices.push({
      issued_by:   cols[0]?.trim() || '',
      sent_to:     cols[1]?.trim() || '',
      date:        cols[2]?.trim() || '',
      doc_type:    cols[3]?.trim() || '',
      invoice_num: invoiceNum,
      client,
      before_vat:  parseAmount(cols[6]),
      total:       parseAmount(cols[7]),
      paid:        parseAmount(cols[8]),
      notes:       '',
    })
  }

  console.log(`Parsed ${invoices.length} valid invoices. Inserting into Supabase...`)

  // Insert in batches of 50 to avoid request size limits
  const BATCH = 50
  let inserted = 0
  for (let i = 0; i < invoices.length; i += BATCH) {
    const batch = invoices.slice(i, i + BATCH)
    const { error } = await supabase.from('invoices').insert(batch)
    if (error) {
      console.error(`Batch ${i}–${i + BATCH} failed:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`  ${inserted}/${invoices.length} inserted`)
  }

  console.log('\n✓ Migration complete! All invoices are now in Supabase.')
  console.log('You can verify in: Supabase Dashboard → Table Editor → invoices')
}

main().catch(err => { console.error(err); process.exit(1) })
