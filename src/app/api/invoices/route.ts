import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { bookInvoiceIssued } from '@/lib/accounting'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invoices: data ?? [], total: data?.length ?? 0 })
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      issued_by:    body.issued_by    ?? '',
      sent_to:      body.sent_to      ?? '',
      date:         body.date         ?? '',
      doc_type:     body.doc_type     ?? '',
      invoice_num:  body.invoice_num  ?? '',
      client:       body.client       ?? '',
      client_id:    body.client_id    ? Number(body.client_id) : null,
      payment_date: body.payment_date ?? '',
      before_vat:   Number(body.before_vat)   || 0,
      total:        Number(body.total)        || 0,
      paid:         Number(body.paid)         || 0,
      tax_withheld: Number(body.tax_withheld) || 0,
      notes:        body.notes        ?? '',
      project_id:   body.project_id   ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-book invoice-issued JE (best-effort; never blocks the invoice response)
  try {
    if (data && data.total && data.total > 0) {
      const jeId = await bookInvoiceIssued({
        id: data.id,
        date: data.date || new Date().toISOString().slice(0, 10),
        client: data.client || '',
        client_tax_id: data.client_tax_id || '',
        before_vat: Number(data.before_vat) || 0,
        total: Number(data.total) || 0,
        invoice_num: data.invoice_num || String(data.id),
        project_id: data.project_id || null,
      })
      const adm = getSupabaseAdmin()
      await adm.from('invoices').update({ je_id: jeId }).eq('id', data.id)
    }
  } catch (e) {
    console.error('[invoices POST] JE booking failed:', (e as Error).message)
  }

  return NextResponse.json(data)
}
