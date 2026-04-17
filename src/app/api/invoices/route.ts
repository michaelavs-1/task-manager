import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      issued_by:   body.issued_by   ?? '',
      sent_to:     body.sent_to     ?? '',
      date:        body.date        ?? '',
      doc_type:    body.doc_type    ?? '',
      invoice_num: body.invoice_num ?? '',
      client:      body.client      ?? '',
      before_vat:  Number(body.before_vat) || 0,
      total:       Number(body.total)       || 0,
      paid:        Number(body.paid)        || 0,
      notes:       body.notes       ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
