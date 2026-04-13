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
}

const GROUP_DOT: Record<string, string> = {
  'לא טופל': 'bg-blue-500',
  'עלה לאוויר': 'bg-emerald-500',
  'נגמר - ארכיון כל הקמפיינים': 'bg-sky-400',
  'נגמר - דיסני': 'bg-rose-500',
  'נגמר - אמני יוניברסל חתומים': 'bg-rose-500',
  'נגמר - בארבי': 'bg-rose-500',
}

const STATUS_CLS: Record<string, string> = {
  'חדש': 'bg-amber-100 text-amber-700 border border-amber-200',
  'עלה לאוויר': 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'נגמר- ארכיון': 'bg-sky-100 text-sky-700 border border-sky-200',
}

const GROUP_ORDER = ['לא טופל','עלה לאוויר','נגמר - ארכיון כל הקמפיינים','נגמר - דיסני','נגמר - אמני יוניברסל חתומים','נגמר - בארבי']

const FIELDS: [string, keyof Campaign][] = [
  ['סטטוס', 'status'],
  ['פלטפורמה', 'platforms'],
  ['פרויקט', 'project_name'],
  ['מטרת הקמפיין', 'campaign_goal'],
  ['סוג קמפיין', 'campaign_type'],
  ['תאריך עלייה', 'launch_date'],
  ['תאריך סיום', 'end_date'],
  ['תקציב (שח)', 'budget_amount'],
  ['דגשים', 'notes'],
  ['מזמין', 'requester'],
]

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('updated_at', {ascending: false})
    if (data) { setCampaigns(data); setLastSync(new Date()) }
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  const grouped = campaigns.reduce((acc, c) => {
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
      <div className="px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">קידומים יוניברסל</h1>
          <p className="text-sm text-slate-400 mt-0.5">משוקף מ-Monday.com &bull; {lastSync ? lastSync.toLocaleTimeString('he-IL') : 'טואן...'}</p>
        </div>
        <button onClick={load} title="רענן"
          className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition border border-slate-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="space-y-5">
            {sortedGroups.map(groupName => (
              <div key={groupName}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div className={'w-2.5 h-2.5 rounded-full flex-shrink-0 ' + (GROUP_DOT[groupName] || 'bg-slate-400')}/>
                  <span className="text-sm font-semibold text-slate-700">{groupName}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{grouped[groupName].length}</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {grouped[groupName].map((c, i) => (
                    <div key={c.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
                      <button
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className={'w-full flex items-center gap-3 px-4 py-3 transition-colors text-right ' + (expandedId === c.id ? 'bg-indigo-50/60' : 'hover:bg-slate-50')}>
                        <svg
                          className={'w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-200 ' + (expandedId === c.id ? 'rotate-90' : '')}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                        </svg>
                        <span className="flex-1 text-sm font-medium text-slate-900 text-right">{c.name}</span>
                        {c.status && (
                          <span className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_CLS[c.status] || 'bg-slate-100 text-slate-500 border border-slate-200')}>
                            {c.status}
                          </span>
                        )}
                      </button>
                      {expandedId === c.id && (
                        <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white px-6 py-5">
                          <div className="space-y-3 max-w-lg">
                            {FIELDS.map(([label, key]) => {
                              const val = c[key]
                              if (val === null || val === undefined || val === '') return null
                              return (
                                <div key={String(key)} className="flex gap-4 items-start">
                                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">{label}</span>
                                  {key === 'status' ? (
                                    <span className={'text-xs px-2.5 py-1 rounded-full font-medium ' + (STATUS_CLS[String(val)] || 'bg-slate-100 text-slate-600 border border-slate-200')}>
                                      {String(val)}
                                    </span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
