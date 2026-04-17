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

// ── Shared types + helpers ────────────────────────────────────────────────────
interface InvoiceRow {
  id: number
  issued_by: string
  sent_to: string
  date: string
  doc_type: string
  invoice_num: string
  client: string
  before_vat: number
  total: number
  paid: number
  notes: string
}

const STATUS_LABEL: Record<string, string> = { paid: 'שולם', partial: 'חלקי', unpaid: 'ממתין' }
const STATUS_STYLE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  unpaid: 'bg-red-100 text-red-600',
}

function invoiceStatus(inv: InvoiceRow): 'paid' | 'partial' | 'unpaid' {
  if (inv.total > 0 && inv.paid >= inv.total) return 'paid'
  if (inv.paid > 0) return 'partial'
  return 'unpaid'
}

const EMPTY_FORM: Omit<InvoiceRow, 'id'> = {
  issued_by: '', sent_to: '', date: '', doc_type: '',
  invoice_num: '', client: '', before_vat: 0, total: 0, paid: 0, notes: '',
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

// Date helpers: "D.M.YY" ↔ "YYYY-MM-DD"
function israeliToISO(d: string): string {
  if (!d) return ''
  const parts = d.split('.')
  if (parts.length < 3) return ''
  const day = parts[0].padStart(2, '0')
  const month = parts[1].padStart(2, '0')
  const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
  return `${year}-${month}-${day}`
}
function isoToIsraeli(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  return `${parseInt(day)}.${parseInt(month)}.${year.slice(2)}`
}

// ── InvoiceModal ──────────────────────────────────────────────────────────────
function InvoiceModal({
  initial, onSave, onClose, saving, clientOptions = [],
}: {
  initial: InvoiceForm
  onSave: (data: InvoiceForm) => void
  onClose: () => void
  saving: boolean
  clientOptions?: string[]
}) {
  const [form, setForm] = useState<InvoiceForm>(initial)
  const [clientQuery, setClientQuery] = useState(initial.client || '')
  const [clientOpen, setClientOpen] = useState(false)

  const set = (k: keyof InvoiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = ['before_vat','total','paid'].includes(k) ? Number(e.target.value) || 0 : e.target.value
    setForm(f => ({ ...f, [k]: v }))
  }
  const remaining = Math.max(0, (form.total as number) - (form.paid as number))

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
                      setClientQuery(c)
                      setForm(f => ({ ...f, client: c }))
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
              {['מס','חשבון עסקה','קבלה','חשבונית מס קבלה','הזמנה'].map(t => <option key={t} value={t}>{t}</option>)}
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
          <ModalField label="לפני מע״מ ₪" value={form.before_vat} onChange={set('before_vat')} type="number" />
          <ModalField label="סה״כ לתשלום ₪" value={form.total} onChange={set('total')} type="number" />
          <ModalField label="שולם ₪" value={form.paid} onChange={set('paid')} type="number" />

          <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: remaining > 0 ? '#fef2f2' : '#f0fdf4' }}>
            <span className="text-xs text-gray-400">יתרה לגביה:</span>
            <span className={`font-bold text-sm ${remaining > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {remaining > 0 ? `₪${remaining.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : 'שולם במלואו'}
            </span>
          </div>
        </div>

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [modalInv, setModalInv] = useState<InvoiceRow | null | 'new'>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/invoices')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setInvoices(d.invoices || []) })
      .catch(() => setError('שגיאה בטעינת חשבוניות'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const clients = [...new Set(invoices.map(i => i.client).filter(Boolean))].sort()
  const docTypes = [...new Set(invoices.map(i => i.doc_type).filter(Boolean))].sort()

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const st = invoiceStatus(inv)
    const matchSearch = !q || inv.client.toLowerCase().includes(q) || inv.invoice_num.includes(q) || inv.issued_by.toLowerCase().includes(q)
    return matchSearch
      && (!filterClient || inv.client === filterClient)
      && (!filterDocType || inv.doc_type === filterDocType)
      && (!filterStatus || st === filterStatus)
  })

  const totalAmount   = filtered.reduce((s, i) => s + i.total, 0)
  const totalPaid     = filtered.reduce((s, i) => s + i.paid, 0)
  const totalRemaining = filtered.reduce((s, i) => s + Math.max(0, i.total - i.paid), 0)
  const fmt = (n: number) => n ? `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}` : '—'

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

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="text-gray-400 text-sm">טוען חשבוניות...</div></div>
  if (error) return <div className="flex-1 flex items-center justify-center"><div className="text-red-500 text-sm">{error}</div></div>

  return (
    <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-800">חשבוניות</h2>
          <p className="text-xs text-gray-400 mt-0.5">{invoices.length} חשבוניות סה"כ</p>
        </div>
        <button
          onClick={() => setModalInv('new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:scale-105 transition-all"
          style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          הזנת חשבונית חדשה
        </button>
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
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="חפש לקוח, מס' חשבונית, מי הוציא..." className="flex-1 min-w-[200px] border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">כל הלקוחות</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterDocType} onChange={e => setFilterDocType(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">כל סוגי המסמך</option>{docTypes.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">
          <option value="">כל הסטטוסים</option>
          <option value="paid">שולם</option><option value="partial">חלקי</option><option value="unpaid">ממתין</option>
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
              <th className="px-4 py-3 text-right font-semibold">סה"כ</th>
              <th className="px-4 py-3 text-right font-semibold">שולם</th>
              <th className="px-4 py-3 text-right font-semibold">יתרה</th>
              <th className="px-4 py-3 text-center font-semibold">סטטוס</th>
              <th className="px-4 py-3 text-center font-semibold">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-12 text-gray-400">לא נמצאו חשבוניות</td></tr>
            ) : filtered.map((inv, i) => {
              const st = invoiceStatus(inv)
              const remaining = Math.max(0, inv.total - inv.paid)
              return (
                <tr key={inv.id} className={`border-b border-gray-100 hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{inv.invoice_num || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800 max-w-[150px] truncate">{inv.client || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{inv.date || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{inv.doc_type || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{inv.issued_by || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{fmt(inv.before_vat)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{fmt(inv.total)}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{fmt(inv.paid)}</td>
                  <td className="px-4 py-3">{remaining > 0 ? <span className="text-red-500 font-semibold">{fmt(remaining)}</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded-lg text-xs font-semibold ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => setModalInv(inv)} title="עריכה" className="p-1 rounded-lg hover:bg-indigo-100 text-gray-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleteId(inv.id)} title="מחיקה" className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors">
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
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
                <td colSpan={5} className="px-4 py-3 text-xs text-gray-500 uppercase">סה"כ ({filtered.length})</td>
                <td className="px-4 py-3 text-gray-700">{fmt(filtered.reduce((s, i) => s + i.before_vat, 0))}</td>
                <td className="px-4 py-3 text-gray-800">{fmt(totalAmount)}</td>
                <td className="px-4 py-3 text-emerald-600">{fmt(totalPaid)}</td>
                <td className="px-4 py-3 text-red-500">{fmt(totalRemaining)}</td>
                <td /><td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalInv !== null && (
        <InvoiceModal
          initial={modalInv === 'new' ? EMPTY_FORM : { ...modalInv }}
          clientOptions={clients}
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
    fetch('/api/invoices')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        // Aggregate by client name
        const map: Record<string, ClientRow> = {}
        for (const inv of (d.invoices || []) as InvoiceRow[]) {
          if (!inv.client) continue
          if (!map[inv.client]) map[inv.client] = { name: inv.client, invoiceCount: 0, totalAmount: 0, paidAmount: 0 }
          map[inv.client].invoiceCount++
          map[inv.client].totalAmount += inv.total
          map[inv.client].paidAmount  += inv.paid
        }
        setClients(Object.values(map).sort((a, b) => b.invoiceCount - a.invoiceCount))
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
      <div className="text-gray-400 text-sm">טוען לקוחות...</div>
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
