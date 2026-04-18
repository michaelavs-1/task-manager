"use client"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Task, User } from "@/lib/supabase"
import TaskCard from "@/components/TaskCard"
import NewTaskModal from "@/components/NewTaskModal"
import ProjectsView from "@/components/ProjectsView"
import { CampaignsView } from "@/components/CampaignsView"
import { LinksView } from "@/components/LinksView"
import { ArtistDashboardView } from "@/components/ArtistDashboardView"
import { ActivityLogView } from "@/components/ActivityLogView"
import { useTheme } from "@/components/ThemeProvider"
import { FinancialView, type FinTab } from "@/components/FinancialView"
import { UserManagementView } from "@/components/UserManagementView"
import { MeetingsView } from "@/components/MeetingsView"
import { GeneralOverviewView } from "@/components/GeneralOverviewView"

type Section = "management" | "financial"
type Tab = "general" | "tasks" | "projects" | "campaigns" | "links" | "pixels" | "artists" | "activity" | "users" | "meetings"

export default function Dashboard() {
  const { theme, setTheme } = useTheme()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTabRaw] = useState<Tab>("general")
  const [selectedArtistName, setSelectedArtistName] = useState<string>("")
  const [activeSection, setActiveSectionRaw] = useState<Section>("management")
  const [activeFinTab, setActiveFinTabRaw] = useState<FinTab>('dashboard')

  const setActiveTab = (t: Tab) => { setActiveTabRaw(t); localStorage.setItem('dash_tab', t) }
  const setActiveSection = (s: Section) => { setActiveSectionRaw(s); localStorage.setItem('dash_section', s); if (s === 'financial') { setActiveFinTabRaw('dashboard'); localStorage.setItem('dash_fin_tab', 'dashboard') } }
  const setActiveFinTab = (f: FinTab) => { setActiveFinTabRaw(f); localStorage.setItem('dash_fin_tab', f) }
  const [showNewTask, setShowNewTask] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [viewByEmployee, setViewByEmployee] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    const name = localStorage.getItem("userName")
    const role = localStorage.getItem("userRole")
    if (!id) { window.location.href = "/"; return }
    setUserId(id)
    setUserName(name || "")
    setUserRole(role || "")
    // Restore last active position
    const savedSection = localStorage.getItem('dash_section') as Section | null
    const savedTab = localStorage.getItem('dash_tab') as Tab | null
    const savedFinTab = localStorage.getItem('dash_fin_tab') as FinTab | null
    if (savedSection) setActiveSectionRaw(savedSection)
    if (savedTab) setActiveTabRaw(savedTab)
    if (savedFinTab) setActiveFinTabRaw(savedFinTab)
  }, [])

  const loadTasks = useCallback(async () => {
    if (!userId) return
    let query = supabase
      .from("tasks")
      .select("*, assigned_user:users!tasks_assigned_to_fkey(id,name,role), creator:users!tasks_created_by_fkey(id,name,role)")
      .order("created_at", { ascending: false })

    if (userRole !== "manager") {
      query = query.eq("assigned_to", userId).neq("status", "archived")
    } else {
      query = query.neq("status", "archived")
    }

    const { data } = await query
    if (data) setTasks(data as unknown as Task[])
    setLoading(false)
  }, [userId, userRole])

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from("users").select("*").order("name")
    if (data) setUsers(data as User[])
  }, [])

  useEffect(() => {
    if (userId) {
      loadTasks()
      loadUsers()
      const channel = supabase
        .channel("tasks-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
          loadTasks()
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [userId, loadTasks, loadUsers])

  async function updateTaskStatus(taskId: string, status: Task["status"]) {
    const updates: Record<string, string> = { status, updated_at: new Date().toISOString() }
    if (status === "completed") updates.completed_at = new Date().toISOString()
    else updates.completed_at = ""
    await supabase.from("tasks").update(updates).eq("id", taskId)
    loadTasks()
  }

  async function deleteTask(taskId: string) {
    await supabase.from("tasks").delete().eq("id", taskId)
    loadTasks()
  }

  async function archiveTask(taskId: string) {
    await supabase.from("tasks").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", taskId)
    loadTasks()
  }

  async function sendRemindEmail(toEmail: string, toName: string, taskList: Task[]) {
    const priorityMap: Record<string, string> = { urgent: 'דחוף', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' }
    const rows = taskList.map(t => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${t.title}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;">${priorityMap[t.priority] || t.priority}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;">${t.due_date ? new Date(t.due_date).toLocaleDateString('he-IL') : '—'}</td>
      </tr>`).join('')
    const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
      <div style="background:#4f46e5;color:white;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
        <h2 style="margin:0 0 4px 0;font-size:18px;">תזכורת: משימות פתוחות</h2>
        <p style="margin:0;opacity:0.85;font-size:14px;">שלום ${toName}</p>
      </div>
      <div style="background:white;border-radius:10px;padding:20px 24px;border:1px solid #e2e8f0;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr>
            <th style="text-align:right;padding:6px 8px;font-size:12px;color:#94a3b8;border-bottom:2px solid #e2e8f0;">משימה</th>
            <th style="text-align:right;padding:6px 8px;font-size:12px;color:#94a3b8;border-bottom:2px solid #e2e8f0;">עדיפות</th>
            <th style="text-align:right;padding:6px 8px;font-size:12px;color:#94a3b8;border-bottom:2px solid #e2e8f0;">תאריך</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">אלגוריתם הפקות</p>
    </div>`
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toEmail, subject: `תזכורת: ${taskList.length} משימות פתוחות`, html }),
    })
  }

  async function sendRemindSingleEmail(toEmail: string, toName: string, task: Task) {
    const priorityMap: Record<string, string> = { urgent: 'דחוף', high: 'גבוהה', medium: 'בינונית', low: 'נמוכה' }
    const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
      <div style="background:#4f46e5;color:white;border-radius:10px;padding:20px 24px;margin-bottom:20px;">
        <h2 style="margin:0 0 4px 0;font-size:18px;">תזכורת: משימה ממתינה</h2>
        <p style="margin:0;opacity:0.85;font-size:14px;">שלום ${toName}</p>
      </div>
      <div style="background:white;border-radius:10px;padding:20px 24px;border:1px solid #e2e8f0;">
        <h3 style="margin:0 0 12px 0;font-size:16px;color:#1e293b;">${task.title}</h3>
        ${task.description ? `<p style="color:#475569;font-size:14px;margin:0 0 12px 0;">${task.description}</p>` : ''}
        <table style="font-size:13px;color:#64748b;">
          <tr><td style="padding:3px 0;font-weight:bold;color:#374151;padding-left:16px;">עדיפות:</td><td>${priorityMap[task.priority] || task.priority}</td></tr>
          ${task.due_date ? `<tr><td style="padding:3px 0;font-weight:bold;color:#374151;padding-left:16px;">תאריך:</td><td>${new Date(task.due_date).toLocaleDateString('he-IL')}</td></tr>` : ''}
        </table>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px;">אלגוריתם הפקות</p>
    </div>`
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: toEmail, subject: `תזכורת: ${task.title}`, html }),
    })
  }

  function logout() {
    localStorage.clear()
    window.location.href = "/"
  }

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)
  const pendingCount = tasks.filter((t) => t.status === "pending").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const completedCount = tasks.filter((t) => t.status === "completed").length

  const groupedByEmployee: Record<string, Task[]> = {}
  filteredTasks.forEach((task) => {
    const employeeName = (task.assigned_user as any)?.name || "לא שויך"
    if (!groupedByEmployee[employeeName]) groupedByEmployee[employeeName] = []
    groupedByEmployee[employeeName].push(task)
  })
  const sortedEmployees = Object.keys(groupedByEmployee).sort()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>טוען...</div>
    </div>
  )

  const navItems: { tab: Tab; label: string; icon: React.ReactNode }[] = [
    {
      tab: "general",
      label: "ראשי",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      tab: "tasks",
      label: "משימות",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      tab: "projects",
      label: "פרויקטים",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      tab: "campaigns",
      label: "שיווק",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
    },
    {
      tab: "links",
      label: "קישורים",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      tab: "artists",
      label: "אמנים",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
    },
    {
      tab: "meetings" as Tab,
      label: "פגישות",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    ...(userRole === "manager" ? [{
      tab: "users" as Tab,
      label: "משתמשים",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    }] : []),
  ]

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }} dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col flex-shrink-0 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #0c0e1c 0%, #111827 60%, #0e1220 100%)', borderLeft: '1px solid rgba(99,102,241,0.1)' }}>
        {/* Ambient top glow */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none" style={{ background: activeSection === 'financial' ? 'radial-gradient(ellipse at 50% -10%, rgba(20,184,166,0.22) 0%, transparent 70%)' : 'radial-gradient(ellipse at 50% -10%, rgba(99,102,241,0.18) 0%, transparent 70%)', transition: 'background 0.4s ease' }} />

        {/* Header */}
        <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Logo row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0" style={{ filter: 'drop-shadow(0 4px 12px rgba(77,208,225,0.35))' }}>
              <img src="/logo.svg" alt="Algorithm" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold leading-tight tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>אלגוריתם הפקות</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>מערכת ניהול</p>
            </div>
          </div>

          {/* User chip */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: activeSection === 'financial' ? 'linear-gradient(135deg, #14b8a6, #059669)' : 'linear-gradient(135deg, #1565c0, #0d47a1)', color: 'white', boxShadow: activeSection === 'financial' ? '0 2px 8px rgba(20,184,166,0.4)' : '0 2px 8px rgba(21,101,192,0.4)', transition: 'all 0.4s ease' }}>
              {userName ? userName.charAt(0) : '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{userName}</p>
              <p className="text-xs" style={{ color: activeSection === 'financial' ? 'rgba(45,212,191,0.8)' : 'rgba(56,189,248,0.8)', transition: 'color 0.4s ease' }}>{userRole === 'manager' ? 'מנהל' : 'עובד'}</p>
            </div>
          </div>

          {/* Section switcher */}
          <div className="flex mt-4 p-1 rounded-xl gap-1" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => setActiveSection("management")}
              className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={activeSection === "management" ? { background: 'linear-gradient(135deg, #1565c0, #0d47a1)', color: 'white', boxShadow: '0 2px 10px rgba(21,101,192,0.5)' } : { background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
            >
              ניהול
            </button>
            <button
              onClick={() => setActiveSection("financial")}
              className="flex-1 py-1.5 text-xs font-bold rounded-lg transition-all"
              style={activeSection === "financial" ? { background: 'linear-gradient(135deg, #14b8a6, #059669)', color: 'white', boxShadow: '0 2px 10px rgba(20,184,166,0.5)' } : { background: 'transparent', color: 'rgba(255,255,255,0.35)' }}
            >
              פיננסי
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {activeSection === "financial" ? ([
            { tab: 'dashboard' as FinTab, label: 'דשבורד', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            )},
            { tab: 'old_table' as FinTab, label: 'ראשית', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 3h18v18H3z" /></svg>
            )},
            { tab: 'invoices' as FinTab, label: 'חשבוניות / הכנסות', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            )},
            { tab: 'clients' as FinTab, label: 'לקוחות', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            )},
            { tab: 'suppliers' as FinTab, label: 'ספקים', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            )},
            { tab: 'projects' as FinTab, label: 'פרויקטים / אומנים', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            )},
            { tab: 'expenses' as FinTab, label: 'הוצאות / תשלומים', icon: (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            )},
          ] as { tab: FinTab; label: string; icon: React.ReactNode }[]).map(({ tab, label, icon }) => {
            const isActive = activeFinTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveFinTab(tab)}
                className="relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isActive ? 'rgba(20,184,166,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(20,184,166,0.2)' : '1px solid transparent',
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)' } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' } }}
              >
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: 'linear-gradient(to bottom, #14b8a6, #059669)' }} />}
                <div className="flex-shrink-0" style={{ color: isActive ? '#2dd4bf' : 'rgba(255,255,255,0.3)' }}>{icon}</div>
                <span className="font-medium">{label}</span>
              </button>
            )
          }) : navItems.map(({ tab, label, icon }) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group"
                style={{
                  background: isActive ? 'rgba(21,101,192,0.14)' : 'transparent',
                  border: isActive ? '1px solid rgba(21,101,192,0.2)' : '1px solid transparent',
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(21,101,192,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)' } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)' } }}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full" style={{ background: 'linear-gradient(to bottom, #4dd0e1, #1976d2)' }} />
                )}
                <div className="flex-shrink-0" style={{ color: isActive ? '#4dd0e1' : 'rgba(255,255,255,0.3)' }}>
                  {icon}
                </div>
                <span className="font-medium">{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="relative px-3 py-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {userRole === "manager" && activeTab === "tasks" && activeSection === "management" && (
            <button
              onClick={() => setShowNewTask(true)}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', color: 'white', boxShadow: '0 4px 14px rgba(2,132,199,0.4)' }}
            >
              + משימה חדשה
            </button>
          )}

          {/* Theme Toggle */}
          <div className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs mb-2 font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>ערכת נושא</p>
            <div className="flex gap-1.5">
              {(['light', 'middle', 'dark'] as const).map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={theme === t ? { background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.35)' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {['בהיר', 'בינוני', 'כהה'][i]}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(252,165,165,0.7)'; (e.currentTarget as HTMLButtonElement).style.border = '1px solid rgba(239,68,68,0.15)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLButtonElement).style.border = '1px solid transparent' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>יציאה</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {activeSection === "financial" ? (
          <FinancialView activeTab={activeFinTab} />
        ) : (
        <>
        {/* General Overview Tab */}
        {activeTab === "general" && (
          <GeneralOverviewView
            tasks={tasks}
            userName={userName}
            userRole={userRole}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="max-w-6xl mx-auto px-8 py-8">
            {/* Page Title */}
            <h2 className="text-2xl font-bold tracking-tight mb-8" style={{ color: 'var(--text-primary)' }}>
              משימות שלי
            </h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <button
                onClick={() => setFilter("all")}
                className="rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md"
                style={{
                  backgroundColor: filter === "all" ? 'var(--bg-card)' : 'var(--bg-card)',
                  borderColor: filter === "all" ? '#4F46E5' : 'var(--border-color)',
                  borderWidth: filter === "all" ? '2px' : '1px',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#4F46E5' }}>{tasks.length}</div>
                <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>סה״כ</div>
              </button>

              <button
                onClick={() => setFilter("pending")}
                className="rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md"
                style={{
                  backgroundColor: filter === "pending" ? 'var(--bg-card)' : 'var(--bg-card)',
                  borderColor: filter === "pending" ? '#F59E0B' : 'var(--border-color)',
                  borderWidth: filter === "pending" ? '2px' : '1px',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#F59E0B' }}>{pendingCount}</div>
                <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>ממתינות</div>
              </button>

              <button
                onClick={() => setFilter("in_progress")}
                className="rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md"
                style={{
                  backgroundColor: filter === "in_progress" ? 'var(--bg-card)' : 'var(--bg-card)',
                  borderColor: filter === "in_progress" ? '#3B82F6' : 'var(--border-color)',
                  borderWidth: filter === "in_progress" ? '2px' : '1px',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#3B82F6' }}>{inProgressCount}</div>
                <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>בביצוע</div>
              </button>

              <button
                onClick={() => setFilter("completed")}
                className="rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md"
                style={{
                  backgroundColor: filter === "completed" ? 'var(--bg-card)' : 'var(--bg-card)',
                  borderColor: filter === "completed" ? '#10B981' : 'var(--border-color)',
                  borderWidth: filter === "completed" ? '2px' : '1px',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: '#10B981' }}>{completedCount}</div>
                <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>הושלמו</div>
              </button>
            </div>

            {/* Employee Picker - Manager Only */}
            {userRole === "manager" && (
              <div className="mb-6">
                <button
                  onClick={() => setShowEmployeePicker(!showEmployeePicker)}
                  className={'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ' + (selectedEmployee ? 'bg-indigo-600 border-indigo-600' : '')}
                  style={{
                    color: selectedEmployee ? 'white' : 'var(--text-primary)',
                    borderColor: selectedEmployee ? '#4F46E5' : 'var(--border-color)',
                    backgroundColor: selectedEmployee ? '#4F46E5' : 'transparent',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{selectedEmployee || 'בחר עובד'}</span>
                  {selectedEmployee && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setSelectedEmployee(null); setShowEmployeePicker(false) }}
                      className="text-indigo-200 hover:text-white cursor-pointer text-xs ml-1"
                    >✕</span>
                  )}
                  <span className="text-xs opacity-60 mr-1">{showEmployeePicker ? '▲' : '▼'}</span>
                </button>

                {showEmployeePicker && (
                  <div className="mt-2 p-3 rounded-2xl border shadow-sm flex flex-wrap gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    {sortedEmployees.map((name) => (
                      <button
                        key={name}
                        onClick={() => { setSelectedEmployee(name); setShowEmployeePicker(false) }}
                        className={'px-3 py-2 rounded-xl text-sm font-semibold border transition-colors flex items-center gap-1.5 ' + (selectedEmployee === name ? 'bg-indigo-600 border-indigo-600 text-white' : 'hover:bg-indigo-50 hover:border-indigo-300')}
                        style={{
                          color: selectedEmployee === name ? 'white' : 'var(--text-primary)',
                          borderColor: selectedEmployee === name ? '#4F46E5' : 'var(--border-color)',
                        }}
                      >
                        <span>{name}</span>
                        <span className={'text-xs rounded-full px-1.5 py-0.5 font-medium ' + (selectedEmployee === name ? 'bg-indigo-500 text-indigo-100' : 'bg-gray-100 text-gray-500')}>
                          {(groupedByEmployee[name] || []).length}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Task List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p style={{ color: 'var(--text-secondary)' }}>אין משימות {filter !== "all" ? "בקטגוריה זו" : ""}</p>
                </div>
              ) : selectedEmployee ? (
                (() => {
                  const empUser = users.find(u => u.name === selectedEmployee)
                  const empTasks = groupedByEmployee[selectedEmployee] || []
                  return (
                    <EmployeeSection
                      key={selectedEmployee}
                      employeeName={selectedEmployee}
                      tasks={empTasks}
                      isManager={userRole === "manager"}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                      onArchive={archiveTask}
                      onNavigateToArtist={(name) => { setSelectedArtistName(name); setActiveTab("artists") }}
                      userEmail={empUser?.email}
                      onRemindAll={() => {
                        if (!empUser?.email) return alert("אין כתובת אימייל לעובד זה")
                        const open = empTasks.filter(t => t.status !== 'completed' && t.status !== 'archived')
                        if (!open.length) return alert("אין משימות פתוחות לעובד זה")
                        sendRemindEmail(empUser.email, empUser.name, open).then(() => alert("תזכורת נשלחה!"))
                      }}
                      onRemindTask={(task) => {
                        if (!empUser?.email) return alert("אין כתובת אימייל לעובד זה")
                        sendRemindSingleEmail(empUser.email, empUser.name, task).then(() => alert("תזכורת נשלחה!"))
                      }}
                    />
                  )
                })()
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isManager={userRole === "manager"}
                    onStatusChange={updateTaskStatus}
                    onDelete={deleteTask}
                    onArchive={archiveTask}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="h-full" />
        )}

        {/* Campaigns Tab */}
        {activeTab === "campaigns" && (
          <div className="h-full">
            <CampaignsView />
          </div>
        )}

        {/* Links Tab */}
        {activeTab === "links" && (
          <div className="h-full">
            <LinksView />
          </div>
        )}

        {/* Artist Dashboard Tab */}
        {activeTab === "artists" && (
          <div className="h-full">
            <ArtistDashboardView tasks={tasks} initialArtist={selectedArtistName} />
          </div>
        )}
        {/* Activity Log Tab */}
        {activeTab === "activity" && (
          <div className="h-full">
            <ActivityLogView tasks={tasks} />
          </div>
        )}

        {/* Meetings Tab */}
        {activeTab === "meetings" && (
          <div className="h-full">
            <MeetingsView />
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === "users" && (
          <div className="h-full">
            <UserManagementView />
          </div>
        )}
        </>
        )}
      </main>

      {/* New Task Modal */}
      {showNewTask && (
        <NewTaskModal
          users={users}
          creatorId={userId}
          onClose={() => setShowNewTask(false)}
          onCreated={() => { setShowNewTask(false); loadTasks() }}
        />
      )}
    </div>
  )
}

function EmployeeSection({
  employeeName,
  tasks,
  isManager,
  onStatusChange,
  onDelete,
  onArchive,
  onNavigateToArtist,
  userEmail,
  onRemindAll,
  onRemindTask,
}: {
  employeeName: string
  tasks: Task[]
  isManager: boolean
  onStatusChange: (taskId: string, status: Task["status"]) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string) => void
  onNavigateToArtist?: (projectName: string) => void
  userEmail?: string
  onRemindAll?: () => void
  onRemindTask?: (task: Task) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-3 flex-1 text-right">
          <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{employeeName}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>({tasks.length})</span>
          <span style={{ color: 'var(--text-secondary)' }} className="text-xs">{expanded ? "▼" : "▶"}</span>
        </button>
        {isManager && onRemindAll && (
          <button
            onClick={onRemindAll}
            title={userEmail ? "שלח תזכורת על כל המשימות הפתוחות" : "אין כתובת אימייל לעובד זה"}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${userEmail ? 'border-indigo-200 text-indigo-600 hover:bg-indigo-50' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            הזכר לכל
          </button>
        )}
      </div>

      {expanded && (
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {tasks.map((task) => (
            <div key={task.id} className="px-6 py-4" style={{ backgroundColor: 'var(--bg-card)' }}>
              <TaskCard
                task={task}
                isManager={isManager}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onArchive={onArchive}
                onNavigateToArtist={onNavigateToArtist}
                onRemind={onRemindTask ? () => onRemindTask(task) : undefined}
                hasEmail={!!userEmail}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
