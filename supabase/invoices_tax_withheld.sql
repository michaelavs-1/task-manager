-- Run this in Supabase Dashboard → SQL Editor to add the tax-withheld-at-source column
-- Represents money deducted before payment arrived (e.g. 5% ניכוי מס במקור)

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS tax_withheld NUMERIC NOT NULL DEFAULT 0;
