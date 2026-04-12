"use client"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Task, User } from "@/lib/supabase"
import TaskCard from "@/components/TaskCard"
import NewTaskModal from "@/components/NewTaskModal"
import ProjectsView from "@/components/ProjectsView"

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showNewTask, setShowNewTask] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all")
  const [activeTab, setActiveTab] = useState<"tasks" | "projects">("tasks")
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
      query = query.eq("assigned_to", userId)
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

  function logout() {
    localStorage.clear()
    window.location.href = "/"
  }

  const filteredTasks = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)
  const pendingCount = tasks.filter((t) => t.status === "pending").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const completedCount = tasks.filter((t) => t.status === "completed").length

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl text-gray-500">×××¢×...</div></div>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">ð</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">××¢×¨××ª × ××××</h1>
              <p className="text-sm text-gray-500">×©×××, {userName} {userRole === "manager" ? "ð" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userRole === "manager" && activeTab === "tasks" && (
              <button
                onClick={() => setShowNewTask(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <span>+</span> ××©××× ×××©×
              </button>
            )}
            <button onClick={logout} className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100">
              ××¦×××
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === "tasks"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            ð ××©××××ª
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all ${
              activeTab === "projects"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            ðµ ×¤×¨×××§×××
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === "tasks" ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <button onClick={() => setFilter("all")} className={`p-4 rounded-xl border-2 transition-all ${filter === "all" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                <div className="text-2xl font-bold text-gray-800">{tasks.length}</div>
                <div className="text-sm text-gray-500">×¡××´×</div>
              </button>
              <button onClick={() => setFilter("pending")} className={`p-4 rounded-xl border-2 transition-all ${filter === "pending" ? "border-yellow-500 bg-yellow-50" : "border-gray-200 bg-white"}`}>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-gray-500">×××ª×× ××ª</div>
              </button>
              <button onClick={() => setFilter("in_progress")} className={`p-4 rounded-xl border-2 transition-all ${filter === "in_progress" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"}`}>
                <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
                <div className="text-sm text-gray-500">××××¦××¢</div>
              </button>
              <button onClick={() => setFilter("completed")} className={`p-4 rounded-xl border-2 transition-all ${filter === "completed" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"}`}>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-sm text-gray-500">×××©×××</div>
              </button>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">ð</div>
                  <p>××× ××©××××ª {filter !== "all" ? "××§××××¨×× ××" : ""}</p>
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isManager={userRole === "manager"}
                    onStatusChange={updateTaskStatus}
                    onDelete={deleteTask}
                  />
                ))
              )}
            </div>
          </>
        ) : (
          <ProjectsView isManager={userRole === "manager"} />
        )}
      </div>

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
