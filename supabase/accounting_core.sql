-- =====================================================================
-- Accounting Core — Double-Entry GL for task-manager
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================================

-- -------------------------------------------------------------------
-- 1. Chart of Accounts
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(10) UNIQUE NOT NULL,
  name_he       TEXT NOT NULL,
  account_type  TEXT NOT NULL CHECK (account_type IN
                  ('asset','liability','equity','revenue','expense','contra_asset','contra_revenue')),
  parent_id     UUID REFERENCES accounts(id),
  code_6111     VARCHAR(10),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  description   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_accounts" ON accounts;
CREATE POLICY "allow_all_accounts" ON accounts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(code);

-- -------------------------------------------------------------------
-- 2. Journal Entries (header)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date    DATE NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  source_type   TEXT NOT NULL,
  source_id     TEXT,
  reference     TEXT,
  status        TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','reversed')),
  reversed_by   UUID REFERENCES journal_entries(id),
  created_by    TEXT DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_je" ON journal_entries;
CREATE POLICY "allow_all_je" ON journal_entries FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);

-- -------------------------------------------------------------------
-- 3. Journal Entry Lines
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS je_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  je_id         UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES accounts(id),
  debit         NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  memo          TEXT DEFAULT '',
  project_id    TEXT,
  artist_name   TEXT,
  cost_center   TEXT,
  line_order    INT NOT NULL DEFAULT 0,
  CONSTRAINT either_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
  )
);
ALTER TABLE je_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_jl" ON je_lines;
CREATE POLICY "allow_all_jl" ON je_lines FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_jl_account ON je_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jl_je ON je_lines(je_id);
CREATE INDEX IF NOT EXISTS idx_jl_project ON je_lines(project_id);

-- -------------------------------------------------------------------
-- 4. Balanced-JE validation trigger
-- -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION validate_je_balanced() RETURNS TRIGGER AS $$
DECLARE
  total_d NUMERIC;
  total_c NUMERIC;
  target_je UUID;
BEGIN
  target_je := COALESCE(NEW.je_id, OLD.je_id);
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO total_d, total_c
    FROM je_lines WHERE je_id = target_je;
  -- allow in-progress state when JE has 0 lines (just created)
  IF total_d = 0 AND total_c = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF ABS(total_d - total_c) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry % not balanced: debit=%, credit=%', target_je, total_d, total_c;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger runs AFTER each line-level change, but only enforces when the JE status is 'posted'.
CREATE OR REPLACE FUNCTION check_je_balanced_on_post() RETURNS TRIGGER AS $$
DECLARE
  total_d NUMERIC;
  total_c NUMERIC;
BEGIN
  IF NEW.status = 'posted' THEN
    SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0) INTO total_d, total_c
      FROM je_lines WHERE je_id = NEW.id;
    IF total_d = 0 AND total_c = 0 THEN
      RAISE EXCEPTION 'Cannot post JE % with no lines', NEW.id;
    END IF;
    IF ABS(total_d - total_c) > 0.01 THEN
      RAISE EXCEPTION 'Cannot post JE %: not balanced debit=%, credit=%', NEW.id, total_d, total_c;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_je_balanced ON journal_entries;
CREATE TRIGGER trg_je_balanced
  BEFORE UPDATE OF status ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION check_je_balanced_on_post();

-- -------------------------------------------------------------------
-- 5. Balance view
-- -------------------------------------------------------------------
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id,
  a.code,
  a.name_he,
  a.account_type,
  a.code_6111,
  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.debit ELSE 0 END), 0)  AS total_debit,
  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.credit ELSE 0 END), 0) AS total_credit,
  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.debit - jl.credit ELSE 0 END), 0) AS balance_dr_minus_cr,
  CASE a.account_type
    WHEN 'asset'          THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.debit - jl.credit ELSE 0 END), 0)
    WHEN 'expense'        THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.debit - jl.credit ELSE 0 END), 0)
    WHEN 'contra_asset'   THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.credit - jl.debit ELSE 0 END), 0)
    WHEN 'liability'      THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.credit - jl.debit ELSE 0 END), 0)
    WHEN 'equity'         THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.credit - jl.debit ELSE 0 END), 0)
    WHEN 'revenue'        THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.credit - jl.debit ELSE 0 END), 0)
    WHEN 'contra_revenue' THEN  COALESCE(SUM(CASE WHEN je.status='posted' THEN jl.debit - jl.credit ELSE 0 END), 0)
    ELSE 0
  END AS balance_natural
FROM accounts a
LEFT JOIN je_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.je_id
GROUP BY a.id, a.code, a.name_he, a.account_type, a.code_6111;

-- -------------------------------------------------------------------
-- 6. Audit Log
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL PRIMARY KEY,
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by   TEXT DEFAULT '',
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values   JSONB,
  new_values   JSONB
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_audit" ON audit_log;
CREATE POLICY "allow_all_audit" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(changed_at DESC);

-- -------------------------------------------------------------------
-- 7. Fixed Assets + Depreciation
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description         TEXT NOT NULL DEFAULT '',
  category            TEXT NOT NULL DEFAULT 'equipment',
  acquisition_date    DATE NOT NULL,
  acquisition_cost    NUMERIC(14,2) NOT NULL DEFAULT 0,
  salvage_value       NUMERIC(14,2) NOT NULL DEFAULT 0,
  useful_life_months  INT NOT NULL DEFAULT 60,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line'
                         CHECK (depreciation_method IN ('straight_line','declining_balance')),
  account_asset_id    UUID REFERENCES accounts(id),
  account_accdep_id   UUID REFERENCES accounts(id),
  account_depexp_id   UUID REFERENCES accounts(id),
  last_depreciated    DATE,
  disposed_at         DATE,
  notes               TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_fa" ON fixed_assets;
CREATE POLICY "allow_all_fa" ON fixed_assets FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------
-- 8. Recurring Invoices + Reminders
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_data     JSONB NOT NULL,
  frequency         TEXT NOT NULL CHECK (frequency IN ('monthly','quarterly','yearly','weekly')),
  day_of_period     INT DEFAULT 1,
  next_due_date     DATE NOT NULL,
  last_generated    DATE,
  auto_send_email   BOOLEAN NOT NULL DEFAULT FALSE,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_ri" ON recurring_invoices;
CREATE POLICY "allow_all_ri" ON recurring_invoices FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS invoice_reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    TEXT NOT NULL,
  days_offset   INT NOT NULL,
  scheduled_for DATE NOT NULL,
  sent_at       TIMESTAMPTZ,
  sent_method   TEXT DEFAULT 'email',
  status        TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','sent','cancelled','failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_ir" ON invoice_reminders;
CREATE POLICY "allow_all_ir" ON invoice_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON invoice_reminders(scheduled_for, status);

-- -------------------------------------------------------------------
-- 9. Bank Reconciliation
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  bank          TEXT,
  branch        TEXT,
  account_num   TEXT,
  currency      TEXT NOT NULL DEFAULT 'ILS',
  gl_account_id UUID REFERENCES accounts(id),
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_ba" ON bank_accounts;
CREATE POLICY "allow_all_ba" ON bank_accounts FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES bank_accounts(id),
  txn_date        DATE NOT NULL,
  amount          NUMERIC(14,2) NOT NULL,
  balance_after   NUMERIC(14,2),
  description     TEXT NOT NULL DEFAULT '',
  merchant        TEXT DEFAULT '',
  reference       TEXT DEFAULT '',
  matched_je_id   UUID REFERENCES journal_entries(id),
  match_confidence NUMERIC(4,2),
  category        TEXT,
  status          TEXT NOT NULL DEFAULT 'unmatched'
                     CHECK (status IN ('unmatched','matched','ignored','pending_review')),
  raw_import      JSONB,
  imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_bt" ON bank_transactions;
CREATE POLICY "allow_all_bt" ON bank_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_bt_date ON bank_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_bt_status ON bank_transactions(status);

CREATE TABLE IF NOT EXISTS transaction_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern          TEXT NOT NULL,
  pattern_type     TEXT NOT NULL DEFAULT 'contains'
                      CHECK (pattern_type IN ('contains','starts_with','regex','exact')),
  account_id       UUID REFERENCES accounts(id),
  confidence       NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  auto_post        BOOLEAN NOT NULL DEFAULT FALSE,
  created_from     TEXT DEFAULT 'manual',
  usage_count      INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE transaction_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_tr" ON transaction_rules;
CREATE POLICY "allow_all_tr" ON transaction_rules FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------
-- 10. Budgets
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year     INT NOT NULL,
  month           INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  account_id      UUID NOT NULL REFERENCES accounts(id),
  project_id      TEXT,
  budgeted_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes           TEXT DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fiscal_year, month, account_id, project_id)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_bg" ON budgets;
CREATE POLICY "allow_all_bg" ON budgets FOR ALL USING (true) WITH CHECK (true);

-- -------------------------------------------------------------------
-- 11. VAT rate history (for 17%→18% transitions)
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vat_rates (
  id            SERIAL PRIMARY KEY,
  effective_from DATE NOT NULL,
  rate          NUMERIC(5,4) NOT NULL,
  notes         TEXT DEFAULT ''
);
ALTER TABLE vat_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_vr" ON vat_rates;
CREATE POLICY "allow_all_vr" ON vat_rates FOR ALL USING (true) WITH CHECK (true);

INSERT INTO vat_rates (effective_from, rate, notes) VALUES
  ('2010-01-01', 0.16,   '16% from 2010'),
  ('2012-09-01', 0.17,   '17% from Sept 2012'),
  ('2013-06-02', 0.18,   '18% from June 2013'),
  ('2015-10-01', 0.17,   '17% from Oct 2015'),
  ('2025-01-01', 0.18,   '18% from Jan 2025')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------
-- 12. Extend existing tables
-- -------------------------------------------------------------------
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS allocation_number TEXT,
  ADD COLUMN IF NOT EXISTS client_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TEXT,
  ADD COLUMN IF NOT EXISTS je_id UUID REFERENCES journal_entries(id);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS supplier_tax_id TEXT,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS je_id UUID REFERENCES journal_entries(id),
  ADD COLUMN IF NOT EXISTS payment_je_id UUID REFERENCES journal_entries(id);

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
