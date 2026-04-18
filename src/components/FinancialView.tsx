'use client'
import { useState, useEffect, Fragment } from 'react'

export type FinTab = 'dashboard' | 'old_table' | 'suppliers' | 'invoices' | 'clients' | 'projects' | 'expenses'

const INVOICES_EDIT_URL = 'https://docs.google.com/spreadsheets/d/1B031KurcxK-aeiGz8SYYDLlNCcNYvQombA9VIDhKGMo/edit?gid=584902190'

interface Supplier {
  id: string
  name: string
  firstName: string
  lastName: string
  idNumber: string
  taxStatus: string
  taxStatusColor: string
  email: string
  phone: string
  role: string
  department: string
  beneficiary: string
  branch: string
  bank: string
  accountNumber: string
  daily: string
  notes: string
  hasBooksCert: boolean
  hasAccountCert: boolean
}

const TAX_STATUS_STYLE: Record<string, string> = {
  ÃÂÃÂÃÂ¨ÃÂ©ÃÂ: 'bg-emerald-100 text-emerald-700',
  ÃÂ¤ÃÂÃÂÃÂ¨: 'bg-lime-100 text-lime-700',
  ÃÂÃÂÃÂ¨ÃÂ: 'bg-teal-100 text-teal-700',
  ÃÂ¢ÃÂÃÂÃÂªÃÂ: 'bg-sky-100 text-sky-700',
}

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<Supplier | null>(null)

  useEffect(() => {
    fetch('/api/monday-suppliers')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setSuppliers(d.suppliers || [])
      })
      .catch(() => setError('ÃÂ©ÃÂÃÂÃÂÃÂ ÃÂÃÂÃÂ¢ÃÂÃÂ ÃÂª ÃÂ¡ÃÂ¤ÃÂ§ÃÂÃÂ'))
      .finally(() => setLoading(false))
  }, [])

  const roles = [...new Set(suppliers.map(s => s.role).filter(Boolean))].sort()
  const depts = [...new Set(suppliers.map(s => s.department).filter(Boolean))].sort()
  const statuses = [...new Set(suppliers.map(s => s.taxStatus).filter(Boolean))].sort()

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.idNumber.includes(q)
    const matchRole = !filterRole || s.role === filterRole
    const matchDept = !filterDept || s.department === filterDept
    const matchStatus = !filterStatus || s.taxStatus === filterStatus
    return matchSearch && matchRole && matchDept && matchStatus
  })

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-400 text-sm">ÃÂÃÂÃÂ¢ÃÂ ÃÂ¡ÃÂ¤ÃÂ§ÃÂÃÂ ÃÂ-Monday.com...</div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-red-500 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ÃÂÃÂ¤ÃÂ© ÃÂ¡ÃÂ¤ÃÂ§, ÃÂÃÂÃÂÃÂ, ÃÂÃÂÃÂ¤ÃÂÃÂ, ÃÂª.ÃÂ..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">ÃÂÃÂ ÃÂÃÂªÃÂ¤ÃÂ§ÃÂÃÂÃÂÃÂ</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">ÃÂÃÂ ÃÂÃÂÃÂÃÂÃÂ§ÃÂÃÂª</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">ÃÂÃÂ ÃÂÃÂ¡ÃÂÃÂÃÂÃÂ¡ÃÂÃÂ</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length} / {suppliers.length} ÃÂ¡ÃÂ¤ÃÂ§ÃÂÃÂ</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-right font-semibold">ÃÂ©ÃÂ ÃÂ¡ÃÂ¤ÃÂ§</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂª.ÃÂ / ÃÂ.ÃÂ¤</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂ¡ÃÂÃÂÃÂÃÂ¡ ÃÂÃÂ¡</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂªÃÂ¤ÃÂ§ÃÂÃÂ</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂÃÂÃÂ§ÃÂ</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂÃÂ¤ÃÂÃÂ</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂÃÂÃÂÃÂÃÂ</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂ ÃÂ§</th>
              <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂ©ÃÂÃÂÃÂ</th>
              <th className="px-4 py-3 text-center font-semibold">ÃÂÃÂ¡ÃÂÃÂÃÂÃÂ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂ¡ÃÂ¤ÃÂ§ÃÂÃÂ</td>
              </tr>
            ) : filtered.map((s, i) => (
              <tr
                key={s.id}
                onClick={() => setSelected(s)}
                className={`border-b border-gray-100 hover:bg-indigo-50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{s.name}</div>
                  {(s.firstName || s.lastName) && (
                    <div className="text-xs text-gray-400">{s.firstName} {s.lastName}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.idNumber || 'Ã¢ÂÂ'}</td>
                <td className="px-4 py-3">
                  {s.taxStatus ? (
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${TAX_STATUS_STYLE[s.taxStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {s.taxStatus}
                    </span>
                  ) : 'Ã¢ÂÂ'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{s.role || 'Ã¢ÂÂ'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{s.department || 'Ã¢ÂÂ'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                  {s.phone ? (
                    <a href={`tel:${s.phone}`} onClick={e => e.stopPropagation()} className="hover:text-indigo-600">
                      {s.phone}
                    </a>
                  ) : 'Ã¢ÂÂ'}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {s.email ? (
                    <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="hover:text-indigo-600 truncate block max-w-[180px]">
                      {s.email}
                    </a>
                  ) : 'Ã¢ÂÂ'}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">
                  {s.bank ? s.bank.replace(/^\d+ Ã¢ÂÂ /, '') : 'Ã¢ÂÂ'}
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.accountNumber || 'Ã¢ÂÂ'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    <span title="ÃÂÃÂÃÂ©ÃÂÃÂ¨ ÃÂ ÃÂÃÂÃÂÃÂ ÃÂ¡ÃÂ¤ÃÂ¨ÃÂÃÂ" className={`w-2 h-2 rounded-full ${s.hasBooksCert ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    <span title="ÃÂÃÂÃÂ©ÃÂÃÂ¨ ÃÂ ÃÂÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ" className={`w-2 h-2 rounded-full ${s.hasAccountCert ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"
            dir="rtl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">{selected.firstName} {selected.lastName}</p>
              </div>
              {selected.taxStatus && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${TAX_STATUS_STYLE[selected.taxStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {selected.taxStatus}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <Detail label="ÃÂª.ÃÂ / ÃÂ.ÃÂ¤" value={selected.idNumber} />
              <Detail label="ÃÂªÃÂ¤ÃÂ§ÃÂÃÂ" value={selected.role} />
              <Detail label="ÃÂÃÂÃÂÃÂ§ÃÂ" value={selected.department} />
              <Detail label="ÃÂÃÂÃÂ¤ÃÂÃÂ" value={selected.phone} href={`tel:${selected.phone}`} />
              <Detail label="ÃÂÃÂÃÂÃÂÃÂÃÂ" value={selected.email} href={`mailto:${selected.email}`} />
              <Detail label="ÃÂÃÂÃÂÃÂ" value={selected.beneficiary} />
              <Detail label="ÃÂÃÂ ÃÂ§" value={selected.bank?.replace(/^\d+ Ã¢ÂÂ /, '')} />
              <Detail label="ÃÂ¡ÃÂ ÃÂÃÂ£" value={selected.branch} />
              <Detail label="ÃÂÃÂ¡ÃÂ¤ÃÂ¨ ÃÂÃÂ©ÃÂÃÂÃÂ" value={selected.accountNumber} mono />
              {selected.daily && <Detail label="ÃÂÃÂÃÂÃÂÃÂª" value={selected.daily + ' Ã¢ÂÂª'} />}
            </div>

            <div className="flex gap-4 pt-2 border-t border-gray-100">
              <div className={`flex items-center gap-1.5 text-xs ${selected.hasBooksCert ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${selected.hasBooksCert ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                ÃÂÃÂÃÂ©ÃÂÃÂ¨ ÃÂ ÃÂÃÂÃÂÃÂ ÃÂ¡ÃÂ¤ÃÂ¨ÃÂÃÂ
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${selected.hasAccountCert ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${selected.hasAccountCert ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                ÃÂÃÂÃÂ©ÃÂÃÂ¨ ÃÂ ÃÂÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ
              </div>
            </div>

            {selected.notes && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{selected.notes}</div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ÃÂ¡ÃÂÃÂÃÂ¨
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Financial Dashboard Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const MONTH_NAMES_HE = ['ÃÂÃÂ ÃÂÃÂÃÂ¨','ÃÂ¤ÃÂÃÂ¨ÃÂÃÂÃÂ¨','ÃÂÃÂ¨ÃÂ¥','ÃÂÃÂ¤ÃÂ¨ÃÂÃÂ','ÃÂÃÂÃÂ','ÃÂÃÂÃÂ ÃÂ','ÃÂÃÂÃÂÃÂ','ÃÂÃÂÃÂÃÂÃÂ¡ÃÂ','ÃÂ¡ÃÂ¤ÃÂÃÂÃÂÃÂ¨','ÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ¨','ÃÂ ÃÂÃÂÃÂÃÂÃÂ¨','ÃÂÃÂ¦ÃÂÃÂÃÂ¨']

function fmt(n: number) {
  return 'Ã¢ÂÂª' + Math.round(n).toLocaleString('he-IL')
}

function FinancialDashboard() {
  const [invoices, setInvoices] = useState<FinDashInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then(d => { setInvoices(d.invoices || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>ÃÂÃÂÃÂ¢ÃÂ ÃÂ ÃÂªÃÂÃÂ ÃÂÃÂ...</div>
    </div>
  )

  // Ã¢ÂÂÃ¢ÂÂ KPIs Ã¢ÂÂÃ¢ÂÂ
  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid    = invoices.reduce((s, i) => s + (i.paid  || 0), 0)
  const totalRemain  = totalRevenue - totalPaid
  const openCount    = invoices.filter(i => (i.total - i.paid) > 0).length

  // Ã¢ÂÂÃ¢ÂÂ Monthly breakdown Ã¢ÂÂÃ¢ÂÂ
  type MonthData = { label: string; sortKey: string; revenue: number; paid: number; count: number }
  const monthMap: Record<string, MonthData> = {}
  invoices.forEach(inv => {
    if (!inv.date) return
    const d = new Date(israeliToISO(inv.date))
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!monthMap[key]) monthMap[key] = { label: `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`, sortKey: key, revenue: 0, paid: 0, count: 0 }
    monthMap[key].revenue += inv.total || 0
    monthMap[key].paid    += inv.paid  || 0
    monthMap[key].count   += 1
  })
  const months = Object.values(monthMap).sort((a,b) => a.sortKey.localeCompare(b.sortKey)).slice(-12)

  // Ã¢ÂÂÃ¢ÂÂ Top clients Ã¢ÂÂÃ¢ÂÂ
  const clientMap: Record<string, { name: string; revenue: number; paid: number }> = {}
  invoices.forEach(inv => {
    const name = inv.client || 'ÃÂÃÂ ÃÂÃÂÃÂÃÂÃÂ¨'
    if (!clientMap[name]) clientMap[name] = { name, revenue: 0, paid: 0 }
    clientMap[name].revenue += inv.total || 0
    clientMap[name].paid    += inv.paid  || 0
  })
  const topClients = Object.values(clientMap).sort((a,b) => b.revenue - a.revenue).slice(0, 8)

  // Ã¢ÂÂÃ¢ÂÂ Bar chart helpers Ã¢ÂÂÃ¢ÂÂ
  const maxRev = Math.max(...months.map(m => m.revenue), 1)

  // Ã¢ÂÂÃ¢ÂÂ Donut helper Ã¢ÂÂÃ¢ÂÂ
  function DonutArc({ pct, color, r = 44, stroke = 10 }: { pct: number; color: string; r?: number; stroke?: number }) {
    const circ = 2 * Math.PI * r
    const dash = pct * circ
    return (
      <circle
        cx="56" cy="56" r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
      />
    )
  }

  const paidPct    = totalRevenue > 0 ? totalPaid / totalRevenue : 0
  const remainPct  = 1 - paidPct

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6" dir="rtl">

      {/* Ã¢ÂÂÃ¢ÂÂ KPI Cards Ã¢ÂÂÃ¢ÂÂ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ÃÂ¡ÃÂ"ÃÂ ÃÂÃÂÃÂ ÃÂ¡ÃÂÃÂª', value: fmt(totalRevenue), icon: 'Ã°ÂÂÂ°', color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'ÃÂ©ÃÂÃÂÃÂ', value: fmt(totalPaid), icon: 'Ã¢ÂÂ', color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'ÃÂ ÃÂÃÂªÃÂ¨ ÃÂÃÂÃÂÃÂÃÂÃÂ', value: fmt(totalRemain), icon: 'Ã¢ÂÂ³', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂª', value: String(openCount), icon: 'Ã°ÂÂÂ', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{card.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: card.bg }}>
                {card.icon}
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Charts row Ã¢ÂÂÃ¢ÂÂ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart - monthly revenue */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>ÃÂÃÂÃÂ ÃÂ¡ÃÂÃÂª ÃÂÃÂ¤ÃÂ ÃÂÃÂÃÂÃÂ©</h3>
          {months.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>ÃÂÃÂÃÂ ÃÂ ÃÂªÃÂÃÂ ÃÂÃÂ</div>
          ) : (
            <div className="flex items-end gap-2 overflow-x-auto" style={{ height: 168, paddingTop: 32 }}>
              {months.map(m => {
                const revH = Math.round((m.revenue / maxRev) * 130)
                const paidH = Math.round((m.paid / maxRev) * 130)
                return (
                  <div key={m.sortKey} className="flex flex-col items-center gap-1 flex-1 min-w-[36px] group">
                    <div className="relative w-full flex flex-col justify-end" style={{ height: 130 }}>
                      {/* Revenue bar */}
                      <div className="absolute bottom-0 left-0 right-0 rounded-t-lg transition-all" style={{ height: revH, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)' }} />
                      {/* Paid bar */}
                      <div className="absolute bottom-0 left-1 right-1 rounded-t-lg transition-all" style={{ height: paidH, background: 'linear-gradient(to top, #6366f1, #818cf8)' }} />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: 10 }}>
                        {fmt(m.revenue)}
                      </div>
                    </div>
                    <span className="text-center leading-tight" style={{ color: 'var(--text-secondary)', fontSize: 9 }}>{m.label.split(' ')[0]}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.4)' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ÃÂÃÂÃÂ ÃÂ¡ÃÂÃÂª</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: '#6366f1' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ÃÂ©ÃÂÃÂÃÂ</span></div>
          </div>
        </div>

        {/* Donut - paid vs remaining */}
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-sm font-semibold self-start" style={{ color: 'var(--text-primary)' }}>ÃÂ¡ÃÂÃÂÃÂÃÂ¡ ÃÂÃÂÃÂÃÂÃÂ</h3>
          <svg viewBox="0 0 112 112" className="w-28 h-28">
            <DonutArc pct={1}         color="rgba(239,68,68,0.15)"  r={44} stroke={12} />
            <DonutArc pct={paidPct}   color="#10b981"                r={44} stroke={12} />
            <text x="56" y="52" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10b981">{Math.round(paidPct * 100)}%</text>
            <text x="56" y="66" textAnchor="middle" fontSize="8" fill="var(--text-secondary)">ÃÂ©ÃÂÃÂÃÂ</text>
          </svg>
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>ÃÂ©ÃÂÃÂÃÂ</span>
              <span className="font-semibold" style={{ color: '#10b981' }}>{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>ÃÂ ÃÂÃÂªÃÂ¨</span>
              <span className="font-semibold" style={{ color: '#ef4444' }}>{fmt(totalRemain)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Bottom row Ã¢ÂÂÃ¢ÂÂ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly table */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ÃÂ¤ÃÂÃÂ¨ÃÂÃÂ ÃÂÃÂÃÂÃÂ©ÃÂ</h3>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['ÃÂÃÂÃÂÃÂ©','ÃÂÃÂÃÂ ÃÂ¡ÃÂÃÂª','ÃÂ©ÃÂÃÂÃÂ','ÃÂ ÃÂÃÂªÃÂ¨','ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª'].map(h => (
                    <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m, i) => {
                  const rem = m.revenue - m.paid
                  return (
                    <tr key={m.sortKey} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmt(m.revenue)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#10b981' }}>{fmt(m.paid)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: rem > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{fmt(rem)}</td>
                      <td className="px-4 py-2.5 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{m.count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top clients */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>ÃÂÃÂ§ÃÂÃÂÃÂÃÂª ÃÂÃÂÃÂÃÂÃÂÃÂÃÂ</h3>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['ÃÂÃÂ§ÃÂÃÂ','ÃÂÃÂÃÂ ÃÂ¡ÃÂÃÂª','ÃÂ©ÃÂÃÂÃÂ','ÃÂ ÃÂÃÂªÃÂ¨'].map(h => (
                    <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topClients.map((c, i) => {
                  const rem = c.revenue - c.paid
                  const pct = c.revenue > 0 ? (c.paid / c.revenue) * 100 : 0
                  return (
                    <tr key={c.name} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-color)', width: 80 }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#10b981' }} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmt(c.revenue)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#10b981' }}>{fmt(c.paid)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: rem > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{fmt(rem)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Monthly Accordion Ã¢ÂÂÃ¢ÂÂ */}
      <MonthlyAccordion invoices={invoices} />

    </div>
  )
}

function MonthlyAccordion({ invoices }: { invoices: FinDashInvoice[] }) {
  const [open, setOpen] = useState<string | null>(null)

  // Group invoices by year-month
  const monthMap: Record<string, { label: string; invoices: FinDashInvoice[] }> = {}
  invoices.forEach(inv => {
    if (!inv.date) return
    const d = new Date(israeliToISO(inv.date))
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`
    if (!monthMap[key]) monthMap[key] = { label, invoices: [] }
    monthMap[key].invoices.push(inv)
  })
  const months = Object.entries(monthMap).sort((a,b) => b[0].localeCompare(a[0]))

  if (months.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold px-1" style={{ color: 'var(--text-primary)' }}>ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂ¤ÃÂ ÃÂÃÂÃÂÃÂ©</h3>
      {months.map(([key, { label, invoices: invs }]) => {
        const totalRev  = invs.reduce((s,i) => s + (i.total     || 0), 0)
        const totalVat  = invs.reduce((s,i) => s + ((i.total - i.before_vat) || 0), 0)
        const totalPaid = invs.reduce((s,i) => s + (i.paid      || 0), 0)
        const totalRem  = totalRev - totalPaid
        const isOpen    = open === key

        return (
          <div key={key} className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {/* Header */}
            <button
              onClick={() => setOpen(isOpen ? null : key)}
              className="w-full flex items-center gap-4 px-5 py-4 text-right transition-colors hover:bg-black/5"
            >
              {/* Arrow */}
              <span className="flex-shrink-0 text-xs transition-transform duration-200" style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>Ã¢ÂÂ¶</span>

              {/* Month label */}
              <span className="font-semibold text-sm w-36 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{label}</span>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{invs.length} ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</span>

              {/* Summary pills */}
              <div className="flex-1 flex gap-3 justify-end flex-wrap">
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ÃÂ¡ÃÂ"ÃÂ</span>
                  <span className="text-xs font-bold" style={{ color: '#6366f1' }}>{fmt(totalRev)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ÃÂÃÂ¢"ÃÂ</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(totalVat)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ÃÂ©ÃÂÃÂÃÂ</span>
                  <span className="text-xs font-bold" style={{ color: '#10b981' }}>{fmt(totalPaid)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>ÃÂ ÃÂÃÂªÃÂ¨</span>
                  <span className="text-xs font-bold" style={{ color: totalRem > 0 ? '#f59e0b' : '#10b981' }}>{fmt(totalRem)}</span>
                </div>
              </div>
            </button>

            {/* Invoice rows */}
            {isOpen && (
              <div className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      {['ÃÂÃÂ¡ÃÂ³','ÃÂÃÂ§ÃÂÃÂ','ÃÂ¡ÃÂÃÂ','ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢"ÃÂ','ÃÂ¡ÃÂ"ÃÂ','ÃÂ©ÃÂÃÂÃÂ','ÃÂ ÃÂÃÂªÃÂ¨','ÃÂ¡ÃÂÃÂÃÂÃÂ¡'].map(h => (
                        <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invs.map((inv, i) => {
                      const rem = (inv.total || 0) - (inv.paid || 0)
                      const status = rem <= 0 ? 'paid' : inv.paid > 0 ? 'partial' : 'unpaid'
                      const statusLabel = { paid: 'ÃÂ©ÃÂÃÂÃÂ', partial: 'ÃÂÃÂÃÂ§ÃÂ', unpaid: 'ÃÂÃÂÃÂªÃÂÃÂ' }[status]
                      const statusStyle = { paid: { bg: '#d1fae5', color: '#065f46' }, partial: { bg: '#fef3c7', color: '#92400e' }, unpaid: { bg: '#fee2e2', color: '#991b1b' } }[status]
                      return (
                        <tr key={inv.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_num}</td>
                          <td className="px-4 py-2.5 text-xs max-w-[160px] truncate" style={{ color: 'var(--text-primary)' }}>{inv.client || 'Ã¢ÂÂ'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.doc_type || 'Ã¢ÂÂ'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{fmt(inv.before_vat)}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmt(inv.total)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: '#10b981' }}>{fmt(inv.paid)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: rem > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{fmt(rem)}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusLabel}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Helper type for dashboard (subset of InvoiceRow)
interface FinDashInvoice { id: number; invoice_num: string; date: string; before_vat: number; total: number; paid: number; client: string; doc_type: string }

// Ã¢ÂÂÃ¢ÂÂ Shared types + helpers Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
interface InvoiceRow {
  id: number
  client_id: number | null
  project_id: string | null
  issued_by: string
  sent_to: string
  date: string
  doc_type: string
  invoice_num: string
  client: string
  before_vat: number
  total: number
  paid: number
  payment_date: string
  notes: string
}

const STATUS_LABEL: Record<string, string> = { paid: 'ÃÂ©ÃÂÃÂÃÂ', partial: 'ÃÂÃÂÃÂ§ÃÂ', unpaid: 'ÃÂÃÂÃÂªÃÂÃÂ' }
const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-600',
}

function roundCents(n: number) { return Math.round(n * 100) / 100 }
function invoiceStatus(inv: InvoiceRow): 'paid' | 'partial' | 'unpaid' {
  const remaining = roundCents(inv.total - inv.paid)
  if (inv.total > 0 && remaining < 1) return 'paid'
  if (inv.paid > 0) return 'partial'
  return 'unpaid'
}

// Ã¢ÂÂÃ¢ÂÂ ClientPicker Ã¢ÂÂ searchable dropdown for inline client reassignment Ã¢ÂÂÃ¢ÂÂ
function ClientPicker({ clientList, currentClientId, onSave, onClose }: {
  clientList: ClientRecord[]
  currentClientId: number | null
  onSave: (client: ClientRecord) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState<ClientRecord | null>(
    currentClientId ? clientList.find(c => c.id === currentClientId) ?? null : null
  )
  const matches = clientList.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="absolute z-50 right-0 top-full mt-1 w-72 bg-white border border-indigo-200 rounded-2xl shadow-2xl p-3 space-y-2" dir="rtl">
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="ÃÂÃÂ¤ÃÂ© ÃÂÃÂ§ÃÂÃÂ..."
        className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <ul className="max-h-52 overflow-y-auto space-y-0.5">
        {matches.length === 0 && <li className="text-xs text-gray-400 text-center py-3">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂªÃÂÃÂ¦ÃÂÃÂÃÂª</li>}
        {matches.map(c => (
          <li
            key={c.id}
            onClick={() => setChosen(c)}
            className={`px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-colors ${chosen?.id === c.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            {c.name}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => { if (chosen) onSave(chosen) }}
          disabled={!chosen}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
        >
          ÃÂ©ÃÂÃÂÃÂ¨
        </button>
        <button onClick={onClose} className="flex-1 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ÃÂÃÂÃÂÃÂÃÂ</button>
      </div>
    </div>
  )
}


// Ã¢ÂÂÃ¢ÂÂ ProjectPicker Ã¢ÂÂ inline project assignment dropdown Ã¢ÂÂÃ¢ÂÂ
function ProjectPicker({ projectList, currentProjectId, onSave, onClose }: {
  projectList: { id: string; name: string; category: string }[]
  currentProjectId: string | null
  onSave: (projectId: string | null, projectName: string | null) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [chosen, setChosen] = useState<string | null>(currentProjectId)
  const filtered = projectList.filter(p => p.name.toLowerCase().includes(q.toLowerCase()))
  const artists = filtered.filter(p => p.category === 'artist')
  const productions = filtered.filter(p => p.category === 'production')
  return (
    <div className="absolute z-50 right-0 top-full mt-1 w-60 bg-white border border-indigo-200 rounded-2xl shadow-2xl p-3 space-y-2" dir="rtl">
      <input
        autoFocus
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="ÃÂÃÂ¤ÃÂ© ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ..."
        className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <ul className="max-h-56 overflow-y-auto space-y-0.5">
        <li
          onClick={() => setChosen(null)}
          className={`px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors italic ${chosen === null ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-400'}`}
        >ÃÂÃÂÃÂ ÃÂ©ÃÂÃÂÃÂ</li>
        {artists.length > 0 && <li className="px-3 pt-2 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wide">ÃÂÃÂÃÂÃÂ ÃÂÃÂ</li>}
        {artists.map(p => (
          <li key={p.id} onClick={() => setChosen(p.id)}
            className={`px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-colors ${chosen === p.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
            {p.name}
          </li>
        ))}
        {productions.length > 0 && <li className="px-3 pt-2 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wide">ÃÂÃÂ¤ÃÂ§ÃÂÃÂª</li>}
        {productions.map(p => (
          <li key={p.id} onClick={() => setChosen(p.id)}
            className={`px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-colors ${chosen === p.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
            {p.name}
          </li>
        ))}
        {filtered.length === 0 && <li className="text-xs text-gray-400 text-center py-3">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂªÃÂÃÂ¦ÃÂÃÂÃÂª</li>}
      </ul>
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => {
            const proj = projectList.find(p => p.id === chosen)
            onSave(chosen, proj?.name || null)
          }}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
          style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}
        >ÃÂ©ÃÂÃÂÃÂ¨</button>
        <button onClick={onClose} className="flex-1 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ÃÂÃÂÃÂÃÂÃÂ</button>
      </div>
    </div>
  )
}
const EMPTY_FORM: Omit<InvoiceRow, 'id'> = {
  client_id: null, project_id: null, issued_by: '', sent_to: '', date: '', doc_type: '',
  invoice_num: '', client: '', before_vat: 0, total: 0, paid: 0, payment_date: '', notes: '',
}

type InvoiceForm = Omit<InvoiceRow, 'id'>

// Ã¢ÂÂÃ¢ÂÂ ModalField Ã¢ÂÂ defined OUTSIDE InvoiceModal so it never remounts on re-render Ã¢ÂÂÃ¢ÂÂ
function ModalField({ label, value, onChange, type = 'text', placeholder = '' }: {
  label: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
      />
    </div>
  )
}

// Date helpers: "D.M.YY" or "D.M" Ã¢ÂÂ "YYYY-MM-DD"
function israeliToISO(d: string): string {
  if (!d) return ''
  const parts = d.split('.')
  if (parts.length < 2) return ''
  const day = parts[0].padStart(2, '0')
  const month = parts[1].padStart(2, '0')
  let year: string
  if (parts.length >= 3 && parts[2]) {
    year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
  } else {
    // No year supplied Ã¢ÂÂ infer: if the date would be >30 days in the future, use prev year
    const now = new Date()
    const currYear = now.getFullYear()
    const testDate = new Date(`${currYear}-${month}-${day}`)
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    year = testDate > thirtyDaysLater ? String(currYear - 1) : String(currYear)
  }
  return `${year}-${month}-${day}`
}
function isoToIsraeli(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${parseInt(day)}.${parseInt(month)}.${year}`
}

function formatDateFull(d: string): string {
  if (!d) return 'Ã¢ÂÂ'
  const iso = israeliToISO(d)
  if (!iso) return d
  const [year, month, day] = iso.split('-')
  return `${parseInt(day)}.${parseInt(month)}.${year}`
}

// Ã¢ÂÂÃ¢ÂÂ InvoiceModal Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function InvoiceModal({
  initial, onSave, onClose, saving, clientOptions = [], clientList = [], projectList = [],
}: {
  initial: InvoiceForm
  onSave: (data: InvoiceForm) => void
  onClose: () => void
  saving: boolean
  clientOptions?: string[]
  clientList?: ClientRecord[]
  projectList?: { id: string; name: string; category: string }[]
}) {
  const [form, setForm] = useState<InvoiceForm>(initial)
  const [clientQuery, setClientQuery] = useState(initial.client || '')
  const [clientOpen, setClientOpen] = useState(false)

  const set = (k: keyof InvoiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = ['before_vat','total','paid'].includes(k) ? Number(e.target.value) || 0 : e.target.value
    setForm(f => ({ ...f, [k]: v }))
  }

  const filteredClients = clientOptions.filter(c =>
    c.toLowerCase().includes(clientQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{(initial as InvoiceRow).id ? 'ÃÂ¢ÃÂ¨ÃÂÃÂÃÂª ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª' : 'ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª ÃÂÃÂÃÂ©ÃÂ'}</h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Client autocomplete */}
          <div className="relative">
            <label className="block text-xs text-gray-400 mb-1">ÃÂÃÂ§ÃÂÃÂ *</label>
            <input
              type="text"
              value={clientQuery}
              onChange={e => {
                setClientQuery(e.target.value)
                setForm(f => ({ ...f, client: e.target.value }))
                setClientOpen(true)
              }}
              onFocus={() => setClientOpen(true)}
              onBlur={() => setTimeout(() => setClientOpen(false), 150)}
              placeholder="ÃÂÃÂ§ÃÂÃÂ ÃÂÃÂ ÃÂÃÂÃÂ¨ ÃÂÃÂ§ÃÂÃÂ..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
            {clientOpen && filteredClients.length > 0 && (
              <ul className="absolute z-50 right-0 left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto text-sm">
                {filteredClients.map(c => (
                  <li
                    key={c}
                    onMouseDown={() => {
                      const match = clientList.find(cl => cl.name === c)
                      setClientQuery(c)
                      setForm(f => ({ ...f, client: c, client_id: match?.id ?? null }))
                      setClientOpen(false)
                    }}
                    className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors ${form.client === c ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-gray-800'}`}
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ModalField label="ÃÂÃÂ¡' ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª" value={form.invoice_num} onChange={set('invoice_num')} placeholder="20001" />

          {/* Date picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂªÃÂÃÂ¨ÃÂÃÂ</label>
            <input
              type="date"
              value={israeliToISO(form.date)}
              onChange={e => setForm(f => ({ ...f, date: isoToIsraeli(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂ¡ÃÂÃÂ ÃÂÃÂ¡ÃÂÃÂ</label>
            <select value={form.doc_type} onChange={set('doc_type')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Ã¢ÂÂ ÃÂÃÂÃÂ¨ Ã¢ÂÂ</option>
              {['ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª ÃÂÃÂ¡','ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂ¢ÃÂ¡ÃÂ§ÃÂ','ÃÂ§ÃÂÃÂÃÂ','ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª ÃÂÃÂ¡ ÃÂ§ÃÂÃÂÃÂ','ÃÂÃÂÃÂÃÂ ÃÂ'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* issued_by Ã¢ÂÂ employee select */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂ</label>
            <select value={form.issued_by} onChange={set('issued_by')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Ã¢ÂÂ ÃÂÃÂÃÂ¨ Ã¢ÂÂ</option>
              {['ÃÂÃÂÃÂÃÂÃÂ','ÃÂÃÂ','ÃÂÃÂ¢ÃÂÃÂ'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {/* sent_to Ã¢ÂÂ employee select */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂÃÂ ÃÂ©ÃÂÃÂ ÃÂÃÂÃÂ§ÃÂÃÂ</label>
            <select value={form.sent_to} onChange={set('sent_to')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">Ã¢ÂÂ ÃÂÃÂÃÂ¨ Ã¢ÂÂ</option>
              {['ÃÂÃÂÃÂÃÂÃÂ','ÃÂÃÂ','ÃÂÃÂ¢ÃÂÃÂ'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <ModalField label='ÃÂ¡ÃÂÃÂÃÂ ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢"ÃÂ Ã¢ÂÂª' value={form.before_vat} onChange={set('before_vat')} type="number" />

          {/* payment_date picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂªÃÂÃÂ¨ÃÂÃÂ ÃÂªÃÂ©ÃÂÃÂÃÂ</label>
            <input
              type="date"
              value={israeliToISO(form.payment_date)}
              onChange={e => setForm(f => ({ ...f, payment_date: isoToIsraeli(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
        </div>

        {/* Project assignment */}
        {projectList.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂ©ÃÂÃÂÃÂ ÃÂÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ</label>
            <select
              value={form.project_id || ''}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value || null }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">Ã¢ÂÂ ÃÂÃÂÃÂ ÃÂ©ÃÂÃÂÃÂ Ã¢ÂÂ</option>
              {['artist','production'].map(cat => {
                const items = projectList.filter(p => p.category === cat)
                if (!items.length) return null
                return (
                  <optgroup key={cat} label={cat === 'artist' ? 'ÃÂÃÂÃÂÃÂ ÃÂÃÂ' : 'ÃÂÃÂ¤ÃÂ§ÃÂÃÂª'}>
                    {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">ÃÂÃÂ¢ÃÂ¨ÃÂÃÂª</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none" />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.client}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            {saving ? 'ÃÂ©ÃÂÃÂÃÂ¨...' : 'ÃÂ©ÃÂÃÂÃÂ¨'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            ÃÂÃÂÃÂÃÂÃÂ
          </button>
        </div>
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ InvoicesTab Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function InvoicesTab() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [clientList, setClientList] = useState<ClientRecord[]>([])
  const [projectList, setProjectList] = useState<{ id: string; name: string; category: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProject, setFilterProject] = useState<string>('')
  const [modalInv, setModalInv] = useState<InvoiceRow | null | 'new'>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [reassignId, setReassignId] = useState<number | null>(null)
  const [reassignProjectId, setReassignProjectId] = useState<number | null>(null)
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [filterMonth, setFilterMonth] = useState<string>('')
const [filterYear, setFilterYear] = useState<string | null>(null)
    const [groupByMonth, setGroupByMonth] = useState(true)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [selectedYear, setSelectedYear] = useState<string>('2026')

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([invData, cliData, projData]) => {
      if (invData.error) setError(invData.error)
      else setInvoices(invData.invoices || [])
      if (!cliData.error) setClientList(cliData.clients || [])
      if (!projData.error) setProjectList(projData.projects || [])
    })
    .catch(() => setError('ÃÂ©ÃÂÃÂÃÂÃÂ ÃÂÃÂÃÂ¢ÃÂÃÂ ÃÂª ÃÂ ÃÂªÃÂÃÂ ÃÂÃÂ'))
    .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const clients = clientList.map(c => c.name).sort()
  const docTypes = [...new Set(invoices.map(i => i.doc_type).filter(Boolean))].sort()

  // Build sorted month list from invoices
  const monthMap: Record<string, { key: string; label: string; count: number }> = {}
  invoices.forEach(inv => {
    if (!inv.date) return
    const d = new Date(israeliToISO(inv.date))
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const label = `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`
    if (!monthMap[key]) monthMap[key] = { key, label, count: 0 }
    monthMap[key].count++
  })
  const availableMonths = Object.values(monthMap).sort((a,b) => b.key.localeCompare(a.key))

  // Available years from invoices
  const availableYears = [...new Set(invoices.map(inv => {
    if (!inv.date) return null
    const d = new Date(israeliToISO(inv.date))
    if (isNaN(d.getTime())) return null
    return String(d.getFullYear())
  }).filter(Boolean) as string[])].sort().reverse()

  // Months within the selected year
  const monthsForYear = availableMonths.filter(m => m.key.startsWith(selectedYear))

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const st = invoiceStatus(inv)
    const remaining = Math.max(0, roundCents(inv.total - inv.paid))
    const matchSearch = !q || inv.client.toLowerCase().includes(q) || inv.invoice_num.includes(q) || inv.issued_by.toLowerCase().includes(q)
    const matchPayment = paymentFilter === 'all' || (paymentFilter === 'open' && remaining > 0) || (paymentFilter === 'closed' && remaining === 0)
    const matchYear = !inv.date || israeliToISO(inv.date).startsWith(selectedYear)
    const matchMonth = !filterMonth || (inv.date && israeliToISO(inv.date).startsWith(filterMonth))
    return matchSearch
      && matchPayment
      && matchYear
      && matchMonth
      && (!filterClient || inv.client === filterClient)
      && (!filterDocType || inv.doc_type === filterDocType)
      && (!filterStatus || st === filterStatus)
      && (!filterProject || inv.project_id === filterProject)
  })

  const totalAmount    = filtered.reduce((s, i) => s + i.total, 0)
  const totalBeforeVat = filtered.reduce((s, i) => s + (i.before_vat || 0), 0)
  const totalPaid      = filtered.reduce((s, i) => s + i.paid, 0)
  const totalRemaining = filtered.reduce((s, i) => s + Math.max(0, roundCents(i.total - i.paid)), 0)
  const fmt = (n: number) => n ? `Ã¢ÂÂª${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : 'Ã¢ÂÂ'

  async function handleSave(form: InvoiceForm) {
    setSaving(true)
    if (modalInv === 'new') {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!data.error) setInvoices(prev => [data, ...prev])
    } else if (modalInv) {
      const res = await fetch(`/api/invoices/${modalInv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!data.error) setInvoices(prev => prev.map(i => i.id === data.id ? data : i))
    }
    setSaving(false)
    setModalInv(null)
  }

  async function handleDelete(id: number) {
    await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    setInvoices(prev => prev.filter(i => i.id !== id))
    setDeleteId(null)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-gray-400 text-sm">ÃÂÃÂÃÂ¢ÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª...</div></div>
  if (error) return <div className="flex-1 flex items-center justify-center"><div className="text-red-500 text-sm">{error}</div></div>

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-800">ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</h2>
          <p className="text-xs text-gray-400 mt-0.5">{invoices.length} ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂ¡ÃÂ"ÃÂ</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Group by month toggle */}
          <button
            onClick={() => setGroupByMonth(g => !g)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${groupByMonth ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            ÃÂÃÂ¤ÃÂ ÃÂÃÂÃÂÃÂ©
          </button>
          <button
            onClick={() => setModalInv('new')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:scale-105 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            ÃÂÃÂÃÂ ÃÂª ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª ÃÂÃÂÃÂ©ÃÂ
          </button>
        </div>
      </div>

      {/* Open / Closed tabs */}
      <div className="flex gap-1 flex-shrink-0 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'all', label: 'ÃÂÃÂÃÂ', count: invoices.length },
          { key: 'open', label: 'ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂª', count: invoices.filter(inv => Math.max(0, roundCents(inv.total - inv.paid)) > 0).length },
          { key: 'closed', label: 'ÃÂ¡ÃÂÃÂÃÂ¨ÃÂÃÂª', count: invoices.filter(inv => Math.max(0, roundCents(inv.total - inv.paid)) === 0).length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setPaymentFilter(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${paymentFilter === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label} <span className={`text-xs font-normal ml-1 ${paymentFilter === key ? 'text-indigo-500' : 'text-gray-400'}`}>({count})</span>
          </button>
        ))}
      </div>

      {/* Year tabs */}
      <div className="flex gap-1 flex-shrink-0 bg-gray-100 rounded-xl p-1 w-fit">
        {(['2026', '2025'] as const).map(yr => {
          const cnt = invoices.filter(inv => inv.date && israeliToISO(inv.date).startsWith(yr)).length
          return (
            <button
              key={yr}
              onClick={() => { setSelectedYear(yr); setFilterMonth('') }}
              className={`px-6 py-1.5 rounded-lg text-sm font-semibold transition-all ${selectedYear === yr ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {yr} <span className={`text-xs font-normal ml-1 ${selectedYear === yr ? 'text-indigo-500' : 'text-gray-400'}`}>({cnt})</span>
            </button>
          )
        })}
      </div>

      {/* Month sub-tabs for selected year */}
      {monthsForYear.length > 0 && (
        <div className="flex gap-2 flex-shrink-0 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          <button
            onClick={() => setFilterMonth('')}
            className={`flex-shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${!filterMonth ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
          >
            כל {selectedYear}
          </button>
          {monthsForYear.map(m => (
            <button
              key={m.key}
              onClick={() => setFilterMonth(filterMonth === m.key ? '' : m.key)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${filterMonth === m.key ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              {m.label.replace(` ${selectedYear}`, '')}
              <span className={`text-xs font-normal ${filterMonth === m.key ? 'text-indigo-200' : 'text-gray-400'}`}>({m.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 flex-shrink-0">
        {[
          { label: 'ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂÃÂ¦ÃÂÃÂÃÂª', value: filtered.length, color: '#6366f1' },
          { label: 'ÃÂ¡ÃÂÃÂÃÂ ÃÂÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª', value: fmt(totalBeforeVat), color: '#64748b' },
          { label: 'ÃÂ¡ÃÂ"ÃÂ ÃÂÃÂªÃÂ©ÃÂÃÂÃÂ', value: fmt(totalAmount), color: '#3b82f6' },
          { label: 'ÃÂ©ÃÂÃÂÃÂ', value: fmt(totalPaid), color: '#10b981' },
          { label: 'ÃÂÃÂªÃÂ¨ÃÂ ÃÂÃÂÃÂÃÂÃÂ', value: fmt(totalRemaining), color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="ÃÂÃÂ¤ÃÂ© ÃÂÃÂ§ÃÂÃÂ, ÃÂÃÂ¡' ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª, ÃÂÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂ..." className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">ÃÂÃÂ ÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂª</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterDocType} onChange={e => setFilterDocType(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">ÃÂÃÂ ÃÂ¡ÃÂÃÂÃÂ ÃÂÃÂÃÂ¡ÃÂÃÂ</option>{docTypes.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">ÃÂÃÂ ÃÂÃÂ¡ÃÂÃÂÃÂÃÂ¡ÃÂÃÂ</option>
          <option value="paid">ÃÂ©ÃÂÃÂÃÂ</option><option value="partial">ÃÂÃÂÃÂ§ÃÂ</option><option value="unpaid">ÃÂÃÂÃÂªÃÂÃÂ</option>
        </select>
        {projectList.length > 0 && (
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
            <option value="">ÃÂÃÂ ÃÂÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂÃÂÃÂ</option>
            {['artist','production'].map(cat => { const items = projectList.filter(p => p.category === cat); if (!items.length) return null; return <optgroup key={cat} label={cat === 'artist' ? 'ÃÂÃÂÃÂÃÂ ÃÂÃÂ' : 'ÃÂÃÂ¤ÃÂ§ÃÂÃÂª'}>{items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup> })}
          </select>
        )}
      </div>

      {/* Table Ã¢ÂÂ flat or grouped by month */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white min-h-0">
        {!groupByMonth ? (
          /* Ã¢ÂÂÃ¢ÂÂ Flat list Ã¢ÂÂÃ¢ÂÂ */
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide sticky top-0">
                <th className="px-3 py-3 text-center font-semibold text-gray-400">#</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂ¡'</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂ§ÃÂÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂªÃÂÃÂ¨ÃÂÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂ¡ÃÂÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢"ÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂ¡ÃÂ"ÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂ©ÃÂÃÂÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂÃÂªÃÂ¨ÃÂ</th>
                <th className="px-4 py-3 text-right font-semibold">ÃÂª. ÃÂªÃÂ©ÃÂÃÂÃÂ</th>
                <th className="px-4 py-3 text-center font-semibold">ÃÂ¡ÃÂÃÂÃÂÃÂ¡</th>
                <th className="px-4 py-3 text-center font-semibold">ÃÂ¤ÃÂ¢ÃÂÃÂÃÂÃÂª</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</td></tr>
              ) : filtered.map((inv, i) => {
                const st = invoiceStatus(inv)
                const remaining = Math.max(0, roundCents(inv.total - inv.paid))
                return (
                  <tr key={inv.id} className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-3 text-center text-gray-400 text-xs font-mono select-none">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoice_num || 'Ã¢ÂÂ'}</td>
                    <td className="px-4 py-3 max-w-[200px] relative">
                      {reassignId === inv.id ? (
                        <ClientPicker clientList={clientList} currentClientId={inv.client_id}
                          onSave={async chosen => {
                            await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: chosen.id, client: chosen.name }) })
                            setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, client_id: chosen.id, client: chosen.name } : i))
                            setReassignId(null)
                          }}
                          onClose={() => setReassignId(null)}
                        />
                      ) : null}
                      <button onClick={() => setReassignId(reassignId === inv.id ? null : inv.id)} className={`text-right w-full truncate hover:text-indigo-600 transition-colors group flex items-center gap-1 ${inv.client_id ? 'font-semibold text-gray-800' : 'text-amber-500 font-medium'}`} title="ÃÂÃÂÃÂ¥ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂ§ÃÂÃÂ">
                        <span className="truncate">{inv.client_id ? (inv.client || 'Ã¢ÂÂ') : 'Ã¢ÂÂ  ÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂÃÂ ÃÂÃÂ§ÃÂÃÂ'}</span>
                        <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs relative">
                      {reassignProjectId === inv.id ? (
                        <ProjectPicker
                          projectList={projectList}
                          currentProjectId={inv.project_id}
                          onSave={async (pid, _pname) => {
                            await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: pid }) })
                            setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, project_id: pid } : i))
                            setReassignProjectId(null)
                          }}
                          onClose={() => setReassignProjectId(null)}
                        />
                      ) : null}
                      {inv.project_id ? (
                        <button
                          onClick={() => setReassignProjectId(reassignProjectId === inv.id ? null : inv.id)}
                          className="text-indigo-600 font-medium hover:text-indigo-800 truncate max-w-[120px] block"
                          title={projectList.find(p => p.id === inv.project_id)?.name || ''}
                        >
                          {projectList.find(p => p.id === inv.project_id)?.name || 'Ã¢ÂÂ'}
                        </button>
                      ) : (
                        <button onClick={() => setReassignProjectId(reassignProjectId === inv.id ? null : inv.id)} className="text-gray-300 hover:text-indigo-400 transition-colors text-xs" title="ÃÂ©ÃÂÃÂÃÂ ÃÂÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ">+ ÃÂ©ÃÂÃÂÃÂ</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.date)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{inv.doc_type || 'Ã¢ÂÂ'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{inv.issued_by || 'Ã¢ÂÂ'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmt(inv.before_vat)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                    <td className="px-4 py-3">{remaining > 0 ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span> : <span className="text-gray-300">Ã¢ÂÂ</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.payment_date)}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => setModalInv(inv)} title="ÃÂ¢ÃÂ¨ÃÂÃÂÃÂ" className="p-1 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteId(inv.id)} title="ÃÂÃÂÃÂÃÂ§ÃÂ" className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold sticky bottom-0">
                  <td colSpan={7} className="px-4 py-3 text-xs text-gray-500 uppercase">ÃÂ¡ÃÂ"ÃÂ ({filtered.length})</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(filtered.reduce((s, i) => s + i.before_vat, 0))}</td>
                  <td className="px-4 py-3 text-gray-800">{fmt(totalAmount)}</td>
                  <td className="px-4 py-3 text-emerald-600">{fmt(totalPaid)}</td>
                  <td className="px-4 py-3 text-red-500">{fmt(totalRemaining)}</td>
                  <td /><td />
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          /* Ã¢ÂÂÃ¢ÂÂ Grouped by month Ã¢ÂÂÃ¢ÂÂ */
          (() => {
            // Build month groups from filtered
            const mGroups: Record<string, { key: string; label: string; rows: InvoiceRow[] }> = {}
            filtered.forEach(inv => {
              if (!inv.date) return
              const d = new Date(israeliToISO(inv.date))
              if (isNaN(d.getTime())) return
              const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
              const label = `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`
              if (!mGroups[key]) mGroups[key] = { key, label, rows: [] }
              mGroups[key].rows.push(inv)
            })
            const groups = Object.values(mGroups).sort((a,b) => a.key.localeCompare(b.key))
            const COLS = 14
            const TH = 'px-4 py-3 text-right font-semibold'

            return (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide sticky top-0">
                    <th className="px-3 py-3 w-8" />
                    <th className={TH}>ÃÂÃÂ¡'</th>
                    <th className={TH}>ÃÂÃÂ§ÃÂÃÂ</th>
                    <th className={TH}>ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ</th>
                    <th className={TH}>ÃÂªÃÂÃÂ¨ÃÂÃÂ</th>
                    <th className={TH}>ÃÂ¡ÃÂÃÂ</th>
                    <th className={TH}>ÃÂÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂ</th>
                    <th className={TH}>ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢"ÃÂ</th>
                    <th className={TH}>ÃÂ¡ÃÂ"ÃÂ</th>
                    <th className={TH}>ÃÂ©ÃÂÃÂÃÂ</th>
                    <th className={TH}>ÃÂÃÂªÃÂ¨ÃÂ</th>
                    <th className={TH}>ÃÂª. ÃÂªÃÂ©ÃÂÃÂÃÂ</th>
                    <th className="px-4 py-3 text-center font-semibold">ÃÂ¡ÃÂÃÂÃÂÃÂ¡</th>
                    <th className="px-4 py-3 text-center font-semibold">ÃÂ¤ÃÂ¢ÃÂÃÂÃÂÃÂª</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.length === 0 ? (
                    <tr><td colSpan={COLS} className="text-center py-12 text-gray-400">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</td></tr>
                  ) : groups.map(group => {
                    const isCollapsed = collapsedMonths.has(group.key)
                    const mTotal = group.rows.reduce((s,i) => s+i.total, 0)
                    const mPaid  = group.rows.reduce((s,i) => s+i.paid,  0)
                    const mRem   = Math.max(0, mTotal - mPaid)
                    const mOpen  = group.rows.filter(i => Math.max(0, roundCents(i.total-i.paid)) > 0).length

                    return (
                      <Fragment key={group.key}>
                        {/* Month header row */}
                        <tr
                          className="cursor-pointer select-none"
                          style={{ background: 'linear-gradient(to left, #eef2ff, #f5f3ff)', borderTop: '2px solid #c7d2fe', borderBottom: '1px solid #c7d2fe' }}
                          onClick={() => setCollapsedMonths(prev => {
                            const next = new Set(prev)
                            next.has(group.key) ? next.delete(group.key) : next.add(group.key)
                            return next
                          })}
                        >
                          <td className="px-3 py-3 text-center">
                            <span className="text-indigo-400 text-xs transition-transform inline-block" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>Ã¢ÂÂ¶</span>
                          </td>
                          <td colSpan={2} className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-indigo-700 text-sm">{group.label}</span>
                            <span className="mr-2 text-xs text-indigo-400">({group.rows.length} ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª)</span>
                            {mOpen > 0 && <span className="mr-1 text-xs text-red-400">{mOpen} ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂª</span>}
                          </td>
                          <td colSpan={6} />
                          <td className="px-4 py-3 text-xs font-bold text-indigo-600">{fmt(mTotal)}</td>
                          <td className="px-4 py-3 text-xs font-bold text-emerald-600">{fmt(mPaid)}</td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: mRem > 0 ? '#f59e0b' : '#10b981' }}>{mRem > 0 ? fmt(mRem) : 'Ã¢ÂÂ'}</td>
                          <td colSpan={2} />
                        </tr>

                        {/* Invoice rows for this month */}
                        {!isCollapsed && group.rows.map((inv, i) => {
                          const st = invoiceStatus(inv)
                          const remaining = Math.max(0, roundCents(inv.total - inv.paid))
                          return (
                            <tr key={inv.id} className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                              <td className="px-3 py-2.5 text-center text-gray-300 text-xs font-mono">{i + 1}</td>
                              <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{inv.invoice_num || 'Ã¢ÂÂ'}</td>
                              <td className="px-4 py-2.5 max-w-[180px] relative">
                                {reassignId === inv.id ? (
                                  <ClientPicker clientList={clientList} currentClientId={inv.client_id}
                                    onSave={async chosen => {
                                      await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: chosen.id, client: chosen.name }) })
                                      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, client_id: chosen.id, client: chosen.name } : i))
                                      setReassignId(null)
                                    }}
                                    onClose={() => setReassignId(null)}
                                  />
                                ) : null}
                                <button onClick={() => setReassignId(reassignId === inv.id ? null : inv.id)} className={`text-right w-full truncate hover:text-indigo-600 group flex items-center gap-1 text-xs ${inv.client_id ? 'font-semibold text-gray-800' : 'text-amber-500'}`}>
                                  <span className="truncate">{inv.client_id ? (inv.client || 'Ã¢ÂÂ') : 'Ã¢ÂÂ  ÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂÃÂ'}</span>
                                  <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-xs relative">
                                {reassignProjectId === inv.id ? (
                                  <ProjectPicker
                                    projectList={projectList}
                                    currentProjectId={inv.project_id}
                                    onSave={async (pid, _pname) => {
                                      await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: pid }) })
                                      setInvoices(prev => prev.map(x => x.id === inv.id ? { ...x, project_id: pid } : x))
                                      setReassignProjectId(null)
                                    }}
                                    onClose={() => setReassignProjectId(null)}
                                  />
                                ) : null}
                                {inv.project_id ? (
                                  <button
                                    onClick={() => setReassignProjectId(reassignProjectId === inv.id ? null : inv.id)}
                                    className="text-indigo-600 font-medium hover:text-indigo-800 truncate max-w-[120px] block text-xs"
                                    title={projectList.find(p => p.id === inv.project_id)?.name || ''}
                                  >{projectList.find(p => p.id === inv.project_id)?.name || 'Ã¢ÂÂ'}</button>
                                ) : (
                                  <button onClick={() => setReassignProjectId(reassignProjectId === inv.id ? null : inv.id)} className="text-gray-300 hover:text-indigo-400 transition-colors text-xs">+ ÃÂ©ÃÂÃÂÃÂ</button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.date)}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">{inv.doc_type || 'Ã¢ÂÂ'}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[100px] truncate">{inv.issued_by || 'Ã¢ÂÂ'}</td>
                              <td className="px-4 py-2.5 text-gray-600 text-xs">{fmt(inv.before_vat)}</td>
                              <td className="px-4 py-2.5 font-semibold text-gray-800 text-xs">{fmt(inv.total)}</td>
                              <td className="px-4 py-2.5 text-emerald-600 text-xs">{fmt(inv.paid)}</td>
                              <td className="px-4 py-2.5 text-xs">{remaining > 0 ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span> : <span className="text-gray-300">Ã¢ÂÂ</span>}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.payment_date)}</td>
                              <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span></td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1 justify-center">
                                  <button onClick={() => setModalInv(inv)} className="p-1 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => setDeleteId(inv.id)} className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold sticky bottom-0">
                    <td colSpan={9} className="px-4 py-3 text-xs text-gray-500 uppercase">ÃÂ¡ÃÂ"ÃÂ ({filtered.length})</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{fmt(filtered.reduce((s,i) => s+i.before_vat,0))}</td>
                    <td className="px-4 py-3 text-gray-800 text-xs">{fmt(totalAmount)}</td>
                    <td className="px-4 py-3 text-emerald-600 text-xs">{fmt(totalPaid)}</td>
                    <td className="px-4 py-3 text-red-500 text-xs">{fmt(totalRemaining)}</td>
                    <td /><td />
                  </tr>
                </tfoot>
              </table>
            )
          })()
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalInv !== null && (
        <InvoiceModal
          initial={modalInv === 'new' ? EMPTY_FORM : { ...modalInv }}
          clientOptions={clients}
          clientList={clientList}
          projectList={projectList}
          onSave={handleSave}
          onClose={() => setModalInv(null)}
          saving={saving}
        />
      )}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <p className="font-semibold text-gray-800">ÃÂÃÂÃÂÃÂÃÂ§ ÃÂÃÂª ÃÂÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª?</p>
            <p className="text-sm text-gray-500">ÃÂ¤ÃÂ¢ÃÂÃÂÃÂ ÃÂÃÂ ÃÂÃÂÃÂ ÃÂ ÃÂ ÃÂÃÂªÃÂ ÃÂª ÃÂÃÂÃÂÃÂÃÂÃÂ</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">ÃÂÃÂÃÂ§</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">ÃÂÃÂÃÂÃÂÃÂ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Client types Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
interface ClientRecord {
  id: number
  name: string
  tax_id: string
  tax_status: string
  contact_name: string
  contact_email: string
  notes: string
  invoiceCount: number
  totalAmount: number
  paidAmount: number
}

const EMPTY_CLIENT: Omit<ClientRecord, 'id' | 'invoiceCount' | 'totalAmount' | 'paidAmount'> = {
  name: '', tax_id: '', tax_status: 'ÃÂÃÂÃÂ¨ÃÂ©ÃÂ', contact_name: '', contact_email: '', notes: ''
}

function ClientModal({ initial, onSave, onClose, saving }: {
  initial: Omit<ClientRecord, 'id' | 'invoiceCount' | 'totalAmount' | 'paidAmount'>
  onSave: (data: typeof initial) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(initial)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{(initial as ClientRecord).id ? 'ÃÂ¢ÃÂ¨ÃÂÃÂÃÂª ÃÂÃÂ§ÃÂÃÂ' : 'ÃÂÃÂ§ÃÂÃÂ ÃÂÃÂÃÂ©'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂ©ÃÂ ÃÂÃÂ§ÃÂÃÂ *</label>
            <input value={form.name} onChange={s('name')} placeholder="ÃÂ©ÃÂ ÃÂÃÂÃÂÃÂ¨ÃÂ / ÃÂÃÂÃÂ" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">ÃÂ.ÃÂ¤ / ÃÂ¢.ÃÂ / ÃÂ¢.ÃÂ¤</label>
              <input value={form.tax_id} onChange={s('tax_id')} placeholder="ÃÂÃÂ¡ÃÂ¤ÃÂ¨ ÃÂ¢ÃÂÃÂ¡ÃÂ§" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">ÃÂ¡ÃÂÃÂÃÂÃÂ¡ ÃÂÃÂ¨ÃÂ©ÃÂÃÂÃÂÃÂª</label>
              <select value={form.tax_status} onChange={s('tax_status')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="ÃÂÃÂÃÂ¨ÃÂ©ÃÂ">ÃÂÃÂÃÂ¨ÃÂ©ÃÂ</option>
                <option value="ÃÂ¤ÃÂÃÂÃÂ¨">ÃÂ¤ÃÂÃÂÃÂ¨</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂÃÂÃÂ© ÃÂ§ÃÂ©ÃÂ¨ ÃÂÃÂ ÃÂ&quot;ÃÂ</label>
            <input value={form.contact_name} onChange={s('contact_name')} placeholder="ÃÂ©ÃÂ ÃÂÃÂÃÂ© ÃÂÃÂ§ÃÂ©ÃÂ¨" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email ÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª</label>
            <input type="email" value={form.contact_email} onChange={s('contact_email')} placeholder="accounting@company.com" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">ÃÂÃÂ¢ÃÂ¨ÃÂÃÂª</label>
            <textarea value={form.notes} onChange={s('notes')} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => onSave(form)} disabled={saving || !form.name}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
            {saving ? 'ÃÂ©ÃÂÃÂÃÂ¨...' : 'ÃÂ©ÃÂÃÂÃÂ¨'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">ÃÂÃÂÃÂÃÂÃÂ</button>
        </div>
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ Charts Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function DonutChart({ paid, remaining, size = 120 }: { paid: number; remaining: number; size?: number }) {
  const total = paid + remaining
  if (total === 0) return <div className="w-[120px] h-[120px] rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">ÃÂÃÂÃÂ ÃÂ ÃÂªÃÂÃÂ ÃÂÃÂ</div>
  const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.24
  const paidPct = paid / total
  const paidAngle = paidPct * 360

  function arc(startDeg: number, endDeg: number, outerR: number, innerR: number) {
    if (Math.abs(endDeg - startDeg) >= 359.99) endDeg = startDeg + 359.98
    const toRad = (d: number) => ((d - 90) * Math.PI) / 180
    const x1 = cx + outerR * Math.cos(toRad(startDeg)), y1 = cy + outerR * Math.sin(toRad(startDeg))
    const x2 = cx + outerR * Math.cos(toRad(endDeg)),   y2 = cy + outerR * Math.sin(toRad(endDeg))
    const x3 = cx + innerR * Math.cos(toRad(endDeg)),   y3 = cy + innerR * Math.sin(toRad(endDeg))
    const x4 = cx + innerR * Math.cos(toRad(startDeg)), y4 = cy + innerR * Math.sin(toRad(startDeg))
    const large = endDeg - startDeg > 180 ? 1 : 0
    return `M${x1},${y1} A${outerR},${outerR} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${innerR},${innerR} 0 ${large} 0 ${x4},${y4} Z`
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {remaining > 0 && <path d={arc(paidAngle, 360, r, inner)} fill="#fca5a5" />}
      {paid > 0      && <path d={arc(0, paidAngle, r, inner)} fill="#34d399" />}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize={size * 0.13} fontWeight="bold" fill="#1f2937">
        {Math.round(paidPct * 100)}%
      </text>
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.09} fill="#6b7280">ÃÂ©ÃÂÃÂÃÂ</text>
    </svg>
  )
}

function ClientsSnapshot({ clients, fmt }: { clients: ClientRecord[]; fmt: (n: number) => string }) {
  const totalAll      = clients.reduce((s, c) => s + c.totalAmount, 0)
  const totalPaid     = clients.reduce((s, c) => s + c.paidAmount, 0)
  const totalRemaining = Math.max(0, totalAll - totalPaid)
  const topClients    = [...clients].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 6)
  const maxAmount     = topClients[0]?.totalAmount || 1
  const openCount     = clients.filter(c => c.totalAmount - c.paidAmount > 0).length
  const closedCount   = clients.filter(c => c.totalAmount > 0 && c.totalAmount - c.paidAmount <= 0).length

  return (
    <div className="grid grid-cols-3 gap-4 flex-shrink-0">

      {/* Donut Ã¢ÂÂ ÃÂ©ÃÂÃÂÃÂ vs ÃÂÃÂªÃÂ¨ÃÂ */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex gap-4 items-center shadow-sm">
        <DonutChart paid={totalPaid} remaining={totalRemaining} size={110} />
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">ÃÂ©ÃÂÃÂÃÂ</div>
            <div className="text-sm font-bold text-emerald-600">{fmt(totalPaid)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">ÃÂÃÂªÃÂ¨ÃÂ ÃÂÃÂªÃÂ©ÃÂÃÂÃÂ</div>
            <div className="text-sm font-bold text-red-500">{fmt(totalRemaining)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">ÃÂ¡ÃÂÃÂ´ÃÂ</div>
            <div className="text-sm font-bold text-gray-700">{fmt(totalAll)}</div>
          </div>
        </div>
      </div>

      {/* Top clients bar chart */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ÃÂÃÂ§ÃÂÃÂÃÂÃÂª ÃÂÃÂÃÂÃÂÃÂÃÂÃÂ</div>
        <div className="space-y-2">
          {topClients.map(c => {
            const paidPct  = c.totalAmount > 0 ? (c.paidAmount / c.totalAmount) * 100 : 0
            const totalPct = (c.totalAmount / maxAmount) * 100
            return (
              <div key={c.id}>
                <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                  <span className="truncate max-w-[140px]">{c.name}</span>
                  <span className="font-mono text-gray-700">{fmt(c.totalAmount)}</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full relative" style={{ width: `${totalPct}%`, background: '#e5e7eb' }}>
                    <div className="absolute inset-y-0 right-0 rounded-full bg-emerald-400 transition-all" style={{ width: `${paidPct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />ÃÂ©ÃÂÃÂÃÂ</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />ÃÂ¡ÃÂÃÂ´ÃÂ</span>
        </div>
      </div>

      {/* Status breakdown donut + stats */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ÃÂ¡ÃÂÃÂÃÂÃÂ¡ ÃÂÃÂ§ÃÂÃÂÃÂÃÂª</div>
        <div className="flex gap-4 items-center mb-4">
          <DonutChart paid={closedCount} remaining={openCount} size={90} />
          <div className="space-y-2 flex-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />ÃÂ¡ÃÂÃÂÃÂ¨ÃÂÃÂ</span>
              <span className="font-bold text-emerald-600">{closedCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" />ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂ</span>
              <span className="font-bold text-red-500">{openCount}</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 border-t border-gray-100 pt-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>ÃÂÃÂÃÂÃÂ¦ÃÂ¢ ÃÂÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª</span>
            <span className="font-semibold text-gray-700">{clients.reduce((s,c)=>s+c.invoiceCount,0) > 0 ? fmt(totalAll / clients.reduce((s,c)=>s+c.invoiceCount,0)) : 'Ã¢ÂÂ'}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>ÃÂÃÂ§ÃÂÃÂÃÂÃÂª ÃÂ¤ÃÂ¢ÃÂÃÂÃÂÃÂ</span>
            <span className="font-semibold text-gray-700">{clients.filter(c=>c.invoiceCount>0).length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ LedgerDrawer Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function LedgerDrawer({ client, invoices, loading, onClose, fmt }: {
  client: ClientRecord
  invoices: InvoiceRow[]
  loading: boolean
  onClose: () => void
  fmt: (n: number) => string
}) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'open'>('all')

  const displayed = invoices.filter(inv => {
    const remaining = Math.max(0, roundCents(inv.total - inv.paid))
    if (filter === 'paid') return remaining === 0
    if (filter === 'open') return remaining > 0
    return true
  })

  const totalAll   = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid  = invoices.reduce((s, i) => s + i.paid,  0)
  const totalOpen  = Math.max(0, totalAll - totalPaid)

  const openCount  = invoices.filter(i => Math.max(0, roundCents(i.total - i.paid)) > 0).length
  const paidCount  = invoices.filter(i => Math.max(0, roundCents(i.total - i.paid)) === 0).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{client.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">ÃÂÃÂ¨ÃÂÃÂ¡ÃÂª ÃÂÃÂ§ÃÂÃÂ Ã¢ÂÂ {invoices.length} ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Summary stats */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3 flex-shrink-0 border-b border-gray-100">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
            <div className="text-lg font-bold text-gray-800">{fmt(totalAll)}</div>
            <div className="text-xs text-gray-400 mt-0.5">ÃÂ¡ÃÂÃÂ´ÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <div className="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</div>
            <div className="text-xs text-emerald-500 mt-0.5">ÃÂ©ÃÂÃÂÃÂ</div>
          </div>
          <div className={`rounded-xl px-4 py-3 text-center ${totalOpen > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <div className={`text-lg font-bold ${totalOpen > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {totalOpen > 0 ? fmt(totalOpen) : 'Ã¢ÂÂ ÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂ'}
            </div>
            <div className={`text-xs mt-0.5 ${totalOpen > 0 ? 'text-red-400' : 'text-emerald-400'}`}>ÃÂÃÂªÃÂ¨ÃÂ ÃÂÃÂªÃÂ©ÃÂÃÂÃÂ</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-6 py-3 flex gap-1 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: 'all',  label: 'ÃÂÃÂÃÂ',    count: invoices.length },
              { key: 'open', label: 'ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂª', count: openCount },
              { key: 'paid', label: 'ÃÂ©ÃÂÃÂÃÂ',   count: paidCount },
            ] as const).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filter === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {label}
                <span className={`text-xs font-normal mr-1.5 ${filter === key ? 'text-indigo-500' : 'text-gray-400'}`}>({count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">ÃÂÃÂÃÂ¢ÃÂ...</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">ÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂÃÂ¦ÃÂÃÂ</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0">
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs">
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂ¡ÃÂ³</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂªÃÂÃÂ¨ÃÂÃÂ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂ¡ÃÂÃÂ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢ÃÂ´ÃÂ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂ¡ÃÂÃÂ´ÃÂ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂ©ÃÂÃÂÃÂ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂªÃÂ¨ÃÂ</th>
                  <th className="px-3 py-2.5 text-center font-semibold">ÃÂ¡ÃÂÃÂÃÂÃÂ¡</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((inv, i) => {
                  const remaining = Math.max(0, roundCents(inv.total - inv.paid))
                  const isPaid = remaining === 0
                  return (
                    <tr key={inv.id} className={`border-b border-gray-100 transition-colors ${isPaid ? 'hover:bg-emerald-50/30' : 'hover:bg-red-50/30'} ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{inv.invoice_num || 'Ã¢ÂÂ'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{inv.date || 'Ã¢ÂÂ'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{inv.doc_type || 'Ã¢ÂÂ'}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{inv.issued_by || 'Ã¢ÂÂ'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{fmt(inv.before_vat)}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{fmt(inv.total)}</td>
                      <td className="px-3 py-2.5 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                      <td className="px-3 py-2.5">
                        {remaining > 0
                          ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span>
                          : <span className="text-gray-300 text-xs">Ã¢ÂÂ</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isPaid
                          ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">ÃÂ©ÃÂÃÂÃÂ</span>
                          : inv.paid > 0
                            ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">ÃÂÃÂÃÂ§ÃÂ</span>
                            : <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600">ÃÂÃÂÃÂªÃÂÃÂ</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-sm">
                  <td colSpan={4} className="px-3 py-2.5 text-xs text-gray-500 uppercase">ÃÂ¡ÃÂÃÂ´ÃÂ ({displayed.length})</td>
                  <td className="px-3 py-2.5 text-gray-600">{fmt(displayed.reduce((s, i) => s + i.before_vat, 0))}</td>
                  <td className="px-3 py-2.5 text-gray-800">{fmt(displayed.reduce((s, i) => s + i.total, 0))}</td>
                  <td className="px-3 py-2.5 text-emerald-600">{fmt(displayed.reduce((s, i) => s + i.paid, 0))}</td>
                  <td className="px-3 py-2.5 text-red-500">{fmt(displayed.reduce((s, i) => s + Math.max(0, roundCents(i.total - i.paid)), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function ClientsTab() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [modalClient, setModalClient] = useState<ClientRecord | 'new' | null>(null)
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'cards' | 'table'>('table')
  const [showCharts, setShowCharts] = useState(false)
  const [sortKey, setSortKey] = useState<'name' | 'invoiceCount' | 'totalAmount' | 'paidAmount' | 'remaining'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [invoiceCache, setInvoiceCache] = useState<Record<number, InvoiceRow[]>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [expandedFilter, setExpandedFilter] = useState<'all' | 'paid' | 'open'>('all')

  const load = () => {
    setLoading(true)
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setClients(d.clients || []) })
      .catch(() => setError('ÃÂ©ÃÂÃÂÃÂÃÂ ÃÂÃÂÃÂ¢ÃÂÃÂ ÃÂª ÃÂÃÂ§ÃÂÃÂÃÂÃÂª'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleExpand = (c: ClientRecord) => {
    if (expandedId === c.id) { setExpandedId(null); return }
    setExpandedId(c.id)
    setExpandedFilter('all')
    if (!invoiceCache[c.id]) {
      setLoadingId(c.id)
      fetch(`/api/invoices?client_id=${c.id}`)
        .then(r => r.json())
        .then(d => setInvoiceCache(prev => ({ ...prev, [c.id]: (d.invoices || []).filter((i: InvoiceRow) => i.client_id === c.id) })))
        .catch(() => setInvoiceCache(prev => ({ ...prev, [c.id]: [] })))
        .finally(() => setLoadingId(null))
    }
  }

  const handleSaveClient = async (data: typeof EMPTY_CLIENT) => {
    setSaving(true)
    try {
      const isEdit = modalClient !== 'new' && modalClient !== null
      const url = isEdit ? `/api/clients/${(modalClient as ClientRecord).id}` : '/api/clients'
      const method = isEdit ? 'PATCH' : 'POST'
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const json = await r.json()
      if (r.ok) {
        if (isEdit) {
          // Merge updated fields, keep existing computed stats
          const updated = json.client as ClientRecord
          setClients(prev => prev.map(c =>
            c.id === updated.id ? { ...c, ...updated } : c
          ))
        } else {
          // New client Ã¢ÂÂ add with zero stats
          const fresh = json as ClientRecord
          setClients(prev => [...prev, { ...fresh, invoiceCount: 0, totalAmount: 0, paidAmount: 0 }])
        }
        setModalClient(null)
      }
    } finally { setSaving(false) }
  }

  const handleDeleteClient = async (id: number) => {
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    setClients(prev => prev.filter(c => c.id !== id))
    setDeleteClientId(null)
  }

  const fmt = (n: number) => n ? `Ã¢ÂÂª${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : 'Ã¢ÂÂ'

  const PINNED_BOTTOM = ['ÃÂ¡ÃÂ"ÃÂ', 'ÃÂ¡ÃÂÃÂ', 'total', 'ÃÂ¡ÃÂÃÂ´ÃÂ']
  const isPinned = (name: string) => PINNED_BOTTOM.some(p => name.trim() === p)

  const filtered = clients
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Always pin certain names to the bottom regardless of sort direction
      const aPin = isPinned(a.name)
      const bPin = isPinned(b.name)
      if (aPin && !bPin) return 1
      if (!aPin && bPin) return -1
      if (aPin && bPin) return 0
      let av: string | number, bv: string | number
      if (sortKey === 'name') { av = a.name; bv = b.name }
      else if (sortKey === 'remaining') { av = Math.max(0, a.totalAmount - a.paidAmount); bv = Math.max(0, b.totalAmount - b.paidAmount) }
      else { av = a[sortKey] as number; bv = b[sortKey] as number }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const SortIcon = ({ col }: { col: typeof sortKey }) => (
    <span className={`mr-1 text-[10px] ${sortKey === col ? 'text-indigo-500' : 'text-gray-300'}`}>
      {sortKey === col ? (sortDir === 'asc' ? 'Ã¢ÂÂ' : 'Ã¢ÂÂ') : 'Ã¢ÂÂ'}
    </span>
  )
  const totalInvoices = clients.reduce((s, c) => s + c.invoiceCount, 0)
  const totalAmount   = clients.reduce((s, c) => s + c.totalAmount, 0)

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-gray-400 text-sm">ÃÂÃÂÃÂ¢ÃÂ ÃÂÃÂ§ÃÂÃÂÃÂÃÂª...</div></div>
  if (error)   return <div className="flex-1 flex items-center justify-center"><div className="text-red-500 text-sm">{error}</div></div>

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4" dir="rtl">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex gap-4">
          {[
            { label: 'ÃÂÃÂ§ÃÂÃÂÃÂÃÂª', value: clients.length, color: '#6366f1' },
            { label: 'ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª', value: totalInvoices, color: '#3b82f6' },
            { label: 'ÃÂ¡ÃÂÃÂ´ÃÂ', value: fmt(totalAmount), color: '#10b981' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm flex items-center gap-3">
              <span className="text-xl font-bold" style={{ color }}>{value}</span>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setModalClient('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          ÃÂÃÂÃÂ¡ÃÂ¤ÃÂª ÃÂÃÂ§ÃÂÃÂ
        </button>
      </div>

      {/* Charts snapshot Ã¢ÂÂ collapsible */}
      {clients.length > 0 && (
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowCharts(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors px-1 py-1 rounded-lg group"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${showCharts ? 'rotate-90' : 'rotate-0'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
            ÃÂªÃÂÃÂÃÂ ÃÂª ÃÂÃÂ¦ÃÂ
            <span className="text-gray-300 group-hover:text-indigo-300 font-normal">{showCharts ? 'ÃÂ¡ÃÂÃÂÃÂ¨' : 'ÃÂ¤ÃÂªÃÂ'}</span>
          </button>
          {showCharts && (
            <div className="mt-3">
              <ClientsSnapshot clients={clients} fmt={fmt} />
            </div>
          )}
        </div>
      )}

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ÃÂÃÂ¤ÃÂ© ÃÂÃÂ§ÃÂÃÂ..." className="flex-1 max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {/* Cards toggle */}
          <button onClick={() => setView('cards')} title="ÃÂªÃÂ¦ÃÂÃÂÃÂª ÃÂÃÂ¨ÃÂÃÂÃÂ¡ÃÂÃÂ"
            className={`px-3 py-2 transition-colors ${view === 'cards' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          {/* Table toggle */}
          <button onClick={() => setView('table')} title="ÃÂªÃÂ¦ÃÂÃÂÃÂª ÃÂÃÂÃÂÃÂ"
            className={`px-3 py-2 border-r border-gray-200 transition-colors ${view === 'table' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 6h18M3 14h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0">
        {view === 'cards' ? (
          /* Ã¢ÂÂÃ¢ÂÂ Cards grid Ã¢ÂÂÃ¢ÂÂ */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-gray-400">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ§ÃÂÃÂÃÂÃÂª</div>
            ) : filtered.map(c => {
              const remaining = c.totalAmount - c.paidAmount
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{c.name}</h3>
                        {c.tax_id && <p className="text-xs text-gray-400 mt-0.5">ÃÂ.ÃÂ¤: {c.tax_id}</p>}
                      </div>
                      <div className="flex gap-1 mr-2 flex-shrink-0">
                        {c.tax_status && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.tax_status === 'ÃÂÃÂÃÂ¨ÃÂ©ÃÂ' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {c.tax_status}
                          </span>
                        )}
                      </div>
                    </div>
                    {(c.contact_name || c.contact_email) && (
                      <div className="mt-2 space-y-0.5">
                        {c.contact_name && <p className="text-xs text-gray-500">Ã°ÂÂÂ¤ {c.contact_name}</p>}
                        {c.contact_email && <p className="text-xs text-gray-400" dir="ltr">{c.contact_email}</p>}
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-3 grid grid-cols-4 gap-2 text-center border-t border-gray-100">
                    <div>
                      <div className="text-sm font-bold text-indigo-600">{c.invoiceCount}</div>
                      <div className="text-[10px] text-gray-400">ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{fmt(c.totalAmount)}</div>
                      <div className="text-[10px] text-gray-400">ÃÂ¡ÃÂÃÂ´ÃÂ</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-600">{fmt(c.paidAmount)}</div>
                      <div className="text-[10px] text-gray-400">ÃÂ©ÃÂÃÂÃÂ</div>
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${remaining > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {remaining > 0 ? fmt(remaining) : 'Ã¢ÂÂ'}
                      </div>
                      <div className="text-[10px] text-gray-400">ÃÂÃÂªÃÂ¨ÃÂ</div>
                    </div>
                  </div>
                  <div className="px-5 pb-4 flex gap-2">
                    <button onClick={() => toggleExpand(c)} className="flex-1 py-1.5 rounded-xl text-xs font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">ÃÂÃÂ¨ÃÂÃÂ¡ÃÂª</button>
                    <button onClick={() => setModalClient(c)} className="flex-1 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">ÃÂ¢ÃÂ¨ÃÂÃÂÃÂ</button>
                    <button onClick={() => setDeleteClientId(c.id)} className="py-1.5 px-2.5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Ã¢ÂÂÃ¢ÂÂ Table view Ã¢ÂÂÃ¢ÂÂ */
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('name')}>ÃÂ©ÃÂ ÃÂÃÂ§ÃÂÃÂ <SortIcon col="name" /></th>
                  <th className="px-5 py-3 text-right font-semibold">ÃÂ.ÃÂ¤</th>
                  <th className="px-5 py-3 text-right font-semibold">ÃÂ¡ÃÂÃÂÃÂÃÂ¡</th>
                  <th className="px-5 py-3 text-right font-semibold">ÃÂÃÂÃÂ© ÃÂ§ÃÂ©ÃÂ¨</th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('invoiceCount')}>ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª <SortIcon col="invoiceCount" /></th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('totalAmount')}>ÃÂ¡ÃÂÃÂ´ÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª <SortIcon col="totalAmount" /></th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('paidAmount')}>ÃÂ©ÃÂÃÂÃÂ <SortIcon col="paidAmount" /></th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('remaining')}>ÃÂÃÂªÃÂ¨ÃÂ ÃÂÃÂªÃÂ©ÃÂÃÂÃÂ <SortIcon col="remaining" /></th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ§ÃÂÃÂÃÂÃÂª</td></tr>
                ) : filtered.map((c, i) => {
                  const remaining = c.totalAmount - c.paidAmount
                  const isExpanded = expandedId === c.id
                  const clientInvs = invoiceCache[c.id] || []
                  const isLoading = loadingId === c.id

                  const dispInvs = clientInvs.filter(inv => {
                    const r = Math.max(0, roundCents(inv.total - inv.paid))
                    if (expandedFilter === 'paid') return r === 0
                    if (expandedFilter === 'open') return r > 0
                    return true
                  })
                  const ledTotal = clientInvs.reduce((s, i) => s + i.total, 0)
                  const ledPaid  = clientInvs.reduce((s, i) => s + i.paid,  0)
                  const ledOpen  = Math.max(0, ledTotal - ledPaid)
                  const openCount = clientInvs.filter(i => Math.max(0, roundCents(i.total - i.paid)) > 0).length
                  const paidCount = clientInvs.filter(i => Math.max(0, roundCents(i.total - i.paid)) === 0).length

                  return (
                    <Fragment key={c.id}>
                      {/* Ã¢ÂÂÃ¢ÂÂ Client row Ã¢ÂÂÃ¢ÂÂ */}
                      <tr
                        onClick={() => toggleExpand(c)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : i % 2 === 0 ? 'bg-white hover:bg-indigo-50/50' : 'bg-gray-50/40 hover:bg-indigo-50/50'}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-xs transition-transform duration-200 inline-block" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>Ã¢ÂÂ¶</span>
                            <span className="font-semibold text-gray-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs font-mono">{c.tax_id || 'Ã¢ÂÂ'}</td>
                        <td className="px-5 py-3">
                          {c.tax_status ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.tax_status === 'ÃÂÃÂÃÂ¨ÃÂ©ÃÂ' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.tax_status}</span>
                          ) : 'Ã¢ÂÂ'}
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">
                          <div>{c.contact_name || 'Ã¢ÂÂ'}</div>
                          {c.contact_email && <div className="text-gray-400" dir="ltr">{c.contact_email}</div>}
                        </td>
                        <td className="px-5 py-3 text-indigo-600 font-semibold text-center">{c.invoiceCount}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{fmt(c.totalAmount)}</td>
                        <td className="px-5 py-3 text-emerald-600 font-medium">{fmt(c.paidAmount)}</td>
                        <td className="px-5 py-3">
                          {remaining > 0
                            ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span>
                            : <span className="text-emerald-500 text-xs font-semibold">Ã¢ÂÂ ÃÂ©ÃÂÃÂÃÂ</span>}
                        </td>
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setModalClient(c)} className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">ÃÂ¢ÃÂ¨ÃÂÃÂÃÂ</button>
                            <button onClick={() => setDeleteClientId(c.id)} className="text-xs px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Ã¢ÂÂÃ¢ÂÂ Inline ledger (accordion) Ã¢ÂÂÃ¢ÂÂ */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0 border-b border-indigo-100">
                            <div className="bg-indigo-50/40 px-6 py-4 space-y-4">

                              {/* Stats */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 text-center shadow-sm">
                                  <div className="text-base font-bold text-gray-800">{fmt(ledTotal)}</div>
                                  <div className="text-xs text-gray-400 mt-0.5">ÃÂ¡ÃÂÃÂ´ÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</div>
                                </div>
                                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center shadow-sm">
                                  <div className="text-base font-bold text-emerald-600">{fmt(ledPaid)}</div>
                                  <div className="text-xs text-emerald-500 mt-0.5">ÃÂ©ÃÂÃÂÃÂ</div>
                                </div>
                                <div className={`rounded-xl border px-4 py-3 text-center shadow-sm ${ledOpen > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                  <div className={`text-base font-bold ${ledOpen > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{ledOpen > 0 ? fmt(ledOpen) : 'Ã¢ÂÂ ÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂ'}</div>
                                  <div className={`text-xs mt-0.5 ${ledOpen > 0 ? 'text-red-400' : 'text-emerald-400'}`}>ÃÂÃÂªÃÂ¨ÃÂ ÃÂÃÂªÃÂ©ÃÂÃÂÃÂ</div>
                                </div>
                              </div>

                              {/* Filter tabs */}
                              <div className="flex gap-1 bg-white rounded-xl p-1 w-fit border border-gray-100 shadow-sm">
                                {([
                                  { key: 'all',  label: 'ÃÂÃÂÃÂ',    count: clientInvs.length },
                                  { key: 'open', label: 'ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂª', count: openCount },
                                  { key: 'paid', label: 'ÃÂ©ÃÂÃÂÃÂ',   count: paidCount },
                                ] as const).map(({ key, label, count }) => (
                                  <button
                                    key={key}
                                    onClick={e => { e.stopPropagation(); setExpandedFilter(key) }}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${expandedFilter === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                                  >
                                    {label} <span className={`text-xs font-normal mr-1 ${expandedFilter === key ? 'text-indigo-200' : 'text-gray-400'}`}>({count})</span>
                                  </button>
                                ))}
                              </div>

                              {/* Invoices table */}
                              {isLoading ? (
                                <div className="text-center py-6 text-gray-400 text-sm">ÃÂÃÂÃÂ¢ÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª...</div>
                              ) : dispInvs.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">ÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂÃÂ¦ÃÂÃÂ</div>
                              ) : (
                                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                  <table className="w-full text-sm border-collapse">
                                    <thead>
                                      <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs">
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂ¡ÃÂ³</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂªÃÂÃÂ¨ÃÂÃÂ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂ¡ÃÂÃÂ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢ÃÂ´ÃÂ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂ¡ÃÂÃÂ´ÃÂ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂ©ÃÂÃÂÃÂ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">ÃÂÃÂªÃÂ¨ÃÂ</th>
                                        <th className="px-3 py-2.5 text-center font-semibold">ÃÂ¡ÃÂÃÂÃÂÃÂ¡</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dispInvs.map((inv, idx) => {
                                        const rem = Math.max(0, roundCents(inv.total - inv.paid))
                                        const isPaid = rem < 1
                                        return (
                                          <tr key={inv.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`} onClick={e => e.stopPropagation()}>
                                            <td className="px-3 py-2 font-mono text-xs text-gray-400">{inv.invoice_num || 'Ã¢ÂÂ'}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.date)}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs">{inv.doc_type || 'Ã¢ÂÂ'}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs">{fmt(inv.before_vat)}</td>
                                            <td className="px-3 py-2 font-semibold text-gray-800">{fmt(inv.total)}</td>
                                            <td className="px-3 py-2 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                                            <td className="px-3 py-2">
                                              {rem > 0 ? <span className="text-red-500 font-semibold">{fmt(rem)}</span> : <span className="text-gray-300 text-xs">Ã¢ÂÂ</span>}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {isPaid
                                                ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">ÃÂ©ÃÂÃÂÃÂ</span>
                                                : inv.paid > 0
                                                  ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">ÃÂÃÂÃÂ§ÃÂ</span>
                                                  : <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600">ÃÂÃÂÃÂªÃÂÃÂ</span>}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-sm">
                                        <td colSpan={4} className="px-3 py-2 text-xs text-gray-500 uppercase">ÃÂ¡ÃÂÃÂ´ÃÂ ({dispInvs.length})</td>
                                        <td className="px-3 py-2 text-gray-600">{fmt(dispInvs.reduce((s,i) => s+i.before_vat,0))}</td>
                                        <td className="px-3 py-2 text-gray-800">{fmt(dispInvs.reduce((s,i) => s+i.total,0))}</td>
                                        <td className="px-3 py-2 text-emerald-600">{fmt(dispInvs.reduce((s,i) => s+i.paid,0))}</td>
                                        <td className="px-3 py-2 text-red-500">{fmt(dispInvs.reduce((s,i) => s+Math.max(0, roundCents(i.total-i.paid)),0))}</td>
                                        <td />
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-sm">
                    <td colSpan={4} className="px-5 py-3 text-gray-500 text-xs uppercase">ÃÂ¡ÃÂÃÂ´ÃÂ ({filtered.length})</td>
                    <td className="px-5 py-3 text-indigo-600 text-center">{filtered.reduce((s, c) => s + c.invoiceCount, 0)}</td>
                    <td className="px-5 py-3 text-gray-800">{fmt(filtered.reduce((s, c) => s + c.totalAmount, 0))}</td>
                    <td className="px-5 py-3 text-emerald-600">{fmt(filtered.reduce((s, c) => s + c.paidAmount, 0))}</td>
                    <td className="px-5 py-3 text-red-500">{fmt(filtered.reduce((s, c) => s + Math.max(0, c.totalAmount - c.paidAmount), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteClientId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteClientId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <p className="font-semibold text-gray-800">ÃÂÃÂÃÂÃÂÃÂ§ ÃÂÃÂª ÃÂÃÂÃÂ§ÃÂÃÂ?</p>
            <p className="text-sm text-gray-500">ÃÂÃÂÃÂ§ÃÂÃÂ ÃÂÃÂÃÂÃÂÃÂ§. ÃÂÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂÃÂ©ÃÂÃÂÃÂÃÂÃÂª ÃÂÃÂÃÂÃÂ ÃÂÃÂÃÂ©ÃÂÃÂ¨ÃÂ.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteClient(deleteClientId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">ÃÂÃÂÃÂ§</button>
              <button onClick={() => setDeleteClientId(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">ÃÂÃÂÃÂÃÂÃÂ</button>
            </div>
          </div>
        </div>
      )}

      {/* Client Modal (add / edit) */}
      {modalClient !== null && (
        <ClientModal
          initial={modalClient === 'new' ? EMPTY_CLIENT : {
            name: (modalClient as ClientRecord).name,
            tax_id: (modalClient as ClientRecord).tax_id,
            tax_status: (modalClient as ClientRecord).tax_status,
            contact_name: (modalClient as ClientRecord).contact_name,
            contact_email: (modalClient as ClientRecord).contact_email,
            notes: (modalClient as ClientRecord).notes,
          }}
          onSave={handleSaveClient}
          onClose={() => setModalClient(null)}
          saving={saving}
        />
      )}

    </div>
  )
}

function Detail({ label, value, href, mono }: { label: string; value?: string; href?: string; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      {href ? (
        <a href={href} className={`text-indigo-600 hover:underline ${mono ? 'font-mono' : 'font-medium'} text-sm`}>{value}</a>
      ) : (
        <div className={`text-gray-800 ${mono ? 'font-mono' : 'font-medium'} text-sm`}>{value}</div>
      )}
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ FinProjectsTab Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
interface Project { id: string; name: string; category: string }

function FinProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ artist: true, production: true })
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loadingInv, setLoadingInv] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'open' | 'paid'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'artist' | 'production'>('artist')
  const [savingNew, setSavingNew] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const fmtP = (n: number) => n ? `Ã¢ÂÂª${Math.round(n).toLocaleString('he-IL')}` : 'Ã¢ÂÂ'

  // Load projects from Supabase
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => {
        const list: Project[] = d.projects || []
        setProjects(list)
        const first = list.find(p => p.category === 'artist') || list[0]
        if (first) setSel(first.id)
      })
      .catch(() => {})
  }, [])

  // When project selected Ã¢ÂÂ fetch matching invoices (project_id FK first, then fuzzy name fallback)
  useEffect(() => {
    if (!sel) return
    const project = projects.find(p => p.id === sel)
    if (!project) return
    setLoadingInv(true)
    setLedgerFilter('all')
    fetch('/api/invoices')
      .then(r => r.json())
      .then(d => {
        const all: InvoiceRow[] = d.invoices || []
        const q = project.name.toLowerCase()
        const matched = all.filter(inv =>
          inv.project_id === sel ||
          (!inv.project_id && (
            inv.client?.toLowerCase().includes(q) ||
            q.includes(inv.client?.toLowerCase() || '__nomatch__')
          ))
        )
        setInvoices(matched)
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoadingInv(false))
  }, [sel, projects])

  const addProject = async () => {
    if (!newName.trim()) return
    setSavingNew(true)
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), category: newCategory }) })
    const d = await res.json()
    if (d.project) { setProjects(prev => [...prev, d.project].sort((a,b) => a.category.localeCompare(b.category)||a.name.localeCompare(b.name))); setSel(d.project.id) }
    setNewName(''); setShowAddModal(false); setSavingNew(false)
  }
  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(prev => prev.filter(p => p.id !== id))
    if (sel === id) { const rem = projects.filter(p => p.id !== id); setSel(rem.find(p => p.category === 'artist')?.id || rem[0]?.id || null) }
    setDeleteConfirmId(null)
  }
  const current = projects.find(p => p.id === sel)
  const artists     = projects.filter(p => p.category === 'artist')
  const productions = projects.filter(p => p.category === 'production')

  const displayed = invoices.filter(inv => {
    const rem = Math.max(0, roundCents(inv.total - inv.paid))
    if (ledgerFilter === 'open') return rem > 0
    if (ledgerFilter === 'paid') return rem === 0
    return true
  })

  const totalRev  = invoices.reduce((s, i) => s + i.total, 0)
  const totalPaid = invoices.reduce((s, i) => s + i.paid,  0)
  const totalRem  = Math.max(0, totalRev - totalPaid)
  const openCount = invoices.filter(i => Math.max(0, roundCents(i.total - i.paid)) > 0).length
  const paidCount = invoices.filter(i => Math.max(0, roundCents(i.total - i.paid)) === 0).length

  function ProjectList({ label, category, items }: { label: string; category: string; items: Project[] }) {
    const isOpen = expanded[category] !== false
    return (
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center px-4 py-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <button onClick={() => setExpanded(p => ({ ...p, [category]: !p[category] }))} className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(77,208,225,0.2)', color: '#4dd0e1' }}>{items.length}</span>
          </button>
          <button onClick={() => { setNewCategory(category as 'artist' | 'production'); setNewName(''); setShowAddModal(true) }} className="w-5 h-5 rounded-full flex items-center justify-center mr-1 text-sm font-bold transition-colors" style={{ background: 'rgba(77,208,225,0.15)', color: '#4dd0e1' }} title="ÃÂÃÂÃÂ¡ÃÂ£">+</button>
          <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {isOpen && (
          <div className="px-2 pb-2 space-y-0.5">
            {items.map(p => {
              const isActive = sel === p.id
              return (
                <div key={p.id} className="relative group">
                  <button
                    onClick={() => setSel(p.id)}
                    className="w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: isActive ? 'rgba(77,208,225,0.15)' : 'transparent',
                      color: isActive ? '#e0f7fa' : 'rgba(255,255,255,0.45)',
                      border: isActive ? '1px solid rgba(77,208,225,0.3)' : '1px solid transparent',
                    }}
                    onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)' } }}
                    onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)' } }}
                  >{p.name}</button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteConfirmId(p.id) }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-xs transition-all"
                    style={{ color: 'rgba(248,113,113,0.8)' }}
                  >Ã¢ÂÂ</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full" dir="rtl" style={{ background: 'var(--bg-secondary)' }}>

      {/* Ã¢ÂÂÃ¢ÂÂ Left sidebar Ã¢ÂÂÃ¢ÂÂ */}
      <aside className="w-60 flex-shrink-0 overflow-y-auto p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c0e1c 0%, #111827 60%)', borderLeft: '1px solid rgba(99,102,241,0.1)' }}>
        <div className="px-1 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂÃÂÃÂ</p>
        </div>
        <ProjectList label="ÃÂÃÂÃÂÃÂ ÃÂÃÂ" category="artist" items={artists} />
        <ProjectList label="ÃÂÃÂ¤ÃÂ§ÃÂÃÂª" category="production" items={productions} />
      </aside>

      {/* Add project modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-4">ÃÂÃÂÃÂ¡ÃÂ£ {newCategory === 'artist' ? 'ÃÂÃÂÃÂÃÂ' : 'ÃÂÃÂ¤ÃÂ§ÃÂ'}</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['artist', 'production'] as const).map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                    style={newCategory === cat ? { background: 'rgba(77,208,225,0.2)', color: '#4dd0e1', border: '1px solid rgba(77,208,225,0.3)' } : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {cat === 'artist' ? 'ÃÂÃÂÃÂÃÂ' : 'ÃÂÃÂ¤ÃÂ§ÃÂ'}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addProject()}
                placeholder="ÃÂ©ÃÂ..."
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-sm text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors">ÃÂÃÂÃÂÃÂÃÂ</button>
              <button onClick={addProject} disabled={savingNew || !newName.trim()} className="flex-1 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4dd0e1, #0284c7)', color: 'white' }}>
                {savingNew ? 'ÃÂ©ÃÂÃÂÃÂ¨...' : 'ÃÂÃÂÃÂ¡ÃÂ£'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId && (() => {
        const target = projects.find(p => p.id === deleteConfirmId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl" onClick={() => setDeleteConfirmId(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
              <h3 className="text-base font-bold text-white mb-2">ÃÂÃÂÃÂÃÂ§ÃÂª {target?.category === 'artist' ? 'ÃÂÃÂÃÂÃÂ' : 'ÃÂÃÂ¤ÃÂ§ÃÂ'}</h3>
              <p className="text-sm text-gray-400 mb-5">ÃÂÃÂÃÂÃÂÃÂ§ ÃÂÃÂª <span className="font-semibold text-white">{target?.name}</span>? ÃÂÃÂ¤ÃÂ¢ÃÂÃÂÃÂ ÃÂÃÂÃÂ ÃÂ ÃÂ ÃÂÃÂªÃÂ ÃÂª ÃÂÃÂÃÂÃÂÃÂÃÂ.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 text-sm text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700">ÃÂÃÂÃÂÃÂÃÂ</button>
                <button onClick={() => deleteProject(deleteConfirmId)} className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl">ÃÂÃÂÃÂ§</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Ã¢ÂÂÃ¢ÂÂ Right panel Ã¢ÂÂÃ¢ÂÂ */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {!current ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">ÃÂÃÂÃÂ¨ ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ ÃÂÃÂÃÂ¨ÃÂ©ÃÂÃÂÃÂ</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{current.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{invoices.length} ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂ©ÃÂÃÂÃÂÃÂÃÂª</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: current.category === 'artist' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)', color: current.category === 'artist' ? '#818cf8' : '#10b981' }}>
                {current.category === 'artist' ? 'Ã°ÂÂÂ¤ ÃÂÃÂÃÂÃÂ' : 'Ã°ÂÂÂ¬ ÃÂÃÂ¤ÃÂ§ÃÂ'}
              </span>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'ÃÂ¡ÃÂ"ÃÂ ÃÂÃÂÃÂ ÃÂ¡ÃÂÃÂª', value: fmtP(totalRev),  color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                { label: 'ÃÂ©ÃÂÃÂÃÂ',         value: fmtP(totalPaid), color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                { label: 'ÃÂ ÃÂÃÂªÃÂ¨ ÃÂÃÂÃÂÃÂÃÂÃÂ', value: fmtP(totalRem),  color: totalRem > 0 ? '#f59e0b' : '#10b981', bg: totalRem > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)' },
                { label: 'ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª',    value: String(invoices.length), color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
                  <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {([
                { key: 'all',  label: 'ÃÂÃÂÃÂ',    count: invoices.length },
                { key: 'open', label: 'ÃÂ¤ÃÂªÃÂÃÂÃÂÃÂª', count: openCount },
                { key: 'paid', label: 'ÃÂ©ÃÂÃÂÃÂ',   count: paidCount },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setLedgerFilter(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all`}
                  style={ledgerFilter === key ? { background: '#6366f1', color: 'white', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' } : { background: 'transparent', color: 'var(--text-secondary)' }}
                >
                  {label} <span style={{ opacity: 0.6, fontSize: 11 }}>({count})</span>
                </button>
              ))}
            </div>

            {/* Invoice table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {loadingInv ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>ÃÂÃÂÃÂ¢ÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª...</div>
              ) : displayed.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {invoices.length === 0 ? 'ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ ÃÂÃÂ' : 'ÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª ÃÂÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ¤ÃÂÃÂÃÂÃÂ¨ ÃÂÃÂ'}
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      {['ÃÂÃÂ¡ÃÂ³', 'ÃÂªÃÂÃÂ¨ÃÂÃÂ', 'ÃÂ¡ÃÂÃÂ', 'ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢"ÃÂ', 'ÃÂ¡ÃÂ"ÃÂ', 'ÃÂ©ÃÂÃÂÃÂ', 'ÃÂÃÂªÃÂ¨ÃÂ', 'ÃÂ¡ÃÂÃÂÃÂÃÂ¡'].map(h => (
                        <th key={h} className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((inv, i) => {
                      const rem = Math.max(0, roundCents(inv.total - inv.paid))
                      const isPaid = rem < 1
                      const status = isPaid ? 'paid' : inv.paid > 0 ? 'partial' : 'unpaid'
                      const statusStyle = {
                        paid:    { bg: '#d1fae5', color: '#065f46', label: 'ÃÂ©ÃÂÃÂÃÂ' },
                        partial: { bg: '#fef3c7', color: '#92400e', label: 'ÃÂÃÂÃÂ§ÃÂ' },
                        unpaid:  { bg: '#fee2e2', color: '#991b1b', label: 'ÃÂÃÂÃÂªÃÂÃÂ' },
                      }[status]
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                          <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_num || 'Ã¢ÂÂ'}</td>
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDateFull(inv.date)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.doc_type || 'Ã¢ÂÂ'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.issued_by || 'Ã¢ÂÂ'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtP(inv.before_vat)}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmtP(inv.total)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: '#10b981' }}>{fmtP(inv.paid)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: rem > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{rem > 0 ? fmtP(rem) : 'Ã¢ÂÂ'}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <td colSpan={3} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>ÃÂ¡ÃÂ"ÃÂ ({displayed.length})</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>{fmtP(displayed.reduce((s,i) => s+i.before_vat,0))}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#6366f1' }}>{fmtP(displayed.reduce((s,i) => s+i.total,0))}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#10b981' }}>{fmtP(displayed.reduce((s,i) => s+i.paid,0))}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#f59e0b' }}>{fmtP(displayed.reduce((s,i) => s+Math.max(0, roundCents(i.total-i.paid)),0))}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Ã¢ÂÂÃ¢ÂÂ ExpensesTab Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
interface Expense {
  id: number
  project_id: string | null
  supplier: string
  description: string
  vat_status: string
  amount: number
  vat: number
  total: number
  paid: number
  payment_date: string
  has_invoice: boolean
  month: string
  notes: string
}

const EMPTY_EXPENSE: Omit<Expense, 'id'> = {
  project_id: null,
  supplier: '',
  description: '',
  vat_status: 'ÃÂÃÂÃÂ¨ÃÂ©ÃÂ',
  amount: 0,
  vat: 0,
  total: 0,
  paid: 0,
  payment_date: '',
  has_invoice: false,
  month: '',
  notes: '',
}

const VAT_RATE = 0.18

function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({})
  const [filterProject, setFilterProject] = useState('')
  const [filterVat, setFilterVat] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterInvoice, setFilterInvoice] = useState<'' | 'yes' | 'no'>('')
  const [modal, setModal] = useState<null | { mode: 'add' | 'edit'; expense: Omit<Expense, 'id'> & { id?: number } }>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDrop, setShowSupplierDrop] = useState(false)

  const fmt = (n: number) => n ? `Ã¢ÂÂª${Math.round(n).toLocaleString('he-IL')}` : 'Ã¢ÂÂ'
  const fmtDec = (n: number) => n ? `Ã¢ÂÂª${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Ã¢ÂÂ'

  const loadAll = async () => {
    setLoading(true)
    try {
      const [expRes, projRes, supRes] = await Promise.all([
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/projects').then(r => r.json()),
        fetch('/api/monday-suppliers').then(r => r.json()),
      ])
      const list: Expense[] = expRes.expenses || []
      setExpenses(list)
      setProjects(projRes.projects || [])
      setSuppliers(supRes.suppliers || [])
      // auto-open all months
      const months = [...new Set(list.map(e => e.month).filter(Boolean))].sort()
      setOpenMonths(Object.fromEntries(months.map(m => [m, true])))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const handleSave = async () => {
    if (!modal) return
    setSaving(true)
    try {
      const body = modal.expense
      if (modal.mode === 'add') {
        await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      } else {
        await fetch(`/api/expenses/${modal.expense.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      }
      await loadAll()
      setModal(null)
    } catch {
      alert('ÃÂ©ÃÂÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ¨ÃÂ')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('ÃÂÃÂÃÂÃÂÃÂ§ ÃÂÃÂÃÂ¦ÃÂÃÂ ÃÂÃÂ?')) return
    setDeleting(id)
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    await loadAll()
    setDeleting(null)
  }

  const openAdd = (month?: string) => {
    const now = new Date()
    const defaultMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setModal({ mode: 'add', expense: { ...EMPTY_EXPENSE, month: defaultMonth } })
  }

  const openEdit = (e: Expense) => {
    setModal({ mode: 'edit', expense: { ...e } })
  }

  const upd = (field: string, val: unknown) => {
    if (!modal) return
    const next = { ...modal.expense, [field]: val } as typeof modal.expense
    // auto-calculate vat + total when amount changes and status is ÃÂÃÂÃÂ¨ÃÂ©ÃÂ
    if (field === 'amount' || field === 'vat_status') {
      const amt = field === 'amount' ? Number(val) : next.amount
      const status = field === 'vat_status' ? String(val) : next.vat_status
      if (status === 'ÃÂÃÂÃÂ¨ÃÂ©ÃÂ' || status === 'ÃÂÃÂÃÂ¨ÃÂ') {
        next.vat = roundCents(amt * VAT_RATE)
        next.total = roundCents(amt + next.vat)
      } else {
        next.vat = 0
        next.total = roundCents(amt)
      }
    }
    if (field === 'vat') {
      next.total = roundCents(next.amount + Number(val))
    }
    setModal({ ...modal, expense: next })
  }

  // filtered
  const filtered = expenses.filter(e => {
    if (filterProject && e.project_id !== filterProject) return false
    if (filterVat && e.vat_status !== filterVat) return false
    if (filterMonth && e.month !== filterMonth) return false
    if (filterInvoice === 'yes' && !e.has_invoice) return false
    if (filterInvoice === 'no' && e.has_invoice) return false
    return true
  })

  const months = [...new Set(filtered.map(e => e.month).filter(Boolean))].sort()
  const allMonths = [...new Set(expenses.map(e => e.month).filter(Boolean))].sort()

  const projMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const toggleMonth = (m: string) => setOpenMonths(prev => ({ ...prev, [m]: !prev[m] }))

  // summary
  const totalExp = filtered.reduce((s, e) => s + e.total, 0)
  const totalPaid = filtered.reduce((s, e) => s + e.paid, 0)
  const totalBalance = filtered.reduce((s, e) => s + Math.max(0, roundCents(e.total - e.paid)), 0)
  const noInvoice = filtered.filter(e => !e.has_invoice).length

  const heMonth = (m: string) => {
    if (!m) return ''
    const [y, mo] = m.split('-')
    const names = ['ÃÂÃÂ ÃÂÃÂÃÂ¨','ÃÂ¤ÃÂÃÂ¨ÃÂÃÂÃÂ¨','ÃÂÃÂ¨ÃÂ¥','ÃÂÃÂ¤ÃÂ¨ÃÂÃÂ','ÃÂÃÂÃÂ','ÃÂÃÂÃÂ ÃÂ','ÃÂÃÂÃÂÃÂ','ÃÂÃÂÃÂÃÂÃÂ¡ÃÂ','ÃÂ¡ÃÂ¤ÃÂÃÂÃÂÃÂ¨','ÃÂÃÂÃÂ§ÃÂÃÂÃÂÃÂ¨','ÃÂ ÃÂÃÂÃÂÃÂÃÂ¨','ÃÂÃÂ¦ÃÂÃÂÃÂ¨']
    return (names[parseInt(mo) - 1] || mo) + ' ' + y
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="inline-block w-6 h-6 border-2 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" dir="rtl">

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'ÃÂ¡ÃÂ"ÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂÃÂª', val: fmt(totalExp), color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'ÃÂ©ÃÂÃÂÃÂ', val: fmt(totalPaid), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'ÃÂÃÂªÃÂ¨ÃÂ ÃÂÃÂªÃÂ©ÃÂÃÂÃÂ', val: fmt(totalBalance), color: totalBalance > 0 ? 'text-rose-600' : 'text-gray-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: 'ÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª', val: String(noInvoice), color: noInvoice > 0 ? 'text-amber-600' : 'text-gray-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 ${card.bg}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
            <div className={`text-xl font-bold ${card.color}`}>{card.val}</div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">ÃÂÃÂ ÃÂÃÂÃÂÃÂÃÂ©ÃÂÃÂ</option>
          {allMonths.map(m => <option key={m} value={m}>{heMonth(m)}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">ÃÂÃÂ ÃÂÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂÃÂÃÂ</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterVat} onChange={e => setFilterVat(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">ÃÂÃÂ ÃÂ¡ÃÂÃÂÃÂÃÂ¡ ÃÂÃÂ¢"ÃÂ</option>
          {['ÃÂÃÂÃÂ¨ÃÂ©ÃÂ','ÃÂ¤ÃÂÃÂÃÂ¨','ÃÂÃÂÃÂ¨ÃÂ','ÃÂ¢ÃÂÃÂÃÂªÃÂ'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterInvoice} onChange={e => setFilterInvoice(e.target.value as '' | 'yes' | 'no')}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">ÃÂÃÂ ÃÂÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂÃÂª</option>
          <option value="yes">ÃÂÃÂ© ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª</option>
          <option value="no">ÃÂÃÂÃÂ ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª</option>
        </select>
        {(filterMonth || filterProject || filterVat || filterInvoice) && (
          <button onClick={() => { setFilterMonth(''); setFilterProject(''); setFilterVat(''); setFilterInvoice('') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">ÃÂ ÃÂ§ÃÂ</button>
        )}
        <div className="flex-1" />
        <button onClick={() => openAdd()}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          ÃÂÃÂÃÂ¡ÃÂ£ ÃÂÃÂÃÂ¦ÃÂÃÂ
        </button>
      </div>

      {/* Accordion by month */}
      {months.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l-4-4 4-4M15 10l4 4-4 4" /></svg>
          <p>ÃÂÃÂÃÂ ÃÂÃÂÃÂ¦ÃÂÃÂÃÂª ÃÂ¨ÃÂ©ÃÂÃÂÃÂÃÂª</p>
          <button onClick={() => openAdd()} className="mt-3 text-sm text-violet-600 underline">ÃÂÃÂÃÂ¡ÃÂ£ ÃÂÃÂÃÂ¦ÃÂÃÂ ÃÂ¨ÃÂÃÂ©ÃÂÃÂ ÃÂ</button>
        </div>
      ) : (
        months.map(month => {
          const rows = filtered.filter(e => e.month === month).sort((a, b) => a.id - b.id)
          const mTotal = rows.reduce((s, e) => s + e.total, 0)
          const mPaid = rows.reduce((s, e) => s + e.paid, 0)
          const mBalance = rows.reduce((s, e) => s + Math.max(0, roundCents(e.total - e.paid)), 0)
          const isOpen = !!openMonths[month]
          return (
            <div key={month} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Month header */}
              <button
                onClick={() => toggleMonth(month)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-right"
              >
                <svg className={`w-4 h-4 text-violet-500 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-bold text-gray-800 dark:text-white text-sm">{heMonth(month)}</span>
                <span className="text-xs text-gray-400 mr-1">({rows.length})</span>
                <div className="flex-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">ÃÂ¡ÃÂ"ÃÂ: <span className="font-semibold text-violet-600">{fmt(mTotal)}</span></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">ÃÂ©ÃÂÃÂÃÂ: <span className="font-semibold text-emerald-600">{fmt(mPaid)}</span></span>
                {mBalance > 0 && <span className="text-xs text-rose-500 font-semibold ml-4">ÃÂÃÂªÃÂ¨ÃÂ: {fmt(mBalance)}</span>}
                <button onClick={e => { e.stopPropagation(); openAdd(month) }}
                  className="mr-2 text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  ÃÂÃÂÃÂ¡ÃÂ£
                </button>
              </button>

              {isOpen && (
                <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {['פרויקט','שם הספק','תיאור הוצאה','סכום','מע"מ','סה"כ','שולם','תאריך תשלום','יתרה לתשלום','חשבונית','הערות',''].map(h => (
                          <th key={h} className="px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {rows.map((e, i) => {
                        const balance = Math.max(0, roundCents(e.total - e.paid))
                        const isPaid = balance === 0
                        const proj = e.project_id ? projMap[e.project_id] : null
                        return (
                          <tr key={e.id} className={i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''}>
                            <td className="px-3 py-2 text-xs">
                              {proj ? (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${proj.category === 'artist' ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'}`}>{proj.name}</span>
                              ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap max-w-[120px] truncate">{e.supplier || '—'}</td>
                            <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{e.description || '—'}</td>
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">{fmtDec(e.amount)}</td>
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-left whitespace-nowrap">{e.vat ? fmtDec(e.vat) : '—'}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 text-left whitespace-nowrap">{fmtDec(e.total)}</td>
                            <td className="px-3 py-2 text-xs font-semibold text-emerald-600 text-left whitespace-nowrap">{e.paid ? fmtDec(e.paid) : '—'}</td>
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{e.payment_date || '—'}</td>
                            <td className="px-3 py-2 text-xs text-left whitespace-nowrap">
                              {balance > 0
                                ? <span className="text-rose-500 font-semibold">{fmtDec(balance)}</span>
                                : <span className="text-emerald-500 text-xs">✔</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {e.has_invoice
                                ? <span className="text-emerald-500 text-sm">✔</span>
                                : <span className="text-rose-400 text-xs font-bold">✗</span>}
                            </td>
                            <td className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 max-w-[120px] truncate">{e.notes || ''}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex gap-1">
                                <button onClick={() => openEdit(e)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors" title="Edit">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => setDelId(e.id)}
                                  className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Delete">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-700">
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-500">ÃÂ¡ÃÂ"ÃÂ ÃÂÃÂÃÂÃÂ©</td>
                        <td className="px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 text-left">{fmtDec(rows.reduce((s,e)=>s+e.amount,0))}</td>
                        <td className="px-3 py-2 text-xs font-bold text-gray-500 text-left">{fmtDec(rows.reduce((s,e)=>s+e.vat,0))}</td>
                        <td className="px-3 py-2 text-xs font-bold text-indigo-600 text-left">{fmtDec(mTotal)}</td>
                        <td className="px-3 py-2 text-xs font-bold text-emerald-600 text-left">{fmtDec(mPaid)}</td>
                        <td className="px-3 py-2 text-xs font-bold text-rose-500 text-left">{mBalance > 0 ? fmtDec(mBalance) : ''}</td>
                        <td colSpan={4} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-800 dark:text-white">{modal.mode === 'add' ? 'ÃÂÃÂÃÂ¡ÃÂ¤ÃÂª ÃÂÃÂÃÂ¦ÃÂÃÂ' : 'ÃÂ¢ÃÂ¨ÃÂÃÂÃÂª ÃÂÃÂÃÂ¦ÃÂÃÂ'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {/* Month */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂÃÂÃÂÃÂ©</label>
                <input type="month" value={modal.expense.month} onChange={e => upd('month', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              {/* Supplier picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂ¡ÃÂ¤ÃÂ§</label>
                <div className="relative">
                  <input
                    type="text"
                    value={showSupplierDrop ? supplierSearch : (modal.expense.supplier || '')}
                    onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDrop(true) }}
                    onFocus={() => { setSupplierSearch(''); setShowSupplierDrop(true) }}
                    onBlur={() => setTimeout(() => setShowSupplierDrop(false), 150)}
                    placeholder="ÃÂÃÂ¤ÃÂ© ÃÂ¡ÃÂ¤ÃÂ§..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  {!showSupplierDrop && modal.expense.vat_status && (
                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-xs font-semibold ${TAX_STATUS_STYLE[modal.expense.vat_status] || 'bg-gray-100 text-gray-600'}`}>
                      {modal.expense.vat_status}
                    </span>
                  )}
                  {showSupplierDrop && (
                    <div className="absolute z-50 top-full mt-1 right-0 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {suppliers
                        .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={() => {
                              upd('supplier', s.name)
                              if (s.taxStatus) upd('vat_status', s.taxStatus)
                              setSupplierSearch('')
                              setShowSupplierDrop(false)
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                          >
                            <span className="font-medium text-gray-800 dark:text-white">{s.name}</span>
                            {s.taxStatus && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${TAX_STATUS_STYLE[s.taxStatus] || 'bg-gray-100 text-gray-600'}`}>{s.taxStatus}</span>
                            )}
                          </button>
                        ))}
                      {suppliers.filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">ÃÂÃÂ ÃÂ ÃÂÃÂ¦ÃÂÃÂ ÃÂ¡ÃÂ¤ÃÂ§ÃÂÃÂ</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Description + Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂªÃÂÃÂÃÂÃÂ¨</label>
                  <input type="text" value={modal.expense.description} onChange={e => upd('description', e.target.value)} placeholder="ÃÂªÃÂÃÂÃÂÃÂ¨"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ</label>
                  <select value={modal.expense.project_id || ''} onChange={e => upd('project_id', e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                    <option value="">ÃÂÃÂÃÂ ÃÂ¤ÃÂ¨ÃÂÃÂÃÂ§ÃÂ</option>
                    {['artist','production'].map(cat => (
                      <optgroup key={cat} label={cat === 'artist' ? 'ÃÂÃÂÃÂÃÂ ÃÂÃÂ' : 'ÃÂÃÂ¤ÃÂ§ÃÂ'}>
                        {projects.filter(p => p.category === cat).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              {/* Amount / VAT / Total */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂ¡ÃÂÃÂÃÂ ÃÂÃÂ¤ÃÂ ÃÂ ÃÂÃÂ¢"ÃÂ</label>
                  <input type="number" step="0.01" value={modal.expense.amount || ''} onChange={e => upd('amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂÃÂ¢"ÃÂ</label>
                  <input type="number" step="0.01" value={modal.expense.vat || ''} onChange={e => upd('vat', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂ¡ÃÂ"ÃÂ</label>
                  <input type="number" step="0.01" value={modal.expense.total || ''} onChange={e => upd('total', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>
              {/* Paid + Payment date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂ©ÃÂÃÂÃÂ</label>
                  <input type="number" step="0.01" value={modal.expense.paid || ''} onChange={e => upd('paid', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂªÃÂÃÂ¨ÃÂÃÂ ÃÂªÃÂ©ÃÂÃÂÃÂ</label>
                  <input type="text" value={modal.expense.payment_date} onChange={e => upd('payment_date', e.target.value)} placeholder="DD.MM.YY"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>
              {/* Has invoice + notes */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={modal.expense.has_invoice} onChange={e => upd('has_invoice', e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600" />
                  ÃÂÃÂ© ÃÂÃÂ©ÃÂÃÂÃÂ ÃÂÃÂª
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ÃÂÃÂ¢ÃÂ¨ÃÂÃÂª</label>
                <textarea value={modal.expense.notes} onChange={e => upd('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors text-sm">
                {saving ? 'ÃÂ©ÃÂÃÂÃÂ¨...' : modal.mode === 'add' ? 'ÃÂÃÂÃÂ¡ÃÂ£ ÃÂÃÂÃÂ¦ÃÂÃÂ' : 'ÃÂ©ÃÂÃÂÃÂ¨ ÃÂ©ÃÂÃÂ ÃÂÃÂÃÂÃÂ'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                ÃÂÃÂÃÂÃÂÃÂ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function FinancialView({ activeTab }: { activeTab: FinTab }) {
  return (
    <div className="flex flex-col h-full bg-gray-50" dir="rtl">
      {/* Content */}
      {activeTab === 'suppliers' && <SuppliersTab />}

      {activeTab === 'clients' && <ClientsTab />}

      {activeTab === 'invoices' && <InvoicesTab />}

      {activeTab === 'dashboard' && <FinancialDashboard />}

      {activeTab === 'projects' && <FinProjectsTab />}

      {activeTab === 'expenses' && <ExpensesTab />}

      {activeTab === 'old_table' && (
        <div className="flex-1 flex flex-col min-h-0">
          <iframe
            src="https://docs.google.com/spreadsheets/d/e/2PACX-1vTbSGGOVXESrSzFqHyFXdGNbpW_s7O6AVR8JF8MLzSXsLpJ5XCv3syW038Vp0pIapEWfYJ35hDXH_GJ/pubhtml?gid=584902190&widget=true&headers=false"
            className="flex-1 w-full border-0"
            title="ÃÂÃÂÃÂÃÂ ÃÂÃÂ©ÃÂ ÃÂ"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}
