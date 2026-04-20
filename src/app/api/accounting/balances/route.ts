import { NextResponse } from 'next/server'
import { supaAdmin } from '@/lib/accounting'

export async function GET() {
  const supa = supaAdmin()
  const { data, error } = await supa
    .from('account_balances')
    .select('code, name_he, account_type, balance_natural, total_debit, total_credit')
    .order('code', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const balances: { code: string; name_he: string; account_type: string; balance_natural: number; total_debit: number; total_credit: number }[] = data || []

  // Helper: sum balance_natural for matching accounts
  const sumType  = (type: string) => balances.filter(b => b.account_type === type).reduce((s, b) => s + (b.balance_natural || 0), 0)
  const sumCode  = (prefix: string) => balances.filter(b => b.code.startsWith(prefix)).reduce((s, b) => s + (b.balance_natural || 0), 0)
  const oneCode  = (code: string) => balances.find(b => b.code === code)?.balance_natural ?? 0

  const revenue          = sumType('revenue')
  const costOfRevenue    = sumCode('5')     // 5xxx — עלות המכר
  const opExpenses       = balances.filter(b => b.account_type === 'expense' && b.code.startsWith('6')).reduce((s, b) => s + (b.balance_natural || 0), 0)
  const totalExpenses    = costOfRevenue + opExpenses
  const grossProfit      = revenue - costOfRevenue
  const netProfit        = revenue - totalExpenses

  const bank             = oneCode('1010')
  const receivables      = oneCode('1150')  // חייבים לקוחות
  const payables         = oneCode('2000')  // זכאים ספקים
  const vatOutput        = oneCode('2310')  // מע"מ עסקאות (liability)
  const vatInput         = oneCode('2320')  // מע"מ תשומות (asset)
  const vatNet           = vatOutput - vatInput   // positive = לתשלום
  const taxWithheldOnUs  = oneCode('2550')  // מס מקור שנוכה לנו (asset)

  return NextResponse.json({
    summary: {
      revenue,
      costOfRevenue,
      opExpenses,
      totalExpenses,
      grossProfit,
      netProfit,
      bank,
      receivables,
      payables,
      vatOutput,
      vatInput,
      vatNet,
      taxWithheldOnUs,
    },
    balances,
  })
}
