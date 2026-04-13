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

  if (loading) return <div className="p-8 text-center text-gray-500">טוען...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">קישורים</h1>
        <div className="flex items-center gap-3">
          {syncError && <span className="text-sm text-red-600">{syncError}</span>}
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              isSyncing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isSyncing ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                סנכרון...
              </span>
            ) : (
              'סנכרון'
            )}
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p>אין קישורים. לחץ על סנכרון לטעינה ממאנדיי.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between px-5 py-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{link.name}</p>
                  {link.link_text && link.link_text !== link.url && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{link.link_text}</p>
                  )}
                  {link.artist_name && (
                    <p className="text-xs text-indigo-500 mt-0.5">{link.artist_name}</p>
                  )}
                </div>
              </div>
              {link.url && (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex-shrink-0 mr-4"
                >
                  פתח
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
