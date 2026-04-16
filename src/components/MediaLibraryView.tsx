'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Campaign = { id: string; name: string; requester: string | null; launch_date: string | null }
type MediaItem = { name: string; id: string; updated_at: string; metadata?: { mimetype?: string; size?: number } }

const BUCKET = 'campaigns-media'
const ML_PREFIX = 'media-library'

export function MediaLibraryView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [artistSearch, setArtistSearch] = useState('')
  const [selectedArtist, setSelectedArtist] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [galleryItems, setGalleryItems] = useState<{ campaignId: string; artistName: string; campaignName: string; url: string; name: string; isImage: boolean }[]>([])
  const [galleryLoading, setGalleryLoading] = useState(false)
  const [filterArtist, setFilterArtist] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const heDays = ['\u05E8\u05D0\u05E9\u05D5\u05DF', '\u05E9\u05E0\u05D9', '\u05E9\u05DC\u05D9\u05E9\u05D9', '\u05E8\u05D1\u05D9\u05E2\u05D9', '\u05D7\u05DE\u05D9\u05E9\u05D9', '\u05E9\u05D9\u05E9\u05D9', '\u05E9\u05D1\u05EA']
  const heMonths = ['\u05D9\u05E0\u05D5\u05D0\u05E8', '\u05E4\u05D1\u05E8\u05D5\u05D0\u05E8', '\u05DE\u05E8\u05E5', '\u05D0\u05E4\u05E8\u05D9\u05DC', '\u05DE\u05D0\u05D9', '\u05D9\u05D5\u05E0\u05D9', '\u05D9\u05D5\u05DC\u05D9', '\u05D0\u05D5\u05D2\u05D5\u05E1\u05D8', '\u05E1\u05E4\u05D8\u05DE\u05D1\u05E8', '\u05D0\u05D5\u05E7\u05D8\u05D5\u05D1\u05E8', '\u05E0\u05D5\u05D1\u05DE\u05D1\u05E8', '\u05D3\u05E6\u05DE\u05D1\u05E8']

  useEffect(() => {
    loadCampaigns()
    loadGallery()
  }, [])

  async function loadCampaigns() {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, requester, launch_date')
      .eq('board', 'barbie')
      .order('launch_date', { ascending: true })
    if (data) {
      const future = (data as Campaign[]).filter(c => {
        if (!c.launch_date) return false
        const d = new Date(c.launch_date)
        d.setHours(0, 0, 0, 0)
        return d >= today
      })
      setCampaigns(future)
    }
    setLoading(false)
  }

  async function loadGallery() {
    setGalleryLoading(true)
    try {
      const { data: folders } = await supabase.storage.from(BUCKET).list(ML_PREFIX)
      if (!folders) { setGalleryLoading(false); return }
      const items: typeof galleryItems = []
      for (const folder of folders) {
        const campaignId = folder.name
        const { data: files } = await supabase.storage.from(BUCKET).list(ML_PREFIX + '/' + campaignId)
        if (!files) continue
        const camp = campaigns.find(c => c.id === campaignId)
        const artistName = camp?.requester || camp?.name || campaignId
        const campaignName = camp?.name || campaignId
        for (const file of files) {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(ML_PREFIX + '/' + campaignId + '/' + file.name)
          const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
          items.push({ campaignId, artistName, campaignName, url: urlData.publicUrl, name: file.name, isImage })
        }
      }
      setGalleryItems(items)
    } catch (e) {
      console.error('gallery load error', e)
    }
    setGalleryLoading(false)
  }

  // Artists list = unique requester values from campaigns
  const artistsFromCampaigns = Array.from(new Set(campaigns.map(c => c.requester || c.name).filter(Boolean))).sort()
  const filteredArtists = artistsFromCampaigns.filter(a => !artistSearch || a.toLowerCase().includes(artistSearch.toLowerCase()))

  // Campaigns for selected artist
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
    setUploading(true); setUploadError('')
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const safeName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = ML_PREFIX + '/' + selectedCampaign.id + '/' + safeName
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
        if (error) throw error
      }
      await loadGallery()
      setStep(1); setSelectedArtist(''); setSelectedCampaign(null); setArtistSearch('')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '\u05E9\u05D2\u05D9\u05D0\u05EA \u05D4\u05E2\u05DC\u05D0\u05D4')
    } finally { setUploading(false) }
  }

  async function deleteItem(campaignId: string, fileName: string) {
    const path = ML_PREFIX + '/' + campaignId + '/' + fileName
    await supabase.storage.from(BUCKET).remove([path])
    setGalleryItems(prev => prev.filter(i => !(i.campaignId === campaignId && i.name === fileName)))
  }

  // Gallery filtered by artist
  const displayedGallery = filterArtist ? galleryItems.filter(i => i.artistName === filterArtist) : galleryItems
  const galleryArtists = Array.from(new Set(galleryItems.map(i => i.artistName)))

  return (
    <div className="max-w-5xl mx-auto px-6 py-8" dir="rtl">
      {/* Upload section */}
      <div className="mb-8 rounded-2xl border-2 border-dashed border-pink-200 dark:border-pink-900 bg-gradient-to-br from-pink-50 to-white dark:from-gray-800 dark:to-gray-850 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">\u05D4\u05E2\u05DC\u05D0\u05EA \u05DE\u05D3\u05D9\u05D4 \u05D7\u05D3\u05E9\u05D4</h2>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ' + (step === s ? 'bg-pink-600 text-white' : step > s ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400')}>
                {step > s ? '\u2713' : s}
              </div>
              {s < 3 && <div className={'h-0.5 w-8 ' + (step > s ? 'bg-emerald-400' : 'bg-gray-200 dark:bg-gray-700')} />}
            </div>
          ))}
          <div className="mr-3 text-sm text-gray-500">
            {step === 1 ? '\u05D1\u05D7\u05E8 \u05D0\u05D5\u05DE\u05DF' : step === 2 ? '\u05D1\u05D7\u05E8 \u05DE\u05D5\u05E4\u05E2' : '\u05D4\u05E2\u05DC\u05D4 \u05DE\u05D3\u05D9\u05D4'}
          </div>
        </div>

        {/* Step 1: Select artist */}
        {step === 1 && (
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">\u05D0\u05D9\u05D6\u05D4 \u05D0\u05D5\u05DE\u05DF?</p>
            {loading ? (
              <p className="text-sm text-gray-400">\u05D8\u05D5\u05E2\u05DF \u05E7\u05DE\u05E4\u05D9\u05D9\u05E0\u05D9\u05DD...</p>
            ) : (
              <>
                <input type="text" placeholder="\u05D7\u05D9\u05E4\u05D5\u05E9 \u05D0\u05D5\u05DE\u05DF..." value={artistSearch} onChange={e => setArtistSearch(e.target.value)}
                  className="w-full mb-3 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white" />
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {filteredArtists.length === 0 && <p className="text-sm text-gray-400">\u05D0\u05D9\u05DF \u05DE\u05D5\u05E4\u05E2\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD \u05E2\u05DD \u05EA\u05D0\u05E8\u05D9\u05DA \u05E2\u05EA\u05D9\u05D3\u05D9</p>}
                  {filteredArtists.map(artist => (
                    <button key={artist} onClick={() => { setSelectedArtist(artist); setStep(2) }}
                      className="px-3 py-1.5 rounded-xl text-sm font-semibold border border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                      {artist}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Select show */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <button onClick={() => { setStep(1); setSelectedArtist('') }} className="text-xs text-gray-400 hover:text-gray-600">\u2190 \u05D7\u05D6\u05E8\u05D4</button>
              <span className="text-sm font-bold text-pink-600">{selectedArtist}</span>
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">\u05D0\u05D9\u05D6\u05D4 \u05DE\u05D5\u05E4\u05E2?</p>
            {artistCampaigns.length === 0 ? (
              <p className="text-sm text-gray-400">\u05D0\u05D9\u05DF \u05DE\u05D5\u05E4\u05E2\u05D9\u05DD \u05E2\u05EA\u05D9\u05D3\u05D9\u05D9\u05DD \u05E2\u05D1\u05D5\u05E8 \u05D0\u05D5\u05DE\u05DF \u05D6\u05D4</p>
            ) : (
              <div className="space-y-2">
                {artistCampaigns.map(camp => (
                  <button key={camp.id} onClick={() => { setSelectedCampaign(camp); setStep(3) }}
                    className="w-full text-right px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-medium">{camp.launch_date ? formatDate(camp.launch_date) : '\u05DC\u05DC\u05D0 \u05EA\u05D0\u05E8\u05D9\u05DA'}</span>
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
              <button onClick={() => { setStep(2); setSelectedCampaign(null) }} className="text-xs text-gray-400 hover:text-gray-600">\u2190 \u05D7\u05D6\u05E8\u05D4</button>
              <span className="text-sm font-bold text-pink-600">{selectedArtist}</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm text-gray-600 dark:text-gray-300">{selectedCampaign.launch_date ? formatDate(selectedCampaign.launch_date) : selectedCampaign.name}</span>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => fileInputRef.current?.click()}
              className={'cursor-pointer rounded-2xl border-2 border-dashed transition-colors p-8 text-center ' + (dragging ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-gray-750')}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">\u05DE\u05E2\u05DC\u05D4...</p>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto mb-3 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">\u05D2\u05E8\u05D5\u05E8 \u05E7\u05D1\u05E6\u05D9\u05DD \u05DC\u05DB\u05D0\u05DF \u05D0\u05D5 \u05DC\u05D7\u05E5 \u05DC\u05D1\u05D7\u05D9\u05E8\u05D4</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, MP4, MOV \u05D5\u05E2\u05D5\u05D3</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
            {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
          </div>
        )}
      </div>

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">\u05E1\u05E4\u05E8\u05D9\u05D9\u05EA \u05DE\u05D3\u05D9\u05D4 ({galleryItems.length})</h2>
          {galleryArtists.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setFilterArtist('')}
                className={'px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ' + (!filterArtist ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                \u05D4\u05DB\u05DC
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
            <p className="text-sm">\u05D0\u05D9\u05DF \u05DE\u05D3\u05D9\u05D4 \u05E2\u05D3\u05D9\u05D9\u05DF</p>
          </div>
        ) : (
          // Group by artist
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
                          className="text-white bg-black/50 rounded-lg p-1.5 hover:bg-black/70 transition-colors" title="\u05E6\u05E4\u05D9\u05D9\u05D4">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <button onClick={() => deleteItem(item.campaignId, item.name)}
                          className="text-white bg-red-500/80 rounded-lg p-1.5 hover:bg-red-600 transition-colors" title="\u05DE\u05D7\u05E7">
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
    </div>
  )
}
