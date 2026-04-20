'use client'
import { useEffect, useState, useCallback } from 'react'

export type AcctTab =
  | 'dashboard'
  | 'accounts'
  | 'journal'
  | 'trial_balance'
  | 'pnl'
  | 'balance_sheet'
  | 'cash_flow'
  | 'vat_874'
  | 'withholding_856'
  | 'form_6111'
  | 'bkmv'
  | 'fixed_assets'
  | 'recurring'
  | 'bank'
  | 'budget'
  | 'reminders'

const TABS: Array<{ key: AcctTab; label: string }> = [
  { key: 'dashboard',        label: 'דשבורד' },
  { key: 'accounts',         label: 'תוכנית חשבונות' },
  { key: 'journal',          label: 'יומן' },
  { key: 'trial_balance',    label: 'מאזן בוחן' },
  { key: 'pnl',              label: 'רווח והפסד' },
  { key: 'balance_sheet',    label: 'מאזן' },
  { key: 'cash_flow',        label: 'תזרים מזומנים' },
  { key: 'vat_874',          label: 'מע"מ 874' },
  { key: 'withholding_856',  label: 'ניכוי מקור 856' },
  { key: 'form_6111',        label: 'טופס 6111' },
  { key: 'bkmv',             label: 'קובץ BKMV' },
  { key: 'fixed_assets',     label: 'רכוש קבוע' },
  { key: 'recurring',        label: 'חשבוניות מחזוריות' },
  { key: 'bank',             label: 'בנק' },
  { key: 'budget',           label: 'תקציב' },
  { key: 'reminders',        label: 'תזכורות' },
]

const fmt = (n: number | null | undefined) => {
  if (n == null) return '—'
  return new Intl.NumberFormat('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
}
const fmt0 = (n: number | null | undefined) => {
  if (n == null) return '—'
  return new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0))
}

export function AccountingView({ activeTab = 'dashboard' as AcctTab }: { activeTab?: AcctTab }) {
  return (
    <div className="p-6">
      {activeTab === 'dashboard'       && <DashboardTab />}
      {activeTab === 'accounts'        && <AccountsTab />}
      {activeTab === 'journal'         && <JournalTab />}
      {activeTab === 'trial_balance'   && <TrialBalanceTab />}
      {activeTab === 'pnl'             && <PnlTab />}
      {activeTab === 'balance_sheet'   && <BalanceSheetTab />}
      {activeTab === 'cash_flow'       && <CashFlowTab />}
      {activeTab === 'vat_874'         && <Vat874Tab />}
      {activeTab === 'withholding_856' && <Withholding856Tab />}
      {activeTab === 'form_6111'       && <Form6111Tab />}
      {activeTab === 'bkmv'            && <BkmvTab />}
      {activeTab === 'fixed_assets'    && <FixedAssetsTab />}
      {activeTab === 'recurring'       && <RecurringTab />}
      {activeTab === 'bank'            && <BankTab />}
      {activeTab === 'budget'          && <BudgetTab />}
      {activeTab === 'reminders'       && <RemindersTab />}
    </div>
  )
}

export { TABS as ACCOUNTING_TABS }

// ─────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const year = new Date().getFullYear()
  const [tb, setTb] = useState<{ totals?: { debit: number; credit: number; balanced: boolean } } | null>(null)
  const [pnl, setPnl] = useState<{ total_revenue: number; total_expense: number; net_profit: number } | null>(null)
  const [bs, setBs] = useState<{ total_assets: number; total_liabilities: number; total_equity: number; balanced: boolean } | null>(null)
  const [cf, setCf] = useState<{ opening_cash: number; closing_cash: number; operating: number; investing: number; financing: number } | null>(null)
  const [vat, setVat] = useState<{ vat_to_pay: number; output_vat: number; total_input_vat: number } | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const ym = today.slice(0, 7)

  useEffect(() => {
    (async () => {
      const [tbR, pnlR, bsR, cfR, vatR] = await Promise.all([
        fetch(`/api/accounting/reports/trial-balance?as_of=${today}`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounting/reports/pnl?year=${year}`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounting/reports/balance-sheet?as_of=${today}`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounting/reports/cash-flow?year=${year}`).then(r => r.json()).catch(() => null),
        fetch(`/api/accounting/reports/vat-874?from=${ym}-01&to=${today}`).then(r => r.json()).catch(() => null),
      ])
      setTb(tbR); setPnl(pnlR); setBs(bsR); setCf(cfR); setVat(vatR)
    })()
  }, [today, year, ym])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-white">דשבורד חשבונאי — {year}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="רווח לפני מס" value={pnl ? fmt(pnl.net_profit) : '...'} color="#10b981" subtitle={`הכנסות ${pnl ? fmt0(pnl.total_revenue) : '...'} – הוצאות ${pnl ? fmt0(pnl.total_expense) : '...'}`} />
        <KpiCard title="מזומן (תזרים)" value={cf ? fmt(cf.closing_cash) : '...'} color="#06b6d4" subtitle={`פתיחה ${cf ? fmt0(cf.opening_cash) : '...'} → סגירה`} />
        <KpiCard title={'מע"מ לתשלום החודש'} value={vat ? fmt(vat.vat_to_pay) : '...'} color="#f59e0b" subtitle={`עסקאות ${vat ? fmt0(vat.output_vat) : '...'} − תשומות ${vat ? fmt0(vat.total_input_vat) : '...'}`} />
        <KpiCard title="סה״כ נכסים" value={bs ? fmt(bs.total_assets) : '...'} color="#6366f1" />
        <KpiCard title="סה״כ התחייבויות" value={bs ? fmt(bs.total_liabilities) : '...'} color="#ef4444" />
        <KpiCard title="הון עצמי" value={bs ? fmt(bs.total_equity) : '...'} color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/60 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2">תזרים השנה לפי פעילות</h3>
          <Row label="מפעילות שוטפת" value={cf?.operating ?? null} color="#10b981" />
          <Row label="מפעילות השקעה" value={cf?.investing ?? null} color="#6366f1" />
          <Row label="מפעילות מימון"  value={cf?.financing ?? null} color="#a855f7" />
        </div>
        <div className="bg-slate-900/60 rounded-xl p-4 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-2">מאזן בוחן</h3>
          {tb?.totals ? (
            <>
              <Row label="סה״כ חובה"  value={tb.totals.debit}  color="#10b981" />
              <Row label="סה״כ זכות"  value={tb.totals.credit} color="#ef4444" />
              <div className={`text-xs mt-2 ${tb.totals.balanced ? 'text-emerald-400' : 'text-red-400'}`}>
                {tb.totals.balanced ? '✓ מאזן מאוזן' : '⚠ מאזן לא מאוזן'}
              </div>
            </>
          ) : <div className="text-xs text-white/50">טוען…</div>}
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, color, subtitle }: { title: string; value: string; color: string; subtitle?: string }) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-4 border border-white/10">
      <div className="text-xs text-white/60">{title}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
      {subtitle && <div className="text-xs text-white/40 mt-1">{subtitle}</div>}
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: number | null; color?: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1 border-b border-white/5">
      <span className="text-white/70">{label}</span>
      <span style={{ color: color || '#fff' }}>{value == null ? '—' : fmt(value)}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CHART OF ACCOUNTS
// ─────────────────────────────────────────────────────────────────
type Account = { id: string; code: string; name_he: string; account_type: string; code_6111: string | null; is_active: boolean }

function AccountsTab() {
  const [rows, setRows] = useState<Account[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/accounting/accounts').then(x => x.json())
    setRows(r.accounts || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const q = filter.trim().toLowerCase()
  const filtered = q
    ? rows.filter(r => r.code.includes(q) || r.name_he.toLowerCase().includes(q))
    : rows

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">תוכנית חשבונות</h1>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="חיפוש לפי קוד/שם…"
          className="px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white w-64"
        />
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr>
              <th className="px-4 py-2 text-right">קוד</th>
              <th className="px-4 py-2 text-right">שם</th>
              <th className="px-4 py-2 text-right">סוג</th>
              <th className="px-4 py-2 text-right">6111</th>
              <th className="px-4 py-2 text-right">פעיל</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-white/50">טוען…</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} className="border-t border-white/5 text-white">
                <td className="px-4 py-2 font-mono">{r.code}</td>
                <td className="px-4 py-2">{r.name_he}</td>
                <td className="px-4 py-2 text-white/70">{r.account_type}</td>
                <td className="px-4 py-2 font-mono text-white/70">{r.code_6111 || '—'}</td>
                <td className="px-4 py-2">{r.is_active ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// JOURNAL
// ─────────────────────────────────────────────────────────────────
type JE = {
  id: string; entry_date: string; description: string; source_type: string; reference: string | null; status: string
  je_lines?: Array<{ debit: number; credit: number; memo: string; accounts?: { code: string; name_he: string } | null }>
}

function JournalTab() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<JE[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/accounting/journal-entries?from=${from}&to=${to}&limit=500`).then(x => x.json())
    setRows(r.entries || [])
    setLoading(false)
  }, [from, to])
  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">יומן</h1>
      <div className="flex gap-3 mb-4">
        <label className="text-sm text-white/70">מ־<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm" /></label>
        <label className="text-sm text-white/70">עד<input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm" /></label>
      </div>
      <div className="space-y-3">
        {loading ? <div className="text-white/50">טוען…</div> : rows.map(je => {
          const totalD = (je.je_lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0)
          return (
            <div key={je.id} className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">{je.description}</div>
                  <div className="text-xs text-white/50">{je.entry_date} • {je.source_type}{je.reference ? ` • ${je.reference}` : ''} • {je.status}</div>
                </div>
                <div className="text-sm text-white/70">סה״כ {fmt(totalD)}</div>
              </div>
              <table className="w-full text-sm mt-3">
                <thead className="text-xs text-white/40">
                  <tr><th className="text-right">חשבון</th><th className="text-right">שם</th><th className="text-right">חובה</th><th className="text-right">זכות</th><th className="text-right">הסבר</th></tr>
                </thead>
                <tbody>
                  {(je.je_lines || []).map((l, i) => (
                    <tr key={i} className="text-white/80">
                      <td className="font-mono py-1">{l.accounts?.code}</td>
                      <td className="py-1">{l.accounts?.name_he}</td>
                      <td className="py-1">{Number(l.debit)  ? fmt(Number(l.debit))  : ''}</td>
                      <td className="py-1">{Number(l.credit) ? fmt(Number(l.credit)) : ''}</td>
                      <td className="py-1 text-white/50">{l.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// TRIAL BALANCE
// ─────────────────────────────────────────────────────────────────
function TrialBalanceTab() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<{ rows: Array<{ code: string; name_he: string; account_type: string; balance_debit: number; balance_credit: number }>; totals: { debit: number; credit: number; balanced: boolean } } | null>(null)

  useEffect(() => {
    fetch(`/api/accounting/reports/trial-balance?as_of=${asOf}`).then(r => r.json()).then(setData)
  }, [asOf])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">מאזן בוחן</h1>
        <label className="text-sm text-white/70">נכון ליום<input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="mr-2 px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm" /></label>
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr>
              <th className="px-4 py-2 text-right">קוד</th>
              <th className="px-4 py-2 text-right">שם</th>
              <th className="px-4 py-2 text-right">סוג</th>
              <th className="px-4 py-2 text-right">חובה</th>
              <th className="px-4 py-2 text-right">זכות</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map(r => (
              <tr key={r.code} className="border-t border-white/5 text-white">
                <td className="px-4 py-2 font-mono">{r.code}</td>
                <td className="px-4 py-2">{r.name_he}</td>
                <td className="px-4 py-2 text-white/50">{r.account_type}</td>
                <td className="px-4 py-2">{r.balance_debit  ? fmt(r.balance_debit)  : ''}</td>
                <td className="px-4 py-2">{r.balance_credit ? fmt(r.balance_credit) : ''}</td>
              </tr>
            ))}
            {data?.totals && (
              <tr className="border-t-2 border-white/20 bg-slate-800/30 font-semibold text-white">
                <td colSpan={3} className="px-4 py-2">סה״כ</td>
                <td className="px-4 py-2">{fmt(data.totals.debit)}</td>
                <td className="px-4 py-2">{fmt(data.totals.credit)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {data?.totals && (
          <div className={`text-xs px-4 py-2 ${data.totals.balanced ? 'text-emerald-400' : 'text-red-400'}`}>
            {data.totals.balanced ? '✓ מאזן מאוזן' : '⚠ מאזן לא מאוזן'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// P&L
// ─────────────────────────────────────────────────────────────────
function PnlTab() {
  const year = new Date().getFullYear()
  const [yr, setYr] = useState(year)
  const [data, setData] = useState<{ revenue: Array<{ code: string; name_he: string; amount: number }>; expense: Array<{ code: string; name_he: string; amount: number }>; total_revenue: number; total_expense: number; net_profit: number } | null>(null)
  useEffect(() => { fetch(`/api/accounting/reports/pnl?year=${yr}`).then(r => r.json()).then(setData) }, [yr])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">רווח והפסד — {yr}</h1>
        <input type="number" value={yr} onChange={e => setYr(Number(e.target.value))} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
          <h2 className="text-white font-semibold mb-3">הכנסות</h2>
          {(data?.revenue || []).map(r => (
            <div key={r.code} className="flex justify-between text-sm py-1 border-b border-white/5">
              <span className="text-white/80"><span className="font-mono text-white/50">{r.code}</span> {r.name_he}</span>
              <span className="text-emerald-400">{fmt(r.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-2 mt-2 font-semibold border-t border-white/20">
            <span className="text-white">סה״כ הכנסות</span>
            <span className="text-emerald-400">{fmt(data?.total_revenue ?? 0)}</span>
          </div>
        </section>
        <section className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
          <h2 className="text-white font-semibold mb-3">הוצאות</h2>
          {(data?.expense || []).map(r => (
            <div key={r.code} className="flex justify-between text-sm py-1 border-b border-white/5">
              <span className="text-white/80"><span className="font-mono text-white/50">{r.code}</span> {r.name_he}</span>
              <span className="text-red-400">{fmt(r.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm py-2 mt-2 font-semibold border-t border-white/20">
            <span className="text-white">סה״כ הוצאות</span>
            <span className="text-red-400">{fmt(data?.total_expense ?? 0)}</span>
          </div>
        </section>
      </div>
      <div className="mt-4 bg-slate-900/60 rounded-xl border border-white/10 p-4 flex justify-between items-center">
        <span className="text-white font-bold">רווח נקי</span>
        <span className={`text-2xl font-bold ${(data?.net_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(data?.net_profit ?? 0)}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// BALANCE SHEET
// ─────────────────────────────────────────────────────────────────
function BalanceSheetTab() {
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState<{ assets: Array<{ code: string; name_he: string; amount: number }>; liabilities: Array<{ code: string; name_he: string; amount: number }>; equity: Array<{ code: string; name_he: string; amount: number }>; total_assets: number; total_liabilities: number; total_equity: number; total_liab_equity: number; balanced: boolean } | null>(null)
  useEffect(() => { fetch(`/api/accounting/reports/balance-sheet?as_of=${asOf}`).then(r => r.json()).then(setData) }, [asOf])

  const Block = ({ title, rows, total, color }: { title: string; rows: Array<{ code: string; name_he: string; amount: number }>; total: number; color: string }) => (
    <section className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
      <h2 className="text-white font-semibold mb-3">{title}</h2>
      {rows.map(r => (
        <div key={r.code} className="flex justify-between text-sm py-1 border-b border-white/5">
          <span className="text-white/80"><span className="font-mono text-white/50">{r.code}</span> {r.name_he}</span>
          <span style={{ color }}>{fmt(r.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm py-2 mt-2 font-semibold border-t border-white/20">
        <span className="text-white">סה״כ</span>
        <span style={{ color }}>{fmt(total)}</span>
      </div>
    </section>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">מאזן</h1>
        <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Block title="נכסים"        rows={data?.assets || []}      total={data?.total_assets      ?? 0} color="#10b981" />
        <div className="space-y-4">
          <Block title="התחייבויות"   rows={data?.liabilities || []} total={data?.total_liabilities ?? 0} color="#ef4444" />
          <Block title="הון עצמי"      rows={data?.equity || []}      total={data?.total_equity      ?? 0} color="#a855f7" />
        </div>
      </div>
      {data && (
        <div className={`mt-4 text-sm px-4 py-2 rounded-lg ${data.balanced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {data.balanced ? `✓ מאזן מאוזן: נכסים ${fmt(data.total_assets)} = התחייבויות+הון ${fmt(data.total_liab_equity)}` : `⚠ לא מאוזן: הפרש ${fmt(data.total_assets - data.total_liab_equity)}`}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// CASH FLOW
// ─────────────────────────────────────────────────────────────────
function CashFlowTab() {
  const year = new Date().getFullYear()
  const [yr, setYr] = useState(year)
  const [data, setData] = useState<{ opening_cash: number; closing_cash: number; net_change: number; operating: number; investing: number; financing: number; monthly: Record<string, { operating: number; investing: number; financing: number; total: number }> } | null>(null)
  useEffect(() => { fetch(`/api/accounting/reports/cash-flow?year=${yr}`).then(r => r.json()).then(setData) }, [yr])

  const months = data ? Object.keys(data.monthly).sort() : []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">תזרים מזומנים — {yr}</h1>
        <input type="number" value={yr} onChange={e => setYr(Number(e.target.value))} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm w-24" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <KpiCard title="יתרת פתיחה" value={data ? fmt(data.opening_cash) : '...'} color="#94a3b8" />
        <KpiCard title="שוטף"       value={data ? fmt(data.operating)    : '...'} color="#10b981" />
        <KpiCard title="השקעה"       value={data ? fmt(data.investing)    : '...'} color="#6366f1" />
        <KpiCard title="מימון"       value={data ? fmt(data.financing)    : '...'} color="#a855f7" />
        <KpiCard title="יתרת סגירה" value={data ? fmt(data.closing_cash) : '...'} color="#06b6d4" />
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr><th className="px-4 py-2 text-right">חודש</th><th className="px-4 py-2 text-right">שוטף</th><th className="px-4 py-2 text-right">השקעה</th><th className="px-4 py-2 text-right">מימון</th><th className="px-4 py-2 text-right">סה״כ</th></tr>
          </thead>
          <tbody>
            {months.map(m => {
              const v = data!.monthly[m]
              return (
                <tr key={m} className="border-t border-white/5 text-white">
                  <td className="px-4 py-2 font-mono">{m}</td>
                  <td className="px-4 py-2">{fmt(v.operating)}</td>
                  <td className="px-4 py-2">{fmt(v.investing)}</td>
                  <td className="px-4 py-2">{fmt(v.financing)}</td>
                  <td className={`px-4 py-2 font-semibold ${v.total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(v.total)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// VAT 874
// ─────────────────────────────────────────────────────────────────
function Vat874Tab() {
  const ym = new Date().toISOString().slice(0, 7)
  const [month, setMonth] = useState(ym)
  const [data, setData] = useState<{ sales_total: number; output_vat: number; purchases_goods: number; purchases_assets: number; input_vat: number; input_vat_assets: number; total_input_vat: number; vat_to_pay: number } | null>(null)

  useEffect(() => {
    const [y, m] = month.split('-').map(Number)
    const from = `${month}-01`
    const to   = new Date(y, m, 0).toISOString().slice(0, 10)
    fetch(`/api/accounting/reports/vat-874?from=${from}&to=${to}`).then(r => r.json()).then(setData)
  }, [month])

  const [y, m] = month.split('-').map(Number)
  const pcn = () => window.open(`/api/accounting/reports/pcn874?year=${y}&month=${m}&vat_id=`, '_blank')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">דיווח מע״מ 874</h1>
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm" />
          <button onClick={pcn} className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded text-indigo-200 text-sm hover:bg-indigo-500/30">הורד PCN874</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
          <h2 className="text-white font-semibold mb-3">עסקאות</h2>
          <Row label="סך מכירות חייבות"   value={data?.sales_total ?? null} color="#10b981" />
          <Row label="מע״מ עסקאות"         value={data?.output_vat ?? null}  color="#10b981" />
        </section>
        <section className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
          <h2 className="text-white font-semibold mb-3">תשומות</h2>
          <Row label="סך רכישות שוטפות"   value={data?.purchases_goods ?? null}  color="#ef4444" />
          <Row label="מע״מ תשומות שוטפות"  value={data?.input_vat ?? null}         color="#ef4444" />
          <Row label="סך רכישות ציוד"      value={data?.purchases_assets ?? null}  color="#ef4444" />
          <Row label="מע״מ תשומות ציוד"    value={data?.input_vat_assets ?? null}  color="#ef4444" />
          <Row label="סה״כ מע״מ תשומות"    value={data?.total_input_vat ?? null}   color="#ef4444" />
        </section>
      </div>
      <div className="mt-4 bg-slate-900/60 rounded-xl border border-white/10 p-4 flex justify-between items-center">
        <span className="text-white font-bold">מע״מ לתשלום</span>
        <span className="text-2xl font-bold text-amber-400">{data ? fmt(data.vat_to_pay) : '...'}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 856
// ─────────────────────────────────────────────────────────────────
function Withholding856Tab() {
  const [yr, setYr] = useState(new Date().getFullYear())
  const [data, setData] = useState<{ inward: Array<{ vat_id: string; client: string; count: number; gross_payments: number; tax_withheld: number }>; totals: { inward_gross: number; inward_withheld: number } } | null>(null)
  useEffect(() => { fetch(`/api/accounting/reports/withholding-856?year=${yr}`).then(r => r.json()).then(setData) }, [yr])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">ניכוי מקור 856 — {yr}</h1>
        <input type="number" value={yr} onChange={e => setYr(Number(e.target.value))} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm w-24" />
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr><th className="px-4 py-2 text-right">ח.פ.</th><th className="px-4 py-2 text-right">לקוח</th><th className="px-4 py-2 text-right">מסמכים</th><th className="px-4 py-2 text-right">תשלום ברוטו</th><th className="px-4 py-2 text-right">נוכה</th></tr>
          </thead>
          <tbody>
            {(data?.inward || []).map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-white">
                <td className="px-4 py-2 font-mono">{r.vat_id || '—'}</td>
                <td className="px-4 py-2">{r.client}</td>
                <td className="px-4 py-2">{r.count}</td>
                <td className="px-4 py-2">{fmt(r.gross_payments)}</td>
                <td className="px-4 py-2 text-amber-400">{fmt(r.tax_withheld)}</td>
              </tr>
            ))}
            {data?.totals && (
              <tr className="border-t-2 border-white/20 bg-slate-800/30 font-semibold text-white">
                <td colSpan={3} className="px-4 py-2">סה״כ</td>
                <td className="px-4 py-2">{fmt(data.totals.inward_gross)}</td>
                <td className="px-4 py-2 text-amber-400">{fmt(data.totals.inward_withheld)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// 6111
// ─────────────────────────────────────────────────────────────────
function Form6111Tab() {
  const [yr, setYr] = useState(new Date().getFullYear())
  const [data, setData] = useState<{ rows: Array<{ code_6111: string; total: number; accounts: Array<{ code: string; name_he: string; amount: number }> }> } | null>(null)
  useEffect(() => { fetch(`/api/accounting/reports/form-6111?year=${yr}`).then(r => r.json()).then(setData) }, [yr])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">טופס 6111 — {yr}</h1>
        <input type="number" value={yr} onChange={e => setYr(Number(e.target.value))} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm w-24" />
      </div>
      <div className="space-y-3">
        {(data?.rows || []).map(r => (
          <details key={r.code_6111} className="bg-slate-900/60 rounded-xl border border-white/10 p-4">
            <summary className="cursor-pointer flex justify-between">
              <span className="text-white font-semibold font-mono">{r.code_6111}</span>
              <span className="text-white">{fmt(r.total)}</span>
            </summary>
            <div className="mt-3 space-y-1 text-sm">
              {r.accounts.map(a => (
                <div key={a.code} className="flex justify-between text-white/70">
                  <span className="font-mono">{a.code} {a.name_he}</span>
                  <span>{fmt(a.amount)}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// BKMV
// ─────────────────────────────────────────────────────────────────
function BkmvTab() {
  const [yr, setYr] = useState(new Date().getFullYear())
  const [vatId, setVatId] = useState('')

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">קובץ ביקורת BKMV — {yr}</h1>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 p-5 space-y-3">
        <p className="text-sm text-white/70">ייצוא קבצי INI.TXT + BKMVDATA.TXT לצורך ביקורת רשות המיסים (סעיף 36 לתקנות).</p>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-sm text-white/70">שנה<input type="number" value={yr} onChange={e => setYr(Number(e.target.value))} className="mr-2 px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm w-24" /></label>
          <label className="text-sm text-white/70">מס' עוסק<input value={vatId} onChange={e => setVatId(e.target.value)} placeholder="000000000" className="mr-2 px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm font-mono" /></label>
          <a href={`/api/accounting/reports/bkmv?year=${yr}&vat_id=${vatId}&file=ini`}  className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded text-indigo-200 text-sm hover:bg-indigo-500/30">INI.TXT</a>
          <a href={`/api/accounting/reports/bkmv?year=${yr}&vat_id=${vatId}&file=data`} className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded text-indigo-200 text-sm hover:bg-indigo-500/30">BKMVDATA.TXT</a>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// FIXED ASSETS
// ─────────────────────────────────────────────────────────────────
type FA = { id: string; description: string; category: string; acquisition_date: string; acquisition_cost: number; salvage_value: number; useful_life_months: number; monthly_depreciation: number; accumulated_depreciation: number; net_book_value: number; months_elapsed: number; is_fully_depreciated: boolean }

function FixedAssetsTab() {
  const [rows, setRows] = useState<FA[]>([])
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/accounting/fixed-assets').then(x => x.json())
    setRows(r.assets || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const runDepreciation = async () => {
    setRunning(true)
    await fetch('/api/accounting/fixed-assets/depreciate', { method: 'POST' })
    await load()
    setRunning(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">רכוש קבוע</h1>
        <button onClick={runDepreciation} disabled={running} className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded text-emerald-200 text-sm hover:bg-emerald-500/30 disabled:opacity-50">
          {running ? 'מריץ…' : 'הרץ פחת חודשי'}
        </button>
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr>
              <th className="px-4 py-2 text-right">תיאור</th>
              <th className="px-4 py-2 text-right">קטגוריה</th>
              <th className="px-4 py-2 text-right">תאריך רכישה</th>
              <th className="px-4 py-2 text-right">עלות</th>
              <th className="px-4 py-2 text-right">פחת שהצטבר</th>
              <th className="px-4 py-2 text-right">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="px-4 py-6 text-center text-white/50">טוען…</td></tr> :
            rows.map(a => (
              <tr key={a.id} className="border-t border-white/5 text-white">
                <td className="px-4 py-2">{a.description}</td>
                <td className="px-4 py-2 text-white/70">{a.category}</td>
                <td className="px-4 py-2 text-white/70">{a.acquisition_date}</td>
                <td className="px-4 py-2">{fmt(a.acquisition_cost)}</td>
                <td className="px-4 py-2 text-red-400">{fmt(a.accumulated_depreciation)}</td>
                <td className="px-4 py-2 font-semibold">{fmt(a.net_book_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// RECURRING
// ─────────────────────────────────────────────────────────────────
type Recurring = { id: string; client: string; description: string; amount_before_vat: number; frequency: string; next_run_date: string; is_active: boolean }

function RecurringTab() {
  const [rows, setRows] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/accounting/recurring-invoices').then(x => x.json())
    setRows(r.items || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const runNow = async () => {
    await fetch('/api/accounting/recurring-invoices/run', { method: 'POST' })
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">חשבוניות מחזוריות</h1>
        <button onClick={runNow} className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded text-emerald-200 text-sm hover:bg-emerald-500/30">הפק חשבוניות מחזוריות שבשלו</button>
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr><th className="px-4 py-2 text-right">לקוח</th><th className="px-4 py-2 text-right">תיאור</th><th className="px-4 py-2 text-right">סכום</th><th className="px-4 py-2 text-right">תדירות</th><th className="px-4 py-2 text-right">הרצה הבאה</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="px-4 py-6 text-center text-white/50">טוען…</td></tr> :
            rows.map(r => (
              <tr key={r.id} className="border-t border-white/5 text-white">
                <td className="px-4 py-2">{r.client}</td>
                <td className="px-4 py-2 text-white/70">{r.description}</td>
                <td className="px-4 py-2">{fmt(r.amount_before_vat)}</td>
                <td className="px-4 py-2 text-white/70">{r.frequency}</td>
                <td className="px-4 py-2">{r.next_run_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// BANK
// ─────────────────────────────────────────────────────────────────
function BankTab() {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string; bank: string; account_code: string }>>([])
  const [accountId, setAccountId] = useState<string>('')
  const [txs, setTxs] = useState<Array<{ id: string; date: string; description: string; amount: number; match_status: string }>>([])
  const [reconciling, setReconciling] = useState(false)

  useEffect(() => {
    fetch('/api/accounting/bank/accounts').then(r => r.json()).then(d => {
      setAccounts(d.accounts || [])
      if (!accountId && d.accounts?.[0]) setAccountId(d.accounts[0].id)
    })
  }, [accountId])
  useEffect(() => {
    if (!accountId) return
    fetch(`/api/accounting/bank/transactions?account_id=${accountId}`).then(r => r.json()).then(d => setTxs(d.transactions || []))
  }, [accountId])

  const reconcile = async () => {
    setReconciling(true)
    await fetch('/api/accounting/bank/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account_id: accountId }) })
    const r = await fetch(`/api/accounting/bank/transactions?account_id=${accountId}`).then(x => x.json())
    setTxs(r.transactions || [])
    setReconciling(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">בנק</h1>
        <div className="flex items-center gap-3">
          <select value={accountId} onChange={e => setAccountId(e.target.value)} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm">
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.bank})</option>)}
          </select>
          <button onClick={reconcile} disabled={!accountId || reconciling} className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded text-indigo-200 text-sm hover:bg-indigo-500/30 disabled:opacity-50">
            {reconciling ? 'מריץ…' : 'התאמה אוטומטית'}
          </button>
        </div>
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr><th className="px-4 py-2 text-right">תאריך</th><th className="px-4 py-2 text-right">תיאור</th><th className="px-4 py-2 text-right">סכום</th><th className="px-4 py-2 text-right">סטטוס</th></tr>
          </thead>
          <tbody>
            {txs.map(t => (
              <tr key={t.id} className="border-t border-white/5 text-white">
                <td className="px-4 py-2 font-mono">{t.date}</td>
                <td className="px-4 py-2 text-white/70">{t.description}</td>
                <td className={`px-4 py-2 ${t.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(t.amount)}</td>
                <td className="px-4 py-2 text-white/70">{t.match_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// BUDGET
// ─────────────────────────────────────────────────────────────────
function BudgetTab() {
  const [yr, setYr] = useState(new Date().getFullYear())
  const [data, setData] = useState<{ rows: Array<{ month: number; account_code: string; name_he: string; budget: number; actual: number; variance: number; variance_pct: number | null }> } | null>(null)
  useEffect(() => { fetch(`/api/accounting/budgets/variance?year=${yr}`).then(r => r.json()).then(setData) }, [yr])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">תקציב מול ביצוע — {yr}</h1>
        <input type="number" value={yr} onChange={e => setYr(Number(e.target.value))} className="px-2 py-1 bg-slate-800 border border-white/10 rounded text-white text-sm w-24" />
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr><th className="px-4 py-2 text-right">חודש</th><th className="px-4 py-2 text-right">חשבון</th><th className="px-4 py-2 text-right">תקציב</th><th className="px-4 py-2 text-right">בפועל</th><th className="px-4 py-2 text-right">סטייה</th><th className="px-4 py-2 text-right">%</th></tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((r, i) => (
              <tr key={i} className="border-t border-white/5 text-white">
                <td className="px-4 py-2 font-mono">{String(r.month).padStart(2, '0')}</td>
                <td className="px-4 py-2"><span className="font-mono text-white/50">{r.account_code}</span> {r.name_he}</td>
                <td className="px-4 py-2">{fmt(r.budget)}</td>
                <td className="px-4 py-2">{fmt(r.actual)}</td>
                <td className={`px-4 py-2 ${r.variance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(r.variance)}</td>
                <td className="px-4 py-2 text-white/60">{r.variance_pct != null ? `${r.variance_pct}%` : '—'}</td>
              </tr>
            ))}
            {(!data?.rows?.length) && <tr><td colSpan={6} className="px-4 py-6 text-center text-white/50">אין נתוני תקציב לשנה זו</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// REMINDERS
// ─────────────────────────────────────────────────────────────────
function RemindersTab() {
  const [rows, setRows] = useState<Array<{ id: string; stage: string; scheduled_for: string; amount_due: number; days_past_due: number; status: string; invoices: { invoice_num: string; client: string } | null }>>([])
  const [scanning, setScanning] = useState(false)
  const load = useCallback(async () => {
    const r = await fetch('/api/accounting/reminders').then(x => x.json())
    setRows(r.reminders || [])
  }, [])
  useEffect(() => { load() }, [load])
  const scan = async () => {
    setScanning(true)
    await fetch('/api/accounting/reminders', { method: 'POST' })
    await load()
    setScanning(false)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">תזכורות</h1>
        <button onClick={scan} disabled={scanning} className="px-3 py-1.5 bg-amber-500/20 border border-amber-400/30 rounded text-amber-200 text-sm hover:bg-amber-500/30 disabled:opacity-50">
          {scanning ? 'סורק…' : 'סרוק חשבוניות פתוחות'}
        </button>
      </div>
      <div className="bg-slate-900/60 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-white/60 text-xs">
            <tr><th className="px-4 py-2 text-right">תאריך</th><th className="px-4 py-2 text-right">שלב</th><th className="px-4 py-2 text-right">לקוח</th><th className="px-4 py-2 text-right">חשבונית</th><th className="px-4 py-2 text-right">ימים באיחור</th><th className="px-4 py-2 text-right">יתרה לתשלום</th></tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-white/5 text-white">
                <td className="px-4 py-2 font-mono">{r.scheduled_for}</td>
                <td className="px-4 py-2">{r.stage}</td>
                <td className="px-4 py-2">{r.invoices?.client || '—'}</td>
                <td className="px-4 py-2 font-mono">{r.invoices?.invoice_num || '—'}</td>
                <td className="px-4 py-2">{r.days_past_due}</td>
                <td className="px-4 py-2 text-amber-400">{fmt(r.amount_due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
