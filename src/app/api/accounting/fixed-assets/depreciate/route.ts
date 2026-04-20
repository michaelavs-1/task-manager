import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin, bookDepreciation } from '@/lib/accounting'

/**
 * Run monthly depreciation for all active fixed assets.
 * POST /api/accounting/fixed-assets/depreciate  { month: 'YYYY-MM' }
 * Safe: skips assets with an existing 'depreciation' JE for that month.
 */
export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await (async () => { try { return await req.json() } catch { return {} } })()
  const ym = body.month || new Date().toISOString().slice(0, 7)
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const asOf = `${ym}-${String(lastDay).padStart(2, '0')}`

  const { data: assets, error } = await supa
    .from('fixed_assets')
    .select('*')
    .eq('is_active', true)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ id: string; description: string; status: 'booked' | 'skipped' | 'error'; je_id?: string; error?: string }> = []

  for (const fa of assets || []) {
    // Already depreciated this month?
    const { data: existing } = await supa
      .from('journal_entries')
      .select('id')
      .eq('source_type', 'depreciation')
      .eq('source_id', fa.id)
      .gte('entry_date', `${ym}-01`)
      .lte('entry_date', asOf)
      .limit(1)
      .maybeSingle()
    if (existing) {
      results.push({ id: fa.id, description: fa.description, status: 'skipped' })
      continue
    }

    // Past end-of-life? skip
    const acq = new Date(String(fa.acquisition_date))
    const elapsed = (y - acq.getFullYear()) * 12 + (m - (acq.getMonth() + 1))
    if (elapsed < 0 || elapsed >= Number(fa.useful_life_months)) {
      results.push({ id: fa.id, description: fa.description, status: 'skipped' })
      continue
    }

    try {
      const jeId = await bookDepreciation({
        id: fa.id,
        description: fa.description,
        acquisition_cost: Number(fa.acquisition_cost) || 0,
        salvage_value: Number(fa.salvage_value) || 0,
        useful_life_months: Number(fa.useful_life_months) || 1,
        account_depexp_code: fa.depexp_account_code || '6900',
        account_accdep_code: fa.accdep_account_code || '1750',
        as_of: asOf,
      })
      results.push({ id: fa.id, description: fa.description, status: 'booked', je_id: jeId })
    } catch (e) {
      results.push({ id: fa.id, description: fa.description, status: 'error', error: (e as Error).message })
    }
  }

  return NextResponse.json({
    month: ym,
    as_of: asOf,
    total_assets: (assets || []).length,
    booked:  results.filter(r => r.status === 'booked').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors:  results.filter(r => r.status === 'error').length,
    results,
  })
}

export async function GET(req: NextRequest) {
  // Allow GET for cron (Vercel cron jobs call GET)
  return POST(req)
}
