'use client'
import { useState, useEffect } from 'react'
import type { Task } from '@/lib/supabase'

interface Props {
  tasks: Task[]
  userName: string
  userRole: string
  onNavigate: (tab: string) => void
}

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

const PRIORITY_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  urgent: { label: 'דחוף', bg: 'bg-red-100', text: 'text-red-700' },
  high:   { label: 'גבוהה', bg: 'bg-orange-100', text: 'text-orange-700' },
  medium: { label: 'בינונית', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  low:    { label: 'נמוכה', bg: 'bg-gray-100', text: 'text-gray-500' },
}

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  pending:     { label: 'ממתינה', color: 'text-amber-500' },
  in_progress: { label: 'בביצוע', color: 'text-blue-500' },
  completed:   { label: 'הושלם', color: 'text-emerald-500' },
}

const QUICK_LINKS = [
  { tab: 'campaigns', label: 'שיווק', icon: '📣', color: 'bg-violet-50 border-violet-100 hover:border-violet-300' },
  { tab: 'artists',   label: 'אומנים', icon: '🎵', color: 'bg-indigo-50 border-indigo-100 hover:border-indigo-300' },
  { tab: 'meetings',  label: 'פגישות', icon: '🎙️', color: 'bg-sky-50 border-sky-100 hover:border-sky-300' },
  { tab: 'links',     label: 'קישורים', icon: '🔗', color: 'bg-teal-50 border-teal-100 hover:border-teal-300' },
  { tab: 'projects',  label: 'פרויקטים', icon: '📁', color: 'bg-amber-50 border-amber-100 hover:border-amber-300' },
  { tab: 'tasks',     label: 'משימות', icon: '✅', color: 'bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
]

type EventItem = { id: string; name: string; artistName: string; date: string | null; location?: string | null; status?: string | null }
type CampaignItem = { id: string; name: string; launch_date: string | null; project_name: string | null; status: string | null }

function useDailyDigest() {
  const [shows, setShows] = useState<{ today: EventItem[]; yesterday: EventItem[] }>({ today: [], yesterday: [] })
  const [campaigns, setCampaigns] = useState<{ today: CampaignItem[]; yesterday: CampaignItem[] }>({ today: [], yesterday: [] })

  useEffect(() => {
    const todayISO = new Date().toISOString().split('T')[0]
    const yISO = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Shows from cache
    try {
      const raw = localStorage.getItem('event_board_cache')
      if (raw) {
        const events: EventItem[] = JSON.parse(raw)
        setShows({
          today:     events.filter(e => e.date === todayISO),
          yesterday: events.filter(e => e.date === yISO),
        })
      }
    } catch { /* ignore */ }

    // Campaigns from API
    fetch('/api/sync-campaigns')
      .then(r => r.json())
      .then((d: { campaigns?: CampaignItem[] }) => {
        const camps: CampaignItem[] = d.campaigns || []
        setCampaigns({
          today:     camps.filter(c => c.launch_date?.slice(0,10) === todayISO),
          yesterday: camps.filter(c => c.launch_date?.slice(0,10) === yISO),
        })
      }).catch(() => {})
  }, [])

  return { shows, campaigns }
}

export function GeneralOverviewView({ tasks, userName, userRole, onNavigate }: Props) {
  const now = new Date()
  const dayName = DAYS_HE[now.getDay()]
  const dateStr = `${now.getDate()} ${MONTHS_HE[now.getMonth()]} ${now.getFullYear()}`
  const { shows, campaigns } = useDailyDigest()

  const pending = tasks.filter(t => t.status === 'pending')
  const inProgress = tasks.filter(t => t.status === 'in_progress')
  const completed = tasks.filter(t => t.status === 'completed')
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed')

  // Most recent open tasks (latest first)
  const recentOpen = [...tasks]
    .filter(t => t.status !== 'completed' && t.status !== 'archived')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="flex-1 overflow-auto p-8 space-y-8" dir="rtl" style={{ backgroundColor: 'var(--bg-secondary)' }}>

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          שלום, {userName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          יום {dayName}, {dateStr}
        </p>
      </div>

      {/* ── Daily Digest ── */}
      {(shows.yesterday.length > 0 || shows.today.length > 0 || campaigns.yesterday.length > 0 || campaigns.today.length > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '🎭 הופעות אתמול', items: shows.yesterday,     color: 'border-gray-200 bg-gray-50', labelC: 'text-gray-500', nav: 'eventboard' },
            { label: '📣 קמפיינים אתמול', items: campaigns.yesterday, color: 'border-gray-200 bg-gray-50', labelC: 'text-gray-500', nav: 'campaigns' },
            { label: '🎭 הופעות היום',   items: shows.today,        color: 'border-indigo-200 bg-indigo-50', labelC: 'text-indigo-600', nav: 'eventboard' },
            { label: '📣 קמפיינים היום', items: campaigns.today,     color: 'border-violet-200 bg-violet-50', labelC: 'text-violet-600', nav: 'campaigns' },
          ].map(({ label, items, color, labelC, nav }) => (
            <button
              key={label}
              onClick={() => onNavigate(nav)}
              className={`rounded-2xl border p-4 text-right transition-all hover:shadow-md ${color}`}
            >
              <p className={`text-xs font-semibold mb-2 ${labelC}`}>{label}</p>
              {items.length === 0 ? (
                <p className="text-sm text-gray-300">אין</p>
              ) : (
                <div className="space-y-1">
                  {items.slice(0, 3).map(item => (
                    <div key={item.id} className="text-xs text-gray-700 font-medium truncate">
                      {'artistName' in item
                        ? `${(item as EventItem).artistName} — ${item.name}`
                        : `${(item as CampaignItem).project_name ?? ''} — ${item.name}`
                      }
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-gray-400">+{items.length - 3} נוספים</p>
                  )}
                </div>
              )}
              <p className={`text-2xl font-bold mt-2 ${labelC}`}>{items.length}</p>
            </button>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={tasks.length}
          label="סה״כ משימות"
          color="#4F46E5"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          value={pending.length}
          label="ממתינות"
          color="#F59E0B"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          value={inProgress.length}
          label="בביצוע"
          color="#3B82F6"
          onClick={() => onNavigate('tasks')}
        />
        <StatCard
          value={urgent.length}
          label="דחופות"
          color="#EF4444"
          onClick={() => onNavigate('tasks')}
        />
      </div>

      {/* Two columns: recent tasks + quick nav */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent open tasks */}
        <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>משימות פתוחות אחרונות</h2>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
            >
              כל המשימות ←
            </button>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {recentOpen.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                אין משימות פתוחות
              </div>
            ) : recentOpen.map(task => {
              const pri = PRIORITY_STYLE[task.priority]
              const sta = STATUS_STYLE[task.status]
              const assignedName = (task.assigned_user as any)?.name
              return (
                <div key={task.id} className="px-5 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {assignedName && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{assignedName}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          · {new Date(task.due_date).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {pri && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pri.bg} ${pri.text}`}>
                        {pri.label}
                      </span>
                    )}
                    {sta && (
                      <span className={`text-xs font-medium ${sta.color}`}>{sta.label}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Navigation */}
        <div>
          <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>ניווט מהיר</h2>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(({ tab, label, icon, color }) => (
              <button
                key={tab}
                onClick={() => onNavigate(tab)}
                className={`rounded-2xl border p-4 text-right transition-all hover:shadow-sm flex items-center gap-3 ${color}`}
              >
                <span className="text-2xl">{icon}</span>
                <span className="font-semibold text-sm text-gray-700">{label}</span>
              </button>
            ))}
          </div>

          {/* Completion bar */}
          {tasks.length > 0 && (
            <div className="mt-4 rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>אחוז השלמה</span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  {Math.round((completed.length / tasks.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((completed.length / tasks.length) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                <span>{completed.length} הושלמו</span>
                <span>{tasks.length - completed.length} פתוחות</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ value, label, color, onClick }: {
  value: number
  label: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border shadow-sm p-5 text-right transition-all hover:shadow-md w-full"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{label}</div>
    </button>
  )
}
