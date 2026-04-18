'use client'
import { useEffect, useMemo, useState } from 'react'
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

export function StatisticsView() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [snapshots, setSnapshots] = useState<TicketSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState<number>(14)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [campsRes, snapsRes] = await Promise.all([
        supabase.from('campaigns')
          .select('id, requester, name, launch_date, tickets_for_sale, tickets_sold')
          .eq('board', 'barbie')
          .order('launch_date', { ascending: true }),
        supabase.from('ticket_snapshots').select('*').order('snapshot_date', { ascending: true }),
      ])
      if (campsRes.data) {
        setCampaigns((campsRes.data as any[]).map(c => ({
          id: c.id,
          name: c.requester || c.name,
          launch_date: c.launch_date,
          tickets_for_sale: c.tickets_for_sale,
          tickets_sold: c.tickets_sold,
        })))
      }
      if (snapsRes.data) setSnapshots(snapsRes.data as TicketSnapshot[])
    } catch (e) { console.error('stats load error', e) }
    setLoading(false)
  }

  // Derived data
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const upcoming = useMemo(() => campaigns.filter(c => {
    if (!c.launch_date) return false
    const d = new Date(c.launch_date + 'T00:00:00')
    return d >= today
  }), [campaigns])

  const totalCapacity = upcoming.reduce((s, c) => s + (c.tickets_for_sale || 0), 0)
  const totalSold = upcoming.reduce((s, c) => s + (c.tickets_sold || 0), 0)
  const totalRemaining = Math.max(0, totalCapacity - totalSold)
  const overallPct = totalCapacity > 0 ? Math.round(totalSold / totalCapacity * 100) : 0

  // Aggregate sold-per-day (sum of tickets_sold snapshots per date)
  const dailyAgg = useMemo(() => {
    const byDate: Record<string, { date: string; sum: number }> = {}
    snapshots.forEach(s => {
      if (!byDate[s.snapshot_date]) byDate[s.snapshot_date] = { date: s.snapshot_date, sum: 0 }
      byDate[s.snapshot_date].sum += s.tickets_sold
    })
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
  }, [snapshots])

  // Daily deltas = sold today vs yesterday (total sold across all active shows)
  const dailyDeltas = useMemo(() => {
    const arr: { date: string; delta: number }[] = []
    for (let i = 1; i < dailyAgg.length; i++) {
      const d = dailyAgg[i].sum - dailyAgg[i - 1].sum
      arr.push({ date: dailyAgg[i].date, delta: d })
    }
    return arr
  }, [dailyAgg])

  const recentDeltas = dailyDeltas.slice(-rangeDays)
  const maxDelta = Math.max(1, ...recentDeltas.map(d => Math.abs(d.delta)))
  const avgDailyDelta = recentDeltas.length > 0
    ? Math.round(recentDeltas.reduce((s, d) => s + d.delta, 0) / recentDeltas.length)
    : 0

  // Per-campaign velocity: latest vs previous snapshot (tickets/day)
  type CampaignStat = {
    id: string
    name: string
    launch_date: string | null
    daysToShow: number | null
    capacity: number
    sold: number
    pct: number
    remaining: number
    velocity: number // tickets per day (recent)
    daysToSellout: number | null // remaining / velocity
    onTrack: boolean | null
    risk: 'low' | 'medium' | 'high' | null
    snapshotCount: number
  }

  const campaignStats: CampaignStat[] = useMemo(() => {
    return upcoming.map(c => {
      const capacity = c.tickets_for_sale || 0
      const sold = c.tickets_sold || 0
      const pct = capacity > 0 ? Math.round(sold / capacity * 100) : 0
      const remaining = Math.max(0, capacity - sold)
      const campSnaps = snapshots
        .filter(s => s.campaign_id === c.id)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      let velocity = 0
      if (campSnaps.length >= 2) {
        const first = campSnaps[Math.max(0, campSnaps.length - 7)]
        const last = campSnaps[campSnaps.length - 1]
        const days = Math.max(1, Math.round(
          (new Date(last.snapshot_date).getTime() - new Date(first.snapshot_date).getTime()) / 86400000
        ))
        velocity = (last.tickets_sold - first.tickets_sold) / days
      }
      const daysToShow = c.launch_date
        ? Math.ceil((new Date(c.launch_date + 'T00:00:00').getTime() - today.getTime()) / 86400000)
        : null
      const daysToSellout = velocity > 0 ? Math.ceil(remaining / velocity) : null

      let onTrack: boolean | null = null
      let risk: 'low' | 'medium' | 'high' | null = null
      if (daysToShow !== null && velocity > 0 && remaining > 0) {
        const neededPerDay = daysToShow > 0 ? remaining / daysToShow : Infinity
        onTrack = velocity >= neededPerDay
        const ratio = daysToShow > 0 ? velocity / neededPerDay : 1
        risk = ratio >= 1 ? 'low' : ratio >= 0.6 ? 'medium' : 'high'
      } else if (remaining === 0) {
        onTrack = true
        risk = 'low'
      }

      return {
        id: c.id,
        name: c.name,
        launch_date: c.launch_date,
        daysToShow,
        capacity,
        sold,
        pct,
        remaining,
        velocity,
        daysToSellout,
        onTrack,
        risk,
        snapshotCount: campSnaps.length,
      }
    })
  }, [upcoming, snapshots])

  const topByPct = [...campaignStats].sort((a, b) => b.pct - a.pct).slice(0, 5)
  const fastestSelling = [...campaignStats].filter(s => s.velocity > 0).sort((a, b) => b.velocity - a.velocity).slice(0, 5)
  const atRisk = campaignStats.filter(s => s.risk === 'high' && s.remaining > 0)
  const warning = campaignStats.filter(s => s.risk === 'medium' && s.remaining > 0)

  // === Pokes (דקירות) — per-campaign per-date delta from previous snapshot ===
  // This is the core insight: how many tickets sold BETWEEN each manual update.
  const pokes = useMemo(() => {
    // For each campaign, walk snapshots chronologically and compute delta per date
    const allDatesSet = new Set<string>()
    const byCampaign: Record<string, Record<string, number>> = {} // campaignId → date → delta
    const prevValueByCampaign: Record<string, Record<string, number>> = {} // for tooltip
    const absValueByCampaign: Record<string, Record<string, number>> = {} // cumulative tickets sold at that snapshot

    upcoming.forEach(c => {
      const campSnaps = snapshots
        .filter(s => s.campaign_id === c.id)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      byCampaign[c.id] = {}
      prevValueByCampaign[c.id] = {}
      absValueByCampaign[c.id] = {}
      for (let i = 0; i < campSnaps.length; i++) {
        const s = campSnaps[i]
        allDatesSet.add(s.snapshot_date)
        absValueByCampaign[c.id][s.snapshot_date] = s.tickets_sold
        if (i > 0) {
          const delta = s.tickets_sold - campSnaps[i - 1].tickets_sold
          byCampaign[c.id][s.snapshot_date] = delta
          prevValueByCampaign[c.id][s.snapshot_date] = campSnaps[i - 1].tickets_sold
        }
      }
    })

    const allDates = [...allDatesSet].sort()

    // Per-date totals (sum of deltas across campaigns that had a snapshot that day)
    const totalsByDate: Record<string, number> = {}
    const campaignCountByDate: Record<string, number> = {}
    allDates.forEach(d => {
      let sum = 0
      let cnt = 0
      Object.keys(byCampaign).forEach(cid => {
        if (byCampaign[cid][d] !== undefined) {
          sum += byCampaign[cid][d]
          cnt++
        }
      })
      totalsByDate[d] = sum
      campaignCountByDate[d] = cnt
    })

    return { allDates, byCampaign, totalsByDate, campaignCountByDate, absValueByCampaign, prevValueByCampaign }
  }, [upcoming, snapshots])

  // Focus on the last N pokes (snapshots) for the table — show all by default; this is history
  const [pokeWindow, setPokeWindow] = useState<number>(14)
  const pokeDates = pokes.allDates.slice(-pokeWindow)
  const latestPokeDate = pokes.allDates[pokes.allDates.length - 1] || null
  const prevPokeDate = pokes.allDates[pokes.allDates.length - 2] || null
  const latestPokeTotal = latestPokeDate ? (pokes.totalsByDate[latestPokeDate] || 0) : 0
  const prevPokeTotal = prevPokeDate ? (pokes.totalsByDate[prevPokeDate] || 0) : 0
  const pokeTrend = latestPokeTotal - prevPokeTotal // difference between latest puncture and previous puncture

  // Campaigns that have at least one poke in the visible window
  const pokeCampaigns = upcoming
    .map(c => ({ ...c, _total: pokeDates.reduce((s, d) => s + (pokes.byCampaign[c.id]?.[d] || 0), 0) }))
    .filter(c => pokeDates.some(d => pokes.byCampaign[c.id]?.[d] !== undefined))
    .sort((a, b) => b._total - a._total)

  // Max value for heat-coloring
  const maxPokeValue = Math.max(1, ...pokeDates.flatMap(d =>
    pokeCampaigns.map(c => Math.abs(pokes.byCampaign[c.id]?.[d] || 0))
  ))

  function pokeCellClass(v: number | undefined): string {
    if (v === undefined) return 'bg-gray-50 dark:bg-gray-900/40 text-gray-300'
    if (v === 0) return 'bg-white dark:bg-gray-800 text-gray-300'
    if (v < 0) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold'
    const intensity = Math.min(1, Math.abs(v) / maxPokeValue)
    if (intensity >= 0.75) return 'bg-emerald-500 text-white font-bold'
    if (intensity >= 0.5) return 'bg-emerald-400 text-white font-bold'
    if (intensity >= 0.25) return 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-semibold'
    return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium'
  }

  // Best selling day across all campaigns
  const bestDay = dailyDeltas.reduce((best, d) => (d.delta > best.delta ? d : best), { date: '', delta: 0 })

  // Snapshot coverage — how many days have been tracked
  const uniqueDates = new Set(snapshots.map(s => s.snapshot_date))
  const trackingDays = uniqueDates.size

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }
  const fmtShort = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div dir="rtl" className="space-y-6">

      {/* ===== Pokes (דקירות) — THE PRIMARY VIEW ===== */}
      <div className="rounded-2xl border-2 border-pink-200 dark:border-pink-900 bg-white dark:bg-gray-800 shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-l from-pink-50 to-white dark:from-pink-950/30 dark:to-gray-800">
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              דקירות יומיות — כמה כרטיסים נמכרו בין עדכון לעדכון
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              מחושב אוטומטית מעדכוני "מעקב כרטיסים" שלך · הפרש בין כל שמירה לקודמתה
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {[7, 14, 30, 60].map(n => (
              <button key={n} onClick={() => setPokeWindow(n)}
                className={'px-3 py-1 rounded-md text-xs font-semibold transition-colors ' + (pokeWindow === n ? 'bg-white dark:bg-gray-800 shadow text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
                {n} דקירות
              </button>
            ))}
          </div>
        </div>

        {/* Latest poke highlight strip */}
        {latestPokeDate && (
          <div className="px-5 py-3 bg-pink-50/50 dark:bg-pink-950/20 border-b border-pink-100 dark:border-pink-900/50 flex items-center justify-between flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">דקירה אחרונה:</span>
                <span className="ml-2 font-bold text-gray-800 dark:text-white">{fmtDate(latestPokeDate)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">נמכרו ביום:</span>
                <span className={'ml-2 font-bold text-lg ' + (latestPokeTotal > 0 ? 'text-emerald-600' : latestPokeTotal < 0 ? 'text-red-600' : 'text-gray-600')}>
                  {latestPokeTotal > 0 ? '+' : ''}{latestPokeTotal.toLocaleString()}
                </span>
              </div>
              {prevPokeDate && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">מול הדקירה הקודמת ({fmtDate(prevPokeDate)}):</span>
                  <span className={'ml-2 font-bold ' + (pokeTrend > 0 ? 'text-emerald-600' : pokeTrend < 0 ? 'text-red-600' : 'text-gray-600')}>
                    {pokeTrend > 0 ? '▲' : pokeTrend < 0 ? '▼' : '◆'} {Math.abs(pokeTrend).toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">מופעים שעודכנו:</span>
                <span className="ml-2 font-bold text-gray-800 dark:text-white">{pokes.campaignCountByDate[latestPokeDate] || 0}</span>
              </div>
            </div>
          </div>
        )}

        {pokes.allDates.length < 2 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            צריכות לפחות 2 דקירות כדי לחשב הפרש — המשך לעדכן ב"מעקב כרטיסים" מדי יום
          </div>
        ) : pokeCampaigns.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            אין נתוני דקירות בחלון הזמן שנבחר
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <th className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 text-right font-bold text-gray-500 dark:text-gray-400 uppercase border-l border-gray-200 dark:border-gray-700 min-w-[180px]">
                    מופע
                  </th>
                  {pokeDates.map(d => (
                    <th key={d} className="px-2 py-2.5 text-center font-bold text-pink-600 dark:text-pink-400 uppercase whitespace-nowrap min-w-[58px]">
                      {fmtShort(d)}
                    </th>
                  ))}
                  <th className="sticky left-0 z-10 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2.5 text-center font-bold text-indigo-700 dark:text-indigo-300 uppercase border-r border-indigo-200 dark:border-indigo-800 min-w-[80px]">
                    סה"כ בחלון
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pokeCampaigns.map((c, i) => {
                  const rowBg = i % 2 === 1 ? 'bg-gray-50/40 dark:bg-gray-800/60' : 'bg-white dark:bg-gray-800'
                  return (
                    <tr key={c.id} className={rowBg}>
                      <td className={'sticky right-0 z-10 px-4 py-2 border-l border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white truncate max-w-[180px] ' + rowBg}>
                        {c.name}
                        <span className="block text-[10px] font-normal text-gray-400">{fmtDate(c.launch_date)}</span>
                      </td>
                      {pokeDates.map(d => {
                        const v = pokes.byCampaign[c.id]?.[d]
                        const abs = pokes.absValueByCampaign[c.id]?.[d]
                        const prev = pokes.prevValueByCampaign[c.id]?.[d]
                        const title = v !== undefined
                          ? `${fmtDate(d)} — נמכרו ${v >= 0 ? '+' : ''}${v} (מ-${prev} ל-${abs})`
                          : abs !== undefined
                            ? `${fmtDate(d)} — נקודת בסיס: ${abs}`
                            : `${fmtDate(d)} — ללא עדכון`
                        return (
                          <td key={d} title={title} className={'px-2 py-2 text-center whitespace-nowrap ' + pokeCellClass(v)}>
                            {v !== undefined ? (v > 0 ? '+' : '') + v : abs !== undefined ? <span className="text-gray-300 text-[10px]">·{abs}</span> : <span className="text-gray-200">—</span>}
                          </td>
                        )
                      })}
                      <td className="sticky left-0 z-10 px-3 py-2 text-center bg-indigo-50 dark:bg-indigo-950/40 border-r border-indigo-200 dark:border-indigo-800 font-bold text-indigo-700 dark:text-indigo-300">
                        {c._total > 0 ? '+' : ''}{c._total.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr className="bg-pink-50 dark:bg-pink-950/30 border-t-2 border-pink-200 dark:border-pink-900">
                  <td className="sticky right-0 z-10 bg-pink-50 dark:bg-pink-950/30 px-4 py-3 text-right font-bold text-pink-700 dark:text-pink-300 border-l border-pink-200 dark:border-pink-900">
                    סה"כ נמכר ביום
                  </td>
                  {pokeDates.map(d => {
                    const v = pokes.totalsByDate[d] || 0
                    const cnt = pokes.campaignCountByDate[d] || 0
                    return (
                      <td key={d} className="px-2 py-3 text-center font-bold text-pink-700 dark:text-pink-300 whitespace-nowrap">
                        <div>{v > 0 ? '+' : ''}{v}</div>
                        <div className="text-[9px] font-normal text-pink-500/70">{cnt} מופעים</div>
                      </td>
                    )
                  })}
                  <td className="sticky left-0 z-10 bg-pink-100 dark:bg-pink-950/50 px-3 py-3 text-center font-black text-pink-800 dark:text-pink-200 border-r border-pink-300 dark:border-pink-900">
                    {pokeDates.reduce((s, d) => s + (pokes.totalsByDate[d] || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-2.5 bg-gray-50 dark:bg-gray-900/40 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-500" /> מכירה גבוהה</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-emerald-200" /> מכירה רגילה</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-100" /> ירידה</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-gray-50 border border-gray-200" /> ללא עדכון</span>
          <span className="text-gray-400 mr-auto">הרחף מעל תא כדי לראות את הערך המוחלט</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">מופעים עתידיים</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{upcoming.length}</p>
          <p className="text-xs text-gray-400 mt-1">{trackingDays} ימי מעקב</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">סה"כ כרטיסים נמכרו</p>
          <p className="text-2xl font-bold text-emerald-600">{totalSold.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">מתוך {totalCapacity.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">אחוז מכירה כללי</p>
          <p className="text-2xl font-bold text-indigo-600">{overallPct}%</p>
          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: Math.min(overallPct, 100) + '%' }} />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">קצב יומי ממוצע</p>
          <p className="text-2xl font-bold text-pink-600">{avgDailyDelta >= 0 ? '+' : ''}{avgDailyDelta}</p>
          <p className="text-xs text-gray-400 mt-1">ב-{recentDeltas.length} ימים אחרונים</p>
        </div>
      </div>

      {/* Daily sales chart */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            מכירה יומית (שינוי)
          </h3>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {[7, 14, 30, 60].map(d => (
              <button key={d} onClick={() => setRangeDays(d)}
                className={'px-3 py-1 rounded-md text-xs font-semibold transition-colors ' + (rangeDays === d ? 'bg-white dark:bg-gray-800 shadow text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700')}>
                {d} ימים
              </button>
            ))}
          </div>
        </div>

        {recentDeltas.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">אין מספיק נתוני מעקב — צריך לפחות 2 נקודות זמן</p>
        ) : (
          <div className="flex items-end gap-1 h-48" style={{ direction: 'rtl' }}>
            {recentDeltas.map(d => {
              const h = Math.round(Math.abs(d.delta) / maxDelta * 100)
              const isNeg = d.delta < 0
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0" title={fmtShort(d.date) + ': ' + d.delta}>
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
                    {d.delta !== 0 ? (d.delta > 0 ? '+' : '') + d.delta : ''}
                  </span>
                  <div className="w-full flex justify-center">
                    <div className={'w-full rounded-t ' + (isNeg ? 'bg-red-400' : 'bg-emerald-400')}
                      style={{ height: Math.max(h, 2) + '%', minHeight: '2px' }} />
                  </div>
                  <span className="text-[9px] text-gray-400 whitespace-nowrap transform rotate-0">{fmtShort(d.date)}</span>
                </div>
              )
            })}
          </div>
        )}

        {bestDay.delta > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            היום הכי טוב: <b className="text-gray-700 dark:text-gray-200">{fmtShort(bestDay.date)}</b> עם <b className="text-emerald-600">+{bestDay.delta}</b> כרטיסים
          </div>
        )}
      </div>

      {/* Risk alerts */}
      {(atRisk.length > 0 || warning.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {atRisk.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
              <h4 className="text-sm font-bold text-red-700 dark:text-red-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                סיכון — לא צפויים להיות מכורים בזמן ({atRisk.length})
              </h4>
              <ul className="space-y-2">
                {atRisk.map(s => (
                  <li key={s.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                      <p className="text-gray-500 dark:text-gray-400">{fmtDate(s.launch_date)} · נותרו {s.remaining} כרטיסים · {s.daysToShow}י' למופע</p>
                    </div>
                    <span className="text-red-600 font-bold">{s.velocity.toFixed(1)}/י</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warning.length > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-4">
              <h4 className="text-sm font-bold text-orange-700 dark:text-orange-300 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                להתבונן — קצב מכירה נמוך ({warning.length})
              </h4>
              <ul className="space-y-2">
                {warning.map(s => (
                  <li key={s.id} className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white">{s.name}</p>
                      <p className="text-gray-500 dark:text-gray-400">{fmtDate(s.launch_date)} · נותרו {s.remaining} · {s.daysToShow}י'</p>
                    </div>
                    <span className="text-orange-600 font-bold">{s.velocity.toFixed(1)}/י</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Top performers & fastest selling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            אחוז מכירה הגבוה ביותר
          </h4>
          <ul className="space-y-2.5">
            {topByPct.map(s => (
              <li key={s.id} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-800 dark:text-white flex-1 truncate">{s.name}</span>
                <div className="w-28 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={'h-full rounded-full ' + (s.pct >= 90 ? 'bg-red-500' : s.pct >= 70 ? 'bg-orange-500' : 'bg-emerald-500')}
                    style={{ width: Math.min(s.pct, 100) + '%' }} />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-10 text-left">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            קצב מכירה מהיר ביותר
          </h4>
          <ul className="space-y-2.5">
            {fastestSelling.length === 0
              ? <li className="text-xs text-gray-400">אין עדיין קצב מכירה מדיד</li>
              : fastestSelling.map(s => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-800 dark:text-white flex-1 truncate">{s.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{s.daysToSellout !== null ? s.daysToSellout + ' י\' לסגירה' : '—'}</span>
                  <span className="text-xs font-bold text-pink-600 w-14 text-left">{s.velocity.toFixed(1)}/י</span>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Full campaigns table with all metrics */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            סטטיסטיקה מלאה לכל מופע
          </h4>
          <span className="text-xs text-gray-400">{campaignStats.length} מופעים</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">מופע</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">תאריך</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">ימים</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">קיבולת</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">נמכרו</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">אחוז</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">קצב</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">לסגירה</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">סיכון</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {campaignStats.map((s, i) => {
                const riskLabel = s.risk === 'high' ? 'גבוה' : s.risk === 'medium' ? 'בינוני' : s.risk === 'low' ? 'נמוך' : '—'
                const riskClr = s.risk === 'high' ? 'bg-red-100 text-red-700' : s.risk === 'medium' ? 'bg-orange-100 text-orange-700' : s.risk === 'low' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                const rowBg = i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''
                return (
                  <tr key={s.id} className={rowBg}>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white text-sm max-w-[200px] truncate">{s.name}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">{fmtDate(s.launch_date)}</td>
                    <td className="px-3 py-2.5 text-center text-xs">
                      {s.daysToShow !== null
                        ? <span className={s.daysToShow <= 7 ? 'text-red-500 font-bold' : s.daysToShow <= 30 ? 'text-orange-500 font-semibold' : 'text-gray-600 dark:text-gray-300'}>{s.daysToShow}</span>
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400">{s.capacity.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-800 dark:text-white">{s.sold.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={'h-full ' + (s.pct >= 90 ? 'bg-red-500' : s.pct >= 70 ? 'bg-orange-500' : 'bg-emerald-500')} style={{ width: Math.min(s.pct, 100) + '%' }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-left">{s.pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-pink-600">{s.velocity > 0 ? s.velocity.toFixed(1) : '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-600 dark:text-gray-300">{s.daysToSellout !== null ? s.daysToSellout + ' י\'' : '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={'inline-block px-2 py-0.5 rounded-full text-xs font-semibold ' + riskClr}>{riskLabel}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">הסטטיסטיקה מחושבת על בסיס עדכוני הכרטיסים היומיים שלך — מומלץ לעדכן כרטיסים ב"מעקב כרטיסים" מדי יום</p>

    </div>
  )
}
