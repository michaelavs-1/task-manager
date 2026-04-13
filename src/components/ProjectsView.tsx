"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Project, ProjectLink, Task } from "@/lib/supabase"

interface Props {
  isManager: boolean
  tasks: Task[]
}

export default function ProjectsView({ isManager, tasks }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [links, setLinks] = useState<Record<string, ProjectLink[]>>({})
  const [sel, setSel] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [showTasks, setShowTasks] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (sel) loadLinks(sel)
  }, [sel])

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("category")
      .order("name")
    if (data) {
      setProjects(data as Project[])
      const artists = (data as Project[]).filter((p) => p.category === "artist")
      if (artists.length > 0) setSel(artists[0].id)
    }
  }

  async function loadLinks(pid: string) {
    const { data } = await supabase
      .from("project_links")
      .select("*")
      .eq("project_id", pid)
      .order("created_at")
    if (data) setLinks((p) => ({ ...p, [pid]: data as ProjectLink[] }))
  }

  async function addLink() {
    if (!sel || !linkTitle || !linkUrl) return
    await supabase
      .from("project_links")
      .insert({ project_id: sel, title: linkTitle, url: linkUrl })
    setLinkTitle("")
    setLinkUrl("")
    setShowAdd(false)
    loadLinks(sel)
  }

  async function deleteLink(id: string) {
    if (!sel) return
    await supabase.from("project_links").delete().eq("id", id)
    loadLinks(sel)
  }

  const artists = projects.filter((p) => p.category === "artist")
  const productions = projects.filter((p) => p.category === "production")
  const current = projects.find((p) => p.id === sel)
  const currentLinks = sel ? links[sel] || [] : []
  const projectTasks = sel ? tasks.filter((t) => t.project === current?.name) : []

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white"

  const ProjectButton = ({ project }: { project: Project }) => (
    <button
      key={project.id}
      onClick={() => {
        setSel(project.id)
        setShowAdd(false)
        setShowTasks(false)
      }}
      className={
        "w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-all " +
        (sel === project.id
          ? "bg-indigo-600 text-white"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
      }
    >
      {project.name}
    </button>
  )

  return (
    <div className="flex gap-6 h-full">
      <div className="w-56 flex-shrink-0">
        {/* Artists Section */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
            אומנים
          </p>
          <div className="space-y-0.5">{artists.map((p) => <ProjectButton key={p.id} project={p} />)}</div>
        </div>

        {/* Productions Section */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">
            הפקות
          </p>
          <div className="space-y-0.5">
            {productions.map((p) => (
              <ProjectButton key={p.id} project={p} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {current && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{current.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{currentLinks.length} קישורים</p>
              </div>
              <div className="flex items-center gap-2">
                {projectTasks.length > 0 && (
                  <button
                    onClick={() => setShowTasks(!showTasks)}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    משימות ({projectTasks.length})
                  </button>
                )}
                {isManager && !showAdd && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    הוסף קישור
                  </button>
                )}
              </div>
            </div>

            {/* Tasks Section */}
            {showTasks && projectTasks.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">משימות של {current.name}</h3>
                <div className="space-y-2">
                  {projectTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white p-3 rounded-lg border border-blue-100 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded " +
                              (task.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : task.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-green-100 text-green-700")
                            }
                          >
                            {task.status === "pending"
                              ? "ממתינה"
                              : task.status === "in_progress"
                                ? "בביצוע"
                                : "הושלמה"}
                          </span>
                          <span
                            className={
                              "text-xs px-2 py-0.5 rounded " +
                              (task.priority === "low"
                                ? "bg-gray-100 text-gray-700"
                                : task.priority === "medium"
                                  ? "bg-blue-100 text-blue-700"
                                  : task.priority === "high"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-red-100 text-red-700")
                            }
                          >
                            {task.priority === "low"
                              ? "נמוכה"
                              : task.priority === "medium"
                                ? "בינונית"
                                : task.priority === "high"
                                  ? "גבוהה"
                                  : "דחוף"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Link Form */}
            {showAdd && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="שם הקישור"
                  className={inputCls}
                />
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputCls}
                />
                <div className="flex gap-2">
                  <button
                    onClick={addLink}
                    className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    שמור
                  </button>
                  <button
                    onClick={() => {
                      setShowAdd(false)
                      setLinkTitle("")
                      setLinkUrl("")
                    }}
                    className="border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            )}

            {/* Links List */}
            {currentLinks.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-slate-400 text-sm">אין קישורים עדיין</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {currentLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between px-4 py-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-3.5 h-3.5 text-indigo-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{link.title}</p>
                        <p className="text-xs text-slate-400 truncate">{link.url}</p>
                      </div>
                    </a>
                    {isManager && (
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
