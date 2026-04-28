"use client"

import { useState, useMemo, useEffect } from "react"
import { ARTIST_BOARD_MAP } from "@/lib/artist-config"
import type { ArtistEvent } from "@/lib/artist-config"

type ArtistEventWithArtist = ArtistEvent & { artistName: string }

const ARTIST_COLORS: Record<string, string> = {
  "ג'ימבו ג'יי": '#6366f1',
  "ג'ימבו ג'י":  '#6366f1',
  'אקו':         '#10b981',
  'מאור אשכנזי': '#f59e0b',
  'YUZ':         '#8b5cf6',
  'יוז':         '#8b5cf6',
  'אלי לוזון':   '#f43f5e',
}
const DEFAULT_COLOR = '#6b7280'

function getColor(name: string) { return ARTIST_COLORS[name] ?? DEFAULT_COLOR }

// Pipeline columns — based on סטטוס הופעה from Monday
const PIPELINE: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'option',   label: 'אופציה',        color: '#3b82f6', bg: '#eff6ff' },
  { key: 'strong',   label: 'אופציה חזקה',   color: '#6366f1', bg: '#eef2ff' },
  { key: 'new',      label: 'חדש / לבחינה',  color: '#f59e0b', bg: '#fffbeb' },
  { key: 'confirmed',label: 'קורה',           color: '#10b981', bg: '#f0fdf4' },
  { key: 'dropped',  label: 'ירד',            color: '#ef4444', bg: '#fef2f2' },
]

function classifyStatus(status: string | null): string {
  const s = (status ?? '').toLowerCase()
  if (s.includes('אופציה חזקה') || s.includes('strong')) return 'strong'
  if (s.includes('אופציה'))     return 'option'
  if (s.includes('חדש') || s.includes('לבחינה')) return 'new'
  if (s.includes('קורה') || s.includes('confirm')) return 'confirmed'
  if (s.includes('ירד') || s.includes('בוטל') || s.includes('cancel')) return 'dropped'
  return 'new'
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y?.slice(2)}`
}

function canonicalName(boardId: string): string {
  const entries = Object.entries(ARTIST_BOARD_MAP).filter(([, b]) => b === boardId)
  return entries.reduce((s, [n]) => n.length < s.length ? n : s, entries[0][0])
}

export function BookingView() {
  const [events, setEvents] = useState<ArtistEventWithArtist[]>([])
  const [hasCache, setHasCache] = useState(false)
  const [filterArtist, setFilterArtist] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('event_board_cache')
      if (raw) {
        const data = JSON.parse(raw) as ArtistEventWithArtist[]
        // Only upcoming events (no date = show anyway, past = hide)
        const today = new Date().toISOString().split('T')[0]
        setEvents(data.filter(e => !e.date || e.date >= today))
        setHasCache(true)
      }
    } catch { /* ignore */ }
  }, [])

  const artists = useMemo(() => {
    const seen = new Set<string>()
    const seen2 = new Set<string>()
    const result: { boardId: string; name: string }[] = []
    for (const [name, boardId] of Object.entries(ARTIST_BOARD_MAP)) {
      if (!seen.has(boardId)) { seen.add(boardId); seen2.add(name) }
      else { seen2.add(name) }
    }
    for (const [name, boardId] of Object.entries(ARTIST_BOARD_MAP)) {
      const canonical = canonicalName(boardId)
      if (!result.find(r => r.boardId === boardId)) result.push({ boardId, name: canonical })
    }
    return result
  }, [])

  const filtered = useMemo(() => {
    let list = events
    if (filterArtist !== 'all') list = list.filter(e => e.artistName === filterArtist)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.artistName.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [events, filterArtist, search])

  // Group by pipeline stage
  const grouped = useMemo(() => {
    const map: Record<string, ArtistEventWithArtist[]> = {}
    PIPELINE.forEach(p => { map[p.key] = [] })
    filtered.forEach(e => {
      const key = classifyStatus(e.status)
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [filtered])

  const total = filtered.length
  const confirmed = grouped['confirmed']?.length ?? 0

  if (!hasCache) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
      <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-sm">כדי לראות פה נתונים, סנכרן קודם את לוח הפעילות</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">בוקינג</h1>
            <p className="text-sm text-gray-400 mt-0.5">פייפליין הופעות עתידיות</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400"><b className="text-gray-700">{total}</b> הופעות</span>
            <span className="bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full text-xs">{confirmed} קורה</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Artist tabs */}
          <button onClick={() => setFilterArtist('all')}
            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filterArtist === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
            כולם
          </button>
          {artists.map(a => (
            <button key={a.boardId} onClick={() => setFilterArtist(filterArtist === a.name ? 'all' : a.name)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filterArtist === a.name ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              style={filterArtist === a.name ? { background: getColor(a.name) } : undefined}>
              {a.name}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש אירוע..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40 mr-auto" />
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="flex-1 overflow-x-auto px-4 py-4">
        <div className="flex gap-4 h-full min-w-max">
          {PIPELINE.map(col => {
            const items = grouped[col.key] ?? []
            return (
              <div key={col.key} className="flex flex-col w-72 flex-shrink-0">
                {/* Column header */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl mb-2" style={{ background: col.bg }}>
                  <span className="text-sm font-semibold" style={{ color: col.color }}>{col.label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: col.color }}>{items.length}</span>
                </div>
                {/* Cards */}
                <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                  {items.length === 0 && (
                    <div className="text-center py-8 text-gray-200 text-xs">אין הופעות</div>
                  )}
                  {items.map(ev => {
                    const isExpanded = expandedId === ev.id
                    const color = getColor(ev.artistName)
                    return (
                      <div key={ev.id}
                        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                        style={{ borderRight: `3px solid ${color}` }}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{ev.name}</p>
                          <span className="text-xs font-mono text-gray-400 whitespace-nowrap flex-shrink-0">{fmtDate(ev.date)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ background: color }}>{ev.artistName}</span>
                          {ev.event_type && <span className="text-xs text-gray-400">{ev.event_type}</span>}
                        </div>
                        {ev.location && <p className="text-xs text-gray-400 mt-1 truncate">📍 {ev.location}</p>}
                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-500">
                            {ev.contract_status && <p>📄 {ev.contract_status}</p>}
                            {ev.start_time && <p>🕐 {ev.start_time}</p>}
                            {ev.audience_count && <p>👥 {ev.audience_count} קהל</p>}
                            {ev.total_revenue && <p className="text-emerald-600 font-medium">₪{parseFloat(ev.total_revenue).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</p>}
                            {ev.details && <p className="text-gray-400 whitespace-pre-wrap">{ev.details}</p>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
