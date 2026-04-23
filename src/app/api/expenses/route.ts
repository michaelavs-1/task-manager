import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { bookExpenseIncurred } from '@/lib/accounting'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const { data, error } = await getSupabase()
    .from('expenses')
    .select('*')
    .order('month', { ascending: true })
    .order('id', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ expenses: data || [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await getSupabase()
    .from('expenses')
    .insert([{
      project_id: body.project_id || null,
      supplier: body.supplier || '',
      description: body.description || '',
      vat_status: body.vat_status || 'מורשה',
      amount: body.amount || 0,
      vat: body.vat || 0,
      total: body.total || 0,
      paid: body.paid || 0,
      payment_date: body.payment_date || '',
      has_invoice: body.has_invoice || false,
      month: body.month || '',
      notes: body.notes || '',
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-book expense JE (best-effort)
  try {
    if (data && (Number(data.total) || 0) > 0) {
      const jeId = await bookExpenseIncurred({
        id: data.id,
        supplier: data.supplier || '',
        description: data.description || '',
        amount: Number(data.amount) || 0,
        vat:    Number(data.vat)    || 0,
        total:  Number(data.total)  || 0,
        month:  data.month || '',
        project_id: data.project_id || null,
      })
      await getSupabase().from('expenses').update({ je_id: jeId }).eq('id', data.id)
    }
  } catch (e) {
    console.error('[expenses POST] JE booking failed:', (e as Error).message)
  }

  return NextResponse.json({ expense: data })
}