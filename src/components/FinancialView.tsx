'use client'
import { useState, useEffect } from 'react'

export type FinTab = 'dashboard' | 'old_table' | 'suppliers' | 'invoices' | 'clients'

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
  מורשה: 'bg-emerald-100 text-emerald-700',
  פטור: 'bg-lime-100 text-lime-700',
  חברה: 'bg-teal-100 text-teal-700',
  עמותה: 'bg-sky-100 text-sky-700',
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
      .catch(() => setError('שגיאה בטעינת ספקים'))
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
              <Detail label="ת.ז / ח.פ" value={selected.idNumber} />
              <Detail label="תפקיד" value={selected.role} />
              <Detail label="מחלקה" value={selected.department} />
              <Detail label="טלפון" value={selected.phone} href={`tel:${selected.phone}`} />
              <Detail label="אימייל" value={selected.email} href={`mailto:${selected.email}`} />
              <Detail label="מוטב" value={selected.beneficiary} />
              <Detail label="בנק" value={selected.bank?.replace(/^\d+ — /, '')} />
              <Detail label="סניף" value={selected.branch} />
              <Detail label="מספר חשבון" value={selected.accountNumber} mono />
              {selected.daily && <Detail label="יומית" value={selected.daily + ' ₪'} />}
            </div>

            <div className="flex gap-4 pt-2 border-t border-gray-100">
              <div className={`flex items-center gap-1.5 text-xs ${selected.hasBooksCert ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${selected.hasBooksCert ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                אישור ניהול ספרים
              </div>
              <div className={`flex items-center gap-1.5 text-xs ${selected.hasAccountCert ? 'text-emerald-600' : 'text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${selected.hasAccountCert ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                אישור ניהול חשבון
              </div>
            </div>

            {selected.notes && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{selected.notes}</div>
            )}

            <button
              onClick={() => setSelected(null)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              סגור
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface InvoiceRow {
  rowIndex: number
  issuedBy: string
  sentTo: string
  date: string
  docType: string
  invoiceNum: string
  client: string
  beforeVat: number
  total: number
  paid: number
  remaining: number
  status: 'paid' | 'partial' | 'unpaid'
}

const STATUS_LABEL: Record<string, string> = { paid: 'שולם', partial: 'חלקי', unpaid: 'ממתין' }
const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-600',
}

function InvoicesTab() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selected, setSelected] = useState<InvoiceRow | null>(null)

  useEffect(() => {
    fetch('/api/google-sheets-invoices')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setInvoices(d.invoices || [])
      })
      .catch(() => setError('שגיאה בטעינת חשבוניות'))
      .finally(() => setLoading(false))
  }, [])

  const clients = [...new Set(invoices.map(i => i.client).filter(Boolean))].sort()
  const docTypes = [...new Set(invoices.map(i => i.docType).filter(Boolean))].sort()

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch = !q || inv.client.toLowerCase().includes(q) || inv.invoiceNum.includes(q) || inv.issuedBy.toLowerCase().includes(q)
    const matchClient = !filterClient || inv.client === filterClient
    const matchDoc = !filterDocType || inv.docType === filterDocType
    const matchStatus = !filterStatus || inv.status === filterStatus
    return matchSearch && matchClient && matchDoc && matchStatus
  })

  const totalAmount = filtered.reduce((s, i) => s + i.total, 0)
  const totalPaid = filtered.reduce((s, i) => s + i.paid, 0)
  const totalRemaining = filtered.reduce((s, i) => s + i.remaining, 0)

  const fmt = (n: number) => n ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-400 text-sm">טוען חשבוניות מ-Google Sheets...</div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-red-500 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-800">חשבוניות</h2>
          <p className="text-xs text-gray-400 mt-0.5">{invoices.length} חשבוניות סה"כ</p>
        </div>
        <a
          href={INVOICES_EDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          הזנת חשבונית חדשה
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 flex-shrink-0">
        {[
          { label: 'חשבוניות מוצגות', value: filtered.length, color: '#6366f1' },
          { label: 'סה"כ לתשלום', value: fmt(totalAmount), color: '#3b82f6' },
          { label: 'שולם', value: fmt(totalPaid), color: '#10b981' },
          { label: 'יתרה לגביה', value: fmt(totalRemaining), color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש לקוח, מס' חשבונית, מי הוציא..."
          className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">כל הלקוחות</option>
          {clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterDocType} onChange={e => setFilterDocType(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">כל סוגי המסמך</option>
          {docTypes.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">כל הסטטוסים</option>
          <option value="paid">שולם</option>
          <option value="partial">חלקי</option>
          <option value="unpaid">ממתין</option>
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-right font-semibold">מס'</th>
              <th className="px-4 py-3 text-right font-semibold">לקוח</th>
              <th className="px-4 py-3 text-right font-semibold">תאריך</th>
              <th className="px-4 py-3 text-right font-semibold">סוג</th>
              <th className="px-4 py-3 text-right font-semibold">מי הוציא</th>
              <th className="px-4 py-3 text-right font-semibold">לפני מע"מ</th>
              <th className="px-4 py-3 text-right font-semibold">סה"כ לתשלום</th>
              <th className="px-4 py-3 text-right font-semibold">שולם</th>
              <th className="px-4 py-3 text-right font-semibold">יתרה</th>
              <th className="px-4 py-3 text-center font-semibold">סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">לא נמצאו חשבוניות</td></tr>
            ) : filtered.map((inv, i) => (
              <tr
                key={inv.rowIndex}
                onClick={() => setSelected(inv)}
                className={`border-b border-gray-100 hover:bg-indigo-50 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoiceNum || '—'}</td>
                <td className="px-4 py-3 font-semibold text-gray-800 max-w-[160px] truncate">{inv.client || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{inv.date || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{inv.docType || '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{inv.issuedBy || '—'}</td>
                <td className="px-4 py-3 text-gray-600 text-xs">{fmt(inv.beforeVat)}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">{fmt(inv.total)}</td>
                <td className="px-4 py-3 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                <td className="px-4 py-3">
                  {inv.remaining > 0 ? <span className="text-red-500 font-semibold">{fmt(inv.remaining)}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLE[inv.status]}`}>
                    {STATUS_LABEL[inv.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td colSpan={5} className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wide">סה"כ ({filtered.length})</td>
                <td className="px-4 py-3 text-gray-700">{fmt(filtered.reduce((s, i) => s + i.beforeVat, 0))}</td>
                <td className="px-4 py-3 text-gray-800">{fmt(totalAmount)}</td>
                <td className="px-4 py-3 text-emerald-600">{fmt(totalPaid)}</td>
                <td className="px-4 py-3 text-red-500">{fmt(totalRemaining)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selected.client}</h2>
                <p className="text-sm text-gray-400 font-mono">מס' {selected.invoiceNum}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[selected.status]}`}>
                {STATUS_LABEL[selected.status]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['תאריך', selected.date],
                ['סוג מסמך', selected.docType],
                ['מי הוציא', selected.issuedBy],
                ['מי שלח', selected.sentTo],
              ].map(([l, v]) => v ? (
                <div key={l}><div className="text-xs text-gray-400">{l}</div><div className="font-medium text-gray-800">{v}</div></div>
              ) : null)}
            </div>
            <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-4">
              <div className="text-center"><div className="text-xs text-gray-400 mb-1">לפני מע"מ</div><div className="font-bold text-gray-700">{fmt(selected.beforeVat)}</div></div>
              <div className="text-center"><div className="text-xs text-gray-400 mb-1">סה"כ לתשלום</div><div className="font-bold text-blue-600">{fmt(selected.total)}</div></div>
              <div className="text-center"><div className="text-xs text-gray-400 mb-1">שולם</div><div className="font-bold text-emerald-600">{fmt(selected.paid)}</div></div>
            </div>
            {selected.remaining > 0 && (
              <div className="text-center bg-red-50 rounded-xl p-3">
                <div className="text-xs text-red-400 mb-1">יתרה לגביה</div>
                <div className="text-xl font-bold text-red-500">{fmt(selected.remaining)}</div>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">סגור</button>
          </div>
        </div>
      )}
    </div>
  )
}

interface ClientRow {
  name: string
  invoiceCount: number
  totalAmount: number
  paidAmount: number
}

function ClientsTab() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/google-sheets-clients')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setClients(d.clients || [])
      })
      .catch(() => setError('שגיאה בטעינת לקוחות'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalInvoices = clients.reduce((s, c) => s + c.invoiceCount, 0)
  const totalAmount = clients.reduce((s, c) => s + c.totalAmount, 0)
  const totalPaid = clients.reduce((s, c) => s + c.paidAmount, 0)

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-400 text-sm">טוען לקוחות מ-Google Sheets...</div>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-red-500 text-sm">{error}</div>
    </div>
  )

  const fmt = (n: number) => n ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 flex-shrink-0">
        {[
          { label: 'לקוחות', value: clients.length, color: '#6366f1' },
          { label: 'חשבוניות', value: totalInvoices, color: '#3b82f6' },
          { label: 'סה״כ מחויב', value: fmt(totalAmount), color: '#10b981', raw: true },
        ].map(({ label, value, color, raw }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-gray-500 mt-1.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex-shrink-0">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש לקוח..."
          className="w-full max-w-sm border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white min-h-0">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-5 py-3 text-right font-semibold">שם לקוח</th>
              <th className="px-5 py-3 text-right font-semibold">חשבוניות</th>
              <th className="px-5 py-3 text-right font-semibold">סה״כ מחויב</th>
              <th className="px-5 py-3 text-right font-semibold">שולם</th>
              <th className="px-5 py-3 text-right font-semibold">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">לא נמצאו לקוחות</td>
              </tr>
            ) : filtered.map((c, i) => {
              const remaining = c.totalAmount - c.paidAmount
              return (
                <tr key={c.name} className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-5 py-3 font-semibold text-gray-800">{c.name}</td>
                  <td className="px-5 py-3 text-gray-500">{c.invoiceCount}</td>
                  <td className="px-5 py-3 text-gray-700 font-medium">{fmt(c.totalAmount)}</td>
                  <td className="px-5 py-3 text-emerald-600 font-medium">{fmt(c.paidAmount)}</td>
                  <td className="px-5 py-3">
                    {remaining > 0 ? (
                      <span className="text-red-500 font-semibold">{fmt(remaining)}</span>
                    ) : remaining < 0 ? (
                      <span className="text-gray-400 text-xs">—</span>
                    ) : (
                      <span className="text-emerald-500 text-xs font-medium">שולם במלואו</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-5 py-3 font-bold text-gray-700 text-xs uppercase tracking-wide">סה״כ</td>
                <td className="px-5 py-3 font-bold text-gray-700">{totalInvoices}</td>
                <td className="px-5 py-3 font-bold text-gray-800">{fmt(totalAmount)}</td>
                <td className="px-5 py-3 font-bold text-emerald-600">{fmt(totalPaid)}</td>
                <td className="px-5 py-3 font-bold text-red-500">{fmt(totalAmount - totalPaid)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
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

export function FinancialView({ activeTab }: { activeTab: FinTab }) {
  return (
    <div className="flex flex-col h-full bg-gray-50" dir="rtl">
      {/* Content */}
      {activeTab === 'suppliers' && <SuppliersTab />}

      {activeTab === 'clients' && <ClientsTab />}

      {activeTab === 'invoices' && <InvoicesTab />}

      {activeTab === 'dashboard' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">מודול פיננסי בבנייה</h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xs">דוחות הכנסות, הוצאות ונתונים פיננסיים יוצגו כאן בקרוב</p>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full max-w-lg mt-4">
            {[
              { label: 'הכנסות', icon: '↑', color: 'bg-emerald-50 text-emerald-600' },
              { label: 'הוצאות', icon: '↓', color: 'bg-red-50 text-red-500' },
              { label: 'דוחות', icon: '▦', color: 'bg-indigo-50 text-indigo-600' },
            ].map((item) => (
              <div key={item.label} className={`rounded-2xl p-5 ${item.color} flex flex-col items-center gap-2 opacity-50`}>
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
