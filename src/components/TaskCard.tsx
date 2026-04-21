"use client"
import type { Task } from "@/lib/supabase"

const statusLabels: Record<string, string> = {
  pending: "ממתינה",
  in_progress: "בביצוע",
  completed: "הושלמה",
  archived: "בארכיון",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-600",
}

const priorityLabels: Record<string, string> = {
  urgent: "דחוף",
  high: "גבוהה",
  medium: "בינונית",
  low: "נמוכה",
}

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-green-100 text-green-700 border-green-200",
}

interface Props {
  task: Task
  isManager: boolean
  onStatusChange: (taskId: string, status: Task["status"]) => void
  onDelete: (taskId: string) => void
  onArchive: (taskId: string) => void
  onEdit?: (task: Task) => void
  onNavigateToArtist?: (projectName: string) => void
  onRemind?: () => void
  hasEmail?: boolean
}

export default function TaskCard({ task, isManager, onStatusChange, onDelete, onArchive, onEdit, onNavigateToArtist, onRemind, hasEmail }: Props) {
  const assignedName = (task.assigned_user as any)?.name || "לא שויך"
  const creatorName = (task.creator as any)?.name || ""
  const isArchived = task.status === "archived"
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "completed" && !isArchived

  const handleStatusChange = (newStatus: Task["status"]) => {
    onStatusChange(task.id, newStatus)
  }

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md group ${task.status === "completed" ? "border-green-200 opacity-75" : isArchived ? "border-gray-200 opacity-60" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className={`font-bold text-lg ${task.status === "completed" ? "line-through text-gray-400" : "text-gray-800"}`}>
              {task.title}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full font-medium border ${priorityColors[task.priority]}`}>
              {priorityLabels[task.priority]}
            </span>
          </div>

          {task.description && (
            <p className="text-gray-600 text-sm mb-3 whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            {(task as any).project && (
              <button
                onClick={() => onNavigateToArtist && onNavigateToArtist((task as any).project)}
                className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
                title="עבור לדף האומן"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                {(task as any).project}
              </button>
            )}
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {assignedName}
            </span>
            {isManager && <span>יוצר: {creatorName}</span>}
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {new Date(task.due_date).toLocaleDateString("he-IL")}
              </span>
            )}
            <span>{new Date(task.created_at).toLocaleDateString("he-IL")}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Status Dropdown - Always Visible */}
          <select
            value={task.status}
            onChange={(e) => handleStatusChange(e.target.value as Task["status"])}
            disabled={isArchived}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="pending">ממתינה</option>
            <option value="in_progress">בביצוע</option>
            <option value="completed">הושלמה</option>
          </select>

          {/* Action Buttons - Manager Only, Hidden Until Hover */}
          {isManager && (
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Edit Button */}
              {onEdit && !isArchived && (
                <button
                  onClick={() => onEdit(task)}
                  title="ערוך משימה"
                  className="text-sm text-indigo-400 px-2 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}

              {/* Remind Button */}
              {onRemind && (
                <button
                  onClick={onRemind}
                  title={hasEmail ? "שלח תזכורת לעובד" : "אין מייל מוגדר לעובד זה"}
                  className={`text-xs px-2 py-1.5 rounded-lg font-medium transition-colors ${hasEmail ? 'text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700' : 'text-gray-300 cursor-not-allowed'}`}
                >
                  הזכר
                </button>
              )}

              {/* Archive Button */}
              {!isArchived && (
                <button
                  onClick={() => onArchive(task.id)}
                  title="ארכיון"
                  className="text-sm text-gray-400 px-2 py-2 rounded-lg hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                  </svg>
                </button>
              )}

              {/* Delete Button */}
              <button
                onClick={() => { if (confirm("למחוק את המשימה?")) onDelete(task.id) }}
                className="text-sm text-red-400 px-2 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
