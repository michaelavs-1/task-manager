'use client'
import { useEffect, useRef, useState } from 'react'
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
  const [updateInputs, setUpdateInputs] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0])
  const [activeSubTab, setActiveSubTab] = useState<'update' | 'stats'>('update')
  const [statsSelectedId, setStatsSelectedId] = useState<string | null>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [campsRes, snapsRes] = await Promise.all([
        supabase.from('campaigns')
          .select('id, requester, name, launch_date, tickets_for_sale, tickets_sold')
          .eq('board', 'barbie')
          .order('launch_date', { ascending: true }),
        supabase.from('ticket_snapshots').select('*').order('snapshot_date', { ascending: true }),
      ])
      if (campsRes.data) {
        setCampaigns(campsRes.data.map((c: any) => ({
          id: c.id,
          name: c.requester || c.name,
          launch_date: c.launch_date,
          tickets_for_sale: c.tickets_for_sale,
          tickets_sold: c.tickets_sold,
        })))
      }
      if (snapsRes.data) setSnapshots(snapsRes.data)
    } catch (err) {
      console.error('loadData error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (campaignId: string) => {
    const val = parseInt(updateInputs[campaignId] ?? '')
    if (isNaN(val)) return
    setSavingId(campaignId)
    const today = snapshotDate
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
    setUpdateInputs(prev => ({ ...prev, [campaignId]: '' }))
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
    return (delta >= 0 ? '+' : '') + delta + ' / ' + days + 'י (' + rate + '/י)'
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const fmtShort = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })

  const pctBarColor = (pct: number) =>
    pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-orange-400' : 'bg-emerald-400'

  const remainingColor = (r: number) =>
    r <= 0 ? 'text-red-500' : r < 100 ? 'text-orange-500' : 'text-emerald-600'

  // Filter: only show shows that haven't passed yet
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const upcomingCampaigns = campaigns.filter(camp => {
    if (!camp.launch_date) return true
    const showDate = new Date(camp.launch_date + 'T00:00:00')
    return showDate >= today
  })

  // ── Stats helpers ──
  const allCampaigns = campaigns
  const statsTarget = statsSelectedId
    ? campaigns.find(c => c.id === statsSelectedId) ?? campaigns[0] ?? null
    : campaigns[0] ?? null

  const statsSnaps = statsTarget
    ? snapshots.filter(s => s.campaign_id === statsTarget.id).sort((a,b) => a.snapshot_date.localeCompare(b.snapshot_date))
    : []

  const statsTotalSold   = statsTarget?.tickets_sold ?? 0
  const statsTotalCap    = statsTarget?.tickets_for_sale ?? 0
  const statsRemaining   = statsTotalCap > 0 ? statsTotalCap - statsTotalSold : null
  const statsPct         = statsTotalCap > 0 ? Math.round(statsTotalSold / statsTotalCap * 100) : null

  let statsDailyRate: number | null = null
  if (statsSnaps.length >= 2) {
    const first = statsSnaps[0]
    const last  = statsSnaps[statsSnaps.length - 1]
    const days  = Math.max(1, Math.round((new Date(last.snapshot_date).getTime() - new Date(first.snapshot_date).getTime()) / 86400000))
    statsDailyRate = parseFloat(((last.tickets_sold - first.tickets_sold) / days).toFixed(1))
  }

  const chartMax = Math.max(statsTotalCap, ...statsSnaps.map(s => s.tickets_sold), 1)
  const fmtDateShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div dir="rtl" className="space-y-6">

      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 w-fit border border-gray-200 dark:border-gray-700">
        {([
          { key: 'update', label: '📋 עדכון כרטיסים' },
          { key: 'stats',  label: '📊 סטטיסטיקות' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveSubTab(key)}
            className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
            style={activeSubTab === key
              ? { background: '#ec4899', color: 'white', boxShadow: '0 2px 8px rgba(236,72,153,0.35)' }
              : { background: 'transparent', color: 'var(--text-secondary, #6b7280)' }}
          >{label}</button>
        ))}
      </div>

      {/* Stats tab */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">מופע:</span>
            {allCampaigns.map(c => (
              <button key={c.id} onClick={() => setStatsSelectedId(c.id)}
                className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all border"
                style={(statsTarget?.id === c.id)
                  ? { background: '#ec4899', color: 'white', borderColor: '#ec4899' }
                  : { background: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }}
              >{c.name}</button>
            ))}
          </div>
          {statsTarget ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'כרטיסים למכירה', value: statsTotalCap > 0 ? statsTotalCap.toLocaleString() : '—', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', icon: '🎫' },
                  { label: 'נמכרו', value: statsTotalSold.toLocaleString(), color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: '✅' },
                  { label: 'נותרו', value: statsRemaining !== null ? statsRemaining.toLocaleString() : '—', color: statsRemaining !== null && statsRemaining <= 50 ? '#ef4444' : '#f59e0b', bg: statsRemaining !== null && statsRemaining <= 50 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', icon: '⏳' },
                  { label: 'ממוצע יומי', value: statsDailyRate !== null ? '+' + statsDailyRate + '/י' : '—', color: '#ec4899', bg: 'rgba(236,72,153,0.08)', icon: '📈' },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: 'var(--bg-card, white)', border: '1px solid var(--border-color, #e5e7eb)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary, #6b7280)' }}>{card.label}</span>
                      <span className="text-base">{card.icon}</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
                    {card.label === 'נמכרו' && statsPct !== null && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: Math.min(statsPct, 100) + '%', background: statsPct >= 90 ? '#ef4444' : statsPct >= 70 ? '#f59e0b' : '#10b981' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {statsPct !== null && (
                <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card, white)', border: '1px solid var(--border-color, #e5e7eb)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary, #111827)' }}>אחוז מכירה כולל</span>
                    <span className="text-xl font-bold" style={{ color: statsPct >= 90 ? '#ef4444' : statsPct >= 70 ? '#f59e0b' : '#10b981' }}>{statsPct}%</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden" style={{ background: '#f3f4f6' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: Math.min(statsPct, 100) + '%', background: statsPct >= 90 ? 'linear-gradient(to left, #ef4444, #f87171)' : statsPct >= 70 ? 'linear-gradient(to left, #f59e0b, #fbbf24)' : 'linear-gradient(to left, #10b981, #34d399)' }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs" style={{ color: 'var(--text-secondary, #6b7280)' }}>0</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary, #6b7280)' }}>{statsTotalCap.toLocaleString()}</span>
                  </div>
                </div>
              )}
              {statsSnaps.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card, white)', border: '1px solid var(--border-color, #e5e7eb)' }}>
                  <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary, #111827)' }}>מכירות לאורך זמן — {statsTarget.name}</h3>
                  <div className="flex items-end gap-2 overflow-x-auto" style={{ height: 160, paddingTop: 24 }}>
                    {statsSnaps.map((snap, i) => {
                      const h = Math.round((snap.tickets_sold / chartMax) * 130)
                      const capH = statsTotalCap > 0 ? Math.round((statsTotalCap / chartMax) * 130) : 0
                      const prev = i > 0 ? statsSnaps[i - 1].tickets_sold : 0
                      const delta = snap.tickets_sold - prev
                      return (
                        <div key={snap.id} className="flex flex-col items-center gap-1 flex-1 min-w-[40px] group relative">
                          <div className="relative w-full flex flex-col justify-end" style={{ height: 130 }}>
                            {statsTotalCap > 0 && (
                              <div className="absolute left-0 right-0" style={{ bottom: capH, borderTop: '1px dashed rgba(239,68,68,0.4)', zIndex: 1 }} />
                            )}
                            <div className="absolute bottom-0 left-1 right-1 rounded-t-lg transition-all"
                              style={{ height: h, background: 'linear-gradient(to top, #ec4899, #f9a8d4)' }} />
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"
                              style={{ background: '#1f2937', color: 'white', fontSize: 10 }}>
                              {snap.tickets_sold.toLocaleString()} {delta > 0 ? '(+' + delta + ')' : ''}
                            </div>
                          </div>
                          <span className="text-center" style={{ color: '#9ca3af', fontSize: 9 }}>{fmtDateShort(snap.snapshot_date)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: '#ec4899' }} /><span className="text-xs" style={{ color: '#6b7280' }}>כרטיסים מכורים</span></div>
                  </div>
                </div>
              )}
              {statsSnaps.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card, white)', border: '1px solid var(--border-color, #e5e7eb)' }}>
                  <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-color, #e5e7eb)' }}>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary, #111827)' }}>היסטוריית עדכונים</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary, #f9fafb)' }}>
                        {['תאריך', 'כרטיסים מכורים', 'שינוי', 'אחוז'].map(h => (
                          <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: '#6b7280' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...statsSnaps].reverse().map((snap, i) => {
                        const idx = statsSnaps.length - 1 - i
                        const prevSnap = idx > 0 ? statsSnaps[idx - 1] : null
                        const delta = prevSnap ? snap.tickets_sold - prevSnap.tickets_sold : null
                        const pct = statsTotalCap > 0 ? Math.round(snap.tickets_sold / statsTotalCap * 100) : null
                        return (
                          <tr key={snap.id} style={{ borderBottom: '1px solid var(--border-color, #e5e7eb)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary, #f9fafb)' }}>
                            <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-primary, #111827)' }}>{fmtDateShort(snap.snapshot_date)}</td>
                            <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#ec4899' }}>{snap.tickets_sold.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: delta !== null ? (delta > 0 ? '#10b981' : delta < 0 ? '#ef4444' : '#6b7280') : '#6b7280' }}>
                              {delta !== null ? (delta > 0 ? '+' + delta : String(delta)) : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: '#6b7280' }}>{pct !== null ? pct + '%' : '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {statsSnaps.length === 0 && (
                <div className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>אין עדיין נתוני היסטוריה למופע זה</div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-sm" style={{ color: '#9ca3af' }}>אין מופעים</div>
          )}
        </div>
      )}

      {/* Update tab */}
      {activeSubTab === 'update' && (
      <div className="space-y-10">
    <div dir="rtl" className="space-y-10">

      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">
        <svg className="w-4 h-4 text-pink-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">תאריך העדכון:</span>
        <input
          type="date"
          value={snapshotDate}
          onChange={e => setSnapshotDate(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
        />
        <span className="text-xs text-gray-400">כל לחיצת שמור תירשם לתאריך זה</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <table className="min-w-full text-sm bg-white dark:bg-gray-800">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">תאריך מופע</th>
              <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">שם המופע</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">כרטיסים למכירה</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">כרטיסים מכורים כעת</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">עדכון כרטיסים נוכחי</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">נותרו</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">ימים למופע</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {upcomingCampaigns.map((camp, i) => {
              const sold = camp.tickets_sold ?? 0
              const remaining = camp.tickets_for_sale != null ? camp.tickets_for_sale - sold : null
              const pct = camp.tickets_for_sale ? Math.round(sold / camp.tickets_for_sale * 100) : null
              const daysToShow = camp.launch_date
                ? Math.ceil((new Date(camp.launch_date + 'T00:00:00').getTime() - new Date().setHours(0,0,0,0)) / 86400000)
                : null
              const daysColor = daysToShow === null ? '' : daysToShow === 0 ? 'text-green-600 font-black' : daysToShow <= 7 ? 'text-red-500 font-bold' : daysToShow <= 30 ? 'text-orange-500 font-semibold' : 'text-indigo-500 font-medium'
              const rowBg = i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
              return (
                <tr key={camp.id} className={rowBg}>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(camp.launch_date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 dark:text-white">{camp.name}</p>
                    {pct !== null && (
                      <div className="mt-1 h-1 w-28 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={'h-full rounded-full ' + pctBarColor(pct)} style={{ width: Math.min(pct, 100) + '%' }} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400">{camp.tickets_for_sale ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">
                      {camp.tickets_sold != null ? camp.tickets_sold.toLocaleString() : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      ref={el => { inputRefs.current[camp.id] = el }}
                      type="number"
                      min="0"
                      value={updateInputs[camp.id] ?? ''}
                      onChange={e => setUpdateInputs(prev => ({ ...prev, [camp.id]: e.target.value }))}
                      onKeyDown={async e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          await handleSave(camp.id)
                          const nextCamp = upcomingCampaigns[i + 1]
                          if (nextCamp) {
                            inputRefs.current[nextCamp.id]?.focus()
                          }
                        }
                      }}
                      placeholder="הזן מספר"
                      className="w-28 px-2 py-1.5 text-sm border border-pink-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white text-center"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {remaining !== null
                      ? <span className={'text-sm font-semibold ' + remainingColor(remaining)}>{remaining}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {daysToShow !== null
                      ? <span className={'text-sm ' + daysColor}>{daysToShow === 0 ? 'היום!' : daysToShow === 1 ? 'מחר' : daysToShow + ' י\''}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSave(camp.id)}
                      disabled={savingId === camp.id || !updateInputs[camp.id]}
                      className={'px-4 py-1.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap ' + (savedId === camp.id ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-600 text-white hover:bg-pink-700')}
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
                {upcomingCampaigns.map((camp, i) => {
                  const velocity = getVelocity(camp.id)
                  const campSnaps = snapshots.filter(s => s.campaign_id === camp.id).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
                  const latestSnap = campSnaps[campSnaps.length - 1]
                  const pctSold = camp.tickets_for_sale && latestSnap
                    ? Math.round(latestSnap.tickets_sold / camp.tickets_for_sale * 100)
                    : null
                  const rowBg = i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
                  return (
                    <tr key={camp.id} className={rowBg}>
                      <td className="sticky right-0 z-10 bg-inherit px-4 py-2.5 border-l border-gray-200 dark:border-gray-700">
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[140px] text-sm">{camp.name}</p>
                        {pctSold !== null && (
                          <div className="mt-1 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={'h-full rounded-full ' + pctBarColor(pctSold)} style={{ width: Math.min(pctSold, 100) + '%' }} />
                          </div>
                        )}
                      </td>
                      {allDates.map(date => {
                        const snap = getSnap(camp.id, date)
                        const isLatest = date === allDates[allDates.length - 1]
                        return (
                          <td key={date} className="px-3 py-2.5 text-center">
                            {snap
                              ? <span className={isLatest ? 'font-bold text-gray-900 dark:text-white text-sm' : 'text-gray-500 dark:text-gray-400 text-sm'}>{snap.tickets_sold.toLocaleString()}</span>
                              : <span className="text-gray-200 dark:text-gray-600 text-xs select-none">·</span>}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2.5 text-center">
                        {velocity
                          ? <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">{velocity}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400 text-right">כל לחיצה על שמור מתועדת כנקודת זמן בטבלה</p>
        </div>
      )}

      </div>
      )}

    </div>
  )
}
