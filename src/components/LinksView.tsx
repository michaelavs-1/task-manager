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

  // Group links by artist
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
    <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">קישורים</h1>
        <div className="flex items-center gap-3">
          {syncError && (
            <span className="text-sm text-red-500 font-medium">{syncError}</span>
          )}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isSyncing
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isSyncing && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {isSyncing ? 'סנכרון...' : 'סנכרון'}
          </button>
        </div>
      </div>

      {/* Content */}
      {links.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p className="text-gray-500 font-medium">אין קישורים</p>
          <p className="text-sm text-gray-400 mt-1">לחץ על סנכרון לטעינה ממאנדיי</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedArtists.map((artist) => (
            <div key={artist}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 px-1 mb-3">
                {artist}
              </h2>
              <div className="space-y-2">
                {groupedLinks[artist].map((link) => (
                  <LinkCard key={link.id} link={link} onEmbed={() => setEmbedLink(link)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Embed Modal */}
      {embedLink && (
        <EmbedModal link={embedLink} onClose={() => setEmbedLink(null)} />
      )}
    </div>
  )
}

function getLinkType(url: string | null): { label: string; color: string } {
  if (!url) return { label: 'קישור', color: 'bg-gray-100 text-gray-600' }
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('drive.google.com') || host === 'drive.google.com') return { label: 'Google Drive', color: 'bg-blue-50 text-blue-600' }
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
    // Default: show clean domain
    const parts = host.split('.')
    const domain = parts.length >= 2 ? parts[parts.length - 2] : host
    return { label: domain.charAt(0).toUpperCase() + domain.slice(1), color: 'bg-gray-100 text-gray-600' }
  } catch {
    return { label: 'קישור', color: 'bg-gray-100 text-gray-600' }
  }
}

function LinkCard({ link, onEmbed }: { link: Link; onEmbed: () => void }) {
  const linkType = getLinkType(link.url)
  return (
    <div
      className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
      onClick={onEmbed}
    >
      {/* Link Icon */}
      <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>

      {/* Link Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{link.name}</p>
        {link.link_text && link.link_text !== link.url && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{link.link_text}</p>
        )}
      </div>

      {/* Link type badge + Open Button */}
      {link.url && (
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${linkType.color}`}>
            {linkType.label}
          </span>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors flex-shrink-0"
          >
            פתח
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
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
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      title="העתק קישור"
      className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${
        copied ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          הועתק
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          העתק
        </>
      )}
    </button>
  )
}

// Convert URL to embeddable version
function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace('www.', '')

    // Google Docs/Sheets/Slides → /preview
    if (host === 'docs.google.com') {
      return url.replace(/\/(edit|view|pub)(\?.*)?$/, '/preview')
    }

    // Google Drive file → /preview
    if (host === 'drive.google.com' && url.includes('/file/d/')) {
      return url.replace(/\/(view|edit)(\?.*)?$/, '/preview')
    }

    // YouTube → embed URL
    if (host === 'youtube.com' || host === 'youtu.be') {
      let videoId = ''
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1)
      } else {
        videoId = u.searchParams.get('v') || ''
      }
      if (videoId) return `https://www.youtube.com/embed/${videoId}?autoplay=0`
    }

    // Spotify → embed URL
    if (host === 'spotify.com' || host === 'open.spotify.com') {
      return url.replace('open.spotify.com/', 'open.spotify.com/embed/')
    }

    // Everything else — try direct (may be blocked by X-Frame-Options)
    return url
  } catch {
    return url
  }
}

function EmbedModal({ link, onClose }: { link: Link; onClose: () => void }) {
  const [embedError, setEmbedError] = useState(false)
  const linkType = getLinkType(link.url)
  const embedUrl = link.url ? getEmbedUrl(link.url) : null

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        {/* RIGHT: title + type */}
        <div className="flex items-center gap-3">
          <span className="text-white font-semibold text-sm">{link.name}</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${linkType.color}`}>
            {linkType.label}
          </span>
        </div>
        {/* LEFT: actions */}
        <div className="flex items-center gap-2">
          {link.url && (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-300 bg-indigo-900 rounded-lg hover:bg-indigo-800 transition-colors"
            >
              פתח בחלון חדש
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            סגור
          </button>
        </div>
      </div>

      {/* Embed area */}
      <div className="flex-1 relative">
        {embedUrl && !embedError ? (
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            title={link.name}
            allow="autoplay; fullscreen"
            onError={() => setEmbedError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <p className="text-gray-300 font-semibold mb-1">האתר לא מאפשר הטמעה</p>
              <p className="text-gray-500 text-sm">חלק מהאתרים חוסמים תצוגה מוטמעת מסיבות אבטחה</p>
            </div>
            {link.url && (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                פתח בחלון חדש
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
