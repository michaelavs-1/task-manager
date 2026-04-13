"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/supabase"

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) { window.location.href = "/dashboard"; return }
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabase.from("users").select("id,name,role").order("name")
    if (data) setUsers(data as User[])
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const { data } = await supabase.from("users").select("*").eq("id",selectedUser).eq("pin",pin).single()
    if (data) {
      localStorage.setItem("userId", data.id)
      localStorage.setItem("userName", data.name)
      localStorage.setItem("userRole", data.role)
      window.location.href = "/dashboard"
    } else {
      setError("קוד PIN שגוי")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-slate-600 text-sm">טוען...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex w-1/2 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <span className="text-white font-semibold text-sm">מערכת ניהול</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">ניהול משימות<br />בצורה חכמה</h1>
          <p className="text-indigo-200 text-sm leading-relaxed">פלטפורמה לניהול משימות ופרויקטים בצורה פשוטה ויעילה.</p>
        </div>
        <div className="text-indigo-300 text-xs">מערכת ניהול משימות</div>
      </div>
      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-2">ברוכים הבאים</h2>
            <p className="text-slate-400 text-sm">התחבר למערכת הניהול</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">משתמש</label>
              <select value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none" required>
                <option value="">בחר משתמש...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.role === "manager" ? " — מנהל" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">קוד PIN</label>
              <input type="password" value={pin} onChange={e=>setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-center text-xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required maxLength={6} />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2">
              התחבר
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
