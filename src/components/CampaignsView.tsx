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

const GROUP_DOT: Record<string, string> = {
  'לא טופל': 'bg-blue-500',
  'עלה לאוויר': 'bg-emerald-500',
  'נגמר - ארכיון כל הקמפיינים': 'bg-sky-400',
  'נגמר - דיסני': 'bg-rose-400',
  'נגמר - אמני יוניברסל חתומים': 'bg-purple-400',
  'נגמר - בארבי': 'bg-pink-400',
}

const STATUS_CLS: Record<string, string> = {
  'חדש': 'bg-amber-100 text-amber-700 border border-amber-200',
  'עלה לאוויר': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'נגמר- ארכיון': 'bg-sky-100 text-sky-700 border border-sky-200',
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
  const [pixels, setPixels] = useState<PixelRow[]>([])
  const [selectedBoard, setSelectedBoard] = useState<BoardKey>('universal')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [loading, setLoading] = useState(true)

  // Load campaigns and pixels
  useEffect(() => {
    const loadData = async () => {
      try {
        const [campaignsData, pixelsData] = await Promise.all([
          supabase.from('campaigns').select('*'),
          supabase.from('pixels').select('*'),
        ])

        if (campaignsData.error) throw campaignsData.error
        if (pixelsData.error) throw pixelsData.error

        setCampaigns(campaignsData.data || [])
        setPixels(pixelsData.data || [])
      } catch (err) {
        console.error('Failed to load data:', err)
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
    return <div className="p-8 text-center">טוען...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6 text-right">קמפיינים</h1>

        {/* Board Selector */}
        <div className="flex gap-2 mb-6 justify-end">
          {BOARDS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedBoard(key)}
              className={`px-4 py-2 rounded font-semibold transition ${
                selectedBoard === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sync Button (Universal Board Only) */}
        {selectedBoard === 'universal' && (
          <div className="flex items-center gap-4 justify-end mb-6">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`px-4 py-2 rounded font-semibold transition ${
                isSyncing
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSyncing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  סנכרון...
                </span>
              ) : (
                'סנכרון'
              )}
            </button>
            {syncError && (
              <span className="text-red-600 font-semibold">{syncError}</span>
            )}
          </div>
        )}
      </div>

      {/* Groups and Items */}
      {sortedGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          אין קמפיינים בקטגוריה זו
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupTitle, items]) => (
            <GroupAccordion
              key={groupTitle}
              title={groupTitle}
              items={items}
              dot={GROUP_DOT[groupTitle]}
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
  dot,
}: {
  title: string
  items: Campaign[]
  dot?: string
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 text-right flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
      >
        <span className="flex items-center gap-3">
          {dot && <div className={`w-4 h-4 rounded-full ${dot}`} />}
          <span className="font-semibold text-lg">{title}</span>
          <span className="text-sm text-gray-600">({items.length})</span>
        </span>
        <span className="text-gray-600">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="divide-y">
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

  const statusClass = STATUS_CLS[campaign.status || ''] || 'bg-gray-100 text-gray-700 border border-gray-200'

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 text-right flex items-center justify-between bg-white hover:bg-gray-50 transition border-b border-gray-200"
      >
        <span className="flex items-center gap-4 flex-1">
          <span className={`px-3 py-1 rounded text-sm font-medium ${statusClass}`}>
            {campaign.status || 'ללא סטטוס'}
          </span>
          <span className="font-semibold">{campaign.name}</span>
        </span>
        <span className="text-gray-600">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="px-6 py-4 bg-gray-50 space-y-3">
          {FIELDS.map(([label, key]) => {
            const value = campaign[key]
            if (!value) return null

            return (
              <div key={key} className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700">{label}:</span>
                <span className="text-gray-600 text-left flex-1 ml-4">
                  {String(value)}
                </span>
              </div>
            )
          })}

          {campaign.monday_item_id && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <a
                href={`https://monday.com/boards/${campaign.monday_item_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
              >
                פתח ב-Monday.com
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PixelsPanel({ pixels }: { pixels: PixelRow[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 text-right flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
      >
        <span className="font-semibold text-lg">פיקסלים</span>
        <span className="text-gray-600">
          {expanded ? '▼' : '▶'}
        </span>
      </button>

      {expanded && (
        <div className="px-6 py-4 space-y-3">
          {pixels.length === 0 ? (
            <p className="text-gray-500">אין פיקסלים</p>
          ) : (
            pixels.map((p) => (
              <div key={p.id} className="flex justify-between text-sm border-b pb-2">
                <span className="font-semibold">{p.artist_name}</span>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {p.pixel_id}
                </code>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
