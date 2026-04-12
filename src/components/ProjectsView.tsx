"use client"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Project, ProjectLink } from "@/lib/supabase"

interface Props {
  isManager: boolean
}

export default function ProjectsView({ isManager }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [links, setLinks] = useState<Record<string, ProjectLink[]>>({})
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [newLinkTitle, setNewLinkTitle] = useState("")
  const [newLinkUrl, setNewLinkUrl] = useState("")
  const [addingLink, setAddingLink] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [showNewProject, setShowNewProject] = useState(false)

  const loadProjects = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("category", "artists")
      .order("name")
    if (data) setProjects(data as Project[])
  }, [])

  const loadLinks = useCallback(async (projectId: string) => {
    const { data } = await supabase
      .from("project_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
    if (data) {
      setLinks((prev) => ({ ...prev, [projectId]: data as ProjectLink[] }))
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (selectedProject) loadLinks(selectedProject)
  }, [selectedProject, loadLinks])

  async function addLink() {
    if (!selectedProject || !newLinkTitle || !newLinkUrl) return
    setAddingLink(true)
    const { error } = await supabase.from("project_links").insert({
      project_id: selectedProject,
      title: newLinkTitle,
      url: newLinkUrl,
    })
    if (!error) {
      setNewLinkTitle("")
      setNewLinkUrl("")
      loadLinks(selectedProject)
    }
    setAddingLink(false)
  }

  async function deleteLink(linkId: string) {
    if (!confirm("×××××§ ××ª ×××× ×§?")) return
    await supabase.from("project_links").delete().eq("id", linkId)
    if (selectedProject) loadLinks(selectedProject)
  }

  async function addProject() {
    if (!newProjectName) return
    const { error } = await supabase.from("projects").insert({
      name: newProjectName,
      category: "artists",
    })
    if (!error) {
      setNewProjectName("")
      setShowNewProject(false)
      loadProjects()
    }
  }

  async function deleteProject(id: string) {
    if (!confirm("×××××§ ××ª ××¤×¨×××§× ××× ×××× ×§×× ×©××?")) return
    await supabase.from("projects").delete().eq("id", id)
    if (selectedProject === id) setSelectedProject(null)
    loadProjects()
  }

  const selectedProjectData = projects.find((p) => p.id === selectedProject)
  const projectLinks = selectedProject ? links[selectedProject] || [] : []

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Sidebar - Artist List */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          <div className="p-4 bg-purple-50 border-b border-purple-100">
            <h3 className="font-bold text-purple-800 flex items-center gap-2">
              ðµ ×××× ××
            </h3>
          </div>
          <div className="divide-y">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`w-full text-right px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  selectedProject === project.id
                    ? "bg-purple-50 text-purple-700 font-medium"
                    : "text-gray-700"
                }`}
              >
                <span>{project.name}</span>
                {isManager && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    className="text-red-300 hover:text-red-500 text-sm cursor-pointer"
                  >
                    â
                  </span>
                )}
              </button>
            ))}
          </div>
          {isManager && (
            <div className="p-3 border-t">
              {showNewProject ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="×©× ××××..."
                    className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addProject()}
                  />
                  <button
                    onClick={addProject}
                    className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-purple-700"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setShowNewProject(false)}
                    className="text-gray-400 px-2"
                  >
                    â
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewProject(true)}
                  className="w-full text-sm text-purple-600 hover:text-purple-800 py-1"
                >
                  + ×××¡×£ ××××
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Links */}
      <div className="flex-1">
        {selectedProject && selectedProjectData ? (
          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="p-5 border-b bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">
                {selectedProjectData.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">××× ×§×× ×¨×××× ××××</p>
            </div>

            {/* Add Link Form */}
            {isManager && (
              <div className="p-4 border-b bg-blue-50/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="×©× ×××× ×§"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                    dir="ltr"
                  />
                  <button
                    onClick={addLink}
                    disabled={addingLink || !newLinkTitle || !newLinkUrl}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {addingLink ? "..." : "×××¡×£"}
                  </button>
                </div>
              </div>
            )}

            {/* Links List */}
            <div className="divide-y">
              {projectLinks.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">ð</div>
                  <p>××× ××× ×§×× ×¢××××</p>
                  {isManager && (
                    <p className="text-sm mt-1">×××¡×£ ××× ×§ ×××¢××</p>
                  )}
                </div>
              ) : (
                projectLinks.map((link) => (
                  <div
                    key={link.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-blue-500">ð</span>
                      <div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          {link.title}
                        </a>
                        <p className="text-xs text-gray-400 mt-0.5" dir="ltr">
                          {link.url}
                        </p>
                      </div>
                    </div>
                    {isManager && (
                      <button
                        onClick={() => deleteLink(link.id)}
                        className="text-red-400 hover:text-red-600 text-sm"
                      >
                        ð
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-3">ðµ</div>
              <p className="text-lg">×××¨ ×××× ×××¨×©×××</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
