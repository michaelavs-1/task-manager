'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@/lib/supabase'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white'
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide'

export function UserManagementView() {
  const [users, setUsers] = useState<User[]>([])
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  async function loadUsers() {
    const { data } = await supabase.from('users').select('*').order('name')
    if (data) setUsers(data as User[])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  function startEdit(user: User) {
    setEditing(prev => ({ ...prev, [user.id]: user.email || '' }))
  }

  async function saveEmail(userId: string) {
    const email = editing[userId]?.trim()
    setSaving(prev => ({ ...prev, [userId]: true }))
    const { error } = await supabase
      .from('users')
      .update({ email: email || null })
      .eq('id', userId)
    setSaving(prev => ({ ...prev, [userId]: false }))
    if (!error) {
      setSaved(prev => ({ ...prev, [userId]: true }))
      setTimeout(() => setSaved(prev => ({ ...prev, [userId]: false })), 2000)
      setEditing(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
      loadUsers()
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: 'var(--text-secondary)' }}>
      טוען...
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-8 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          ניהול משתמשים
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          הגדר כתובת מייל לכל עובד לצורך קבלת התראות על משימות
        </p>
      </div>

      <div className="space-y-3">
        {users.map(user => {
          const isEditing = user.id in editing
          const isSaving = saving[user.id]
          const wasSaved = saved[user.id]

          return (
            <div
              key={user.id}
              className="rounded-2xl border shadow-sm p-5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {user.role === 'manager' ? 'מנהל' : 'עובד'}
                  </p>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(user)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors px-3 py-1 rounded-lg hover:bg-indigo-50"
                  >
                    {user.email ? 'ערוך' : 'הוסף מייל'}
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>כתובת מייל</label>
                    <input
                      type="email"
                      value={editing[user.id]}
                      onChange={e => setEditing(prev => ({ ...prev, [user.id]: e.target.value }))}
                      placeholder="example@email.com"
                      className={inputCls}
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') saveEmail(user.id) }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(prev => { const n = { ...prev }; delete n[user.id]; return n })}
                      className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    >
                      ביטול
                    </button>
                    <button
                      onClick={() => saveEmail(user.id)}
                      disabled={isSaving}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'שומר...' : 'שמור'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: user.email ? '#4F46E5' : 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm" style={{ color: user.email ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {user.email || 'אין מייל מוגדר'}
                  </span>
                  {wasSaved && (
                    <span className="text-xs text-green-600 font-medium mr-auto">נשמר</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div
        className="mt-8 rounded-2xl border p-5 text-sm"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
      >
        <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>הגדרת שליחת מיילים</p>
        <p className="mb-1">
          המיילים נשלחים דרך שירות Resend. כדי להפעיל שליחה אמיתית:
        </p>
        <ol className="list-decimal list-inside space-y-1 mr-2">
          <li>הרשמה בחינם ב-resend.com</li>
          <li>קבלת API Key</li>
          <li>הוספת משתנה הסביבה <span className="font-mono bg-slate-100 px-1 rounded text-xs">RESEND_API_KEY</span> ב-Vercel</li>
          <li>הוספת <span className="font-mono bg-slate-100 px-1 rounded text-xs">EMAIL_FROM</span> עם המייל שלך (לאחר אימות דומיין)</li>
        </ol>
      </div>
    </div>
  )
}
