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
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    artist: true,
    production: true,
  })

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

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))
  }

  const artists = projects.filter((p) => p.category === "artist")
  const productions = projects.filter((p) => p.category === "production")
  const current = projects.find((p) => p.id === sel)
  const currentLinks = sel ? links[sel] || [] : []
  const projectTasks = sel ? tasks.filter((t) => t.project === current?.name) : []

  const CategoryCard = ({
    label,
    category,
    items,
  }: {
    label: string
    category: string
    items: Project[]
  }) => {
    const isOpen = expandedCategories[category]
    const activeInCategory = items.some((p) => p.id === sel)

    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
        <button
          onClick={() => toggleCategory(category)}
          className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
            activeInCategory && !isOpen
              ? "bg-indigo-600 text-white"
              : "hover:bg-gray-50 text-gray-700"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                activeInCategory && !isOpen
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {items.length}
            </span>
          </div>
          <svg
            className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""} ${
              activeInCategory && !isOpen ? "text-white" : "text-gray-400"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="border-t border-gray-100 p-2 space-y-0.5">
            {items.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSel(project.id)
                  setShowAdd(false)
                  setShowTasks(false)
                }}
                className={`w-full text-right px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  sel === project.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex gap-0 h-full bg-gray-50" dir="rtl">
      <div className="w-64 flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto">
        <div className="p-4 space-y-3">
          <CategoryCard label="אומנים" category="artist" items={artists} />
          <CategoryCard label="הפקות" category="production" items={productions} />
        </div>
      </div>
      <div className="flex-1 min-w-0 px-8 py-8 overflow-y-auto">
        {current ? (
          <div>
            <div className="flex items-center justify-between mb-8">
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900">{current.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{currentLinks.length} קישורים</p>
              </div>
              <div className="flex items-center gap-2">
                {projectTasks.length > 0 && (
                  <button
                    onClick={() => setShowTasks(!showTasks)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    משימות ({projectTasks.length})
                  </button>
                )}
                {isManager && !showAdd && (
                  <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    הוסף קישור
                  </button>
                )}
              </div>
            </div>

            {showTasks && projectTasks.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 text-right">משימות של {current.name}</h3>
                <div className="space-y-3">
                  {projectTasks.map((task) => (
                    <div key={task.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex-1 text-right">
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                        {task.description && <p className="text-xs text-gray-600 mt-1.5">{task.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAdd && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 text-right">קישור חדש</h3>
                <div className="space-y-4">
                  <input type="text" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="שם הקישור" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-right placeholder:text-gray-400" />
                  <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white placeholder:text-gray-400" dir="ltr" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setShowAdd(false); setLinkTitle(""); setLinkUrl("") }} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl">ביטול</button>
                    <button onClick={addLink} className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl">שמור</button>
                  </div>
                </div>
              </div>
            )}

            {currentLinks.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-center">
                <p className="text-gray-500 text-sm">אין קישורים עדיין</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentLinks.map((link) => (
                  <div key={link.id} className="flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-gray-100 hover:bg-gray-50 hover:shadow-sm transition-all group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{link.title}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{link.url}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">פתח ↗</a>
                      {isManager && (
                        <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">בחר פרויקט מהרשימה</p>
          </div>
        )}
      </div>


    </div>
  )
}
