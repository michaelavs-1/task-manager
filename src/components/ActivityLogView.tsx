'use client'
import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { Task } from '@/lib/supabase'

type ActivityType = 'task' | 'campaign'

type ActivityItem = {
  id: string
  date: string
  type: ActivityType
  title: string
  subtitle: string
  project: string
  projectCategory: string
  status: string
  statusColor: string
  typeLabel: string
  typeColor: string
}

type Project = { id: string; name: string; category: string }

type Campaign = {
  id: string
  campaign_name: string
  status: string | null
  platforms: string | null
  launch_date: string | null
  end_date: string | null
  project_name: string | null
  board: string
  created_at: string | null
  updated_at: string | null
}

const TASK_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתינה',
  in_progress: 'בביצוע',
  completed: 'הושלמה',
  archived: 'בארכיון',
}

export function ActivityLogView({ tasks }: { tasks: Task[] }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'campaign'>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'artist' | 'production'>('all')

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*').order('category').order('name'),
      supabase.from('campaigns').select('id, campaign_name, status, platforms, launch_date, end_date, project_name, board, created_at, updated_at').order('launch_date', { ascending: false }),
    ]).then(([{ data: pData }, { data: cData }]) => {
      if (pData) setProjects(pData as Project[])
      if (cData) setCampaigns(cData as Campaign[])
      setLoading(false)
    })
  }, [])

  const projectCategoryMap = useMemo(() => {
    const map: Record<string, string> = {}
    projects.forEach(p => { map[p.name] = p.category })
    return map
  }, [projects])

  const activities = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []

    tasks.forEach(task => {
      const cat = projectCategoryMap[(task as any).project || ''] || 'other'
      items.push({
        id: 'task-' + task.id,
        date: task.updated_at || task.created_at,
        type: 'task',
        title: task.title,
        subtitle: task.description ? task.description.substring(0, 80) + (task.description.length > 80 ? '...' : '') : '',
        project: (task as any).project || '',
        projectCategory: cat,
        status: TASK_STATUS_LABELS[task.status] || task.status,
        statusColor: TASK_STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600',
        typeLabel: 'משימה',
        typeColor: 'bg-indigo-100 text-indigo-700',
      })
    })

    campaigns.forEach(c => {
      const cat = projectCategoryMap[c.project_name || ''] || 'other'
      const dateToUse = c.launch_date || c.updated_at || c.created_at || ''
      if (!dateToUse) return
      items.push({
        id: 'campaign-' + c.id,
        date: dateToUse,
        type: 'campaign',
        title: c.campaign_name || 'קמפיין ללא שם',
        subtitle: [c.platforms, c.board === 'barbie' ? 'בארבי' : 'יוניברסל'].filter(Boolean).join(' · '),
        project: c.project_name || '',
        projectCategory: cat,
        status: c.status || '',
        statusColor: 'bg-purple-100 text-purple-700',
        typeLabel: 'קמפיין',
        typeColor: 'bg-pink-100 text-pink-700',
      })
    })

    return items.sort((a, b) => b.date.localeCompare(a.date))
  }, [tasks, campaigns, projectCategoryMap])

  const filtered = useMemo(() => {
    return activities.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (projectTypeFilter !== 'all' && item.projectCategory !== projectTypeFilter) return false
      if (projectFilter !== 'all' && item.project !== projectFilter) return false
      return true
    })
  }, [activities, typeFilter, projectTypeFilter, projectFilter])

  const allProjects = useMemo(() => {
    const seen = new Set<string>()
    const result: { name: string; category: string }[] = []
    activities.forEach(a => {
      if (a.project && !seen.has(a.project)) {
        seen.add(a.project)
        result.push({ name: a.project, category: a.projectCategory })
      }
    })
    return result.sort((a, b) => a.name.localeCompare(b.name, 'he'))
  }, [activities])

  const grouped = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {}
    filtered.forEach(item => {
      const dateKey = item.date.substring(0, 10)
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(item)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const formatDate = (d: string) => {
    try {
      const date = new Date(d)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      if (d === today.toISOString().substring(0, 10)) return 'היום'
      if (d === yesterday.toISOString().substring(0, 10)) return 'אתמול'
      return date.toLocaleDateString('he-IL', { day: '2-digit', month: 'long', year: 'numeric' })
    } catch { return d }
  }

  const formatTime = (d: string) => {
    if (!d.includes('T')) return ''
    try { return new Date(d).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">טוען יומן פעילות...</div>

  return (
    <div className="h-full overflow-auto p-8" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">יומן פעילות</h2>
            <p className="text-sm text-slate-400">{filtered.length} פעילויות</p>
          </div>
          {/* Reset filters */}
          {(typeFilter !== 'all' || projectFilter !== 'all' || projectTypeFilter !== 'all') && (
            <button onClick={() => { setTypeFilter('all'); setProjectFilter('all'); setProjectTypeFilter('all') }}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">
              נקה פילטרים
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-3">
          {/* Type */}
          <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
            {(['all', 'task', 'campaign'] as const).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${typeFilter === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'all' ? 'הכל' : t === 'task' ? '✓ משימות' : '📣 קמפיינים'}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Project type */}
          <div className="flex gap-1 bg-slate-50 rounded-xl p-1">
            {(['all', 'artist', 'production'] as const).map(t => (
              <button key={t} onClick={() => { setProjectTypeFilter(t); setProjectFilter('all') }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${projectTypeFilter === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {t === 'all' ? 'כל סוגי פרויקט' : t === 'artist' ? 'אומנים' : 'הפקות'}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-slate-200" />

          {/* Specific project */}
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="all">כל הפרויקטים</option>
            {allProjects
              .filter(p => projectTypeFilter === 'all' || p.category === projectTypeFilter)
              .map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>

        {/* Timeline */}
        {grouped.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>אין פעילויות</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dateKey, items]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-bold text-slate-600">{formatDate(dateKey)}</span>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>

                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="bg-white border border-slate-100 rounded-xl px-4 py-3 flex items-start gap-3 hover:border-slate-200 hover:shadow-sm transition-all group">
                      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === 'task' ? 'bg-indigo-50' : 'bg-pink-50'}`}>
                        {item.type === 'task' ? (
                          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-medium text-slate-800 text-sm">{item.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.typeColor}`}>{item.typeLabel}</span>
                          {item.status && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.statusColor}`}>{item.status}</span>
                          )}
                        </div>
                        {item.subtitle && <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>}
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {item.project && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg font-medium">{item.project}</span>
                        )}
                        {formatTime(item.date) && (
                          <span className="text-xs text-slate-300">{formatTime(item.date)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
