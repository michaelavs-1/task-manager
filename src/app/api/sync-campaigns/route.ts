import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Types
interface ColumnValue {
  id: string
  column: { title: string }
  text?: string
  value?: string
}

interface MondayItem {
  id: string
  name: string
  group?: { title: string }
  column_values: ColumnValue[]
}

interface BoardItemsPageResponse {
  cursor: string | null
  items: MondayItem[]
}

interface MondayBoardResponse {
  data: {
    boards: Array<{
      items_page: BoardItemsPageResponse
    }>
  }
}

interface CampaignRecord {
  monday_item_id: string
  board: string
  name: string
  group_title?: string | null
  status?: string | null
  platforms?: string | null
  requester?: string | null
  launch_date?: string | null
  end_date?: string | null
  project_name?: string | null
  redirect_to?: string | null
  campaign_type?: string | null
  dark_copy?: string | null
  has_button?: string | null
  button_type?: string | null
  button_link?: string | null
  budget_type?: string | null
  budget_intensity?: string | null
  budget_amount?: number | null
  needs_michael_call?: string | null
  notes?: string | null
  campaign_goal?: string | null
  territory?: string | null
  ad_number?: string | null
  schedule_type?: string | null
  date_received?: string | null
}

// Column title mappings (Hebrew and English)
const COLUMN_MAP: { [key: string]: keyof Omit<CampaignRecord, 'monday_item_id' | 'board' | 'name' | 'group_title'> } = {
  'סטטוס': 'status',
  'status': 'status',
  'פלטפורמות': 'platforms',
  'platforms': 'platforms',
  'מזמין': 'requester',
  'requester': 'requester',
  'תאריך עלייה לאוויר': 'launch_date',
  'תאריך עלייה': 'launch_date',
  'launch_date': 'launch_date',
  'תאריך סיום': 'end_date',
  'end_date': 'end_date',
  'שם הפרויקט': 'project_name',
  'פרויקט': 'project_name',
  'project_name': 'project_name',
  'לאן מפנה': 'redirect_to',
  'הפנייה': 'redirect_to',
  'redirect_to': 'redirect_to',
  'סוג קמפיין': 'campaign_type',
  'campaign_type': 'campaign_type',
  'טקסט קופי': 'dark_copy',
  'דארק': 'dark_copy',
  'dark_copy': 'dark_copy',
  'האם יש כפתור': 'has_button',
  'כפתור': 'has_button',
  'has_button': 'has_button',
  'סוג כפתור': 'button_type',
  'button_type': 'button_type',
  'לינק כפתור': 'button_link',
  'לינק': 'button_link',
  'button_link': 'button_link',
  'סוג תקציב': 'budget_type',
  'budget_type': 'budget_type',
  'עצימות תקציב': 'budget_intensity',
  'budget_intensity': 'budget_intensity',
  'תקציב': 'budget_amount',
  'budget_amount': 'budget_amount',
  'שיחה עם מיכאל': 'needs_michael_call',
  'michael_call': 'needs_michael_call',
  'הערות': 'notes',
  'Notes': 'notes',
  'notes': 'notes',
  'מטרת הקמפיין': 'campaign_goal',
  'campaign_goal': 'campaign_goal',
  'טריטוריה': 'territory',
  'territory': 'territory',
  'מספר מודעה': 'ad_number',
  'ad_number': 'ad_number',
  'סוג תזמון': 'schedule_type',
  'schedule_type': 'schedule_type',
  'תאריך קבלה': 'date_received',
  'date_received': 'date_received',
}

// Helper function to extract column value
function extractColumnValue(columnValues: ColumnValue[], columnTitle: string): string | number | null {
  const col = columnValues.find(cv => cv.column.title === columnTitle)
  if (!col) return null

  // For budget_amount, parse as number
  if (columnTitle === 'תקציב' || columnTitle === 'budget_amount') {
    const num = col.text ? parseFloat(col.text.replace(/[^\d.-]/g, '')) : null
    return isNaN(num as number) ? null : num
  }

  return col.text || col.value || null
}

// Helper function to parse campaign record from Monday item
function parseCampaignRecord(item: MondayItem): CampaignRecord {
  const record: CampaignRecord = {
    monday_item_id: item.id,
    board: 'universal',
    name: item.name,
    group_title: item.group?.title || null,
  }

  // Map all column values
  Object.entries(COLUMN_MAP).forEach(([columnTitle, fieldName]) => {
    const value = extractColumnValue(item.column_values, columnTitle)
    if (value !== null) {
      if (fieldName === 'budget_amount') {
        record[fieldName] = value as number
      } else {
        record[fieldName] = String(value)
      }
    }
  })

  return record
}

// Main sync function
async function syncCampaigns(): Promise<{ success: boolean; synced?: number; error?: string }> {
  // Validate environment variables
  const mondayToken = process.env.MONDAY_API_TOKEN
  const mondayBoardId = process.env.MONDAY_BOARD_ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!mondayToken || !mondayBoardId) {
    return {
      success: false,
      error: 'Missing required environment variables: MONDAY_API_TOKEN and/or MONDAY_BOARD_ID',
    }
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: 'Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY',
    }
  }

  // Initialize Supabase admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Fetch all items from Monday.com board with pagination
  const allItems: MondayItem[] = []
  let cursor: string | null = null
  const maxIterations = 100 // Safety limit

  let iteration = 0

  try {
    while (iteration < maxIterations) {
      iteration++

      const query = `
        query GetBoardItems($boardId: ID!, $cursor: String) {
          boards(ids: [$boardId]) {
            items_page(limit: 500, cursor: $cursor) {
              cursor
              items {
                id
                name
                group { title }
                column_values {
                  id
                  column { title }
                  text
                  value
                }
              }
            }
          }
        }
      `

      const variables = {
        boardId: mondayBoardId,
        cursor: cursor || null,
      }

      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': mondayToken,
          'API-Version': '2023-10',
        },
        body: JSON.stringify({ query, variables }),
      })

      if (!response.ok) {
        return {
          success: false,
          error: `Monday.com API error: ${response.status} ${response.statusText}`,
        }
      }

      const data = (await response.json()) as MondayBoardResponse

      if (data.data?.boards?.[0]?.items_page?.items) {
        const items = data.data.boards[0].items_page.items
        allItems.push(...items)
      }

      // Check if there are more pages
      cursor = data.data?.boards?.[0]?.items_page?.cursor || null
      if (!cursor) {
        break
      }
    }

    // Parse campaigns from items
    const campaigns: CampaignRecord[] = allItems.map(item => parseCampaignRecord(item))

    if (campaigns.length === 0) {
      return {
        success: true,
        synced: 0,
      }
    }

    // Upsert to Supabase
    const { error: upsertError } = await supabase
      .from('campaigns')
      .upsert(campaigns, { onConflict: 'monday_item_id' })

    if (upsertError) {
      return {
        success: false,
        error: `Supabase upsert error: ${upsertError.message}`,
      }
    }

    return {
      success: true,
      synced: campaigns.length,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
    return {
      success: false,
      error: `Sync failed: ${errorMessage}`,
    }
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const result = await syncCampaigns()

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          synced: result.synced,
          message: `Successfully synced ${result.synced} campaigns`,
        },
        { status: 200 }
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: result.error?.includes('Missing required environment') ? 400 : 500 }
      )
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: `Internal server error: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
