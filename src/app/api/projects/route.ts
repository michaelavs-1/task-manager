import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, category')
    .order('category')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projects: data || [] })
}

export async function POST(request: Request) {
  const body = await request.json()
  const { name, category } = body
  if (!name || !category) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, category })
    .select('id, name, category')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ project: data })
}
