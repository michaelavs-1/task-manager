import { NextResponse } from 'next/server'

const BOARD_ID = '5075345214'

interface ColumnValue {
  id: string
  text?: string | null
  value?: string | null
  type?: string
}

interface MondayItem {
  id: string
  name: string
  column_values: ColumnValue[]
}

interface Supplier {
  id: string
  name: string
  firstName: string
  lastName: string
  idNumber: string
  taxStatus: string
  taxStatusColor: string
  email: string
  phone: string
  role: string
  department: string
  beneficiary: string
  branch: string
  bank: string
  accountNumber: string
  daily: string
  notes: string
  hasBooksCert: boolean
  hasAccountCert: boolean
}

async function fetchAllSuppliers(token: string): Promise<MondayItem[]> {
  const allItems: MondayItem[] = []
  let cursor: string | null = null

  do {
    const cursorArg: string = cursor ? `, cursor: "${cursor}"` : ''
    const query: string = `
      query {
        boards(ids: [${BOARD_ID}]) {
          items_page(limit: 100${cursorArg}) {
            cursor
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `

    const response: Response = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'API-Version': '2023-10',
      },
      body: JSON.stringify({ query }),
    })

    if (!response.ok) {
      throw new Error(`Monday API error: ${response.status}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = data?.data?.boards?.[0]?.items_page
    if (!page) break

    allItems.push(...(page.items || []))
    cursor = page.cursor || null
  } while (cursor)

  return allItems
}

function taxStatusColor(status: string): string {
  switch (status) {
    case 'מורשה': return 'green'
    case 'פטור': return 'lime'
    case 'חברה': return 'teal'
    case 'עמותה': return 'blue'
    default: return 'gray'
  }
}

function parseSupplier(item: MondayItem): Supplier {
  const col = (id: string) => item.column_values.find(c => c.id === id)?.text || ''

  const taxStatus = col('color_mkxa6ag1')
  const hasBooksCert = !!item.column_values.find(c => c.id === 'file_mksp968a')?.value
  const hasAccountCert = !!item.column_values.find(c => c.id === 'file_mkxaka3r')?.value

  let phone = col('phone_mkspvxa1')
  // Format phone: remove country code prefix if 972
  if (phone.startsWith('972')) {
    phone = '0' + phone.slice(3)
  }

  return {
    id: item.id,
    name: item.name,
    firstName: col('text_mkxbjth2'),
    lastName: col('text_mkxb13gf'),
    idNumber: col('text_mkspzjhk'),
    taxStatus,
    taxStatusColor: taxStatusColor(taxStatus),
    email: col('email_mkspepqk'),
    phone,
    role: col('dropdown_mksp2r97'),
    department: col('dropdown_mkspsb83'),
    beneficiary: col('text_mkxa1maf'),
    branch: col('text_mkxa9bg6'),
    bank: col('dropdown_mkxae5mh'),
    accountNumber: col('text_mkxa3emv'),
    daily: col('numeric_mkxav0ag'),
    notes: col('long_text_mkspkyrh'),
    hasBooksCert,
    hasAccountCert,
  }
}

export async function GET() {
  const token = process.env.MONDAY_API_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'Missing MONDAY_API_TOKEN' }, { status: 500 })
  }

  try {
    const items = await fetchAllSuppliers(token)
    const suppliers = items.map(parseSupplier)
    return NextResponse.json({ suppliers, total: suppliers.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
