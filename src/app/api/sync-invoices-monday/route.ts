import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BOARD_ID = '5093863315'
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN

const COL = {
  invoice_num:    'text_mm22ww7s',
  date:           'date_mm22tb94',
  before_vat:     'numeric_mm22f70e',
  total:          'numeric_mm228jfv',
  paid:           'numeric_mm226xtx',
  notes:          'text_mm222aa2',   // the visible "הערות" column in Monday
  payment_date:   'date_mm22jbh4',
  tax_withheld:   'numeric_mm22z4v4',
  receipt:        'text_mm22wrms',
  doc_type:       'color_mm22t98t',
  project:        'dropdown_mm22thq0',  // actual "שיוך לפרויקט" dropdown column
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function isoDate(d: string | null): string | null {
  if (!d) return null
  // already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10)
  // Israeli dd.mm.yy or dd.mm.yyyy
  const parts = d.split('.')
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
    return `${year}-${month}-${day}`
  }
  if (parts.length === 2) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    return `2026-${month}-${day}`
  }
  return null
}

function buildColumnValues(inv: Record<string, unknown>, projectName?: string): string {
  const cv: Record<string, unknown> = {}

  if (inv.invoice_num) cv[COL.invoice_num] = String(inv.invoice_num)
  if (inv.date) {
    const d = isoDate(inv.date as string)
    if (d) cv[COL.date] = { date: d }
  }
  if (inv.before_vat != null) cv[COL.before_vat] = Number(inv.before_vat)
  if (inv.total != null)      cv[COL.total]      = Number(inv.total)
  if (inv.paid != null)       cv[COL.paid]        = Number(inv.paid)
  if (inv.tax_withheld != null && Number(inv.tax_withheld) > 0)
    cv[COL.tax_withheld] = Number(inv.tax_withheld)
  if (inv.notes)        cv[COL.notes]   = String(inv.notes)
  if (inv.receipt_number) cv[COL.receipt] = String(inv.receipt_number)
  if (inv.payment_date) {
    const d = isoDate(inv.payment_date as string)
    if (d) cv[COL.payment_date] = { date: d }
  }
  if (inv.doc_type)   cv[COL.doc_type] = { label: String(inv.doc_type) }
  // Dropdown column: Monday accepts {"labels": ["option"]} format to match by label
  if (projectName)    cv[COL.project]  = { labels: [projectName] }

  return JSON.stringify(cv)
}

async function mondayMutation(query: string) {
  const r = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: MONDAY_TOKEN!,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query }),
  })
  if (!r.ok) throw new Error(`Monday API ${r.status}`)
  const d = await r.json()
  if (d.errors) throw new Error(d.errors[0]?.message)
  return d.data
}

export async function POST(req: NextRequest) {
  if (!MONDAY_TOKEN) return NextResponse.json({ error: 'MONDAY_API_TOKEN not set' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const invoiceIds: number[] | null = body.ids || null   // optional: sync specific IDs only

  const supabase = sb()

  // Fetch invoices
  let q = supabase.from('invoices').select('*').order('date', { ascending: false })
  if (invoiceIds) q = q.in('id', invoiceIds)
  const { data: invoices, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch projects for name lookup
  const { data: projects } = await supabase.from('projects').select('id, name')
  const projectMap: Record<string, string> = {}
  for (const p of projects || []) projectMap[p.id] = p.name

  const results: { id: number; monday_id: string; action: string; error?: string }[] = []

  for (const inv of (invoices || [])) {
    const projectName = inv.project_id ? projectMap[inv.project_id] : undefined
    const colVals = buildColumnValues(inv, projectName)
    const clientName = (inv.client || inv.invoice_num || 'ללא שם').replace(/"/g, '\\"')

    try {
      if (inv.monday_item_id) {
        // Update existing item
        await mondayMutation(`
          mutation {
            change_multiple_column_values(
              item_id: ${inv.monday_item_id},
              board_id: ${BOARD_ID},
              column_values: ${JSON.stringify(colVals)}
            ) { id }
          }
        `)
        results.push({ id: inv.id, monday_id: inv.monday_item_id, action: 'updated' })
      } else {
        // Create new item
        const data = await mondayMutation(`
          mutation {
            create_item(
              board_id: ${BOARD_ID},
              item_name: "${clientName}",
              column_values: ${JSON.stringify(colVals)}
            ) { id }
          }
        `)
        const mondayId = data?.create_item?.id
        if (mondayId) {
          await supabase.from('invoices').update({ monday_item_id: mondayId }).eq('id', inv.id)
          results.push({ id: inv.id, monday_id: mondayId, action: 'created' })
        }
      }
    } catch (e) {
      results.push({ id: inv.id, monday_id: inv.monday_item_id || '', action: 'error', error: String(e) })
    }
  }

  const created = results.filter(r => r.action === 'created').length
  const updated = results.filter(r => r.action === 'updated').length
  const errors  = results.filter(r => r.action === 'error').length
  return NextResponse.json({ ok: true, created, updated, errors, total: results.length, results })
}
