import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('authority_payments')
    .select('*')
    .order('paid_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase()
  const body = await req.json()
  const { data, error } = await supabase
    .from('authority_payments')
    .insert({
      authority:  body.authority  ?? 'vat',
      amount:     Number(body.amount) || 0,
      period:     body.period     ?? '',
      due_date:   body.due_date   ?? null,
      paid_date:  body.paid_date  ?? null,
      status:     body.status     ?? 'pending',
      notes:      body.notes      ?? '',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
