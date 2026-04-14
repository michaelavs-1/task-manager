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

const BARBY_ARTISTS_STORAGE_KEY = 'barby_artists_bank_v1'
const BARBY_ARTISTS_INITIAL: string[] = [
  'נינט טייב','דודו טסה','טונה','ריטה',"VINI VICI - ויני ויצ'י",
  'עמרי סמדר','יסמין מועלם','פורטיס','פול טראנק','שירה זלוף',
  'מיכה שטרית','אהוד בנאי','ימן בלוז','דיקלה','אתניX',
  'שלמה ארצי','נועם קלינשטיין','גל דה פז','הראל סקעת','עמיר בניון',
  'אביתר בנאי והלהקה','שלום חנוך','הדס קליינמן','מרגי','Rockfour - רוקפור',
  'טיפקס','אמיר דדון','ליהי טולדנו','תומר ישעיהו',"ג'ירפות",
  'מרסדס בנד','שאזאמאט','גון בן ארי','אידיוט','מוניקה סקס',
  'פסטיבל מקסימיליאן','אלון עדר','LOUD','BALKAN BEAT BOX','עודד פז',
  'אקו','מיצי','סינרגיה','אביב בכר','ד"ר קספר',
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
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [barbySubTab, setBarbySubTab] = useState<'active' | 'archive'>('active')
  const [showNewModal, setShowNewModal] = useState(false)
  const [barbyArtists, setBarbyArtists] = useState<string[]>(BARBY_ARTISTS_INITIAL)
  const [artistSearch, setArtistSearch] = useState('')
  const [newArtistMode, setNewArtistMode] = useState<'select' | 'create'>('select')
  const [selectedArtist, setSelectedArtist] = useState('')
  const [newArtistName, setNewArtistName] = useState('')
  const [showDate, setShowDate] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BARBY_ARTISTS_STORAGE_KEY)
      if (stored) {
        const extra: string[] = JSON.parse(stored)
        setBarbyArtists([
          ...BARBY_ARTISTS_INITIAL,
          ...extra.filter((a) => !BARBY_ARTISTS_INITIAL.includes(a)),
        ])
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
      setBarbyArtists((prev) => (prev.includes(name) ? prev : [...prev, name]))
    } catch {}
  }

  const handleCreateCampaign = async () => {
    const artistName = newArtistMode === 'create' ? newArtistName.trim() : selectedArtist
    if (!artistName) { setCreateError('יש לבחור או להזין שם אומן'); return }
    if (!showDate) { setCreateError('יש לבחור תאריך מופע'); return }
    setIsCreating(true)
    setCreateError('')
    try {
      const { error } = await supabase.from('campaigns').insert({
        name: artistName + ' - ' + showDate,
        board: 'barbie',
        status: 'חדש',
        group_title: 'לא טופל',
        launch_date: showDate,
        requester: artistName,
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      if (newArtistMode === 'create') saveArtistToBank(artistName)
      const { data } = await supabase.from('campaigns').select('*')
      if (data) setCampaigns(data)
      setShowNewModal(false)
      setSelectedArtist(''); setNewArtistName(''); setShowDate(''); setArtistSearch(''); setNewArtistMode('select')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'שגיאה ביצירת הקמפיין')
    } finally { setIsCreating(false) }
  }

  const handleStatusChange = async (campaign: Campaign, statusLabel: string, newGroupTitle: string) => {
    const id = campaign.id
    setUpdatingId(id)
    const prevStatus = campaign.status
    const prevGroupTitle = campaign.group_title
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: statusLabel, group_title: newGroupTitle } : c))
    try {
      const res = await fetch('/api/update-campaign-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id, mondayItemId: campaign.monday_item_id, statusLabel, newGroupTitle }),
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: prevStatus, group_title: prevGroupTitle } : c))
    } finally { setUpdatingId(null) }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: campaignsData, error } = await supabase.from('campaigns').select('*')
        if (error) throw error
        setCampaigns(campaignsData || [])
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

  const barbyArchiveGroups = ['נגמר - בארבי', 'נגמר - ארכיון כל הקמפיינים']
  const barbyActiveCampaigns = filteredCampaigns.filter((c) => !barbyArchiveGroups.includes(c.group_title || ''))
  const barbyArchiveCampaigns = filteredCampaigns.filter((c) => barbyArchiveGroups.includes(c.group_title || ''))
  const barbyDisplayed = barbySubTab === 'active' ? barbyActiveCampaigns : barbyArchiveCampaigns

  const barbyGrouped = barbyDisplayed.reduce((acc, c) => {
    const group = c.group_title || 'לא טופל'
    if (!acc[group]) acc[group] = []
    acc[group].push(c)
    return acc
  }, {} as Record<string, Campaign[]>)

  const barbySortedGroups = Object.entries(barbyGrouped).sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))

  const grouped = filteredCampaigns.reduce((acc, c) => {
    const group = c.group_title || 'לא טופל'
    if (!acc[group]) acc[group] = []
    acc[group].push(c)
    return acc
  }, {} as Record<string, Campaign[]>)

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b))
  const filteredArtists = barbyArtists.filter((a) => a.toLowerCase().includes(artistSearch.toLowerCase()))

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">קמפיינים</h1>
        <div className="flex items-center gap-3">
          {syncError && <span className="text-sm text-red-500 font-medium">{syncError}</span>}
          {selectedBoard === 'universal' && (
            <button onClick={handleSync} disabled={isSyncing}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isSyncing ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
              {isSyncing && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isSyncing ? 'סנכרון...' : 'סנכרון'}
            </button>
          )}
          {selectedBoard === 'barbie' && (
            <button onClick={() => { setCreateError(''); setSelectedArtist(''); setNewArtistName(''); setShowDate(''); setArtistSearch(''); setNewArtistMode('select'); setShowNewModal(true) }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              קמפיין חדש
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {BOARDS.map(({ key, label }) => (
          <button key={key} onClick={() => setSelectedBoard(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${selectedBoard === key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {selectedBoard === 'barbie' && (
        <div className="flex gap-2 mb-6">
          {[{ key: 'active', label: 'קמפיינים פעילים' }, { key: 'archive', label: 'ארכיון קמפיינים' }].map(({ key, label }) => (
            <button key={key} onClick={() => setBarbySubTab(key as 'active' | 'archive')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${barbySubTab === key ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {label}
              <span className="ml-2 text-xs font-semibold rounded-full px-1.5 py-0.5 bg-gray-100 text-gray-500">
                {key === 'active' ? barbyActiveCampaigns.length : barbyArchiveCampaigns.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedBoard === 'barbie' ? (
        barbySortedGroups.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 font-medium">אין קמפיינים בקטגוריה זו</p>
            {barbySubTab === 'active' && (
              <button onClick={() => setShowNewModal(true)} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold bg-pink-600 text-white hover:bg-pink-700 transition-colors">
                + קמפיין חדש
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {barbySortedGroups.map(([groupTitle, items]) => (
              <GroupAccordion key={groupTitle} title={groupTitle} items={items}
                borderClass={GROUP_BORDER[groupTitle]} onStatusChange={handleStatusChange} updatingId={updatingId} />
            ))}
          </div>
        )
      ) : sortedGroups.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 font-medium">אין קמפיינים בקטגוריה זו</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedGroups.map(([groupTitle, items]) => (
            <GroupAccordion key={groupTitle} title={groupTitle} items={items}
              borderClass={GROUP_BORDER[groupTitle]} onStatusChange={handleStatusChange} updatingId={updatingId} />
          ))}
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative" dir="rtl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">קמפיין חדש — בארבי</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">בחירת אומן</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setNewArtistMode('select')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${newArtistMode === 'select' ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  בחר מהמאגר
                </button>
                <button onClick={() => setNewArtistMode('create')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${newArtistMode === 'create' ? 'bg-pink-50 border-pink-300 text-pink-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  + אומן חדש
                </button>
              </div>
              {newArtistMode === 'select' ? (
                <div>
                  <input type="text" placeholder="חיפוש אומן..." value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                    className="w-full mb-2 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredArtists.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-gray-400 text-center">לא נמצאו אומנים</div>
                    ) : filteredArtists.map((artist) => (
                      <button key={artist} onClick={() => setSelectedArtist(artist)}
                        className={`w-full text-right px-3 py-2 text-sm transition-colors ${selectedArtist === artist ? 'bg-pink-50 text-pink-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
                        {artist}
                      </button>
                    ))}
                  </div>
                  {selectedArtist && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-pink-600 font-medium">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {selectedArtist}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <input type="text" placeholder="שם האומן / המופע..." value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300" />
                  <p className="mt-1.5 text-xs text-gray-400">האומן יתווסף למאגר הקבוע לשימוש עתידי</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך מופע</label>
              <input type="date" value={showDate} onChange={(e) => setShowDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>

            {createError && <p className="mb-4 text-sm text-red-500 font-medium">{createError}</p>}

            <div className="flex gap-3">
              <button onClick={handleCreateCampaign} disabled={isCreating}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isCreating ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-pink-600 text-white hover:bg-pink-700'}`}>
                {isCreating ? 'יוצר...' : 'צור קמפיין'}
              </button>
              <button onClick={() => setShowNewModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GroupAccordion({ title, items, borderClass, onStatusChange, updatingId }: {
  title: string; items: Campaign[]; borderClass?: string
  onStatusChange: (campaign: Campaign, statusLabel: string, newGroupTitle: string) => void; updatingId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm ${borderClass ? `border-l-4 ${borderClass}` : ''}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900">{title}</span>
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{items.length}</span>
        </div>
        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7-7m0 0L5 14m7-7v12" />
          </svg>
        </span>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {items.map((item) => <ItemAccordion key={item.id} campaign={item} onStatusChange={onStatusChange} updatingId={updatingId} />)}
        </div>
      )}
    </div>
  )
}

function ItemAccordion({ campaign, onStatusChange, updatingId }: {
  campaign: Campaign
  onStatusChange: (campaign: Campaign, statusLabel: string, newGroupTitle: string) => void
  updatingId: string | null
}) {
  const isUpdating = updatingId === campaign.id
  const [expanded, setExpanded] = useState(false)
  const statusClass = STATUS_CLS[campaign.status || ''] || 'bg-gray-100 text-gray-700'
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass}`}>{campaign.status || 'ללא סטטוס'}</span>
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
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</dt>
                <dd className="text-sm text-gray-700 mt-1 font-medium">{String(value)}</dd>
                {key === 'status' && (
                  <select value={campaign.status || ''} disabled={isUpdating}
                    onChange={(e) => {
                      const s = e.target.value
                      const gMap: Record<string, string> = campaign.board === 'michael'
                        ? { 'חדש': 'חדשים', 'באוויר': 'בטיפול', 'נגמר': 'הסתיימו' }
                        : { 'חדש': 'לא טופל', 'עלה לאוויר': 'עלה לאוויר', 'נגמר-ארכיון': 'נגמר-ארכיון' }
                      onStatusChange(campaign, s, gMap[s] || s)
                    }}
                    className="mt-2 w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    {(campaign.board === 'michael' ? ['חדש', 'באוויר', 'נגמר'] : ['חדש', 'עלה לאוויר', 'נגמר-ארכיון']).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
          {campaign.monday_item_id && (
            <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-200 mt-2">
              <a href={`https://monday.com/boards/${campaign.monday_item_id}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
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
