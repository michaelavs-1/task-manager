import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin, bookInvoiceIssued, vatRateOn } from '@/lib/accounting'

/**
 * Cron endpoint — issues any recurring invoices whose next_run_date <= today.
 * After issuing, advances next_run_date by frequency.
 * POST or GET /api/accounting/recurring-invoices/run
 */
async function advanceNext(date: string, frequency: string, dayOfMonth: number): Promise<string> {
  const d = new Date(date)
  if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + 1)
  else d.setMonth(d.getMonth() + 1)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const day = Math.min(dayOfMonth || 1, lastDay)
  d.setDate(day)
  return d.toISOString().slice(0, 10)
}

async function handler(_req: NextRequest) {
  const supa = supaAdmin()
  const today = new Date().toISOString().slice(0, 10)

  const { data: due, error } = await supa
    .from('recurring_invoices')
    .select('*')
    .eq('is_active', true)
    .lte('next_run_date', today)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ id: string; client: string; status: string; invoice_id?: number | string; je_id?: string; error?: string }> = []

  for (const r of due || []) {
    try {
      if (r.end_date && today > String(r.end_date)) {
        await supa.from('recurring_invoices').update({ is_active: false }).eq('id', r.id)
        results.push({ id: r.id, client: r.client, status: 'expired' })
        continue
      }
      const vat = Number(r.vat_rate) || await vatRateOn(today)
      const before = Math.round(Number(r.amount_before_vat) * 100) / 100
      const total  = Math.round((before * (1 + vat)) * 100) / 100

      // Generate next invoice number
      const { data: last } = await supa.from('invoices').select('invoice_num').order('id', { ascending: false }).limit(1).maybeSingle()
      const lastNum = last?.invoice_num ? Number(String(last.invoice_num).replace(/\D/g, '')) || 0 : 0
      const nextNum = String(lastNum + 1)

      const { data: inv, error: insErr } = await supa
        .from('invoices')
        .insert([{
          invoice_num: nextNum,
          date:        today,
          client:      r.client,
          client_tax_id: r.client_tax_id,
          description: r.description,
          before_vat:  before,
          total,
          paid:        0,
          tax_withheld: 0,
          project_id:  r.project_id,
        }])
        .select('*')
        .single()
      if (insErr || !inv) throw insErr || new Error('Failed to insert invoice')

      let jeId: string | undefined
      if (r.auto_issue !== false) {
        try {
          jeId = await bookInvoiceIssued({
            id: inv.id,
            date: inv.date,
            client: inv.client,
            client_tax_id: inv.client_tax_id,
            before_vat: Number(inv.before_vat),
            total: Number(inv.total),
            invoice_num: String(inv.invoice_num),
            project_id: inv.project_id,
          })
          await supa.from('invoices').update({ je_id: jeId }).eq('id', inv.id)
        } catch {}
      }

      const nextDate = await advanceNext(r.next_run_date as string, r.frequency, r.day_of_month)
      await supa.from('recurring_invoices').update({ next_run_date: nextDate, last_run_at: new Date().toISOString() }).eq('id', r.id)

      results.push({ id: r.id, client: r.client, status: 'issued', invoice_id: inv.id, je_id: jeId })
    } catch (e) {
      results.push({ id: r.id, client: r.client, status: 'error', error: (e as Error).message })
    }
  }

  return NextResponse.json({
    today,
    due_count: (due || []).length,
    issued: results.filter(r => r.status === 'issued').length,
    expired: results.filter(r => r.status === 'expired').length,
    errors:  results.filter(r => r.status === 'error').length,
    results,
  })
}

export async function POST(req: NextRequest) { return handler(req) }
export async function GET(req: NextRequest)  { return handler(req) }
