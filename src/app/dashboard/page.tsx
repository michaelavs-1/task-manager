"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Task, User } from "@/lib/supabase"
import TaskCard from "@/components/TaskCard"
import NewTaskModal from "@/components/NewTaskModal"
import ProjectsView from "@/components/ProjectsView"
import CampaignsView from "@/components/CampaignsView"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [activeTab, setActiveTab] = useState<"tasks" | "projects" | "campaigns">("tasks")
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const id = localStorage.getItem("userId")
    const name = localStorage.getItem("userName")
    const role = localStorage.getItem("userRole")
    if (!id) { window.location.href = "/"; return }
    setUserId(id); setUserName(name || ""); setUserRole(role || "")
  }, [])

  const loadTasks = useCallback(async () => {
    if (!userId) return
    let query = supabase.from("tasks")
      .select("*, assigned_user:users!tasks_assigned_to_fkey(id,name,role), creator:users!tasks_created_by_fkey(id,name,role)")
      .order("created_at", { ascending: false })
    if (userRole !== "manager") query = query.eq("assigned_to", userId)
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
      loadTasks(); loadUsers()
      const ch = supabase.channel("tc").on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, loadTasks).subscribe()
      return () => { supabase.removeChannel(ch) }
    }
  }, [userId, loadTasks, loadUsers])
  async function updateTaskStatus(taskId: string, status: Task["status"]) {
    const u: Record<string, string> = { status, updated_at: new Date().toISOString() }
    if (status === "completed") u.completed_at = new Date().toISOString()
    else u.completed_at = ""
    await supabase.from("tasks").update(u).eq("id", taskId)
    loadTasks()
  }
  async function deleteTask(taskId: string) {
    await supabase.from("tasks").delete().eq("id", taskId); loadTasks()
  }
  function logout() { localStorage.clear(); window.location.href = "/" }

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter)
  const pending = tasks.filter(t => t.status === "pending").length
  const inProg = tasks.filter(t => t.status === "in_progress").length
  const done = tasks.filter(t => t.status === "completed").length

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="text-slate-400 text-lg font-light tracking-widest">טואן...</div>
    </div>
  )
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-64 bg-slate-900 flex flex-col flex-shrink-0 border-l border-slate-800">
        <div className="px-6 py-7 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">M</div>
            <span className="text-white font-semibold text-sm">מערכת ניהול</span>
          </div>
          <p className="text-slate-400 text-xs mt-2 mr-11">שלום, {userName} {userRole === "manager" ? "· מנהל" : ""}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <button onClick={() => setActiveTab("tasks")}
            className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all " + (activeTab === "tasks" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            משימות
            {tasks.length > 0 && <span className="mr-auto bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">{tasks.length}</span>}
          </button>
          <button onClick={() => setActiveTab("projects")}
            className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all " + (activeTab === "projects" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            פרויקטים
          </button>
          <button onClick={() => setActiveTab("campaigns")}
            className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all " + (activeTab === "campaigns" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800")}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            קידומים
          </button>
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            יציאה
          </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-slate-800 font-semibold text-base">
            {activeTab === "tasks" ? "משימות" : activeTab === "projects" ? "פרויקטים" : "קידומים"}
          </h2>
          {userRole === "manager" && activeTab === "tasks" && (
            <button onClick={() => setShowNewTask(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              משימה חדשה
            </button>
          )}
        </header>
        {activeTab === "campaigns" ? (
          <CampaignsView />
        ) : (
          <div className="flex-1 overflow-auto p-8">
            {activeTab === "tasks" ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "כל המשימות", value: tasks.length, key: "all", color: "text-slate-700", bg: "bg-slate-100", active: "bg-slate-900 text-white" },
                    { label: "ממתינות", value: pending, key: "pending", color: "text-amber-600", bg: "bg-amber-50", active: "bg-amber-500 text-white" },
                    { label: "בביצוע", value: inProg, key: "in_progress", color: "text-blue-600", bg: "bg-blue-50", active: "bg-blue-600 text-white" },
                    { label: "הושלמו", value: done, key: "completed", color: "text-emerald-600", bg: "bg-emerald-50", active: "bg-emerald-600 text-white" },
                  ].map(s => (
                    <button key={s.key} onClick={() => setFilter(s.key as any)}
                      className={"rounded-xl p-5 text-right transition-all " + (filter === s.key ? s.active : s.bg + " hover:shadow-sm")}>
                      <div className={"text-3xl font-bold mb-1 " + (filter === s.key ? "text-white" : s.color)}>{s.value}</div>
                      <div className={"text-xs font-medium tracking-wide " + (filter === s.key ? "text-white/80" : "text-slate-500")}>{s.label}</div>
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filtered.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      </div>
                      <p className="text-slate-400 text-sm">אין משימות להצגה</p>
                    </div>
                  ) : filtered.map(task => (
                    <TaskCard key={task.id} task={task} isManager={userRole === "manager"} onStatusChange={updateTaskStatus} onDelete={deleteTask} />
                  ))}
                </div>
              </>
            ) : (
              <ProjectsView isManager={userRole === "manager"} />
            )}
          </div>
        )}
      </main>
      {showNewTask && (
        <NewTaskModal users={users} creatorId={userId} onClose={() => setShowNewTask(false)} onCreated={() => { setShowNewTask(false); loadTasks() }} />
      )}
    </div>
  )
}
