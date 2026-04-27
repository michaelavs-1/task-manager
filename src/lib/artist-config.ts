// Shared config for artist event boards
// Maps artist project name → Monday.com board ID
export const ARTIST_BOARD_MAP: Record<string, string> = {
  "ג'ימבו ג'יי": '5088957910',
  "ג'ימבו ג'י":  '5088957910',
  'אקו':         '5092930238',
  'אקו / Mitzi': '5092930238',
  'מאור אשכנזי': '5093817565',
  'YUZ':         '5093818247',
  'יוז':         '5093818247',
  'אלי לוזון':   '5094110017',
}

// Per-board column ID mappings (columns differ between boards)
export type BoardColumns = {
  date:            string
  status:          string   // סטטוס הופעה
  contract_status: string   // סטטוס מכורה / חוזה
  event_type:      string   // סוג אירוע
  location:        string
  start_time:      string
  end_time:        string
  soundcheck_time: string
  audience_count:  string
  audience_type:   string
  ticket_price:    string
  ticket_count:    string
  total_revenue:   string
  total_expenses:  string
  net_profit:      string
  artist_share:    string
  office_share:    string
  details:         string
}

// Default column mapping (Maor / YUZ / Eli boards — all share the same template)
const DEFAULT_COLUMNS: BoardColumns = {
  date:            'date_mm1akrm7',
  status:          'color_mm1a9mr6',
  contract_status: 'color_mm1afewp',
  event_type:      'color_mm1akdec',
  location:        'text_mm1amztr',
  start_time:      'hour_mm1awtkm',
  end_time:        'hour_mm1adj2d',
  soundcheck_time: 'hour_mm1agkqg',
  audience_count:  'numeric_mm1a8jd0',
  audience_type:   'color_mm1apw17',
  ticket_price:    'numeric_mm0cc869',
  ticket_count:    'numeric_mm0cvpvq',
  total_revenue:   'formula_mm0czrmj',
  total_expenses:  'formula_mm0cxz90',
  net_profit:      'formula_mm0cnjr',
  artist_share:    'formula_mm1apcr',
  office_share:    'formula_mm1accmw',
  details:         'text_mm1az3j9',
}

// Jimbo board (5088957910) has a completely different column structure
const JIMBO_COLUMNS: BoardColumns = {
  date:            'date4',
  status:          'color_mkzqhn5c',
  contract_status: 'color_mkzq3d27',
  event_type:      'color_mkzqbcr3',
  location:        'text_mkzq5vk9',
  start_time:      'hour_mm1h175r',    // שעת תחילת אירוע
  end_time:        'hour_mm1hxcph',    // שעת סיום אירוע
  soundcheck_time: 'hour_mkzqf39j',
  audience_count:  'numeric_mkzq492f',
  audience_type:   'color_mkzqn0e5',
  ticket_price:    'numeric_mkzq7q8z', // מחיר מופע
  ticket_count:    '',                 // no dedicated column
  total_revenue:   'formula_mm1gngh3', // חישוב סופי
  total_expenses:  'formula_mkzqk62m', // תשלום ספקים
  net_profit:      'formula_mkzqx3r1', // יתרה לחלוקה
  artist_share:    'formula_mkzqatc',  // תשלום לאומן
  office_share:    'formula_mkzq6r5w', // תשלום אלגוריתם
  details:         'text_mkzq5j4r',
}

// Board-specific overrides
const BOARD_COLUMN_OVERRIDES: Record<string, BoardColumns> = {
  '5088957910': JIMBO_COLUMNS,
}

export function getColumnsForBoard(boardId: string): BoardColumns {
  return BOARD_COLUMN_OVERRIDES[boardId] ?? DEFAULT_COLUMNS
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
