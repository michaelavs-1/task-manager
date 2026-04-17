import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  const fields = ['project_id','supplier','description','vat_status','amount','vat','total','paid','payment_date','has_invoice','month','notes']
  fields.forEach(f => { if (f in body) updates[f] = body[f] })
  if ('project_id' in body) updates['project_id'] = body.project_id || null

  const { data, error } = await supabase
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expense: data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}