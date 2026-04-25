import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  const fields = ['code','name_he','account_type','parent_id','code_6111','description','is_active']
  for (const f of fields) if (f in body) updates[f] = body[f]
  const { data, error } = await supa
    .from('accounts')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  // Safety: refuse delete if account has any JE lines
  const { count } = await supa
    .from('je_lines')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', params.id)
  if ((count || 0) > 0) {
    return NextResponse.json({ error: `לא ניתן למחוק — יש ${count} תנועות בחשבון. סמן כלא-פעיל במקום.` }, { status: 400 })
  }
  const { error } = await supa.from('accounts').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
