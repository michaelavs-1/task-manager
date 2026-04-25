import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  // Fetch clients + aggregate invoice stats in one query
  const { data: clients, error: ce } = await getSupabase()
    .from('clients')
    .select('*')
    .order('name', { ascending: true })
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 })

  // Aggregate invoice totals per client
  const { data: invs, error: ie } = await getSupabase()
    .from('invoices')
    .select('client_id, total, paid')
  if (ie) return NextResponse.json({ error: ie.message }, { status: 500 })

  const stats: Record<number, { count: number; total: number; paid: number }> = {}
  for (const inv of invs ?? []) {
    if (!inv.client_id) continue
    if (!stats[inv.client_id]) stats[inv.client_id] = { count: 0, total: 0, paid: 0 }
    stats[inv.client_id].count++
    stats[inv.client_id].total += inv.total ?? 0
    stats[inv.client_id].paid  += inv.paid  ?? 0
  }

  const enriched = (clients ?? []).map((c: { id: number }) => ({
    ...c,
    invoiceCount: stats[c.id]?.count ?? 0,
    totalAmount:  stats[c.id]?.total ?? 0,
    paidAmount:   stats[c.id]?.paid  ?? 0,
  }))

  return NextResponse.json({ clients: enriched })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await getSupabase()
    .from('clients')
    .insert([body])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ client: data })
}
