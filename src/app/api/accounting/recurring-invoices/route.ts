import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export async function GET() {
  const supa = supaAdmin()
  const { data, error } = await supa
    .from('recurring_invoices')
    .select('*')
    .order('next_run_date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const payload = {
    client:             body.client,
    client_tax_id:      body.client_tax_id || null,
    description:        body.description || '',
    amount_before_vat:  Number(body.amount_before_vat) || 0,
    vat_rate:           Number(body.vat_rate) || 0.18,
    frequency:          body.frequency || 'monthly',   // monthly / quarterly / yearly
    day_of_month:       Number(body.day_of_month) || 1,
    next_run_date:      body.next_run_date || new Date().toISOString().slice(0, 10),
    end_date:           body.end_date || null,
    project_id:         body.project_id || null,
    auto_issue:         body.auto_issue !== false,     // default true
    is_active:          true,
  }
  if (!payload.client) return NextResponse.json({ error: 'client required' }, { status: 400 })
  const { data, error } = await supa.from('recurring_invoices').insert([payload]).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
