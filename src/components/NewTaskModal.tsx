"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/supabase"

interface Props {
  users: User[]
  creatorId: string
  onClose: () => void
  onCreated: () => void
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide"

export default function NewTaskModal({ users, creatorId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<"urgent"|"high"|"medium"|"low">("medium")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignedTo) return
    setSaving(true)
    await supabase.from("tasks").insert({
      title, description, assigned_to: assignedTo, created_by: creatorId,
      priority, due_date: dueDate || null, status: "pending",
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">צור משימה חדשה</h2>
            <p className="text-xs text-slate-400 mt-0.5">מלא את הפרטים</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>כותרת</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="שם המשימה" className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>תיאור</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="פרטים נוספים..." className={inputCls} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>שיוך ל</label>
              <select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)} className={inputCls} required>
                <option value="">בחר משתמש</option>
                {users.map(u=>(
                  <option key={u.id} value={u.id}>{u.name}{u.role==="manager" ? " (מנהל)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>עדיפות</label>
              <select value={priority} onChange={e=>setPriority(e.target.value as any)} className={inputCls}>
                <option value="urgent">דחוף</option>
                <option value="high">גבוה</option>
                <option value="medium">בינוני</option>
                <option value="low">נמוך</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>תאריך יעד</label>
            <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {saving ? "..." : "צור משימה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
