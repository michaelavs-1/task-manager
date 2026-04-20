import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  const fields = ['client','client_tax_id','description','amount_before_vat','vat_rate','frequency','day_of_month','next_run_date','end_date','project_id','auto_issue','is_active']
  for (const k of fields) if (k in body) patch[k] = body[k]
  const { data, error } = await supa.from('recurring_invoices').update(patch).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  const { error } = await supa.from('recurring_invoices').update({ is_active: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
