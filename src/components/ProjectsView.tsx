"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import type { Project, ProjectLink } from "@/lib/supabase"

interface Props { isManager: boolean }

export default function ProjectsView({ isManager }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [links, setLinks] = useState<Record<string,ProjectLink[]>>({})
  const [sel, setSel] = useState<string|null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")

  useEffect(() => { loadProjects() }, [])
  useEffect(() => { if (sel) loadLinks(sel) }, [sel])

  async function loadProjects() {
    const { data } = await supabase.from("projects").select("*").order("name")
    if (data) { setProjects(data as Project[]); if (data.length > 0) setSel(data[0].id) }
  }

  async function loadLinks(pid: string) {
    const { data } = await supabase.from("project_links").select("*").eq("project_id",pid).order("created_at")
    if (data) setLinks(p => ({...p, [pid]: data as ProjectLink[]}))
  }

  async function addLink() {
    if (!sel || !linkTitle || !linkUrl) return
    await supabase.from("project_links").insert({ project_id:sel, title:linkTitle, url:linkUrl })
    setLinkTitle(""); setLinkUrl(""); setShowAdd(false)
    loadLinks(sel)
  }

  async function deleteLink(id: string) {
    if (!sel) return
    await supabase.from("project_links").delete().eq("id",id)
    loadLinks(sel)
  }

  const current = projects.find(p => p.id === sel)
  const currentLinks = sel ? (links[sel] || []) : []
  const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-slate-50 focus:bg-white"
  return (
    <div className="flex gap-6 h-full">
      {/* Artists sidebar */}
      <div className="w-56 flex-shrink-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">אומנים</p>
        <div className="space-y-0.5">
          {projects.map(p => (
            <button key={p.id} onClick={() => { setSel(p.id); setShowAdd(false) }}
              className={"w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-all " + (
                sel === p.id ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {current && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{current.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{currentLinks.length} קישורים</p>
              </div>
              {isManager && !showAdd && (
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  הוסף קישור
                </button>
              )}
            </div>
            {/* Add link form */}
            {showAdd && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                <input type="text" value={linkTitle} onChange={e=>setLinkTitle(e.target.value)} placeholder="שם הקישור" className={inputCls} />
                <input type="url" value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                <div className="flex gap-2">
                  <button onClick={addLink} className="bg-indigo-600 text-white text-xs px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">שמור</button>
                  <button onClick={() => { setShowAdd(false); setLinkTitle(""); setLinkUrl("") }} className="border border-slate-200 text-slate-500 text-xs px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors">ביטול</button>
                </div>
              </div>
            )}

            {/* Links list */}
            {currentLinks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
                <p className="text-slate-400 text-sm">אין קישורים עדיין</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {currentLinks.map(link => (
                  <div key={link.id} className="flex items-center justify-between px-4 py-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{link.title}</p>
                        <p className="text-xs text-slate-400 truncate">{link.url}</p>
                      </div>
                    </a>
                    {isManager && (
                      <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
