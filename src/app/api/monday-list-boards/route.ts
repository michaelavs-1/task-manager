import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 500 })

  const query = `{ boards(limit: 50, order_by: created_at) { id name board_kind } }`

  const res = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2023-10' },
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  const boards = (data?.data?.boards || [])
    .map((b: { id: string; name: string; board_kind: string }) => ({ id: b.id, name: b.name, kind: b.board_kind }))
    .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'he'))

  return NextResponse.json({ boards })
}
