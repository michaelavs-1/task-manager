import { NextRequest, NextResponse } from 'next/server'
import { getColumnsForBoard } from '@/lib/artist-config'
import type { ArtistEvent, BoardColumns } from '@/lib/artist-config'

export const dynamic = 'force-dynamic'

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

function parseEvent(item: MondayItem, cols: BoardColumns): ArtistEvent {
  const col = (id: string) => {
    if (!id) return null
    return item.column_values.find(c => c.id === id)?.text || null
  }

  return {
    id: item.id,
    name: item.name,
    date:            col(cols.date),
    status:          col(cols.status),
    contract_status: col(cols.contract_status),
    event_type:      col(cols.event_type),
    location:        col(cols.location),
    start_time:      col(cols.start_time),
    end_time:        col(cols.end_time),
    soundcheck_time: col(cols.soundcheck_time),
    audience_count:  col(cols.audience_count),
    audience_type:   col(cols.audience_type),
    ticket_price:    col(cols.ticket_price),
    ticket_count:    col(cols.ticket_count),
    total_revenue:   col(cols.total_revenue),
    total_expenses:  col(cols.total_expenses),
    net_profit:      col(cols.net_profit),
    artist_share:    col(cols.artist_share),
    office_share:    col(cols.office_share),
    details:         col(cols.details),
  }
}

export async function GET(request: NextRequest) {
  const boardId = request.nextUrl.searchParams.get('boardId')
  const mondayToken = process.env.MONDAY_API_TOKEN

  if (!boardId) return NextResponse.json({ error: 'boardId required' }, { status: 400 })
  if (!mondayToken) return NextResponse.json({ error: 'MONDAY_API_TOKEN not set' }, { status: 500 })

  const cols = getColumnsForBoard(boardId)

  const query = `
    query {
      boards(ids: [${boardId}]) {
        items_page(limit: 500) {
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
    const resp = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': mondayToken, 'API-Version': '2023-10' },
      body: JSON.stringify({ query }),
    })

    if (!resp.ok) return NextResponse.json({ error: `Monday API: ${resp.status} ${resp.statusText}` }, { status: 502 })

    const data = await resp.json()
    const items: MondayItem[] = data?.data?.boards?.[0]?.items_page?.items || []
    const events = items.map(item => parseEvent(item, cols))

    // Sort by date: upcoming first, no-date last
    events.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })

    return NextResponse.json({ events, total: events.length })
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
