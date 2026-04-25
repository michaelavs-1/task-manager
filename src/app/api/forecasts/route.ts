import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data, error } = await sb()
    .from('forecast_invoices')
    .select('*')
    .order('expected_date', { ascending: true })
    .order('id', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ forecasts: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb()
    .from('forecast_invoices')
    .insert({
      client:           body.client           ?? '',
      client_id:        body.client_id        ? Number(body.client_id) : null,
      project_id:       body.project_id       ?? null,
      description:      body.description      ?? '',
      expected_date:    body.expected_date     ?? '',
      amount_before_vat: Number(body.amount_before_vat) || 0,
      vat:              Number(body.vat)       || 0,
      total:            Number(body.total)     || 0,
      confidence:       body.confidence        ?? 'סביר',
      notes:            body.notes            ?? '',
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
