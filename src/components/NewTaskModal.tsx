"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/supabase"
import { useEsc } from "@/hooks/useEsc"

interface Props {
  users: User[]
  creatorId: string
  onClose: () => void
  onCreated: () => void
}

interface Project {
  id: string
  name: string
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-slate-50 focus:bg-white"
const labelCls = "block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide"

function buildTaskEmailHtml({
  taskTitle, description, priority, dueDate, assignedName, creatorName, projectName
}: {
  taskTitle: string; description: string; priority: string; dueDate: string | null;
  assignedName: string; creatorName: string; projectName: string | null;
}) {
  const priorityMap: Record<string, string> = { urgent: 'דחוף', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' }
  const priorityLabel = priorityMap[priority] || priority
  return `
<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #f8fafc; padding: 24px; border-radius: 12px;">
  <div style="background: #4f46e5; color: white; border-radius: 10px; padding: 20px 24px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 4px 0; font-size: 18px;">משימה חדשה הוקצתה לך</h2>
    <p style="margin: 0; opacity: 0.85; font-size: 14px;">מאלגוריתם הפקות</p>
  </div>
  <div style="background: white; border-radius: 10px; padding: 20px 24px; border: 1px solid #e2e8f0;">
    <h3 style="margin: 0 0 16px 0; font-size: 17px; color: #1e293b;">${taskTitle}</h3>
    ${description ? `<p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.6;">${description}</p>` : ''}
    <table style="width: 100%; font-size: 13px; color: #64748b;">
      <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">עדיפות:</td><td>${priorityLabel}</td></tr>
      ${dueDate ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">דדליין:</td><td>${new Date(dueDate).toLocaleDateString('he-IL')}</td></tr>` : ''}
      ${projectName ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">פרויקט:</td><td>${projectName}</td></tr>` : ''}
      <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">נוצר על ידי:</td><td>${creatorName}</td></tr>
    </table>
  </div>
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">אלגוריתם הפקות — מערכת ניהול משימות</p>
</div>`
}

export default function NewTaskModal({ users, creatorId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")
  const [projectId, setProjectId] = useState("")
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [hasDeadline, setHasDeadline] = useState(false)
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  useEsc(true, onClose)

  const today = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })

  useEffect(() => {
    supabase.from("projects").select("id, name").order("category").order("name").then(({ data }) => {
      if (data) setProjects(data)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!assignedTo || !title.trim()) return
    setSaving(true)
    const proj = projects.find(p => p.id === projectId)
    const { error } = await supabase.from("tasks").insert({
      title: title.trim(),
      description,
      assigned_to: assignedTo,
      created_by: creatorId,
      priority,
      project: proj?.name || null,
      due_date: hasDeadline && dueDate ? dueDate : null,
      status: "pending",
    })
    setSaving(false)
    if (error) {
      alert("שגיאה בשמירת המשימה: " + error.message)
      return
    }

    // Send email notification to assigned user
    const assignedUser = users.find(u => u.id === assignedTo)
    const creatorUser = users.find(u => u.id === creatorId)
    if (assignedUser?.email) {
      const html = buildTaskEmailHtml({
        taskTitle: title.trim(),
        description,
        priority,
        dueDate: hasDeadline && dueDate ? dueDate : null,
        assignedName: assignedUser.name,
        creatorName: creatorUser?.name || 'מנהל',
        projectName: proj?.name || null,
      })
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: assignedUser.email,
          subject: `משימה חדשה: ${title.trim()}`,
          html,
        }),
      }).catch(() => {}) // fire-and-forget, don't block UX
    }

    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">צור משימה חדשה</h2>
            <p className="text-xs text-slate-400 mt-0.5">ניתנה: {today}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelCls}>כותרת המשימה</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="תאר את המשימה..."
              className={inputCls}
              required
            />
          </div>

          {/* Assigned to */}
          <div>
            <label className={labelCls}>עובד מבצע</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputCls} required>
              <option value="">בחר עובד</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}{u.role === "manager" ? " (מנהל)" : ""}</option>
              ))}
            </select>
          </div>

          {/* Project */}
          <div>
            <label className={labelCls}>שיוך לפרויקט / אומן</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
              <option value="">ללא שיוך</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className={labelCls}>עדיפות</label>
            <div className="flex gap-2">
              {([
                { val: "low", label: "נמוכה", color: "border-green-300 text-green-700 bg-green-50" },
                { val: "medium", label: "בינונית", color: "border-yellow-300 text-yellow-700 bg-yellow-50" },
                { val: "high", label: "גבוהה", color: "border-orange-300 text-orange-700 bg-orange-50" },
                { val: "urgent", label: "דחוף", color: "border-red-300 text-red-700 bg-red-50" },
              ] as const).map(({ val, label, color }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPriority(val)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${priority === val ? color + ' shadow-sm' : 'border-slate-200 text-slate-400 bg-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>תיאור</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              className={inputCls}
              rows={3}
            />
          </div>

          {/* Deadline toggle */}
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              onClick={() => setHasDeadline(!hasDeadline)}
              className={"w-10 h-5 rounded-full transition-colors flex-shrink-0 relative " + (hasDeadline ? "bg-indigo-600" : "bg-slate-200")}
            >
              <span className={"absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all " + (hasDeadline ? "right-0.5" : "left-0.5")} />
            </button>
            <span className="text-sm text-slate-600">הוסף דדליין</span>
          </div>

          {hasDeadline && (
            <div>
              <label className={labelCls}>תאריך יעד</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} required={hasDeadline} />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              ביטול
            </button>
            <button type="submit" disabled={saving || !title.trim() || !assignedTo} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {saving ? "..." : "צור משימה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
