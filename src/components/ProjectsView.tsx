"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Project, ProjectLink } from "@/lib/supabase"

interface Props {
  isManager: boolean
}

export default function ProjectsView({ isManager }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [links, setLinks] = useState<Record<string, ProjectLink[]>>({})
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [showAddLink, setShowAddLink] = useState(false)
  const [newLinkTitle, setNewLinkTitle] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [activeTab, setActiveTab] = useState<"links">("links")

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("*").order("name")
    if (data) {
      setProjects(data as Project[])
      if (data.length > 0) setSelectedProject(data[0].id)
    }
  }

  useEffect(() => {
    if (selectedProject) loadLinks(selectedProject)
  }, [selectedProject])

  async function loadLinks(projectId: string) {
    const { data } = await supabase.from("project_links").select("*").eq("project_id", projectId).order("created_at")
    if (data) setLinks(prev => ({ ...prev, [projectId]: data as ProjectLink[] }))
  }

  async function addLink() {
    if (!selectedProject || !newLinkTitle || !newLinkUrl) return
    await supabase.from("project_links").insert({ project_id: selectedProject, title: newLinkTitle, url: newLinkUrl })
    setNewLinkTitle("")
    setNewLinkUrl("")
    setShowAddLink(false)
    loadLinks(selectedProject)
  }

  async function deleteLink(linkId: string) {
    if (!selectedProject) return
    await supabase.from("project_links").delete().eq("id", linkId)
    loadLinks(selectedProject)
  }

  const currentProject = projects.find(p => p.id === selectedProject)
  const currentLinks = selectedProject ? (links[selectedProject] || []) : []
  return (
    <div className="flex gap-6 h-full">
      {/* Sidebar - Artists list */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-purple-600 text-white px-4 py-3 font-semibold text-sm">
            🎵 אומנים
          </div>
          <div className="divide-y divide-gray-100">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => { setSelectedProject(project.id); setShowAddLink(false) }}
                className={`w-full text-right px-4 py-3 text-sm font-medium transition-colors ${
                  selectedProject === project.id
                    ? "bg-purple-50 text-purple-700 border-r-2 border-purple-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Main content */}
      <div className="flex-1">
        {currentProject && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{currentProject.name}</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("links")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === "links" ? "bg-purple-600 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  🔗 קישורים רלוונטיים
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Links Tab */}
              <div>
                {isManager && (
                  <div className="mb-4">
                    {!showAddLink ? (
                      <button onClick={() => setShowAddLink(true)} className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium text-sm">
                        <span className="text-lg">+</span> הוסף קישור
                      </button>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <input type="text" value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="שם הקישור" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                        <input type="url" value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                        <div className="flex gap-2">
                          <button onClick={addLink} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700">שמור</button>
                          <button onClick={() => { setShowAddLink(false); setNewLinkTitle(""); setNewLinkUrl("") }} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-100">ביטול</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {currentLinks.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <div className="text-3xl mb-2">🔗</div>
                    <p>אין קישורים עדיין</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors group">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-purple-600">🔗</span>
                          <span className="font-medium text-gray-700 truncate">{link.title}</span>
                          <span className="text-xs text-gray-400 truncate hidden group-hover:block">{link.url}</span>
                        </a>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:text-purple-800 font-medium">פתח ↗</a>
                          {isManager && (
                            <button onClick={() => deleteLink(link.id)} className="text-gray-300 hover:text-red-500 transition-colors text-sm">×</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
