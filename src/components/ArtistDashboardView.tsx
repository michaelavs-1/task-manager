'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'
import { ARTIST_BOARD_MAP, type ArtistEvent } from '@/lib/artist-config'
import { useEsc } from '@/hooks/useEsc'

type ArtistTab = 'overview' | 'shows' | 'tasks' | 'meetings' | 'links' | 'royalties' | 'campaigns' | 'media' | 'repertoire' | 'streams'
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
  'מאושר': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'בהכנה/ממתין פעיל': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'בהכנה': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  'סגור - סגירה ': 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
  'בוטל': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
}

const ARTIST_STATUSES: { key: string; label: string; color: string; dot: string }[] = [
  { key: 'prospect',   label: 'Prospect / הצעה',      color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',       dot: 'bg-slate-400' },
  { key: 'signing',    label: 'Signing / חתימה',       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',       dot: 'bg-amber-400' },
  { key: 'active',     label: 'Active',                  color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',       dot: 'bg-green-500' },
  { key: 'growth',     label: 'Growth Mode',             color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',          dot: 'bg-blue-500' },
  { key: 'release',    label: 'Album / Release Cycle',   color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',  dot: 'bg-purple-500' },
  { key: 'touring',    label: 'Touring',                 color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',  dot: 'bg-indigo-500' },
  { key: 'dormant',    label: 'Dormant',                 color: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',             dot: 'bg-red-400' },
]
function getArtistStatus(key?: string) { return ARTIST_STATUSES.find(s => s.key === key) || ARTIST_STATUSES[0] }

const LINK_CATS = ['אינסטגרם', 'טיקטוק', 'יוטיוב', 'ספוטיפיי', 'פייסבוק', 'אתר אישי', 'סאונדקלאוד', 'טוויטר', 'אחר']

const TAB_DEFS: { id: ArtistTab; label: string }[] = [
  { id: 'overview',   label: 'סקירה כללית' },
  { id: 'shows',      label: 'הופעות' },
  { id: 'tasks',      label: 'משימות' },
  { id: 'meetings',   label: 'פגישות' },
  { id: 'links',      label: 'קישורים' },
  { id: 'royalties',  label: 'תמלוגים' },
  { id: 'media',       label: 'מדיה' },
  { id: 'repertoire', label: 'רפרטואר' },
  { id: 'streams',    label: 'ניטור השמעות' },
]

function fmtNum(v: string | null) { if (!v) return '–'; const n = parseFloat(v); return isNaN(n) ? '–' : n.toLocaleString('he-IL', { maximumFractionDigits: 0 }) }
function fmtDate(v: string | null) { if (!v) return '–'; try { return new Date(v).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return v } }
function isUpcoming(d: string | null) { return !!d && d >= new Date().toISOString().split('T')[0] }

export function ArtistDashboardView({ tasks, initialArtist }: { tasks: Task[]; initialArtist?: string }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedArtist, setSelectedArtist] = useState<Project | null>(null)
  const [tab, setTab] = useState<ArtistTab>('overview')
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [showPastEvents, setShowPastEvents] = useState(false)
  const [showsFilter, setShowsFilter] = useState<'all' | 'open' | 'soldout'>('all')
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
  const [showSocialModal, setShowSocialModal] = useState(false)
  const [showFbModal, setShowFbModal] = useState(false)
  const [socialFb, setSocialFb] = useState('')
  const [socialIg, setSocialIg] = useState('')
  const [socialTiktok, setSocialTiktok] = useState('')
  const [savingSocial, setSavingSocial] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'artist' | 'production'>('artist')
  const [newStatus, setNewStatus] = useState('prospect')
  const [savingNew, setSavingNew] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [mediaFiles, setMediaFiles] = useState<{name: string; url: string; type: string}[]>([])
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  useEsc(showSocialModal,          () => { if (!savingSocial) setShowSocialModal(false) })
  useEsc(showFbModal,              () => setShowFbModal(false))
  useEsc(showAddModal,             () => setShowAddModal(false))
  useEsc(deleteConfirmId !== null, () => setDeleteConfirmId(null))

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

  const loadMedia = useCallback(async (artist: Project) => {
    setLoadingMedia(true)
    const { data } = await supabase.storage.from('campaigns-media').list(`artists/${artist.id}`, { limit: 200 })
    const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder').map(f => {
      const { data: u } = supabase.storage.from('campaigns-media').getPublicUrl(`artists/${artist.id}/${f.name}`)
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      const type = ['mp4','mov','avi','webm'].includes(ext) ? 'video' : 'image'
      return { name: f.name, url: u.publicUrl, type }
    })
    setMediaFiles(files)
    setLoadingMedia(false)
  }, [])

  const updateArtistStatus = async (artist: Project, newStatus: string) => {
    await supabase.from('projects').update({ status: newStatus }).eq('id', artist.id)
    setProjects(prev => prev.map(p => p.id === artist.id ? { ...p, status: newStatus } : p))
    setSelectedArtist(prev => prev ? { ...prev, status: newStatus } : prev)
  }

  const saveMeta = async () => {
    if (!selectedArtist) return
    const updates = { genre: metaGenre, audience: metaAudience, contact_name: metaContactName, contact_phone: metaContactPhone, monthly_revenue_target: metaRevenueTarget ? parseInt(metaRevenueTarget) : undefined }
    await supabase.from('projects').update(updates).eq('id', selectedArtist.id)
    setProjects(prev => prev.map(p => p.id === selectedArtist.id ? { ...p, ...updates } as Project : p))
    setSelectedArtist(prev => prev ? { ...prev, ...updates } as Project : prev)
    setEditingMeta(false)
  }

  useEffect(() => {
    if (!selectedArtist) return
    setMetaGenre(selectedArtist.genre || '')
    setMetaAudience(selectedArtist.audience || '')
    setMetaContactName(selectedArtist.contact_name || '')
    setMetaContactPhone(selectedArtist.contact_phone || '')
    setMetaRevenueTarget(selectedArtist.monthly_revenue_target ? String(selectedArtist.monthly_revenue_target) : '')
    loadEvents(selectedArtist); loadMeetings(selectedArtist); loadLinks(selectedArtist); loadCampaigns(selectedArtist); loadMedia(selectedArtist)
  }, [selectedArtist, loadEvents, loadMeetings, loadLinks, loadCampaigns, loadMedia])

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

  const openSocialModal = () => {
    const fb = links.find(l => l.category === 'פייסבוק')
    const ig = links.find(l => l.category === 'אינסטגרם')
    const tt = links.find(l => l.category === 'טיקטוק')
    setSocialFb(fb?.url || '')
    setSocialIg(ig?.url || '')
    setSocialTiktok(tt?.url || '')
    setShowSocialModal(true)
  }

  const saveSocials = async () => {
    if (!selectedArtist) return
    setSavingSocial(true)
    const normalize = (u: string) => {
      const t = u.trim()
      if (!t) return ''
      return t.startsWith('http') ? t : 'https://' + t
    }
    const pairs: { cat: string; url: string; defaultTitle: string }[] = [
      { cat: 'פייסבוק',    url: normalize(socialFb),     defaultTitle: 'Facebook' },
      { cat: 'אינסטגרם',   url: normalize(socialIg),     defaultTitle: 'Instagram' },
      { cat: 'טיקטוק',     url: normalize(socialTiktok), defaultTitle: 'TikTok' },
    ]
    for (const p of pairs) {
      const existing = links.find(l => l.category === p.cat)
      if (p.url) {
        if (existing) {
          if (existing.url !== p.url) {
            await supabase.from('artist_links').update({ url: p.url }).eq('id', existing.id)
          }
        } else {
          await supabase.from('artist_links').insert({ artist_name: selectedArtist.name, title: p.defaultTitle, url: p.url, category: p.cat })
        }
      } else if (existing) {
        await supabase.from('artist_links').delete().eq('id', existing.id)
      }
    }
    await loadLinks(selectedArtist)
    setShowSocialModal(false)
    setSavingSocial(false)
  }

  const addArtist = async () => {
    if (!newName.trim()) return
    setSavingNew(true)
    const { data, error } = await supabase.from('projects').insert({ name: newName.trim(), category: newCategory, status: newStatus }).select().single()
    if (!error && data) {
      setProjects(prev => [...prev, data as Project].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)))
      setSelectedArtist(data as Project)
      setTab('overview')
    }
    setNewName(''); setShowAddModal(false); setSavingNew(false)
  }

  const deleteArtist = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    setProjects(prev => prev.filter(p => p.id !== id))
    if (selectedArtist?.id === id) {
      const remaining = projects.filter(p => p.id !== id)
      setSelectedArtist(remaining.find(p => p.category === 'artist') || null)
    }
    setDeleteConfirmId(null)
  }

  const artists = projects.filter(p => p.category === 'artist')
  const productions = projects.filter(p => p.category === 'production')
  const generals = projects.filter(p => p.category === 'general')
  const hasBoardData = selectedArtist ? !!ARTIST_BOARD_MAP[selectedArtist.name] : false
  const artistTasks = selectedArtist ? tasks.filter(t => ((t as any).project_name === selectedArtist.name || (t as any).project === selectedArtist.name)) : []
  const upcomingEvents = events.filter(e => isUpcoming(e.date) && e.status !== 'בוטל')
  const pastEvents = events.filter(e => !isUpcoming(e.date) && e.status !== 'בוטל')
  const confirmedEvents = upcomingEvents.filter(e => e.status === 'מאושר')
  const totalRevenue = pastEvents.reduce((s, e) => s + parseFloat(e.total_revenue || '0'), 0)
  const artistTotal = pastEvents.reduce((s, e) => s + parseFloat(e.artist_share || '0'), 0)
  const groupedLinks = links.reduce((acc, l) => { if (!acc[l.category]) acc[l.category] = []; acc[l.category].push(l); return acc }, {} as Record<string, ArtistLink[]>)

  return (
    <div className="flex h-full" dir="rtl">
      <div className="w-52 flex-shrink-0 bg-slate-50 dark:bg-gray-900 border-l border-slate-200 dark:border-gray-700 overflow-y-auto p-3">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <button onClick={() => setShowAddModal(true)} className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 flex items-center justify-center text-xs font-bold transition-colors" title="הוסף אמן/הפקה">+</button>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">אמני</p>
          </div>
          {artists.map(a => {
            const st = getArtistStatus(a.status)
            return (
              <div key={a.id} className="relative group mb-0.5">
                <button onClick={() => { setSelectedArtist(a); setTab('overview') }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedArtist?.id === a.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedArtist?.id === a.id ? 'bg-white/70' : st.dot}`} />
                  <span className="truncate flex-1">{a.name}</span>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(a.id) }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                  title="מחק"
                >✕</button>
              </div>
            )
          })}
        </div>
        {productions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">הפקות</p>
            {productions.map(p => (
              <div key={p.id} className="relative group mb-0.5">
                <button onClick={() => { setSelectedArtist(p); setTab('tasks') }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedArtist?.id === p.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                  {p.name}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(p.id) }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                  title="מחק"
                >✕</button>
              </div>
            ))}
          </div>
        )}
        {generals.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">כללי</p>
            {generals.map(g => (
              <div key={g.id} className="relative group mb-0.5">
                <button onClick={() => { setSelectedArtist(g); setTab('tasks') }}
                  className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedArtist?.id === g.id ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-700'}`}>
                  {g.name}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteConfirmId(g.id) }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                  title="מחק"
                >✕</button>
              </div>
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
                  {/* Facebook — always visible; if no link → open social modal */}
                  {(() => {
                    const fbLink = links.find(l => l.category === 'פייסבוק')
                    return (
                      <button
                        onClick={() => fbLink ? setShowFbModal(true) : openSocialModal()}
                        title={fbLink ? 'פייסבוק' : 'הוסף קישור פייסבוק'}
                        className={`px-2 py-1.5 rounded-lg transition-colors flex items-center ${fbLink ? 'bg-[#1877F2] hover:bg-[#166FE5]' : 'bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600'}`}
                      >
                        <svg className={`w-4 h-4 ${fbLink ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </button>
                    )
                  })()}
                  {/* Instagram — always visible */}
                  {(() => {
                    const igLink = links.find(l => l.category === 'אינסטגרם')
                    return (
                      <button
                        onClick={() => igLink ? window.open(igLink.url, '_blank') : openSocialModal()}
                        title={igLink ? 'אינסטגרם' : 'הוסף קישור אינסטגרם'}
                        className={`px-2 py-1.5 rounded-lg transition-colors flex items-center ${igLink ? 'hover:opacity-90' : 'bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600'}`}
                        style={igLink ? { background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' } : undefined}
                      >
                        <svg className={`w-4 h-4 ${igLink ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </button>
                    )
                  })()}
                  {/* TikTok — always visible */}
                  {(() => {
                    const ttLink = links.find(l => l.category === 'טיקטוק')
                    return (
                      <button
                        onClick={() => ttLink ? window.open(ttLink.url, '_blank') : openSocialModal()}
                        title={ttLink ? 'טיקטוק' : 'הוסף קישור טיקטוק'}
                        className={`px-2 py-1.5 rounded-lg transition-colors flex items-center ${ttLink ? 'bg-black hover:bg-gray-900' : 'bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600'}`}
                      >
                        <svg className={`w-4 h-4 ${ttLink ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.72a8.17 8.17 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.15z"/>
                        </svg>
                      </button>
                    )
                  })()}
                  <button onClick={() => openSocialModal()} className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors" title="ערוך רשתות חברתיות">⚙️</button>
                  <button onClick={() => setEditingMeta(!editingMeta)} className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors">✏️ ערוך</button>
                </div>
              </div>
              {editingMeta && (
                <div className="mt-3 p-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <input value={metaGenre} onChange={e => setMetaGenre(e.target.value)} placeholder="ז'אנר..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={metaAudience} onChange={e => setMetaAudience(e.target.value)} placeholder="קהל יעד..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                    <input value={metaContactName} onChange={e => setMetaContactName(e.target.value)} placeholder="שם קשר..." className="px-3 py-2 text-sm border border-slate-200 dark:border-gray-600 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
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
                  { val: `₪${fmtNum(String(totalRevenue))}`, label: 'סה"כ הכנסה (עבר)', color: 'text-blue-600' },
                  { val: `₪${fmtNum(String(artistTotal))}`, label: 'חלק הזמר (עבר)', color: 'text-indigo-600' },
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
                  <span>{t.label}</span>
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
                    { val: upcomingEvents.length, label: 'הופעות קרובות', color: 'text-slate-800 dark:text-white' },
                    { val: confirmedEvents.length, label: 'מאושרות', color: 'text-green-600' },
                    { val: campaigns.filter(c => c.status === 'פעיל' || c.status === 'בתכנון').length, label: 'קמפיינים פעילים', color: 'text-purple-600' },
                    { val: artistTasks.filter(t => t.status !== 'completed').length, label: 'משימות פתוחות', color: 'text-indigo-600' },
                  ].map(({ val, label, color }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 text-right">
                      <div className={`text-2xl font-bold ${color} mb-1`}>{val}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Revenue */}
                {hasBoardData && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">פיננסי</p>
                    <div className="flex gap-6 flex-wrap">
                      <div><p className="text-xs text-slate-400">סה"כ הכנסה ממופעות</p><p className="text-xl font-bold text-blue-600">₪{fmtNum(String(totalRevenue))}</p></div>
                      <div><p className="text-xs text-slate-400">רווח הזמר</p><p className="text-xl font-bold text-indigo-600">₪{fmtNum(String(artistTotal))}</p></div>
                      {selectedArtist.monthly_revenue_target ? (
                        <div><p className="text-xs text-slate-400">יעד חודשי</p><p className="text-xl font-bold text-slate-700 dark:text-white">₪{fmtNum(String(selectedArtist.monthly_revenue_target))}</p></div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Next show */}
                {upcomingEvents.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">הופעה הקרובה</p>
                    <EventRow event={upcomingEvents[0]} />
                  </div>
                )}

                {/* Critical tasks */}
                {artistTasks.filter(t => t.status !== 'completed').length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">משימות פתוחות</p>
                    <div className="space-y-2">
                      {artistTasks.filter(t => t.status !== 'completed').slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 dark:border-gray-700 last:border-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${task.priority === 'urgent' ? 'bg-red-100 text-red-600' : task.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>{task.priority === 'urgent' ? 'דחוף' : task.priority === 'high' ? 'גבוה' : 'רגיל'}</span>
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium flex-1 text-right px-3">{task.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active campaigns */}
                {campaigns.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">קמפיינים פעילים</p>
                    <div className="space-y-2">
                      {campaigns.slice(0, 3).map(c => (
                        <div key={c.id} className="flex items-center justify-between py-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'פעיל' ? 'bg-green-100 text-green-700' : c.status === 'סיים' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>{c.status || '–'}</span>
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">קשר בעסק</p>
                    {selectedArtist.contact_name && <p className="text-sm font-medium text-slate-800 dark:text-white">{selectedArtist.contact_name}</p>}
                    {selectedArtist.contact_phone && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{selectedArtist.contact_phone}</p>}
                  </div>
                )}

                {/* Last meeting */}
                {meetings.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">פגישה אחרונה</p>
                    <p className="font-semibold text-slate-800 dark:text-white text-sm">{meetings[0].title}</p>
                    <p className="text-xs text-slate-400 mb-2">{fmtDate(meetings[0].meeting_date)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">{meetings[0].content}</p>
                  </div>
                )}
              </div>
            )}

            {tab === 'shows' && (
              <div>
                {!hasBoardData ? <Empty icon="🤔" msg="אין נתוני הופעות מזוהה" sub="עדכן את התצורה או בדוק ההתחברות" /> :
                loadingEvents ? <div className="text-center py-10 text-slate-400">טוען...</div> :
                eventsError ? <div className="text-center py-10 text-red-500 text-sm">{eventsError}</div> : (
                  <>
                    {/* Filter tabs */}
                    <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-xl p-1 w-fit">
                      {([['all','הכל'],['open','קופה פתוחה'],['soldout','מכורות']] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setShowsFilter(val)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${showsFilter === val ? 'bg-white dark:bg-gray-600 shadow text-indigo-700 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >{label}</button>
                      ))}
                    </div>

                    {showsFilter === 'all' ? (
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
                        {upcomingEvents.length === 0 && pastEvents.length === 0 && <Empty icon="🤔" msg="אין הופעות" />}
                      </>
                    ) : (() => {
                      const allNonCancelled = events.filter(e => e.status !== 'בוטל')
                      const filtered = showsFilter === 'open'
                        ? allNonCancelled.filter(e => e.status === 'קופה פתוחה' || e.event_type === 'קופה פתוחה')
                        : allNonCancelled.filter(e => e.status === 'מכורות' || e.event_type === 'מכורות')
                      return filtered.length === 0
                        ? <Empty icon="🎫" msg={showsFilter === 'open' ? 'אין הופעות עם קופה פתוחה' : 'אין הופעות מכורות'} />
                        : <div className="space-y-2">{filtered.map(e => <EventRow key={e.id} event={e} showFinancials />)}</div>
                    })()}
                  </>
                )}
              </div>
            )}
            {tab === 'tasks' && (
              <div>
                {artistTasks.length === 0 ? <Empty icon="✓" msg="אין משימות לעצם" /> : (
                  <div className="space-y-2">
                    {artistTasks.map(task => (
                      <div key={task.id} className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800 dark:text-white text-sm">{task.title}</p>
                          <span className={`text-xs px-2 py-1 rounded-lg ${task.status==='completed'?'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200':task.status==='in_progress'?'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200':'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                            {task.status==='completed'?'סיימה':task.status==='in_progress'?'בהתהליך':'בהמתנה'}
                          </span>
                        </div>
                        {task.description && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{task.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'meetings' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <SHead>סיכומי פגישות</SHead>
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
                meetings.length === 0 ? <Empty icon="📝" msg="אין סיכומי פגישות עדיין" sub='לחץ על "פגישה חדשה" להוסיף' /> : (
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
                links.length===0 ? <Empty icon="🔗" msg="אין קישורים עדיין" sub='לחץ על "קישור חדש" להוסיף' /> : (
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
            {tab === 'royalties' && selectedArtist && (
              <RoyaltiesTab artistName={selectedArtist.name} />
            )}

            {tab === 'media' && selectedArtist && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{mediaFiles.length} קבצים</p>
                  <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${uploadingMedia ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    {uploadingMedia ? 'מעלה...' : 'העלה קבצים'}
                    <input type="file" accept="image/*,video/*" multiple className="hidden" disabled={uploadingMedia} onChange={async e => {
                      if (!e.target.files?.length) return
                      setUploadingMedia(true)
                      for (const file of Array.from(e.target.files)) {
                        const path = `artists/${selectedArtist.id}/${file.name}`
                        await supabase.storage.from('campaigns-media').upload(path, file, { upsert: true })
                      }
                      await loadMedia(selectedArtist)
                      setUploadingMedia(false)
                    }} />
                  </label>
                </div>
                {loadingMedia ? (
                  <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" /></div>
                ) : mediaFiles.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <p>אין קובץ עדיין</p>
                    <p className="text-xs mt-1">לחץ על "העלה קבצים" להוסיף תמונה</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {mediaFiles.map(f => (
                      <div key={f.name} className="group relative bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        {f.type === 'video' ? (
                          <video src={f.url} className="w-full aspect-square object-cover" />
                        ) : (
                          <img src={f.url} alt={f.name} className="w-full aspect-square object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={async () => {
                              const res = await fetch(f.url)
                              const blob = await res.blob()
                              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; a.click(); URL.revokeObjectURL(a.href)
                            }}
                            className="bg-white/90 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white transition-colors shadow"
                          >
                            הורד
                          </button>
                        </div>
                        <div className="px-2 py-1.5 border-t border-slate-100 dark:border-gray-700">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{f.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {tab === 'repertoire' && selectedArtist && (
              <RepertoireTab artistName={selectedArtist.name} />
            )}
            {tab === 'streams' && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 dark:text-slate-500">נתוני השמעות ייטענו כאן לאחר חיבור המקור</p>
                  <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2.5 py-1 rounded-full font-semibold">בקרוב</span>
                </div>

                {/* Placeholder stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'סה"כ השמעות', icon: '🎧', color: 'text-indigo-600', sub: 'כל הפלטפורמות' },
                    { label: 'Spotify', icon: '🟢', color: 'text-green-600', sub: 'חודש נוכחי' },
                    { label: 'YouTube', icon: '🔴', color: 'text-red-500', sub: 'צפיות' },
                    { label: 'Apple Music', icon: '⚪', color: 'text-slate-600', sub: 'חודש נוכחי' },
                  ].map(({ label, icon, color, sub }) => (
                    <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 text-right">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{icon}</span>
                        <div className="h-4 w-16 bg-slate-100 dark:bg-gray-700 rounded animate-pulse" />
                      </div>
                      <div className={`text-xl font-bold ${color} mb-0.5`}>—</div>
                      <div className="text-xs text-slate-400">{label}</div>
                      <div className="text-xs text-slate-300 dark:text-slate-600">{sub}</div>
                    </div>
                  ))}
                </div>

                {/* Placeholder chart area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">מגמת השמעות — 30 יום אחרונים</p>
                  <div className="flex items-end gap-1 h-28">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="flex-1 bg-slate-100 dark:bg-gray-700 rounded-sm animate-pulse" style={{ height: `${20 + Math.random() * 60}%`, animationDelay: `${i * 40}ms` }} />
                    ))}
                  </div>
                  <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-3">נתונים אמיתיים יוצגו לאחר חיבור</p>
                </div>

                {/* Catalogue placeholder */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">רפרטואר — ביצועי שירים</p>
                  <div className="space-y-2.5">
                    {['שיר א׳', 'שיר ב׳', 'שיר ג׳'].map((name, i) => (
                      <div key={name} className="flex items-center gap-3">
                        <span className="text-xs text-slate-300 dark:text-slate-600 w-4 text-left">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">{name}</span>
                            <span className="text-xs text-slate-300 dark:text-slate-600">—</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full">
                            <div className="h-1.5 bg-indigo-200 dark:bg-indigo-900 rounded-full" style={{ width: `${70 - i * 20}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-4">הרפרטואר יושלם לאחר חיבור מקור הנתונים</p>
                </div>

                {/* Connect CTA */}
                <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-700 p-6 text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">חיבור מקור נתונים</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">ניתן לחבר Spotify for Artists, YouTube Analytics, או כל API אחר</p>
                  <button disabled className="px-4 py-2 text-sm font-semibold bg-indigo-100 text-indigo-400 rounded-lg cursor-not-allowed opacity-60">
                    חבר מקור — בקרוב
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">בחר זמר</div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (() => {
        const target = projects.find(p => p.id === deleteConfirmId)
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) { setDeleteConfirmId(null) } }}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 text-right" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">מחיקת {target?.category === 'artist' ? 'אמן' : 'הפקה'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">מחוק את <span className="font-semibold text-slate-800 dark:text-white">{target?.name}</span>? פעולה זו לא יכול להיות בוטל.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-xl transition-colors">ביטול</button>
                <button onClick={() => deleteArtist(deleteConfirmId)} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">מחק</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Add artist/production modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false) } }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 text-right" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">הוסף אמן / הפקה</h3>
            <div className="space-y-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addArtist()}
                placeholder="שם..."
                autoFocus
                className="w-full border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as 'artist' | 'production')}
                className="w-full border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="artist">אמן</option>
                <option value="production">הפקה</option>
              </select>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="w-full border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {ARTIST_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => { setShowAddModal(false); setNewName('') }} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-xl transition-colors">ביטול</button>
              <button onClick={addArtist} disabled={savingNew || !newName.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors">{savingNew ? '...' : 'הוסף'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Facebook embed modal */}
      {showFbModal && selectedArtist && (() => {
        const fbUrl = links.find(l => l.category === 'פייסבוק')?.url || ''
        const pluginSrc = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(fbUrl)}&tabs=timeline&width=900&height=900&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`
        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={e => { if (e.target === e.currentTarget) { setShowFbModal(false) } }}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ width: 'min(960px, 95vw)', height: '94vh' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  <span className="font-semibold text-sm text-gray-800 dark:text-white">{selectedArtist.name} · Facebook</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href={fbUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors">פתח בדפדפן ↗</a>
                  <button onClick={() => setShowFbModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 flex justify-center">
                <iframe
                  src={pluginSrc}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', minHeight: 800 }}
                  scrolling="yes"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Social links modal */}
      {showSocialModal && selectedArtist && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) { !savingSocial && setShowSocialModal(false) } }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-96 text-right" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">רשתות חברתיות</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{selectedArtist.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">פייסבוק</label>
                <input
                  value={socialFb}
                  onChange={e => setSocialFb(e.target.value)}
                  placeholder="https://facebook.com/..."
                  dir="ltr"
                  className="w-full border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">אינסטגרם</label>
                <input
                  value={socialIg}
                  onChange={e => setSocialIg(e.target.value)}
                  placeholder="https://instagram.com/..."
                  dir="ltr"
                  className="w-full border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">טיקטוק</label>
                <input
                  value={socialTiktok}
                  onChange={e => setSocialTiktok(e.target.value)}
                  placeholder="https://tiktok.com/@..."
                  dir="ltr"
                  className="w-full border border-slate-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-slate-50 dark:bg-gray-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button onClick={() => setShowSocialModal(false)} disabled={savingSocial} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-50">ביטול</button>
              <button onClick={saveSocials} disabled={savingSocial} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50">{savingSocial ? '...' : 'שמור'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type Quote = { id: string; artist_name: string; title: string; amount: number | null; status: string; notes: string | null; quote_date: string | null; created_at: string }
const QUOTE_STATUSES = ['טיוטה', 'נשלח', 'אושר', 'נמחק']
const QUOTE_STATUS_COLOR: Record<string, string> = {
  'טיוטה': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'נשלח': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  'אושר': 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  'נמחק': 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
}
const iCls = 'w-full border border-slate-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-white bg-slate-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300'

// ─────────────────────────────────────────────────────────
// ArtistFinancialReport — monthly show revenue/expense report
// Management deal: 25% from net (bottom line), artist keeps 75%
// ─────────────────────────────────────────────────────────
const MGMT_PCT = 0.25

function parseNum(v: string | null | undefined): number {
  if (!v) return 0
  return parseFloat(v.replace(/[₪,\s]/g, '')) || 0
}

function ArtistFinancialReport({ events, loading, artistName }: {
  events: ArtistEvent[]
  loading: boolean
  artistName: string
}) {
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({})
  const fmt = (n: number) => n === 0 ? '—' : `₪${Math.round(n).toLocaleString('he-IL')}`

  const pastShows = events.filter(e =>
    e.date && e.date < new Date().toISOString().split('T')[0] && e.status !== 'בוטל'
  )

  // Group by YYYY-MM
  const byMonth: Record<string, ArtistEvent[]> = {}
  pastShows.forEach(e => {
    const mo = (e.date || '').slice(0, 7)
    if (!byMonth[mo]) byMonth[mo] = []
    byMonth[mo].push(e)
  })
  const months = Object.keys(byMonth).sort()

  // Grand totals
  const grandRev  = pastShows.reduce((s, e) => s + parseNum(e.total_revenue), 0)
  const grandExp  = pastShows.reduce((s, e) => s + parseNum(e.total_expenses), 0)
  const grandNet  = grandRev - grandExp
  const grandMgmt = grandNet * MGMT_PCT
  const grandArtist = grandNet * (1 - MGMT_PCT)

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" /></div>

  if (pastShows.length === 0) return (
    <div className="text-center py-16 text-slate-400">
      <p className="text-sm">אין הופעות שהתקיימו — הדוח יופיע לאחר ביצוע הופעות</p>
    </div>
  )

  return (
    <div className="space-y-4" dir="rtl">
      {/* Grand total header */}
      <div className="bg-slate-900 dark:bg-gray-800 rounded-2xl p-5 border border-slate-700">
        <h3 className="text-sm font-bold text-white mb-4">סיכום כולל — {artistName}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'סה"כ הכנסות', val: fmt(grandRev),    color: 'text-indigo-400' },
            { label: 'סה"כ הוצאות', val: fmt(grandExp),    color: 'text-red-400' },
            { label: 'יתרה לחלוקה', val: fmt(grandNet),    color: grandNet >= 0 ? 'text-emerald-400' : 'text-red-400' },
            { label: `חלק אומן (${Math.round((1-MGMT_PCT)*100)}%)`, val: fmt(grandArtist), color: 'text-yellow-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-slate-800/60 rounded-xl p-3 text-right">
              <div className="text-[10px] text-slate-400 mb-1">{label}</div>
              <div className={`text-lg font-bold ${color}`}>{val}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <span>{pastShows.length} הופעות שהתקיימו</span>
          <span>ניהול ({Math.round(MGMT_PCT*100)}%): <span className="text-slate-300 font-semibold">{fmt(grandMgmt)}</span></span>
        </div>
      </div>

      {/* Monthly accordions */}
      {months.map(mo => {
        const shows = byMonth[mo]
        const [y, m] = mo.split('-')
        const heMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
        const label = `${heMonths[parseInt(m)-1]} ${y}`
        const mRev  = shows.reduce((s, e) => s + parseNum(e.total_revenue), 0)
        const mExp  = shows.reduce((s, e) => s + parseNum(e.total_expenses), 0)
        const mNet  = mRev - mExp
        const mArt  = mNet * (1 - MGMT_PCT)
        const mMgmt = mNet * MGMT_PCT
        const isOpen = openMonths[mo] === true

        return (
          <div key={mo} className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden shadow-sm">
            {/* Month header */}
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors"
              onClick={() => setOpenMonths(p => ({ ...p, [mo]: !isOpen }))}>
              <div className="flex items-center gap-3">
                <svg className={`w-4 h-4 text-indigo-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{label}</span>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">{shows.length} הופעות</span>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-indigo-600 font-semibold">{fmt(mRev)}</span>
                <span className="text-red-500">הוצ׳ {fmt(mExp)}</span>
                <span className={`font-bold ${mNet >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>נטו {fmt(mNet)}</span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 dark:border-gray-700">
                {/* Shows table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <th className="px-5 py-2.5 text-right font-semibold">הופעה</th>
                      <th className="px-5 py-2.5 text-right font-semibold">תאריך</th>
                      <th className="px-5 py-2.5 text-right font-semibold">הכנסה</th>
                      <th className="px-5 py-2.5 text-right font-semibold">הוצאות</th>
                      <th className="px-5 py-2.5 text-right font-semibold">יתרה לחלוקה</th>
                      <th className="px-5 py-2.5 text-right font-semibold">אומן (75%)</th>
                      <th className="px-5 py-2.5 text-right font-semibold">ניהול (25%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shows.map((e, i) => {
                      const rev  = parseNum(e.total_revenue)
                      const exp  = parseNum(e.total_expenses)
                      const net  = rev - exp
                      const art  = net * (1 - MGMT_PCT)
                      const mgmt = net * MGMT_PCT
                      return (
                        <tr key={e.id} className={`border-t border-slate-100 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-gray-700/20'}`}>
                          <td className="px-5 py-3 font-medium text-slate-800 dark:text-white text-xs">{e.name}</td>
                          <td className="px-5 py-3 text-xs text-slate-500">{e.date ? new Date(e.date).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit' }) : '—'}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-indigo-600">{fmt(rev)}</td>
                          <td className="px-5 py-3 text-xs text-red-500">{fmt(exp)}</td>
                          <td className="px-5 py-3 text-xs font-bold" style={{ color: net >= 0 ? '#10b981' : '#ef4444' }}>{fmt(net)}</td>
                          <td className="px-5 py-3 text-xs font-semibold text-yellow-600 dark:text-yellow-400">{fmt(art)}</td>
                          <td className="px-5 py-3 text-xs text-slate-500">{fmt(mgmt)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Month summary */}
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-gray-700/60 border-t-2 border-slate-200 dark:border-gray-600 text-xs font-bold">
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300" colSpan={2}>סיכום {label}</td>
                      <td className="px-5 py-3 text-indigo-700 dark:text-indigo-400">{fmt(mRev)}</td>
                      <td className="px-5 py-3 text-red-600">{fmt(mExp)}</td>
                      <td className="px-5 py-3" style={{ color: mNet >= 0 ? '#059669' : '#dc2626' }}>{fmt(mNet)}</td>
                      <td className="px-5 py-3 text-yellow-700 dark:text-yellow-400">{fmt(mArt)}</td>
                      <td className="px-5 py-3 text-slate-500">{fmt(mMgmt)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function QuotesTab({ artistName }: { artistName: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('טיוטה')
  const [notes, setNotes] = useState('')
  const [quoteDate, setQuoteDate] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('quotes').select('*').eq('artist_name', artistName).order('created_at', { ascending: false })
    setQuotes((data as Quote[]) || [])
    setLoading(false)
  }, [artistName])

  useEffect(() => { load() }, [load])

  function openNew() {
    setEditId(null); setTitle(''); setAmount(''); setStatus('טיוטה'); setNotes(''); setQuoteDate(''); setShowForm(true)
  }
  function openEdit(q: Quote) {
    setEditId(q.id); setTitle(q.title); setAmount(q.amount != null ? String(q.amount) : ''); setStatus(q.status); setNotes(q.notes || ''); setQuoteDate(q.quote_date || ''); setShowForm(true)
  }
  function cancel() { setShowForm(false); setEditId(null) }

  async function save() {
    if (!title.trim()) return
    setSaving(true)
    const payload = { artist_name: artistName, title: title.trim(), amount: amount ? parseFloat(amount) : null, status, notes: notes.trim() || null, quote_date: quoteDate || null }
    if (editId) {
      await supabase.from('quotes').update(payload).eq('id', editId)
    } else {
      await supabase.from('quotes').insert(payload)
    }
    setSaving(false); setShowForm(false); setEditId(null); load()
  }

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('quotes').update({ status: newStatus }).eq('id', id)
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q))
  }

  async function remove(id: string) {
    if (!confirm('מחוק הצעה מחיר זה?')) return
    await supabase.from('quotes').delete().eq('id', id)
    setQuotes(prev => prev.filter(q => q.id !== id))
  }

  const totalApproved = quotes.filter(q => q.status === 'אושר').reduce((s, q) => s + (q.amount || 0), 0)

  if (loading) return <div className="text-center py-16 text-slate-400">טוען...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {quotes.length} הצעות · אושרו: <span className="font-semibold text-green-600">₪{fmtNum(String(totalApproved))}</span>
          </p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          + הצעה חדשה
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 mb-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 text-sm">{editId ? 'עריכת הצעה' : 'הצעת מחיר חדשה'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="כותרת הצעה..." className={iCls + ' col-span-2'} />
            <input value={amount} onChange={e => setAmount(e.target.value)} type="number" placeholder="סכום (₪)..." className={iCls} />
            <input value={quoteDate} onChange={e => setQuoteDate(e.target.value)} type="date" className={iCls} />
            <div className="flex gap-2 col-span-2">
              {QUOTE_STATUSES.map(s => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${status === s ? QUOTE_STATUS_COLOR[s] + ' border-current' : 'border-slate-200 text-slate-400'}`}>
                  {s}
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות..." className={iCls + ' col-span-2'} rows={2} />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={cancel} className="flex-1 border border-slate-200 dark:border-gray-600 text-slate-600 dark:text-slate-300 py-2 rounded-lg text-sm font-medium">ביטול</button>
            <button onClick={save} disabled={saving || !title.trim()} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">{saving ? 'שומר...' : 'שמור'}</button>
          </div>
        </div>
      )}

      {quotes.length === 0 ? (
        <Empty msg="אין הצעות מחיר עדיין" sub='לחץ על "הצעה חדשה" להוסיף' />
      ) : (
        <div className="space-y-3">
          {quotes.map(q => (
            <div key={q.id} className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm">{q.title}</p>
                  <select
                    value={q.status}
                    onChange={e => updateStatus(q.id, e.target.value)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 outline-none cursor-pointer ${QUOTE_STATUS_COLOR[q.status] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {QUOTE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  {q.amount != null && <span className="font-semibold text-indigo-600 dark:text-indigo-400">₪{fmtNum(String(q.amount))}</span>}
                  {q.quote_date && <span>{fmtDate(q.quote_date)}</span>}
                  {q.notes && <span className="truncate max-w-xs">{q.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => openEdit(q)} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => remove(q.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SHead({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{children}</h3>
}
function Empty({ msg, sub }: { icon?: string; msg: string; sub?: string }) {
  return (
    <div className="text-center py-16">
      <p className="text-slate-400 dark:text-slate-500 font-medium">{msg}</p>
      {sub && <p className="text-slate-300 dark:text-slate-600 text-sm mt-1">{sub}</p>}
    </div>
  )
}

function EventRow({ event, showFinancials=false }: { event: ArtistEvent; showFinancials?: boolean }) {
  const sc = STATUS_COLORS[event.status||''] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'


  return (
    <div className={`bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-xl px-4 py-3 ${event.status==='בוטל'?'opacity-50':''}`}>
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
              {event.total_revenue && <span className="text-blue-600">סה"כ הכנסה: ₪{parseFloat(event.total_revenue).toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
              {event.net_profit && <span className="text-green-600">רווח: ₪{parseFloat(event.net_profit).toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
              {event.artist_share && <span className="text-indigo-600">הזמר: ₪{parseFloat(event.artist_share).toLocaleString('he-IL',{maximumFractionDigits:0})}</span>}
            </div>
          )}
        </div>
        {event.contract_status && (
          <span className={`text-xs px-2 py-1 rounded-lg flex-shrink-0 ${event.contract_status==='חוזה חתום'?'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200':'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'}`}>{event.contract_status}</span>
        )}
      </div>
    </div>
  )
}

// ── RepertoireTab ───────────────────────────────────────────────────────────
type RightsHolder = { name: string; pct: number }
type Song = {
  id: number
  artist_name: string
  title: string
  year: string | null
  isrc: string | null
  master_pct: number | null
  publishing_pct: number | null
  master_owners: RightsHolder[] | null
  publishing_owners: RightsHolder[] | null
  writers: string | null
  producers: string | null
  label: string | null
  notes: string | null
  revenue: number | null
  federation_revenue: number | null
  streaming_revenue: number | null
}

// Parse "אקו 50%, Tito 50%" → [{name:"אקו",pct:50},{name:"Tito",pct:50}]
function parseOwners(raw: string): RightsHolder[] {
  return raw.split(/[;,]/).map(s => s.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(.+?)\s+([\d.]+)\s*%?\s*$/)
    if (m) return { name: m[1].trim(), pct: parseFloat(m[2]) }
    return { name: part, pct: 0 }
  }).filter(o => o.name)
}

// Serialize [{name,pct}] → "אקו 50%, Tito 50%"
function serializeOwners(owners: RightsHolder[]): string {
  return owners.map(o => `${o.name} ${o.pct}%`).join(', ')
}

const EMPTY_SONG = {
  title: '', year: '', isrc: '',
  master_owners_text: '', publishing_owners_text: '',
  writers: '', producers: '', label: '', notes: ''
}

function RepertoireTab({ artistName }: { artistName: string }) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const [form, setForm] = useState<typeof EMPTY_SONG>(EMPTY_SONG)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [filterAlbum, setFilterAlbum] = useState('all')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [rightType, setRightType] = useState<'master' | 'publishing'>('master')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [revenueEditing, setRevenueEditing] = useState<Record<number, string>>({})

  function load() {
    setLoading(true)
    fetch(`/api/artist-songs?artist=${encodeURIComponent(artistName)}`)
      .then(r => r.json())
      .then(d => setSongs(d.songs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useState(() => { load() })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [artistName])

  const set = (k: keyof typeof EMPTY_SONG) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function openNew() { setForm(EMPTY_SONG); setEditSong(null); setShowForm(true) }
  function openEdit(s: Song) {
    setForm({
      title: s.title, year: s.year || '', isrc: s.isrc || '',
      master_owners_text: s.master_owners ? serializeOwners(s.master_owners) : '',
      publishing_owners_text: s.publishing_owners ? serializeOwners(s.publishing_owners) : '',
      writers: s.writers || '', producers: s.producers || '', label: s.label || '', notes: s.notes || ''
    })
    setEditSong(s); setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const masterOwners = form.master_owners_text.trim() ? parseOwners(form.master_owners_text) : null
      const publishingOwners = form.publishing_owners_text.trim() ? parseOwners(form.publishing_owners_text) : null
      const payload = {
        artist_name: artistName,
        title: form.title.trim(),
        year: form.year || null,
        isrc: form.isrc || null,
        master_owners: masterOwners,
        publishing_owners: publishingOwners,
        // derive pct from the artist's own entry
        master_pct: masterOwners?.find(o => o.name === artistName || o.name === 'אקו' || o.name === 'Echo')?.pct ?? null,
        publishing_pct: publishingOwners?.find(o => o.name === artistName || o.name === 'אקו' || o.name === 'Echo')?.pct ?? null,
        writers: form.writers || null,
        producers: form.producers || null,
        label: form.label || null,
        notes: form.notes || null,
      }
      if (editSong) {
        const r = await fetch('/api/artist-songs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editSong.id, ...payload }) })
        const d = await r.json()
        if (d.song) setSongs(prev => prev.map(s => s.id === editSong.id ? d.song : s))
      } else {
        const r = await fetch('/api/artist-songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const d = await r.json()
        if (d.song) setSongs(prev => [d.song, ...prev])
      }
      setShowForm(false)
    } finally { setSaving(false) }
  }

  async function deleteSong(id: number) {
    await fetch(`/api/artist-songs?id=${id}`, { method: 'DELETE' })
    setSongs(prev => prev.filter(s => s.id !== id))
    setDeleteId(null)
  }

  async function saveRevenue(id: number, raw: string) {
    const val = parseFloat(raw.replace(/,/g, '')) || 0
    await fetch('/api/artist-songs', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, revenue: val }) })
    setSongs(prev => prev.map(s => s.id === id ? { ...s, revenue: val } : s))
    setRevenueEditing(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const albums = useMemo(() => {
    const set = new Set(songs.map(s => s.label).filter(Boolean) as string[])
    return Array.from(set).sort((a, b) => {
      // Sort by year of first song in album
      const ay = songs.find(s => s.label === a)?.year ?? '9999'
      const by = songs.find(s => s.label === b)?.year ?? '9999'
      return ay.localeCompare(by)
    })
  }, [songs])

  const filtered = songs
    .filter(s => filterAlbum === 'all' || s.label === filterAlbum)
    .filter(s => {
      if (!search) return true
      const q = search.toLowerCase()
      if (s.title.toLowerCase().includes(q)) return true
      if ((s.writers ?? '').toLowerCase().includes(q)) return true
      const owners = rightType === 'master' ? s.master_owners : s.publishing_owners
      if (owners?.some(o => o.name.toLowerCase().includes(q))) return true
      return false
    })

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* מאסטר / פאבלישינג toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-semibold">
          <button
            onClick={() => setRightType('master')}
            className={`px-5 py-2 transition-colors ${rightType === 'master' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
          >
            מאסטר
          </button>
          <button
            onClick={() => setRightType('publishing')}
            className={`px-5 py-2 transition-colors ${rightType === 'publishing' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
          >
            פאבלישינג
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <span className="text-sm text-gray-400">{filtered.length}{filtered.length !== songs.length ? `/${songs.length}` : ''} שירים</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="שיר, כותב, בעל זכות..."
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 w-44" />
          <select value={filterAlbum} onChange={e => setFilterAlbum(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[160px]">
            <option value="all">כל האלבומים</option>
            {albums.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
          <button onClick={() => setViewMode('table')}
            title="טבלה"
            className={`px-3 py-2 transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" /></svg>
          </button>
          <button onClick={() => setViewMode('cards')}
            title="כרטיסי זכויות"
            className={`px-3 py-2 transition-colors ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
        </div>

        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          הוסף שיר
        </button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">טוען...</div>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-300">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p className="text-sm">אין שירים עדיין — לחץ על ״הוסף שיר״ להתחיל</p>
        </div>
      )}

      {/* ── Cards view ── */}
      {!loading && viewMode === 'cards' && <RightsHolderCards songs={filtered} rightType={rightType} />}

      {/* ── Table view ── */}
      {!loading && viewMode === 'table' && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold">
                <th className="text-right px-4 py-3 w-6"></th>
                <th className="text-right px-4 py-3">שם השיר</th>
                <th className="text-right px-4 py-3 w-28">אלבום</th>
                <th className="text-right px-4 py-3 w-14">שנה</th>
                <th className="text-right px-4 py-3">בעלי זכויות</th>
                <th className="text-right px-4 py-3">כותבים</th>
                <th className="text-right px-4 py-3 w-24">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const expanded = expandedId === s.id
                return (
                  <React.Fragment key={s.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : s.id)}
                      className={`border-b border-gray-50 cursor-pointer hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-4 py-3">
                        <svg className={`w-3.5 h-3.5 text-gray-300 transition-transform ${expanded ? 'rotate-90 text-indigo-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                      <td className="px-4 py-3 text-xs text-indigo-500 font-medium truncate max-w-[110px]">{s.label || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.year || '—'}</td>
                      {/* Owner chips */}
                      <td className="px-4 py-3">
                        {(() => {
                          const owners = rightType === 'master' ? s.master_owners : s.publishing_owners
                          if (!owners || owners.length === 0) return <span className="text-gray-300 text-xs">—</span>
                          return (
                            <div className="flex flex-wrap gap-1">
                              {owners.map((o, idx) => (
                                <span key={idx} className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                                  rightType === 'master'
                                    ? (o.pct === 100 ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-50 text-indigo-500')
                                    : (o.pct === 100 ? 'bg-purple-100 text-purple-700' : 'bg-purple-50 text-purple-500')
                                }`}>
                                  {o.name} <span className="font-bold">{o.pct}%</span>
                                </span>
                              ))}
                            </div>
                          )
                        })()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[160px]">{s.writers || '—'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => openEdit(s)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">עריכה</button>
                          <button onClick={() => setDeleteId(s.id)} className="text-xs px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-indigo-100 bg-indigo-50/30">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            {s.isrc && <div><span className="text-gray-400 block">ISRC</span><span className="font-mono text-gray-700">{s.isrc}</span></div>}
                            {s.producers && <div><span className="text-gray-400 block">מפיקים</span><span className="text-gray-700">{s.producers}</span></div>}
                            {s.label && <div><span className="text-gray-400 block">תווית / הפצה</span><span className="text-gray-700">{s.label}</span></div>}
                            {s.notes && <div className="col-span-3"><span className="text-gray-400 block mb-1">הערות</span><span className="text-gray-700 whitespace-pre-wrap">{s.notes}</span></div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">{editSong ? 'עריכת שיר' : 'הוספת שיר'}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <F label="שם השיר *"><input value={form.title} onChange={set('title')} className={inputCls} placeholder="שם השיר" autoFocus /></F>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <F label="שנת הוצאה"><input value={form.year} onChange={set('year')} className={inputCls} placeholder="2024" /></F>
                <F label="ISRC"><input value={form.isrc} onChange={set('isrc')} className={inputCls} placeholder="IL-..." /></F>
              </div>
              <div className="col-span-2">
                <F label='בעלי זכויות מאסטר (למשל: אקו 50%, Tito 50%)'>
                  <input value={form.master_owners_text} onChange={set('master_owners_text')} className={inputCls} placeholder="אקו 100%  או  אקו 50%, שם 50%" />
                </F>
                <p className="text-xs text-gray-400 mt-1">פורמט: שם אחוז%, שם אחוז% — מופרד בפסיקים</p>
              </div>
              <div className="col-span-2">
                <F label='בעלי זכויות פאבלישינג'>
                  <input value={form.publishing_owners_text} onChange={set('publishing_owners_text')} className={inputCls} placeholder="אקו 100%  או  אקו 50%, שם 50%" />
                </F>
              </div>
              <div className="col-span-2">
                <F label="כותבים"><input value={form.writers} onChange={set('writers')} className={inputCls} placeholder="שם הכותב, שותף..." /></F>
              </div>
              <div className="col-span-2">
                <F label="מפיקים"><input value={form.producers} onChange={set('producers')} className={inputCls} placeholder="שם המפיק..." /></F>
              </div>
              <div className="col-span-2">
                <F label="תווית / הפצה"><input value={form.label} onChange={set('label')} className={inputCls} placeholder="Warner, Sony, עצמאי..." /></F>
              </div>
              <div className="col-span-2">
                <F label="הערות">
                  <textarea value={form.notes} onChange={set('notes')} rows={2} className={`${inputCls} resize-none`} />
                </F>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">ביטול</button>
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4 max-w-sm w-full">
            <p className="font-semibold text-gray-900">למחוק את השיר?</p>
            <p className="text-sm text-gray-400">פעולה זו אינה הפיכה.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm">ביטול</button>
              <button onClick={() => deleteSong(deleteId)} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">מחק</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── RightsHolderCards ─────────────────────────────────────────────────────
function RightsHolderCards({ songs, rightType }: { songs: Song[]; rightType: 'master' | 'publishing' }) {
  const fmt = (n: number) => n > 0 ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

  const holders = useMemo(() => {
    const map: Record<string, { name: string; songs: { title: string; label: string | null; pct: number; earned: number }[]; total: number }> = {}
    songs.forEach(s => {
      const owners = rightType === 'master' ? s.master_owners : s.publishing_owners
      if (!owners) return
      const rev = (rightType === 'master' ? s.federation_revenue ?? 0 : s.streaming_revenue ?? 0) +
                  (s.revenue ?? 0)
      owners.forEach(o => {
        if (!map[o.name]) map[o.name] = { name: o.name, songs: [], total: 0 }
        const earned = rev * o.pct / 100
        map[o.name].songs.push({ title: s.title, label: s.label, pct: o.pct, earned })
        map[o.name].total += earned
      })
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [songs, rightType])

  const totalRevenue = songs.reduce((s, x) => s + (x.revenue ?? 0) + (x.federation_revenue ?? 0) + (x.streaming_revenue ?? 0), 0)

  if (holders.length === 0) {
    return <div className="text-center py-16 text-gray-300 text-sm">אין נתוני בעלי זכויות</div>
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 flex items-center gap-6 flex-wrap">
        <div><span className="text-xs text-indigo-400">סה״כ הכנסות</span><p className="text-lg font-bold text-indigo-700">{totalRevenue > 0 ? fmt(totalRevenue) : '—'}</p></div>
        <div><span className="text-xs text-indigo-400">בעלי זכויות</span><p className="text-lg font-bold text-indigo-700">{holders.length}</p></div>
        <div><span className="text-xs text-indigo-400">שירים</span><p className="text-lg font-bold text-indigo-700">{songs.length}</p></div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {holders.map(h => (
          <div key={h.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-5 py-4 bg-gradient-to-l from-indigo-50 to-white border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-base">{h.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{h.songs.length} שירים</p>
              </div>
              <div className="text-left">
                <p className="text-xl font-bold text-indigo-600">{h.total > 0 ? fmt(h.total) : '—'}</p>
                <p className="text-xs text-gray-400">סה״כ לתשלום</p>
              </div>
            </div>
            {/* Song list */}
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {h.songs.map((s, i) => (
                <div key={i} className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50/50">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate block">{s.title}</span>
                    {s.label && <span className="text-xs text-gray-400">{s.label}</span>}
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${rightType === 'master' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>{s.pct}%</span>
                    <span className="text-sm font-semibold text-gray-700 w-20 text-left">{s.earned > 0 ? fmt(s.earned) : <span className="text-gray-300">—</span>}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── RoyaltiesTab ──────────────────────────────────────────────────────────
type RoyaltyReport = {
  id: number
  artist_name: string
  source: string
  period: string
  song_revenues: { song_id: number; title: string; amount: number }[]
  notes: string | null
  created_at: string
}

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

function fmtPeriod(period: string, source: string) {
  if (source === 'federation') return `שנת ${period}`
  const [y, m] = period.split('-')
  return `${MONTHS_HE[parseInt(m) - 1]} ${y}`
}

function RoyaltiesTab({ artistName }: { artistName: string }) {
  const [source, setSource] = useState<'federation' | 'streaming'>('federation')
  const [songs, setSongs] = useState<Song[]>([])
  const [reports, setReports] = useState<RoyaltyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<RoyaltyReport | null>(null)
  const [showNewReport, setShowNewReport] = useState(false)

  // New report form
  const curYear = new Date().getFullYear()
  const [newPeriodYear, setNewPeriodYear] = useState(String(curYear))
  const [newPeriodMonth, setNewPeriodMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))
  const [newAmounts, setNewAmounts] = useState<Record<number, string>>({})
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterAlbum, setFilterAlbum] = useState('all')

  function loadAll() {
    setLoading(true)
    Promise.all([
      fetch(`/api/artist-songs?artist=${encodeURIComponent(artistName)}`).then(r => r.json()),
      fetch(`/api/royalty-reports?artist=${encodeURIComponent(artistName)}&source=${source}`).then(r => r.json()),
    ]).then(([songData, repData]) => {
      setSongs(songData.songs || [])
      const reps: RoyaltyReport[] = repData.reports || []
      setReports(reps)
      if (reps.length > 0 && !selectedReport) setSelectedReport(reps[0])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [artistName, source]) // eslint-disable-line react-hooks/exhaustive-deps

  const albums = useMemo(() => {
    const set = new Set(songs.map(s => s.label).filter(Boolean) as string[])
    return Array.from(set).sort((a, b) => {
      const ay = songs.find(s => s.label === a)?.year ?? '9999'
      const by = songs.find(s => s.label === b)?.year ?? '9999'
      return ay.localeCompare(by)
    })
  }, [songs])

  const filteredSongs = songs.filter(s => filterAlbum === 'all' || s.label === filterAlbum)
  const fmtILS = (n: number) => n > 0 ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 2 })}` : '—'

  // Distribution for selected report
  const distribution = useMemo(() => {
    if (!selectedReport) return []
    const map: Record<string, number> = {}
    selectedReport.song_revenues.forEach(sr => {
      if (!sr.amount) return
      const song = songs.find(s => s.id === sr.song_id)
      if (!song?.master_owners) return
      song.master_owners.forEach(o => {
        map[o.name] = (map[o.name] ?? 0) + sr.amount * o.pct / 100
      })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [selectedReport, songs])

  const reportTotal = selectedReport?.song_revenues.reduce((s, r) => s + (r.amount ?? 0), 0) ?? 0

  async function saveReport() {
    const period = source === 'federation' ? newPeriodYear : `${newPeriodYear}-${newPeriodMonth}`
    const song_revenues = songs.map(s => ({
      song_id: s.id,
      title: s.title,
      label: s.label,
      amount: parseFloat(String(newAmounts[s.id] ?? '').replace(/,/g, '')) || 0,
    })).filter(r => r.amount > 0)

    setSaving(true)
    const res = await fetch('/api/royalty-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_name: artistName, source, period, song_revenues, notes: newNotes || null })
    })
    const d = await res.json()
    if (d.report) {
      setReports(prev => [d.report, ...prev])
      setSelectedReport(d.report)
      setShowNewReport(false)
      setNewAmounts({})
      setNewNotes('')
    }
    setSaving(false)
  }

  async function deleteReport(id: number) {
    await fetch(`/api/royalty-reports?id=${id}`, { method: 'DELETE' })
    setReports(prev => prev.filter(r => r.id !== id))
    if (selectedReport?.id === id) setSelectedReport(reports.find(r => r.id !== id) ?? null)
  }

  const years = Array.from({ length: 10 }, (_, i) => String(curYear - i))

  return (
    <div className="space-y-4" dir="rtl">
      {/* Source toggle + new report button */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-semibold">
          <button onClick={() => { setSource('federation'); setSelectedReport(null) }}
            className={`px-5 py-2 transition-colors ${source === 'federation' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
            פדרציה
          </button>
          <button onClick={() => { setSource('streaming'); setSelectedReport(null) }}
            className={`px-5 py-2 transition-colors ${source === 'streaming' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
            סטרימינג
          </button>
        </div>
        <button onClick={() => setShowNewReport(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          הזן דו״ח {source === 'federation' ? 'שנתי' : 'חודשי'}
        </button>
      </div>

      {loading && <div className="text-center py-10 text-gray-400 text-sm">טוען...</div>}

      {!loading && reports.length === 0 && (
        <div className="text-center py-16 text-gray-300">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">אין דו״חות עדיין — לחץ ״הזן דו״ח״ להתחיל</p>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Report list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 text-xs font-semibold text-gray-400">דו״חות</div>
            <div className="divide-y divide-gray-50">
              {reports.map(r => (
                <div key={r.id}
                  onClick={() => setSelectedReport(r)}
                  className={`px-4 py-3 cursor-pointer flex items-center justify-between group hover:bg-indigo-50/50 transition-colors ${selectedReport?.id === r.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : ''}`}>
                  <div>
                    <p className={`text-sm font-medium ${selectedReport?.id === r.id ? 'text-indigo-700' : 'text-gray-800'}`}>{fmtPeriod(r.period, r.source)}</p>
                    <p className="text-xs text-gray-400">
                      {fmtILS(r.song_revenues.reduce((s, x) => s + (x.amount ?? 0), 0))}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); deleteReport(r.id) }}
                    className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Report detail + distribution */}
          {selectedReport && (
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Songs */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{fmtPeriod(selectedReport.period, selectedReport.source)}</span>
                  <span className="text-xs text-gray-400">סה״כ: <b className="text-indigo-600">{fmtILS(reportTotal)}</b></span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[55vh] overflow-y-auto">
                  {selectedReport.song_revenues.filter(r => r.amount > 0).map((r, i) => (
                    <div key={i} className="px-5 py-2.5 flex items-center justify-between hover:bg-gray-50/50">
                      <span className="text-sm text-gray-800 flex-1 truncate">{r.title}</span>
                      <span className="text-sm font-semibold text-emerald-600 ml-4">{fmtILS(r.amount)}</span>
                    </div>
                  ))}
                  {selectedReport.song_revenues.filter(r => r.amount > 0).length === 0 && (
                    <div className="px-5 py-8 text-center text-gray-300 text-sm">אין נתוני הכנסות בדו״ח זה</div>
                  )}
                </div>
              </div>

              {/* Distribution */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3">
                  <p className="text-sm font-bold text-indigo-800">חלוקת תמלוגים</p>
                  <p className="text-xs text-indigo-400 mt-0.5">לפי % בעלות מאסטר</p>
                </div>
                {distribution.length === 0 ? (
                  <div className="p-5 text-center text-gray-300 text-xs">אין נתונים לחלוקה</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {distribution.map(([name, amount]) => (
                      <div key={name} className="px-5 py-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{name}</span>
                        <span className="text-sm font-bold text-indigo-600">{fmtILS(Math.round(amount * 100) / 100)}</span>
                      </div>
                    ))}
                    <div className="px-5 py-3 flex items-center justify-between bg-indigo-50">
                      <span className="text-sm font-bold text-indigo-800">סה״כ</span>
                      <span className="text-sm font-bold text-indigo-700">{fmtILS(Math.round(distribution.reduce((s, [, v]) => s + v, 0) * 100) / 100)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New report modal */}
      {showNewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-gray-900">דו״ח {source === 'federation' ? 'פדרציה שנתי' : 'סטרימינג חודשי'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">הזן את הסכום שהתקבל לכל שיר</p>
              </div>
              <button onClick={() => setShowNewReport(false)} className="text-gray-300 hover:text-gray-500 text-xl">✕</button>
            </div>

            {/* Period selector */}
            <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">תקופה:</span>
              {source === 'streaming' && (
                <select value={newPeriodMonth} onChange={e => setNewPeriodMonth(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {MONTHS_HE.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
                </select>
              )}
              <select value={newPeriodYear} onChange={e => setNewPeriodYear(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {/* Album filter */}
              <select value={filterAlbum} onChange={e => setFilterAlbum(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 mr-auto max-w-[150px]">
                <option value="all">כל האלבומים</option>
                {albums.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Song list */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredSongs.map(s => (
                <div key={s.id} className="px-6 py-2.5 flex items-center gap-3 hover:bg-gray-50/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-gray-400">₪</span>
                    <input
                      type="text" inputMode="decimal"
                      value={newAmounts[s.id] ?? ''}
                      onChange={e => setNewAmounts(p => ({ ...p, [s.id]: e.target.value }))}
                      placeholder="0"
                      className="w-28 text-sm border border-gray-200 rounded-lg px-2 py-1 text-left focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Notes + save */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 space-y-3">
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)}
                placeholder="הערות (אופציונלי)"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowNewReport(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">ביטול</button>
                <button onClick={saveReport} disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? 'שומר...' : 'שמור דו״ח'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
