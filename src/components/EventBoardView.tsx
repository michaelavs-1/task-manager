"use client"

import { useState, useEffect, useMemo } from "react"
import { ARTIST_BOARD_MAP, type ArtistEvent } from "@/lib/artist-config"

// ── Types ──────────────────────────────────────────────────────────────────
interface ArtistEventWithArtist extends ArtistEvent {
  artistName: string
}

type ViewMode = 'list' | 'calendar'

// ── Constants ─────────────────────────────────────────────────────────────
const HEBREW_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
]

const HEBREW_DAYS_SHORT = ['א','ב','ג','ד','ה','ו','ש']  // Sun–Sat

// Artist → color palette
const ARTIST_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "ג'ימבו ג'יי": { bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500'  },
  "ג'ימבו ג'י":  { bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-500'  },
  'אקו':          { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  'מאור אשכנזי':  { bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500'  },
  'YUZ':          { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500'  },
  'יוז':          { bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-500'  },
  'אלי לוזון':    { bg: 'bg-rose-100',    text: 'text-rose-800',    dot: 'bg-rose-500'    },
}
const DEFAULT_COLOR = { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' }

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y?.slice(2)}`
}

function fmtTime(t: string | null) {
  if (!t) return null
  try {
    const parsed = JSON.parse(t)
    const h = String(parsed.hour ?? '').padStart(2, '0')
    const min = String(parsed.minute ?? '0').padStart(2, '0')
    return `${h}:${min}`
  } catch { return t }
}

function fmtNum(val: string | null) {
  if (!val) return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function statusStyle(s: string | null) {
  const v = (s ?? '').toLowerCase()
  if (v.includes('מאושר') || v.includes('חתום') || v.includes('confirm')) return 'bg-emerald-100 text-emerald-700'
  if (v.includes('בטל') || v.includes('cancel')) return 'bg-red-100 text-red-600'
  if (v.includes('ממתין') || v.includes('pending') || v.includes('לא חתום')) return 'bg-amber-100 text-amber-700'
  if (v.includes('עבר') || v.includes('הסתיים')) return 'bg-gray-100 text-gray-500'
  return 'bg-indigo-100 text-indigo-700'
}

function isUpcoming(date: string | null) {
  if (!date) return false
  return date >= new Date().toISOString().split('T')[0]
}

function isPast(date: string | null) {
  if (!date) return false
  return date < new Date().toISOString().split('T')[0]
}

function uniqueArtists() {
  const seen = new Set<string>()
  const result: { label: string; key: string; boardId: string }[] = []
  for (const [name, boardId] of Object.entries(ARTIST_BOARD_MAP)) {
    if (!seen.has(boardId)) {
      seen.add(boardId)
      result.push({ label: name, key: boardId, boardId })
    }
  }
  return result
}

function canonicalName(boardId: string): string {
  const entries = Object.entries(ARTIST_BOARD_MAP).filter(([, b]) => b === boardId)
  return entries.reduce((shortest, [name]) => name.length < shortest.length ? name : shortest, entries[0][0])
}

function artistColor(name: string) {
  return ARTIST_COLORS[name] ?? DEFAULT_COLOR
}

// Build calendar grid (42 cells, Sun=0)
function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()  // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

// ── CalendarView ─────────────────────────────────────────────────────────
function CalendarView({ events, today }: { events: ArtistEventWithArtist[]; today: string }) {
  const [year, setYear]   = useState(() => parseInt(today.split('-')[0]))
  const [month, setMonth] = useState(() => parseInt(today.split('-')[1]) - 1)
  const [popover, setPopover] = useState<ArtistEventWithArtist | null>(null)

  const cells = useMemo(() => buildCalendarDays(year, month), [year, month])

  // Map iso-date → events
  const eventsByDate = useMemo(() => {
    const map: Record<string, ArtistEventWithArtist[]> = {}
    events.forEach(ev => {
      if (!ev.date) return
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    })
    return map
  }, [events])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const todayStr = today

  return (
    <div className="flex flex-col h-full select-none" onClick={() => setPopover(null)}>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-2 pb-3">
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-base font-bold text-gray-800">{HEBREW_MONTHS[month]} {year}</h2>
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {HEBREW_DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
        {cells.map((day, idx) => {
          if (day === null) return <div key={idx} className="bg-gray-50/50 min-h-[80px]" />
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayEvents = eventsByDate[iso] || []
          const isToday = iso === todayStr
          const pastDay = iso < todayStr

          return (
            <div
              key={idx}
              className={`relative min-h-[80px] p-1.5 flex flex-col ${isToday ? 'bg-indigo-50' : pastDay ? 'bg-white' : 'bg-white'}`}
              onClick={e => e.stopPropagation()}
            >
              {/* Day number */}
              <span className={`text-xs font-semibold mb-1 self-end w-5 h-5 flex items-center justify-center rounded-full ${
                isToday ? 'bg-indigo-600 text-white' : pastDay ? 'text-gray-300' : 'text-gray-500'
              }`}>
                {day}
              </span>

              {/* Event chips */}
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => {
                  const c = artistColor(ev.artistName)
                  return (
                    <button
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); setPopover(p => p?.id === ev.id ? null : ev) }}
                      className={`text-left w-full rounded px-1 py-0.5 text-[10px] font-medium truncate transition-opacity ${c.bg} ${c.text} ${pastDay ? 'opacity-50' : ''} hover:opacity-80`}
                      title={ev.name}
                    >
                      {ev.name}
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400 pr-1">+{dayEvents.length - 3} עוד</span>
                )}
              </div>

              {/* Popover */}
              {popover && dayEvents.some(e => e.id === popover.id) && (
                <div
                  className="absolute z-30 top-full right-0 mt-1 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 text-xs space-y-2"
                  onClick={e => e.stopPropagation()}
                  style={{ minWidth: '220px' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-gray-900 leading-tight">{popover.name}</p>
                    <button onClick={() => setPopover(null)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">✕</button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${artistColor(popover.artistName).dot}`} />
                    <span className="text-indigo-600 font-medium">{popover.artistName}</span>
                  </div>
                  {popover.status && (
                    <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${statusStyle(popover.status)}`}>{popover.status}</span>
                  )}
                  <div className="space-y-1 text-gray-500">
                    {popover.location && <div>📍 {popover.location}</div>}
                    {fmtTime(popover.start_time) && <div>🕐 {fmtTime(popover.start_time)}</div>}
                    {popover.event_type && <div>🎭 {popover.event_type}</div>}
                    {popover.total_revenue && <div className="text-emerald-600 font-medium">₪{fmtNum(popover.total_revenue)}</div>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── EventBoardView ─────────────────────────────────────────────────────────
export function EventBoardView() {
  const artists = useMemo(() => uniqueArtists(), [])

  const [events, setEvents] = useState<ArtistEventWithArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Filters
  const [filterArtist, setFilterArtist] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [search, setSearch] = useState('')

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  // ── Fetch ──────────────────────────────────────────────────────────────
  function loadAll() {
    setLoading(true)
    setError(null)
    Promise.allSettled(
      artists.map(a =>
        fetch(`/api/artist-events?boardId=${a.boardId}`)
          .then(r => r.json())
          .then(data => {
            const name = canonicalName(a.boardId)
            return (data.events || []).map((ev: ArtistEvent) => ({ ...ev, artistName: name }))
          })
      )
    ).then(results => {
      const all: ArtistEventWithArtist[] = []
      results.forEach(r => { if (r.status === 'fulfilled') all.push(...r.value) })
      all.sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date.localeCompare(b.date)
      })
      setEvents(all)
    }).catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ───────────────────────────────────────────────────────
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    events.forEach(e => {
      if (e.date) { const [y, m] = e.date.split('-'); months.add(`${y}-${m}`) }
    })
    return Array.from(months).sort()
  }, [events])

  const filtered = useMemo(() => {
    let list = events
    if (filterArtist !== 'all') list = list.filter(e => e.artistName === filterArtist)
    if (filterMonth !== 'all') list = list.filter(e => e.date?.startsWith(filterMonth))
    if (filterStatus !== 'all') list = list.filter(e => (e.status ?? '') === filterStatus)
    if (filterPeriod === 'upcoming') list = list.filter(e => isUpcoming(e.date) || !e.date)
    if (filterPeriod === 'past') list = list.filter(e => isPast(e.date))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.artistName.toLowerCase().includes(q) ||
        (e.location ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [events, filterArtist, filterMonth, filterStatus, filterPeriod, search])

  const statuses = useMemo(() => {
    const s = new Set(events.map(e => e.status ?? '').filter(Boolean))
    return Array.from(s).sort()
  }, [events])

  const upcoming = events.filter(e => e.date && e.date >= today)
  const past     = events.filter(e => e.date && e.date < today)
  const totalRevenue = events.reduce((sum, e) => {
    const n = parseFloat(e.total_revenue ?? '0')
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-gray-50" dir="rtl">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">

        {/* Title + view toggle + refresh */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">לוח פעילות</h1>
            <p className="text-sm text-gray-400 mt-0.5">כלל האירועים של האומנים</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                title="תצוגת רשימה"
                className={`px-3 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                title="תצוגת יומן"
                className={`px-3 py-1.5 transition-colors ${viewMode === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <button
              onClick={loadAll}
              className="text-xs text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              רענן
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'כלל האירועים', value: events.length,  color: 'text-gray-900' },
            { label: 'עתידיים',      value: upcoming.length, color: 'text-indigo-600' },
            { label: 'עברו',         value: past.length,     color: 'text-gray-400' },
            { label: 'הכנסות כוללות', value: `₪${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-emerald-600' },
          ].map(k => (
            <div key={k.label} className="bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
              <p className="text-xs text-gray-400">{k.label}</p>
              <p className={`text-lg font-bold ${k.color}`}>{loading ? '—' : k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters — hidden in calendar mode */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(['upcoming','all','past'] as const).map(p => (
                <button key={p} onClick={() => setFilterPeriod(p)}
                  className={`px-3 py-1.5 font-medium transition-colors ${filterPeriod === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
                  {p === 'upcoming' ? 'עתידיים' : p === 'past' ? 'עברו' : 'הכל'}
                </button>
              ))}
            </div>

            <select value={filterArtist} onChange={e => setFilterArtist(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="all">כל האומנים</option>
              {artists.map(a => <option key={a.boardId} value={canonicalName(a.boardId)}>{canonicalName(a.boardId)}</option>)}
            </select>

            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="all">כל החודשים</option>
              {availableMonths.map(ym => {
                const [y, m] = ym.split('-')
                return <option key={ym} value={ym}>{HEBREW_MONTHS[parseInt(m) - 1]} {y}</option>
              })}
            </select>

            {/* Status quick buttons */}
            {statuses.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filterStatus === 'all' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600'}`}
                >
                  הכל
                </button>
                {statuses.map(s => {
                  const active = filterStatus === s
                  // Pick a pill color based on status text
                  const v = s.toLowerCase()
                  const color = v.includes('קורה') ? (active ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100')
                    : v.includes('אופציה חזקה') ? (active ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100')
                    : v.includes('אופציה') ? (active ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100')
                    : v.includes('ירד') || v.includes('בטל') ? (active ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')
                    : v.includes('חדש') || v.includes('לבחינה') ? (active ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100')
                    : active ? 'bg-gray-600 text-white border-gray-600' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                  return (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(active ? 'all' : s)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${color}`}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            )}

            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש אירוע / מיקום..."
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 w-44" />

            {filtered.length !== events.length && (
              <span className="text-xs text-gray-400 mr-auto">{filtered.length} מתוך {events.length}</span>
            )}
          </div>
        )}

        {/* Artist legend (calendar mode) */}
        {viewMode === 'calendar' && !loading && (
          <div className="flex flex-wrap gap-2">
            {artists.map(a => {
              const name = canonicalName(a.boardId)
              const c = artistColor(name)
              return (
                <span key={a.boardId} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {loading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-sm text-gray-400">טוען אירועים מכל הלוחות...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">שגיאה: {error}</div>
        )}

        {/* ── Calendar view ── */}
        {!loading && !error && viewMode === 'calendar' && (
          <CalendarView events={filtered.length < events.length ? filtered : events} today={today} />
        )}

        {/* ── List view ── */}
        {!loading && !error && viewMode === 'list' && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
            <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">לא נמצאו אירועים</p>
          </div>
        )}

        {!loading && !error && viewMode === 'list' && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 w-28">תאריך</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400">שם האירוע</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 w-28">אומן</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 w-32">מיקום</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 w-24">שעה</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 w-28">סטטוס</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 w-28">הכנסה</th>
                  <th className="w-6 px-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev, i) => {
                  const isToday = ev.date === today
                  const expanded = expandedId === ev.id
                  const rowBg = isToday ? 'bg-indigo-50'
                    : isPast(ev.date) ? 'bg-white opacity-60'
                    : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                  const c = artistColor(ev.artistName)

                  return (
                    <>
                      <tr key={ev.id}
                        className={`border-b border-gray-50 cursor-pointer hover:bg-indigo-50/40 transition-colors ${rowBg}`}
                        onClick={() => setExpandedId(expanded ? null : ev.id)}
                      >
                        <td className="px-4 py-3 text-gray-700 font-mono text-xs whitespace-nowrap">
                          {isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 mb-0.5" />}
                          {fmtDate(ev.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{ev.name}</span>
                          {ev.event_type && <span className="mr-2 text-xs text-gray-400">{ev.event_type}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{ev.artistName}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[7rem]">{ev.location || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs font-mono">{fmtTime(ev.start_time) ?? '—'}</td>
                        <td className="px-4 py-3">
                          {ev.status
                            ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle(ev.status)}`}>{ev.status}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-emerald-600">
                          {ev.total_revenue ? `₪${fmtNum(ev.total_revenue)}` : '—'}
                        </td>
                        <td className="px-2 py-3 text-gray-300">
                          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      {expanded && (
                        <tr key={`${ev.id}-exp`} className="border-b border-gray-100 bg-indigo-50/30">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <DetailCell label="סיום"        value={fmtTime(ev.end_time)} />
                              <DetailCell label="סאונדצ׳ק"   value={fmtTime(ev.soundcheck_time)} />
                              <DetailCell label="סוג קהל"    value={ev.audience_type} />
                              <DetailCell label="כמות קהל"   value={fmtNum(ev.audience_count)} />
                              <DetailCell label="מחיר כרטיס" value={ev.ticket_price ? `₪${fmtNum(ev.ticket_price)}` : null} />
                              <DetailCell label="כמות כרטיסים" value={fmtNum(ev.ticket_count)} />
                              <DetailCell label="הוצאות"     value={ev.total_expenses ? `₪${fmtNum(ev.total_expenses)}` : null} />
                              <DetailCell label="רווח נקי"   value={ev.net_profit ? `₪${fmtNum(ev.net_profit)}` : null} />
                              <DetailCell label="חוזה"       value={ev.contract_status} />
                              {ev.details && (
                                <div className="col-span-3">
                                  <span className="text-gray-400 block mb-1">פרטים</span>
                                  <span className="text-gray-700">{ev.details}</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-gray-400 block">{label}</span>
      <span className="text-gray-700 font-medium">{value ?? '—'}</span>
    </div>
  )
}
