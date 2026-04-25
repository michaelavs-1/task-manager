import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supa = supaAdmin()
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year') || new Date().getFullYear())

  const { data, error } = await supa
    .from('budgets')
    .select('*, accounts(code, name_he, account_type)')
    .eq('fiscal_year', year)
    .order('month')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ budgets: data || [] })
}

export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const rows = Array.isArray(body.rows) ? body.rows : [body]
  type Row = { fiscal_year: number; month: number; account_code: string; project_id?: string | null; budgeted_amount: number; note?: string }

  const codes = Array.from(new Set(rows.map((r: Row) => r.account_code).filter(Boolean)))
  const { data: accts } = await supa.from('accounts').select('id, code').in('code', codes as string[])
  const codeMap = new Map<string, string>()
  for (const a of accts || []) codeMap.set(a.code as string, a.id as string)

  const payload = rows.map((r: Row) => ({
    fiscal_year: Number(r.fiscal_year),
    month:       Number(r.month),
    account_id:  codeMap.get(r.account_code) || null,
    project_id:  r.project_id ?? null,
    budgeted_amount: Number(r.budgeted_amount) || 0,
    note:        r.note || null,
  })).filter((r: { account_id: string | null }) => r.account_id)

  if (payload.length === 0) return NextResponse.json({ error: 'No valid rows' }, { status: 400 })

  // Upsert on (fiscal_year, month, account_id, project_id)
  const { data, error } = await supa.from('budgets').upsert(payload, { onConflict: 'fiscal_year,month,account_id,project_id' }).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ inserted: (data || []).length, rows: data })
}
