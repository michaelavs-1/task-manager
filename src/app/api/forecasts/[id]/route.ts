import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  const textFields = ['client','description','expected_date','confidence','notes']
  for (const f of textFields) if (f in body) updates[f] = body[f]
  const numFields = ['amount_before_vat','vat','total']
  for (const f of numFields) if (f in body) updates[f] = Number(body[f]) || 0
  if ('client_id' in body) updates['client_id'] = body.client_id ? Number(body.client_id) : null
  if ('project_id' in body) updates['project_id'] = body.project_id || null

  const { data, error } = await sb()
    .from('forecast_invoices')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await sb().from('forecast_invoices').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
