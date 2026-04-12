import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  name: string
  role: "manager" | "employee"
  pin: string
}

export type Task = {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  assigned_to: string
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  due_date: string | null
  assigned_user?: User
  creator?: User
}

export type Project = {
  id: string
  name: string
  category: string
  created_at: string
}

export type ProjectLink = {
  id: string
  project_id: string
  title: string
  url: string
  created_at: string
}
