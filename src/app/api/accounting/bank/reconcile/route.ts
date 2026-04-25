import { NextRequest, NextResponse } from 'next/server'
import { supaAdmin, createJournalEntry, mapExpenseToAccount } from '@/lib/accounting'

export const dynamic = 'force-dynamic'

/**
 * Reconcile bank transactions — auto-match against existing invoices/expenses,
 * apply rules, and book JE for unmatched.
 * POST /api/accounting/bank/reconcile  { account_id, auto_book_unmatched: boolean }
 */
export async function POST(req: NextRequest) {
  const supa = supaAdmin()
  const body = await req.json()
  const accountId = body.account_id
  const autoBook = body.auto_book_unmatched !== false

  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const { data: bankAcct } = await supa.from('bank_accounts').select('*').eq('id', accountId).single()
  if (!bankAcct) return NextResponse.json({ error: 'bank account not found' }, { status: 404 })
  const gl = bankAcct.account_code || '1010'

  const { data: txs } = await supa
    .from('bank_transactions')
    .select('*')
    .eq('bank_account_id', accountId)
    .eq('match_status', 'unmatched')
  if (!txs || txs.length === 0) return NextResponse.json({ matched: 0, booked: 0, unmatched: 0 })

  // Preload rules
  const { data: rules } = await supa.from('transaction_rules').select('*').eq('is_active', true).order('priority', { ascending: false })

  // Preload open invoices + open expenses for matching
  const { data: openInvs } = await supa
    .from('invoices')
    .select('id, invoice_num, client, total, paid, date, tax_withheld')
    .order('date', { ascending: false })
    .limit(1000)
  const { data: openExps } = await supa
    .from('expenses')
    .select('id, supplier, total, paid, month, description')
    .order('month', { ascending: false })
    .limit(1000)

  let matched = 0, booked = 0, unmatched = 0

  for (const tx of txs) {
    const amt = Number(tx.amount) || 0
    const desc = String(tx.description || '')

    // 1. Try to match to an existing invoice (positive amount)
    if (amt > 0) {
      const candidate = (openInvs || []).find(i => {
        const open = (Number(i.total) || 0) - (Number(i.paid) || 0)
        if (open < 0.01) return false
        const amtMatches = Math.abs(open - amt) < 0.02 || Math.abs((open - Number(i.tax_withheld || 0)) - amt) < 0.02
        const nameMatches = desc.includes(String(i.client).slice(0, 10)) || desc.includes(String(i.invoice_num))
        return amtMatches && (nameMatches || true)
      })
      if (candidate) {
        const wht = Math.max(0, (Number(candidate.total) || 0) - (Number(candidate.paid) || 0) - amt)
        await supa.from('invoices').update({
          paid: (Number(candidate.paid) || 0) + amt,
          tax_withheld: (Number(candidate.tax_withheld) || 0) + wht,
          payment_date: tx.date,
        }).eq('id', candidate.id)
        await supa.from('bank_transactions').update({
          match_status: 'matched_invoice',
          matched_source_type: 'invoice',
          matched_source_id: String(candidate.id),
        }).eq('id', tx.id)
        matched++
        continue
      }
    }

    // 2. Try to match to an existing expense (negative amount)
    if (amt < 0) {
      const absAmt = Math.abs(amt)
      const candidate = (openExps || []).find(e => {
        const open = (Number(e.total) || 0) - (Number(e.paid) || 0)
        return open > 0.01 && Math.abs(open - absAmt) < 0.02 && desc.toLowerCase().includes(String(e.supplier).toLowerCase().slice(0, 8))
      })
      if (candidate) {
        await supa.from('expenses').update({
          paid: (Number(candidate.paid) || 0) + absAmt,
          payment_date: tx.date,
        }).eq('id', candidate.id)
        await supa.from('bank_transactions').update({
          match_status: 'matched_expense',
          matched_source_type: 'expense',
          matched_source_id: String(candidate.id),
        }).eq('id', tx.id)
        matched++
        continue
      }
    }

    // 3. Apply rules
    type Rule = { pattern: string; rule_type?: string; account_code?: string; description?: string; match_type?: string; name?: string }
    const rule = (rules as Rule[] | null || []).find(r =>
      new RegExp(r.pattern, 'i').test(desc)
    )
    if (rule && autoBook) {
      const glAccount = rule.account_code || (amt < 0 ? mapExpenseToAccount(desc) : '4000')
      try {
        const jeId = await createJournalEntry({
          entry_date: tx.date,
          description: `${rule.name || rule.pattern}: ${desc}`,
          source_type: 'bank',
          source_id: String(tx.id),
          reference: tx.reference || null,
          lines: amt >= 0
            ? [
                { account_code: gl,        debit:  amt, memo: desc },
                { account_code: glAccount, credit: amt, memo: rule.description || desc },
              ]
            : [
                { account_code: glAccount, debit:  -amt, memo: rule.description || desc },
                { account_code: gl,        credit: -amt, memo: desc },
              ],
        })
        await supa.from('bank_transactions').update({
          match_status: 'booked',
          matched_source_type: 'bank',
          matched_source_id: String(tx.id),
          je_id: jeId,
        }).eq('id', tx.id)
        booked++
        continue
      } catch { /* fall through to unmatched */ }
    }

    unmatched++
  }

  return NextResponse.json({
    account_id: accountId,
    total: txs.length,
    matched, booked, unmatched,
  })
}
