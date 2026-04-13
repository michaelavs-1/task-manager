'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Campaign = {
  id: string
  monday_item_id: string
  name: string
  status: string
  platforms: string | null
  project_name: string | null
  launch_date: string | null
  end_date: string | null
  campaign_type: string | null
  budget_amount: number | null
  notes: string | null
  requester: string | null
  updated_at: string
}

const STATUS: Record<string, {cls:string,dot:string}> = {
  'חדש': {cls:'bg-amber-100 text-amber-700 border border-amber-200',dot:'bg-amber-500'},
  'עלה לאוויר': {cls:'bg-emerald-100 text-emerald-700 border border-emerald-200',dot:'bg-emerald-500'},
  'נגמר- ארכיון': {cls:'bg-sky-100 text-sky-700 border border-sky-200',dot:'bg-sky-500'},
}
export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const load = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('updated_at', {ascending:false})
    if (data) { setCampaigns(data); setLastSync(new Date()) }
    setLoading(false)
  }

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t) }, [])

  const FILTERS: [string,string][] = [
    ['all','הכל'],['חדש','חדש'],['עלה לאוויר','פעיל'],['נגמר- ארכיון','ארכיון']
  ]
  const rows = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">קידומים יוניברסל</h1>
          <p className="text-sm text-slate-400 mt-0.5">משוקף מ-Monday.com &bull; {lastSync ? lastSync.toLocaleTimeString('he-IL') : 'טואן...'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
            {FILTERS.map(([val,label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={(filter===val?'bg-white shadow text-slate-900 ':'text-slate-500 hover:text-slate-700 ')+'px-3 py-1.5 rounded-md text-sm font-medium transition-all'}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={load} title="רענן"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition border border-slate-200">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center text-slate-400 mt-20 text-sm">אין קמפיינים להצגה</div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['שם הקמפיין','סטטוס','פלטפורמה','פרויקט','עלייה','סיום','מזמין'].map(h => (
                    <th key={h} className="text-right px-4 py-3 font-semibold text-slate-500 text-xs tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c,i) => {
                  const st = STATUS[c.status] || {cls:'bg-slate-100 text-slate-600 border border-slate-200',dot:'bg-slate-400'}
                  return (
                    <tr key={c.id} className={(i%2===0?'bg-white ':'bg-slate-50/40 ')+'border-b border-slate-100 hover:bg-indigo-50/20 transition-colors'}>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate">{c.name}</td>
                      <td className="px-4 py-3">
                        <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium '+st.cls}>
                          <span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 '+st.dot}/>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.platforms||'-'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{c.project_name||'-'}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.launch_date||'-'}</td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{c.end_date||'-'}</td>
                      <td className="px-4 py-3 text-slate-600">{c.requester||'-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
