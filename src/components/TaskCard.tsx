"use client"

import type { Task } from "@/lib/supabase"

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  in_progress: "בביצוע",
  completed: "הושלם",
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
}

const priorityLabels: Record<string, string> = {
  urgent: "דחוף",
  high: "גבוה",
  medium: "בינוני",
  low: "נמוך",
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
}
export default function TaskCard({ task, isManager, onStatusChange, onDelete }: Props) {
  const assignedName = (task.assigned_user as any)?.name || "לא שויך"
  const creatorName = (task.creator as any)?.name || ""

  return (
    <div className={`bg-white rounded-xl border-2 p-5 transition-all hover:shadow-md ${task.status === "completed" ? "border-green-200 opacity-75" : "border-gray-200"}`}>
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
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>👤 {assignedName}</span>
            {isManager && <span>יוצר: {creatorName}</span>}
            {task.due_date && (
              <span className={new Date(task.due_date) < new Date() && task.status !== "completed" ? "text-red-500 font-medium" : ""}>
                📅 {new Date(task.due_date).toLocaleDateString("he-IL")}
              </span>
            )}
            <span>{new Date(task.created_at).toLocaleDateString("he-IL")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {task.status === "pending" && (
            <button onClick={() => onStatusChange(task.id, "in_progress")} className="text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium">
              התחל
            </button>
          )}
          {task.status === "in_progress" && (
            <button onClick={() => onStatusChange(task.id, "completed")} className="text-sm bg-green-50 text-green-600 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors font-medium">
              ✓ סיימתי
            </button>
          )}
          {task.status === "completed" && (
            <button onClick={() => onStatusChange(task.id, "pending")} className="text-sm bg-gray-50 text-gray-500 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              פתח מחדש
            </button>
          )}
          {isManager && (
            <button onClick={() => { if (confirm("למחוק את המשימה?")) onDelete(task.id) }} className="text-sm text-red-400 px-2 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
