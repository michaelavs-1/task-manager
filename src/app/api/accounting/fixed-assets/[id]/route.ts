import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  const fields = ['description','category','acquisition_date','acquisition_cost','salvage_value','useful_life_months','depreciation_method','asset_account_code','accdep_account_code','depexp_account_code','supplier','invoice_num','notes','is_active','disposed_at','disposal_proceeds']
  for (const k of fields) if (k in body) patch[k] = body[k]
  const { data, error } = await supa.from('fixed_assets').update(patch).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supa = supaAdmin()
  const { error } = await supa.from('fixed_assets').update({ is_active: false }).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
