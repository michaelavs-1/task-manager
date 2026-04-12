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

export default function NewTaskModal({ users, creatorId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [priority, setPriority] = useState<"urgent" | "high" | "medium" | "low">("medium")
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignedTo) return
    setSaving(true)
    await supabase.from("tasks").insert({
      title,
      description,
      assigned_to: assignedTo,
      created_by: creatorId,
      priority,
      due_date: dueDate || null,
      status: "pending",
    })
    setSaving(false)
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">משימה חדשה</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">כותרת</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="שם המשימה" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תיאור</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="תיאור אופציונלי" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שייך ל</label>
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
              <option value="">בחר משתמש</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} {u.role === "manager" ? "(מנהל)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">עדיפות</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="urgent">דחוף</option>
              <option value="high">גבוה</option>
              <option value="medium">בינוני</option>
              <option value="low">נמוך</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך יעד</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? "..." : "צור משימה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
