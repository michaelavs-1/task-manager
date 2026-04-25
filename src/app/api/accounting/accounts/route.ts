import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supa = supaAdmin()
  const { data, error } = await supa
    .from('accounts')
    .select('*')
    .order('code', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data || [] })
}

export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const { data, error } = await supa
    .from('accounts')
    .insert({
      code:         body.code,
      name_he:      body.name_he,
      account_type: body.account_type,
      parent_id:    body.parent_id || null,
      code_6111:    body.code_6111 || null,
      description:  body.description || '',
      is_active:    body.is_active ?? true,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
