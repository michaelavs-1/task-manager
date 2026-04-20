import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { bookInvoicePayment, unbookBySource } from '@/lib/accounting'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const body = await req.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const fields = ['issued_by','sent_to','date','doc_type','invoice_num','client','notes','payment_date']
  for (const f of fields) {
    if (f in body) updates[f] = body[f]
  }
  for (const f of ['before_vat','total','paid','tax_withheld']) {
    if (f in body) updates[f] = Number(body[f]) || 0
  }
  // client_id is a nullable FK — handle separately so null is preserved
  if ('client_id' in body) updates['client_id'] = body.client_id === null ? null : Number(body.client_id)
  // project_id is a nullable UUID FK
  if ('project_id' in body) updates['project_id'] = body.project_id || null

  // Fetch prior state to detect payment transitions
  const { data: prior } = await supabase
    .from('invoices')
    .select('id,paid,tax_withheld,total,client,invoice_num,payment_date,project_id')
    .eq('id', params.id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-book invoice-payment JE if paid/tax_withheld changed
  try {
    const priorPaid = Number(prior?.paid || 0)
    const priorWht  = Number(prior?.tax_withheld || 0)
    const newPaid   = Number(data.paid || 0)
    const newWht    = Number(data.tax_withheld || 0)
    const delta     = (newPaid + newWht) - (priorPaid + priorWht)
    if (Math.abs(delta) > 0.005 && (newPaid > 0 || newWht > 0)) {
      await bookInvoicePayment({
        id: data.id,
        total: Number(data.total) || 0,
        paid: Math.max(0, newPaid - priorPaid),
        tax_withheld: Math.max(0, newWht - priorWht),
        payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
        client: data.client || '',
        invoice_num: data.invoice_num || String(data.id),
        project_id: data.project_id || null,
      })
    }
  } catch (e) {
    console.error('[invoices PATCH] JE booking failed:', (e as Error).message)
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  try { await unbookBySource('invoice', params.id) } catch { /* ignore */ }
  try { await unbookBySource('invoice_payment', params.id) } catch { /* ignore */ }
  const { error } = await supabase.from('invoices').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
