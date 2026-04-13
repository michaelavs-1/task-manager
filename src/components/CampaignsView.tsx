'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Campaign = {
  id: string
  monday_item_id: string
  name: string
  status: string | null
  platforms: string | null
  project_name: string | null
  campaign_goal: string | null
  launch_date: string | null
  end_date: string | null
  campaign_type: string | null
  budget_amount: number | null
  notes: string | null
  requester: string | null
  group_title: string | null
  updated_at: string
  date_received: string | null
  schedule_type: string | null
  redirect_to: string | null
  dark_copy: string | null
  has_button: string | null
  button_type: string | null
  button_link: string | null
  budget_type: string | null
  budget_intensity: string | null
  needs_michael_call: string | null
  territory: string | null
  ad_number: string | null
  board: string
}

type BoardKey = 'universal' | 'barbie' | 'general'
type PixelRow = { id: string; artist_name: string; pixel_id: string }

const BOARDS: { key: BoardKey; label: string }[] = [
  { key: 'universal', label: 'קידומים יוניברסל' },
  { key: 'barbie', label: 'קידומים בארבי' },
  { key: 'general', label: 'שיווק אומנים כללי' },
]

const GROUP_BORDER: Record<string, string> = {
  'לא טופל': 'border-l-blue-500',
  'עלה לאוויר': 'border-l-emerald-500',
  'נגמר - ארכיון כל הקמפיינים': 'border-l-sky-400',
  'נגמר - דיסני': 'border-l-rose-400',
  'נגמר - אמני יוניברסל חתומים': 'border-l-purple-400',
  'נגמר - בארבי': 'border-l-pink-400',
}

const STATUS_CLS: Record<string, string> = {
  'חדש': 'bg-amber-100 text-amber-700',
  'עלה לאוויר': 'bg-emerald-100 text-emerald-700',
  'נגמר- ארכיון': 'bg-sky-100 text-sky-700',
}

const GROUP_ORDER = [
  'לא טופל',
  'עלה לאוויר',
  'נגמר - ארכיון כל הקמפיינים',
  'נגמר - דיסני',
  'נגמר - אמני יוניברסל חתומים',
  'נגמר - בארבי',
]

const FIELDS: [string, keyof Campaign][] = [
  ['סטאטוס', 'status'],
  ['מזמין', 'requester'],
  ['פלטפורמה', 'platforms'],
  ['פרויקט', 'project_name'],
  ['מטרת הקמפיין', 'campaign_goal'],
  ['סוג קמפיין', 'campaign_type'],
  ['תאריך עלייה', 'launch_date'],
  ['תאריך סיום', 'end_date'],
  ['הפנייה ל', 'redirect_to'],
  ['ניהול תקציב', 'budget_type'],
  ['עצימות תקציב', 'budget_intensity'],
  ['תקציב', 'budget_amount'],
  ['הוספת כפתור', 'has_button'],
  ['סוג כפתור', 'button_type'],
  ['לינק כפתור', 'button_link'],
  ['דגשים', 'notes'],
  ['טקסט קופי', 'dark_copy'],
  ['טריטוריה', 'territory'],
  ['שיחה עם מיכאל', 'needs_michael_call'],
]

function filterCampaigns(campaigns: Campaign[], board: BoardKey): Campaign[] {
  return campaigns.filter((c) => (c.board || 'universal') === board)
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedBoard, setSelectedBoard] = useState<BoardKey>('universal')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load campaigns
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: campaignsData, error } = await supabase
          .from('campaigns')
          .select('*')

        if (error) throw error
        setCampaigns(campaignsData || [])
      } catch (err) {
        console.error('Failed to load campaigns:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncError('')
    try {
      const res = await fetch('/api/sync-campaigns', { method: 'POST' })
      const data = await res.json()

      if (!data.success) {
        setSyncError(data.error || 'Sync failed')
        return
      }

      // Reload campaigns
      const { data: campaignsData, error } = await supabase
        .from('campaigns')
        .select('*')
      if (error) throw error
      setCampaigns(campaignsData || [])
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const filteredCampaigns = filterCampaigns(campaigns, selectedBoard)
  const grouped = filteredCampaigns.reduce(
    (acc, c) => {
      const group = c.group_title || 'לא טופל'
      if (!acc[group]) acc[group] = []
      acc[group].push(c)
      return acc
    },
    {} as Record<string, Campaign[]>
  )

  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) =>
      GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)
  )

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">קמפיינים</h1>
        <div className="flex items-center gap-3">
          {syncError && (
            <span className="text-sm text-red-500 font-medium">{syncError}</span>
          )}
          {selectedBoard === 'universal' && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                isSyncing
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isSyncing && (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isSyncing ? 'סנכרון...' : 'סנכרון'}
            </button>
          )}
        </div>
      </div>

      {/* Board Selector Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {BOARDS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSelectedBoard(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              selectedBoard === key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {sortedGroups.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium">אין קמפיינים בקטגוריה זו</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupTitle, items]) => (
            <GroupAccordion
              key={groupTitle}
              title={groupTitle}
              items={items}
              borderClass={GROUP_BORDER[groupTitle]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupAccordion({
  title,
  items,
  borderClass,
}: {
  title: string
  items: Campaign[]
  borderClass?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm ${borderClass ? `border-l-4 ${borderClass}` : ''}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900">{title}</span>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
            {items.length}
          </span>
        </div>
        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {items.map((item) => (
            <ItemAccordion key={item.id} campaign={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemAccordion({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = useState(false)

  const statusClass = STATUS_CLS[campaign.status || ''] || 'bg-gray-100 text-gray-700'

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass}`}>
            {campaign.status || 'ללא סטטוס'}
          </span>
          <span className="font-semibold text-gray-900 truncate">{campaign.name}</span>
        </div>
        <span className={`text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="px-5 py-4 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {FIELDS.map(([label, key]) => {
            const value = campaign[key]
            if (!value) return null

            return (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {label}
                </dt>
                <dd className="text-sm text-gray-700 mt-1 font-medium">
                  {String(value)}
                </dd>
              </div>
            )
          })}

          {campaign.monday_item_id && (
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
              <a
                href={`https://monday.com/boards/${campaign.monday_item_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                פתח ב-Monday.com
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
