import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LINKS_BOARD_ID = '5082800851'

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

async function syncLinks() {
  const mondayToken = process.env.MONDAY_API_TOKEN
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!mondayToken || !supabaseUrl || !supabaseServiceKey) {
    return { success: false, error: 'Missing environment variables' }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const query = `
    query {
      boards(ids: [${LINKS_BOARD_ID}]) {
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
    const response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': mondayToken,
        'API-Version': '2023-10',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      return { success: false, error: `Monday API error: ${response.status} ${response.statusText}` }
    }

    const data = await response.json()
    const items: MondayItem[] = data?.data?.boards?.[0]?.items_page?.items || []

    const records = items.map((item) => {
      const linkCol = item.column_values.find((cv) => cv.id === 'link_mkxe1r0b')
      let url: string | null = null
      let linkText: string | null = null

      if (linkCol?.value) {
        try {
          const parsed = JSON.parse(linkCol.value)
          url = parsed.url || null
          linkText = parsed.text || null
        } catch {
          url = linkCol.text || null
        }
      }

      const artistCol = item.column_values.find((cv) => cv.id === 'board_relation_mkxe5gw1')
      const artistName = artistCol?.text || null

      return {
        monday_item_id: item.id,
        name: item.name,
        url,
        link_text: linkText !== url ? linkText : null,
        artist_name: artistName,
        updated_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase
      .from('links')
      .upsert(records, { onConflict: 'monday_item_id' })

    if (error) return { success: false, error: error.message }

    return { success: true, synced: records.length }
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return { success: false, error: `Sync failed: ${errMsg}` }
  }
}

export async function POST(_request: NextRequest) {
  const result = await syncLinks()
  return NextResponse.json(result, { status: result.success ? 200 : 500 })
}

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}
