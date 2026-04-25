import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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
  const fields = ['authority', 'period', 'due_date', 'paid_date', 'status', 'notes']
  for (const f of fields) { if (f in body) updates[f] = body[f] }
  if ('amount' in body) updates['amount'] = Number(body.amount) || 0
  const { data, error } = await supabase
    .from('authority_payments')
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
  const { error } = await supabase.from('authority_payments').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
