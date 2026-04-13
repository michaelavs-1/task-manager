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

type Tab = "tasks" | "projects" | "campaigns" | "links" | "artists"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<Tab>("tasks")
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-xl text-gray-500">טוען...</div>
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
      label: "קמפיינים",
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
      label: "דשבורד אומן",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-indigo-900 text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-6 border-b border-indigo-800">
          <h1 className="text-base font-bold text-white">מערכת משימות</h1>
          <p className="text-xs text-indigo-300 mt-1">{userName}{userRole === "manager" ? " · מנהל" : ""}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-right ${
                activeTab === tab
                  ? "bg-indigo-700 text-white"
                  : "text-indigo-200 hover:bg-indigo-800 hover:text-white"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-indigo-800">
          {userRole === "manager" && activeTab === "tasks" && (
            <button
              onClick={() => setShowNewTask(true)}
              className="w-full bg-white text-indigo-900 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-50 transition-colors mb-2"
            >
              + משימה חדשה
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-indigo-300 hover:text-white hover:bg-indigo-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            יציאה
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button
                onClick={() => setFilter("all")}
                className={`p-4 rounded-xl border-2 transition-all text-right ${filter === "all" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white"}`}
              >
                <div className="text-2xl font-bold text-gray-800">{tasks.length}</div>
                <div className="text-sm text-gray-500">סה״כ</div>
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`p-4 rounded-xl border-2 transition-all text-right ${filter === "pending" ? "border-yellow-500 bg-yellow-50" : "border-gray-200 bg-white"}`}
              >
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-gray-500">ממתינות</div>
              </button>
              <button
                onClick={() => setFilter("in_progress")}
                className={`p-4 rounded-xl border-2 transition-all text-right ${filter === "in_progress" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}
              >
                <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
                <div className="text-sm text-gray-500">בביצוע</div>
              </button>
              <button
                onClick={() => setFilter("completed")}
                className={`p-4 rounded-xl border-2 transition-all text-right ${filter === "completed" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"}`}
              >
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-gray-500">הושלמו</div>
              </button>
            </div>

            {/* View Toggle - Manager Only */}
            {userRole === "manager" && (
              <div className="mb-5">
                <button
                  onClick={() => setViewByEmployee(!viewByEmployee)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    viewByEmployee ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  לפי עובד
                </button>
              </div>
            )}

            {/* Task List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>אין משימות {filter !== "all" ? "בקטגוריה זו" : ""}</p>
                </div>
              ) : viewByEmployee ? (
                sortedEmployees.map((employeeName) => (
                  <EmployeeSection
                    key={employeeName}
                    employeeName={employeeName}
                    tasks={groupedByEmployee[employeeName]}
                    isManager={userRole === "manager"}
                    onStatusChange={updateTaskStatus}
                    onDelete={deleteTask}
                    onArchive={archiveTask}
                  />
                ))
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
          <div className="h-full p-6">
            <ProjectsView isManager={userRole === "manager"} tasks={tasks} />
          </div>
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
            <ArtistDashboardView tasks={tasks} />
          </div>
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
}: {
  employeeName: string
  tasks: Task[]
  isManager: boolean
  onStatusChange: (taskId: string, status: Task["status"]) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 text-right flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
      >
        <span className="flex items-center gap-3">
          <span className="font-semibold text-lg text-gray-800">{employeeName}</span>
          <span className="text-sm text-gray-500">({tasks.length})</span>
        </span>
        <span className="text-gray-600 text-xs">{expanded ? "▼" : "▶"}</span>
      </button>

      {expanded && (
        <div className="divide-y">
          {tasks.map((task) => (
            <div key={task.id} className="px-5 py-4 bg-white">
              <TaskCard
                task={task}
                isManager={isManager}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
