import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const allowed = ['name', 'status', 'genre', 'audience', 'contact_name', 'contact_phone', 'contact_email', 'monthly_revenue_target']
  const patch: Record<string, unknown> = {}
  allowed.forEach(k => { if (k in body) patch[k] = body[k] })
  const { data, error } = await getSupabase().from('projects').update(patch).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { error } = await getSupabase().from('projects').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
