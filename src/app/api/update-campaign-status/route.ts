import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const MONDAY_API_URL = 'https://api.monday.com/v2'

const UNIVERSAL_BOARD_ID = '5087485301'
const MICHAEL_BOARD_ID = '5089500208'

const STATUS_INDEX: Record<string, Record<string, number>> = {
  [UNIVERSAL_BOARD_ID]: {
    'חדש': 0,
    'עלה לאוויר': 1,
    'נגמר-ארכיון': 2,
  },
  [MICHAEL_BOARD_ID]: {
    'חדש': 0,
    'באוויר': 1,
    'נגמר': 2,
  },
}

const GROUP_ID: Record<string, Record<string, string>> = {
  [UNIVERSAL_BOARD_ID]: {
    'לא טופל': 'topics',
    'עלה לאוויר': 'group_title',
    'נגמר-ארכיון': 'group_mkxwd2xm',
  },
  [MICHAEL_BOARD_ID]: {
    'חדשים': 'topics',
    'בטיפול': 'group_title',
    'הסתיימו': 'group_mkz582m',
  },
}

async function callMonday(query: string) {
  const mondayToken = process.env.MONDAY_API_TOKEN
  const res = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': mondayToken!,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

function getBoardId(projectName: string | null): string {
  const p = (projectName || '').toLowerCase()
  if (p === 'general' || p === 'michael' || p === 'micheal') return MICHAEL_BOARD_ID
  return UNIVERSAL_BOARD_ID
}

export async function POST(req: NextRequest) {
  try {
    const { campaignId, mondayItemId, statusLabel, newGroupTitle } = await req.json()

    if (!campaignId || !mondayItemId || !statusLabel || !newGroupTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: campaign, error: fetchError } = await getSupabase()
      .from('campaigns')
      .select('project_name')
      .eq('id', campaignId)
      .single()

    if (fetchError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const boardId = getBoardId(campaign.project_name)
    const statusIndex = STATUS_INDEX[boardId]?.[statusLabel]
    const groupId = GROUP_ID[boardId]?.[newGroupTitle]

    if (statusIndex === undefined) {
      return NextResponse.json({ error: 'Unknown status: ' + statusLabel }, { status: 400 })
    }
    if (!groupId) {
      return NextResponse.json({ error: 'Unknown group: ' + newGroupTitle }, { status: 400 })
    }

    // 1. Update Monday status column
    const statusMutation = `mutation {
      change_column_value(
        board_id: ${boardId},
        item_id: ${mondayItemId},
        column_id: "status",
        value: "{\\"index\\": ${statusIndex}}"
      ) { id }
    }`

    const statusResult = await callMonday(statusMutation)
    if (statusResult.errors) {
      return NextResponse.json({ error: 'Status update failed', details: statusResult.errors }, { status: 500 })
    }

    // 2. Move item to the new group
    const moveMutation = `mutation {
      move_item_to_group(
        item_id: ${mondayItemId},
        group_id: "${groupId}"
      ) { id }
    }`

    const moveResult = await callMonday(moveMutation)
    if (moveResult.errors) {
      return NextResponse.json({ error: 'Group move failed', details: moveResult.errors }, { status: 500 })
    }

    // 3. Persist to Supabase
    const { error: updateError } = await getSupabase()
      .from('campaigns')
      .update({ status: statusLabel, group_title: newGroupTitle })
      .eq('id', campaignId)

    if (updateError) {
      return NextResponse.json({ error: 'Supabase update failed', details: updateError }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
  }
}
