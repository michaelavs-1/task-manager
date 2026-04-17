-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS invoices (
  id          BIGSERIAL PRIMARY KEY,
  issued_by   TEXT NOT NULL DEFAULT '',
  sent_to     TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL DEFAULT '',
  doc_type    TEXT NOT NULL DEFAULT '',
  invoice_num TEXT NOT NULL DEFAULT '',
  client      TEXT NOT NULL DEFAULT '',
  before_vat  NUMERIC NOT NULL DEFAULT 0,
  total       NUMERIC NOT NULL DEFAULT 0,
  paid        NUMERIC NOT NULL DEFAULT 0,
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow full access (internal app — no auth restriction)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON invoices FOR ALL USING (true) WITH CHECK (true);
