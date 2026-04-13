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
    // Check if already logged in
    const userId = localStorage.getItem("userId")
    if (userId) {
      window.location.href = "/dashboard"
      return
    }
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabase.from("users").select("id, name, role").order("name")
    if (data) setUsers(data as User[])
    setLoading(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", selectedUser)
      .eq("pin", pin)
      .single()

    if (data) {
      localStorage.setItem("userId", data.id)
      localStorage.setItem("userName", data.name)
      localStorage.setItem("userRole", data.role)
      window.location.href = "/dashboard"
    } else {
      setError("קוד PIN שגוי")
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-500">טוען...</div></div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">מערכת ניהול משימות</h1>
          <p className="text-gray-500 mt-1">התחבר כדי להמשיך</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">בחר משתמש</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- בחר --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role === "manager" ? "(מנהל)" : ""}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">קוד PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="הזן קוד PIN"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center tracking-widest text-lg"
              required
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            התחבר
          </button>
        </form>
      </div>
    </div>
  )
}
