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
}

export function TicketTrackingView() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [snapshots, setSnapshots] = useState<TicketSnapshot[]>([])
  const [dates, setDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [addingDate, setAddingDate] = useState(false)
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [editCell, setEditCell] = useState<{ campaignId: string; date: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (editCell && inputRef.current) inputRef.current.focus() }, [editCell])

  const loadData = async () => {
    const [{ data: camps }, { data: snaps }] = await Promise.all([
      supabase.from('campaigns').select('id, requester, name, launch_date, tickets_for_sale').eq('board', 'barbie').order('launch_date', { ascending: true }),
      supabase.from('ticket_snapshots').select('*').order('snapshot_date', { ascending: true }),
    ])
    if (camps) setCampaigns(camps.map(c => ({ id: c.id, name: c.requester || c.name, launch_date: c.launch_date, tickets_for_sale: c.tickets_for_sale })))
    if (snaps) {
      setSnapshots(snaps)
      const unique = [...new Set(snaps.map((s: TicketSnapshot) => s.snapshot_date))].sort() as string[]
      setDates(unique)
    }
    setLoading(false)
  }

  const getSnap = (campaignId: string, date: string) =>
    snapshots.find(s => s.campaign_id === campaignId && s.snapshot_date === date)

  const saveSnap = async (campaignId: string, date: string, value: number) => {
    setSaving(true)
    const existing = getSnap(campaignId, date)
    if (existing) {
      await supabase.from('ticket_snapshots').update({ tickets_sold: value }).eq('id', existing.id)
    } else {
      await supabase.from('ticket_snapshots').insert({ campaign_id: campaignId, snapshot_date: date, tickets_sold: value })
    }
    // Update campaigns.tickets_sold if this is the latest snapshot date for this campaign
    const campSnaps = snapshots.filter(s => s.campaign_id === campaignId).map(s => s.snapshot_date)
    if (!campSnaps.length || date >= Math.max(...campSnaps.map(d => +new Date(d)) as unknown as number[]).toString()) {
      await supabase.from('campaigns').update({ tickets_sold: value, updated_at: new Date().toISOString() }).eq('id', campaignId)
    }
    await loadData()
    setSaving(false)
  }

  const commitEdit = async () => {
    if (editCell && editValue.trim() !== '') {
      const val = parseInt(editValue)
      if (!isNaN(val)) await saveSnap(editCell.campaignId, editCell.date, val)
    }
    setEditCell(null)
  }

  const addDate = () => {
    if (!newDate) return
    if (!dates.includes(newDate)) setDates(prev => [...prev, newDate].sort())
    setAddingDate(false)
  }

  const getVelocity = (campaignId: string): string => {
    const campSnaps = snapshots.filter(s => s.campaign_id === campaignId).sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    if (campSnaps.length < 2) return ''
    const last = campSnaps[campSnaps.length - 1]
    const prev = campSnaps[campSnaps.length - 2]
    const days = Math.round((new Date(last.snapshot_date).getTime() - new Date(prev.snapshot_date).getTime()) / 86400000)
    if (days <= 0) return ''
    const delta = last.tickets_sold - prev.tickets_sold
    const rate = (delta / days).toFixed(1)
    return `${delta >= 0 ? '+' : ''}${delta} / ${days}י (${rate}/י)`
  }

  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
  }

  const fmtShowDate = (d: string | null) => {
    if (!d) return '—'
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  if (loading) return (
    <div className="p-8 text-center text-gray-400">
      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="relative" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400">{campaigns.length} מופעים · {dates.length} תאריכי מעקב</p>
        </div>
        <button
          onClick={() => { setNewDate(new Date().toISOString().split('T')[0]); setAddingDate(true) }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          הוסף תאריך מעקב
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="font-medium">אין מופעים — הוסף קמפיינים בארבי כדי להתחיל במעקב</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="min-w-full text-sm bg-white dark:bg-gray-800">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="sticky right-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700 min-w-[160px]">
                  מופע
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  תאריך מופע
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  כמות
                </th>
                {dates.map(date => (
                  <th key={date} className="px-3 py-3 text-center text-xs font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap min-w-[70px]">
                    {fmtDate(date)}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                  קצב מכירה
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {campaigns.map((camp, i) => {
                const velocity = getVelocity(camp.id)
                const latestSnap = snapshots.filter(s => s.campaign_id === camp.id).sort((a,b) => a.snapshot_date.localeCompare(b.snapshot_date)).pop()
                const pctSold = camp.tickets_for_sale && latestSnap ? Math.round(latestSnap.tickets_sold / camp.tickets_for_sale * 100) : null

                return (
                  <tr key={camp.id} className={`hover:bg-pink-50/20 dark:hover:bg-gray-750 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'}`}>
                    <td className="sticky right-0 z-10 bg-inherit px-4 py-2.5 border-l border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">{camp.name}</p>
                          {pctSold !== null && (
                            <div className="mt-1 h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pctSold >= 90 ? 'bg-red-400' : pctSold >= 70 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(pctSold, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {fmtShowDate(camp.launch_date)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                      {camp.tickets_for_sale ?? '—'}
                    </td>
                    {dates.map(date => {
                      const snap = getSnap(camp.id, date)
                      const isEditing = editCell?.campaignId === camp.id && editCell?.date === date
                      const isLatest = date === dates[dates.length - 1]
                      return (
                        <td key={date} className="px-1 py-1 text-center">
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditCell(null) }}
                              className="w-16 px-1 py-0.5 text-sm text-center border-2 border-pink-400 rounded-lg focus:outline-none dark:bg-gray-700 dark:text-white"
                            />
                          ) : (
                            <button
                              onClick={() => { setEditCell({ campaignId: camp.id, date }); setEditValue(snap ? String(snap.tickets_sold) : '') }}
                              className={`w-full px-2 py-1.5 text-sm rounded-lg transition-colors hover:bg-pink-100 dark:hover:bg-pink-900/20 ${isLatest && snap ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                              {snap ? snap.tickets_sold.toLocaleString() : <span className="text-gray-200 dark:text-gray-600 text-xs select-none">·</span>}
                            </button>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2.5 text-center">
                      {velocity ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">{velocity}</span>
                      ) : (
                        <span className="text-gray-200 dark:text-gray-600 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2 rounded-xl shadow-lg z-50">
          שומר...
        </div>
      )}

      {addingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={e => { if(e.target===e.currentTarget) setAddingDate(false) }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-80" dir="rtl">
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">הוסף תאריך מעקב</h3>
            <p className="text-xs text-gray-400 mb-3">בחר תאריך שבו לצלם את מספר הכרטיסים המכורים לכל מופע</p>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300 dark:bg-gray-700 dark:text-white"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={addDate} className="flex-1 py-2 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700 transition-colors">הוסף</button>
              <button onClick={() => setAddingDate(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
