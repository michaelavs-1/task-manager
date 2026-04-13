'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Link = {
  id: string
  monday_item_id: string
  name: string
  url: string | null
  link_text: string | null
  artist_name: string | null
  updated_at: string
}

export function LinksView() {
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [embedLink, setEmbedLink] = useState<Link | null>(null)

  async function loadLinks() {
    const { data, error } = await supabase.from('links').select('*').order('name')
    if (!error && data) setLinks(data as Link[])
    setLoading(false)
  }

  useEffect(() => {
    loadLinks()
  }, [])

  async function handleSync() {
    setIsSyncing(true)
    setSyncError('')
    try {
      const res = await fetch('/api/sync-links', { method: 'POST' })
      const data = await res.json()
      if (!data.success) {
        setSyncError(data.error || 'Sync failed')
        return
      }
      await loadLinks()
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  const groupedLinks = links.reduce(
    (acc, link) => {
      const artist = link.artist_name || 'ללא אומן'
      if (!acc[artist]) acc[artist] = []
      acc[artist].push(link)
      return acc
    },
    {} as Record<string, Link[]>
  )

  const sortedArtists = Object.keys(groupedLinks).sort()

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-gray-900">קישורים</h1>
          {embedLink && (
            <>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-gray-500 truncate max-w-xs">{embedLink.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {embedLink ? (
            <>
              {embedLink.url && (
                <a href={embedLink.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  פתח בחלון חדש
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
              <button onClick={() => setEmbedLink(null)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                חזרה לרשימה
              </button>
            </>
          ) : (
            <>
              {syncError && <span className="text-sm text-red-500 font-medium">{syncError}</span>}
              <button onClick={handleSync} disabled={isSyncing} className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${isSyncing ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                {isSyncing && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {isSyncing ? 'סנכרון...' : 'סנכרון'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {embedLink ? (
          <EmbedPanel link={embedLink} />
        ) : (
          <div className="h-full overflow-y-auto px-8 py-6">
            {links.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                <p className="text-gray-500 font-medium">אין קישורים</p>
                <p className="text-sm text-gray-400 mt-1">לחץ על סנכרון לטעינה ממאנדיי</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedArtists.map((artist) => (
                  <div key={artist}>
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 px-1 mb-3">{artist}</h2>
                    <div className="space-y-2">
                      {groupedLinks[artist].map((link) => (
                        <LinkCard key={link.id} link={link} onEmbed={() => setEmbedLink(link)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getLinkType(url: string | null): { label: string; color: string } {
  if (!url) return { label: 'קישור', color: 'bg-gray-100 text-gray-600' }
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('drive.google.com')) return { label: 'Google Drive', color: 'bg-blue-50 text-blue-600' }
    if (host.includes('docs.google.com')) {
      if (url.includes('/spreadsheets')) return { label: 'Google Sheets', color: 'bg-green-50 text-green-600' }
      if (url.includes('/document')) return { label: 'Google Docs', color: 'bg-blue-50 text-blue-600' }
      if (url.includes('/presentation')) return { label: 'Google Slides', color: 'bg-yellow-50 text-yellow-600' }
      return { label: 'Google Docs', color: 'bg-blue-50 text-blue-600' }
    }
    if (host.includes('youtube.com') || host === 'youtu.be') return { label: 'YouTube', color: 'bg-red-50 text-red-600' }
    if (host.includes('spotify.com')) return { label: 'Spotify', color: 'bg-green-50 text-green-700' }
    if (host.includes('dropbox.com')) return { label: 'Dropbox', color: 'bg-blue-50 text-blue-700' }
    if (host.includes('notion.so')) return { label: 'Notion', color: 'bg-gray-100 text-gray-700' }
    if (host.includes('canva.com')) return { label: 'Canva', color: 'bg-purple-50 text-purple-600' }
    if (host.includes('monday.com')) return { label: 'Monday', color: 'bg-indigo-50 text-indigo-600' }
    if (host.includes('wa.me') || host.includes('whatsapp.com')) return { label: 'WhatsApp', color: 'bg-green-50 text-green-600' }
    if (host.includes('facebook.com') || host.includes('fb.com')) return { label: 'Facebook', color: 'bg-blue-50 text-blue-700' }
    if (host.includes('instagram.com')) return { label: 'Instagram', color: 'bg-pink-50 text-pink-600' }
    if (host.includes('tiktok.com')) return { label: 'TikTok', color: 'bg-gray-100 text-gray-800' }
    if (host.includes('wix.com') || host.includes('wixsite.com')) return { label: 'Wix', color: 'bg-orange-50 text-orange-600' }
    const parts = host.split('.')
    const domain = parts.length >= 2 ? parts[parts.length - 2] : host
    return { label: domain.charAt(0).toUpperCase() + domain.slice(1), color: 'bg-gray-100 text-gray-600' }
  } catch {
    return { label: 'קישור', color: 'bg-gray-100 text-gray-600' }
  }
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')
    if (host === 'docs.google.com') return url.replace(/\/(edit|view|pub)(\?.*)?$/, '/preview')
    if (host === 'drive.google.com' && url.includes('/file/d/')) return url.replace(/\/(view|edit)(\?.*)?$/, '/preview')
    if (host === 'youtube.com' || host === 'youtu.be') {
      const videoId = host === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || ''
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0`
    }
    if (host === 'spotify.com' || host === 'open.spotify.com') return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
    return url
  } catch { return url }
}

function LinkCard({ link, onEmbed }: { link: Link; onEmbed: () => void }) {
  const linkType = getLinkType(link.url)
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group" onClick={onEmbed}>
      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{link.name}</p>
        {link.link_text && link.link_text !== link.url && <p className="text-xs text-gray-400 mt-0.5 truncate">{link.link_text}</p>}
      </div>
      {link.url && (
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${linkType.color}`}>{linkType.label}</span>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0">
            פתח
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <CopyButton url={link.url} />
        </div>
      )}
    </div>
  )
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <button onClick={handleCopy} title="העתק קישור" className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${copied ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {copied ? (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>הועתק</>
      ) : (
        <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>העתק</>
      )}
    </button>
  )
}

function EmbedPanel({ link }: { link: Link }) {
  const [embedError, setEmbedError] = useState(false)
  const embedUrl = link.url ? getEmbedUrl(link.url) : null
  return (
    <div className="h-full flex flex-col">
      {embedUrl && !embedError ? (
        <iframe src={embedUrl} className="w-full flex-1 border-0" title={link.name} allow="autoplay; fullscreen" onError={() => setEmbedError(true)} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center bg-gray-100">
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
          <div>
            <p className="text-gray-700 font-semibold mb-1">האתר לא מאפשר הטמעה</p>
            <p className="text-gray-500 text-sm">חלק מהאתרים חוסמים תצוגה מוטמעת מסיבות אבטחה</p>
          </div>
          {link.url && (
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
              פתח בחלון חדש
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
