'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Campaign = {
  id: string; monday_item_id: string; name: string; status: string | null
  platforms: string | null; project_name: string | null; campaign_goal: string | null
  launch_date: string | null; end_date: string | null; campaign_type: string | null
  budget_amount: number | null; notes: string | null; requester: string | null
  group_title: string | null; updated_at: string; date_received: string | null
  schedule_type: string | null; redirect_to: string | null; dark_copy: string | null
  has_button: string | null; button_type: string | null; button_link: string | null
  budget_type: string | null; budget_intensity: string | null
  needs_michael_call: string | null; territory: string | null; ad_number: string | null
  board: string; relevant_link: string | null; facebook_link: string | null
  instagram_link: string | null; tiktok_code_link: string | null; media_url: string | null; tickets_sold: number | null; tickets_for_sale: number | null; booking_agency: string | null; office?: string
 dark_media_link: string | null
}
type Contact = { id: string; name: string; phone: string }
type ArtistMeta = { defaultOffice?: string; defaultContactId?: string }
type BoardKey = 'universal' | 'barbie' | 'general' | 'pixels'

const BOARDS: { key: BoardKey; label: string }[] = [
  { key: 'universal', label: 'קידומים יוניברסל' },
  { key: 'barbie', label: 'קידומים בארבי' },
  { key: 'general', label: 'שיווק אומנים כללי' },
  { key: 'pixels', label: 'פיקסלים' },
]
const GROUP_BORDER: Record<string, string> = {
  'לא טופל': 'border-l-blue-500','עלה לאוויר': 'border-l-emerald-500',
  'נגמר - ארכיון כל הקמפיינים': 'border-l-sky-400','נגמר - דיסני': 'border-l-rose-400',
  'נגמר - אמני יוניברסל חתומים': 'border-l-purple-400','נגמר - בארבי': 'border-l-pink-400',
}
const STATUS_CLS: Record<string, string> = {
  'חדש': 'bg-amber-100 text-amber-700','פעיל': 'bg-amber-100 text-amber-700','עלה לאוויר': 'bg-emerald-100 text-emerald-700',
  'נגמר- ארכיון': 'bg-sky-100 text-sky-700',
}
const GROUP_ORDER = ['לא טופל','עלה לאוויר','נגמר - ארכיון כל הקמפיינים','נגמר - דיסני','נגמר - אמני יוניברסל חתומים','נגמר - בארבי']

const FIELDS: [string, keyof Campaign][] = [
  ['סטאטוס','status'],['שם המופע','requester'],['משרד ייצוג','booking_agency'],['פלטפורמה','platforms'],
  ['פרויקט','project_name'],['מטרת הקמפיין','campaign_goal'],
  ['לו"ז קמפיין','schedule_type'],['סוג קמפיין','campaign_type'],
  ['תאריך עלייה','launch_date'],['תאריך סיום','end_date'],
  ['תאריך שהתקבל','date_received'],['הפנייה ל','redirect_to'],
  ['ניהול תקציב','budget_type'],['עצימות תקציב','budget_intensity'],
  ['תקציב','budget_amount'],['הוספת כפתור','has_button'],
  ['סוג כפתור','button_type'],['לינק כפתור','button_link'],
  ['לינק רלוונטי','relevant_link'],['לינק לפייסבוק','facebook_link'],
  ['לינק לאינסטגרם','instagram_link'],['לינק לקוד טיקטוק','tiktok_code_link'],['דארק - מדיה','dark_media_link'],
  ['דגשים','notes'],['טקסט קופי','dark_copy'],['טריטוריה','territory'],
  ['מספר מודעה','ad_number'],['שיחה עם מיכאל','needs_michael_call'],
]

const BARBY_ARTISTS_STORAGE_KEY = 'barby_artists_bank_v1'
const BARBY_ARTISTS_INITIAL: string[] = [
  'נינט טייב','דודו טסה','טונה','ריטה',"VINI VICI - ויני ויצ'י",
  'עמרי סמדר','יסמין מועלם','פורטיס','פול טראנק','שירה זלוף',
  'מיכה שטרית','אהוד בנאי','ימן בלוז','דיקלה','אתניX','שלמה ארצי',
  'נועם קלינשטיין','גל דה פז','הראל סקעת','עמיר בניון',
  'אביתר בנאי והלהקה','שלום חנוך','הדס קליינמן','מרגי','Rockfour - רוקפור',
  'טיפקס','אמיר דדון','ליהי טולדנו','תומר ישעיהו',"ג'ירפות",
  'מרסדס בנד','שאזאמאט','גון בן ארי','אידיוט','מוניקה סקס',
  'פסטיבל מקסימיליאן','אלון עדר','LOUD','BALKAN BEAT BOX','עודד פז',
  'אקו','מיצי','סינרגיה','אביב בכר','ד"ר קספר',
]

const BARBY_OFFICES_STORAGE_KEY = 'barby_offices_bank_v1'
const BARBY_OFFICES_INITIAL: string[] = []

function filterCampaigns(campaigns: Campaign[], board: BoardKey): Campaign[] {
  return campaigns.filter((c) => (c.board || 'universal') === board)
}

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedBoard, setSelectedBoard] = useState<BoardKey>('universal')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [barbySubTab, setBarbySubTab] = useState<'active' | 'ended' | 'archive'>('active')
  const [barbyViewMode, setBarbyViewMode] = useState<'cards' | 'table'>('cards')
  const [showNewModal, setShowNewModal] = useState(false)
  const [barbyArtists, setBarbyArtists] = useState<string[]>(BARBY_ARTISTS_INITIAL)
  const [artistSearch, setArtistSearch] = useState('')
  const [newArtistMode, setNewArtistMode] = useState<'select' | 'create'>('select')
  const [selectedArtist, setSelectedArtist] = useState('')
  const [newArtistName, setNewArtistName] = useState('')
  const [showDate, setShowDate] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [showRosterModal, setShowRosterModal] = useState(false)
  const [newRosterArtist, setNewRosterArtist] = useState('')
  const [rosterSearch, setRosterSearch] = useState('')
  const [barbyOffices, setBarbyOffices] = useState<string[]>(BARBY_OFFICES_INITIAL)
  const [officeSearch, setOfficeSearch] = useState('')
  const [selectedOffice, setSelectedOffice] = useState('')
  const [showOfficesModal, setShowOfficesModal] = useState(false)
  const [newOfficeInput, setNewOfficeInput] = useState('')
  const [officeRosterSearch, setOfficeRosterSearch] = useState('')
  const [modalArtistOpen, setModalArtistOpen] = useState(true)
  const [modalOfficeOpen, setModalOfficeOpen] = useState(false)
  const [ticketsForSale, setTicketsForSale] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BARBY_ARTISTS_STORAGE_KEY)
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        setBarbyArtists(parsed.length > 0 ? parsed : BARBY_ARTISTS_INITIAL)
      } else {
        localStorage.setItem(BARBY_ARTISTS_STORAGE_KEY, JSON.stringify(BARBY_ARTISTS_INITIAL))
      }
    } catch {}
  }, [])

  const saveArtistToBank = (name: string) => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(BARBY_ARTISTS_STORAGE_KEY) || '[]')
      if (!stored.includes(name) && !BARBY_ARTISTS_INITIAL.includes(name)) {
        stored.push(name)
        localStorage.setItem(BARBY_ARTISTS_STORAGE_KEY, JSON.stringify(stored))
      }
      setBarbyArtists(prev => prev.includes(name) ? prev : [...prev, name])
    } catch {}
  }

  const removeArtistFromBank = (name: string) => {
    setBarbyArtists(prev => {
      const next = prev.filter(a => a !== name)
      try { localStorage.setItem(BARBY_ARTISTS_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BARBY_OFFICES_STORAGE_KEY)
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        setBarbyOffices(parsed.length > 0 ? parsed : BARBY_OFFICES_INITIAL)
      } else {
        localStorage.setItem(BARBY_OFFICES_STORAGE_KEY, JSON.stringify(BARBY_OFFICES_INITIAL))
      }
    } catch {}
  }, [])

  const removeOfficeFromBank = (name: string) => {
    setBarbyOffices(prev => {
      const next = prev.filter(a => a !== name)
      try { localStorage.setItem(BARBY_OFFICES_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const handleCreateCampaign = async () => {
    const artistName = newArtistMode === 'create' ? newArtistName.trim() : selectedArtist
    if (!artistName) { setCreateError('יש לבחור או להזין שם אומן'); return }
    if (!showDate) { setCreateError('יש לבחור תאריך מופע'); return }
    setIsCreating(true); setCreateError('')
    try {
      const { error } = await supabase.from('campaigns').insert({
        name: artistName + ' - ' + showDate, office: selectedOffice, board: 'barbie', status: 'פעיל',
        group_title: 'לא טופל', launch_date: showDate, requester: artistName,
        tickets_for_sale: ticketsForSale ? parseInt(ticketsForSale) : null,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      if (newArtistMode === 'create') saveArtistToBank(artistName)
      const { data } = await supabase.from('campaigns').select('*')
      if (data) setCampaigns(data)
      setShowNewModal(false); setSelectedArtist('')
      setSelectedOffice('')
      setOfficeSearch(''); setNewArtistName('')
      setShowDate(''); setArtistSearch(''); setNewArtistMode('select'); setTicketsForSale('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'שגיאה ביצירת הקמפיין')
    } finally { setIsCreating(false) }
  }

  const handleStatusChange = async (campaign: Campaign, statusLabel: string, newGroupTitle: string) => {
    const id = campaign.id; setUpdatingId(id)
    const prevStatus = campaign.status; const prevGroupTitle = campaign.group_title
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: statusLabel, group_title: newGroupTitle } : c))
    if (campaign.board === 'barbie') {
      const { error } = await supabase.from('campaigns').update({ status: statusLabel, group_title: newGroupTitle }).eq('id', id)
      if (error) setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: prevStatus, group_title: prevGroupTitle } : c))
      setUpdatingId(null)
      return
    }
    try {
      const res = await fetch('/api/update-campaign-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id, mondayItemId: campaign.monday_item_id, statusLabel, newGroupTitle }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: prevStatus, group_title: prevGroupTitle } : c))
    } finally { setUpdatingId(null) }
  }

  const handleMediaUpdate = (campaignId: string, mediaUrl: string | null) => {
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, media_url: mediaUrl } : c))
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('למחוק את הקמפיין?')) return
    const { error } = await supabase.from('campaigns').delete().eq('id', campaignId)
    if (!error) setCampaigns(prev => prev.filter(c => c.id !== campaignId))
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data, error } = await supabase.from('campaigns').select('*')
        if (error) throw error
        setCampaigns(data || [])
      } catch (err) { console.error('Failed to load campaigns:', err) }
      finally { setLoading(false) }
    }
    loadData()
  }, [])

  const handleSync = async () => {
    setIsSyncing(true); setSyncError('')
    try {
      const res = await fetch('/api/sync-campaigns', { method: 'POST' })
      const data = await res.json()
      if (!data.success) { setSyncError(data.error || 'Sync failed'); return }
      const { data: campaignsData, error } = await supabase.from('campaigns').select('*')
      if (error) throw error
      setCampaigns(campaignsData || [])
    } catch (err) { setSyncError(err instanceof Error ? err.message : 'Sync failed') }
    finally { setIsSyncing(false) }
  }

  const filteredCampaigns = filterCampaigns(campaigns, selectedBoard)
  const barbyArchiveGroups = ['נגמר - בארבי','נגמר - ארכיון כל הקמפיינים']
  const _today = new Date(); _today.setHours(0,0,0,0)
  const barbyActiveCampaigns = filteredCampaigns
    .filter(c => c.status !== 'ארכיון' && (!c.launch_date || new Date(c.launch_date) >= _today))
    .sort((a, b) => (a.launch_date || '').localeCompare(b.launch_date || ''))
  const barbyEndedCampaigns = filteredCampaigns
    .filter(c => c.status !== 'ארכיון' && c.launch_date && new Date(c.launch_date) < _today)
    .sort((a, b) => (b.launch_date || '').localeCompare(a.launch_date || ''))
  const barbyArchiveCampaigns = filteredCampaigns
    .filter(c => c.status === 'ארכיון')
    .sort((a, b) => (b.launch_date || '').localeCompare(a.launch_date || ''))
  const grouped = filteredCampaigns.reduce((acc, c) => {
    const group = c.group_title || 'לא טופל'
    if (!acc[group]) acc[group] = []
    acc[group].push(c)
    return acc
  }, {} as Record<string, Campaign[]>)
  const sortedGroups = Object.entries(grouped).sort(([a],[b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
  const filteredArtists = barbyArtists.filter(a => a.toLowerCase().includes(artistSearch.toLowerCase())).sort((a,b) => a.localeCompare(b,'he'))

  if (loading) return (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-500">
      <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">קמפיינים</h1>
        <div className="flex items-center gap-3">
          {syncError && <span className="text-sm text-red-500 font-medium">{syncError}</span>}
          {selectedBoard === 'universal' && (
            <button onClick={handleSync} disabled={isSyncing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isSyncing ? 'bg-gray-200 text-gray-500 dark:text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              {isSyncing && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isSyncing ? 'סנכרון...' : 'סנכרון'}
            </button>
          )}
          {selectedBoard === 'barbie' && ( <> <button onClick={() => { setRosterSearch(''); setNewRosterArtist(''); setShowRosterModal(true) }} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white dark:bg-gray-800 text-pink-600 border border-pink-200 dark:border-pink-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"> <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> מאגר אומנים </button>
        <button
          onClick={() => { setOfficeRosterSearch(''); setShowOfficesModal(true) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          מאגר משרדים
        </button>             <button onClick={() => { setCreateError(''); setSelectedArtist(''); setNewArtistName(''); setShowDate(''); setArtistSearch(''); setNewArtistMode('select'); setTicketsForSale(''); setShowNewModal(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              קמפיין חדש
            </button>
           </> )}
        </div>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {BOARDS.map(({ key, label }) => (
          <button key={key} onClick={() => setSelectedBoard(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${selectedBoard === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:bg-gray-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {selectedBoard === 'barbie' && (
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            {[{key:'active',label:'קמפיינים פעילים'},{key:'ended',label:'נגמר'},{key:'archive',label:'ארכיון קמפיינים'}].map(({key,label}) => (
              <button key={key} onClick={() => setBarbySubTab(key as 'active'|'ended'|'archive')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${barbySubTab===key ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-white text-gray-500 dark:text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:bg-gray-800'}`}>
                {label}
                <span className="ml-2 text-xs font-semibold rounded-full px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {key==='active' ? barbyActiveCampaigns.length : key==='ended' ? barbyEndedCampaigns.length : barbyArchiveCampaigns.length}
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setBarbyViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${barbyViewMode==='cards' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              תצוגת דשבורד
            </button>
            <button
              onClick={() => setBarbyViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${barbyViewMode==='table' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 6v12M6 6h12a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
              תצוגת טבלה
            </button>
          </div>
        </div>
      )}

      {selectedBoard === 'pixels' ? (
        <PixelsView />
      ) : selectedBoard === 'barbie' ? (
        (barbySubTab==='active' ? barbyActiveCampaigns : barbySubTab==='ended' ? barbyEndedCampaigns : barbyArchiveCampaigns).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium mb-4">{barbySubTab==='active' ? 'אין קמפיינים פעילים' : barbySubTab==='ended' ? 'אין קמפיינים שנגמרו' : 'אין קמפיינים בארכיון'}</p>
            {barbySubTab==='active' && <button onClick={() => setShowNewModal(true)} className="px-4 py-2 rounded-xl text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors">+ קמפיין חדש</button>}
          </div>
        ) : (
          <div>
            {(() => {
              const camps = barbySubTab==='active' ? barbyActiveCampaigns : barbySubTab==='ended' ? barbyEndedCampaigns : barbyArchiveCampaigns
              if (barbyViewMode === 'table') {
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm" dir="rtl">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                          {['תאריך','שם המופע','כרטיסים למכירה','כרטיסים מכורים','נותרו'].map(h=>(
                            <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {camps.map(camp => (
                          <TicketsTableRow key={camp.id} campaign={camp} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
              const groups: Record<string,Campaign[]> = {}
              camps.forEach(camp => {
                const key = camp.launch_date ? camp.launch_date.substring(0,7) : 'no-date'
                if (!groups[key]) groups[key] = []
                groups[key].push(camp)
              })
              const heMonths = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
              return Object.keys(groups).sort().map(key => (
                <div key={key} className="mb-6">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 tracking-widest mb-3 pb-2 border-b border-gray-200 dark:border-gray-600 text-right uppercase">
                    {key === 'no-date' ? 'ללא תאריך' : heMonths[parseInt(key.split('-')[1])-1] + ' ' + key.split('-')[0]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups[key].map(camp => (
                      <BarbyCard key={camp.id} campaign={camp} onStatusChange={handleStatusChange} updatingId={updatingId} muted={barbySubTab==='archive'} onMediaUpdate={handleMediaUpdate} onDelete={handleDeleteCampaign} />
                    ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        )
      ) : sortedGroups.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">אין קמפיינים בקטגוריה זו</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupTitle,items]) => (
            <GroupAccordion key={groupTitle} title={groupTitle} items={items} borderClass={GROUP_BORDER[groupTitle]} onStatusChange={handleStatusChange} updatingId={updatingId} />
          ))}
        </div>
      ) }

            {showOfficesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowOfficesModal(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowOfficesModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">מאגר משרדים</h2>
            </div>
            <input
              type="text"
              placeholder="חיפוש..."
              value={officeRosterSearch}
              onChange={e => setOfficeRosterSearch(e.target.value)}
              className="w-full mb-3 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <div className="divide-y divide-gray-100 dark:divide-gray-700 mb-4 max-h-64 overflow-y-auto">
              {barbyOffices.filter(o => !officeRosterSearch || o.includes(officeRosterSearch)).map(office => (
                <div key={office} className="flex items-center justify-between py-2 px-1">
                  <button onClick={() => removeOfficeFromBank(office)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded">הסר</button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{office}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const trimmed = newOfficeInput.trim()
                  if (trimmed && !barbyOffices.includes(trimmed)) {
                    const next = [...barbyOffices, trimmed].sort((a,b) => a.localeCompare(b, 'he'))
                    setBarbyOffices(next)
                    try { localStorage.setItem(BARBY_OFFICES_STORAGE_KEY, JSON.stringify(next)) } catch {}
                    setNewOfficeInput('')
                  }
                }}
                className="px-4 py-2 text-sm font-medium bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >הוסף</button>
              <input
                type="text"
                placeholder="שם משרד חדש..."
                value={newOfficeInput}
                onChange={e => setNewOfficeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const trimmed = newOfficeInput.trim()
                    if (trimmed && !barbyOffices.includes(trimmed)) {
                      const next = [...barbyOffices, trimmed].sort((a,b) => a.localeCompare(b, 'he'))
                      setBarbyOffices(next)
                      try { localStorage.setItem(BARBY_OFFICES_STORAGE_KEY, JSON.stringify(next)) } catch {}
                      setNewOfficeInput('')
                    }
                  }
                }}
                className="flex-1 px-3 py-2 text-sm text-right border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>
          </div>
        </div>
      )}

      {showRosterModal && ( <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if(e.target===e.currentTarget) setShowRosterModal(false) }}> <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative" dir="rtl"> <div className="flex items-center justify-between mb-5"> <div> <h2 className="text-lg font-bold text-gray-900 dark:text-white">מאגר אומנים</h2> <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{barbyArtists.length} אומנים במאגר</p> </div> <button onClick={() => setShowRosterModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button> </div> <div className="flex gap-2 mb-3"> <input type="text" placeholder="חיפוש אומן..." value={rosterSearch} onChange={e => setRosterSearch(e.target.value)} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" /> </div> <div className="flex gap-2 mb-4"> <input type="text" placeholder="הוסף אומן חדש..." value={newRosterArtist} onChange={e => setNewRosterArtist(e.target.value)} onKeyDown={e => { if(e.key==='Enter' && newRosterArtist.trim()) { saveArtistToBank(newRosterArtist.trim()); setNewRosterArtist('') }}} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" /> <button onClick={() => { if(newRosterArtist.trim()) { saveArtistToBank(newRosterArtist.trim()); setNewRosterArtist('') }}} className="px-4 py-2 rounded-lg text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors whitespace-nowrap">הוסף</button> </div> <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-xl"> {barbyArtists.filter(a => !rosterSearch || a.toLowerCase().includes(rosterSearch.toLowerCase())).sort((a,b) => a.localeCompare(b,'he')).map(artist => ( <div key={artist} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700"> <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{artist}</span> <button onClick={() => removeArtistFromBank(artist)} className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors">הסר</button> </div> ))} </div> </div> </div> )} {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if(e.target===e.currentTarget) setShowNewModal(false) }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">קמפיין חדש — בארבי</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            {/* Artist accordion */}
            <div className="mb-3 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setModalArtistOpen(!modalArtistOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-pink-50 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">אומנים</span>
                  {selectedArtist && <span className="text-xs text-pink-600 font-medium">{selectedArtist}</span>}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${modalArtistOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {modalArtistOpen && (
                <div className="px-4 py-3">
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setNewArtistMode('select')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${newArtistMode==='select' ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50'}`}>בחר מהמאגר</button>
                    <button onClick={() => setNewArtistMode('create')} className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${newArtistMode==='create' ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50'}`}>+ אומן חדש</button>
                  </div>
                  {newArtistMode==='select' ? (
                    <div>
                      <input type="text" placeholder="חיפוש אומן..." value={artistSearch} onChange={e => setArtistSearch(e.target.value)} className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" />
                      {artistSearch.length > 0 && <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredArtists.length===0 ? <div className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו אומנים</div>
                          : filteredArtists.map(artist => (
                            <button key={artist} onClick={() => { setSelectedArtist(artist); setArtistSearch(''); setModalArtistOpen(false) }} className={`w-full text-right px-3 py-2 text-sm transition-colors ${selectedArtist===artist ? 'bg-pink-50 text-pink-700 font-semibold' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>{artist}</button>
                          ))}
                      </div>}
                      {selectedArtist && <div className="mt-2 flex items-center gap-2 text-sm text-pink-600 font-medium"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{selectedArtist}</div>}
                    </div>
                  ) : (
                    <div>
                      <input type="text" placeholder="שם האומן / המופע..." value={newArtistName} onChange={e => setNewArtistName(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" />
                      <p className="mt-1.5 text-xs text-gray-400">האומן יתווסף למאגר הקבוע לשימוש עתידי</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Office accordion */}
            <div className="mb-4 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setModalOfficeOpen(!modalOfficeOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-pink-50 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">משרד</span>
                  {selectedOffice && <span className="text-xs text-pink-600 font-medium">{selectedOffice}</span>}
                </div>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${modalOfficeOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {modalOfficeOpen && (
                <div className="px-4 py-3">
                  <input type="text" placeholder="חיפוש משרד..." value={officeSearch} onChange={e => setOfficeSearch(e.target.value)} className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" />
                  {officeSearch.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                      {barbyOffices.filter(o => o.toLowerCase().includes(officeSearch.toLowerCase())).map(office => (
                        <button key={office} onClick={() => { setSelectedOffice(office); setOfficeSearch(''); setModalOfficeOpen(false) }}
                          className="w-full text-right px-3 py-2 text-sm hover:bg-pink-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200">
                          {office}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedOffice && (
                    <div className="flex items-center justify-between px-3 py-2 bg-pink-50 dark:bg-gray-700 rounded-lg text-sm mt-1">
                      <button onClick={() => setSelectedOffice('')} className="text-gray-400 hover:text-red-500">✕</button>
                      <span className="font-medium text-pink-700 dark:text-pink-300">{selectedOffice}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">תאריך מופע</label>
              <input type="date" value={showDate} onChange={e => setShowDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" />
            </div>

            {/* Tickets for sale */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">כרטיסים למכירה</label>
              <input
                type="number"
                min="0"
                value={ticketsForSale}
                onChange={e => setTicketsForSale(e.target.value)}
                placeholder="כמות כרטיסים עומדים למכירה..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {createError && <p className="mb-4 text-sm text-red-500 font-medium">{createError}</p>}
            <div className="flex gap-3">
              <button onClick={handleCreateCampaign} disabled={isCreating} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isCreating ? 'bg-gray-200 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-pink-600 text-white hover:bg-pink-700'}`}>{isCreating ? 'יוצר...' : 'צור קמפיין'}</button>
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 transition-colors">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TicketsTableRow({ campaign }: { campaign: Campaign }) {
  const [soldInput, setSoldInput] = useState<string>(campaign.tickets_sold != null ? String(campaign.tickets_sold) : '')
  const forSale = campaign.tickets_for_sale ?? null
  const soldNum = soldInput !== '' ? parseInt(soldInput) : null
  const remaining = forSale != null && soldNum != null ? forSale - soldNum : forSale != null ? forSale : null
  return (
    <tr className="hover:bg-pink-50/30 dark:hover:bg-gray-750 transition-colors">
      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm font-medium">
        {campaign.launch_date ? new Date(campaign.launch_date).toLocaleDateString('he-IL') : '—'}
      </td>
      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
        {campaign.requester || campaign.name}
      </td>
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
        {forSale != null ? forSale : '—'}
      </td>
      <td className="px-4 py-3">
        {forSale != null ? (
          <input
            type="number"
            min="0"
            max={forSale}
            value={soldInput}
            onChange={e => setSoldInput(e.target.value)}
            onBlur={async () => {
              const val = soldInput !== '' ? parseInt(soldInput) : null
              await supabase.from('campaigns').update({ tickets_sold: val, updated_at: new Date().toISOString() }).eq('id', campaign.id)
            }}
            placeholder="0"
            className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
          />
        ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
      </td>
      <td className="px-4 py-3">
        {remaining != null ? (
          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${remaining <= 0 ? 'bg-red-100 text-red-600' : remaining <= 20 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
            {remaining <= 0 ? 'אזלו' : remaining}
          </span>
        ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
      </td>
    </tr>
  )
}

function BarbyCard({ campaign, onStatusChange, updatingId, muted=false, onMediaUpdate, onDelete }: {
  campaign: Campaign; onStatusChange: (c: Campaign, s: string, g: string) => void
  updatingId: string | null; muted?: boolean; onMediaUpdate: (id: string, url: string | null) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [localMediaUrl, setLocalMediaUrl] = useState<string | null>(campaign.media_url || null)
  const [localTicketsSold, setLocalTicketsSold] = useState<string>(campaign.tickets_sold != null ? String(campaign.tickets_sold) : '')
  const [localTicketsForSale, setLocalTicketsForSale] = useState<number | null>(campaign.tickets_for_sale ?? null)
  const [ticketsForSaleInput, setTicketsForSaleInput] = useState<string>(campaign.tickets_for_sale != null ? String(campaign.tickets_for_sale) : '')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUpdating = updatingId === campaign.id
  const displayStatus = campaign.status === 'חדש' ? 'פעיל' : (campaign.status || 'ללא סטאטוס')
  const statusClass = STATUS_CLS[campaign.status || ''] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
  const artistName = campaign.requester || campaign.name
  const [localLaunchDate, setLocalLaunchDate] = useState(campaign.launch_date || '')
  const ticketsSoldNum = localTicketsSold !== '' ? parseInt(localTicketsSold) : null
  const ticketsRemaining = localTicketsForSale != null && ticketsSoldNum != null ? localTicketsForSale - ticketsSoldNum : localTicketsForSale != null ? localTicketsForSale : null
  const dateStr = localLaunchDate ? (() => {
    try { return new Date(localLaunchDate).toLocaleDateString('he-IL', {day:'2-digit',month:'2-digit',year:'numeric'}) }
    catch { return localLaunchDate }
  })() : null
  const daysRemaining = localLaunchDate ? (() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const launch = new Date(localLaunchDate); launch.setHours(0,0,0,0)
    return Math.round((launch.getTime() - today.getTime()) / (1000*60*60*24))
  })() : null

  const handleUpload = async (file: File) => {
    if (!file) return
    setUploading(true); setUploadError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `campaigns/${campaign.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('campaigns-media').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('campaigns-media').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      await supabase.from('campaigns').update({ media_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', campaign.id)
      setLocalMediaUrl(publicUrl)
      onMediaUpdate(campaign.id, publicUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'שגיאת העלאה')
    } finally { setUploading(false) }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleDelete = async () => {
    await supabase.from('campaigns').update({ media_url: null, updated_at: new Date().toISOString() }).eq('id', campaign.id)
    setLocalMediaUrl(null)
    onMediaUpdate(campaign.id, null)
  }

  const isImage = localMediaUrl ? /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(localMediaUrl) : false
  const isVideo = localMediaUrl ? /\.(mp4|mov|avi|webm)$/i.test(localMediaUrl) : false

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md ${muted ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 opacity-75' : 'border-pink-100 dark:border-pink-900 bg-white dark:bg-gray-800'}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-right p-4 focus:outline-none">
        <div className={`h-1 rounded-full mb-4 ${muted ? 'bg-gray-200' : 'bg-gradient-to-l from-pink-400 to-pink-600'}`} />
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 dark:text-white text-base leading-snug truncate">{artistName}</p>
            {dateStr && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">{dateStr}</span>
                {daysRemaining !== null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysRemaining < 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : daysRemaining === 0 ? 'bg-green-100 text-green-700' : daysRemaining <= 7 ? 'bg-red-100 text-red-600' : 'bg-pink-50 text-pink-600'}`}>
                    {daysRemaining < 0 ? `עבר` : daysRemaining === 0 ? 'היום!' : `${daysRemaining} ימים`}
                  </span>
                )}
              </div>
            )}
            {localMediaUrl && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs text-pink-500 font-medium">מדיה מצורפת</span>
              </div>
            )}
            {localTicketsForSale != null && ticketsRemaining !== null && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <svg className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ticketsRemaining <= 0 ? 'bg-red-100 text-red-600' : ticketsRemaining <= 20 ? 'bg-orange-100 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                  {ticketsRemaining <= 0 ? 'אזלו הכרטיסים' : `נותרו ${ticketsRemaining} כרטיסים`}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>{displayStatus}</span>
            <span className={`text-gray-300 transition-transform text-xs ${expanded ? 'rotate-180' : ''}`}>▼</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-4 bg-gray-50 dark:bg-gray-800 space-y-3" dir="rtl">
          {FIELDS.map(([label, key]) => {
            const value = campaign[key]
            if (!value && key !== 'launch_date') return null
            const isLink = ['relevant_link','facebook_link','instagram_link','tiktok_code_link','button_link','dark_media_link'].includes(key)
            return (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</dt>
                {key === 'launch_date' ? (
                  <input type="date" value={localLaunchDate}
                    onChange={async e => {
                      const d = e.target.value; setLocalLaunchDate(d)
                      await supabase.from('campaigns').update({ launch_date: d, updated_at: new Date().toISOString() }).eq('id', campaign.id)
                    }}
                    className="mt-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                ) : isLink ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate font-medium flex-1">{String(value)}</a>
                    <button onClick={() => navigator.clipboard.writeText(String(value))} title="העתק קישור" className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                  </div>
                ) : (
                  <dd className="text-sm text-gray-700 dark:text-gray-200 mt-0.5 font-medium">{String(value)}</dd>
                )}
                {key === 'status' && (
                  <select value={campaign.status || ''} disabled={isUpdating}
                    onChange={e => {
                      const s = e.target.value
                      const gMap: Record<string,string> = {'פעיל':'לא טופל','נגמר':'נגמר - בארבי','ארכיון':'נגמר - ארכיון כל הקמפיינים'}
                      onStatusChange(campaign, s, gMap[s] || s)
                    }}
                    className="mt-2 w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer disabled:opacity-50 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600">
                    {['פעיל','נגמר','ארכיון'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            )
          })}

          {/* Tickets section — always visible */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">כרטיסים</p>
            {localTicketsForSale == null ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={ticketsForSaleInput}
                  onChange={e => setTicketsForSaleInput(e.target.value)}
                  placeholder="כמות כרטיסים למכירה..."
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={async () => {
                    const val = ticketsForSaleInput !== '' ? parseInt(ticketsForSaleInput) : null
                    if (val == null) return
                    await supabase.from('campaigns').update({ tickets_for_sale: val, updated_at: new Date().toISOString() }).eq('id', campaign.id)
                    setLocalTicketsForSale(val)
                  }}
                  className="px-3 py-1.5 text-sm font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors whitespace-nowrap"
                >
                  הגדר
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">למכירה:</span>
                  <input
                    type="number"
                    min="0"
                    value={ticketsForSaleInput}
                    onChange={e => setTicketsForSaleInput(e.target.value)}
                    className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={async () => {
                      const val = ticketsForSaleInput !== '' ? parseInt(ticketsForSaleInput) : null
                      if (val == null) return
                      await supabase.from('campaigns').update({ tickets_for_sale: val, updated_at: new Date().toISOString() }).eq('id', campaign.id)
                      setLocalTicketsForSale(val)
                    }}
                    className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    עדכן
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">נמכרו:</span>
                  <input
                    type="number"
                    min="0"
                    max={localTicketsForSale}
                    value={localTicketsSold}
                    onChange={e => setLocalTicketsSold(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const val = localTicketsSold !== '' ? parseInt(localTicketsSold) : null
                        await supabase.from('campaigns').update({ tickets_sold: val, updated_at: new Date().toISOString() }).eq('id', campaign.id)
                      }
                    }}
                    placeholder="0"
                    className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    onClick={async () => {
                      const val = localTicketsSold !== '' ? parseInt(localTicketsSold) : null
                      await supabase.from('campaigns').update({ tickets_sold: val, updated_at: new Date().toISOString() }).eq('id', campaign.id)
                    }}
                    className="px-3 py-1 text-sm font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
                  >
                    שמור
                  </button>
                  {ticketsRemaining !== null && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ticketsRemaining <= 0 ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {ticketsRemaining <= 0 ? 'אזלו' : `נותרו ${ticketsRemaining}`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Media section */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">מדיה</p>
            {localMediaUrl ? (
              <div className="space-y-2">
                {isImage && <img src={localMediaUrl} alt="media" className="w-full rounded-lg max-h-48 object-cover" />}
                {isVideo && <video src={localMediaUrl} controls className="w-full rounded-lg max-h-48" />}
                {!isImage && !isVideo && (
                  <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 dark:border-gray-600 rounded-lg">
                    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">{localMediaUrl.split('/').pop()}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <a href={localMediaUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors text-center">
                    צפייה
                  </a>
                  <a href={localMediaUrl} download
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors text-center">
                    הורדה
                  </a>
                  <button onClick={handleDelete}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    מחיקה
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${dragging ? 'border-pink-400 bg-pink-50' : 'border-gray-200 dark:border-gray-600 hover:border-pink-300 hover:bg-pink-50/30'}`}
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin" />
                    מעלה...
                  </div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">גרור קובץ לכאן</p>
                    <p className="text-xs text-gray-300 mt-0.5">או לחץ לבחירה</p>
                  </>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) handleUpload(f) }} />
            {uploadError && <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>}
          </div>
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <button onClick={() => onDelete(campaign.id)} className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              מחק קמפיין
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupAccordion({ title, items, borderClass, onStatusChange, updatingId }: {
  title: string; items: Campaign[]; borderClass?: string
  onStatusChange: (c: Campaign, s: string, g: string) => void; updatingId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`bg-white border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm ${borderClass ? `border-l-4 ${borderClass}` : ''}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{items.length}</span>
        </div>
        <span className={`text-gray-400 dark:text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" /></svg>
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100">
          {items.map(item => <ItemAccordion key={item.id} campaign={item} onStatusChange={onStatusChange} updatingId={updatingId} />)}
        </div>
      )}
    </div>
  )
}

function ItemAccordion({ campaign, onStatusChange, updatingId }: {
  campaign: Campaign; onStatusChange: (c: Campaign, s: string, g: string) => void; updatingId: string | null
}) {
  const isUpdating = updatingId === campaign.id
  const [expanded, setExpanded] = useState(false)
  const statusClass = STATUS_CLS[campaign.status || ''] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
  const [localLaunchDate, setLocalLaunchDate] = useState(campaign.launch_date || '')
  const daysRemaining = localLaunchDate ? (() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const launch = new Date(localLaunchDate); launch.setHours(0,0,0,0)
    return Math.round((launch.getTime() - today.getTime()) / (1000*60*60*24))
  })() : null
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:bg-gray-800 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass}`}>{campaign.status || 'ללא סטטוס'}</span>
          <span className="font-semibold text-gray-900 dark:text-white truncate">{campaign.name}</span>
          {daysRemaining !== null && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${daysRemaining < 0 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500' : daysRemaining === 0 ? 'bg-green-100 text-green-700' : daysRemaining <= 7 ? 'bg-red-100 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
              {daysRemaining < 0 ? `עבר` : daysRemaining === 0 ? 'היום!' : `${daysRemaining} ימים`}
            </span>
          )}
        </div>
        <span className={`text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" /></svg>
        </span>
      </button>
      {expanded && (
        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-800 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {FIELDS.map(([label, key]) => {
            const value = campaign[key]
            if (!value && key !== 'launch_date') return null
            const isLink = ['relevant_link','facebook_link','instagram_link','tiktok_code_link','button_link','dark_media_link'].includes(key)
            return (
              <div key={key}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</dt>
                {key === 'launch_date' ? (
                  <input type="date" value={localLaunchDate}
                    onChange={async e => {
                      const d = e.target.value; setLocalLaunchDate(d)
                      await supabase.from('campaigns').update({ launch_date: d, updated_at: new Date().toISOString() }).eq('id', campaign.id)
                    }}
                    className="mt-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" />
                ) : isLink ? (
                  <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline mt-1 block truncate font-medium">{String(value)}</a>
                ) : (
                  <dd className="text-sm text-gray-700 dark:text-gray-200 mt-1 font-medium">{String(value)}</dd>
                )}
                {key === 'status' && (
                  <select value={campaign.status || ''} disabled={isUpdating}
                    onChange={e => {
                      const s = e.target.value
                      const gMap: Record<string,string> = campaign.board==='michael'
                        ? {'חדש':'חדשים','באוויר':'בטיפול','נגמר':'הסתיימו'}
                        : {'חדש':'לא טופל','עלה לאוויר':'עלה לאוויר','נגמר-ארכיון':'נגמר-ארכיון'}
                      onStatusChange(campaign, s, gMap[s] || s)
                    }}
                    className="mt-2 w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer disabled:opacity-50">
                    {['פעיל','נגמר','ארכיון'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            )
          })}
          {campaign.monday_item_id && (
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 dark:border-gray-600 mt-2">
              <a href={`https://monday.com/boards/${campaign.monday_item_id}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                פתח ב-Monday.com
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PixelsView() {
  const [pixels, setPixels] = useState<{id: string; name: string; pixel_id: string; platform: string; notes: string | null}[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [pixelId, setPixelId] = useState('')
  const [platform, setPlatform] = useState('Meta')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    supabase.from('pixels').select('*').order('platform').order('name').then(({ data }) => {
      setPixels((data as any[]) || [])
      setLoading(false)
    })
  }, [])

  const save = async () => {
    if (!name.trim() || !pixelId.trim()) return
    setSaving(true)
    const { data, error } = await supabase.from('pixels').insert({ name: name.trim(), pixel_id: pixelId.trim(), platform, notes: notes.trim() || null }).select()
    if (!error && data) { setPixels(prev => [...prev, (data as any[])[0]]) }
    setName(''); setPixelId(''); setNotes(''); setShowForm(false); setSaving(false)
  }

  const remove = async (id: string) => {
    await supabase.from('pixels').delete().eq('id', id)
    setPixels(prev => prev.filter(p => p.id !== id))
  }

  const platforms = ['Meta', 'TikTok', 'Google', 'Snapchat', 'Pinterest', 'אחר']

  if (loading) return <div className="text-center py-16 text-gray-400">טוען...</div>

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white">פיקסלים</h2>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">+ פיקסל חדש</button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="שם הפיקסל / אתר..." className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="Pixel ID..." className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300 font-mono" />
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות..." className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving || !name.trim() || !pixelId.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'שומר...' : 'שמור'}</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">ביטול</button>
          </div>
        </div>
      )}

      {pixels.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 font-medium">אין פיקסלים עדיין</p>
          <p className="text-gray-300 text-sm mt-1">לחץ על "פיקסל חדש" להוספה</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {['שם','פלטפורמה','Pixel ID','הערות',''].map(h => <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {pixels.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">{p.name}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium">{p.platform}</span></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span>{p.pixel_id}</span>
                      <button onClick={() => navigator.clipboard.writeText(p.pixel_id)} className="p-1 text-gray-300 hover:text-indigo-500 rounded" title="העתק">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{p.notes || '—'}</td>
                  <td className="px-4 py-3"><button onClick={() => remove(p.id)} className="text-gray-300 hover:text-red-500 p-1 rounded transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
