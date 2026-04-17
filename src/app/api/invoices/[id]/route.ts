import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  for (const f of ['before_vat','total','paid']) {
    if (f in body) updates[f] = Number(body[f]) || 0
  }
  // client_id is a nullable FK — handle separately so null is preserved
  if ('client_id' in body) updates['client_id'] = body.client_id === null ? null : Number(body.client_id)
  // project_id is a nullable UUID FK
  if ('project_id' in body) updates['project_id'] = body.project_id || null

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabase()
  const { error } = await supabase.from('invoices').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
