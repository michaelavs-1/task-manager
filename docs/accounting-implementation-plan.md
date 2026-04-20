# תוכנית יישום — הנהלת חשבונות כפולה במערכת הקיימת

**תאריך:** 20 באפריל 2026
**מבוסס על:** `accounting-research.md`
**עקרון מנחה:** הוספת שכבת General Ledger "מתחת" ל-UI הקיים, בלי לשבור פיצ'רים קיימים. כל חשבונית/הוצאה שנוצרת כיום — תמשיך לעבוד, אבל ברקע תייצר אוטומטית פקודת יומן דו-צדדית.

---

## סקירה כוללת — 6 שלבים (MVP ← מלא)

| שלב | מוקד | זמן משוער | תלות |
|---|---|---|---|
| **1** | בסיס GL — CoA + Journal Entries + Auto-JE | 2–3 שבועות | — |
| **2** | מאזן בוחן + דוחות כספיים | 1 שבוע | 1 |
| **3** | דיווחי רשות המסים — 874 / PCN874 / 856 | 2 שבועות | 1–2 |
| **4** | אוטומציה — בנק, OCR, חשבוניות חוזרות, SHAAM | 3 שבועות | 1 |
| **5** | רכוש קבוע + פחת + שכר בסיסי | 1–2 שבועות | 1 |
| **6** | דשבורדים מתקדמים + תחזיות + תקציב | 2 שבועות | 2 |

**סה"כ:** ~3 חודשי עבודה חלקית ליישום מלא. MVP (שלבים 1–3) בחודש וחצי.

---

## שלב 1 — בסיס GL (קריטי)

### 1.1 סכמת DB חדשה

```sql
-- תרשים חשבונות
CREATE TABLE accounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(10) UNIQUE NOT NULL,   -- למשל '1010', '4000'
  name_he       TEXT NOT NULL,
  account_type  TEXT NOT NULL CHECK (account_type IN
                 ('asset','liability','equity','revenue','expense','contra_asset')),
  parent_id     UUID REFERENCES accounts(id),  -- היררכיה
  code_6111     VARCHAR(10),                   -- מיפוי לטופס 6111
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- פקודת יומן
CREATE TABLE journal_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date    DATE NOT NULL,
  description   TEXT NOT NULL,
  source_type   TEXT NOT NULL,                 -- 'invoice','expense','payment','payroll','manual','closing'
  source_id     TEXT,                          -- reference back to invoices.id / expenses.id
  status        TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft','posted','reversed')),
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  posted_at     TIMESTAMPTZ
);

-- שורות JE (חובה דו-צדדי: sum(debit) = sum(credit))
CREATE TABLE je_lines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  je_id         UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id    UUID NOT NULL REFERENCES accounts(id),
  debit         NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit        NUMERIC(14,2) NOT NULL DEFAULT 0,
  memo          TEXT,
  project_id    UUID,   -- רב-מימדיות
  artist_id     UUID,
  cost_center   TEXT,
  line_order    INT NOT NULL DEFAULT 0,
  CONSTRAINT either_debit_or_credit CHECK (
    (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
  )
);

CREATE INDEX idx_je_lines_account ON je_lines(account_id);
CREATE INDEX idx_je_lines_je ON je_lines(je_id);
CREATE INDEX idx_je_entry_date ON journal_entries(entry_date);

-- ווידוא balanced entries (trigger)
CREATE OR REPLACE FUNCTION check_je_balanced() RETURNS TRIGGER AS $$
DECLARE
  total_debit  NUMERIC;
  total_credit NUMERIC;
BEGIN
  SELECT SUM(debit), SUM(credit) INTO total_debit, total_credit
  FROM je_lines WHERE je_id = NEW.je_id;
  IF ABS(COALESCE(total_debit,0) - COALESCE(total_credit,0)) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry not balanced: debit=%, credit=%', total_debit, total_credit;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- יתרות מצטברות לכל חשבון (view משוחזר או materialized)
CREATE VIEW account_balances AS
SELECT
  a.id,
  a.code,
  a.name_he,
  a.account_type,
  COALESCE(SUM(jl.debit - jl.credit), 0) AS balance_debit_minus_credit,
  CASE a.account_type
    WHEN 'asset' THEN COALESCE(SUM(jl.debit - jl.credit), 0)
    WHEN 'expense' THEN COALESCE(SUM(jl.debit - jl.credit), 0)
    ELSE COALESCE(SUM(jl.credit - jl.debit), 0)
  END AS balance_natural_side
FROM accounts a
LEFT JOIN je_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.je_id AND je.status = 'posted'
GROUP BY a.id, a.code, a.name_he, a.account_type;
```

### 1.2 Seed — תרשים חשבונות ברירת מחדל (ישראלי, מבוסס 6111)

טבלה ראשונית עם ~40 חשבונות:

```
1010  בנק — חשבון עו"ש                     (asset)
1020  קופה קטנה                             (asset)
1150  חייבים — לקוחות                       (asset)
1200  מלאי                                  (asset)
1400  רכוש קבוע — ציוד                      (asset)
1750  פחת נצבר — ציוד                       (contra_asset)
2000  זכאים — ספקים                         (liability)
2310  מע"מ עסקאות (לתשלום)                  (liability)
2320  מע"מ תשומות (לקיזוז)                  (asset)
2410  מס הכנסה לתשלום                       (liability)
2460  ביטוח לאומי — עובד (לתשלום)           (liability)
2550  מס מקור שנוכה לנו (לקיזוז שנתי)        (asset)
2560  מס מקור שנכנו לספקים (לתשלום)         (liability)
3000  הון מניות                             (equity)
3110  עודפים                                (equity)
3210  סיכום רווח והפסד (זמני)               (equity)
4000  הכנסות משירותים                       (revenue)
4100  הכנסות מכירות — חייבות                (revenue)
4200  הכנסות — פטורות                       (revenue)
5000  עלויות ישירות                         (expense)
6000  שכר עבודה                             (expense)
6100  ביטוח לאומי — מעסיק                   (expense)
6110  פנסיה — מעסיק                         (expense)
6200  שכר דירה                              (expense)
6300  שירותים מקצועיים (רו"ח, עו"ד)         (expense)
6400  משרדיות                               (expense)
6500  פרסום ושיווק                          (expense)
6600  נסיעות                                (expense)
6700  אינטרנט ותקשורת                       (expense)
6900  הוצאות פחת                            (expense)
7000  ריבית ועמלות בנק                      (expense)
7100  הפרשי שער                             (expense)
```

כל חשבון עם `code_6111` מתאים כדי לייצא בקלות לדו"ח השנתי.

### 1.3 Auto-JE triggers — החלק החשוב

**כשיוצרים חשבונית ב-UI הקיים** (`POST /api/invoices`):
```typescript
// after successful insert into invoices table:
await createJournalEntry({
  entry_date: invoice.date,
  description: `חשבונית ${invoice.invoice_num} — ${invoice.client}`,
  source_type: 'invoice',
  source_id: invoice.id,
  lines: [
    { account_code: '1150', debit: invoice.total, memo: invoice.client },
    { account_code: '4000', credit: invoice.before_vat },
    { account_code: '2310', credit: invoice.total - invoice.before_vat }
  ]
})
```

**כשמסמנים חשבונית כשולמה** (ה-UX שהוספנו אתמול):
```typescript
// paid = total - tax_withheld
await createJournalEntry({
  entry_date: paymentDate,
  description: `תקבול חשבונית ${invoice.invoice_num}`,
  source_type: 'payment',
  source_id: invoice.id,
  lines: [
    { account_code: '1010', debit: paid },                         // בנק
    ...(tax_withheld > 0 ? [
      { account_code: '2550', debit: tax_withheld }                // מס מקור שנוכה לנו
    ] : []),
    { account_code: '1150', credit: invoice.total }                // סגירת חוב הלקוח
  ]
})
```

**כשיוצרים הוצאה** (`POST /api/expenses`):
```typescript
const vatAmount = expense.total - expense.amount
const glAccount = mapExpenseCategoryToAccount(expense.description)  // 6200/6400/6500/...
await createJournalEntry({
  entry_date: expense.payment_date || today,
  description: `הוצאה — ${expense.supplier} — ${expense.description}`,
  source_type: 'expense',
  source_id: expense.id,
  lines: [
    { account_code: glAccount,  debit: expense.amount },
    { account_code: '2320',     debit: vatAmount },                // מע"מ תשומות
    { account_code: '2000',     credit: expense.total }            // ספקים
  ]
})
```

**כשמסמנים הוצאה כשולמה:**
```typescript
await createJournalEntry({
  entry_date: paymentDate,
  lines: [
    { account_code: '2000', debit: paid },    // סגירת חוב הספק
    { account_code: '1010', credit: paid }    // ירידה בבנק
  ]
})
```

### 1.4 UI חדש — מסך "פקודות יומן"

טאב חדש ב-Sidebar שמציג:
- רשימת כל ה-JEs (עם פילטר לפי תאריך, חשבון, source)
- לכל JE: date, description, source, סך חיוב/זיכוי, סטטוס
- drill-down: שורות חובה/זכות עם לינק חזרה לחשבונית/הוצאה המקורית
- כפתור "הוסף פקודה ידנית" (למקרים של התאמות, סגירה, וכו')

### 1.5 מיגרציית נתונים היסטוריים

אחרי deployment של הסכמה, לרוץ סקריפט חד-פעמי:
```
node scripts/backfill-journal-entries.js
```
שעובר על כל ה-invoices וה-expenses הקיימים ויוצר להם JEs. מאפשר להתחיל מהיום הראשון של הפעילות בצורה מלאה.

---

## שלב 2 — דוחות כספיים

### 2.1 מאזן בוחן (Trial Balance)

View חדש בשוליים: טבלה שמציגה את כל החשבונות עם יתרת חובה/זכות בתאריך נתון. כפתור "סגרי תקופה":

```sql
SELECT
  a.code,
  a.name_he,
  SUM(jl.debit)  FILTER (WHERE je.entry_date <= :as_of) AS total_debit,
  SUM(jl.credit) FILTER (WHERE je.entry_date <= :as_of) AS total_credit,
  SUM(jl.debit - jl.credit) FILTER (WHERE je.entry_date <= :as_of) AS net
FROM accounts a
LEFT JOIN je_lines jl ON jl.account_id = a.id
LEFT JOIN journal_entries je ON je.id = jl.je_id AND je.status = 'posted'
GROUP BY a.code, a.name_he
ORDER BY a.code;
```

### 2.2 דו"ח רווח והפסד

Aggregation של כל `revenue` minus כל `expense` בתקופה נתונה, מקובץ לפי קטגוריה.

### 2.3 מאזן

Snapshot של כל `asset + liability + equity` בתאריך נתון, לפי היררכיה.

### 2.4 תזרים מזומנים (Cash Flow Statement)

נגזר מתנועות ב-`1010` + `1020` בטווח תאריכים, מסווג לפי source_type (פעילות שוטפת / השקעה / מימון).

### 2.5 ייצוא לאקסל

כל דו"ח יקבל כפתור "ייצוא XLSX". שימוש ב-skill `xlsx` הקיים.

---

## שלב 3 — דיווחי רשות המסים

### 3.1 דיווח מע"מ תקופתי (874)

UI: "הפק דיווח מע"מ" → בחירת חודש/חודשיים:
- **עסקאות חייבות:** סך זיכויים ב-4100 בתקופה
- **עסקאות פטורות:** סך זיכויים ב-4200
- **מס עסקאות:** סך זיכויים ב-2310
- **מס תשומות ציוד:** סך חיובים ב-2320 שמקורם ברכישת רכוש קבוע
- **מס תשומות אחרות:** סך חיובים ב-2320 שאינם ציוד
- **לתשלום/להחזר:** מס עסקאות − מס תשומות

פלט: PDF + העתקת סכומים ישירה לטופס המקוון.

### 3.2 PCN874 export

פונקציה שמייצרת קובץ fixed-width לפי המפרט הרשמי. כל חשבונית שהוצאה ב-תקופה → רשומת B, כל חשבונית שהתקבלה → רשומת C.

מבנה רשומה (דוגמה, מפרט מלא בגוף הפונקציה):
```
A|[DEALER_ID]|[PERIOD]|[VERSION]|...
B|[INV_NUM]|[DATE]|[CLIENT_TAXID]|[BEFORE_VAT]|[VAT]|[TOTAL]|...
C|[SUPPLIER_INV]|[DATE]|[SUPPLIER_TAXID]|[BEFORE_VAT]|[VAT]|...
D|[SUMMARY_LINES]
```

### 3.3 ניכוי מס שנתי (856)

UI: "הפק דו"ח 856 לשנת [YYYY]" → לכל ספק שהיה לו תשלום עם `tax_withheld > 0`:
- שם הספק, ח.פ./ת.ז.
- סך ברוטו, סך ניכוי, סך נטו
- אחוז ניכוי
- ייצוא Excel בפורמט שמתאים להעלאה לשער המסים

### 3.4 קובץ אחיד BKMV

Export של כל ה-journal_entries + accounts + יתרות בפורמט BKMV.ZIP. שימושי למסירה לרו"ח פעם בשנה.

### 3.5 טופס 6111 (דוחות כספיים שנתיים)

Aggregation של כל החשבונות לפי `code_6111` שלהם, והפקת PDF במבנה של הטופס הרשמי. זה השלב הסופי שמאפשר להעביר לרו"ח דו"ח מוכן.

---

## שלב 4 — אוטומציה

### 4.1 אינטגרציית SHAAM (חשבוניות ישראל) — קריטי עד יוני 2026

```typescript
// לפני שמירת חשבונית:
if (invoice.total >= SHAAM_THRESHOLD) {
  const allocation = await requestSHAAMAllocationNumber({
    dealer_id:    MY_VAT_NUMBER,
    client_taxid: invoice.client_tax_id,
    amount:       invoice.total,
    vat:          invoice.total - invoice.before_vat,
    invoice_date: invoice.date
  })
  invoice.allocation_number = allocation.number
}
```
שדה חדש ב-`invoices.allocation_number`. יודפס בחשבונית המקורית.

### 4.2 קליטת דפי בנק (Bank Feed)

- Upload PDF/CSV של דף בנק → parsing (Tesseract/regex לפי בנק ישראלי)
- טבלת `bank_transactions` חדשה עם fields: date, amount, description, merchant, matched_je_id, category, confidence
- טבלת `transaction_rules` — merchant_pattern → account_code + confidence
- UI התאמה: לכל תנועה בבנק שאינה מותאמת — המערכת מציעה התאמה, המשתמש מאשר → יוצרת JE אוטומטית
- Threshold >90% = אוטו-פוסט; 50–90% = pending approval; <50% = manual

### 4.3 OCR לקבלות

שימוש ב-Google Vision API:
- העלאת תמונת קבלה → extract: סכום, מע"מ, ספק, תאריך
- יצירת `expense` טיוטה עם השדות → המשתמש מאשר
- `receipt_ocr_results` טבלה עם JSONB של raw output + human corrections (לשימור feedback loop)

### 4.4 חשבוניות חוזרות

```sql
CREATE TABLE recurring_invoices (
  id                UUID PRIMARY KEY,
  template_data     JSONB NOT NULL,      -- client, items, amounts
  frequency         TEXT NOT NULL,        -- 'monthly','quarterly','yearly'
  next_due_date     DATE NOT NULL,
  auto_send         BOOLEAN DEFAULT TRUE,
  enabled           BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ
);
```

`pg_cron` (או Vercel Cron) יומי שרץ ומחפש `WHERE next_due_date = today AND enabled`. יוצר invoice חדש → שולח אימייל → מעדכן `next_due_date`.

### 4.5 תזכורות חכמות

```sql
CREATE TABLE invoice_reminders (
  id            UUID PRIMARY KEY,
  invoice_id    TEXT NOT NULL,
  days_offset   INT NOT NULL,   -- -3, 0, +7
  sent_at       TIMESTAMPTZ,
  sent_method   TEXT            -- 'email','whatsapp'
);
```

Cron יומי שולח תזכורות (3 ימים לפני, ביום, 7 אחרי) לחשבוניות פתוחות.

---

## שלב 5 — רכוש קבוע + פחת + שכר

### 5.1 רכוש קבוע

```sql
CREATE TABLE fixed_assets (
  id                  UUID PRIMARY KEY,
  description         TEXT,
  category            TEXT,              -- 'equipment','vehicle','computer','furniture'
  acquisition_date    DATE,
  acquisition_cost    NUMERIC,
  salvage_value       NUMERIC DEFAULT 0,
  useful_life_years   NUMERIC,
  depreciation_method TEXT DEFAULT 'straight_line',  -- or 'declining_balance'
  account_id_asset    UUID REFERENCES accounts(id),
  account_id_accdep   UUID REFERENCES accounts(id),
  disposed_at         DATE,
  notes               TEXT
);
```

Cron חודשי (`run_monthly_depreciation`):
- לכל רכוש פעיל: חישוב פחת חודשי = (cost − salvage) / (life × 12)
- יצירת JE: Dr. 6900 Depreciation / Cr. 1750 Accumulated Depreciation
- לכל נכס בנפרד כדי לאפשר דו"ח פחת מפורט

### 5.2 שכר (אופציונלי)

טבלת `employees` + טבלת `payroll_runs`. חודשי:
- לכל עובד: ברוטו, ניכויים (מ"ה, בל"ל, פנסיה, בריאות), נטו
- JE אוטומטית (כפי שבמחקר)
- ייצוא דיווח 102 חודשי
- שנתי: טופס 126

---

## שלב 6 — דשבורדים, תחזיות, תקציב

### 6.1 KPI cache

```sql
CREATE MATERIALIZED VIEW dashboard_kpis AS
SELECT
  'cash_balance'        AS metric, (SELECT balance_natural_side FROM account_balances WHERE code='1010') AS value
UNION ALL SELECT 'ar_total',        (SELECT balance_natural_side FROM account_balances WHERE code='1150')
UNION ALL SELECT 'ap_total',        (SELECT balance_natural_side FROM account_balances WHERE code='2000')
UNION ALL SELECT 'ytd_revenue',     (SELECT -SUM(balance_natural_side) FROM account_balances WHERE account_type='revenue')
UNION ALL SELECT 'ytd_expense',     (SELECT  SUM(balance_natural_side) FROM account_balances WHERE account_type='expense')
UNION ALL SELECT 'vat_payable',     (SELECT  balance_natural_side FROM account_balances WHERE code='2310')
UNION ALL SELECT 'vat_receivable',  (SELECT -balance_natural_side FROM account_balances WHERE code='2320')
UNION ALL SELECT 'withheld_receivable', (SELECT balance_natural_side FROM account_balances WHERE code='2550');

-- Refresh hourly via pg_cron
```

UI: כרטיסי KPI בדשבורד הראשי, drill-down ל-trial balance → JE → מסמך מקורי.

### 6.2 תחזית תזרים 12 חודשים

Edge Function בפייתון (או js):
- משוך 24 חודשים אחורה של תזרים נטו (מחשבון 1010)
- Fit מודל Prophet/SARIMAX
- Forecast 12 חודשים קדימה
- שלושה תרחישים: אופטימי (×1.2), בסיס, פסימי (×0.8)
- טבלת `forecast_scenarios` לשמירת גרסאות

גרף: קו היסטוריה + אזור תחזית (3 bands).

### 6.3 תקציב מול ביצוע

```sql
CREATE TABLE budgets (
  id              UUID PRIMARY KEY,
  fiscal_year     INT,
  month           INT,
  account_id      UUID REFERENCES accounts(id),
  project_id      UUID,
  budgeted_amount NUMERIC
);

CREATE VIEW budget_vs_actual AS
SELECT
  b.fiscal_year, b.month, b.account_id, b.project_id,
  b.budgeted_amount,
  COALESCE(SUM(CASE WHEN a.account_type='expense' THEN jl.debit - jl.credit
                    WHEN a.account_type='revenue' THEN jl.credit - jl.debit END), 0) AS actual_amount,
  (actual_amount - b.budgeted_amount) / NULLIF(b.budgeted_amount,0) * 100 AS variance_pct
FROM budgets b
LEFT JOIN accounts a ON a.id = b.account_id
LEFT JOIN je_lines jl ON jl.account_id = b.account_id AND jl.project_id IS NOT DISTINCT FROM b.project_id
LEFT JOIN journal_entries je ON je.id = jl.je_id
  AND EXTRACT(YEAR FROM je.entry_date) = b.fiscal_year
  AND EXTRACT(MONTH FROM je.entry_date) = b.month
GROUP BY b.fiscal_year, b.month, b.account_id, b.project_id, b.budgeted_amount;
```

UI: טבלה עם variance highlight (ירוק ≤±5%, כתום ±5-15%, אדום >15%). התראות במייל אם variance_pct > threshold.

### 6.4 Audit Log

```sql
CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  table_name   TEXT NOT NULL,
  record_id    TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  changed_by   TEXT,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values   JSONB,
  new_values   JSONB
);

-- Trigger על כל טבלה עסקית
CREATE OR REPLACE FUNCTION log_changes() RETURNS TRIGGER AS $$ ...
```

Immutable — never UPDATE/DELETE. שומר על כל שינוי היסטורי.

---

## תלויות טכניות (packages)

- `pg_cron` (Supabase extension) — לתזמון jobs
- `@supabase/supabase-js` — כבר מותקן
- `uuid` — כבר
- `date-fns-tz` — timezone handling
- `xlsx` / `exceljs` — ליצירת קבצי Excel לדיווחים
- `@google-cloud/vision` — OCR
- `prophet` / `statsmodels` — ב-Python Edge Function לתחזית
- ספרייה לקריאה ל-SHAAM API (קריאה ישירה אל `secureapi.taxes.gov.il` ב-HTTPS)

---

## סדר עדיפות מוצע לביצוע

1. **שבוע 1:** migrate CoA + Journal Entries schema + backfill existing data → אתחול שכבת ה-GL.
2. **שבוע 2:** Auto-JE triggers על invoice/expense/payment → כל פעולה מייצרת JE אוטומטית.
3. **שבוע 3:** מסך JEs + מאזן בוחן + דוחות בסיסיים (P&L + מאזן).
4. **שבועות 4-5:** דיווחי מע"מ (874) + PCN874 + יצוא 856 → ציות מלא לרגולטור.
5. **שבוע 6:** אינטגרציית SHAAM לחשבוניות.
6. **שבועות 7-9:** אוטומציה (בנק, OCR, חוזרות, תזכורות).
7. **שבועות 10-11:** רכוש קבוע + פחת (אם רלוונטי).
8. **שבועות 12-13:** דשבורד KPI + תחזית + תקציב.

---

## סיכונים ונקודות לשים לב

- **Auto-JE triggers** חייבים להיות atomic — אם יצירת ה-JE נכשלת, גם החשבונית חייבת להיכשל. שימוש ב-transactions של Supabase.
- **Backfill היסטורי** עלול לקחת זמן אם יש אלפי רשומות. לבצע בbatches של 500.
- **SHAAM API** דורש הרשמה מראש ו-certificate. צריך להתחיל את התהליך מוקדם.
- **מע"מ 18%** נכנס לתוקף 1.1.2025 (היה 17% ב-2024). לוודא שה-logic תומך בשיעור תקופתי (VAT rate history table).
- **קוד החשבון מול 6111** מומלץ למפות מראש, אחרת הפקת 6111 בסוף השנה תהיה כואבת.
- **תקנה 36א** מחייבת שהתוכנה תשמור לוגים שלא ניתן לערוך. ה-`audit_log` משלב הרובד 6 — אבל רצוי להקדים ב-MVP כדי להיות קבילים.

---

## מה להתחיל מיד

הצעה: לאשר שלבים 1+2 כ-MVP ("הנה"ח דו-צדדית עם מאזן בוחן") לפני שעוברים לאוטומציה. זה נותן ללקוח (אתה) ולרו"ח שלך משהו מוחשי לעבוד איתו — והמערכת תקבל שדרה חשבונאית אמיתית.

אם מאשרים — אני מתחיל ב:
1. כתיבת קובץ SQL migration לטבלאות החדשות
2. seed של תרשים החשבונות
3. הוספת ה-Auto-JE helpers ל-API routes של invoices/expenses/payments
4. UI למסך "פקודות יומן" + "מאזן בוחן"

(החלטות בהמשך: האם להקים vista נפרדת "הנה"ח" או לשלב ב-FinancialView הקיים; אסטרטגיית authorization — האם רק המשתמש הבעלים יכול לעדכן JEs, או גם רו"ח חיצוני.)
