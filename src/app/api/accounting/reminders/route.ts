import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * Invoice reminders — detects overdue invoices, creates reminder rows for UI / email.
 * GET /api/accounting/reminders  → list existing
 * POST /api/accounting/reminders/scan → scan open invoices and insert reminders
 */
export async function GET() {
  const supa = supaAdmin()
  const { data, error } = await supa
    .from('invoice_reminders')
    .select('*, invoices(invoice_num, client, total, paid, date)')
    .order('scheduled_for', { ascending: false })
    .limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ reminders: data || [] })
}

export async function POST(_req: NextRequest) {
  const supa = supaAdmin()
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)

  const { data: invs, error } = await supa
    .from('invoices')
    .select('id, invoice_num, date, client, total, paid, due_date')
    .lte('date', todayIso)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const created: Array<{ invoice_id: number | string; stage: string }> = []
  for (const inv of invs || []) {
    const open = (Number(inv.total) || 0) - (Number(inv.paid) || 0)
    if (open < 0.01) continue
    const due = inv.due_date ? new Date(String(inv.due_date)) : (() => {
      const d = new Date(String(inv.date)); d.setDate(d.getDate() + 30); return d
    })()
    const daysPastDue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))

    let stage: string | null = null
    if (daysPastDue >= 60) stage = 'final'
    else if (daysPastDue >= 30) stage = 'second'
    else if (daysPastDue >= 7)  stage = 'first'
    else if (daysPastDue >= -7) stage = 'due_soon'
    if (!stage) continue

    // Skip if already exists for this invoice+stage
    const { data: existing } = await supa
      .from('invoice_reminders')
      .select('id')
      .eq('invoice_id', inv.id)
      .eq('stage', stage)
      .limit(1)
      .maybeSingle()
    if (existing) continue

    await supa.from('invoice_reminders').insert([{
      invoice_id: inv.id,
      stage,
      scheduled_for: todayIso,
      status: 'pending',
      amount_due: Math.round(open * 100) / 100,
      days_past_due: daysPastDue,
    }])
    created.push({ invoice_id: inv.id, stage })
  }

  return NextResponse.json({
    scanned: (invs || []).length,
    created: created.length,
    items: created,
  })
}
