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
import { FinancialView } from "@/components/FinancialView"
import { UserManagementView } from "@/components/UserManagementView"

type Section = "management" | "financial"
type Tab = "tasks" | "projects" | "campaigns" | "links" | "pixels" | "artists" | "activity" | "users"

export default function Dashboard() {
  const { theme, setTheme } = useTheme()
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("tasks")
  const [selectedArtistName, setSelectedArtistName] = useState<string>("")
  const [activeSection, setActiveSection] = useState<Section>("management")
  const [financialTab, setFinancialTab] = useState<'overview'|'main'>('main')
  const [showNewTask, setShowNewTask] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [viewByEmployee, setViewByEmployee] = useState(false)
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
            <th style="text-align:right;padding:6px 8px;font-size:12px;color:#94a3b8;border-bottom:2px solid #e2e8f0;">דדליין</th>
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
          ${task.due_date ? `<tr><td style="padding:3px 0;font-weight:bold;color:#374151;padding-left:16px;">דדליין:</td><td>${new Date(task.due_date).toLocaleDateString('he-IL')}</td></tr>` : ''}
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
      label: "אומנים",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
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
      <aside className="w-64 bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h1 className="text-lg font-bold text-white">אלגוריתם הפקות</h1>
          </div>
          <p className="text-xs text-slate-400">{userName}{userRole === "manager" ? " · מנהל" : ""}</p>
          {/* Section switcher */}
          <div className="flex mt-4 bg-slate-700/40 rounded-xl p-1 gap-1">
            <button
              onClick={() => setActiveSection("management")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeSection === "management" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              ניהול
            </button>
            <button
              onClick={() => setActiveSection("financial")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeSection === "financial" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              פיננסי
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {activeSection === "financial" ? (
            <button
              onClick={() => {}}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-slate-700/50 text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              סקירה כללית
            </button>
          ) : navItems.map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white bg-opacity-20 text-white"
                  : "text-indigo-100 hover:bg-white hover:bg-opacity-10"
              }`}
            >
              <span>{label}</span>
              {icon}
            </button>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="px-3 py-4 border-t border-slate-700/50 space-y-3">
          {userRole === "manager" && activeTab === "tasks" && (
            <button
              onClick={() => setShowNewTask(true)}
              className="w-full bg-white text-indigo-700 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              + משימה חדשה
            </button>
          )}

          {/* Theme Toggle */}
          <div className="bg-white bg-opacity-10 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">עיצוב</p>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('light')}
                title="בהיר"
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'bg-white text-indigo-700'
                    : 'bg-white bg-opacity-10 text-indigo-100 hover:bg-opacity-20'
                }`}
              >
                בהיר
              </button>
              <button
                onClick={() => setTheme('middle')}
                title="בינוני"
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'middle'
                    ? 'bg-white text-indigo-700'
                    : 'bg-white bg-opacity-10 text-indigo-100 hover:bg-opacity-20'
                }`}
              >
                בינוני
              </button>
              <button
                onClick={() => setTheme('dark')}
                title="כהה"
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'bg-white text-indigo-700'
                    : 'bg-white bg-opacity-10 text-indigo-100 hover:bg-opacity-20'
                }`}
              >
                כהה
              </button>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-indigo-100 hover:bg-white hover:bg-opacity-10 transition-colors"
          >
            <span>יציאה</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {activeSection === "financial" ? (
          <FinancialView defaultTab={financialTab} />
        ) : (
        <>
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

            {/* View Toggle - Manager Only */}
            {userRole === "manager" && (
              <div className="mb-6 flex gap-3">
                <button
                  onClick={() => setViewByEmployee(!viewByEmployee)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  style={{
                    backgroundColor: viewByEmployee ? '#4F46E5' : 'transparent',
                    color: viewByEmployee ? 'white' : 'var(--text-primary)',
                    border: viewByEmployee ? 'none' : `1px solid var(--border-color)`,
                  }}
                >
                  לפי עובד
                </button>
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
              ) : viewByEmployee ? (
                sortedEmployees.map((employeeName) => {
                  const empUser = users.find(u => u.name === employeeName)
                  return (
                    <EmployeeSection
                      key={employeeName}
                      employeeName={employeeName}
                      tasks={groupedByEmployee[employeeName]}
                      isManager={userRole === "manager"}
                      onStatusChange={updateTaskStatus}
                      onDelete={deleteTask}
                      onArchive={archiveTask}
                      onNavigateToArtist={(name) => { setSelectedArtistName(name); setActiveTab("artists") }}
                      userEmail={empUser?.email}
                      onRemindAll={() => {
                        if (!empUser?.email) return alert("אין מייל מוגדר לעובד זה")
                        const open = groupedByEmployee[employeeName].filter(t => t.status !== 'completed' && t.status !== 'archived')
                        if (!open.length) return alert("אין משימות פתוחות לעובד זה")
                        sendRemindEmail(empUser.email, empUser.name, open).then(() => alert("תזכורת נשלחה!"))
                      }}
                      onRemindTask={(task) => {
                        if (!empUser?.email) return alert("אין מייל מוגדר לעובד זה")
                        sendRemindSingleEmail(empUser.email, empUser.name, task).then(() => alert("תזכורת נשלחה!"))
                      }}
                    />
                  )
                })
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
}: {
  employeeName: string
  tasks: Task[]
  isManager: boolean
  onStatusChange: (taskId: string, status: Task["status"]) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string) => void
  onNavigateToArtist?: (projectName: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between transition-colors"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>{employeeName}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>({tasks.length})</span>
        </div>
        <span style={{ color: 'var(--text-secondary)' }} className="text-xs">{expanded ? "▼" : "▶"}</span>
      </button>

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
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
