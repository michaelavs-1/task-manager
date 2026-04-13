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

  useEffect(() => { loadLinks() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setEmbedLink(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  async function handleSync() {
    setIsSyncing(true)
    setSyncError('')
    try {
      const res = await fetch('/api/sync-links', { method: 'POST' })
      const data = await res.json()
      if (!data.success) { setSyncError(data.error || 'Sync failed'); return }
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

  const groupedLinks = links.reduce((acc, link) => {
    const artist = link.artist_name || 'ללא אומן'
    if (!acc[artist]) acc[artist] = []
    acc[artist].push(link)
    return acc
  }, {} as Record<string, Link[]>)

  const sortedArtists = Object.keys(groupedLinks).sort()

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">קישורים</h1>
        <div className="flex items-center gap-3">
          {syncError && <span className="text-sm text-red-500 font-medium">{syncError}</span>}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isSyncing ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isSyncing && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isSyncing ? 'סנכרון...' : 'סנכרון'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className={`flex-shrink-0 overflow-y-auto transition-all duration-300 ${embedLink ? 'w-80' : 'w-full'}`}>
          {links.length === 0 ? (
            <div className="text-center py-16 px-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-gray-500 font-medium">אין קישורים</p>
              <p className="text-sm text-gray-400 mt-1">לחץ על סנכרון לטעינה ממאנדיי</p>
            </div>
          ) : (
            <div className="px-4 py-5 space-y-5">
              {sortedArtists.map((artist) => (
                <div key={artist}>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 px-2 mb-2">{artist}</h2>
                  <div className="space-y-1.5">
                    {groupedLinks[artist].map((link) => (
                      <LinkRow
                        key={link.id}
                        link={link}
                        isActive={embedLink?.id === link.id}
                        compact={!!embedLink}
                        onEmbed={() => setEmbedLink(embedLink?.id === link.id ? null : link)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {embedLink && (
          <div className="flex-1 flex flex-col border-r border-gray-200 bg-white min-w-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-gray-900 truncate">{embedLink.name}</span>
                {embedLink.url && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-lg flex-shrink-0 ${getLinkType(embedLink.url).color}`}>
                    {getLinkType(embedLink.url).label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {embedLink.url && (
                  <a href={embedLink.url} target="_blank" rel="noopener noreferrer" title="פתח בחלון חדש" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <button onClick={() => setEmbedLink(null)} title="סגור (Esc)" className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <EmbedPanel link={embedLink} />
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

function LinkRow({
  link,
  isActive,
  compact,
  onEmbed,
}: {
  link: Link
  isActive: boolean
  compact: boolean
  onEmbed: () => void
}) {
  const linkType = getLinkType(link.url)
  return (
    <div
      onClick={onEmbed}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl border transition-all cursor-pointer group ${
        isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-sm'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
        isActive ? 'bg-indigo-600' : 'bg-indigo-50 group-hover:bg-indigo-100'
      }`}>
        <svg className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{link.name}</p>
        {!compact && link.link_text && link.link_text !== link.url && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{link.link_text}</p>
        )}
      </div>
      {!compact && link.url && (
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${linkType.color}`}>{linkType.label}</span>
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="פתח">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <CopyButton url={link.url} />
        </div>
      )}
      {compact && link.url && (
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md flex-shrink-0 ${linkType.color}`}>{linkType.label}</span>
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
    <button onClick={handleCopy} title="העתק קישור" className={`p-1.5 rounded-lg transition-colors ${copied ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  )
}

function EmbedPanel({ link }: { link: Link }) {
  const [embedError, setEmbedError] = useState(false)
  const embedUrl = link.url ? getEmbedUrl(link.url) : null
  useEffect(() => { setEmbedError(false) }, [link.id])

  if (!embedUrl || embedError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center bg-gray-50 p-8">
        <svg className="w-14 h-14 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        <div>
          <p className="text-gray-600 font-semibold mb-1">האתר לא מאפשר הטמעה</p>
          <p className="text-gray-400 text-sm">חלק מהאתרים חוסמים תצוגה מוטמעת</p>
        </div>
        {link.url && (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">
            פתח בחלון חדש
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        )}
      </div>
    )
  }

  return <iframe key={link.id} src={embedUrl} className="w-full flex-1 border-0" title={link.name} allow="autoplay; fullscreen" onError={() => setEmbedError(true)} />
}
