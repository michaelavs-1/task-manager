"use client"
import type { Task } from "@/lib/supabase"

const STATUS: Record<string,{label:string,cls:string}> = {
  pending:     { label:"ממתין",   cls:"bg-amber-100 text-amber-700" },
  in_progress: { label:"בביצוע",  cls:"bg-blue-100 text-blue-700" },
  completed:   { label:"הושלם",  cls:"bg-emerald-100 text-emerald-700" },
}

const PRIORITY: Record<string,{label:string,bar:string}> = {
  urgent: { label:"דחוף",   bar:"bg-red-500" },
  high:   { label:"גבוה",   bar:"bg-orange-400" },
  medium: { label:"בינוני", bar:"bg-amber-400" },
  low:    { label:"נמוך",   bar:"bg-slate-300" },
}

interface Props {
  task: Task
  isManager: boolean
  onStatusChange: (id: string, status: Task["status"]) => void
  onDelete: (id: string) => void
}
export default function TaskCard({ task, isManager, onStatusChange, onDelete }: Props) {
  const assigned = (task.assigned_user as any)?.name || "לא שויך"
  const creator  = (task.creator as any)?.name || ""
  const st = STATUS[task.status]
  const pr = PRIORITY[task.priority]
  const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed"
  const cardCls = "bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group" + (task.status === "completed" ? " opacity-60" : "")
  const titleCls = "font-semibold text-sm text-slate-800" + (task.status === "completed" ? " line-through text-slate-400" : "")

  return (
    <div className={cardCls}>
      <div className="flex items-stretch">
        <div className={"w-1 rounded-r-full flex-shrink-0 " + pr.bar} />
        <div className="flex-1 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                <h3 className={titleCls}>{task.title}</h3>
                <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + st.cls}>{st.label}</span>
                <span className="text-xs text-slate-400 font-medium">{pr.label}</span>
              </div>
              {task.description && (
                <p className="text-slate-500 text-xs leading-relaxed mb-2 line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {assigned}
                </span>
                {isManager && creator && <span>יוצר: {creator}</span>}
                {task.due_date && (
                  <span className={"flex items-center gap-1 " + (overdue ? "text-red-500 font-medium" : "")}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {new Date(task.due_date).toLocaleDateString("he-IL")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {task.status === "pending" && (
                <button onClick={() => onStatusChange(task.id,"in_progress")} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  התחל
                </button>
              )}
              {task.status === "in_progress" && (
                <button onClick={() => onStatusChange(task.id,"completed")} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors font-medium">
                  סיימתי
                </button>
              )}
              {task.status === "completed" && (
                <button onClick={() => onStatusChange(task.id,"pending")} className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                  פתח מחדש
                </button>
              )}
              {isManager && (
                <button onClick={() => { if(confirm("למחוק את המשימה?")) onDelete(task.id) }} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
