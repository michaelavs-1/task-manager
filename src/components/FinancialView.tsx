'use client'
import { useState, useEffect, Fragment, useRef } from 'react'
import { useEsc } from '../hooks/useEsc'

export type FinTab = 'dashboard' | 'old_table' | 'suppliers' | 'invoices' | 'clients' | 'projects' | 'expenses' | 'authority_payments'

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
  'taxable': 'bg-emerald-100 text-emerald-700',
  'exempt': 'bg-lime-100 text-lime-700',
  'מורשה': 'bg-teal-100 text-teal-700',
  'פטור': 'bg-sky-100 text-sky-700',
}

type SupExpense = { supplier: string; description: string; month: string; amount: number; total: number; paid: number; payment_date: string; has_invoice: boolean }

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [expenses, setExpenses] = useState<SupExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/monday-suppliers').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json()),
    ]).then(([supData, expData]) => {
      if (supData.error) setError(supData.error)
      else setSuppliers(supData.suppliers || [])
      setExpenses((expData.expenses || []).map((ex: { supplier: string; description: string; month: string; amount: number; total: number; paid: number; payment_date: string; has_invoice: boolean }) => ({
        supplier: ex.supplier,
        description: ex.description || '',
        month: ex.month || '',
        amount: ex.amount || 0,
        total: ex.total || 0,
        paid: ex.paid || 0,
        payment_date: ex.payment_date || '',
        has_invoice: ex.has_invoice || false,
      })))
    })
    .catch(() => setError('שגיאה בטעינת נתונים'))
    .finally(() => setLoading(false))
  }, [])

  const supTotals = (name: string) => {
    const rows = expenses.filter(ex => ex.supplier === name)
    return {
      total: rows.reduce((s, ex) => s + ex.total, 0),
      paid: rows.reduce((s, ex) => s + ex.paid, 0),
      count: rows.length,
      rows,
    }
  }
  const fmtS = (n: number) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—'

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
      <div className="text-gray-400 text-sm">טוען ספקים מ-Monday.com...</div>
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
          placeholder="חפש ספק, מייל, טלפון, ת.ז..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">כל התפקידים</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">כל המחלקות</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="">כל הסטטוסים</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-sm text-gray-400 whitespace-nowrap">{filtered.length} / {suppliers.length} ספקים</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-right font-semibold">שם ספק</th>
              <th className="px-4 py-3 text-right font-semibold">ת.ז / ח.פ</th>
              <th className="px-4 py-3 text-right font-semibold">סטטוס מס</th>
              <th className="px-4 py-3 text-right font-semibold">תפקיד</th>
              <th className="px-4 py-3 text-right font-semibold">מחלקה</th>
              <th className="px-4 py-3 text-right font-semibold">טלפון</th>
              <th className="px-4 py-3 text-right font-semibold">אימייל</th>
              <th className="px-4 py-3 text-right font-semibold">בנק</th>
              <th className="px-4 py-3 text-right font-semibold">חשבון</th>
              <th className="px-4 py-3 text-center font-semibold">מסמכים</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-12 text-gray-400">לא נמצאו ספקים</td>
              </tr>
            ) : filtered.flatMap((s, i) => {
              const isOpen = expandedId === s.id
              const t = supTotals(s.name)
              const balance = t.total - t.paid
              return [
                <tr
                  key={s.id}
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                  className={`border-b border-gray-100 hover:bg-indigo-50 cursor-pointer transition-colors ${isOpen ? 'bg-indigo-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                      <div>
                        <div className="font-semibold text-gray-800">{s.name}</div>
                        {(s.firstName || s.lastName) && (
                          <div className="text-xs text-gray-400">{s.firstName} {s.lastName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.idNumber || '—'}</td>
                  <td className="px-4 py-3">
                    {s.taxStatus ? (
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${TAX_STATUS_STYLE[s.taxStatus] || 'bg-gray-100 text-gray-600'}`}>
                        {s.taxStatus}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.role || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{s.department || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {s.phone ? (
                      <a href={`tel:${s.phone}`} onClick={e => e.stopPropagation()} className="hover:text-indigo-600">
                        {s.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {s.email ? (
                      <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="hover:text-indigo-600 truncate block max-w-[180px]">
                        {s.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[140px] truncate">
                    {s.bank ? s.bank.replace(/^\d+ — /, '') : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.accountNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      <span title="אישור ניהול ספרים" className={`w-2 h-2 rounded-full ${s.hasBooksCert ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                      <span title="אישור ניהול חשבון" className={`w-2 h-2 rounded-full ${s.hasAccountCert ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                    </div>
                  </td>
                </tr>,
                isOpen ? (
                  <tr key={`${s.id}-accordion`} className="bg-indigo-50/70">
                    <td colSpan={10} className="px-6 py-4">
                      {/* Summary bar */}
                      <div className="flex gap-6 mb-3 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <span className="text-xs text-gray-400">סה&quot;כ חויב:</span>
                          <span className="font-semibold text-indigo-700">{fmtS(t.total)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <span className="text-xs text-gray-400">שולם:</span>
                          <span className="font-semibold text-emerald-600">{fmtS(t.paid)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400">יתרה לתשלום:</span>
                          <span className={`font-semibold ${balance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {balance > 0 ? fmtS(balance) : '✔ שולם'}
                          </span>
                        </div>
                      </div>
                      {/* Payments table */}
                      {t.count === 0 ? (
                        <div className="text-xs text-gray-400 py-2">אין תשלומים רשומים לספק זה</div>
                      ) : (
                        <table className="w-full text-xs border-collapse rounded-xl overflow-hidden">
                          <thead>
                            <tr className="bg-indigo-100 text-indigo-700">
                              <th className="px-3 py-2 text-right font-semibold">חודש</th>
                              <th className="px-3 py-2 text-right font-semibold">תיאור</th>
                              <th className="px-3 py-2 text-right font-semibold">סכום</th>
                              <th className="px-3 py-2 text-right font-semibold">שולם</th>
                              <th className="px-3 py-2 text-right font-semibold">יתרה לתשלום</th>
                              <th className="px-3 py-2 text-right font-semibold">תאריך תשלום</th>
                              <th className="px-3 py-2 text-center font-semibold">חשבונית</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.rows.map((ex, ri) => {
                              const rowBal = ex.total - ex.paid
                              return (
                                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-indigo-50/40'}>
                                  <td className="px-3 py-2 text-gray-600">{ex.month || '—'}</td>
                                  <td className="px-3 py-2 text-gray-700 max-w-[220px] truncate">{ex.description || '—'}</td>
                                  <td className="px-3 py-2 font-mono text-gray-800">{fmtS(ex.total)}</td>
                                  <td className="px-3 py-2 font-mono text-emerald-600">{fmtS(ex.paid)}</td>
                                  <td className={`px-3 py-2 font-mono font-semibold ${rowBal > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {rowBal > 0 ? fmtS(rowBal) : '✔'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-500 font-mono">{ex.payment_date || '—'}</td>
                                  <td className="px-3 py-2 text-center">
                                    {ex.has_invoice
                                      ? <span className="text-emerald-500 font-bold">✔</span>
                                      : <span className="text-gray-300">—</span>
                                    }
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                ) : null
              ].filter(Boolean)
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}

// ── Financial Dashboard ───────────────────────────────────────────────────────
const MONTH_NAMES_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

// All months 2025-01 → 2026-12 (used in InvoicesTab + ExpensesTab to pad empty months)
const ALL_MONTHS_FULL: { key: string; label: string }[] = (() => {
  const list: { key: string; label: string }[] = []
  for (let y = 2025; y <= 2026; y++) {
    for (let mo = 1; mo <= 12; mo++) {
      const key = `${y}-${String(mo).padStart(2,'0')}`
      list.push({ key, label: `${MONTH_NAMES_HE[mo-1]} ${y}` })
    }
  }
  return list
})()

function fmt(n: number) {
  return '₪' + Math.round(n).toLocaleString('he-IL')
}

type GlSummary = {
  revenue: number; costOfRevenue: number; opExpenses: number; totalExpenses: number
  grossProfit: number; netProfit: number
  bank: number; receivables: number; payables: number
  vatOutput: number; vatInput: number; vatNet: number; taxWithheldOnUs: number
}

function FinancialDashboard() {
  const [invoices, setInvoices] = useState<FinDashInvoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [gl, setGl] = useState<GlSummary | null>(null)
  const [glLoading, setGlLoading] = useState(true)
  const [hoveredBar, setHoveredBar] = useState<string | null>(null)
  const [cfOpenMonth, setCfOpenMonth] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/invoices').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json()),
    ])
      .then(([invData, expData]) => {
        setInvoices(invData.invoices || [])
        setExpenses(expData.expenses || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    fetch('/api/accounting/balances')
      .then(r => r.json())
      .then(d => { if (d.summary) setGl(d.summary) })
      .catch(() => {})
      .finally(() => setGlLoading(false))
  }, [])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>טוען נתונים...</div>
    </div>
  )

  // ── KPIs ──
  const totalRevenue   = invoices.reduce((s, i) => s + (i.before_vat || 0), 0)
  const totalPaid      = invoices.reduce((s, i) => s + (i.paid || 0), 0)
  const totalWithheld  = invoices.reduce((s, i) => s + (i.tax_withheld || 0), 0)
  const totalRemain    = Math.max(0, totalRevenue - totalPaid - totalWithheld)
  const openCount      = invoices.filter(i => (i.total - i.paid - (i.tax_withheld || 0)) > 0).length

  // Expenses KPIs (for top-level "everything at a glance" overview)
  const totalExpNet = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalExpVat = expenses.reduce((s, e) => s + (e.vat || 0), 0)

  // VAT owed: VAT collected on revenue minus VAT paid on expenses
  const totalRevenueVat = invoices.reduce((s, i) => s + ((i.total || 0) - (i.before_vat || 0)), 0)
  const vatBalance      = totalRevenueVat - totalExpVat

  // Gross profit = revenue (net) − expenses (net)
  const grossProfit    = totalRevenue - totalExpNet
  const grossProfitPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  // Collection rate
  const collectionPct  = totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0

  // ── Monthly breakdown ──
  type MonthData = { label: string; sortKey: string; revenue: number; paid: number; withheld: number; count: number; expenses: number }
  const monthMap: Record<string, MonthData> = {}
  invoices.forEach(inv => {
    if (!inv.date) return
    const d = new Date(israeliToISO(inv.date))
    if (isNaN(d.getTime())) return
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    if (!monthMap[key]) monthMap[key] = { label: `${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`, sortKey: key, revenue: 0, paid: 0, withheld: 0, count: 0, expenses: 0 }
    monthMap[key].revenue  += inv.before_vat || 0
    monthMap[key].paid     += inv.paid  || 0
    monthMap[key].withheld += inv.tax_withheld || 0
    monthMap[key].count    += 1
  })
  // Merge expenses into monthMap (using expense.month key like "2026-01")
  expenses.forEach(e => {
    if (!e.month) return
    const key = e.month
    if (monthMap[key]) {
      monthMap[key].expenses += e.amount || 0
    } else {
      const [y, mo] = key.split('-')
      const monthIdx = parseInt(mo) - 1
      monthMap[key] = { label: `${MONTH_NAMES_HE[monthIdx]} ${y}`, sortKey: key, revenue: 0, paid: 0, withheld: 0, count: 0, expenses: e.amount || 0 }
    }
  })
  const months = Object.values(monthMap).sort((a,b) => a.sortKey.localeCompare(b.sortKey)).slice(-12)

  // ── Top clients ──
  const clientMap: Record<string, { name: string; revenue: number; paid: number }> = {}
  invoices.forEach(inv => {
    const name = inv.client || 'לא מוגדר'
    if (!clientMap[name]) clientMap[name] = { name, revenue: 0, paid: 0 }
    clientMap[name].revenue += inv.before_vat || 0
    clientMap[name].paid    += inv.paid  || 0
  })
  const topClients = Object.values(clientMap).sort((a,b) => b.revenue - a.revenue).slice(0, 8)

  // ── Bar chart helpers ──
  const maxRev = Math.max(...months.map(m => Math.max(m.revenue, m.expenses)), 1)

  // ── Donut helper ──
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

      {/* ── GL — מקור האמת ── */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid #6366f1', boxShadow: '0 0 0 3px rgba(99,102,241,0.07)' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>מאזן ניהולי — נתוני האמת (GL)</h2>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>יתרות מוצהרות</span>
          {glLoading && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>טוען...</span>}
        </div>
        {gl && !glLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'הכנסות',        value: fmt(gl.revenue),         color: '#6366f1' },
              { label: 'עלות המכר',     value: fmt(gl.costOfRevenue),   color: '#ef4444' },
              { label: 'הוצ׳ תפעוליות', value: fmt(gl.opExpenses),      color: '#f97316' },
              { label: 'רווח גולמי',    value: fmt(gl.grossProfit),     color: gl.grossProfit >= 0 ? '#10b981' : '#ef4444' },
              { label: 'בנק',           value: fmt(gl.bank),            color: '#3b82f6' },
              { label: 'חייבים',        value: fmt(gl.receivables),     color: '#f59e0b' },
              { label: 'מע״מ נטו',      value: fmt(Math.abs(gl.vatNet)), color: gl.vatNet >= 0 ? '#f59e0b' : '#10b981',
                sub: gl.vatNet >= 0 ? 'לתשלום' : 'להחזר' },
            ].map(c => (
              <div key={c.label} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.label}</span>
                </div>
                <div className="text-base font-bold tracking-tight" style={{ color: c.color }}>{c.value}</div>
                {c.sub && <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.sub}</div>}
              </div>
            ))}
          </div>
        ) : !glLoading ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>אין נתוני GL — הרץ את תהליך הבקפיל כדי ליצור רשומות יומן</p>
        ) : null}
      </div>

      {/* ── KPI Cards — full financial snapshot ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          // Row 1 — headline P&L picture (all values before VAT, matching revenue convention)
          { label: 'הכנסות (לפני מע״מ)',  value: fmt(totalRevenue),  color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
          { label: 'הוצאות (לפני מע״מ)',  value: fmt(totalExpNet),   color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'רווח גולמי',          value: fmt(grossProfit),   color: grossProfit >= 0 ? '#10b981' : '#ef4444', bg: grossProfit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', sub: `${grossProfitPct.toFixed(1)}% מההכנסות` },
          { label: 'יתרת מע"מ',       value: fmt(vatBalance),    color: vatBalance >= 0 ? '#f59e0b' : '#10b981', bg: 'rgba(245,158,11,0.08)', sub: vatBalance >= 0 ? 'לתשלום' : 'להחזר' },
          // Row 2 — cashflow / collection picture
          { label: 'תשלומים',          value: fmt(totalPaid),     color: '#10b981', bg: 'rgba(16,185,129,0.08)', sub: `${collectionPct.toFixed(0)}% נגבה` },
          { label: 'נותר לגבייה',      value: fmt(totalRemain),   color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
          { label: 'ניכוי מס במקור',   value: fmt(totalWithheld), color: '#a855f7', bg: 'rgba(168,85,247,0.08)', sub: totalRevenue > 0 ? `${(totalWithheld / totalRevenue * 100).toFixed(1)}% מההכנסות` : undefined },
          { label: 'חשבוניות פתוחות',  value: String(openCount),  color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{card.label}</span>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: card.color }} />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold tracking-tight" style={{ color: card.color }}>{card.value}</div>
            </div>
            {card.sub && (
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{card.sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* ── צפי תזרימי ── */}
      {(() => {
        type CfRow = { inv: FinDashInvoice; remaining: number }
        type CfExpRow = { supplier: string; description: string; unpaid: number }
        type CfMonth = { key: string; label: string; rows: CfRow[]; total: number; expRows: CfExpRow[]; expTotal: number }
        const cfMap: Record<string, CfMonth> = {}
        invoices.forEach(inv => {
          const remaining = Math.round(((inv.total || 0) - (inv.paid || 0) - (inv.tax_withheld || 0)) * 100) / 100
          if (remaining < 1) return
          const key = israeliToMonthKey(inv.payment_date || '')
          if (!key) return
          if (!cfMap[key]) {
            const [y, m] = key.split('-')
            cfMap[key] = { key, label: `${MONTH_NAMES_HE[parseInt(m)-1]} ${y}`, rows: [], total: 0, expRows: [], expTotal: 0 }
          }
          cfMap[key].rows.push({ inv, remaining })
          cfMap[key].total += remaining
        })
        // Aggregate unpaid expenses per month
        expenses.forEach(exp => {
          if (!exp.month) return
          const key = exp.month
          const unpaid = Math.round(((exp.total || 0) - (exp.paid || 0)) * 100) / 100
          if (unpaid <= 0) return
          if (!cfMap[key]) {
            const [y, m] = key.split('-')
            const mIdx = parseInt(m) - 1
            if (mIdx < 0 || mIdx > 11) return
            cfMap[key] = { key, label: `${MONTH_NAMES_HE[mIdx]} ${y}`, rows: [], total: 0, expRows: [], expTotal: 0 }
          }
          cfMap[key].expRows.push({ supplier: exp.supplier || '—', description: exp.description || '—', unpaid })
          cfMap[key].expTotal += unpaid
        })
        const cfMonths = Object.values(cfMap).sort((a, b) => a.key.localeCompare(b.key))
        if (cfMonths.length === 0) return null
        const grandIncome = cfMonths.reduce((s, m) => s + m.total, 0)
        const grandExp    = cfMonths.reduce((s, m) => s + m.expTotal, 0)
        const grandNet    = grandIncome - grandExp

        return (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid #6366f1', boxShadow: '0 0 0 3px rgba(99,102,241,0.06)' }}>
            {/* Header */}
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>צפי תזרימי</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>תזרים צפוי לפי חודש — רק תשלומים שטרם בוצעו</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-secondary)' }}>סיכום נטו</div>
                <span className="text-base font-bold" style={{ color: grandNet >= 0 ? '#6366f1' : '#ef4444' }}>{fmt(grandNet)}</span>
              </div>
            </div>
            {/* Summary cards row */}
            <div className="flex gap-3 px-5 py-4 overflow-x-auto">
              {cfMonths.map(mo => {
                const isOpen = cfOpenMonth === mo.key
                const net = mo.total - mo.expTotal
                return (
                  <button
                    key={mo.key}
                    onClick={() => setCfOpenMonth(isOpen ? null : mo.key)}
                    className="flex-shrink-0 rounded-xl px-4 py-3 text-right transition-all"
                    style={{
                      background: isOpen ? '#6366f1' : 'var(--bg-secondary)',
                      border: `1.5px solid ${isOpen ? '#6366f1' : 'var(--border-color)'}`,
                      minWidth: 148,
                    }}
                  >
                    <div className="text-xs font-semibold mb-1.5" style={{ color: isOpen ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>{mo.label}</div>
                    {mo.total > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[9px]" style={{ color: isOpen ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)' }}>תשלומים מלקוחות</div>
                        <div className="text-sm font-bold" style={{ color: isOpen ? '#a5f3b0' : '#10b981' }}>{fmt(mo.total)}</div>
                      </div>
                    )}
                    {mo.expTotal > 0 && (
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <div className="text-[9px]" style={{ color: isOpen ? 'rgba(255,255,255,0.55)' : 'var(--text-secondary)' }}>תשלומי ספקים</div>
                        <div className="text-sm font-bold" style={{ color: isOpen ? '#fca5a5' : '#ef4444' }}>{fmt(mo.expTotal)}</div>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5" style={{ borderTop: `1px solid ${isOpen ? 'rgba(255,255,255,0.2)' : 'var(--border-color)'}` }}>
                      <div className="text-[9px] font-semibold" style={{ color: isOpen ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>סיכום</div>
                      <div className="text-sm font-bold" style={{ color: isOpen ? '#fff' : (net >= 0 ? '#6366f1' : '#ef4444') }}>{fmt(net)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
            {/* Accordion detail */}
            {cfOpenMonth && cfMap[cfOpenMonth] && (
              <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                {/* Income rows */}
                {cfMap[cfOpenMonth].rows.length > 0 && (
                  <>
                    <div className="text-xs font-bold mb-2" style={{ color: '#10b981' }}>תשלומים מלקוחות</div>
                    <table className="w-full text-xs mb-4">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          {['לקוח', 'מס׳ חשבונית', 'יתרה לגבייה'].map(h => (
                            <th key={h} className="py-2 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cfMap[cfOpenMonth].rows.map(({ inv, remaining }) => (
                          <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{inv.client || '—'}</td>
                            <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_num || '—'}</td>
                            <td className="py-2 font-bold text-left" style={{ color: '#10b981' }}>{fmt(remaining)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="pt-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>סה"כ תשלומים מלקוחות</td>
                          <td className="pt-2 font-bold text-left" style={{ color: '#10b981' }}>{fmt(cfMap[cfOpenMonth].total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                )}
                {/* Expense rows */}
                {cfMap[cfOpenMonth].expRows.length > 0 && (
                  <>
                    <div className="text-xs font-bold mb-2" style={{ color: '#ef4444' }}>תשלומי ספקים</div>
                    <table className="w-full text-xs mb-4">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          {['ספק', 'תיאור', 'יתרה לתשלום'].map(h => (
                            <th key={h} className="py-2 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cfMap[cfOpenMonth].expRows.map((er, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{er.supplier}</td>
                            <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{er.description}</td>
                            <td className="py-2 font-bold text-left" style={{ color: '#ef4444' }}>{fmt(er.unpaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="pt-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>סה"כ תשלומי ספקים</td>
                          <td className="pt-2 font-bold text-left" style={{ color: '#ef4444' }}>{fmt(cfMap[cfOpenMonth].expTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                )}
                {/* Net summary row */}
                <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1.5px solid var(--border-color)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>סיכום נטו — {cfMap[cfOpenMonth].label}</span>
                  <span className="text-sm font-bold" style={{ color: (cfMap[cfOpenMonth].total - cfMap[cfOpenMonth].expTotal) >= 0 ? '#6366f1' : '#ef4444' }}>
                    {fmt(cfMap[cfOpenMonth].total - cfMap[cfOpenMonth].expTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Bar chart - monthly revenue + expenses */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>הכנסות והוצאות לפי חודש</h3>
          {months.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>אין נתונים</div>
          ) : (
            <div className="flex items-end gap-1.5 overflow-x-auto" style={{ height: 168, paddingTop: 32 }}>
              {months.map(m => {
                const revH  = Math.round((m.revenue  / maxRev) * 130)
                const paidH = Math.round((m.paid     / maxRev) * 130)
                const expH  = Math.round((m.expenses / maxRev) * 130)
                const profit = m.revenue - m.expenses
                return (
                  <div key={m.sortKey} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]"
                    onMouseEnter={() => setHoveredBar(m.sortKey)}
                    onMouseLeave={() => setHoveredBar(null)}>
                    <div className="relative w-full flex gap-0.5 items-end" style={{ height: 130 }}>
                      {/* Tooltip — absolute so it doesn't affect layout */}
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg transition-opacity z-20 pointer-events-none ${hoveredBar === m.sortKey ? 'opacity-100' : 'opacity-0'}`}
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: 10 }}>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span style={{ color: '#6366f1' }}>הכנסות: {fmt(m.revenue)}</span>
                          <span style={{ color: '#ef4444' }}>הוצאות: {fmt(m.expenses)}</span>
                          <span style={{ color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>רווח: {fmt(profit)}</span>
                        </div>
                      </div>
                      {/* Revenue side (left) */}
                      <div className="relative flex-1 flex flex-col justify-end" style={{ height: 130 }}>
                        {/* Revenue bg */}
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all" style={{ height: revH, background: 'rgba(99,102,241,0.22)', border: '1px solid rgba(99,102,241,0.35)' }} />
                        {/* Paid solid */}
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all" style={{ height: paidH, background: 'linear-gradient(to top, #6366f1, #818cf8)' }} />
                      </div>
                      {/* Expenses side (right) */}
                      <div className="relative flex-1 flex flex-col justify-end" style={{ height: 130 }}>
                        <div className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all" style={{ height: expH, background: expH > 0 ? 'rgba(239,68,68,0.55)' : 'transparent', border: expH > 0 ? '1px solid rgba(239,68,68,0.5)' : 'none' }} />
                      </div>
                    </div>
                    <span className="text-center leading-tight" style={{ color: 'var(--text-secondary)', fontSize: 9 }}>{m.label.split(' ')[0]}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(99,102,241,0.35)' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>הכנסות</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: '#6366f1' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>תשלומים</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: 'rgba(239,68,68,0.55)' }} /><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>הוצאות</span></div>
          </div>
        </div>

        {/* Donut - paid vs remaining */}
        <div className="rounded-2xl p-5 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h3 className="text-sm font-semibold self-start" style={{ color: 'var(--text-primary)' }}>סטטוס גבייה</h3>
          <svg viewBox="0 0 112 112" className="w-28 h-28">
            <DonutArc pct={1}         color="rgba(239,68,68,0.15)"  r={44} stroke={12} />
            <DonutArc pct={paidPct}   color="#10b981"                r={44} stroke={12} />
            <text x="56" y="52" textAnchor="middle" fontSize="13" fontWeight="700" fill="#10b981">{Math.round(paidPct * 100)}%</text>
            <text x="56" y="66" textAnchor="middle" fontSize="8" fill="var(--text-secondary)">תשלומים</text>
          </svg>
          <div className="w-full space-y-2">
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>תשלומים</span>
              <span className="font-semibold" style={{ color: '#10b981' }}>{fmt(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>נותר</span>
              <span className="font-semibold" style={{ color: '#ef4444' }}>{fmt(totalRemain)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly table */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>פירוט חודשי</h3>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['חודש','הכנסות','הוצאות','רווח','תשלומים','ניכוי מס','נותר','חשבוניות'].map(h => (
                    <th key={h} className="px-3 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m, i) => {
                  const rem    = m.revenue - m.paid - m.withheld
                  const profit = m.revenue - m.expenses
                  return (
                    <tr key={m.sortKey} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-3 py-2.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{m.revenue > 0 ? fmt(m.revenue) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#ef4444' }}>{m.expenses > 0 ? fmt(m.expenses) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-bold" style={{ color: profit >= 0 ? '#10b981' : '#ef4444' }}>{m.revenue > 0 || m.expenses > 0 ? fmt(profit) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#10b981' }}>{m.paid > 0 ? fmt(m.paid) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: '#a855f7' }}>{m.withheld > 0 ? fmt(m.withheld) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: rem > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{rem > 0 ? fmt(rem) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{m.count || '—'}</td>
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
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>לקוחות מובילים</h3>
          </div>
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['לקוח','הכנסות','שולם','נותר'].map(h => (
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

      {/* ── Monthly Revenue vs Expenses Table ── */}
      {(() => {
        const expenseMonthMap: Record<string, { net: number; vat: number; total: number }> = {}
        expenses.forEach(exp => {
          const month = exp.month || ''
          if (!expenseMonthMap[month]) expenseMonthMap[month] = { net: 0, vat: 0, total: 0 }
          expenseMonthMap[month].net += exp.amount || 0
          expenseMonthMap[month].vat += exp.vat || 0
          expenseMonthMap[month].total += exp.total || 0
        })

        const monthlyComparison = months.map(m => {
          const [y, mo] = m.sortKey.split('-')
          const expData = expenseMonthMap[`${y}-${mo}`] || { net: 0, vat: 0, total: 0 }
          const profit = m.revenue - expData.net
          return { month: m.label, revenue: m.revenue, expenses: expData.net, profit, sortKey: m.sortKey }
        }).sort((a, b) => a.sortKey.localeCompare(b.sortKey))

        return monthlyComparison.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>הכנסות מול הוצאות</h3>
            </div>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['חודש','הכנסות','הוצאות','רווח גולמי'].map(h => (
                      <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyComparison.map((m, i) => (
                    <tr key={m.sortKey} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.month}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmt(m.revenue)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#ef4444' }}>{fmt(m.expenses)}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: m.profit > 0 ? '#10b981' : '#f59e0b' }}>{fmt(m.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      })()}

      {/* ── VAT Report Section ── */}
      {(() => {
        const vatMonthMap: Record<string, { incomeVat: number; expenseVat: number }> = {}

        // Calculate VAT from invoices
        invoices.forEach(inv => {
          if (!inv.date) return
          const d = new Date(israeliToISO(inv.date))
          if (isNaN(d.getTime())) return
          const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
          if (!vatMonthMap[key]) vatMonthMap[key] = { incomeVat: 0, expenseVat: 0 }
          vatMonthMap[key].incomeVat += (inv.total - inv.before_vat) || 0
        })

        // Calculate VAT from expenses
        expenses.forEach(exp => {
          const [y, mo] = (exp.month || '').split('-')
          if (!y || !mo) return
          const key = `${y}-${String(parseInt(mo)).padStart(2,'0')}`
          if (!vatMonthMap[key]) vatMonthMap[key] = { incomeVat: 0, expenseVat: 0 }
          vatMonthMap[key].expenseVat += exp.vat || 0
        })

        const vatReport = Object.entries(vatMonthMap).map(([key, data]) => {
          const [y, mo] = key.split('-')
          const label = `${MONTH_NAMES_HE[parseInt(mo) - 1]} ${y}`
          const balance = data.incomeVat - data.expenseVat
          return { month: label, incomeVat: data.incomeVat, expenseVat: data.expenseVat, balance, sortKey: key }
        }).sort((a, b) => a.sortKey.localeCompare(b.sortKey))

        return vatReport.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>דו״ח מע״מ</h3>
            </div>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    {['חודש','מע"מ הכנסות','מע"מ הוצאות','יתרת מע"מ'].map(h => (
                      <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vatReport.map((r, i) => (
                    <tr key={r.sortKey} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.month}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmt(r.incomeVat)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: '#ef4444' }}>{fmt(r.expenseVat)}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: r.balance > 0 ? '#f59e0b' : '#10b981' }}>{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null
      })()}

      {/* ── Monthly Accordion ── */}
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
  const months = Object.entries(monthMap).sort((a,b) => a[0].localeCompare(b[0]))

  if (months.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold px-1" style={{ color: 'var(--text-primary)' }}>חשבוניות לפי חודש</h3>
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
              <span className="flex-shrink-0 text-xs transition-transform duration-200" style={{ color: 'var(--text-secondary)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>

              {/* Month label */}
              <span className="font-semibold text-sm w-36 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>{label}</span>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{invs.length} חשבוניות</span>

              {/* Summary pills */}
              <div className="flex-1 flex gap-3 justify-end flex-wrap">
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>סה"כ</span>
                  <span className="text-xs font-bold" style={{ color: '#6366f1' }}>{fmt(totalRev)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>מע"מ</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(totalVat)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>שולם</span>
                  <span className="text-xs font-bold" style={{ color: '#10b981' }}>{fmt(totalPaid)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>נותר</span>
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
                      {['מס׳','לקוח','סוג','לפני מע"מ','סה"כ','שולם','נותר','סטטוס'].map(h => (
                        <th key={h} className="px-4 py-2 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invs.map((inv, i) => {
                      const rem = (inv.total || 0) - (inv.paid || 0)
                      const status = rem <= 0 ? 'paid' : inv.paid > 0 ? 'partial' : 'unpaid'
                      const statusLabel = { paid: 'שולם', partial: 'חלקי', unpaid: 'ממתין' }[status]
                      const statusStyle = { paid: { bg: '#d1fae5', color: '#065f46' }, partial: { bg: '#fef3c7', color: '#92400e' }, unpaid: { bg: '#fee2e2', color: '#991b1b' } }[status]
                      return (
                        <tr key={inv.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_num}</td>
                          <td className="px-4 py-2.5 text-xs max-w-[160px] truncate" style={{ color: 'var(--text-primary)' }}>{inv.client || '—'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.doc_type || '—'}</td>
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
interface FinDashInvoice { id: number; invoice_num: string; date: string; before_vat: number; total: number; paid: number; tax_withheld?: number; client: string; doc_type: string; payment_date?: string }

// ── Shared types + helpers ────────────────────────────────────────────────────
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
  tax_withheld: number
  payment_date: string
  notes: string
  status?: string   // explicit override: 'cancelled' | null/'' = auto-calculate
}

const STATUS_LABEL: Record<string, string> = { paid: 'שולם', partial: 'חלקי', unpaid: 'ממתין', cancelled: 'מבוטל' }
const STATUS_STYLE: Record<string, string> = {
  paid:      'bg-emerald-100 text-emerald-700',
  partial:   'bg-amber-100 text-amber-700',
  unpaid:    'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
}

function roundCents(n: number) { return Math.round(n * 100) / 100 }
function invoiceStatus(inv: InvoiceRow): 'paid' | 'partial' | 'unpaid' | 'cancelled' {
  if (inv.status === 'cancelled') return 'cancelled'
  // Tax withheld at source counts toward "fully paid" even though it didn't land in our account
  const settled = (inv.paid || 0) + (inv.tax_withheld || 0)
  const remaining = roundCents(inv.total - settled)
  // Use absolute value for remaining so negative invoices (credit notes) are handled correctly
  if (Math.abs(remaining) < 1) return 'paid'
  if (inv.total > 0 && settled > 0) return 'partial'
  if (inv.total < 0 && settled < 0) return 'partial'
  return 'unpaid'
}

// ── ClientPicker — searchable dropdown for inline client reassignment ──
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
  const [hlIdx, setHlIdx] = useState(-1)
  const listRef = useRef<HTMLUListElement>(null)
  const matches = clientList.filter(c => c.name.toLowerCase().includes(q.toLowerCase()))

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHlIdx(i => {
        const next = Math.min(i + 1, matches.length - 1)
        listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHlIdx(i => {
        const prev = Math.max(i - 1, 0)
        listRef.current?.children[prev]?.scrollIntoView({ block: 'nearest' })
        return prev
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = hlIdx >= 0 ? matches[hlIdx] : chosen
      if (target) onSave(target)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="absolute z-50 right-0 top-full mt-1 w-72 bg-white border border-indigo-200 rounded-2xl shadow-2xl p-3 space-y-2" dir="rtl">
      <input
        autoFocus
        value={q}
        onChange={e => { setQ(e.target.value); setHlIdx(-1) }}
        onKeyDown={handleKeyDown}
        placeholder="חפש לקוח..."
        className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <ul ref={listRef} className="max-h-52 overflow-y-auto space-y-0.5">
        {matches.length === 0 && <li className="text-xs text-gray-400 text-center py-3">לא נמצאו תוצאות</li>}
        {matches.map((c, idx) => (
          <li
            key={c.id}
            onClick={() => { setChosen(c); onSave(c) }}
            className={`px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-colors ${
              idx === hlIdx ? 'bg-indigo-200 text-indigo-800 font-semibold'
              : chosen?.id === c.id ? 'bg-indigo-100 text-indigo-700 font-semibold'
              : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            {c.name}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => { if (chosen) onSave(chosen) }}
          disabled={!chosen && hlIdx < 0}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
        >
          שמור
        </button>
        <button onClick={onClose} className="flex-1 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ביטול</button>
      </div>
    </div>
  )
}


// ── ProjectPicker — inline project assignment dropdown ──
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
        placeholder="חפש פרויקט..."
        className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      <ul className="max-h-56 overflow-y-auto space-y-0.5">
        <li
          onClick={() => setChosen(null)}
          className={`px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors italic ${chosen === null ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-400'}`}
        >ללא שיוך</li>
        {artists.length > 0 && <li className="px-3 pt-2 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wide">אומנים</li>}
        {artists.map(p => (
          <li key={p.id} onClick={() => setChosen(p.id)}
            className={`px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-colors ${chosen === p.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
            {p.name}
          </li>
        ))}
        {productions.length > 0 && <li className="px-3 pt-2 pb-0.5 text-xs font-bold text-gray-400 uppercase tracking-wide">הפקות</li>}
        {productions.map(p => (
          <li key={p.id} onClick={() => setChosen(p.id)}
            className={`px-3 py-1.5 rounded-xl text-sm cursor-pointer transition-colors ${chosen === p.id ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}>
            {p.name}
          </li>
        ))}
        {filtered.length === 0 && <li className="text-xs text-gray-400 text-center py-3">לא נמצאו תוצאות</li>}
      </ul>
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        <button
          onClick={() => {
            const proj = projectList.find(p => p.id === chosen)
            onSave(chosen, proj?.name || null)
          }}
          className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white transition-colors"
          style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}
        >שמור</button>
        <button onClick={onClose} className="flex-1 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ביטול</button>
      </div>
    </div>
  )
}

// ── IssuedByPicker — inline employee picker ──
const TEAM_MEMBERS = ['מיכאל', 'דן', 'דעיה']
function IssuedByPicker({ current, onSave, onClose }: {
  current: string
  onSave: (name: string) => void
  onClose: () => void
}) {
  return (
    <div className="absolute z-50 right-0 top-full mt-1 bg-white border border-indigo-200 rounded-2xl shadow-2xl p-3 space-y-1.5 min-w-[140px]" dir="rtl">
      {TEAM_MEMBERS.map(name => (
        <button
          key={name}
          onClick={() => onSave(name)}
          className={`w-full text-right px-3 py-2 rounded-xl text-sm font-medium transition-colors ${current === name ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'}`}
        >
          {name}
        </button>
      ))}
      <div className="pt-1 border-t border-gray-100">
        <button onClick={onClose} className="w-full py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ביטול</button>
      </div>
    </div>
  )
}

const EMPTY_FORM: Omit<InvoiceRow, 'id'> = {
  client_id: null, project_id: null, issued_by: '', sent_to: '', date: '', doc_type: '',
  invoice_num: '', client: '', before_vat: 0, total: 0, paid: 0, tax_withheld: 0, payment_date: '', notes: '',
}

type InvoiceForm = Omit<InvoiceRow, 'id'>

// ── ModalField — defined OUTSIDE InvoiceModal so it never remounts on re-render ──
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

// Date helpers: "D.M.YY" or "D.M" ↔ "YYYY-MM-DD"
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
    // No year supplied — infer: if the date would be >30 days in the future, use prev year
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

// ── Payment-month helpers ──────────────────────────────────────────────────
/** Convert Israeli date (dd.mm.yy) → YYYY-MM month key */
function israeliToMonthKey(d: string): string {
  if (!d) return ''
  const iso = israeliToISO(d)
  return iso ? iso.slice(0, 7) : ''
}
/** Convert YYYY-MM month key → Israeli "01.M.YYYY" (first of month) */
function monthKeyToIsraeli(key: string): string {
  if (!key) return ''
  return isoToIsraeli(`${key}-01`)
}
/** Hebrew display label for a payment_date (Israeli string) → e.g. "מרץ 2026" */
function paymentMonthLabel(payment_date: string): string {
  if (!payment_date) return '—'
  const key = israeliToMonthKey(payment_date)
  if (!key) return '—'
  const [y, m] = key.split('-')
  const idx = parseInt(m) - 1
  if (idx < 0 || idx > 11) return '—'
  return `${MONTH_NAMES_HE[idx]} ${y}`
}
/** 12 months of options starting from startKey (YYYY-MM), or today's month */
function paymentMonthOptions(startKey: string): { key: string; label: string }[] {
  let sy: number, sm: number
  if (startKey && /^\d{4}-\d{2}$/.test(startKey)) {
    [sy, sm] = startKey.split('-').map(Number)
  } else {
    const n = new Date(); sy = n.getFullYear(); sm = n.getMonth() + 1
  }
  const opts: { key: string; label: string }[] = []
  for (let i = 0; i < 12; i++) {
    let mo = sm + i; let yr = sy
    while (mo > 12) { mo -= 12; yr++ }
    const key = `${yr}-${String(mo).padStart(2, '0')}`
    opts.push({ key, label: `${MONTH_NAMES_HE[mo - 1]} ${yr}` })
  }
  return opts
}

function formatDateFull(d: string): string {
  if (!d) return '—'
  const iso = israeliToISO(d)
  if (!iso) return d
  const [year, month, day] = iso.split('-')
  return `${parseInt(day)}.${parseInt(month)}.${year}`
}

// ── InvoiceModal ──────────────────────────────────────────────────────────────────────────────
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
  const [form, setForm] = useState<InvoiceForm>(() => {
    // If an invoice was saved before auto-calc existed (before_vat > 0 but total is 0),
    // fill in the expected total on open so the user sees it immediately.
    if ((initial.before_vat || 0) > 0 && (!initial.total || initial.total === 0)) {
      return { ...initial, total: roundCents(initial.before_vat * (1 + VAT_RATE)) }
    }
    return initial
  })
  const [clientQuery, setClientQuery] = useState(initial.client || '')
  const [clientOpen, setClientOpen] = useState(false)
  useEsc(true, onClose)

  const set = (k: keyof InvoiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = ['before_vat','total','paid','tax_withheld'].includes(k) ? Number(e.target.value) || 0 : e.target.value
    setForm(f => {
      const next = { ...f, [k]: v } as InvoiceForm
      // Auto-calculate total (incl. VAT) from before_vat — user can still override the total field afterwards.
      if (k === 'before_vat') {
        next.total = roundCents((v as number) * (1 + VAT_RATE))
      }
      return next
    })
  }

  const filteredClients = clientOptions.filter(c =>
    c.toLowerCase().includes(clientQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{(initial as InvoiceRow).id ? 'עריכת חשבונית' : 'חשבונית חדשה'}</h2>

        <div className="grid grid-cols-2 gap-3">
          {/* Client autocomplete */}
          <div className="relative">
            <label className="block text-xs text-gray-400 mb-1">לקוח *</label>
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
              placeholder="הקלד או בחר לקוח..."
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

          <ModalField label="מס' חשבונית" value={form.invoice_num} onChange={set('invoice_num')} placeholder="20001" />

          {/* Date picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">תאריך</label>
            <input
              type="date"
              value={israeliToISO(form.date)}
              onChange={e => setForm(f => ({ ...f, date: isoToIsraeli(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">סוג מסמך</label>
            <select value={form.doc_type} onChange={set('doc_type')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">— בחר —</option>
              {['חשבונית מס','חשבון עסקה','קבלה','חשבונית מס קבלה','הזמנה'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* issued_by — employee select */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">מי הוציא</label>
            <select value={form.issued_by} onChange={set('issued_by')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">— בחר —</option>
              {['מיכאל','דן','דעיה'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          {/* sent_to — employee select */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">מי שלח ללקוח</label>
            <select value={form.sent_to} onChange={set('sent_to')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <option value="">— בחר —</option>
              {['מיכאל','דן','דעיה'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <ModalField label='סכום לפני מע"מ ₪' value={form.before_vat} onChange={set('before_vat')} type="number" />
          <ModalField label='סה"כ כולל מע"מ ₪' value={form.total} onChange={set('total')} type="number" />
          <ModalField label='שולם ₪' value={form.paid} onChange={set('paid')} type="number" />

          {/* Tax withheld at source (ניכוי מס במקור) with quick 5% helper */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-gray-400">ניכוי מס במקור ₪</label>
              <button
                type="button"
                onClick={() => {
                  const base = form.total || 0
                  const w = roundCents(base * 0.05)
                  setForm(f => ({
                    ...f,
                    tax_withheld: w,
                    // If user hasn't recorded any payment yet, assume 95% received
                    paid: (f.paid || 0) === 0 ? roundCents(f.total - w) : f.paid,
                  }))
                }}
                className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold"
                title='חישוב ניכוי 5% מהסכום אחרי מע״מ'
              >
                5%
              </button>
            </div>
            <input
              type="number"
              value={form.tax_withheld}
              onChange={set('tax_withheld')}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>

          {/* payment_date picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">חודש לתשלום</label>
            <select
              value={israeliToMonthKey(form.payment_date)}
              onChange={e => setForm(f => ({ ...f, payment_date: monthKeyToIsraeli(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="">בחר חודש...</option>
              {paymentMonthOptions(israeliToMonthKey(form.date)).map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Project assignment */}
        {projectList.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">שיוך לפרויקט</label>
            <select
              value={form.project_id || ''}
              onChange={e => setForm(f => ({ ...f, project_id: e.target.value || null }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">— ללא שיוך —</option>
              {['artist','production'].map(cat => {
                const items = projectList.filter(p => p.category === cat)
                if (!items.length) return null
                return (
                  <optgroup key={cat} label={cat === 'artist' ? 'אומנים' : 'הפקות'}>
                    {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                )
              })}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-gray-400 mb-1">הערות</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white resize-none" />
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.client}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

// ── InvoicesTab ───────────────────────────────────────────────────────────────
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
  useEsc(deleteId !== null, () => setDeleteId(null))
  // Withholding confirmation modal state
  const [withholdingInv, setWithholdingInv] = useState<InvoiceRow | null>(null)
  const [withhold5, setWithhold5] = useState<boolean>(false)
  useEsc(withholdingInv !== null, () => setWithholdingInv(null))
  const [reassignId, setReassignId] = useState<number | null>(null)
  const [reassignProjectId, setReassignProjectId] = useState<number | null>(null)
  const [reassignIssuedById, setReassignIssuedById] = useState<number | null>(null)
  const [editIssuedByVal, setEditIssuedByVal] = useState('')
  const [editPaymentDateId, setEditPaymentDateId] = useState<number | null>(null)
  const [editPaymentDateVal, setEditPaymentDateVal] = useState('')
  const [statusPickerId, setStatusPickerId] = useState<number | null>(null)
  const [expandedInvIds, setExpandedInvIds] = useState<Set<number>>(new Set())
  const [editNotesId, setEditNotesId] = useState<number | null>(null)
  const [editNotesVal, setEditNotesVal] = useState('')
  const [transferInvId, setTransferInvId] = useState<number | null>(null)
  function toggleExpanded(id: number) {
    setExpandedInvIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [filterMonth, setFilterMonth] = useState<string>('')
const [filterYear, setFilterYear] = useState<string | null>(null)
    const [groupByMonth, setGroupByMonth] = useState(true)
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())
  const [selectedYear, setSelectedYear] = useState<string>('2026')
  const [showFilters, setShowFilters] = useState<boolean>(false)

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
    .catch(() => setError('שגיאה בטעינת נתונים'))
    .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // On first load, collapse every month accordion by default.
  const didInitialCollapseRef = useRef(false)
  useEffect(() => {
    if (didInitialCollapseRef.current) return
    if (invoices.length === 0) return
    const keys = new Set<string>()
    invoices.forEach(inv => {
      if (!inv.date) return
      const d = new Date(israeliToISO(inv.date))
      if (isNaN(d.getTime())) return
      keys.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
    })
    setCollapsedMonths(keys)
    didInitialCollapseRef.current = true
  }, [invoices])

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
  const availableMonths = Object.values(monthMap).sort((a,b) => a.key.localeCompare(b.key))

  // Available years from invoices — ascending so older year (e.g. 2025) appears first (rightmost in RTL)
  const availableYears = [...new Set(invoices.map(inv => {
    if (!inv.date) return null
    const d = new Date(israeliToISO(inv.date))
    if (isNaN(d.getTime())) return null
    return String(d.getFullYear())
  }).filter(Boolean) as string[])].sort()

  // Months within the selected year
  const monthsForYear = availableMonths.filter(m => m.key.startsWith(selectedYear))

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const st = invoiceStatus(inv)
    const remaining = Math.max(0, roundCents(inv.total - (inv.paid + (inv.tax_withheld || 0))))
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
  }).sort((a, b) => {
    // Chronological order: oldest first. Rows without a valid date sink to the bottom.
    const ai = a.date ? israeliToISO(a.date) : ''
    const bi = b.date ? israeliToISO(b.date) : ''
    if (!ai && bi) return 1
    if (ai && !bi) return -1
    if (ai !== bi) return ai.localeCompare(bi)
    return a.id - b.id // stable tiebreaker
  })

  const totalAmount    = filtered.reduce((s, i) => s + i.total, 0)
  const totalBeforeVat = filtered.reduce((s, i) => s + (i.before_vat || 0), 0)
  const totalPaid      = filtered.reduce((s, i) => s + i.paid, 0)
  const totalWithheld  = filtered.reduce((s, i) => s + (i.tax_withheld || 0), 0)
  const totalRemaining = filtered.reduce((s, i) => s + Math.max(0, roundCents(i.total - (i.paid + (i.tax_withheld || 0)))), 0)
  const fmt = (n: number) => n ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

  async function handleSave(form: InvoiceForm) {
    setSaving(true)
    if (modalInv === 'new') {
      const res = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!data.error) setInvoices(prev => [...prev, data]) // rendering sorts by date, so just append
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

  // Quick-toggle from status badge — if already paid, undo; if not, mark full as paid (no withholding)
  async function markInvoicePaid(inv: InvoiceRow) {
    const st = invoiceStatus(inv)
    let patch: Partial<InvoiceRow>
    if (st === 'paid') {
      // Undo: reset paid and withheld to 0
      patch = { paid: 0, tax_withheld: 0 }
    } else {
      // Mark full total as received
      patch = {
        paid: roundCents(inv.total - (inv.tax_withheld || 0)),
        payment_date: inv.payment_date || isoToIsraeli(new Date().toISOString().slice(0, 10)),
      }
    }
    const res = await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json()
    if (!data.error) setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...data } : i))
  }

  // Open the withholding confirmation modal
  function markInvoicePaidAskWithholding(inv: InvoiceRow) {
    setWithhold5(false)
    setWithholdingInv(inv)
  }

  // Commit the confirmation from the modal
  async function confirmMarkPaidWithWithholding() {
    if (!withholdingInv) return
    const inv = withholdingInv
    const base = inv.total || 0
    const withheld = withhold5 ? roundCents(base * 0.05) : 0
    const paid = roundCents(inv.total - withheld)
    const patch: Partial<InvoiceRow> = {
      paid,
      tax_withheld: withheld,
      payment_date: inv.payment_date || isoToIsraeli(new Date().toISOString().slice(0, 10)),
    }
    const res = await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json()
    if (!data.error) setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...data } : i))
    setWithholdingInv(null)
  }

  async function savePaymentDate(invId: number, monthKey?: string) {
    const key = monthKey ?? editPaymentDateVal
    if (!key) return
    const val = monthKeyToIsraeli(key)
    await fetch(`/api/invoices/${invId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_date: val }) })
    setInvoices(prev => prev.map(x => x.id === invId ? { ...x, payment_date: val } : x))
    setEditPaymentDateId(null)
  }

  async function saveInvoiceStatus(invId: number, newStatus: string) {
    // newStatus: 'paid' | 'unpaid' | 'cancelled'
    // For paid: set paid = total. For unpaid: set paid = 0. For cancelled: set status = 'cancelled'.
    const inv = invoices.find(i => i.id === invId)
    if (!inv) return
    let patch: Record<string, unknown> = {}
    if (newStatus === 'cancelled') {
      patch = { status: 'cancelled' }
    } else if (newStatus === 'paid') {
      patch = { status: null, paid: roundCents(inv.total - (inv.tax_withheld || 0)),
        payment_date: inv.payment_date || isoToIsraeli(new Date().toISOString().slice(0, 10)) }
    } else {
      // unpaid / pending
      patch = { status: null, paid: 0, tax_withheld: 0 }
    }
    const res = await fetch(`/api/invoices/${invId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json()
    if (!data.error) setInvoices(prev => prev.map(i => i.id === invId ? { ...i, ...data } : i))
    setStatusPickerId(null)
  }

  async function saveNotes(invId: number) {
    await fetch(`/api/invoices/${invId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: editNotesVal }) })
    setInvoices(prev => prev.map(x => x.id === invId ? { ...x, notes: editNotesVal } : x))
    setEditNotesId(null)
  }

  async function transferInvoiceToMonth(invId: number, targetMonthKey: string) {
    // targetMonthKey = "YYYY-MM"
    const [y, mo] = targetMonthKey.split('-')
    const newDate = isoToIsraeli(`${y}-${mo}-01`)
    await fetch(`/api/invoices/${invId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: newDate }) })
    setInvoices(prev => prev.map(x => x.id === invId ? { ...x, date: newDate } : x))
    setTransferInvId(null)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-gray-400 text-sm">טוען חשבוניות...</div></div>
  if (error) return <div className="flex-1 flex items-center justify-center"><div className="text-red-500 text-sm">{error}</div></div>

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 gap-3" dir="rtl">
      {/* Compact header row: title + stats + buttons in one line */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="text-base font-bold text-gray-800">חשבוניות <span className="text-xs font-normal text-gray-400">({invoices.length})</span></h2>
          {/* Inline stats — compact pill-style */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold">מוצגות: <b>{filtered.length}</b></span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 font-semibold">ללא מע"מ: <b>{fmt(totalBeforeVat)}</b></span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold">סה"כ: <b>{fmt(totalAmount)}</b></span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">שולם: <b>{fmt(totalPaid)}</b></span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-semibold" title="ניכוי מס במקור">ניכוי מס: <b>{totalWithheld > 0 ? fmt(totalWithheld) : '—'}</b></span>
            <span className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-semibold">יתרה: <b>{fmt(totalRemaining)}</b></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByMonth(g => !g)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${groupByMonth ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
            title="קיבוץ לפי חודש"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            לפי חודש
          </button>
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showFilters ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
            title="סינונים"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            סינון
          </button>
          <button
            onClick={() => setModalInv('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            חשבונית חדשה
          </button>
        </div>
      </div>

      {/* Combined filter row: Payment status + Years + Months — all inline */}
      <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
        {/* Payment status tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {([
            { key: 'all', label: 'הכל', count: invoices.length },
            { key: 'open', label: 'פתוחות', count: invoices.filter(inv => Math.max(0, roundCents(inv.total - (inv.paid + (inv.tax_withheld || 0)))) > 0).length },
            { key: 'closed', label: 'סגורות', count: invoices.filter(inv => Math.max(0, roundCents(inv.total - (inv.paid + (inv.tax_withheld || 0)))) === 0).length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setPaymentFilter(key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${paymentFilter === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label} <span className={`text-xs font-normal ${paymentFilter === key ? 'text-indigo-500' : 'text-gray-400'}`}>({count})</span>
            </button>
          ))}
        </div>

        {/* Year tabs — descending (newest year is rightmost, older on left, per user spec) */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {availableYears.map(yr => {
            const cnt = invoices.filter(inv => inv.date && israeliToISO(inv.date).startsWith(yr)).length
            return (
              <button
                key={yr}
                onClick={() => { setSelectedYear(yr); setFilterMonth('') }}
                className={`px-4 py-1 rounded-md text-xs font-semibold transition-all ${selectedYear === yr ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {yr} <span className={`text-xs font-normal ${selectedYear === yr ? 'text-indigo-500' : 'text-gray-400'}`}>({cnt})</span>
              </button>
            )
          })}
        </div>

        {/* Month sub-tabs for selected year — ascending (January rightmost, latest month leftmost) */}
        {monthsForYear.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
            <button
              onClick={() => setFilterMonth('')}
              className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${!filterMonth ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
            >
              כל {selectedYear}
            </button>
            {monthsForYear.map(m => (
              <button
                key={m.key}
                onClick={() => setFilterMonth(filterMonth === m.key ? '' : m.key)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${filterMonth === m.key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'}`}
              >
                {m.label.replace(` ${selectedYear}`, '')}
                <span className={`text-xs font-normal mr-1 ${filterMonth === m.key ? 'text-indigo-200' : 'text-gray-400'}`}>({m.count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Always-visible search bar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי מס' חשבונית או שם לקוח..."
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        {search && <span className="text-xs text-indigo-600 font-medium">{filtered.length} תוצאות</span>}
      </div>

      {/* Filters — hidden by default, toggleable */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש לקוח, מס' חשבונית, מי הוציא..." className="flex-1 min-w-[200px] border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none">
            <option value="">כל הלקוחות</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterDocType} onChange={e => setFilterDocType(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none">
            <option value="">כל סוגי המסמך</option>{docTypes.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none">
            <option value="">כל הסטטוסים</option>
            <option value="paid">שולם</option><option value="partial">חלקי</option><option value="unpaid">ממתין</option>
          </select>
          {projectList.length > 0 && (
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none">
              <option value="">כל הפרויקטים</option>
              {['artist','production'].map(cat => { const items = projectList.filter(p => p.category === cat); if (!items.length) return null; return <optgroup key={cat} label={cat === 'artist' ? 'אומנים' : 'הפקות'}>{items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup> })}
            </select>
          )}
        </div>
      )}

      {/* Table — flat or grouped by month */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white min-h-0">
        {!groupByMonth ? (
          /* ── Flat list ── */
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide [&>th]:sticky [&>th]:top-0 [&>th]:bg-gray-50 [&>th]:z-10">
                <th className="px-3 py-3 text-center font-semibold text-gray-400">#</th>
                <th className="px-4 py-3 text-right font-semibold">מס'</th>
                <th className="px-4 py-3 text-right font-semibold">לקוח</th>
                <th className="px-4 py-3 text-right font-semibold">פרויקט</th>
                <th className="px-4 py-3 text-right font-semibold">תאריך</th>
                <th className="px-4 py-3 text-right font-semibold">סוג</th>
                <th className="px-4 py-3 text-right font-semibold">סכום חשבונית</th>
                <th className="px-4 py-3 text-right font-semibold">סה"כ לתשלום</th>
                <th className="px-4 py-3 text-right font-semibold">שולם</th>
                <th className="px-4 py-3 text-right font-semibold">ניכוי מס</th>
                <th className="px-4 py-3 text-right font-semibold">יתרה</th>
                <th className="px-4 py-3 text-right font-semibold">חודש לתשלום</th>
                <th className="px-4 py-3 text-center font-semibold">סטטוס</th>
                <th className="px-4 py-3 text-center font-semibold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-12 text-gray-400">לא נמצאו חשבוניות</td></tr>
              ) : filtered.map((inv, i) => {
                const st = invoiceStatus(inv)
                const remaining = Math.max(0, roundCents(inv.total - (inv.paid + (inv.tax_withheld || 0))))
                return (
                  <Fragment key={inv.id}>
                  <tr className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                    <td className="px-3 py-3 text-center text-gray-400 text-xs font-mono select-none">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <button
                        onClick={() => toggleExpanded(inv.id)}
                        className={`flex items-center gap-1 font-mono hover:text-indigo-600 transition-colors ${expandedInvIds.has(inv.id) ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}
                        title="לחץ לפתיחת הערות"
                      >
                        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${expandedInvIds.has(inv.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        {inv.invoice_num || '—'}
                      </button>
                    </td>
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
                      <button onClick={() => setReassignId(reassignId === inv.id ? null : inv.id)} className={`text-right w-full truncate hover:text-indigo-600 transition-colors group flex items-center gap-1 ${inv.client_id ? 'font-semibold text-gray-800' : 'text-amber-500 font-medium'}`} title="לחץ לשיוך לקוח">
                        <span className="truncate">{inv.client_id ? (inv.client || '—') : '⚠ לא משוייך לקוח'}</span>
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
                          {projectList.find(p => p.id === inv.project_id)?.name || '—'}
                        </button>
                      ) : (
                        <button onClick={() => setReassignProjectId(reassignProjectId === inv.id ? null : inv.id)} className="text-gray-300 hover:text-indigo-400 transition-colors text-xs" title="שייך לפרויקט">+ שייך</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.date)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{inv.doc_type || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{fmt(inv.before_vat)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(inv.total)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                    <td className="px-4 py-3 text-purple-600 text-xs">{inv.tax_withheld ? fmt(inv.tax_withheld) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">{remaining >= 1 ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span> : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap relative">
                      {editPaymentDateId === inv.id ? (
                        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-indigo-200 rounded-2xl shadow-2xl p-3 min-w-[170px] space-y-2" dir="rtl">
                          <select
                            autoFocus
                            value={editPaymentDateVal}
                            onChange={e => setEditPaymentDateVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && editPaymentDateVal) savePaymentDate(inv.id)
                              if (e.key === 'Escape') setEditPaymentDateId(null)
                            }}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <option value="">בחר חודש...</option>
                            {paymentMonthOptions(israeliToMonthKey(inv.date)).map(o => (
                              <option key={o.key} value={o.key}>{o.label}</option>
                            ))}
                          </select>
                          <div className="flex gap-2 pt-1 border-t border-gray-100">
                            <button onClick={() => savePaymentDate(inv.id)} disabled={!editPaymentDateVal} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>אישור</button>
                            <button onClick={() => setEditPaymentDateId(null)} className="flex-1 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ביטול</button>
                          </div>
                        </div>
                      ) : null}
                      <button
                        onClick={() => { setEditPaymentDateId(inv.id); setEditPaymentDateVal(israeliToMonthKey(inv.payment_date) || israeliToMonthKey(inv.date)) }}
                        className="hover:text-indigo-600 transition-colors group flex items-center gap-1"
                        title="לחץ לבחירת חודש תשלום"
                      >
                        <span>{paymentMonthLabel(inv.payment_date)}</span>
                        <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center relative">
                      <button
                        onClick={() => setStatusPickerId(statusPickerId === inv.id ? null : inv.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLE[st]} hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 transition-all`}
                      >
                        {STATUS_LABEL[st]} ▾
                      </button>
                      {statusPickerId === inv.id && (
                        <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[110px]" dir="rtl" onClick={e => e.stopPropagation()}>
                          {[{ key: 'paid', label: 'שולם' }, { key: 'unpaid', label: 'ממתין' }, { key: 'cancelled', label: 'מבוטל' }].map(opt => (
                            <button key={opt.key} onClick={() => saveInvoiceStatus(inv.id, opt.key)}
                              className={`w-full text-right px-3 py-2 text-xs hover:bg-indigo-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${st === opt.key ? 'font-bold text-indigo-600' : 'text-gray-700'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center items-center">
                        {st !== 'paid' && st !== 'cancelled' && (
                          <button onClick={() => markInvoicePaidAskWithholding(inv)} title="סמן כשולם (עם אפשרות ניכוי)" className="p-1 rounded-lg hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        <button onClick={() => setModalInv(inv)} title="עריכה" className="p-1 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteId(inv.id)} title="מחיקה" className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedInvIds.has(inv.id) && (
                    <tr className="bg-indigo-50/60 border-b border-indigo-100">
                      <td colSpan={14} className="px-6 py-3">
                        <div className="flex items-start gap-6 flex-wrap" dir="rtl">
                          {/* מי הוציא */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">מי הוציא:</span>
                            {reassignIssuedById === inv.id ? (
                              <IssuedByPicker
                                current={inv.issued_by || ''}
                                onSave={async (name) => {
                                  await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issued_by: name }) })
                                  setInvoices(prev => prev.map(x => x.id === inv.id ? { ...x, issued_by: name } : x))
                                  setReassignIssuedById(null)
                                }}
                                onClose={() => setReassignIssuedById(null)}
                              />
                            ) : (
                              <button
                                onClick={() => { setReassignIssuedById(inv.id); setEditIssuedByVal(inv.issued_by || '') }}
                                className="text-xs text-gray-600 hover:text-indigo-600 transition-colors group flex items-center gap-1"
                                title="לחץ לעריכה"
                              >
                                <span>{inv.issued_by || '—'}</span>
                                <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                            )}
                          </div>
                          {/* הערות */}
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap pt-1">הערות:</span>
                            {editNotesId === inv.id ? (
                              <div className="flex-1 flex items-start gap-2">
                                <textarea
                                  autoFocus
                                  value={editNotesVal}
                                  onChange={e => setEditNotesVal(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Escape') setEditNotesId(null)
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(inv.id) }
                                  }}
                                  rows={2}
                                  className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                                  placeholder="הכנס הערה... (Enter לשמירה, Shift+Enter לשורה חדשה)"
                                />
                                <button
                                  onClick={() => saveNotes(inv.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                                >שמור</button>
                                <button onClick={() => setEditNotesId(null)} className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 flex-shrink-0">ביטול</button>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center gap-2 group">
                                <span className="text-xs text-gray-600 whitespace-pre-wrap">{inv.notes || <span className="text-gray-300 italic">אין הערות</span>}</span>
                                <button
                                  onClick={() => { setEditNotesId(inv.id); setEditNotesVal(inv.notes || '') }}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-all"
                                  title="ערוך הערות"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
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
                <tr className="border-t-2 border-gray-200 font-bold [&>td]:sticky [&>td]:bottom-0 [&>td]:bg-gray-50 [&>td]:z-10">
                  <td colSpan={6} className="px-4 py-3 text-xs text-gray-500 uppercase">סה"כ ({filtered.length})</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(filtered.reduce((s, i) => s + i.before_vat, 0))}</td>
                  <td className="px-4 py-3 text-gray-800">{fmt(totalAmount)}</td>
                  <td className="px-4 py-3 text-emerald-600">{fmt(totalPaid)}</td>
                  <td className="px-4 py-3 text-purple-600">{totalWithheld > 0 ? fmt(totalWithheld) : '—'}</td>
                  <td className="px-4 py-3 text-red-500">{fmt(totalRemaining)}</td>
                  <td /><td />
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          /* ── Grouped by month ── */
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
            // Add empty months up to Dec 2026, respecting the active year filter
            ALL_MONTHS_FULL
              .filter(m => !selectedYear || m.key.startsWith(selectedYear))
              .forEach(({ key, label }) => {
                if (!mGroups[key]) mGroups[key] = { key, label, rows: [] }
              })
            const groups = Object.values(mGroups).sort((a,b) => a.key.localeCompare(b.key))
            const COLS = 14
            const TH = 'px-4 py-3 text-right font-semibold'
            const anyGroupOpen = groups.some(g => !collapsedMonths.has(g.key))

            return (
              <table className="w-full text-sm border-collapse">
                {anyGroupOpen && (
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide [&>th]:sticky [&>th]:top-0 [&>th]:bg-gray-50 [&>th]:z-10">
                    <th className="px-3 py-3 w-8" />
                    <th className={TH}>מס'</th>
                    <th className={TH}>לקוח</th>
                    <th className={TH}>פרויקט</th>
                    <th className={TH}>תאריך</th>
                    <th className={TH}>סוג</th>
                    <th className={TH}>סכום חשבונית</th>
                    <th className={TH}>סה"כ לתשלום</th>
                    <th className={TH}>שולם</th>
                    <th className={TH}>ניכוי מס</th>
                    <th className={TH}>יתרה</th>
                    <th className={TH}>חודש לתשלום</th>
                    <th className="px-4 py-3 text-center font-semibold">סטטוס</th>
                    <th className="px-4 py-3 text-center font-semibold">פעולות</th>
                  </tr>
                </thead>
                )}
                <tbody>
                  {groups.length === 0 ? (
                    <tr><td colSpan={COLS} className="text-center py-12 text-gray-400">לא נמצאו חשבוניות</td></tr>
                  ) : groups.map(group => {
                    const isCollapsed = collapsedMonths.has(group.key)
                    const mTotal     = group.rows.reduce((s,i) => s+i.total, 0)
                    const mPaid      = group.rows.reduce((s,i) => s+i.paid,  0)
                    const mWithheld  = group.rows.reduce((s,i) => s+(i.tax_withheld || 0), 0)
                    const mBeforeVat = group.rows.reduce((s,i) => s+(i.before_vat || 0), 0)
                    const mVat       = roundCents(mTotal - mBeforeVat)
                    const mRem       = Math.max(0, roundCents(mTotal - (mPaid + mWithheld)))
                    const mOpen     = group.rows.filter(i => Math.max(0, roundCents(i.total-(i.paid+(i.tax_withheld||0)))) > 0).length

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
                            <span className="text-indigo-400 text-xs transition-transform inline-block" style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>▶</span>
                          </td>
                          <td colSpan={2} className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-indigo-700 text-sm">{group.label}</span>
                            <span className="mr-2 text-xs text-indigo-400">({group.rows.length} חשבוניות)</span>
                            {mOpen > 0 && <span className="mr-1 text-xs text-red-400">{mOpen} פתוחות</span>}
                            {mWithheld > 0 && <span className="mr-2 text-xs text-purple-500" title="ניכוי מס במקור">ניכוי: {fmt(mWithheld)}</span>}
                          </td>
                          {/* Empty: פרויקט, תאריך, סוג */}
                          <td colSpan={3} />
                          {/* סכום חשבונית + מע"מ */}
                          <td className="px-4 py-3">
                            <div className="text-xs font-bold text-gray-600">{fmt(mBeforeVat)}</div>
                            {mVat > 0 && <div className="text-xs text-blue-400 mt-0.5">מע&quot;מ: {fmt(mVat)}</div>}
                          </td>
                          {/* סה"כ לתשלום */}
                          <td className="px-4 py-3 text-xs font-bold text-indigo-600">{fmt(mTotal)}</td>
                          {/* שולם */}
                          <td className="px-4 py-3 text-xs font-bold text-emerald-600">{fmt(mPaid)}</td>
                          {/* ניכוי מס */}
                          <td className="px-4 py-3 text-xs font-bold text-purple-600">{mWithheld > 0 ? fmt(mWithheld) : '—'}</td>
                          {/* יתרה */}
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: group.rows.length === 0 ? 'var(--text-secondary)' : mRem > 0 ? '#f59e0b' : '#10b981' }}>{group.rows.length === 0 ? '—' : mRem > 0 ? fmt(mRem) : '✓'}</td>
                          {/* Empty: חודש לתשלום, סטטוס, פעולות */}
                          <td colSpan={3} />
                        </tr>

                        {/* Invoice rows for this month */}
                        {!isCollapsed && group.rows.map((inv, i) => {
                          const st = invoiceStatus(inv)
                          const remaining = Math.max(0, roundCents(inv.total - (inv.paid + (inv.tax_withheld || 0))))
                          return (
                            <Fragment key={inv.id}>
                            <tr className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                              <td className="px-3 py-2.5 text-center text-gray-300 text-xs font-mono">{i + 1}</td>
                              <td className="px-4 py-2.5 font-mono text-xs">
                                <button
                                  onClick={() => toggleExpanded(inv.id)}
                                  className={`flex items-center gap-1 font-mono hover:text-indigo-600 transition-colors ${expandedInvIds.has(inv.id) ? 'text-indigo-600 font-semibold' : 'text-gray-500'}`}
                                  title="לחץ לפתיחת הערות"
                                >
                                  <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${expandedInvIds.has(inv.id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                                  {inv.invoice_num || '—'}
                                </button>
                              </td>
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
                                  <span className="truncate">{inv.client_id ? (inv.client || '—') : '⚠ לא משוייך'}</span>
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
                                  >{projectList.find(p => p.id === inv.project_id)?.name || '—'}</button>
                                ) : (
                                  <button onClick={() => setReassignProjectId(reassignProjectId === inv.id ? null : inv.id)} className="text-gray-300 hover:text-indigo-400 transition-colors text-xs">+ שייך</button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.date)}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs">{inv.doc_type || '—'}</td>
                              <td className="px-4 py-2.5 text-gray-600 text-xs">{fmt(inv.before_vat)}</td>
                              <td className="px-4 py-2.5 font-semibold text-gray-800 text-xs">{fmt(inv.total)}</td>
                              <td className="px-4 py-2.5 text-emerald-600 text-xs">{fmt(inv.paid)}</td>
                              <td className="px-4 py-2.5 text-purple-600 text-xs">{inv.tax_withheld ? fmt(inv.tax_withheld) : <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-xs">{remaining >= 1 ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span> : <span className="text-gray-300">—</span>}</td>
                              <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap relative">
                                {editPaymentDateId === inv.id ? (
                                  <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-indigo-200 rounded-2xl shadow-2xl p-3 min-w-[170px] space-y-2" dir="rtl">
                                    <select
                                      autoFocus
                                      value={editPaymentDateVal}
                                      onChange={e => setEditPaymentDateVal(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter' && editPaymentDateVal) savePaymentDate(inv.id)
                                        if (e.key === 'Escape') setEditPaymentDateId(null)
                                      }}
                                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    >
                                      <option value="">בחר חודש...</option>
                                      {paymentMonthOptions(israeliToMonthKey(inv.date)).map(o => (
                                        <option key={o.key} value={o.key}>{o.label}</option>
                                      ))}
                                    </select>
                                    <div className="flex gap-2 pt-1 border-t border-gray-100">
                                      <button onClick={() => savePaymentDate(inv.id)} disabled={!editPaymentDateVal} className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>אישור</button>
                                      <button onClick={() => setEditPaymentDateId(null)} className="flex-1 py-1.5 rounded-xl text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">ביטול</button>
                                    </div>
                                  </div>
                                ) : null}
                                <button
                                  onClick={() => { setEditPaymentDateId(inv.id); setEditPaymentDateVal(israeliToMonthKey(inv.payment_date) || israeliToMonthKey(inv.date)) }}
                                  className="hover:text-indigo-600 transition-colors group flex items-center gap-1"
                                  title="לחץ לבחירת חודש תשלום"
                                >
                                  <span>{paymentMonthLabel(inv.payment_date)}</span>
                                  <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-center relative">
                                <button
                                  onClick={() => setStatusPickerId(statusPickerId === inv.id ? null : inv.id)}
                                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${STATUS_STYLE[st]} hover:ring-2 hover:ring-offset-1 hover:ring-indigo-300 transition-all`}
                                >
                                  {STATUS_LABEL[st]} ▾
                                </button>
                                {statusPickerId === inv.id && (
                                  <div className="absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[110px]" dir="rtl" onClick={e => e.stopPropagation()}>
                                    {[{ key: 'paid', label: 'שולם' }, { key: 'unpaid', label: 'ממתין' }, { key: 'cancelled', label: 'מבוטל' }].map(opt => (
                                      <button key={opt.key} onClick={() => saveInvoiceStatus(inv.id, opt.key)}
                                        className={`w-full text-right px-3 py-2 text-xs hover:bg-indigo-50 transition-colors first:rounded-t-xl last:rounded-b-xl ${st === opt.key ? 'font-bold text-indigo-600' : 'text-gray-700'}`}>
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex gap-1 justify-center items-center">
                                  {st !== 'paid' && st !== 'cancelled' && (
                                    <button onClick={() => markInvoicePaidAskWithholding(inv)} title="סמן כשולם (עם אפשרות ניכוי)" className="p-1 rounded-lg hover:bg-emerald-100 text-gray-400 hover:text-emerald-600 transition-colors">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                  )}
                                  <button onClick={() => setModalInv(inv)} className="p-1 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={() => setDeleteId(inv.id)} className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedInvIds.has(inv.id) && (
                              <tr className="bg-indigo-50/60 border-b border-indigo-100">
                                <td colSpan={14} className="px-6 py-3">
                                  <div className="flex items-start gap-6 flex-wrap" dir="rtl">
                                    {/* מי הוציא */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap">מי הוציא:</span>
                                      {reassignIssuedById === inv.id ? (
                                        <IssuedByPicker
                                          current={inv.issued_by || ''}
                                          onSave={async (name) => {
                                            await fetch(`/api/invoices/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issued_by: name }) })
                                            setInvoices(prev => prev.map(x => x.id === inv.id ? { ...x, issued_by: name } : x))
                                            setReassignIssuedById(null)
                                          }}
                                          onClose={() => setReassignIssuedById(null)}
                                        />
                                      ) : (
                                        <button
                                          onClick={() => { setReassignIssuedById(inv.id); setEditIssuedByVal(inv.issued_by || '') }}
                                          className="text-xs text-gray-600 hover:text-indigo-600 transition-colors group flex items-center gap-1"
                                          title="לחץ לעריכה"
                                        >
                                          <span>{inv.issued_by || '—'}</span>
                                          <svg className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                      )}
                                    </div>
                                    {/* הערות */}
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-semibold text-indigo-600 whitespace-nowrap pt-1">הערות:</span>
                                      {editNotesId === inv.id ? (
                                        <div className="flex-1 flex items-start gap-2">
                                          <textarea
                                            autoFocus
                                            value={editNotesVal}
                                            onChange={e => setEditNotesVal(e.target.value)}
                                            onKeyDown={e => {
                                              if (e.key === 'Escape') setEditNotesId(null)
                                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNotes(inv.id) }
                                            }}
                                            rows={2}
                                            className="flex-1 border border-indigo-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                                            placeholder="הכנס הערה... (Enter לשמירה, Shift+Enter לשורה חדשה)"
                                          />
                                          <button
                                            onClick={() => saveNotes(inv.id)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}
                                          >שמור</button>
                                          <button onClick={() => setEditNotesId(null)} className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 flex-shrink-0">ביטול</button>
                                        </div>
                                      ) : (
                                        <div className="flex-1 flex items-center gap-2 group">
                                          <span className="text-xs text-gray-600 whitespace-pre-wrap">{inv.notes || <span className="text-gray-300 italic">אין הערות</span>}</span>
                                          <button
                                            onClick={() => { setEditNotesId(inv.id); setEditNotesVal(inv.notes || '') }}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-all"
                                            title="ערוך הערות"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                            </Fragment>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold [&>td]:sticky [&>td]:bottom-0 [&>td]:bg-gray-50 [&>td]:z-10">
                    <td colSpan={9} className="px-4 py-3 text-xs text-gray-500 uppercase">סה"כ ({filtered.length})</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{fmt(filtered.reduce((s,i) => s+i.before_vat,0))}</td>
                    <td className="px-4 py-3 text-gray-800 text-xs">{fmt(totalAmount)}</td>
                    <td className="px-4 py-3 text-emerald-600 text-xs">{fmt(totalPaid)}</td>
                    <td className="px-4 py-3 text-purple-600 text-xs">{totalWithheld > 0 ? fmt(totalWithheld) : '—'}</td>
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

      {/* Mark-paid + withholding modal */}
      {withholdingInv !== null && (() => {
        const inv = withholdingInv
        const base = inv.total || 0
        const withheldPreview = withhold5 ? roundCents(base * 0.05) : 0
        const paidPreview = roundCents(inv.total - withheldPreview)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setWithholdingInv(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 text-base">סימון חשבונית כשולמה</h3>
              <div className="text-xs text-gray-500 leading-relaxed">
                {inv.client && <div>לקוח: <span className="font-semibold text-gray-700">{inv.client}</span></div>}
                <div>סה"כ: <span className="font-semibold text-gray-700">{fmt(inv.total)}</span></div>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={withhold5}
                  onChange={e => setWithhold5(e.target.checked)}
                  className="w-4 h-4 accent-purple-600"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-800">נוכה מס במקור 5%</div>
                  <div className="text-[11px] text-gray-500">מחושב מהסכום אחרי מע״מ ({fmt(base)})</div>
                </div>
              </label>
              <div className="rounded-xl bg-gray-50 p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">שולם:</span><span className="font-semibold text-emerald-600">{fmt(paidPreview)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">ניכוי מס:</span><span className="font-semibold text-purple-600">{withheldPreview > 0 ? fmt(withheldPreview) : '—'}</span></div>
              </div>
              <div className="flex gap-2">
                <button onClick={confirmMarkPaidWithWithholding} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all" style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
                  אישור
                </button>
                <button onClick={() => setWithholdingInv(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">ביטול</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            </div>
            <p className="font-semibold text-gray-800">למחוק את החשבונית?</p>
            <p className="text-sm text-gray-500">פעולה זו אינה ניתנת לביטול</p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">מחק</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Client types ──────────────────────────────────────────────────────────────
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
  name: '', tax_id: '', tax_status: 'מורשה', contact_name: '', contact_email: '', notes: ''
}

function ClientModal({ initial, onSave, onClose, saving }: {
  initial: Omit<ClientRecord, 'id' | 'invoiceCount' | 'totalAmount' | 'paidAmount'>
  onSave: (data: typeof initial) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState(initial)
  useEsc(true, onClose)
  const s = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900">{(initial as ClientRecord).id ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">שם לקוח *</label>
            <input value={form.name} onChange={s('name')} placeholder="שם החברה / אדם" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">ח.פ / ע.מ / ע.פ</label>
              <input value={form.tax_id} onChange={s('tax_id')} placeholder="מספר עוסק" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">סטטוס ברשויות</label>
              <select value={form.tax_status} onChange={s('tax_status')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="מורשה">מורשה</option>
                <option value="פטור">פטור</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">איש קשר הנה&quot;ח</label>
            <input value={form.contact_name} onChange={s('contact_name')} placeholder="שם איש הקשר" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Email הנהלת חשבונות</label>
            <input type="email" value={form.contact_email} onChange={s('contact_email')} placeholder="accounting@company.com" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">הערות</label>
            <textarea value={form.notes} onChange={s('notes')} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={() => onSave(form)} disabled={saving || !form.name}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)' }}>
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-gray-500 border border-gray-200 hover:bg-gray-50">ביטול</button>
        </div>
      </div>
    </div>
  )
}

// ── Charts ───────────────────────────────────────────────────────────────────
function DonutChart({ paid, remaining, size = 120 }: { paid: number; remaining: number; size?: number }) {
  const total = paid + remaining
  if (total === 0) return <div className="w-[120px] h-[120px] rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">אין נתונים</div>
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
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.09} fill="#6b7280">שולם</text>
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

      {/* Donut — שולם vs יתרה */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 flex gap-4 items-center shadow-sm">
        <DonutChart paid={totalPaid} remaining={totalRemaining} size={110} />
        <div className="flex-1 space-y-2">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">שולם</div>
            <div className="text-sm font-bold text-emerald-600">{fmt(totalPaid)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">יתרה לתשלום</div>
            <div className="text-sm font-bold text-red-500">{fmt(totalRemaining)}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">סה״כ</div>
            <div className="text-sm font-bold text-gray-700">{fmt(totalAll)}</div>
          </div>
        </div>
      </div>

      {/* Top clients bar chart */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">לקוחות מובילים</div>
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
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />שולם</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-200 inline-block" />סה״כ</span>
        </div>
      </div>

      {/* Status breakdown donut + stats */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">סטטוס לקוחות</div>
        <div className="flex gap-4 items-center mb-4">
          <DonutChart paid={closedCount} remaining={openCount} size={90} />
          <div className="space-y-2 flex-1">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />סגורים</span>
              <span className="font-bold text-emerald-600">{closedCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-300 inline-block" />פתוחים</span>
              <span className="font-bold text-red-500">{openCount}</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5 border-t border-gray-100 pt-3">
          <div className="flex justify-between text-xs text-gray-500">
            <span>ממוצע לחשבונית</span>
            <span className="font-semibold text-gray-700">{clients.reduce((s,c)=>s+c.invoiceCount,0) > 0 ? fmt(totalAll / clients.reduce((s,c)=>s+c.invoiceCount,0)) : '—'}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>לקוחות פעילים</span>
            <span className="font-semibold text-gray-700">{clients.filter(c=>c.invoiceCount>0).length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── LedgerDrawer ─────────────────────────────────────────────────────────────
function LedgerDrawer({ client, invoices, loading, onClose, fmt }: {
  client: ClientRecord
  invoices: InvoiceRow[]
  loading: boolean
  onClose: () => void
  fmt: (n: number) => string
}) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'open'>('all')
  useEsc(true, onClose)

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
            <p className="text-xs text-gray-400 mt-0.5">כרטסת לקוח — {invoices.length} חשבוניות</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Summary stats */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3 flex-shrink-0 border-b border-gray-100">
          <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
            <div className="text-lg font-bold text-gray-800">{fmt(totalAll)}</div>
            <div className="text-xs text-gray-400 mt-0.5">סה״כ חשבוניות</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <div className="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</div>
            <div className="text-xs text-emerald-500 mt-0.5">שולם</div>
          </div>
          <div className={`rounded-xl px-4 py-3 text-center ${totalOpen > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <div className={`text-lg font-bold ${totalOpen > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {totalOpen > 0 ? fmt(totalOpen) : '✓ שולם הכל'}
            </div>
            <div className={`text-xs mt-0.5 ${totalOpen > 0 ? 'text-red-400' : 'text-emerald-400'}`}>יתרה לתשלום</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-6 py-3 flex gap-1 flex-shrink-0">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: 'all',  label: 'הכל',    count: invoices.length },
              { key: 'open', label: 'פתוחות', count: openCount },
              { key: 'paid', label: 'שולם',   count: paidCount },
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
            <div className="text-center py-12 text-gray-400 text-sm">טוען...</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">אין חשבוניות להצגה</div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-xs [&>th]:sticky [&>th]:top-0 [&>th]:bg-gray-50 [&>th]:z-10">
                  <th className="px-3 py-2.5 text-right font-semibold">מס׳</th>
                  <th className="px-3 py-2.5 text-right font-semibold">תאריך</th>
                  <th className="px-3 py-2.5 text-right font-semibold">סוג</th>
                  <th className="px-3 py-2.5 text-right font-semibold">מי הוציא</th>
                  <th className="px-3 py-2.5 text-right font-semibold">לפני מע״מ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">סה״כ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">שולם</th>
                  <th className="px-3 py-2.5 text-right font-semibold">יתרה</th>
                  <th className="px-3 py-2.5 text-center font-semibold">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((inv, i) => {
                  const remaining = Math.max(0, roundCents(inv.total - inv.paid))
                  const isPaid = remaining === 0
                  return (
                    <tr key={inv.id} className={`border-b border-gray-100 transition-colors ${isPaid ? 'hover:bg-emerald-50/30' : 'hover:bg-red-50/30'} ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{inv.invoice_num || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{inv.date || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{inv.doc_type || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{inv.issued_by || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-500 text-xs">{fmt(inv.before_vat)}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{fmt(inv.total)}</td>
                      <td className="px-3 py-2.5 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                      <td className="px-3 py-2.5">
                        {remaining > 0
                          ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isPaid
                          ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">שולם</span>
                          : inv.paid > 0
                            ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">חלקי</span>
                            : <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600">ממתין</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-sm">
                  <td colSpan={4} className="px-3 py-2.5 text-xs text-gray-500 uppercase">סה״כ ({displayed.length})</td>
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
  useEsc(deleteClientId !== null, () => setDeleteClientId(null))
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
      .catch(() => setError('שגיאה בטעינת לקוחות'))
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
          // New client — add with zero stats
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

  const fmt = (n: number) => n ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

  const PINNED_BOTTOM = ['סה"כ', 'סהכ', 'total', 'סה״כ']
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
      {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
  const totalInvoices = clients.reduce((s, c) => s + c.invoiceCount, 0)
  const totalAmount   = clients.reduce((s, c) => s + c.totalAmount, 0)

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-gray-400 text-sm">טוען לקוחות...</div></div>
  if (error)   return <div className="flex-1 flex items-center justify-center"><div className="text-red-500 text-sm">{error}</div></div>

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4" dir="rtl">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex gap-4">
          {[
            { label: 'לקוחות', value: clients.length, color: '#6366f1' },
            { label: 'חשבוניות', value: totalInvoices, color: '#3b82f6' },
            { label: 'סה״כ', value: fmt(totalAmount), color: '#10b981' },
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
          הוספת לקוח
        </button>
      </div>

      {/* Charts snapshot — collapsible */}
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
            תמונת מצב
            <span className="text-gray-300 group-hover:text-indigo-300 font-normal">{showCharts ? 'סגור' : 'פתח'}</span>
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
          placeholder="חפש לקוח..." className="flex-1 max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          {/* Cards toggle */}
          <button onClick={() => setView('cards')} title="תצוגת כרטיסים"
            className={`px-3 py-2 transition-colors ${view === 'cards' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          {/* Table toggle */}
          <button onClick={() => setView('table')} title="תצוגת טבלה"
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
          /* ── Cards grid ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-gray-400">לא נמצאו לקוחות</div>
            ) : filtered.map(c => {
              const remaining = c.totalAmount - c.paidAmount
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-base leading-tight truncate">{c.name}</h3>
                        {c.tax_id && <p className="text-xs text-gray-400 mt-0.5">ח.פ: {c.tax_id}</p>}
                      </div>
                      <div className="flex gap-1 mr-2 flex-shrink-0">
                        {c.tax_status && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.tax_status === 'מורשה' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
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
                      <div className="text-[10px] text-gray-400">חשבוניות</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{fmt(c.totalAmount)}</div>
                      <div className="text-[10px] text-gray-400">סה״כ</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-600">{fmt(c.paidAmount)}</div>
                      <div className="text-[10px] text-gray-400">שולם</div>
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${remaining > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {remaining > 0 ? fmt(remaining) : '✓'}
                      </div>
                      <div className="text-[10px] text-gray-400">יתרה</div>
                    </div>
                  </div>
                  <div className="px-5 pb-4 flex gap-2">
                    <button onClick={() => toggleExpand(c)} className="flex-1 py-1.5 rounded-xl text-xs font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">כרטסת</button>
                    <button onClick={() => setModalClient(c)} className="flex-1 py-1.5 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">עריכה</button>
                    <button onClick={() => setDeleteClientId(c.id)} className="py-1.5 px-2.5 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── Table view ── */
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('name')}>שם לקוח <SortIcon col="name" /></th>
                  <th className="px-5 py-3 text-right font-semibold">ח.פ</th>
                  <th className="px-5 py-3 text-right font-semibold">סטטוס</th>
                  <th className="px-5 py-3 text-right font-semibold">איש קשר</th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('invoiceCount')}>חשבוניות <SortIcon col="invoiceCount" /></th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('totalAmount')}>סה״כ חשבוניות <SortIcon col="totalAmount" /></th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('paidAmount')}>שולם <SortIcon col="paidAmount" /></th>
                  <th className="px-5 py-3 text-right font-semibold cursor-pointer hover:text-indigo-600 select-none" onClick={() => toggleSort('remaining')}>יתרה לתשלום <SortIcon col="remaining" /></th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-gray-400">לא נמצאו לקוחות</td></tr>
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
                      {/* ── Client row ── */}
                      <tr
                        onClick={() => toggleExpand(c)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors ${isExpanded ? 'bg-indigo-50' : i % 2 === 0 ? 'bg-white hover:bg-indigo-50/50' : 'bg-gray-50/40 hover:bg-indigo-50/50'}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-xs transition-transform duration-200 inline-block" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                            <span className="font-semibold text-gray-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs font-mono">{c.tax_id || '—'}</td>
                        <td className="px-5 py-3">
                          {c.tax_status ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.tax_status === 'מורשה' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.tax_status}</span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-600 text-xs">
                          <div>{c.contact_name || '—'}</div>
                          {c.contact_email && <div className="text-gray-400" dir="ltr">{c.contact_email}</div>}
                        </td>
                        <td className="px-5 py-3 text-indigo-600 font-semibold text-center">{c.invoiceCount}</td>
                        <td className="px-5 py-3 font-semibold text-gray-800">{fmt(c.totalAmount)}</td>
                        <td className="px-5 py-3 text-emerald-600 font-medium">{fmt(c.paidAmount)}</td>
                        <td className="px-5 py-3">
                          {remaining > 0
                            ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span>
                            : <span className="text-emerald-500 text-xs font-semibold">✓ שולם</span>}
                        </td>
                        <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setModalClient(c)} className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">עריכה</button>
                            <button onClick={() => setDeleteClientId(c.id)} className="text-xs px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:bg-red-50 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Inline ledger (accordion) ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="p-0 border-b border-indigo-100">
                            <div className="bg-indigo-50/40 px-6 py-4 space-y-4">

                              {/* Stats */}
                              <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-white border border-gray-100 px-4 py-3 text-center shadow-sm">
                                  <div className="text-base font-bold text-gray-800">{fmt(ledTotal)}</div>
                                  <div className="text-xs text-gray-400 mt-0.5">סה״כ חשבוניות</div>
                                </div>
                                <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 text-center shadow-sm">
                                  <div className="text-base font-bold text-emerald-600">{fmt(ledPaid)}</div>
                                  <div className="text-xs text-emerald-500 mt-0.5">שולם</div>
                                </div>
                                <div className={`rounded-xl border px-4 py-3 text-center shadow-sm ${ledOpen > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                  <div className={`text-base font-bold ${ledOpen > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{ledOpen > 0 ? fmt(ledOpen) : '✓ שולם הכל'}</div>
                                  <div className={`text-xs mt-0.5 ${ledOpen > 0 ? 'text-red-400' : 'text-emerald-400'}`}>יתרה לתשלום</div>
                                </div>
                              </div>

                              {/* Filter tabs */}
                              <div className="flex gap-1 bg-white rounded-xl p-1 w-fit border border-gray-100 shadow-sm">
                                {([
                                  { key: 'all',  label: 'הכל',    count: clientInvs.length },
                                  { key: 'open', label: 'פתוחות', count: openCount },
                                  { key: 'paid', label: 'שולם',   count: paidCount },
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
                                <div className="text-center py-6 text-gray-400 text-sm">טוען חשבוניות...</div>
                              ) : dispInvs.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm">אין חשבוניות להצגה</div>
                              ) : (
                                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                                  <table className="w-full text-sm border-collapse">
                                    <thead>
                                      <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs">
                                        <th className="px-3 py-2.5 text-right font-semibold">מס׳</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">תאריך</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">סוג</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">לפני מע״מ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">סה״כ</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">שולם</th>
                                        <th className="px-3 py-2.5 text-right font-semibold">יתרה</th>
                                        <th className="px-3 py-2.5 text-center font-semibold">סטטוס</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {dispInvs.map((inv, idx) => {
                                        const rem = Math.max(0, roundCents(inv.total - inv.paid))
                                        const isPaid = rem < 1
                                        return (
                                          <tr key={inv.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`} onClick={e => e.stopPropagation()}>
                                            <td className="px-3 py-2 font-mono text-xs text-gray-400">{inv.invoice_num || '—'}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{formatDateFull(inv.date)}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs">{inv.doc_type || '—'}</td>
                                            <td className="px-3 py-2 text-gray-500 text-xs">{fmt(inv.before_vat)}</td>
                                            <td className="px-3 py-2 font-semibold text-gray-800">{fmt(inv.total)}</td>
                                            <td className="px-3 py-2 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                                            <td className="px-3 py-2">
                                              {rem > 0 ? <span className="text-red-500 font-semibold">{fmt(rem)}</span> : <span className="text-gray-300 text-xs">—</span>}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              {isPaid
                                                ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">שולם</span>
                                                : inv.paid > 0
                                                  ? <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">חלקי</span>
                                                  : <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600">ממתין</span>}
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold text-sm">
                                        <td colSpan={4} className="px-3 py-2 text-xs text-gray-500 uppercase">סה״כ ({dispInvs.length})</td>
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
                    <td colSpan={4} className="px-5 py-3 text-gray-500 text-xs uppercase">סה״כ ({filtered.length})</td>
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
            <p className="font-semibold text-gray-800">למחוק את הלקוח?</p>
            <p className="text-sm text-gray-500">הלקוח יימחק. החשבוניות המשויכות אליו יישארו.</p>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteClient(deleteClientId)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">מחק</button>
              <button onClick={() => setDeleteClientId(null)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">ביטול</button>
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

// ── FinProjectsTab ────────────────────────────────────────────────────────────
interface Project { id: string; name: string; category: string }

function FinProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ artist: true, production: true })
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadingInv, setLoadingInv] = useState(false)
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'open' | 'paid'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'artist' | 'production'>('artist')
  const [savingNew, setSavingNew] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  useEsc(showAddModal, () => setShowAddModal(false))
  useEsc(deleteConfirmId !== null, () => setDeleteConfirmId(null))
  const [subTab, setSubTab] = useState<'general' | 'projects'>('general')
  const fmtP = (n: number) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—'

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

  // When project selected — fetch matching invoices + expenses (project_id FK first, then fuzzy name fallback)
  useEffect(() => {
    if (!sel) return
    const project = projects.find(p => p.id === sel)
    if (!project) return
    setLoadingInv(true)
    setLedgerFilter('all')
    Promise.all([
      fetch('/api/invoices').then(r => r.json()).catch(() => ({ invoices: [] })),
      fetch('/api/expenses').then(r => r.json()).catch(() => ({ expenses: [] })),
    ])
      .then(([invData, expData]) => {
        const allInv: InvoiceRow[] = invData.invoices || []
        const allExp: Expense[] = expData.expenses || []
        const q = project.name.toLowerCase()
        const matchedInv = allInv.filter(inv =>
          inv.project_id === sel ||
          (!inv.project_id && (
            inv.client?.toLowerCase().includes(q) ||
            q.includes(inv.client?.toLowerCase() || '__nomatch__')
          ))
        )
        const matchedExp = allExp.filter(ex =>
          ex.project_id === sel ||
          (!ex.project_id && (
            ex.supplier?.toLowerCase().includes(q) ||
            q.includes(ex.supplier?.toLowerCase() || '__nomatch__')
          ))
        )
        setInvoices(matchedInv)
        setExpenses(matchedExp)
      })
      .catch(() => { setInvoices([]); setExpenses([]) })
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
  const generals    = projects.filter(p => p.category === 'general')

  const displayed = invoices.filter(inv => {
    const rem = Math.max(0, roundCents(inv.total - inv.paid))
    if (ledgerFilter === 'open') return rem > 0
    if (ledgerFilter === 'paid') return rem === 0
    return true
  })

  // Before-VAT totals (for the main KPIs — income & expenses are compared on a like-for-like net basis)
  const totalRev  = invoices.reduce((s, i) => s + (i.before_vat || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + i.paid,  0)
  const totalRem  = Math.max(0, invoices.reduce((s, i) => s + i.total, 0) - totalPaid)
  const openCount = invoices.filter(i => Math.max(0, roundCents(i.total - i.paid)) > 0).length
  const paidCount = invoices.filter(i => Math.max(0, roundCents(i.total - i.paid)) === 0).length

  const totalExp        = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const totalExpPaid    = expenses.reduce((s, e) => s + (e.paid   || 0), 0)
  const totalExpTotalInclVat = expenses.reduce((s, e) => s + (e.total || 0), 0)
  const totalExpRem     = Math.max(0, totalExpTotalInclVat - totalExpPaid)
  const netProfit       = totalRev - totalExp

  function ProjectList({ label, category, items }: { label: string; category: string; items: Project[] }) {
    const isOpen = expanded[category] !== false
    return (
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'rgba(99,102,241,0.15)', background: 'rgba(255,255,255,0.04)' }}>
        <div className="flex items-center px-4 py-3" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <button onClick={() => setExpanded(p => ({ ...p, [category]: !p[category] }))} className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(77,208,225,0.2)', color: '#4dd0e1' }}>{items.length}</span>
          </button>
          <button onClick={() => { setNewCategory(category as 'artist' | 'production'); setNewName(''); setShowAddModal(true) }} className="w-5 h-5 rounded-full flex items-center justify-center mr-1 text-sm font-bold transition-colors" style={{ background: 'rgba(77,208,225,0.15)', color: '#4dd0e1' }} title="הוסף">+</button>
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
                  >✕</button>
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

      {/* ── Left sidebar ── */}
      <aside className="w-60 flex-shrink-0 overflow-y-auto p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #0c0e1c 0%, #111827 60%)', borderLeft: '1px solid rgba(99,102,241,0.1)' }}>
        <div className="px-1 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>פרויקטים</p>
        </div>
        <ProjectList label="אומנים" category="artist" items={artists} />
        <ProjectList label="הפקות" category="production" items={productions} />
        {generals.length > 0 && <ProjectList label="כללי" category="general" items={generals} />}
      </aside>

      {/* Add project modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl" onClick={() => setShowAddModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-4">הוסף {newCategory === 'artist' ? '🍤 אומן' : '🍬 הפקה'}</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(['artist', 'production'] as const).map(cat => (
                  <button key={cat} onClick={() => setNewCategory(cat)}
                    className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
                    style={newCategory === cat ? { background: 'rgba(77,208,225,0.2)', color: '#4dd0e1', border: '1px solid rgba(77,208,225,0.3)' } : { background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {cat === 'artist' ? '🍤 אומן' : '🍬 הפקה'}
                  </button>
                ))}
              </div>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addProject()}
                placeholder="שם..."
                className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-sm text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors">ביטול</button>
              <button onClick={addProject} disabled={savingNew || !newName.trim()} className="flex-1 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #4dd0e1, #0284c7)', color: 'white' }}>
                {savingNew ? 'שומר...' : 'הוסף'}
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
              <h3 className="text-base font-bold text-white mb-2">מחיקת {target?.category === 'artist' ? '🍤 אומן' : '🍬 הפקה'}</h3>
              <p className="text-sm text-gray-400 mb-5">למחוק את <span className="font-semibold text-white">{target?.name}</span>? הפעולה אינה ניתנת לביטול.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 text-sm text-gray-400 bg-gray-800 rounded-xl hover:bg-gray-700">ביטול</button>
                <button onClick={() => deleteProject(deleteConfirmId)} className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl">מחק</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-auto p-6 space-y-5">
        {!current ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">בחר פרויקט מהרשימה</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{current.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{invoices.length} חשבוניות · {expenses.length} הוצאות</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: current.category === 'artist' ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.1)', color: current.category === 'artist' ? '#818cf8' : '#10b981' }}>
                {current.category === 'artist' ? '🍤 אומן' : '🍬 הפקה'}
              </span>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'סה"כ הכנסות', value: fmtP(totalRev),    color: '#6366f1' },
                { label: 'סה"כ הוצאות', value: fmtP(totalExp),    color: '#ef4444' },
                { label: 'רווח נטו',    value: fmtP(netProfit),   color: netProfit >= 0 ? '#10b981' : '#ef4444' },
                { label: 'נותר לגבייה', value: fmtP(totalRem),    color: totalRem > 0 ? '#f59e0b' : '#10b981' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
                  <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Secondary income/expense mini-stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'נגבה (הכנסות)',  value: fmtP(totalPaid),    color: '#10b981' },
                { label: 'שולם (הוצאות)',  value: fmtP(totalExpPaid), color: '#10b981' },
                { label: 'פתוח לתשלום',    value: fmtP(totalExpRem),  color: totalExpRem > 0 ? '#f59e0b' : '#10b981' },
                { label: 'מס׳ חשבוניות/הוצאות', value: `${invoices.length} / ${expenses.length}`, color: '#3b82f6' },
              ].map(card => (
                <div key={card.label} className="rounded-2xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div className="text-[11px] mb-1" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
                  <div className="text-base font-bold" style={{ color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Section: Invoices */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                הכנסות <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>({invoices.length})</span>
              </h3>
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                {([
                  { key: 'all',  label: 'הכל',    count: invoices.length },
                  { key: 'open', label: 'פתוחות', count: openCount },
                  { key: 'paid', label: 'שולם',   count: paidCount },
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
            </div>

            {/* Invoice table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {loadingInv ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>טוען חשבוניות...</div>
              ) : displayed.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {invoices.length === 0 ? 'לא נמצאו חשבוניות לפרויקט זה' : 'אין חשבוניות להצגה בפילטר זה'}
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      {['מס׳', 'תאריך', 'סוג', 'לפני מע"מ', 'סה"כ', 'שולם', 'יתרה', 'סטטוס'].map(h => (
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
                        paid:    { bg: '#d1fae5', color: '#065f46', label: 'שולם' },
                        partial: { bg: '#fef3c7', color: '#92400e', label: 'חלקי' },
                        unpaid:  { bg: '#fee2e2', color: '#991b1b', label: 'ממתין' },
                      }[status]
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                          <td className="px-4 py-2.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_num || '—'}</td>
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDateFull(inv.date)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.doc_type || '—'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.issued_by || '—'}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtP(inv.before_vat)}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#6366f1' }}>{fmtP(inv.total)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: '#10b981' }}>{fmtP(inv.paid)}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: rem > 0 ? '#f59e0b' : 'var(--text-secondary)' }}>{rem > 0 ? fmtP(rem) : '—'}</td>
                          <td className="px-4 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>{statusStyle.label}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <td colSpan={3} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>סה"כ ({displayed.length})</td>
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

            {/* Section: Expenses */}
            <div className="flex items-center justify-between pt-6">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                הוצאות <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>({expenses.length})</span>
              </h3>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              {loadingInv ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>טוען הוצאות...</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  לא נמצאו הוצאות לפרויקט זה
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      {['ספק', 'תיאור', 'חודש', 'תאריך תשלום', 'לפני מע״מ', 'שולם', 'יתרה', 'חשבונית'].map(h => (
                        <th key={h} className="px-4 py-3 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...expenses]
                      .sort((a, b) => (b.month || '').localeCompare(a.month || ''))
                      .map((ex, i) => {
                        const rem = Math.max(0, roundCents((ex.total || 0) - (ex.paid || 0)))
                        return (
                          <tr key={ex.id} style={{ borderBottom: '1px solid var(--border-color)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                            <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{ex.supplier || '—'}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{ex.description || '—'}</td>
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{ex.month || '—'}</td>
                            <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{ex.payment_date || '—'}</td>
                            <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: '#ef4444' }}>{fmtP(ex.amount || 0)}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: '#10b981' }}>{fmtP(ex.paid || 0)}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: rem >= 1 ? '#f59e0b' : 'var(--text-secondary)' }}>{rem >= 1 ? fmtP(rem) : '—'}</td>
                            <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{ex.has_invoice ? '✓' : '—'}</td>
                          </tr>
                        )
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                      <td colSpan={4} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>סה"כ ({expenses.length})</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#ef4444' }}>{fmtP(totalExp)}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#10b981' }}>{fmtP(totalExpPaid)}</td>
                      <td className="px-4 py-2.5 text-xs font-bold" style={{ color: '#f59e0b' }}>{fmtP(totalExpRem)}</td>
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

// ── ExpensesTab ───────────────────────────────────────────────────────────────
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
  vat_status: 'מורשה',
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
  const [projDropOpen, setProjDropOpen] = useState(false)
  const [projDropSearch, setProjDropSearch] = useState('')
  const [modal, setModal] = useState<null | { mode: 'add' | 'edit'; expense: Omit<Expense, 'id'> & { id?: number } }>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  useEsc(modal !== null, () => setModal(null))
  const [editingCell, setEditingCell] = useState<{ id: number; field: string } | null>(null)
  const [cellValue, setCellValue] = useState<unknown>(null)
  const [cellSaving, setCellSaving] = useState(false)
  const [cellSupplierSearch, setCellSupplierSearch] = useState('')
  const [showCellSupplierDrop, setShowCellSupplierDrop] = useState(false)
  const [cellSupplierDropIdx, setCellSupplierDropIdx] = useState(-1)
  const cellSupplierDropIdxRef = useRef(-1)
  const updDropIdx = (i: number) => { cellSupplierDropIdxRef.current = i; setCellSupplierDropIdx(i) }
  const cellValueRef = useRef<unknown>(null)
  const updCV = (v: unknown) => { cellValueRef.current = v; setCellValue(v) }
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [showSupplierDrop, setShowSupplierDrop] = useState(false)
  const [transferExpId, setTransferExpId] = useState<number | null>(null)
  const [transferExpMonth, setTransferExpMonth] = useState<string>('')
  const [hoveredExpId, setHoveredExpId] = useState<number | null>(null)
  const [expandedExpId, setExpandedExpId] = useState<number | null>(null)
  const [modalMonthOpen, setModalMonthOpen] = useState(false)
  const [selectedExpYear, setSelectedExpYear] = useState<string>('2026')
  const [expSortField, setExpSortField] = useState<string>('default')
  const [expSortDir, setExpSortDir] = useState<'asc' | 'desc'>('desc')

  const fmt = (n: number) => n ? `₪${Math.round(n).toLocaleString('he-IL')}` : '—'
  const fmtDec = (n: number) => n ? `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

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
      // Accordions default to closed — user opens the months they want to view
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
      alert('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('למחוק הוצאה זו?')) return
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

  const startCellEdit = (id: number, field: string, value: unknown) => {
    cellValueRef.current = value
    setEditingCell({ id, field })
    setCellValue(value)
    if (field === 'supplier') { setCellSupplierSearch(''); setShowCellSupplierDrop(true) }
  }

  const cancelCellEdit = () => {
    cellValueRef.current = null
    setEditingCell(null)
    setCellValue(null)
    setCellSupplierSearch('')
    setShowCellSupplierDrop(false)
  }

  const saveCellEdit = async (expense: Expense) => {
    if (!editingCell) return
    setCellSaving(true)
    const val = cellValueRef.current
    const updates: Record<string, unknown> = { [editingCell.field]: val }
    // Auto-recalculate dependent fields
    if (editingCell.field === 'amount') {
      const amt = Number(val)
      const status = expense.vat_status
      if (status === 'מורשה' || status === 'חברה') {
        updates.vat = roundCents(amt * VAT_RATE)
        updates.total = roundCents(amt + (updates.vat as number))
      } else { updates.vat = 0; updates.total = roundCents(amt) }
    } else if (editingCell.field === 'vat') {
      updates.total = roundCents(expense.amount + Number(val))
    } else if (editingCell.field === 'vat_status') {
      const status = String(val)
      if (status === 'מורשה' || status === 'חברה') {
        updates.vat = roundCents(expense.amount * VAT_RATE)
        updates.total = roundCents(expense.amount + (updates.vat as number))
      } else { updates.vat = 0; updates.total = roundCents(expense.amount) }
    }
    try {
      const res = await fetch(`/api/expenses/${editingCell.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const responseData = await res.json().catch(() => null)
      if (!res.ok) throw new Error(responseData?.error || `HTTP ${res.status}`)
      // Update the single row in-place — no reload, no spinner
      if (responseData?.expense) {
        setExpenses(prev => prev.map(ex => ex.id === editingCell.id ? (responseData.expense as Expense) : ex))
      }
      cellValueRef.current = null
      setEditingCell(null)
      setCellValue(null)
    } catch (err) {
      alert(`שגיאה בשמירה: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setCellSaving(false)
    }
  }

  const upd = (field: string, val: unknown) => {
    if (!modal) return
    const next = { ...modal.expense, [field]: val } as typeof modal.expense
    // auto-calculate vat + total when amount changes and status is מורשה
    if (field === 'amount' || field === 'vat_status') {
      const amt = field === 'amount' ? Number(val) : next.amount
      const status = field === 'vat_status' ? String(val) : next.vat_status
      if (status === 'מורשה' || status === 'חברה') {
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

  // All months from data + available years
  const allMonths = [...new Set(expenses.map(e => e.month).filter(Boolean))].sort()
  const availableExpYears = [...new Set(allMonths.map(m => m.split('-')[0]))].sort()
  const monthsForExpYear = allMonths.filter(m => m.startsWith(selectedExpYear))

  // filtered (includes year + other filters)
  const filtered = expenses.filter(e => {
    if (e.month && !e.month.startsWith(selectedExpYear)) return false
    if (filterProject && e.project_id !== filterProject) return false
    if (filterVat && e.vat_status !== filterVat) return false
    if (filterMonth && e.month !== filterMonth) return false
    if (filterInvoice === 'yes' && !e.has_invoice) return false
    if (filterInvoice === 'no' && e.has_invoice) return false
    return true
  })

  // Build months list: selected year only, with empty months padding
  const filteredMonthsSet = new Set(filtered.map(e => e.month).filter(Boolean))
  const monthsToShow: string[] = filterMonth
    ? [filterMonth]
    : (() => {
        const set = new Set(filteredMonthsSet)
        ALL_MONTHS_FULL
          .filter(m => m.key.startsWith(selectedExpYear))
          .forEach(m => set.add(m.key))
        return [...set].sort()
      })()
  const months = monthsToShow

  const projMap = Object.fromEntries(projects.map(p => [p.id, p]))

  const toggleMonth = (m: string) => setOpenMonths(prev => ({ ...prev, [m]: !prev[m] }))

  // summary
  const totalNet = filtered.reduce((s, e) => s + (e.amount || 0), 0)
  const totalVatSum = filtered.reduce((s, e) => s + (e.vat || 0), 0)
  const totalExp = filtered.reduce((s, e) => s + e.total, 0)
  const totalPaid = filtered.reduce((s, e) => s + e.paid, 0)
  const totalBalance = filtered.reduce((s, e) => s + Math.max(0, roundCents(e.total - e.paid)), 0)
  const noInvoice = filtered.filter(e => !e.has_invoice).length

  const heMonth = (m: string) => {
    if (!m) return ''
    const [y, mo] = m.split('-')
    const names = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'שירותים (נטו)', val: fmt(totalNet), color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-50 dark:bg-gray-800' },
          { label: 'מע"מ', val: fmt(totalVatSum), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'סה"כ לתשלום', val: fmt(totalExp), color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'שולם', val: fmt(totalPaid), color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'יתרה לתשלום', val: fmt(totalBalance), color: totalBalance > 0 ? 'text-rose-600' : 'text-gray-400', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: 'ללא חשבונית', val: String(noInvoice), color: noInvoice > 0 ? 'text-amber-600' : 'text-gray-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border border-gray-100 dark:border-gray-700 px-4 py-3 ${card.bg}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</div>
            <div className={`text-xl font-bold ${card.color}`}>{card.val}</div>
          </div>
        ))}
      </div>

      {/* Year tabs + month sub-tabs */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            {availableExpYears.map(yr => {
              const cnt = expenses.filter(e => e.month?.startsWith(yr)).length
              return (
                <button key={yr}
                  onClick={() => { setSelectedExpYear(yr); setFilterMonth('') }}
                  className={`px-4 py-1 rounded-md text-xs font-semibold transition-all ${selectedExpYear === yr ? 'bg-white dark:bg-gray-600 shadow text-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  {yr} <span className={`text-xs font-normal ${selectedExpYear === yr ? 'text-violet-500' : 'text-gray-400'}`}>({cnt})</span>
                </button>
              )
            })}
          </div>
          {/* Month sub-tabs */}
          {monthsForExpYear.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto flex-wrap" style={{ scrollbarWidth: 'thin' }}>
              <button
                onClick={() => setFilterMonth('')}
                className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${!filterMonth ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-violet-300 hover:text-violet-600'}`}
              >
                כל {selectedExpYear}
              </button>
              {monthsForExpYear.map(m => {
                const cnt = expenses.filter(e => e.month === m).length
                return (
                  <button key={m}
                    onClick={() => setFilterMonth(filterMonth === m ? '' : m)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold transition-all border ${filterMonth === m ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-violet-300 hover:text-violet-600'}`}
                  >
                    {heMonth(m).replace(` ${selectedExpYear}`, '')}
                    <span className={`text-xs font-normal mr-1 ${filterMonth === m ? 'text-violet-200' : 'text-gray-400'}`}>({cnt})</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
        {/* Searchable project dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setProjDropOpen(o => !o); setProjDropSearch('') }}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white flex items-center gap-2 min-w-[150px]"
          >
            <span className="flex-1 text-right truncate">
              {filterProject ? (projects.find(p => p.id === filterProject)?.name ?? 'כל הפרויקטים') : 'כל הפרויקטים'}
            </span>
            <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${projDropOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {projDropOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl w-56">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <input
                  autoFocus
                  type="text"
                  value={projDropSearch}
                  onChange={e => setProjDropSearch(e.target.value)}
                  placeholder="חיפוש פרויקט..."
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                <button
                  type="button"
                  onClick={() => { setFilterProject(''); setProjDropOpen(false) }}
                  className={`w-full text-right px-3 py-1.5 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 ${!filterProject ? 'font-bold text-violet-600' : 'text-gray-700 dark:text-gray-200'}`}
                >כל הפרויקטים</button>
                {projects
                  .filter(p => !projDropSearch || p.name.toLowerCase().includes(projDropSearch.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setFilterProject(p.id); setProjDropOpen(false) }}
                      className={`w-full text-right px-3 py-1.5 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 truncate ${filterProject === p.id ? 'font-bold text-violet-600' : 'text-gray-700 dark:text-gray-200'}`}
                    >{p.name}</button>
                  ))}
              </div>
            </div>
          )}
        </div>
        <select value={filterVat} onChange={e => setFilterVat(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">כל סטטוס מע"מ</option>
          {['מורשה','פטור','חברה','עמותה'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterInvoice} onChange={e => setFilterInvoice(e.target.value as '' | 'yes' | 'no')}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
          <option value="">כל החשבוניות</option>
          <option value="yes">יש חשבונית</option>
          <option value="no">אין חשבונית</option>
        </select>
        {(filterMonth || filterProject || filterVat || filterInvoice) && (
          <button onClick={() => { setFilterMonth(''); setFilterProject(''); setFilterVat(''); setFilterInvoice('') }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">נקה פילטרים</button>
        )}
        <div className="flex-1" />
        <button onClick={() => openAdd()}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-1.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          הוסף הוצאה
        </button>
      </div>

      {/* Accordion by month */}
      {months.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l-4-4 4-4M15 10l4 4-4 4" /></svg>
          <p>אין הוצאות רשומות</p>
          <button onClick={() => openAdd()} className="mt-3 text-sm text-violet-600 underline">הוסף הוצאה ראשונה</button>
        </div>
      ) : (
        months.map(month => {
          const rowsRaw = filtered.filter(e => e.month === month)
          const rows = [...rowsRaw].sort((a, b) => {
            if (expSortField === 'default') return a.id - b.id
            let av: string | number = 0, bv: string | number = 0
            if (expSortField === 'supplier')   { av = a.supplier || ''; bv = b.supplier || '' }
            if (expSortField === 'description') { av = a.description || ''; bv = b.description || '' }
            if (expSortField === 'amount')      { av = a.amount || 0;   bv = b.amount || 0 }
            if (expSortField === 'total')       { av = a.total || 0;    bv = b.total || 0 }
            if (expSortField === 'balance')     { av = Math.max(0, roundCents(a.total - a.paid)); bv = Math.max(0, roundCents(b.total - b.paid)) }
            if (expSortField === 'payment_date'){ av = a.payment_date || ''; bv = b.payment_date || '' }
            if (expSortField === 'project')     { av = projMap[a.project_id || '']?.name || ''; bv = projMap[b.project_id || '']?.name || '' }
            if (av < bv) return expSortDir === 'asc' ? -1 : 1
            if (av > bv) return expSortDir === 'asc' ? 1 : -1
            return 0
          })
          const mNet = rows.reduce((s, e) => s + (e.amount || 0), 0)
          const mVat = rows.reduce((s, e) => s + (e.vat || 0), 0)
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
                <span className="font-bold text-gray-800 dark:text-white text-sm">{heMonth(month).replace(` ${selectedExpYear}`, '')}</span>
                <span className="text-xs text-gray-400 mr-1">({rows.length})</span>
                <div className="flex-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">שירותים: <span className="font-semibold text-gray-700 dark:text-gray-200">{fmt(mNet)}</span></span>
                {mVat > 0 && <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">מע&quot;מ: <span className="font-semibold text-blue-600">{fmt(mVat)}</span></span>}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">סה&quot;כ לתשלום: <span className="font-semibold text-violet-600">{fmt(mTotal)}</span></span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-4">שולם: <span className="font-semibold text-emerald-600">{fmt(mPaid)}</span></span>
                {mBalance > 0 && <span className="text-xs text-rose-500 font-semibold ml-4">יתרה לתשלום: {fmt(mBalance)}</span>}
                <button onClick={e => { e.stopPropagation(); openAdd(month) }}
                  className="mr-2 text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  הוסף
                </button>
              </button>

              {isOpen && (
                <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        {([
                          { label: 'פרויקט',        field: 'project' },
                          { label: 'ספק',            field: null },
                          { label: 'שם הספק',        field: 'supplier' },
                          { label: 'סכום',           field: 'amount' },
                          { label: 'מע"מ',           field: null },
                          { label: 'סה"כ',           field: 'total' },
                          { label: 'סטטוס',          field: null },
                          { label: 'תאריך תשלום',    field: 'payment_date' },
                          { label: 'יתרה לתשלום',    field: 'balance' },
                          { label: 'חשבונית',        field: null },
                          { label: '',               field: null },
                        ] as { label: string; field: string | null }[]).map(({ label, field }) => (
                          <th key={label}
                            onClick={field ? () => {
                              if (expSortField === field) setExpSortDir(d => d === 'asc' ? 'desc' : 'asc')
                              else { setExpSortField(field); setExpSortDir('desc') }
                            } : undefined}
                            className={`px-3 py-2 text-right text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap select-none ${field ? 'cursor-pointer hover:text-violet-600 dark:hover:text-violet-400' : ''}`}
                          >
                            {label}
                            {field && expSortField === field && (
                              <span className="mr-1 text-violet-500">{expSortDir === 'asc' ? '↑' : '↓'}</span>
                            )}
                            {field && expSortField !== field && (
                              <span className="mr-1 text-gray-300 opacity-0 group-hover:opacity-100">↕</span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {rows.map((e, i) => {
                        const trueBalance = roundCents(e.total - e.paid)
                        // For credit notes (negative total), "paid" means fully settled
                        const balance = e.total < 0 ? Math.min(0, trueBalance) : Math.max(0, trueBalance)
                        const proj = e.project_id ? projMap[e.project_id] : null

                        // helpers for this row
                        const isEC = (f: string) => editingCell?.id === e.id && editingCell?.field === f
                        const inCls = 'text-xs border border-violet-400 rounded px-1 py-0.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500'
                        const pencilBtn = (field: string, val: unknown) => (
                          <button
                            onClick={() => startCellEdit(e.id, field, val)}
                            className={`${hoveredExpId === e.id ? 'opacity-50' : 'opacity-0'} hover:!opacity-100 p-0.5 rounded text-gray-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-opacity shrink-0 ml-0.5`}
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            </svg>
                          </button>
                        )
                        const sc = (
                          <span className="flex gap-0.5 shrink-0 ml-0.5">
                            <button onClick={() => saveCellEdit(e)} disabled={cellSaving}
                              className="p-0.5 rounded text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
                              {cellSaving
                                ? <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </button>
                            <button onClick={cancelCellEdit}
                              className="p-0.5 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </span>
                        )

                        const isExpanded = expandedExpId === e.id
                        return (
                          <Fragment key={e.id}>
                          <tr
                            className={`cursor-pointer ${i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''} ${isExpanded ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}
                            onClick={() => setExpandedExpId(isExpanded ? null : e.id)}
                            onMouseEnter={() => setHoveredExpId(e.id)}
                            onMouseLeave={() => setHoveredExpId(null)}
                          >

                            {/* פרויקט */}
                            <td className="px-3 py-2 text-xs">
                              {isEC('project_id') ? (
                                <div className="flex items-center gap-1">
                                  <select autoFocus value={String(cellValue || '')} onChange={ev => updCV(ev.target.value || null)}
                                    onKeyDown={ev => { if (ev.key === 'Enter') saveCellEdit(e); if (ev.key === 'Escape') cancelCellEdit() }}
                                    className={inCls + ' max-w-[120px]'}>
                                    <option value="">—</option>
                                    {['artist','production'].map(cat => (
                                      <optgroup key={cat} label={cat === 'artist' ? 'אומנים' : 'הפקה'}>
                                        {projects.filter(p => p.category === cat).map(p => (
                                          <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                                  {sc}
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  {proj
                                    ? <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${proj.category === 'artist' ? 'bg-pink-100 text-pink-700' : 'bg-indigo-100 text-indigo-700'}`}>{proj.name}</span>
                                    : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                  {pencilBtn('project_id', e.project_id)}
                                </div>
                              )}
                            </td>

                            {/* ספק מאומת */}
                            <td className="px-3 py-2 text-center">
                              {suppliers.some(s => s.name === e.supplier)
                                ? <span className="text-emerald-500 text-sm font-bold" title="ספק קיים במאגר">✔</span>
                                : <span className="text-rose-400 text-xs font-bold" title="ספק לא קיים במאגר">✗</span>}
                            </td>

                            {/* שם הספק */}
                            <td className="px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                              {isEC('supplier') ? (
                                <div className="relative flex items-center gap-1">
                                  <div className="relative">
                                    {(() => {
                                      const filteredSups = suppliers.filter(s => !cellSupplierSearch || s.name.toLowerCase().includes(cellSupplierSearch.toLowerCase()))
                                      return (<>
                                        <input autoFocus type="text"
                                          value={showCellSupplierDrop ? cellSupplierSearch : String(cellValue || '')}
                                          onChange={ev => { setCellSupplierSearch(ev.target.value); setShowCellSupplierDrop(true); updDropIdx(-1) }}
                                          onFocus={() => { setCellSupplierSearch(''); setShowCellSupplierDrop(true); updDropIdx(-1) }}
                                          onBlur={() => setTimeout(() => { setShowCellSupplierDrop(false); updDropIdx(-1) }, 150)}
                                          onKeyDown={ev => {
                                            if (ev.key === 'Escape') { cancelCellEdit(); return }
                                            if (ev.key === 'ArrowDown') {
                                              ev.preventDefault()
                                              setShowCellSupplierDrop(true)
                                              updDropIdx(Math.min(cellSupplierDropIdxRef.current + 1, filteredSups.length - 1))
                                            } else if (ev.key === 'ArrowUp') {
                                              ev.preventDefault()
                                              updDropIdx(Math.max(cellSupplierDropIdxRef.current - 1, 0))
                                            } else if (ev.key === 'Enter') {
                                              ev.preventDefault()
                                              ev.stopPropagation()
                                              // If dropdown is open with a highlighted pick — select it
                                              if (showCellSupplierDrop && cellSupplierDropIdxRef.current >= 0) {
                                                const pick = filteredSups[cellSupplierDropIdxRef.current]
                                                if (pick) {
                                                  updCV(pick.name)
                                                  setCellSupplierSearch('')
                                                  setShowCellSupplierDrop(false)
                                                  updDropIdx(-1)
                                                  return
                                                }
                                              }
                                              // If dropdown is open + user typed something — pick top match
                                              if (showCellSupplierDrop && cellSupplierSearch && filteredSups.length > 0) {
                                                const pick = filteredSups[0]
                                                updCV(pick.name)
                                                setCellSupplierSearch('')
                                                setShowCellSupplierDrop(false)
                                                updDropIdx(-1)
                                                return
                                              }
                                              // Otherwise — save the current value
                                              saveCellEdit(e)
                                            }
                                          }}
                                          placeholder="חפש ספק..."
                                          className={inCls + ' w-32'}
                                        />
                                        {showCellSupplierDrop && (
                                          <div className="absolute z-[200] top-full mt-0.5 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl max-h-48 overflow-y-auto min-w-[200px]">
                                            {filteredSups.map((s, idx) => (
                                              <button key={s.id} type="button"
                                                onMouseDown={() => {
                                                  updCV(s.name)
                                                  setCellSupplierSearch('')
                                                  setShowCellSupplierDrop(false)
                                                  updDropIdx(-1)
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors text-right ${idx === cellSupplierDropIdx ? 'bg-violet-100 dark:bg-violet-900/40' : 'hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}>
                                                <span className="font-medium text-gray-800 dark:text-white">{s.name}</span>
                                                {s.taxStatus && <span className={`mr-2 px-1.5 py-0.5 rounded text-xs font-semibold ${TAX_STATUS_STYLE[s.taxStatus] || 'bg-gray-100 text-gray-600'}`}>{s.taxStatus}</span>}
                                              </button>
                                            ))}
                                            {filteredSups.length === 0 && (
                                              <div className="px-3 py-2 text-xs text-gray-400">לא נמצאו ספקים</div>
                                            )}
                                          </div>
                                        )}
                                      </>)
                                    })()}
                                  </div>
                                  {sc}
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 max-w-[120px]">
                                  <span className="truncate">{e.supplier || '—'}</span>
                                  {pencilBtn('supplier', e.supplier)}
                                </div>
                              )}
                            </td>

                            {/* סכום */}
                            <td className="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 text-left whitespace-nowrap">
                              {isEC('amount') ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus type="number" step="0.01" value={String(cellValue ?? '')} onChange={ev => updCV(parseFloat(ev.target.value) || 0)}
                                    onKeyDown={ev => { if (ev.key === 'Enter') saveCellEdit(e); if (ev.key === 'Escape') cancelCellEdit() }}
                                    className={inCls + ' w-20 text-left'} />
                                  {sc}
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  <span>{fmtDec(e.amount)}</span>
                                  {pencilBtn('amount', e.amount)}
                                </div>
                              )}
                            </td>

                            {/* מע"מ */}
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 text-left whitespace-nowrap">
                              {isEC('vat') ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus type="number" step="0.01" value={String(cellValue ?? '')} onChange={ev => updCV(parseFloat(ev.target.value) || 0)}
                                    onKeyDown={ev => { if (ev.key === 'Enter') saveCellEdit(e); if (ev.key === 'Escape') cancelCellEdit() }}
                                    className={inCls + ' w-20 text-left'} />
                                  {sc}
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  <span>{e.vat ? fmtDec(e.vat) : '—'}</span>
                                  {pencilBtn('vat', e.vat)}
                                </div>
                              )}
                            </td>

                            {/* סה"כ */}
                            <td className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 text-left whitespace-nowrap">
                              {isEC('total') ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus type="number" step="0.01" value={String(cellValue ?? '')} onChange={ev => updCV(parseFloat(ev.target.value) || 0)}
                                    onKeyDown={ev => { if (ev.key === 'Enter') saveCellEdit(e); if (ev.key === 'Escape') cancelCellEdit() }}
                                    className={inCls + ' w-20 text-left'} />
                                  {sc}
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  <span>{fmtDec(e.total)}</span>
                                  {pencilBtn('total', e.total)}
                                </div>
                              )}
                            </td>

                            {/* סטטוס שולם */}
                            <td className="px-3 py-2 whitespace-nowrap" onClick={ev => ev.stopPropagation()}>
                              {(() => {
                                const isPaid = Math.abs(trueBalance) < 0.01
                                return (
                                  <button
                                    onClick={async () => {
                                      const today = new Date()
                                      const dd = String(today.getDate()).padStart(2,'0')
                                      const mm = String(today.getMonth()+1).padStart(2,'0')
                                      const yy = String(today.getFullYear()).slice(-2)
                                      const todayStr = `${dd}.${mm}.${yy}`
                                      const newPaid  = isPaid ? 0 : e.total
                                      const newDate  = isPaid ? '' : todayStr
                                      setExpenses(prev => prev.map(ex => ex.id === e.id ? { ...ex, paid: newPaid, payment_date: newDate } : ex))
                                      const res = await fetch(`/api/expenses/${e.id}`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ paid: newPaid, payment_date: newDate })
                                      })
                                      const data = await res.json().catch(() => null)
                                      if (res.ok && data?.expense) {
                                        setExpenses(prev => prev.map(ex => ex.id === e.id ? (data.expense as Expense) : ex))
                                      } else {
                                        setExpenses(prev => prev.map(ex => ex.id === e.id ? { ...ex, paid: e.paid, payment_date: e.payment_date } : ex))
                                      }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:ring-2 hover:ring-offset-1 ${isPaid ? 'bg-emerald-100 text-emerald-700 hover:ring-emerald-300' : 'bg-gray-100 text-gray-500 hover:ring-gray-300 dark:bg-gray-700 dark:text-gray-400'}`}
                                    title={isPaid ? `שולם ${fmtDec(e.paid)} — לחץ לביטול` : 'לחץ לסימון כשולם'}
                                  >
                                    {isPaid ? `✓ שולם ${fmtDec(e.paid)}` : 'לא שולם'}
                                  </button>
                                )
                              })()}
                            </td>

                            {/* תאריך תשלום */}
                            <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {isEC('payment_date') ? (
                                <div className="flex items-center gap-1">
                                  <input autoFocus type="date" value={israeliToISO(String(cellValue ?? ''))}
                                    onChange={ev => updCV(ev.target.value ? isoToIsraeli(ev.target.value) : '')}
                                    onKeyDown={ev => { if (ev.key === 'Enter') saveCellEdit(e); if (ev.key === 'Escape') cancelCellEdit() }}
                                    className={inCls + ' w-36'} />
                                  {sc}
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5">
                                  <span>{e.payment_date || '—'}</span>
                                  {pencilBtn('payment_date', e.payment_date)}
                                </div>
                              )}
                            </td>

                            {/* יתרה לתשלום - computed, read-only */}
                            <td className="px-3 py-2 text-xs text-left whitespace-nowrap">
                              {balance > 0
                                ? <span className="text-rose-500 font-semibold">{fmtDec(balance)}</span>
                                : <span className="text-emerald-500 text-xs">✔</span>}
                            </td>

                            {/* חשבונית - toggle on click */}
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={async () => {
                                  const newVal = !e.has_invoice
                                  setExpenses(prev => prev.map(ex => ex.id === e.id ? { ...ex, has_invoice: newVal } : ex))
                                  const res = await fetch(`/api/expenses/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ has_invoice: newVal }) })
                                  if (!res.ok) setExpenses(prev => prev.map(ex => ex.id === e.id ? { ...ex, has_invoice: !newVal } : ex))
                                }}
                                title={e.has_invoice ? 'יש חשבונית — לחץ להסרה' : 'אין חשבונית — לחץ להוספה'}
                                className="hover:scale-110 transition-transform"
                              >
                                {e.has_invoice
                                  ? <span className="text-emerald-500 text-sm">✔</span>
                                  : <span className="text-rose-400 text-xs font-bold">✗</span>}
                              </button>
                            </td>

                            {/* Transfer + Delete */}
                            <td className="px-3 py-2 whitespace-nowrap" onClick={ev => ev.stopPropagation()}>
                              <div className={`flex items-center gap-1 transition-opacity ${(hoveredExpId === e.id || transferExpId === e.id) ? 'opacity-100' : 'opacity-0'}`}>
                                {/* Assign to month */}
                                <div className="relative">
                                  <button
                                    onClick={() => { setTransferExpId(transferExpId === e.id ? null : e.id); setTransferExpMonth('') }}
                                    title="שיוך לחודש"
                                    className="px-1.5 py-1 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 text-gray-400 hover:text-violet-600 transition-colors text-[10px] font-semibold"
                                  >שיוך לחודש</button>
                                  {transferExpId === e.id && (
                                    <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-gray-600 rounded-2xl shadow-2xl z-50 min-w-[180px]" dir="rtl">
                                      <div className="p-2 text-xs font-semibold text-gray-500 border-b border-gray-100 dark:border-gray-700">שיוך לחודש:</div>
                                      <div className="max-h-52 overflow-y-auto">
                                        {ALL_MONTHS_FULL.map(mo => (
                                          <button
                                            key={mo.key}
                                            onClick={() => setTransferExpMonth(mo.key)}
                                            className={`w-full text-right px-3 py-1.5 text-xs transition-colors ${transferExpMonth === mo.key ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 font-bold' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-700 dark:text-gray-200 hover:text-indigo-700'}`}
                                          >{mo.label}</button>
                                        ))}
                                      </div>
                                      <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                        <button
                                          disabled={!transferExpMonth}
                                          onClick={async () => {
                                            if (!transferExpMonth) return
                                            await fetch(`/api/expenses/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: transferExpMonth }) })
                                            setExpenses(prev => prev.map(x => x.id === e.id ? { ...x, month: transferExpMonth } : x))
                                            setTransferExpId(null)
                                            setTransferExpMonth('')
                                          }}
                                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors"
                                        >אישור</button>
                                        <button
                                          onClick={() => { setTransferExpId(null); setTransferExpMonth('') }}
                                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >ביטול</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <button onClick={ev => { ev.stopPropagation(); handleDelete(e.id) }} disabled={deleting === e.id}
                                  className="p-1 rounded-lg text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors disabled:opacity-50" title="מחק">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* Accordion description row */}
                          {isExpanded && (
                            <tr className={`${i % 2 === 1 ? 'bg-gray-50/50 dark:bg-gray-800/50' : ''} bg-indigo-50/30 dark:bg-indigo-900/10`}>
                              <td colSpan={11} className="px-6 py-2 border-t border-indigo-100 dark:border-indigo-800">
                                <div className="flex items-center gap-2" onClick={ev => ev.stopPropagation()}>
                                  <span className="text-xs font-semibold text-gray-400 shrink-0">תיאור:</span>
                                  {isEC('description') ? (
                                    <div className="flex items-center gap-1">
                                      <input autoFocus type="text" value={String(cellValue ?? '')} onChange={ev => updCV(ev.target.value)}
                                        onKeyDown={ev => { if (ev.key === 'Enter') saveCellEdit(e); if (ev.key === 'Escape') cancelCellEdit() }}
                                        className="text-xs border border-violet-400 rounded px-2 py-0.5 bg-white dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 w-72" />
                                      <button onClick={() => saveCellEdit(e)} disabled={cellSaving}
                                        className="p-0.5 rounded text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                      </button>
                                      <button onClick={cancelCellEdit}
                                        className="p-0.5 rounded text-gray-400 hover:text-rose-600 transition-colors">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-600 dark:text-gray-300">{e.description || '—'}</span>
                                      <button onClick={() => startCellEdit(e.id, 'description', e.description)}
                                        className="p-0.5 rounded text-gray-300 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                      </button>
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
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-700">
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={4} className="px-3 py-2 text-xs font-bold text-gray-500">סה"כ חודש</td>
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
              <h2 className="text-base font-bold text-gray-800 dark:text-white">{modal.mode === 'add' ? 'הוספת הוצאה' : 'עריכת הוצאה'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {/* Month accordion picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">חודש</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setModalMonthOpen(o => !o)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 text-right flex items-center justify-between"
                  >
                    <span>
                      {modal.expense.month
                        ? (() => { const [y, m] = modal.expense.month.split('-'); return `${MONTH_NAMES_HE[parseInt(m)-1]} ${y}` })()
                        : 'בחר חודש...'}
                    </span>
                    <span className="text-gray-400 text-xs">{modalMonthOpen ? '▲' : '▼'}</span>
                  </button>
                  {modalMonthOpen && (
                    <div className="absolute top-full mt-1 right-0 left-0 bg-white dark:bg-gray-800 border border-violet-200 dark:border-gray-600 rounded-xl shadow-2xl z-50 max-h-56 overflow-y-auto" dir="rtl">
                      {ALL_MONTHS_FULL.map(mo => (
                        <button
                          key={mo.key}
                          type="button"
                          onClick={() => { upd('month', mo.key); setModalMonthOpen(false) }}
                          className={`w-full text-right px-4 py-2 text-sm transition-colors ${modal.expense.month === mo.key ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 font-semibold' : 'hover:bg-violet-50 dark:hover:bg-violet-900/30 text-gray-700 dark:text-gray-200'}`}
                        >{mo.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Supplier picker */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">ספק</label>
                <div className="relative">
                  <input
                    type="text"
                    value={showSupplierDrop ? supplierSearch : (modal.expense.supplier || '')}
                    onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDrop(true) }}
                    onFocus={() => { setSupplierSearch(''); setShowSupplierDrop(true) }}
                    onBlur={() => setTimeout(() => setShowSupplierDrop(false), 150)}
                    placeholder="חפש ספק..."
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
                        <div className="px-3 py-2 text-sm text-gray-400">לא נמצאו ספקים</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Description + Project */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">תיאור</label>
                  <input type="text" value={modal.expense.description} onChange={e => upd('description', e.target.value)} placeholder="תיאור"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">פרויקט</label>
                  <select value={modal.expense.project_id || ''} onChange={e => upd('project_id', e.target.value || null)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300">
                    <option value="">ללא פרויקט</option>
                    {['artist','production'].map(cat => (
                      <optgroup key={cat} label={cat === 'artist' ? 'אומנים' : 'הפקה'}>
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
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">סכום לפני מע"מ</label>
                  <input type="number" step="0.01" value={modal.expense.amount || ''} onChange={e => upd('amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">מע"מ</label>
                  <input type="number" step="0.01" value={modal.expense.vat || ''} onChange={e => upd('vat', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">סה"כ</label>
                  <input type="number" step="0.01" value={modal.expense.total || ''} onChange={e => upd('total', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>
              {/* Paid + Payment date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">שולם</label>
                  <input type="number" step="0.01" value={modal.expense.paid || ''} onChange={e => upd('paid', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">תאריך תשלום</label>
                  <input type="text" value={modal.expense.payment_date} onChange={e => upd('payment_date', e.target.value)} placeholder="DD.MM.YY"
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>
              {/* Has invoice + notes */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={modal.expense.has_invoice} onChange={e => upd('has_invoice', e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600" />
                  יש חשבונית
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">הערות</label>
                <textarea value={modal.expense.notes} onChange={e => upd('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition-colors text-sm">
                {saving ? 'שומר...' : modal.mode === 'add' ? 'הוסף הוצאה' : 'שמור שינויים'}
              </button>
              <button onClick={() => setModal(null)}
                className="px-5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                ביטול
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

      {activeTab === 'authority_payments' && <AuthorityPaymentsTab />}

      {activeTab === 'old_table' && (
        <div className="flex-1 flex flex-col min-h-0">
          <iframe
            src="https://docs.google.com/spreadsheets/d/e/2PACX-1vTbSGGOVXESrSzFqHyFXdGNbpW_s7O6AVR8JF8MLzSXsLpJ5XCv3syW038Vp0pIapEWfYJ35hDXH_GJ/pubhtml?gid=584902190&widget=true&headers=false"
            className="flex-1 w-full border-0"
            title="טבלה ישנה"
            loading="lazy"
          />
        </div>
      )}
    </div>
  )
}

// ── AuthorityPaymentsTab ─────────────────────────────────────────────────────
function AuthorityPaymentsTab() {
  const AUTHORITY_TYPES = [
    { key: 'vat',         label: 'מע"מ',              color: '#6366f1', bg: 'rgba(99,102,241,0.07)'  },
    { key: 'income_tax',  label: 'מס הכנסה',          color: '#f59e0b', bg: 'rgba(245,158,11,0.07)'  },
    { key: 'nii',         label: 'ביטוח לאומי',       color: '#10b981', bg: 'rgba(16,185,129,0.07)'  },
    { key: 'withholding', label: 'ניכוי מס במקור',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.07)'  },
  ]
  type AuthPayment = { id: number; authority: string; amount: number; period: string; due_date: string; paid_date: string; status: string; notes: string }
  const [payments, setPayments] = useState<AuthPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [statusForm, setStatusForm] = useState<'paid'|'pending'|'overdue'>('paid')
  const [form, setForm] = useState({ authority: 'vat', amount: '', period: '', due_date: '', paid_date: '', notes: '' })
  const fmt = (n: number) => n ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

  useEffect(() => {
    fetch('/api/authority-payments')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPayments(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex-1 flex flex-col min-h-0 p-4 gap-3" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-gray-800">תשלומי רשויות</h2>
          <p className="text-xs text-gray-400 mt-0.5">מע"מ, מס הכנסה, ביטוח לאומי, ניכויים</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          הוסף תשלום
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-shrink-0">
        {AUTHORITY_TYPES.map(a => {
          const total = payments.filter(p => p.authority === a.key).reduce((s, p) => s + (p.amount || 0), 0)
          return (
            <div key={a.key} className="rounded-2xl border border-gray-100 px-4 py-3" style={{ background: a.bg }}>
              <div className="text-xs text-gray-500 mb-1">{a.label}</div>
              <div className="text-base font-bold" style={{ color: a.color }}>{fmt(total)}</div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="flex-1 rounded-2xl overflow-auto border border-gray-100 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">טוען...</div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
            <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <p className="text-sm">אין תשלומי רשויות עדיין</p>
            <button onClick={() => setShowAdd(true)} className="text-indigo-500 text-sm hover:underline">+ הוסף תשלום ראשון</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide bg-gray-50">
                <th className="px-4 py-3 text-right font-semibold">רשות</th>
                <th className="px-4 py-3 text-right font-semibold">תקופה</th>
                <th className="px-4 py-3 text-right font-semibold">סכום</th>
                <th className="px-4 py-3 text-right font-semibold">תאריך תשלום</th>
                <th className="px-4 py-3 text-right font-semibold">סטטוס</th>
                <th className="px-4 py-3 text-right font-semibold">הערות</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map(p => {
                const auth = AUTHORITY_TYPES.find(a => a.key === p.authority)
                const statusLabel = p.status === 'paid' ? 'שולם' : p.status === 'overdue' ? 'באיחור' : 'ממתין'
                const statusColor = p.status === 'paid' ? 'text-emerald-600 bg-emerald-50' : p.status === 'overdue' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                return (
                  <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-lg text-xs font-semibold" style={{ background: auth?.bg, color: auth?.color }}>{auth?.label || p.authority}</span></td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.period || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.paid_date || p.due_date || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${statusColor}`}>{statusLabel}</span></td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{p.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={async () => { await fetch(`/api/authority-payments/${p.id}`, { method: 'DELETE' }); setPayments(prev => prev.filter(x => x.id !== p.id)) }} className="p-1 rounded-lg hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-base">הוספת תשלום רשות</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">רשות</label>
                <select value={form.authority} onChange={e => setForm(f => ({ ...f, authority: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {AUTHORITY_TYPES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">תקופה (לדוגמה: 04/2026)</label>
                <input type="text" placeholder="04/2026" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">סכום (₪)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">תאריך תשלום</label>
                <input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">סטטוס</label>
                <select value={statusForm} onChange={e => setStatusForm(e.target.value as 'paid'|'pending'|'overdue')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="paid">שולם</option>
                  <option value="pending">ממתין</option>
                  <option value="overdue">באיחור</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">הערות</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={async () => {
                  const res = await fetch('/api/authority-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) || 0, status: statusForm }) })
                  const data = await res.json()
                  if (!data.error) { setPayments(prev => [...prev, data]); setShowAdd(false); setForm({ authority: 'vat', amount: '', period: '', due_date: '', paid_date: '', notes: '' }); setStatusForm('paid') }
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#7c3aed)' }}
              >שמור</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 hover:bg-gray-50 transition-colors">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
