'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'
import { ARTIST_BOARD_MAP, type ArtistEvent } from '@/lib/artist-config'

type ArtistTab = 'overview' | 'shows' | 'tasks' | 'meetings' | 'links' | 'financial' | 'campaigns'
type Project = {
  id: string; name: string; category: string
  status?: string; genre?: string; audience?: string
  contact_name?: string; contact_phone?: string; contact_email?: string
  monthly_revenue_target?: number
}
type MeetingNote = { id: string; artist_name: string; title: string; content: string; meeting_date: string; created_at: string }
type ArtistLink = { id: string; artist_name: string; title: string; url: string; category: string; created_at: string }
type ArtistCampaign = { id: string; name: string; status: string | null; group_title: string | null; launch_date: string | null; platforms: string | null }

const STATUS_COLORS: Record<string, string> = {
  'קורה': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'אופציה חזקה': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'אופציה': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  'חדש - לבחינה': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
  'ירד': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

const ARTIST_STATUSES: { key: string; label: string; color: string; dot: string }[] = [
  { key: 'prospect',   label: 'Prospect / בפיתוח',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       dot: 'bg-slate-400' },
  { key: 'signing',    label: 'חתימה / משא ומתן',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',       dot: 'bg-amber-400' },
  { key: 'active',     label: 'Active',                  color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',       dot: 'bg-green-500' },
  { key: 'growth',     label: 'Growth Mode',             color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',          dot: 'bg-blue-500' },
  { key: 'release',    label: 'Album / Release Cycle',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',  dot: 'bg-purple-500' },
  { key: 'touring',    label: 'Touring',                 color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',  dot: 'bg-indigo-500' },
  { key: 'dormant',    label: 'Dormant',                 color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',             dot: 'bg-red-400' },
]
function getArtistStatus(key?: string) { return ARTIST_STATUSES.find(s => s.key === key) || ARTIST_STATUSES[0] }

const LINK_CATS = ['כללי', 'חוזה', 'רידר', 'מדיה', 'פייסבוק', 'אינסטרגרם', 'ספוטיפיי', 'יוטיוב', 'אחר']

const TAB_DEFS: { id: ArtistTab; label: string; icon: string }[] = [
  { id: 'overview',   label: 'סקירה כללית',    icon: '⚡' },
  { id: 'shows',      label: 'הופעות',          icon: '🎤' },
  { id: 'tasks',      label: 'משימות',          icon: '✅' },
  { id: 'campaigns',  label: 'קמפיינים',        icon: '📣' },
  { id: 'meetings',   label: 'פגישות',          icon: '📝' },
  { id: 'links',      label: 'קישורים',         icon: '🔗' },
  { id: 'financial',  label: 'פיננסים',         icon: '💰' },
]

function fmtNum(v: string | null) { if (!v) return '—'; const n = parseFloat(v); return isNaN(n) ? '—' : n.toLocaleString('he-IL', { maximumFractionDigits: 0 }) }
function fmtDate(v: string | null) { if (!v) return '—'; try { return new Date(v).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return v } }
function isUpcoming(d: string | null) { return !!d && d >= new Date().toISOString().split('T')[0] }

export function ArtistDashboardView({ tasks, initialArtist }: { tasks: Task[]; initialArtist?: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Project | null>(null)
  const [tab, setTab] = useState<ArtistTab>('overview')
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [meetings, setMeetings] = useState<MeetingNote[]>([])
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0])
  const [meetingContent, setMeetingContent] = useState('')
  const [savingMeeting, setSavingMeeting] = useState(false)
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<ArtistCampaign[]>([])
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaGenre, setMetaGenre] = useState('')
  const [metaAudience, setMetaAudience] = useState('')
  const [metaContactName, setMetaContactName] = useState('')
  const [metaContactPhone, setMetaContactPhone] = useState('')
  const [metaRevenueTarget, setMetaRevenueTarget] = useState('')
  const [links, setLinks] = useState<ArtistLink[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkCategory, setLinkCategory] = useState(LINK_CATS[0])
  const [savingLink, setSavingLink] = useState(false)

  useEffect(() => {
    supabase.from('projects').select('*').order('category').order('name').then(({ data }) => {
      if (data) {
        setProjects(data as Project[])
        if (!initialArtist) { const first = (data as Project[]).find(p => p.category === 'artist'); if (first) setSelectedArtist(first) }
      }
    })
  }, [])

  useEffect(() => {
    if (!initialArtist || projects.length === 0) return
    const match = projects.find(p => p.name === initialArtist)
    if (match) { setSelectedArtist(match); setTab('tasks') }
  }, [initialArtist, projects])

  const loadEvents = useCallback(async (artist: Project) => {
    const boardId = ARTIST_BOARD_MAP[artist.name]
    if (!boardId) { setEvents([]); return }
    setLoadingEvents(true); setEventsError('')
    try {
      const resp = await fetch(`/api/artist-events?boardId=${boardId}`)
      const data = await resp.json()
      if (data.error) { setEventsError(data.error); setEvents([]) } else setEvents(data.events || [])
    } catch (e) { setEventsError(String(e)) } finally { setLoadingEvents(false) }
  }, [])

  const loadMeetings = useCallback(async (artist: Project) => {
    setLoadingMeetings(true)
    const { data } = await supabase.from('artist_meeting_notes').select('*').eq('artist_name', artist.name).order('meeting_date', { ascending: false })
    setMeetings((data as MeetingNote[]) || [])
    setLoadingMeetings(false)
  }, [])

  const loadLinks = useCallback(async (artist: Project) => {
    setLoadingLinks(true)
    const { data } = await supabase.from('artist_links').select('*').eq('artist_name', artist.name).order('category').order('created_at', { ascending: false })
    setLinks((data as ArtistLink[]) || [])
    setLoadingLinks(false)
  }, [])

  const loadCampaigns = useCallback(async (artist: Project) => {
    const { data } = await supabase.from('campaigns').select('id,name,status,group_title,launch_date,platforms').eq('requester', artist.name).order('launch_date', { ascending: false })
    setCampaigns((data as ArtistCampaign[]) || [])
  }, [])

  const updateArtistStatus = async (artist: Project, newStatus: string) => {
    await supabase.from('projects').update({ status: newStatus }).eq('id', artist.id)
    setProjects(prev => prev.map(p => p.id === artist.id ? { ...p, status: newStatus } : p))
    setSelectedArtist(prev => prev ? { ...prev, status: newStatus } : prev)
  }

  const saveMeta = async () => {
    if (!selectedArtist) return
    const updates = { genre: metaGenre, audience: metaAudience, contact_name: metaContactName, contact_phone: metaContactPhone, monthly_revenue_target: metaRevenueTarget ? parseInt(metaRevenueTarget) : null }
    await supabase.from('projects').update(updates).eq('id', selectedArtist.id)
    setProjects(prev => prev.map(p => p.id === selectedArtist.id ? { ...p, ...updates } : p))
    setSelectedArtist(prev => prev ? { ...prev, ...updates } : prev)
    setEditingMeta(false)
  }

  useEffect(() => {
    if (!selectedArtist) return
    setMetaGenre(selectedArtist.genre || '')
    setMetaAudience(selectedArtist.audience || '')
    setMetaContactName(selectedArtist.contact_name || '')
    setMetaContactPhone(selectedArtist.contact_phone || '')
    setMetaRevenueTarget(selectedArtist.monthly_revenue_target ? String(selectedArtist.monthly_revenue_target) : '')
    loadEvents(selectedArtist); loadMeetings(selectedArtist); loadLinks(selectedArtist); loadCampaigns(selectedArtist)
  }, [selectedArtist, loadEvents, loadMeetings, loadLinks, loadCampaigns])

  const saveMeeting = async () => {
    if (!selectedArtist || !meetingTitle.trim() || !meetingContent.trim()) return
    setSavingMeeting(true)
    const { error } = await supabase.from('artist_meeting_notes').insert({ artist_name: selectedArtist.name, title: meetingTitle.trim(), content: meetingContent.trim(), meeting_date: meetingDate })
    if (!error) { setMeetingTitle(''); setMeetingContent(''); setShowMeetingForm(false); loadMeetings(selectedArtist) }
    setSavingMeeting(false)
  }

  const saveLink = async () => {
    if (!selectedArtist || !linkTitle.trim() || !linkUrl.trim()) return
    setSavingLink(true)
    let url = linkUrl.trim(); if (!url.startsWith('http')) url = 'https://' + url
    const { error } = await supabase.from('artist_links').insert({ artist_name: selectedArtist.name, title: linkTitle.trim(), url, category: linkCategory })
    if (!error) { setLinkTitle(''); setLinkUrl(''); setShowLinkForm(false); loadLinks(selectedArtist) }
    setSavingLink(false)
  }

  const artists = projects.filter(p => p.category === 'artist')
  const productions = projects.filter(p => p.category === 'production')
  const hasBoardData = selectedArtist ? !!ARTIST_BOARD_MAP[selectedArtist.name] : false
  const artistTasks = selectedArtist ? tasks.filter(t => ((t as any).project_name === selectedArtist.name || (t as any).project === selectedArtist.name)) : []
  const upcomingEvents = events.filter(e => isUpcoming(e.date) && e.status !== 'ירד')
  const pastEvents = events.filter(e => !isUpcoming(e.date) && e.status !== 'ירד')
  const confirmedEvents = upcomingEvents.filter(e => e.status === 'קורה')
  const totalRevenue = pastEvents.reduce((s, e) => s + parseFloat(e.total_revenue || '0'), 0)
  const artistTotal = pastEvents.reduce((s, e) => s + parseFloat(e.artist_share || '0'), 0)
  const groupedLinks = links.reduce((acc, l) => { if (!acc[l.category]) acc[l.category] = []; acc[l.category].push(l); return acc }, {} as Record<string, ArtistLink[]>)

  return (
    <div className="flex h-full" dir="rtl">
      <div className="w-52 flex-shrink-0 bg-slate-50 dark:bg-gray-900 border-l border-slate-200 dark:border-gray-700 overflow-y-auto p-3">
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">אומנים</p>
          {artists.map(a => {
            const st = getArtistStatus(a.status)
            return (
              <button key={a.id} onClick={() => { setSelectedArtist(a); setTab('overview') }}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all flex items-center gap-2 ${selectedArtist?.id === a.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedArtist?.id === a.id ? 'bg-white/70' : st.dot}`} />
                <span className="truncate">{a.name}</span>
              </button>
            )
          })}
        </div>
        {productions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">הפקות</p>
            {productions.map(p => (
              <button key={p.id} onClick={() => { setSelectedArtist(p); setTab('tasks') }}
                className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${selectedArtist?.id === p.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {selectedArtist ? (
          <div className="p-6 max-w-5xl">
            <div className="mb-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedArtist.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {selectedArtist.genre && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-300">{selectedArtist.genre}</span>}
                    {selectedArtist.audience && <span className="text-xs text-slate-400 dark:text-slate-500">· {selectedArtist.audience}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedArtist.category === 'artist' && (
                    <select value={selectedArtist.status || 'prospect'} onChange={e => updateArtistStatus(selectedArtist, e.target.value)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 ${getArtistStatus(selectedArtist.status).color}`}>
                      {ARTIST_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  )}
                  <button onClick={() => setEditingMeta(!editingMeta)} className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors">✏️ עריכה</button>
                </div>
              </div>
              {editingMeta && (
                <div className="mt-3 p-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={metaGenre} onChange={e => setMetaGenre(e.target.value)} placeholder="ז'אנר..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={metaAudience} onChange={e => setMetaAudience(e.target.value)} placeholder="קהל יעד..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={metaContactName} onChange={e => setMetaContactName(e.target.value)} placeholder="איש קשר..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={metaContactPhone} onChange={e => setMetaContactPhone(e.target.value)} placeholder="טלפון..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={metaRevenueTarget} onChange={e => setMetaRevenueTarget(e.target.value)} placeholder="יעד הכנסה חודשי (₪)..." type="number" className="col-span-2 px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={saveMeta} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">שמור</button>
                    <button onClick={() => setEditingMeta(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300">ביטול</button>
                  </div>
                </div>
              )}
            </div>
            {hasBoardData && (
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { val: upcomingEvents.length, label: 'הופעות קרובות', color: 'text-slate-800 dark:text-white' },
                  { val: confirmedEvents.length, label: 'מאושרות', color: 'text-green-600' },
                  { val: `₪${fmtNum(String(totalRevenue))}`, label: 'הכנסות (עבר)', color: 'text-blue-600' },
                  { val: `₪${fmtNum(String(artistTotal))}`, label: 'רווח אומן (עבר)', color: 'text-indigo-600' },
                ].map(({ val, label, color }) => (
                  <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 text-right">
                    <div className={`text-2xl font-bold ${color}`}>{val}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-1 mb-5 border-b border-slate-200 dark:border-gray-700 flex-wrap">
              {TAB_DEFS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'}`}>
                  <span>{t.icon}</span><span>{t.label}</span>
                  {t.id === 'tasks' && artistTasks.filter(x => x.status !== 'completed').length > 0 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{artistTasks.filter(x => x.status !== 'completed').length}</span>}
                  {t.id === 'meetings' && meetings.length > 0 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{meetings.length}</span>}
                  {t.id === 'links' && links.length > 0 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{links.length}</span>}
                  {t.id === 'campaigns' && campaigns.length > 0 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{campaigns.length}</span>}
                </button>
              ))}
            </div>

            {tab === 'overview' && (
              <div className="space-y-5">
                {/* Status + KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { val: upcomingEvents.length, label: 'הופעות קרובות', color: 'text-slate-800 dark:text-white', icon: '🎤' },
                    { val: confirmedEvents.length, label: 'מאושרות', color: 'text-green-600', icon: '✅' },
                    { val: campaigns.filter(c => c.status === 'פעיל' || c.status === 'חדש').length, label: 'קמפיינים פעילים', color: 'text-purple-600', icon: '📣' },
                    { val: artistTasks.filter(t => t.status !== 'completed').length, label: 'משימות פתוחות', color: 'text-indigo-600', icon: '📋' },
                  ].map(({ val, label, color, icon }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 text-right">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">{icon}</span>
                        <div className={`text-2xl font-bold ${color}`}>{val}</div>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Revenue */}
                {hasBoardData && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">💰 פיננסים</p>
                    <div className="flex gap-6 flex-wrap">
                      <div><p className="text-xs text-slate-400">הכנסות כולל</p><p className="text-xl font-bold text-blue-600">₪{fmtNum(String(totalRevenue))}</p></div>
                      <div><p className="text-xs text-slate-400">רווח אומן</p><p className="text-xl font-bold text-indigo-600">₪{fmtNum(String(artistTotal))}</p></div>
                      {selectedArtist.monthly_revenue_target ? (
                        <div><p className="text-xs text-slate-400">יעד חודשי</p><p className="text-xl font-bold text-slate-700 dark:text-white">₪{fmtNum(String(selectedArtist.monthly_revenue_target))}</p></div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Next show */}
                {upcomingEvents.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🎤 הופעה הקרובה</p>
                    <EventRow event={upcomingEvents[0]} />
                  </div>
                )}

                {/* Critical tasks */}
                {artistTasks.filter(t => t.status !== 'completed').length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">✅ משימות פתוחות</p>
                    <div className="space-y-2">
                      {artistTasks.filter(t => t.status !== 'completed').slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-gray-700 last:border-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'urgent' ? 'bg-red-100 text-red-600' : task.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>{task.priority === 'urgent' ? 'דחוף' : task.priority === 'high' ? 'גבוהה' : 'בינוני'}</span>
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium flex-1 text-right px-3">{task.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active campaigns */}
                {campaigns.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">📣 קמפיינים אחרונים</p>
                    <div className="space-y-2">
                      {campaigns.slice(0, 3).map(c => (
                        <div key={c.id} className="flex items-center justify-between py-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'פעיל' ? 'bg-green-100 text-green-700' : c.status === 'נגמר' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>{c.status || '—'}</span>
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium flex-1 text-right px-3">{c.name}</p>
                          {c.launch_date && <span className="text-xs text-slate-400">{fmtDate(c.launch_date)}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact */}
                {(selectedArtist.contact_name || selectedArtist.contact_phone) && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">👤 איש קשר</p>
                    {selectedArtist.contact_name && <p className="text-sm font-medium text-slate-800 dark:text-white">{selectedArtist.contact_name}</p>}
                    {selectedArtist.contact_phone && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedArtist.contact_phone}</p>}
                  </div>
                )}

                {/* Last meeting */}
                {meetings.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📝 פגישה אחרונה</p>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm">{meetings[0].title}</p>
                    <p className="text-xs text-slate-400 mb-2">{fmtDate(meetings[0].meeting_date)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">{meetings[0].content}</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'shows' && (
              <div>
                {!hasBoardData ? <Empty icon="🎤" msg="אין נתוני הופעות לאומן זה" sub="לוח אירועים לא מוגדר" /> :
                loadingEvents ? <div className="text-center py-10 text-slate-400">טוען...</div> :
                eventsError ? <div className="text-center py-10 text-red-500 text-sm">{eventsError}</div> : (
                  <>
                    {upcomingEvents.length > 0 && <section className="mb-6">
                      <SHead>הופעות קרובות</SHead>
                      <div className="space-y-2">{upcomingEvents.map(e => <EventRow key={e.id} event={e} />)}</div>
                    </section>}
                    {pastEvents.length > 0 && <section>
                      <div className="flex items-center gap-3 mb-3">
                        <SHead>הופעות עבר ({pastEvents.length})</SHead>
                        <button onClick={() => setShowPastEvents(!showPastEvents)} className="text-xs text-indigo-500 hover:text-indigo-700 -mt-3">{showPastEvents ? 'הסתר' : 'הצג'}</button>
                      </div>
                      {showPastEvents && <div className="space-y-2">{pastEvents.map(e => <EventRow key={e.id} event={e} showFinancials />)}</div>}
                    </section>}
                    {upcomingEvents.length === 0 && pastEvents.length === 0 && <Empty icon="🎤" msg="אין הופעות" />}
                  </>
                )}
              </div>
            )}
            {tab === 'tasks' && (
              <div>
                {artistTasks.length === 0 ? <Empty icon="✅" msg="אין משימות לאומן זה" /> : (
                  <div className="space-y-2">
                    {artistTasks.map(task => (
                      <div key={task.id} className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800 dark:text-white text-sm">{task.title}</p>
                          <span className={`text-xs px-2 py-1 rounded-lg ${task.status==='completed'?'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200':task.status==='in_progress'?'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200':'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                            {task.status==='completed'?'הושלמה':task.status==='in_progress'?'בביצוע':'ממתינה'}
                          </span>
                        </div>
                        {task.description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{task.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'campaigns' && (
              <div>
                <SHead>קמפיינים ({campaigns.length})</SHead>
                {campaigns.length === 0 ? <Empty icon="📣" msg="אין קמפיינים לאומן זה" sub="קמפיינים מקושרים לפי שם האומן" /> : (
                  <div className="space-y-2">
                    {campaigns.map(c => (
                      <div key={c.id} className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'פעיל' ? 'bg-green-100 text-green-700' : c.status === 'נגמר' ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' : 'bg-amber-100 text-amber-700'}`}>{c.status || '—'}</span>
                            {c.group_title && <span className="text-xs text-slate-400">{c.group_title}</span>}
                          </div>
                          <div className="text-right flex-1">
                            <p className="font-medium text-slate-800 dark:text-white text-sm">{c.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 justify-end text-xs text-slate-400">
                              {c.launch_date && <span>{fmtDate(c.launch_date)}</span>}
                              {c.platforms && <span>{c.platforms}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'meetings' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <SHead>סיכומי פגישה</SHead>
                  <button onClick={() => setShowMeetingForm(!showMeetingForm)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700">
                    <span>+</span><span> פגישה חדשה</span>
                  </button>
                </div>
                {showMeetingForm && (
                  <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 mb-5 shadow-sm">
                    <div className="space-y-3">
                      <input type="text" value={meetingTitle} onChange={e=>setMeetingTitle(e.target.value)} placeholder="כותרת הפגישה..." className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      <input type="date" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      <textarea value={meetingContent} onChange={e=>setMeetingContent(e.target.value)} placeholder="סיכום הפגישה..." rows={4} className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                      <div className="flex gap-2">
                        <button onClick={saveMeeting} disabled={savingMeeting||!meetingTitle.trim()||!meetingContent.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{savingMeeting?'שומר...':'שמור'}</button>
                        <button onClick={()=>setShowMeetingForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300">ביטול</button>
                      </div>
                    </div>
                  </div>
                )}
                {loadingMeetings ? <div className="text-center py-10 text-slate-400">טוען...</div> :
                meetings.length === 0 ? <Empty icon="📝" msg="אין סיכומי פגישה עדיין" sub='לחץ על "פגישה חדשה" להוספה' /> : (
                  <div className="space-y-3">
                    {meetings.map(m => (
                      <div key={m.id} className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                        <button onClick={()=>setExpandedMeeting(expandedMeeting===m.id?null:m.id)} className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-gray-750 transition-colors text-right">
                          <div className="flex items-center gap-3">
                            <span className="text-slate-300 text-xs">{expandedMeeting===m.id?'▼':'▶'}</span>
                            <div><p className="font-semibold text-slate-800 dark:text-white text-sm">{m.title}</p><p className="text-xs text-slate-400 mt-0.5">{fmtDate(m.meeting_date)}</p></div>
                          </div>
                          <button onClick={async e=>{e.stopPropagation();await supabase.from('artist_meeting_notes').delete().eq('id',m.id);setMeetings(prev=>prev.filter(x=>x.id!==m.id))}} className="text-slate-300 hover:text-red-400 p-1 rounded">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </button>
                        {expandedMeeting===m.id && <div className="px-4 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900"><p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{m.content}</p></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'links' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <SHead>קישורים</SHead>
                  <button onClick={()=>setShowLinkForm(!showLinkForm)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"><span>+</span><span> קישור חדש</span></button>
                </div>
                {showLinkForm && (
                  <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 mb-5 shadow-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={linkTitle} onChange={e=>setLinkTitle(e.target.value)} placeholder="שם הקישור..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                      <select value={linkCategory} onChange={e=>setLinkCategory(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        {LINK_CATS.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <input type="url" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="https://..." className="col-span-2 px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveLink} disabled={savingLink||!linkTitle.trim()||!linkUrl.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{savingLink?'שומר...':'הוסף'}</button>
                      <button onClick={()=>setShowLinkForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300">ביטול</button>
                    </div>
                  </div>
                )}
                {loadingLinks ? <div className="text-center py-10 text-slate-400">טוען...</div> :
                links.length===0 ? <Empty icon="🔗" msg="אין קישורים עדיין" sub='לחץ על "קישור חדש" להוספה' /> : (
                  <div className="space-y-4">
                    {Object.entries(groupedLinks).map(([cat,catLinks])=>(
                      <div key={cat}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{cat}</p>
                        <div className="space-y-2">
                          {catLinks.map(link=>(
                            <div key={link.id} className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between group">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-800 dark:text-white text-sm">{link.title}</p>
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline truncate block max-w-xs">{link.url}</a>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>
                                <button onClick={()=>navigator.clipboard.writeText(link.url)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                                <button onClick={async()=>{await supabase.from('artist_links').delete().eq('id',link.id);setLinks(prev=>prev.filter(l=>l.id!==link.id))}} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'financial' && (
              <div>
                {!hasBoardData ? <Empty icon="💰" msg="אין נתונים פיננסיים לאומן זה" /> :
                loadingEvents ? <div className="text-center py-10 text-slate-400">טוען...</div> :
                pastEvents.length===0 ? <Empty icon="💰" msg="אין נתונים פיננסיים עדיין" sub="נתונים יוצגו לאחר הופעות" /> : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {[
                        { label: 'סהִבך הכנסות', val: `₪${fmtNum(String(totalRevenue))}`, color: 'text-blue-600' },
                        { label: 'רווח אומן', val: `₪${fmtNum(String(artistTotal))}`, color: 'text-indigo-600' },
                        { label: 'מספר הופעות', val: pastEvents.length, color: 'text-slate-700 dark:text-white' },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5 text-right">
                          <div className={`text-2xl font-bold ${color}`}>{val}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-slate-100 dark:border-gray-700">
                          {['הופעה','תאריך','מיקום','הכנסות','רווח אומן'].map(h=>(
                            <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-gray-700">
                          {pastEvents.map(event=>(
                            <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-gray-750">
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-white">{event.name}</td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(event.date)}</td>
                              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{event.location||'—'}</td>
                              <td className="px-4 py-3 text-blue-600 font-medium">{event.total_revenue?`₪${fmtNum(event.total_revenue)}`:'—'}</td>
                              <td className="px-4 py-3 text-indigo-600 font-medium">{event.artist_share?`₪${fmtNum(event.artist_share)}`:'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">בחר אומן</div>
        )}
      </div>
    </div>
  )
}

function SHead({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{children}</h3>
}
function Empty({ icon, msg, sub }: { icon: string; msg: string; sub?: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-slate-400 dark:text-slate-500 font-medium">{msg}</p>
      {sub && <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">{sub}</p>}
    </div>
  )
}

function EventRow({ event, showFinancials=false }: { event: ArtistEvent; showFinancials?: boolean }) {
  const sc = STATUS_COLORS[event.status||''] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
  return (
    <div className={`bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3 ${event.status==='ירד'?'opacity-50':''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold text-slate-800 dark:text-white text-sm">{event.name}</p>
            {event.status && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc}`}>{event.status}</span>}
            {event.event_type && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300">{event.event_type}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 flex-wrap">
            {event.date && <span>{new Date(event.date).toLocaleDateString('he-IL')}</span>}
            {event.location && <span>{event.location}</span>}
            {event.start_time && <span>{event.start_time}</span>}
            {event.audience_count && <span>{event.audience_count} קהל</span>}
          </div>
          {showFinancials && (event.total_revenue||event.net_profit) && (
            <div className="flex gap-4 mt-2 text-xs">
              {event.total_revenue && <span className="text-blue-600">הכנסות: ₪{parseFloat(event.total_revenue).toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
              {event.net_profit && <span className="text-green-600">רווח: ₪{parseFloat(event.net_profit).toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
              {event.artist_share && <span className="text-indigo-600">אומן: ₪{parseFloat(event.artist_share).toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
            </div>
          )}
        </div>
        {event.contract_status && (
          <span className={`text-xs px-2 py-1 rounded-lg flex-shrink-0 ${event.contract_status==='חוזה נחתם'?'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200':'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'}`}>{event.contract_status}</span>
        )}
      </div>
    </div>
  )
}
