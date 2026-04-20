import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export async function GET() {
  const supa = supaAdmin()
  const { data, error } = await supa.from('bank_accounts').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data || [] })
}

export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const payload = {
    name:          body.name,
    bank:          body.bank || '',
    branch:        body.branch || '',
    account_number: body.account_number || '',
    currency:      body.currency || 'ILS',
    account_code:  body.account_code || '1010',   // link to GL cash account
    is_active:     true,
  }
  if (!payload.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const { data, error } = await supa.from('bank_accounts').insert([payload]).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
