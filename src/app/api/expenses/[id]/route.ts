import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { bookExpensePayment, unbookBySource } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  const fields = ['project_id','supplier','description','vat_status','amount','vat','total','paid','payment_date','has_invoice','month','notes']
  fields.forEach(f => { if (f in body) updates[f] = body[f] })
  if ('project_id' in body) updates['project_id'] = body.project_id || null

  // Fetch prior state to detect payment transitions
  const { data: prior } = await getSupabase()
    .from('expenses')
    .select('id,paid,supplier,description,payment_date')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await getSupabase()
    .from('expenses')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-book expense-payment JE when paid increases
  try {
    const priorPaid = Number(prior?.paid || 0)
    const newPaid = Number(data?.paid || 0)
    const delta = newPaid - priorPaid
    if (delta > 0.005) {
      await bookExpensePayment({
        id: data.id,
        supplier: data.supplier || '',
        paid: delta,
        payment_date: data.payment_date || new Date().toISOString().slice(0, 10),
        description: data.description || '',
      })
    }
  } catch (e) {
    console.error('[expenses PATCH] JE booking failed:', (e as Error).message)
  }

  return NextResponse.json({ expense: data })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (isNaN(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  try { await unbookBySource('expense', String(id)) } catch { /* ignore */ }
  try { await unbookBySource('expense_payment', String(id)) } catch { /* ignore */ }

  const { error } = await getSupabase().from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}