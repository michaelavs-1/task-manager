'use client'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase, supabaseConfig } from '../lib/supabase'

type Campaign = { id: string; name: string; requester: string | null; launch_date: string | null }
type UploadItem = { id: string; name: string; progress: number; status: 'uploading' | 'done' | 'error' }

const BUCKET = 'campaigns-media'
const ML_PREFIX = 'media-library'
const DROPBOX_SHARED_FOLDER_URL = 'https://www.dropbox.com/scl/fo/pv4cyapt6tgcnkmkaq1b1/AHpXDdACHUTTygAN_xOP1Xs?rlkey=c9r45ykdnq6pc0eay0gykkdnh&dl=0'

function uploadFileXHR(
  file: File,
  path: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error('העלאה נכשלה: ' + xhr.status))
    }
    xhr.onerror = () => reject(new Error('שגיאת רשת'))
    xhr.open('POST', `${supabaseConfig.url}/storage/v1/object/${BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${supabaseConfig.anonKey}`)
    xhr.setRequestHeader('apikey', supabaseConfig.anonKey)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.send(file)
  })
}

function ArtistAccordion({ artists, onSelect }: { artists: string[]; onSelect: (a: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = artists.filter(a => !search || a.toLowerCase().includes(search.toLowerCase()))

  function handleOpen() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
      {/* Accordion header */}
      <button
        type="button"
        onClick={() => open ? setOpen(false) : handleOpen()}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-650 transition-colors text-right"
      >
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">בחר אומן</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion body */}
      {open && (
        <div className="border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
          <div className="p-2 border-b border-gray-100 dark:border-gray-600">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש אומן..."
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-600">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">אין תוצאות</p>
            ) : filtered.map(artist => (
              <button
                key={artist}
                type="button"
                onClick={() => { setSearch(''); setOpen(false); onSelect(artist) }}
                className="w-full text-right px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
              >
                {artist}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function MediaLibraryView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArtist, setSelectedArtist] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [galleryItems, setGalleryItems] = useState<{ campaignId: string; artistName: string; campaignName: string; url: string; name: string; isImage: boolean }[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [filterArtist, setFilterArtist] = useState('')
  const [dropboxToken, setDropboxToken] = useState('')
  const [dropboxBasePath, setDropboxBasePath] = useState('')
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const heDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const heMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

  useEffect(() => {
    setMounted(true)
    loadCampaigns().then(camps => loadGallery(camps))
    // Use env var token first, fallback to localStorage
    const envToken = process.env.NEXT_PUBLIC_DROPBOX_TOKEN
    if (envToken) {
      setDropboxToken(envToken)
    } else {
      try {
        const t = localStorage.getItem('dropbox_token_v1')
        if (t) setDropboxToken(t)
      } catch {}
    }
  }, [])

  // Resolve Dropbox shared folder URL → actual path (so uploads go inside the shared folder, not root)
  useEffect(() => {
    if (!dropboxToken) return
    fetch('https://api.dropboxapi.com/2/sharing/get_shared_link_metadata', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + dropboxToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: DROPBOX_SHARED_FOLDER_URL })
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.path_lower) setDropboxBasePath(data.path_lower)
        else if (data && data.name) setDropboxBasePath('/' + data.name)
      })
      .catch(e => console.error('Dropbox base path resolve error', e))
  }, [dropboxToken])

  async function loadCampaigns() {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, requester, launch_date')
      .eq('board', 'barbie')
      .order('launch_date', { ascending: true })
    if (data) {
      const future = (data as Campaign[]).filter(c => {
        if (!c.launch_date) return false
        const d = new Date(c.launch_date); d.setHours(0, 0, 0, 0)
        return d >= today
      })
      setCampaigns(future)
      setLoading(false)
      return future
    }
    setLoading(false)
    return [] as Campaign[]
  }

  async function loadGallery(campaignsList?: Campaign[]) {
    setGalleryLoading(true)
    try {
      const campData = campaignsList || campaigns
      const { data: folders } = await supabase.storage.from(BUCKET).list(ML_PREFIX)
      if (!folders) { setGalleryLoading(false); return }
      const items: typeof galleryItems = []
      for (const folder of folders) {
        const campaignId = folder.name
        const { data: files } = await supabase.storage.from(BUCKET).list(ML_PREFIX + '/' + campaignId)
        if (!files) continue
        const camp = campData.find(c => c.id === campaignId)
        const artistName = camp?.requester || camp?.name || campaignId
        const campaignName = camp?.name || campaignId
        for (const file of files) {
          if (file.name === '.emptyFolderPlaceholder') continue
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(ML_PREFIX + '/' + campaignId + '/' + file.name)
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
          items.push({ campaignId, artistName, campaignName, url: urlData.publicUrl, name: file.name, isImage })
        }
      }
      setGalleryItems(items)
    } catch (e) { console.error('gallery load error', e) }
    setGalleryLoading(false)
  }

  const artistsFromCampaigns = Array.from(new Set(campaigns.map(c => c.requester || c.name).filter(Boolean))).sort()
const artistCampaigns = selectedArtist ? campaigns.filter(c => (c.requester || c.name) === selectedArtist) : []

  function formatDate(d: string | null) {
    if (!d) return ''
    try {
      const dt = new Date(d + 'T12:00:00')
      return heDays[dt.getDay()] + ', ' + dt.getDate() + ' ' + heMonths[dt.getMonth()] + ' ' + dt.getFullYear()
    } catch { return d }
  }

  async function uploadToDropbox(file: File, safeName: string) {
    if (!dropboxToken || !selectedCampaign) return
    try {
      const artistSlug = selectedArtist.replace(/[/\\:*?"<>|]/g, '_').trim()
      const showSlug = (selectedCampaign.launch_date || selectedCampaign.name || 'show').replace(/[/\\:*?"<>|]/g, '_').trim()
      const dbxPath = (dropboxBasePath || '') + '/' + artistSlug + '/' + showSlug + '/' + safeName
      await fetch('https://content.dropboxapi.com/2/files/upload', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + dropboxToken,
          'Dropbox-API-Arg': JSON.stringify({ path: dbxPath, mode: 'add', autorename: true, mute: false }),
          'Content-Type': 'application/octet-stream'
        },
        body: file
      })
    } catch (e) { console.error('Dropbox upload error', e) }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !selectedCampaign) return
    setUploadError('')
    const camp = selectedCampaign

    // Build queue entries for all files
    const newItems: UploadItem[] = Array.from(files).map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      progress: 0,
      status: 'uploading' as const
    }))
    setUploadQueue(prev => [...prev, ...newItems])

    // Reset wizard immediately so user can continue
    setStep(1); setSelectedArtist(''); setSelectedCampaign(null)

    // Upload all files in parallel
    await Promise.all(Array.from(files).map(async (file, idx) => {
      const itemId = newItems[idx].id
      const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = ML_PREFIX + '/' + camp.id + '/' + safeName
      try {
        await uploadFileXHR(file, path, (pct) => {
          setUploadQueue(prev => prev.map(u => u.id === itemId ? { ...u, progress: pct } : u))
        })
        setUploadQueue(prev => prev.map(u => u.id === itemId ? { ...u, progress: 100, status: 'done' } : u))
        // Upload to Dropbox in background (non-blocking)
        if (dropboxToken) {
          const artistSlug = (camp as any).requester?.replace(/[/\\:*?"<>|]/g, '_') || 'artist'
          const showSlug = (camp.launch_date || camp.name).replace(/[/\\:*?"<>|]/g, '_')
          const dbxPath = (dropboxBasePath || '') + '/' + artistSlug + '/' + showSlug + '/' + safeName
          fetch('https://content.dropboxapi.com/2/files/upload', {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + dropboxToken,
              'Dropbox-API-Arg': JSON.stringify({ path: dbxPath, mode: 'add', autorename: true, mute: false }),
              'Content-Type': 'application/octet-stream'
            },
            body: file
          }).catch(e => console.error('Dropbox error', e))
        }
      } catch (err) {
        setUploadQueue(prev => prev.map(u => u.id === itemId ? { ...u, status: 'error' } : u))
        setUploadError(err instanceof Error ? err.message : 'שגיאת העלאה')
      }
    }))

    // Refresh gallery after all done
    loadGallery()

    // Auto-clear done items after 4 seconds
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(u => u.status !== 'done'))
    }, 4000)
  }

  async function deleteItem(campaignId: string, fileName: string) {
    const path = ML_PREFIX + '/' + campaignId + '/' + fileName
    await supabase.storage.from(BUCKET).remove([path])
    setGalleryItems(prev => prev.filter(i => !(i.campaignId === campaignId && i.name === fileName)))
  }

  const displayedGallery = filterArtist ? galleryItems.filter(i => i.artistName === filterArtist) : galleryItems
  const galleryArtists = Array.from(new Set(galleryItems.map(i => i.artistName)))

  const activeUploads = uploadQueue.filter(u => u.status === 'uploading').length
  const totalUploads = uploadQueue.length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" dir="rtl">
      {/* Upload section */}
      <div className="mb-8 rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-900 bg-gradient-to-br from-pink-50 to-white dark:from-gray-800 dark:to-gray-850 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">העלאת מדיה חדשה</h2>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ' + (step === s ? 'bg-pink-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400')}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={'h-0.5 w-8 ' + (step > s ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700')} />}
            </div>
          ))}
          <div className="mr-3 text-sm text-gray-500">
            {step === 1 ? 'בחר אומן' : step === 2 ? 'בחר מופע' : 'העלה מדיה'}
          </div>
        </div>

        {/* Step 1: Select artist — accordion with search */}
        {step === 1 && (
          <div>
            {loading ? (
              <p className="text-sm text-gray-400">טוען...</p>
            ) : (
              <ArtistAccordion
                artists={artistsFromCampaigns}
                onSelect={(artist) => { setSelectedArtist(artist); setStep(2) }}
              />
            )}
          </div>
        )}

        {/* Step 2: Select show */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => { setStep(1); setSelectedArtist('') }} className="text-xs text-gray-400 hover:text-gray-600">← חזרה</button>
              <span className="text-sm font-bold text-pink-600">{selectedArtist}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">איזה מופע?</p>
            {artistCampaigns.length === 0 ? (
              <p className="text-sm text-gray-400">אין מופעים עתידיים</p>
            ) : (
              <div className="space-y-2">
                {artistCampaigns.map(camp => (
                  <button key={camp.id} onClick={() => { setSelectedCampaign(camp); setStep(3) }}
                    className="w-full text-right px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">{camp.launch_date ? formatDate(camp.launch_date) : 'ללא תאריך'}</span>
                    <span className="font-semibold text-gray-800 dark:text-white text-sm">{camp.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Upload */}
        {step === 3 && selectedCampaign && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => { setStep(2); setSelectedCampaign(null) }} className="text-xs text-gray-400 hover:text-gray-600">← חזרה</button>
              <span className="text-sm font-bold text-pink-600">{selectedArtist}</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{selectedCampaign.launch_date ? formatDate(selectedCampaign.launch_date) : selectedCampaign.name}</span>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
              className={'cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-8 text-center ' + (dragging ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-pink-300 hover:bg-pink-50/50')}
            >
              <svg className="w-10 h-10 mx-auto mb-3 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">גרור קבצים לכאן או לחץ לבחירה</p>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4, MOV ועוד — אפשר לבחור מספר קבצים בבת אחת</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
            {dropboxToken && <p className="mt-2 text-xs text-gray-400 flex items-center gap-1"><svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"/></svg>Dropbox מחובר</p>}
          </div>
        )}
      </div>

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">ספריית מדיה ({galleryItems.length})</h2>
          {galleryArtists.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setFilterArtist('')}
                className={'px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ' + (!filterArtist ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                הכל
              </button>
              {galleryArtists.map(a => (
                <button key={a} onClick={() => setFilterArtist(a)}
                  className={'px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ' + (filterArtist === a ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400')}>
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {galleryLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedGallery.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">אין מדיה עדיין</p>
          </div>
        ) : (
          (() => {
            const byArtist: Record<string, typeof displayedGallery> = {}
            displayedGallery.forEach(i => {
              if (!byArtist[i.artistName]) byArtist[i.artistName] = []
              byArtist[i.artistName].push(i)
            })
            return Object.entries(byArtist).map(([artist, items]) => (
              <div key={artist} className="mb-8">
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                  <span className="w-1 h-5 bg-pink-500 rounded-full inline-block" />
                  {artist}
                  <span className="text-xs text-gray-400 font-normal">({items.length})</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="group relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 aspect-square">
                      {item.isImage ? (
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-white bg-black/50 rounded-lg p-1.5 hover:bg-black/70 transition-colors" title="צפייה">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <button onClick={() => deleteItem(item.campaignId, item.name)}
                          className="text-white bg-red-500/80 rounded-lg p-1.5 hover:bg-red-600 transition-colors" title="מחק">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      {!item.isImage && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">VID</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()
        )}
      </div>

      {/* Floating upload progress bar — rendered via portal so it shows even when tab is hidden */}
      {mounted && uploadQueue.length > 0 && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-5 left-5 z-[9999] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800 dark:text-white">
              {activeUploads > 0 ? `מעלה... (${activeUploads}/${totalUploads})` : `העלאה הסתיימה ✓`}
            </p>
            {activeUploads === 0 && (
              <button onClick={() => setUploadQueue([])} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {uploadQueue.map(item => (
              <div key={item.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 ml-2 max-w-[180px]">{item.name}</span>
                  <span className={`text-xs font-bold flex-shrink-0 ${item.status === 'done' ? 'text-emerald-500' : item.status === 'error' ? 'text-red-500' : 'text-pink-600'}`}>
                    {item.status === 'done' ? '✓' : item.status === 'error' ? '✗' : item.progress + '%'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${item.status === 'done' ? 'bg-emerald-500' : item.status === 'error' ? 'bg-red-500' : 'bg-pink-500'}`}
                    style={{ width: item.progress + '%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
