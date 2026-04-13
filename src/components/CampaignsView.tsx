'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Campaign = {
  id: string; monday_item_id: string; name: string; status: string | null
  platforms: string | null; project_name: string | null; campaign_goal: string | null
  launch_date: string | null; end_date: string | null; campaign_type: string | null
  budget_amount: number | null; notes: string | null; requester: string | null
  group_title: string | null; updated_at: string
  date_received: string | null; schedule_type: string | null
  redirect_to: string | null; dark_copy: string | null
  has_button: string | null; button_type: string | null; button_link: string | null
  budget_type: string | null; budget_intensity: string | null
  needs_michael_call: string | null; territory: string | null; ad_number: string | null
}

type BoardKey = 'universal' | 'barbie' | 'general'
type PixelRow = { id: string; artist_name: string; pixel_id: string }

const BOARDS = [
  { key: 'universal' as BoardKey, label: 'קידומים יוניברסל', color: 'from-indigo-500 to-purple-600', icon: '🎵', desc: 'קמפיינים של אמני יוניברסל' },
  { key: 'barbie' as BoardKey, label: 'קידומים בארבי', color: 'from-pink-400 to-rose-500', icon: '🎠', desc: 'קמפיינים של פרויקט בארבי' },
  { key: 'general' as BoardKey, label: 'שיווק אומנים כללי', color: 'from-emerald-400 to-teal-600', icon: '🎤', desc: 'קמפיינים כלליים של אמנים' },
]

const GROUP_DOT: Record<string, string> = {
  'לא טופל': 'bg-blue-500',
  'עלה לאוויר': 'bg-emerald-500',
  'נגמר - ארכיון כל הקמפיינים': 'bg-sky-400',
  'נגמר - דיסני': 'bg-rose-400',
  'נגמר - אמני יוניברסל חתומים': 'bg-purple-400',
  'נגמר - בארבי': 'bg-pink-400',
}

const STATUS_CLS: Record<string, string> = {
  'חדש': 'bg-amber-100 text-amber-700 border border-amber-200',
  'עלה לאוויר': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'נגמר- ארכיון': 'bg-sky-100 text-sky-700 border border-sky-200',
}

const GROUP_ORDER = ['לא טופל', 'עלה לאוויר', 'נגמר - ארכיון כל הקמפיינים', 'נגמר - דיסני', 'נגמר - אמני יוניברסל חתומים', 'נגמר - בארבי']

const FIELDS: [string, keyof Campaign][] = [
  ['סטאטוס', 'status'], ['מזמין', 'requester'],
  ['פלטפורמה', 'platforms'], ['פרויקט', 'project_name'],
  ['מטרת הקמפיין', 'campaign_goal'], ['סוג קמפיין', 'campaign_type'],
  ['תאריך עלייה', 'launch_date'], ['תאריך סיום', 'end_date'],
  ['הפנייה ל', 'redirect_to'], ['ניהול תקציב', 'budget_type'],
  ['עצימות תקציב', 'budget_intensity'], ['תקציב', 'budget_amount'],
  ['הוספת כפתור', 'has_button'], ['סוג כפתור', 'button_type'],
  ['לינק כפתור', 'button_link'], ['דגשים', 'notes'],
  ['טקסט קופי', 'dark_copy'], ['טריטוריה', 'territory'],
  ['שיחה עם מיכאל', 'needs_michael_call'],
]

function filterCampaigns(campaigns: Campaign[], board: BoardKey): Campaign[] {
  if (board === 'universal') return campaigns.filter(c => c.project_name === 'יוניברסל' || (c.group_title || '').includes('יוניברסל'))
  if (board === 'barbie') return campaigns.filter(c => c.project_name === 'בארבי' || (c.group_title || '').includes('בארבי'))
  return campaigns.filter(c => !['יוניברסל', 'בארבי', 'דיסני'].includes(c.project_name || '') && !(c.group_title || '').includes('יוניברסל') && !(c.group_title || '').includes('בארבי'))
}
function PixelsPanel() {
  const [rows, setRows] = useState<PixelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [newArtist, setNewArtist] = useState('')
  const [newPixel, setNewPixel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('barbie_pixels').select('*').order('artist_name').then(({ data }) => {
      if (data) setRows(data)
      setLoading(false)
    })
  }, [])

  const add = async () => {
    if (!newArtist.trim() || !newPixel.trim()) return
    setSaving(true)
    const { data } = await supabase.from('barbie_pixels').insert({ artist_name: newArtist.trim(), pixel_id: newPixel.trim() }).select().single()
    if (data) setRows(prev => [...prev, data])
    setNewArtist(''); setNewPixel(''); setSaving(false)
  }

  const del = async (id: string) => {
    await supabase.from('barbie_pixels').delete().eq('id', id)
    setRows(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="bg-white rounded-xl border border-pink-200 overflow-hidden shadow-sm mb-6">
      <div className="px-4 py-3 bg-pink-50 border-b border-pink-200 flex items-center gap-2">
        <span className="text-sm font-semibold text-pink-700">פיקסלים</span>
        <span className="text-xs text-pink-400 bg-pink-100 px-2 py-0.5 rounded-full">{rows.length}</span>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-center py-4"><div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto"/></div>
        ) : (
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-right text-xs font-semibold text-slate-500 pb-2 pr-2">שם האומן</th>
                <th className="text-right text-xs font-semibold text-slate-500 pb-2">פיקסל</th>
                <th className="w-8"/>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="py-2 pr-2 text-slate-800">{r.artist_name}</td>
                  <td className="py-2 text-slate-600 font-mono text-xs">{r.pixel_id}</td>
                  <td className="py-2 text-center">
                    <button onClick={() => del(r.id)} className="text-slate-300 hover:text-red-400 transition-colors text-xs px-1">✕</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pt-3 pr-2">
                  <input value={newArtist} onChange={e => setNewArtist(e.target.value)} placeholder="שם האומן" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-pink-400" onKeyDown={e => e.key === 'Enter' && add()} />
                </td>
                <td className="pt-3 pl-1">
                  <input value={newPixel} onChange={e => setNewPixel(e.target.value)} placeholder="פיקסל" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-pink-400" onKeyDown={e => e.key === 'Enter' && add()} />
                </td>
                <td className="pt-3 pl-1">
                  <button onClick={add} disabled={saving} className="w-7 h-7 bg-pink-500 text-white rounded flex items-center justify-center text-lg hover:bg-pink-600 disabled:opacity-50">+</button>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBoard, setSelectedBoard] = useState<BoardKey | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [showPixels, setShowPixels] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('updated_at', { ascending: false })
    if (data) { setCampaigns(data); setLastSync(new Date()) }
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  const toggleGroup = (name: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  if (!selectedBoard) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-200 bg-white flex-shrink-0">
          <h1 className="text-xl font-bold text-slate-900">קידומים</h1>
          <p className="text-sm text-slate-400 mt-0.5">בחר קטגוריה</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="grid grid-cols-1 gap-5 w-full max-w-xl">
            {BOARDS.map(board => {
              const count = filterCampaigns(campaigns, board.key).length
              return (
                <button key={board.key} onClick={() => { setSelectedBoard(board.key); setCollapsedGroups(new Set()); setShowPixels(false) }}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-6 text-right hover:shadow-lg hover:border-slate-300 transition-all duration-200 overflow-hidden">
                  <div className={'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity bg-gradient-to-br ' + board.color} />
                  <div className="flex items-center gap-4">
                    <div className={'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl shadow-sm flex-shrink-0 ' + board.color}>
                      {board.icon}
                    </div>
                    <div className="flex-1 text-right">
                      <h3 className="text-base font-bold text-slate-900">{board.label}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{board.desc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-bold text-slate-900">{loading ? '—' : count}</div>
                      <div className="text-xs text-slate-400">קמפיינים</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const board = BOARDS.find(b => b.key === selectedBoard)!
  const filtered = filterCampaigns(campaigns, selectedBoard)
  const grouped = filtered.reduce((acc, c) => {
    const key = c.group_title || 'ללא קבוצה'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {} as Record<string, Campaign[]>)
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a), bi = GROUP_ORDER.indexOf(b)
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedBoard(null)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 className="text-lg font-bold text-slate-900">{board.label}</h1>
        </div>
        <div className="flex items-center gap-2">
          {selectedBoard === 'barbie' && (
            <button onClick={() => setShowPixels(!showPixels)}
              className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition border ' + (showPixels ? 'bg-pink-500 text-white border-pink-500' : 'border-pink-300 text-pink-600 hover:bg-pink-50')}>
              פיקסלים
            </button>
          )}
          <button onClick={load} title="רענן" className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition border border-slate-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="px-6 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2 flex-shrink-0">
        {BOARDS.map(b => (
          <button key={b.key} onClick={() => { setSelectedBoard(b.key); setCollapsedGroups(new Set()); setShowPixels(false); }}
            className={'px-3 py-1.5 rounded-full text-xs font-semibold transition-all ' + (selectedBoard === b.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-200')}>
            {b.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {showPixels ? <PixelsPanel /> : loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/></div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">אין קמפיינים בקטגוריה זו</div>
        ) : (
          <div className="space-y-3">
            {sortedGroups.map(groupName => {
              const isCollapsed = collapsedGroups.has(groupName)
              return (
                <div key={groupName} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <button onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-right border-b border-slate-100">
                    <svg className={'w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ' + (isCollapsed ? '' : 'rotate-90')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                    </svg>
                    <div className={'w-2.5 h-2.5 rounded-full flex-shrink-0 ' + (GROUP_DOT[groupName] || 'bg-slate-400')}/>
                    <span className="flex-1 text-sm font-semibold text-slate-800 text-right">{groupName}</span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{grouped[groupName].length}</span>
                  </button>
                  {!isCollapsed && (
                    <div>
                      {grouped[groupName].map((c, i) => (
                        <div key={c.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
                          <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                            className={'w-full flex items-center gap-3 px-5 py-3 transition-colors text-right ' + (expandedId === c.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50')}>
                            <svg className={'w-3 h-3 text-slate-300 flex-shrink-0 transition-transform duration-200 ' + (expandedId === c.id ? 'rotate-90' : '')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                            </svg>
                            <span className="flex-1 text-sm font-medium text-slate-900 text-right">{c.name}</span>
                            {c.status && (
                              <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_CLS[c.status] || 'bg-slate-100 text-slate-500 border border-slate-200')}>{c.status}</span>
                            )}
                          </button>
                          {expandedId === c.id && (
                            <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white px-8 py-5">
                              <div className="space-y-3 max-w-lg">
                                {FIELDS.map(([label, key]) => {
                                  const val = c[key]
                                  if (val === null || val === undefined || val === '') return null
                                  return (
                                    <div key={String(key)} className="flex gap-4 items-start">
                                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-36 flex-shrink-0 pt-0.5">{label}</span>
                                      {key === 'status' ? (
                                        <span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + (STATUS_CLS[String(val)] || 'bg-slate-100 text-slate-600 border border-slate-200')}>{String(val)}</span>
                                      ) : String(val).startsWith('http') ? (
                                        <a href={String(val)} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline leading-relaxed break-all">{String(val)}</a>
                                      ) : (
                                        <span className="text-sm text-slate-800 leading-relaxed">{String(val)}</span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
