import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

/**
 * רכוש קבוע — רשימה + הוספה.
 * GET /api/accounting/fixed-assets
 * POST /api/accounting/fixed-assets  { description, category, acquisition_date, acquisition_cost, salvage_value, useful_life_months, depreciation_method, asset_account_code, accdep_account_code, depexp_account_code }
 */
export async function GET() {
  const supa = supaAdmin()
  const { data, error } = await supa
    .from('fixed_assets')
    .select('*')
    .order('acquisition_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const r2 = (n: number) => Math.round(n * 100) / 100
  const today = new Date()

  const rows = (data || []).map((a: Record<string, unknown>) => {
    const cost = Number(a.acquisition_cost) || 0
    const salvage = Number(a.salvage_value) || 0
    const life   = Number(a.useful_life_months) || 1
    const acqDate = new Date(String(a.acquisition_date || today.toISOString().slice(0, 10)))
    const monthsElapsed = Math.max(0,
      (today.getFullYear() - acqDate.getFullYear()) * 12 +
      (today.getMonth() - acqDate.getMonth())
    )
    const usedMonths = Math.min(monthsElapsed, life)
    const monthlyDep = (cost - salvage) / life
    const accumulated = monthlyDep * usedMonths
    const nbv = cost - accumulated
    return {
      ...a,
      monthly_depreciation: r2(monthlyDep),
      accumulated_depreciation: r2(accumulated),
      net_book_value: r2(nbv),
      months_elapsed: usedMonths,
      is_fully_depreciated: usedMonths >= life,
    }
  })
  return NextResponse.json({ assets: rows })
}

export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const payload = {
    description:           body.description,
    category:              body.category || 'other',
    acquisition_date:      body.acquisition_date || new Date().toISOString().slice(0, 10),
    acquisition_cost:      Number(body.acquisition_cost) || 0,
    salvage_value:         Number(body.salvage_value) || 0,
    useful_life_months:    Number(body.useful_life_months) || 60,
    depreciation_method:   body.depreciation_method || 'straight_line',
    asset_account_code:    body.asset_account_code || '1700',
    accdep_account_code:   body.accdep_account_code || '1750',
    depexp_account_code:   body.depexp_account_code || '6900',
    supplier:              body.supplier || null,
    invoice_num:           body.invoice_num || null,
    notes:                 body.notes || null,
    is_active:             true,
  }
  if (!payload.description) return NextResponse.json({ error: 'description required' }, { status: 400 })
  const { data, error } = await supa.from('fixed_assets').insert([payload]).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ asset: data })
}
