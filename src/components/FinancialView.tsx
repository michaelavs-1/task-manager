'use client'

export function FinancialView() {
  return (
    <div className="flex flex-col h-full bg-gray-50" dir="rtl">
      <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-gray-200 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">פיננסי</h1>
          <p className="text-sm text-gray-500 mt-0.5">ניהול הכנסות, הוצאות ודוחות</p>
        </div>
      </div>
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
            { label: 'דוחות', icon: '▦', color: 'bg-blue-50 text-blue-600' },
          ].map(({ label, icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col items-center gap-2 shadow-sm">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${color}`}>{icon}</span>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <span className="text-xs text-gray-400">בקרוב</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
