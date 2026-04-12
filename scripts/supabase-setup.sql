-- ××¢×¨××ª × ×××× ××©××××ª - ×¡×××ª ××¡××¡ × ×ª×× ××
-- ××¨×¦× ×-Supabase SQL Editor

-- ××××ª ××©×ª××©××
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
  pin TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ××××ª ××©××××ª
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ××× ××§×¡××
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- ×××¡×¤×ª ××©×ª××©×× (PIN: 1234 ××××× - ××©× ××ª ××××©×!)
INSERT INTO users (name, role, pin) VALUES
  ('×××××', 'manager', '1234'),
  ('××', 'employee', '1234'),
  ('××¢××', 'employee', '1234');

-- ××××ª ×¤×¨×××§×××
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'artists',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ××××ª ××× ×§×× ××¤×¨×××§×××
CREATE TABLE IF NOT EXISTS project_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_links_project ON project_links(project_id);

-- ×××¡×¤×ª ×××× ××
INSERT INTO projects (name, category) VALUES
  ('×''×××× ×''××', 'artists'),
  ('××§×', 'artists'),
  ('××× ×××××', 'artists'),
  ('××××¨ ××©×× ××', 'artists');

-- ××¤×¢××ª RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ×××× ×××ª ×××©× - ×××× ×××××× ××§×¨××
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);
CREATE POLICY "Anyone can read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tasks" ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update tasks" ON tasks FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete tasks" ON tasks FOR DELETE USING (true);

-- ×××× ×××ª ×××©× ××¤×¨×××§×××
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete projects" ON projects FOR DELETE USING (true);

CREATE POLICY "Anyone can read project_links" ON project_links FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project_links" ON project_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project_links" ON project_links FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete project_links" ON project_links FOR DELETE USING (true);

-- ××¤×¢××ª Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_links;

