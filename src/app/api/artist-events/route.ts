import { NextRequest, NextResponse } from 'next/server'

// Map artist names to their Monday.com event board IDs
export const ARTIST_BOARD_MAP: Record<string, string> = {
  "ג'ימבו ג'יי": '2043602683',
  'אקו': '5092930238',
  'אקו / Mitzi': '5092930238',
  'מאור אשכנזי': '5093817565',
  'YUZ': '5093818247',
  'אלי לוזון': '5094110017',
}

interface ColumnValue {
  id: string
  text?: string | null
  value?: string | null
}

interface MondayItem {
  id: string
  name: string
  column_values: ColumnValue[]
}

export type ArtistEvent = {
  id: string
  name: string
  date: string | null
  status: string | null
  contract_status: string | null
  event_type: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  soundcheck_time: string | null
  audience_count: string | null
  audience_type: string | null
  ticket_price: string | null
  ticket_count: string | null
  total_revenue: string | null
  total_expenses: string | null
  net_profit: string | null
  artist_share: string | null
  office_share: string | null
  details: string | null
}

function parseEvent(item: MondayItem): ArtistEvent {
  const col = (id: string) => item.column_values.find(c => c.id === id)?.text || null

  // Parse formula columns (they have text with the computed value)
  const colVal = (id: string) => {
    const c = item.column_values.find(cv => cv.id === id)
    return c?.text || null
  }

  return {
    id: item.id,
    name: item.name,
    date: col('date_mm1akrm7'),
    status: col('color_mm1a9mr6'),
    contract_status: col('color_mm1afewp'),
    event_type: col('color_mm1akdec'),
    location: col('text_mm1amztr'),
    start_time: col('hour_mm1awtkm'),
    end_time: col('hour_mm1adj2d'),
    soundcheck_time: col('hour_mm1agkqg'),
    audience_count: col('numeric_mm1a8jd0'),
    audience_type: col('color_mm1apw17'),
    ticket_price: col('numeric_mm0cc869'),
    ticket_count: col('numeric_mm0cvpvq'),
    total_revenue: colVal('formula_mm0czrmj'),
    total_expenses: colVal('formula_mm0cxz90'),
    net_profit: colVal('formula_mm0cnjr'),
    artist_share: colVal('formula_mm1apcr'),
    office_share: colVal('formula_mm1accmw'),
    details: col('text_mm1az3j9'),
  }
}

export async function GET(request: NextRequest) {
  const boardId = request.nextUrl.searchParams.get('boardId')
  const mondayToken = process.env.MONDAY_API_TOKEN

  if (!boardId) return NextResponse.json({ error: 'boardId required' }, { status: 400 })
  if (!mondayToken) return NextResponse.json({ error: 'MONDAY_API_TOKEN not set' }, { status: 500 })

  const query = `
    query {
      boards(ids: [${boardId}]) {
        items_page(limit: 200) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `

  try {
    const resp = await fetch('https://api.monday.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: mondayToken },
      body: JSON.stringify({ query }),
    })

    if (!resp.ok) return NextResponse.json({ error: `Monday API: ${resp.status}` }, { status: 502 })

    const data = await resp.json()
    const items: MondayItem[] = data?.data?.boards?.[0]?.items_page?.items || []
    const events = items.map(parseEvent)

    // Sort: upcoming first, past at end
    const today = new Date().toISOString().split('T')[0]
    events.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })

    return NextResponse.json({ events, total: events.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
