// Shared config for artist event boards
// Maps artist project name → Monday.com board ID
export const ARTIST_BOARD_MAP: Record<string, string> = {
  "ג'ימבו ג'יי": '2043602683',
  "ג'ימבו ג'י": '2043602683',
  'אקו': '5092930238',
  'אקו / Mitzi': '5092930238',
  'מאור אשכנזי': '5093817565',
  'YUZ': '5093818247',
  'יוז': '5093818247',
  'אלי לוזון': '5094110017',
}

export type ArtistEvent = {
  id: string
  name: string
  date: string | null
  status: string | null
  contract_status: string | null
  event_type: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  soundcheck_time: string | null
  audience_count: string | null
  audience_type: string | null
  ticket_price: string | null
  ticket_count: string | null
  total_revenue: string | null
  total_expenses: string | null
  net_profit: string | null
  artist_share: string | null
  office_share: string | null
  details: string | null
}
