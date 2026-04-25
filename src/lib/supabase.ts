import { createClient } from "@supabase/supabase-js"

// Use placeholder values at build time so Next.js prerender doesn't crash.
// In production (Vercel) the real env vars are always set.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseConfig = { url: supabaseUrl, anonKey: supabaseAnonKey }

export type User = {
  id: string
  name: string
  role: "manager" | "employee"
  pin: string
  email?: string
}

export type Task = {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "archived"
  priority: "low" | "medium" | "high" | "urgent"
  assigned_to: string
  created_by: string
  created_at: string
  updated_at: string
  completed_at: string | null
  due_date: string | null
  project?: string
  assigned_user?: User
  creator?: User
}

export type Client = {
  id: number
  name: string
  tax_id: string
  tax_status: string
  contact_name: string
  contact_email: string
  notes: string
  created_at: string
  updated_at: string
}

export type Invoice = {
  id: number
  client_id: number | null
  issued_by: string
  sent_to: string
  date: string
  doc_type: string
  invoice_num: string
  client: string
  before_vat: number
  total: number
  paid: number
  payment_date: string
  notes: string
  created_at: string
  updated_at: string
  // computed client-side
  remaining?: number
  status?: 'paid' | 'partial' | 'unpaid'
}

export type Project = {
  id: string
  name: string
  category: "artist" | "production"
  created_at: string
}

export type ProjectLink = {
  id: string
  project_id: string
  title: string
  url: string
  created_at: string
}
