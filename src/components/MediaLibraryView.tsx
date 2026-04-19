'use client'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Campaign = { id: string; name: string; requester: string | null; launch_date: string | null }
type UploadItem = {
  id: string
  name: string
  progress: number
  status: 'uploading' | 'done' | 'error'
  errorMsg?: string
}
type DropboxStatus = 'unknown' | 'checking' | 'valid' | 'invalid' | 'missing'
type GalleryItem = {
  path: string
  artistName: string
  campaignName: string
  url: string
  name: string
  isImage: boolean
}

const DROPBOX_SHARED_FOLDER_URL = 'https://www.dropbox.com/scl/fo/pv4cyapt6tgcnkmkaq1b1/AHpXDdACHUTTygAN_xOP1Xs?rlkey=c9r45ykdnq6pc0eay0gykkdnh&dl=0'

function uploadFileToDropboxXHR(
  file: File,
  dbxPath: string,
  token: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        const txt = xhr.responseText || ''
        let msg = 'העלאה נכשלה (' + xhr.status + ')'
        if (txt.includes('expired_access_token')) msg = 'טוקן Dropbox פג תוקף'
        else if (txt.includes('invalid_access_token')) msg = 'טוקן Dropbox לא תקין'
        else if (txt.includes('insufficient_space')) msg = 'אין מספיק מקום ב-Dropbox'
        else if (txt.includes('path/conflict')) msg = 'שם הקובץ קיים כבר'
        else if (txt.includes('not_permitted') || txt.includes('missing_scope')) msg = 'חסרה הרשאה ב-Dropbox (files.content.write)'
        else if (txt) msg += ': ' + txt.slice(0, 200)
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('שגיאת רשת'))
    xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload')
    xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    xhr.setRequestHeader('Dropbox-API-Arg', JSON.stringify({ path: dbxPath, mode: 'add', autorename: true, mute: false }))
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
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
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [filterArtist, setFilterArtist] = useState('')
  const [dropboxToken, setDropboxToken] = useState('')
  const [dropboxBasePath, setDropboxBasePath] = useState('')
  const [dropboxStatus, setDropboxStatus] = useState<DropboxStatus>('unknown')
  const [dropboxStatusMsg, setDropboxStatusMsg] = useState('')
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [tokenInputValue, setTokenInputValue] = useState('')
  const [dropboxCustomPath, setDropboxCustomPath] = useState('')
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [pickerPath, setPickerPath] = useState('')
  const [pickerEntries, setPickerEntries] = useState<{ name: string; path_lower: string; tag: string }[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState('')
  const [manualPathInput, setManualPathInput] = useState('')
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([])
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const heDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const heMonths = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

  useEffect(() => {
    setMounted(true)
    loadCampaigns()
    // Use env var token first, fallback to localStorage
    const envToken = process.env.NEXT_PUBLIC_DROPBOX_TOKEN
    if (envToken) {
      setDropboxToken(envToken)
    } else {
      try {
        const t = localStorage.getItem('dropbox_token_v1')
        if (t) setDropboxToken(t)
        else setDropboxStatus('missing')
      } catch { setDropboxStatus('missing') }
    }
    // Load user-chosen custom path (overrides the auto-resolved shared link path)
    try {
      const cp = localStorage.getItem('dropbox_custom_path_v1')
      if (cp) setDropboxCustomPath(cp)
    } catch {}
  }, [])

  // Validate the Dropbox token, then resolve shared-folder path when valid
  useEffect(() => {
    if (!dropboxToken) { setDropboxStatus('missing'); setDropboxBasePath(''); return }
    setDropboxStatus('checking')
    setDropboxStatusMsg('')
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + dropboxToken }
        })
        if (cancelled) return
        if (!r.ok) {
          const txt = await r.text().catch(() => '')
          setDropboxStatus('invalid')
          if (txt.includes('expired_access_token')) setDropboxStatusMsg('הטוקן פג תוקף. יש להזין טוקן חדש.')
          else if (txt.includes('invalid_access_token')) setDropboxStatusMsg('טוקן לא תקין. יש להזין טוקן חדש.')
          else setDropboxStatusMsg('הטוקן נדחה על ידי Dropbox (' + r.status + ').')
          setDropboxBasePath('')
          return
        }
        setDropboxStatus('valid')
        // Resolve shared folder path
        const pathRes = await fetch('https://api.dropboxapi.com/2/sharing/get_shared_link_metadata', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + dropboxToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ url: DROPBOX_SHARED_FOLDER_URL })
        })
        const data = await pathRes.json().catch(() => null)
        if (cancelled) return
        if (data && data.path_lower) setDropboxBasePath(data.path_lower)
        else if (data && data.name) setDropboxBasePath('/' + data.name)
        else setDropboxBasePath('')
      } catch (e) {
        if (cancelled) return
        setDropboxStatus('invalid')
        setDropboxStatusMsg('שגיאת רשת בבדיקת Dropbox')
      }
    })()
    return () => { cancelled = true }
  }, [dropboxToken])

  // Reload the gallery whenever Dropbox becomes valid / path changes
  useEffect(() => {
    if (dropboxStatus === 'valid' && dropboxToken && (dropboxCustomPath || dropboxBasePath)) {
      loadGallery()
    } else if (dropboxStatus === 'missing' || dropboxStatus === 'invalid') {
      setGalleryItems([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropboxStatus, dropboxToken, dropboxBasePath, dropboxCustomPath])

  function saveDropboxToken() {
    const trimmed = tokenInputValue.trim()
    if (!trimmed) return
    try { localStorage.setItem('dropbox_token_v1', trimmed) } catch {}
    setDropboxToken(trimmed)
    setTokenInputValue('')
    setShowTokenInput(false)
  }

  function clearDropboxToken() {
    try { localStorage.removeItem('dropbox_token_v1') } catch {}
    setDropboxToken('')
    setDropboxBasePath('')
    setDropboxStatus('missing')
    setDropboxStatusMsg('')
  }

  // Effective Dropbox target path: user override wins; otherwise use auto-resolved shared link path
  const effectiveDbxPath = dropboxCustomPath || dropboxBasePath

  async function listDropboxFolder(path: string) {
    if (!dropboxToken) return
    setPickerLoading(true)
    setPickerError('')
    try {
      const r = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + dropboxToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, recursive: false, include_deleted: false })
      })
      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        if (txt.includes('expired_access_token')) setPickerError('הטוקן פג תוקף')
        else if (txt.includes('not_folder')) setPickerError('הנתיב אינו תיקייה')
        else if (txt.includes('not_found')) setPickerError('התיקייה לא נמצאה — נסה נתיב אחר או הקלד ידנית')
        else if (txt.includes('not_permitted') || txt.includes('missing_scope')) setPickerError('לאפליקציה ב-Dropbox חסר ה-scope "files.metadata.read". יש להוסיף אותו ב-App Console → Permissions, ולאחר מכן ליצור טוקן חדש. כגיבוי ניתן להקליד נתיב ידני למטה.')
        else setPickerError('שגיאה ' + r.status + ': ' + txt)
        setPickerEntries([])
        setPickerLoading(false)
        return
      }
      const data = await r.json()
      const folders = (data.entries || [])
        .filter((e: any) => e['.tag'] === 'folder')
        .map((e: any) => ({ name: e.name, path_lower: e.path_lower, tag: e['.tag'] }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'he'))
      setPickerEntries(folders)
      setPickerPath(path)
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : 'שגיאת רשת')
      setPickerEntries([])
    }
    setPickerLoading(false)
  }

  function openFolderPicker() {
    if (!dropboxToken || dropboxStatus !== 'valid') return
    setShowFolderPicker(true)
    // Start at root
    listDropboxFolder('')
  }

  function selectFolderAsTarget(path: string) {
    try { localStorage.setItem('dropbox_custom_path_v1', path) } catch {}
    setDropboxCustomPath(path)
    setShowFolderPicker(false)
  }

  function resetToSharedFolderPath() {
    try { localStorage.removeItem('dropbox_custom_path_v1') } catch {}
    setDropboxCustomPath('')
  }

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

  // List all media files recursively under the Dropbox base path, and resolve temporary links.
  async function loadGallery() {
    if (!dropboxToken || dropboxStatus !== 'valid') return
    const basePath = dropboxCustomPath || dropboxBasePath
    if (!basePath) { setGalleryItems([]); return }
    setGalleryLoading(true)
    try {
      const allFiles: { path_lower: string; path_display: string; name: string }[] = []
      let resp = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + dropboxToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: basePath, recursive: true, include_deleted: false, limit: 2000 })
      })
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        console.error('Dropbox list_folder failed', resp.status, txt)
        setGalleryItems([])
        setGalleryLoading(false)
        return
      }
      let data: any = await resp.json()
      while (true) {
        for (const e of (data.entries || [])) {
          if (e['.tag'] === 'file') {
            allFiles.push({ path_lower: e.path_lower, path_display: e.path_display, name: e.name })
          }
        }
        if (!data.has_more) break
        const r2 = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + dropboxToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ cursor: data.cursor })
        })
        if (!r2.ok) break
        data = await r2.json()
      }

      // Resolve a temporary link for each media file (batched to avoid hammering the API).
      const items: GalleryItem[] = []
      const batchSize = 6
      const mediaFiles = allFiles.filter(f => /\.(jpg|jpeg|png|gif|webp|svg|mp4|mov|m4v|webm|avi|mkv)$/i.test(f.name))
      for (let i = 0; i < mediaFiles.length; i += batchSize) {
        const batch = mediaFiles.slice(i, i + batchSize)
        const results = await Promise.all(batch.map(async (f) => {
          try {
            const lr = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
              method: 'POST',
              headers: {
                Authorization: 'Bearer ' + dropboxToken,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ path: f.path_lower })
            })
            if (!lr.ok) return null
            const ld = await lr.json()
            // path_display ≈ basePath/artistSlug/showSlug/filename
            // Strip basePath prefix to extract artist/show
            const baseLen = basePath.length
            const rel = f.path_display.toLowerCase().startsWith(basePath.toLowerCase())
              ? f.path_display.substring(baseLen).replace(/^\//, '')
              : f.path_display.replace(/^\//, '')
            const parts = rel.split('/')
            const artistName = parts.length >= 2 ? parts[0] : 'ללא אומן'
            const campaignName = parts.length >= 3 ? parts[1] : (parts.length >= 2 ? parts[0] : '')
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name)
            return {
              path: f.path_lower,
              artistName,
              campaignName,
              url: ld.link,
              name: f.name,
              isImage
            } as GalleryItem
          } catch { return null }
        }))
        for (const res of results) {
          if (res) items.push(res)
        }
      }
      // Sort: artist name, then file name
      items.sort((a, b) => a.artistName.localeCompare(b.artistName, 'he') || a.name.localeCompare(b.name))
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

  async function handleFiles(files: FileList | null) {
    if (!files || !selectedCampaign) return
    if (!dropboxToken || dropboxStatus !== 'valid') {
      setUploadError('Dropbox לא מחובר — לא ניתן להעלות. יש לחבר טוקן תקין.')
      return
    }
    const basePath = dropboxCustomPath || dropboxBasePath
    if (!basePath) {
      setUploadError('לא נקבעה תיקיית יעד ב-Dropbox. בחר/י תיקייה מעל.')
      return
    }
    setUploadError('')
    const camp = selectedCampaign
    const artistSlug = ((camp as any).requester || camp.name || 'artist').replace(/[/\\:*?"<>|]/g, '_').trim()
    const showSlug = (camp.launch_date || camp.name || 'show').replace(/[/\\:*?"<>|]/g, '_').trim()

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

    const errorMsgs: string[] = []

    // Upload all files in parallel directly to Dropbox
    await Promise.all(Array.from(files).map(async (file, idx) => {
      const itemId = newItems[idx].id
      const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const dbxPath = basePath + '/' + artistSlug + '/' + showSlug + '/' + safeName

      try {
        await uploadFileToDropboxXHR(file, dbxPath, dropboxToken, (pct) => {
          setUploadQueue(prev => prev.map(u => u.id === itemId ? { ...u, progress: pct } : u))
        })
        setUploadQueue(prev => prev.map(u => u.id === itemId ? { ...u, progress: 100, status: 'done' } : u))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'שגיאה לא ידועה'
        errorMsgs.push(`${file.name}: ${msg}`)
        setUploadQueue(prev => prev.map(u => u.id === itemId ? { ...u, status: 'error', errorMsg: msg } : u))
        // If token is expired/invalid, surface the banner
        if (msg.includes('פג תוקף') || msg.includes('לא תקין')) {
          setDropboxStatus('invalid')
          setDropboxStatusMsg(msg.includes('פג תוקף') ? 'הטוקן פג תוקף. יש להזין טוקן חדש.' : 'טוקן לא תקין. יש להזין טוקן חדש.')
        }
      }
    }))

    if (errorMsgs.length) setUploadError(errorMsgs.join(' | '))

    // Refresh gallery after all done
    loadGallery()

    // Auto-clear only successful items after 4 seconds; keep errors until user dismisses
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(u => u.status === 'error' || u.status === 'uploading'))
    }, 4000)
  }

  async function deleteItem(path: string) {
    if (!dropboxToken) return
    try {
      const r = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + dropboxToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path })
      })
      if (r.ok) {
        setGalleryItems(prev => prev.filter(i => i.path !== path))
      } else {
        const txt = await r.text().catch(() => '')
        console.error('Dropbox delete failed', r.status, txt)
      }
    } catch (e) { console.error('delete error', e) }
  }

  const displayedGallery = filterArtist ? galleryItems.filter(i => i.artistName === filterArtist) : galleryItems
  const galleryArtists = Array.from(new Set(galleryItems.map(i => i.artistName)))

  const activeUploads = uploadQueue.filter(u => u.status === 'uploading').length
  const totalUploads = uploadQueue.length

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" dir="rtl">
      {/* Dropbox status banner */}
      <div className={'mb-4 rounded-xl px-4 py-3 border flex items-start gap-3 ' +
        (dropboxStatus === 'valid' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
         dropboxStatus === 'checking' ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' :
         'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700')}>
        <div className="flex-shrink-0 mt-0.5">
          {dropboxStatus === 'valid' ? (
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"/></svg>
          ) : dropboxStatus === 'checking' ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {dropboxStatus === 'valid' && 'Dropbox מחובר — כל המדיה נשמרת בתיקייה שלך'}
            {dropboxStatus === 'checking' && 'בודק חיבור Dropbox...'}
            {dropboxStatus === 'invalid' && 'Dropbox לא פעיל — ' + (dropboxStatusMsg || 'הטוקן אינו תקין')}
            {dropboxStatus === 'missing' && 'Dropbox לא מחובר — לא ניתן להעלות או לצפות במדיה'}
            {dropboxStatus === 'unknown' && 'בודק חיבור Dropbox...'}
          </p>
          {dropboxStatus === 'valid' && (
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>תיקיית יעד:</span>
              <span className="font-mono bg-white/60 dark:bg-gray-800/60 px-1.5 py-0.5 rounded">{effectiveDbxPath || '(root)'}</span>
              {dropboxCustomPath && (
                <>
                  <span className="text-amber-600 dark:text-amber-300">(מותאם אישית)</span>
                  <button
                    onClick={resetToSharedFolderPath}
                    className="underline hover:text-emerald-800"
                  >חזרה לברירת מחדל</button>
                </>
              )}
              <button
                onClick={openFolderPicker}
                className="underline font-semibold hover:text-emerald-800"
              >בחר תיקייה אחרת</button>
              <button
                onClick={() => loadGallery()}
                className="underline hover:text-emerald-800"
              >רענן גלריה</button>
            </div>
          )}
          {(dropboxStatus === 'invalid' || dropboxStatus === 'missing') && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              יש ליצור טוקן חדש מ-
              <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Dropbox App Console</a>
              {' '}(הרשאות נדרשות: <span className="font-mono">files.content.write</span>, <span className="font-mono">files.content.read</span>, <span className="font-mono">files.metadata.read</span>, <span className="font-mono">sharing.read</span>)
            </p>
          )}
          {dropboxStatus === 'valid' && !dropboxBasePath && !dropboxCustomPath && (
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              ⚠ הקישור המשותף לא נפתר — ייתכן שחסר ה-scope <span className="font-mono">sharing.read</span>. מומלץ לבחור תיקייה ידנית.
            </p>
          )}

          {showTokenInput && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="password"
                value={tokenInputValue}
                onChange={e => setTokenInputValue(e.target.value)}
                placeholder="הדבק כאן טוקן Dropbox חדש"
                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-800 dark:text-white"
                onKeyDown={e => { if (e.key === 'Enter') saveDropboxToken() }}
              />
              <button
                onClick={saveDropboxToken}
                className="px-3 py-1.5 text-xs font-semibold bg-pink-600 text-white rounded-lg hover:bg-pink-700"
              >שמור</button>
              <button
                onClick={() => { setShowTokenInput(false); setTokenInputValue('') }}
                className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              >ביטול</button>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 flex items-center gap-1">
          {!showTokenInput && (
            <button
              onClick={() => setShowTokenInput(true)}
              className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
            >
              {dropboxStatus === 'valid' ? 'החלף טוקן' : 'הזן טוקן'}
            </button>
          )}
          {dropboxToken && !showTokenInput && (
            <button
              onClick={clearDropboxToken}
              className="text-xs px-2 py-1 rounded-lg text-gray-400 hover:text-red-500"
              title="נקה טוקן"
            >×</button>
          )}
        </div>
      </div>

      {/* Persistent upload error (visible after wizard resets) */}
      {uploadError && (
        <div className="mb-4 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-1">שגיאת העלאה</p>
            <p className="text-xs text-red-700 dark:text-red-300 break-words" dir="auto">{uploadError}</p>
          </div>
          <button onClick={() => setUploadError('')} className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0">×</button>
        </div>
      )}

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
              <p className="text-xs text-gray-400 mt-1">הקבצים נשמרים ישירות לתיקייה שלך ב-Dropbox</p>
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
            {dropboxStatus === 'valid' && <p className="mt-2 text-xs text-gray-400 flex items-center gap-1"><svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"/></svg>Dropbox מחובר</p>}
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
            {dropboxStatus === 'valid' && (
              <p className="text-xs mt-1">הגלריה מציגה קבצים מתיקיית ה-Dropbox שלך</p>
            )}
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
                        <button onClick={() => deleteItem(item.path)}
                          className="text-white bg-red-500/80 rounded-lg p-1.5 hover:bg-red-600 transition-colors" title="מחק מ-Dropbox">
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
      {mounted && uploadQueue.length > 0 && typeof document !== 'undefined' && (() => {
        const errCount = uploadQueue.filter(u => u.status === 'error').length
        const doneCount = uploadQueue.filter(u => u.status === 'done').length
        return createPortal(
        <div className="fixed bottom-5 left-5 z-[9999] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-80">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-800 dark:text-white">
              {activeUploads > 0
                ? `מעלה ל-Dropbox... (${activeUploads}/${totalUploads})`
                : errCount > 0
                  ? `נכשלו ${errCount} מתוך ${totalUploads} ✗`
                  : `העלאה הסתיימה (${doneCount}/${totalUploads}) ✓`}
            </p>
            {activeUploads === 0 && (
              <button onClick={() => setUploadQueue([])} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {uploadQueue.map(item => (
              <div key={item.id} className={item.status === 'error' ? 'p-2 -mx-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40' : ''}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1 ml-2 max-w-[200px]" title={item.name}>{item.name}</span>
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
                {item.status === 'error' && item.errorMsg && (
                  <div className="mt-1.5 text-[10px] text-red-600 dark:text-red-400 break-words" dir="auto">{item.errorMsg}</div>
                )}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )})()}

      {/* Dropbox folder picker modal */}
      {mounted && showFolderPicker && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4" onClick={() => setShowFolderPicker(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">בחר תיקיית יעד ב-Dropbox</h3>
              <button onClick={() => setShowFolderPicker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Breadcrumb */}
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-1 text-xs flex-wrap">
              <button
                onClick={() => listDropboxFolder('')}
                className={'px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ' + (!pickerPath ? 'font-bold text-pink-600' : 'text-gray-500')}
              >Dropbox</button>
              {pickerPath && pickerPath.split('/').filter(Boolean).map((seg, i, arr) => {
                const subPath = '/' + arr.slice(0, i + 1).join('/')
                return (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-gray-300">/</span>
                    <button
                      onClick={() => listDropboxFolder(subPath)}
                      className={'px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ' + (i === arr.length - 1 ? 'font-bold text-pink-600' : 'text-gray-500')}
                    >{seg}</button>
                  </div>
                )
              })}
            </div>

            {/* Folder list */}
            <div className="flex-1 overflow-y-auto">
              {pickerLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pickerError ? (
                <div className="p-4 text-sm text-red-500">{pickerError}</div>
              ) : pickerEntries.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">אין תיקיות משנה</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {pickerEntries.map(entry => (
                    <div key={entry.path_lower} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-750">
                      <button
                        onClick={() => listDropboxFolder(entry.path_lower)}
                        className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100 hover:text-pink-600 flex-1 text-right"
                      >
                        <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                        <span className="truncate">{entry.name}</span>
                      </button>
                      <button
                        onClick={() => selectFolderAsTarget(entry.path_lower)}
                        className="text-xs px-2 py-1 rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200 font-semibold flex-shrink-0"
                      >בחר</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer: "pick this folder" + path display */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500 truncate flex-1">
                <span className="font-mono">{pickerPath || '/'}</span>
              </div>
              <button
                onClick={() => selectFolderAsTarget(pickerPath)}
                className="text-xs px-3 py-1.5 rounded-lg bg-pink-600 text-white hover:bg-pink-700 font-semibold flex-shrink-0"
              >בחר תיקייה זו</button>
            </div>

            {/* Manual path fallback — useful when list_folder scope is missing */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1.5">או הקלד נתיב ידנית (למשל <span className="font-mono">/My Apps/media</span>)</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualPathInput}
                  onChange={e => setManualPathInput(e.target.value)}
                  placeholder="/path/to/folder"
                  dir="ltr"
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-900 dark:text-white"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const p = manualPathInput.trim()
                      if (p.startsWith('/')) selectFolderAsTarget(p)
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const p = manualPathInput.trim()
                    if (p.startsWith('/')) selectFolderAsTarget(p)
                    else setPickerError('נתיב חייב להתחיל ב-/')
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-800 font-semibold flex-shrink-0"
                >השתמש בנתיב</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
