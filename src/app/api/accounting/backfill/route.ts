import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin, bookInvoiceIssued, bookInvoicePayment, bookExpenseIncurred, bookExpensePayment, unbookBySource } from '@/lib/accounting'

/**
 * Backfill: build JE history from existing invoices + expenses that have no je_id yet.
 * POST /api/accounting/backfill { scope?: 'invoices' | 'expenses' | 'all', dry_run?: boolean, force?: boolean }
 *   - force=true → unbook existing JE rows first (use carefully)
 */
export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await (async () => { try { return await req.json() } catch { return {} } })()
  const scope: 'invoices' | 'expenses' | 'all' = body.scope || 'all'
  const dryRun = !!body.dry_run
  const force  = !!body.force

  const report = { invoices: { total: 0, booked: 0, paid_booked: 0, errors: [] as string[] }, expenses: { total: 0, booked: 0, paid_booked: 0, errors: [] as string[] } }

  if (scope === 'invoices' || scope === 'all') {
    const { data: invs } = await supa.from('invoices').select('*').order('id')
    for (const inv of invs || []) {
      report.invoices.total++
      try {
        if (force) {
          await unbookBySource('invoice', String(inv.id))
          await unbookBySource('invoice_payment', String(inv.id))
        }
        if (!inv.je_id) {
          if (!dryRun) {
            const jeId = await bookInvoiceIssued({
              id: inv.id,
              date: inv.date,
              client: inv.client,
              client_tax_id: inv.client_tax_id,
              before_vat: Number(inv.before_vat) || 0,
              total: Number(inv.total) || 0,
              invoice_num: String(inv.invoice_num),
              project_id: inv.project_id,
            })
            await supa.from('invoices').update({ je_id: jeId }).eq('id', inv.id)
          }
          report.invoices.booked++
        }
        const paid = Number(inv.paid) || 0
        const wht  = Number(inv.tax_withheld) || 0
        if (paid > 0.01 || wht > 0.01) {
          if (!dryRun) {
            await bookInvoicePayment({
              id: inv.id,
              total: Number(inv.total) || 0,
              paid,
              tax_withheld: wht,
              payment_date: inv.payment_date || inv.date,
              client: inv.client,
              invoice_num: String(inv.invoice_num),
              project_id: inv.project_id,
            })
          }
          report.invoices.paid_booked++
        }
      } catch (e) {
        report.invoices.errors.push(`#${inv.id}: ${(e as Error).message}`)
      }
    }
  }

  if (scope === 'expenses' || scope === 'all') {
    const { data: exps } = await supa.from('expenses').select('*').order('id')
    for (const e of exps || []) {
      report.expenses.total++
      try {
        if (force) {
          await unbookBySource('expense', String(e.id))
          await unbookBySource('expense_payment', String(e.id))
        }
        if (!e.je_id) {
          if (!dryRun) {
            const jeId = await bookExpenseIncurred({
              id: e.id,
              supplier: e.supplier,
              description: e.description || '',
              amount: Number(e.amount) || 0,
              vat: Number(e.vat) || 0,
              total: Number(e.total) || 0,
              month: e.month,
              project_id: e.project_id,
              account_code: e.account_code,
            })
            await supa.from('expenses').update({ je_id: jeId }).eq('id', e.id)
          }
          report.expenses.booked++
        }
        const paid = Number(e.paid) || 0
        if (paid > 0.01) {
          if (!dryRun) {
            await bookExpensePayment({
              id: e.id,
              supplier: e.supplier,
              paid,
              payment_date: e.payment_date || (e.month ? `${e.month}-15` : undefined),
              description: e.description || '',
            })
          }
          report.expenses.paid_booked++
        }
      } catch (err) {
        report.expenses.errors.push(`#${e.id}: ${(err as Error).message}`)
      }
    }
  }

  return NextResponse.json({ dry_run: dryRun, force, report })
}

export async function GET(req: NextRequest) {
  // Read-only preview (dry-run)
  const url = new URL(req.url)
  url.searchParams.set('dry_run', '1')
  return POST(new Request(url, { method: 'POST', body: JSON.stringify({ dry_run: true }) }) as NextRequest)
}
