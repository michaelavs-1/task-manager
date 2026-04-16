'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type TicketSnapshot = {
  id: string
  campaign_id: string
  snapshot_date: string
  tickets_sold: number
}

type CampaignRow = {
  id: string
  name: string
  launch_date: string | null
  tickets_for_sale: number | null
  tickets_sold: number | null
}

export function TicketTrackingView() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [snapshots, setSnapshots] = useState<TicketSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: camps }, { data: snaps }] = await Promise.all([
      supabase.from('campaigns')
        .select('id, requester, name, launch_date, tickets_for_sale, tickets_sold')
        .eq('board', 'barbie')
        .order('launch_date', { ascending: true }),
      supabase.from('ticket_snapshots').select('*').order('snapshot_date', { ascending: true }),
    ])
    if (camps) {
      setCampaigns(camps.map(c => ({
        id: c.id,
        name: c.requester || c.name,
        launch_date: c.launch_date,
        tickets_for_sale: c.tickets_for_sale,
        tickets_sold: c.tickets_sold,
      })))
      const initial: Record<string, string> = {}
      camps.forEach(c => { initial[c.id] = c.tickets_sold != null ? String(c.tickets_sold) : '' })
      setInputValues(initial)
    }
    if (snaps) setSnapshots(snaps)
    setLoading(false)
  }

  const handleSave = async (campaignId: string) => {
    const val = parseInt(inputValues[campaignId] ?? '')
    if (isNaN(val)) return
    setSavingId(campaignId)

    const today = new Date().toISOString().split('T')[0]

    await supabase.from('campaigns')
      .update({ tickets_sold: val, updated_at: new Date().toISOString() })
      .eq('id', campaignId)

    const existing = snapshots.find(s => s.campaign_id === campaignId && s.snapshot_date === today)
    if (existing) {
      await supabase.from('ticket_snapshots').update({ tickets_sold: val }).eq('id', existing.id)
    } else {
      await supabase.from('ticket_snapshots').insert({ campaign_id: campaignId, snapshot_date: today, tickets_sold: val })
    }

    await loadData()
    setSavingId(null)
    setSavedId(campaignId)
    setTimeout(() => setSavedId(null), 2000)
  }

  const allDates = [...new Set(snapshots.map(s => s.snapshot_date))].sort()

  const getSnap = (campaignId: string, date: string) =>
    snapshots.find(s => s.campaign_id === campaignId && s.snapshot_date === date)

  const getVelocity = (campaignId: string): string => {
    const campSnaps = snapshots
      .filter(s => s.campaign_id === campaignId)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    if (campSnaps.length < 2) return ''
    const last = campSnaps[campSnaps.length - 1]
    const prev = campSnaps[campSnaps.length - 2]
    const days = Math.round(
      (new Date(last.snapshot_date).getTime() - new Date(prev.snapshot_date).getTime()) / 86400000
    )
    if (days <= 0) return ''
    const delta = last.tickets_sold - prev.tickets_sold
    const rate = (delta / days).toFixed(1)
    return `${delta >= 0 ? '+' : ''}${delta} / ${days}י (${rate}/י)`
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const fmtShort = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
  }

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div dir="rtl" className="space-y-10">

      {/* ── עדכון כרטיסים ── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="min-w-full text-sm bg-white dark:bg-gray-800">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              {['תאריך מופע', 'שם המופע', 'כרטיסים למכירה', 'כרטיסים מכורים עדכני', 'נותרו', ''].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {campaigns.map((camp, i) => {
              const soldVal = parseInt(inputValues[camp.id] ?? '')
              const sold = isNaN(soldVal) ? (camp.tickets_sold ?? 0) : soldVal
              const remaining = camp.tickets_for_sale != null ? camp.tickets_for_sale - sold : null
              const pct = camp.tickets_for_sale ? Math.round(sold / camp.tickets_for_sale * 100) : null
              return (
                <tr key={camp.id} className={i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(camp.launch_date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{camp.name}</p>
                    {pct !== null && (
                      <div className="mt-1 h-1 w-28 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    {camp.tickets_for_sale ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min="0"
                      value={inputValues[camp.id] ?? ''}
                      onChange={e => setInputValues(prev => ({ ...prev, [camp.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleSave(camp.id) }}
                      placeholder="הזן מספר"
                      className="w-28 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white text-center"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {remaining !== null ? (
                      <span className={`text-sm font-semibold ${remaining <= 0 ? 'text-red-500' : remaining < 100 ? 'text-orange-500' : 'text-emerald-600'}`}>
                        {remaining}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSave(camp.id)}
                      disabled={savingId === camp.id}
                      className={`px-4 py-1.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap ${
                        savedId === camp.id
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-pink-600 text-white hover:bg-pink-700'
                      }`}
                    >
                      {savingId === camp.id ? '...' : savedId === camp.id ? 'נשמר ✓' : 'שמור'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── סטטיסטיקת מכירות ── */}
      {allDates.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            סטטיסטיקת מכירות
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="min-w-full text-sm bg-white dark:bg-gray-800">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700 min-w-[150px]">
                    מופע
                  </th>
                  {allDates.map(date => (
                    <th key={date} className="px-3 py-3 text-center text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap min-w-[72px]">
                      {fmtShort(date)}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-bold text-indigo-400 uppercase tracking-wider whitespace-nowrap min-w-[110px]">
                    קצב מכירה
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {campaigns.map((camp, i) => {
                  const velocity = getVelocity(camp.id)
                  const campSnaps = snapshots.filter(s => s.campaign_id === camp.id)
                  const latestSnap = campSnaps.sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)).pop()
                  const pctSold = camp.tickets_for_sale && latestSnap
                    ? Math.round(latestSnap.tickets_sold / camp.tickets_for_sale * 100)
                    : null
                  return (
                    <tr key={camp.id} className={i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}>
                      <td className="sticky right-0 z-10 bg-inherit px-4 py-2.5 border-l border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[140px] text-sm">{camp.name}</p>
                        {pctSold !== null && (
                          <div className="mt-1 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pctSold >= 90 ? 'bg-red-400' : pctSold >= 70 ? 'bg-orange-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(pctSold, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      {allDates.map(date => {
                        const snap = getSnap(camp.id, date)
                        const isLatest = date === allDates[allDates.length - 1]
                        return (
                          <td key={date} className="px-3 py-2.5 text-center">
                            {snap ? (
                              <span className={`text-sm ${isLatest ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                {snap.tickets_sold.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-200 dark:text-gray-600 text-xs select-none">·</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center">
                        {velocity
                          ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">{velocity}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-right">כל לחיצה על "שמור" מתועדת כנקודת זמן בטבלה</p>
        </div>
      )}

    </div>
  )
}
