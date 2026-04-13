'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'
import { ARTIST_BOARD_MAP, type ArtistEvent } from '@/app/api/artist-events/route'

type ArtistTab = 'events' | 'campaigns' | 'tasks'

type Campaign = {
  id: string
  campaign_name: string
  status: string | null
  platforms: string | null
  launch_date: string | null
  end_date: string | null
  project_name: string | null
  board: string
}

type Project = {
  id: string
  name: string
  category: string
}

const STATUS_COLORS: Record<string, string> = {
  'קורה': 'bg-green-100 text-green-800',
  'אופציה חזקה': 'bg-orange-100 text-orange-800',
  'אופציה': 'bg-yellow-100 text-yellow-700',
  'חדש - לבחינה': 'bg-pink-100 text-pink-700',
  'ירד': 'bg-red-100 text-red-700',
}

function fmtNumber(val: string | null): string {
  if (!val) return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return '—'
  return n.toLocaleString('he-IL', { maximumFractionDigits: 0 })
}

function fmtDate(val: string | null): string {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return val }
}

function isUpcoming(date: string | null): boolean {
  if (!date) return false
  return date >= new Date().toISOString().split('T')[0]
}

export function ArtistDashboardView({ tasks }: { tasks: Task[] }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Project | null>(null)
  const [tab, setTab] = useState<ArtistTab>('events')
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [showPastEvents, setShowPastEvents] = useState(false)

  useEffect(() => {
    supabase.from('projects').select('*').order('category').order('name').then(({ data }) => {
      if (data) {
        setProjects(data as Project[])
        const firstArtist = (data as Project[]).find(p => p.category === 'artist')
        if (firstArtist) setSelectedArtist(firstArtist)
      }
    })
  }, [])

  const loadEvents = useCallback(async (artist: Project) => {
    const boardId = ARTIST_BOARD_MAP[artist.name]
    if (!boardId) { setEvents([]); return }
    setLoadingEvents(true)
    setEventsError('')
    try {
      const resp = await fetch(`/api/artist-events?boardId=${boardId}`)
      const data = await resp.json()
      if (data.error) { setEventsError(data.error); setEvents([]) }
      else setEvents(data.events || [])
    } catch (e) {
      setEventsError(String(e))
    } finally {
      setLoadingEvents(false)
    }
  }, [])

  const loadCampaigns = useCallback(async (artist: Project) => {
    const { data } = await supabase
      .from('campaigns')
      .select('id, campaign_name, status, platforms, launch_date, end_date, project_name, board')
      .eq('board', 'universal')
      .ilike('project_name', `%${artist.name}%`)
      .order('launch_date', { ascending: false })
    setCampaigns((data as Campaign[]) || [])
  }, [])

  useEffect(() => {
    if (!selectedArtist) return
    loadEvents(selectedArtist)
    loadCampaigns(selectedArtist)
  }, [selectedArtist, loadEvents, loadCampaigns])

  const artists = projects.filter(p => p.category === 'artist')
  const productions = projects.filter(p => p.category === 'production')

  const artistTasks = selectedArtist
    ? tasks.filter(t => t.project === selectedArtist.name)
    : []

  const hasBoardData = selectedArtist ? !!ARTIST_BOARD_MAP[selectedArtist.name] : false

  const upcomingEvents = events.filter(e => isUpcoming(e.date) && e.status !== 'ירד')
  const pastEvents = events.filter(e => !isUpcoming(e.date) && e.status !== 'ירד')
  const confirmedEvents = upcomingEvents.filter(e => e.status === 'קורה')
  const totalRevenue = pastEvents.reduce((s, e) => s + parseFloat(e.total_revenue || '0'), 0)
  const totalProfit = pastEvents.reduce((s, e) => s + parseFloat(e.net_profit || '0'), 0)
  const artistTotal = pastEvents.reduce((s, e) => s + parseFloat(e.artist_share || '0'), 0)

  const SectionTitle = ({ label }: { label: string }) => (
    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{label}</h3>
  )

  return (
    <div className="flex h-full">
      {/* Artist Sidebar */}
      <div className="w-52 flex-shrink-0 bg-slate-50 border-l border-slate-200 overflow-y-auto p-3">
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">אומנים</p>
          {artists.map(a => (
            <button
              key={a.id}
              onClick={() => { setSelectedArtist(a); setTab('events') }}
              className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                selectedArtist?.id === a.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>
        {productions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">הפקות</p>
            {productions.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedArtist(p); setTab('tasks') }}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                  selectedArtist?.id === p.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedArtist ? (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{selectedArtist.name}</h2>
              <p className="text-sm text-slate-400 mt-1">
                {selectedArtist.category === 'artist' ? 'אומן' : 'הפקה'}
                {hasBoardData ? '' : ' · אין נתוני לוח אירועים'}
              </p>
            </div>

            {/* Stats Row */}
            {hasBoardData && (
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-right">
                  <div className="text-2xl font-bold text-slate-800">{upcomingEvents.length}</div>
                  <div className="text-xs text-slate-500 mt-0.5">הופעות קרובות</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-right">
                  <div className="text-2xl font-bold text-green-600">{confirmedEvents.length}</div>
                  <div className="text-xs text-slate-500 mt-0.5">מאושרות</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-right">
                  <div className="text-2xl font-bold text-blue-600">₪{fmtNumber(String(totalRevenue))}</div>
                  <div className="text-xs text-slate-500 mt-0.5">הכנסות (עבר)</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-right">
                  <div className="text-2xl font-bold text-indigo-600">₪{fmtNumber(String(artistTotal))}</div>
                  <div className="text-xs text-slate-500 mt-0.5">רווח אומן (עבר)</div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-5 border-b border-slate-200">
              {([
                { id: 'events', label: 'אירועים', show: hasBoardData },
                { id: 'campaigns', label: `קמפיינים (${campaigns.length})`, show: true },
                { id: 'tasks', label: `משימות (${artistTasks.length})`, show: true },
              ] as { id: ArtistTab; label: string; show: boolean }[]).filter(t => t.show).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    tab === t.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Events Tab */}
            {tab === 'events' && hasBoardData && (
              <div>
                {loadingEvents ? (
                  <div className="text-center py-10 text-slate-400">טוען אירועים...</div>
                ) : eventsError ? (
                  <div className="text-center py-10 text-red-500 text-sm">{eventsError}</div>
                ) : (
                  <>
                    {upcomingEvents.length > 0 && (
                      <div className="mb-6">
                        <SectionTitle label="הופעות קרובות" />
                        <div className="space-y-2">
                          {upcomingEvents.map(event => (
                            <EventRow key={event.id} event={event} />
                          ))}
                        </div>
                      </div>
                    )}

                    {pastEvents.length > 0 && (
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <SectionTitle label={`הופעות עבר (${pastEvents.length})`} />
                          <button
                            onClick={() => setShowPastEvents(!showPastEvents)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 mb-3"
                          >
                            {showPastEvents ? 'הסתר' : 'הצג'}
                          </button>
                        </div>
                        {showPastEvents && (
                          <div className="space-y-2">
                            {pastEvents.map(event => (
                              <EventRow key={event.id} event={event} showFinancials />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {upcomingEvents.length === 0 && pastEvents.length === 0 && (
                      <div className="text-center py-10 text-slate-400">אין אירועים</div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Campaigns Tab */}
            {tab === 'campaigns' && (
              <div>
                {campaigns.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">אין קמפיינים</div>
                ) : (
                  <div className="space-y-2">
                    {campaigns.map(c => (
                      <div key={c.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{c.campaign_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{c.platforms || '—'} · {fmtDate(c.launch_date)}</p>
                        </div>
                        {c.status && (
                          <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">{c.status}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {tab === 'tasks' && (
              <div>
                {artistTasks.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">אין משימות</div>
                ) : (
                  <div className="space-y-2">
                    {artistTasks.map(task => (
                      <div key={task.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800 text-sm">{task.title}</p>
                          <span className={`text-xs px-2 py-1 rounded-lg ${
                            task.status === 'completed' ? 'bg-green-100 text-green-700'
                            : task.status === 'in_progress' ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {task.status === 'completed' ? 'הושלמה' : task.status === 'in_progress' ? 'בביצוע' : 'ממתינה'}
                          </span>
                        </div>
                        {task.description && <p className="text-xs text-slate-400 mt-1">{task.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">בחר אומן</div>
        )}
      </div>
    </div>
  )
}

function EventRow({ event, showFinancials = false }: { event: ArtistEvent; showFinancials?: boolean }) {
  const statusColor = STATUS_COLORS[event.status || ''] || 'bg-gray-100 text-gray-600'
  const isCancelled = event.status === 'ירד'

  return (
    <div className={`bg-white border border-slate-100 rounded-xl px-4 py-3 ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-slate-800 text-sm">{event.name}</p>
            {event.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{event.status}</span>
            )}
            {event.event_type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{event.event_type}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
            {event.date && <span>{new Date(event.date).toLocaleDateString('he-IL')}</span>}
            {event.location && <span>{event.location}</span>}
            {event.start_time && <span>{event.start_time}</span>}
            {event.audience_count && <span>{event.audience_count} קהל</span>}
          </div>
          {showFinancials && (event.total_revenue || event.net_profit) && (
            <div className="flex gap-4 mt-2 text-xs">
              {event.total_revenue && <span className="text-blue-600">הכנסות: ₪{parseFloat(event.total_revenue).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>}
              {event.net_profit && <span className="text-green-600">רווח: ₪{parseFloat(event.net_profit).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>}
              {event.artist_share && <span className="text-indigo-600">אומן: ₪{parseFloat(event.artist_share).toLocaleString('he-IL', { maximumFractionDigits: 0 })}</span>}
            </div>
          )}
        </div>
        {event.contract_status && (
          <span className={`text-xs px-2 py-1 rounded-lg flex-shrink-0 ${
            event.contract_status === 'חוזה נחתם' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {event.contract_status}
          </span>
        )}
      </div>
    </div>
  )
}
