// Shared Dropbox helpers used by MediaLibraryView and BarbyCard (CampaignsView).
// All helpers are ASCII-safe and team-namespace-aware.

export const DROPBOX_TOKEN_KEY = 'dropbox_token_v1'
export const DROPBOX_CUSTOM_PATH_KEY = 'dropbox_custom_path_v1'
export const DROPBOX_BASE_PATH_KEY = 'dropbox_base_path_v1'
export const DROPBOX_ROOT_NS_KEY = 'dropbox_root_ns_v1'
export const DROPBOX_SHARED_FOLDER_URL = 'https://www.dropbox.com/scl/fo/pv4cyapt6tgcnkmkaq1b1/AHpXDdACHUTTygAN_xOP1Xs?rlkey=c9r45ykdnq6pc0eay0gykkdnh&dl=0'

// Dropbox-API-Arg header must contain only ASCII. Escape non-ASCII chars as \uXXXX.
export function asciiSafeJson(obj: any): string {
  return JSON.stringify(obj).replace(/[\u007f-\uffff]/g, (c) =>
    '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4)
  )
}

export function pathRootHeader(namespaceId: string | null): string | null {
  if (!namespaceId) return null
  return asciiSafeJson({ '.tag': 'root', root: namespaceId })
}

// Sanitize a string so it's safe to use as a Dropbox folder name.
// Dropbox disallows: \ / : ? * " < > |   and leading/trailing dots/spaces.
export function sanitizeDropboxName(s: string): string {
  const cleaned = (s || '')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '')
  return cleaned || 'unnamed'
}

// Deterministic per-campaign folder name: "<sanitized name> [<id8>]"
// Stable even when the name changes, because the id suffix is unique.
export function campaignFolderName(campaignId: string, campaignName: string): string {
  const id8 = (campaignId || '').replace(/-/g, '').slice(0, 8) || 'unknown'
  return sanitizeDropboxName(campaignName) + ' [' + id8 + ']'
}

// Full Dropbox path for per-campaign media under the "campaigns" subfolder of the base path.
export function campaignFolderPath(basePath: string, campaignId: string, campaignName: string): string {
  const base = (basePath || '').replace(/\/$/, '')
  return base + '/מופעים/' + campaignFolderName(campaignId, campaignName)
}

type UploadOpts = {
  file: File
  dbxPath: string
  token: string
  rootNs: string | null
  onProgress?: (pct: number) => void
}

export function uploadFileToDropboxXHR({ file, dbxPath, token, rootNs, onProgress }: UploadOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        const txt = xhr.responseText || ''
        let msg = 'העלאה נכשלה (' + xhr.status + ')'
        if (txt.includes('expired_access_token')) msg = 'טוקן Dropbox פג תוקף'
        else if (txt.includes('invalid_access_token')) msg = 'טוקן Dropbox לא תקין'
        else if (txt.includes('insufficient_space')) msg = 'אין מספיק מקום ב-Dropbox'
        else if (txt.includes('path/conflict')) msg = 'שם הקובץ קיים כבר'
        else if (txt.includes('no_write_permission')) msg = 'לטוקן אין הרשאת כתיבה לתיקייה'
        else if (txt.includes('not_permitted') || txt.includes('missing_scope')) msg = 'חסרה הרשאה ב-Dropbox (files.content.write)'
        else if (txt) msg += ': ' + txt.slice(0, 200)
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('שגיאת רשת'))
    try {
      xhr.open('POST', 'https://content.dropboxapi.com/2/files/upload')
      xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      xhr.setRequestHeader(
        'Dropbox-API-Arg',
        asciiSafeJson({ path: dbxPath, mode: 'add', autorename: true, mute: false })
      )
      const prh = pathRootHeader(rootNs)
      if (prh) xhr.setRequestHeader('Dropbox-API-Path-Root', prh)
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
      xhr.send(file)
    } catch (e) {
      reject(e instanceof Error ? e : new Error('שגיאה בהכנת הבקשה'))
    }
  })
}

export type DropboxFileEntry = {
  name: string
  path_lower: string
  path_display: string
  id: string
  size: number
  server_modified: string
}

function buildJsonHeaders(token: string, rootNs: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  }
  const prh = pathRootHeader(rootNs)
  if (prh) h['Dropbox-API-Path-Root'] = prh
  return h
}

// List immediate children of a folder (non-recursive). Auto-creates the folder if it doesn't exist.
export async function listDropboxFolder(
  token: string, folderPath: string, rootNs: string | null, autoCreate = true
): Promise<DropboxFileEntry[]> {
  const headers = buildJsonHeaders(token, rootNs)
  const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
    method: 'POST',
    headers,
    body: JSON.stringify({ path: folderPath, recursive: false, include_deleted: false }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    if (autoCreate && /not_found/.test(txt)) {
      await createDropboxFolder(token, folderPath, rootNs).catch(() => { /* ignore */ })
      return []
    }
    throw new Error('list_folder failed (' + res.status + '): ' + txt.slice(0, 200))
  }
  const data = await res.json()
  const entries: DropboxFileEntry[] = (data.entries || []).filter((e: any) => e['.tag'] === 'file')
  let cursor = data.cursor
  let hasMore = data.has_more
  while (hasMore) {
    const r2 = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
      method: 'POST', headers, body: JSON.stringify({ cursor }),
    })
    if (!r2.ok) break
    const d2 = await r2.json()
    for (const e of (d2.entries || [])) if (e['.tag'] === 'file') entries.push(e)
    cursor = d2.cursor
    hasMore = d2.has_more
  }
  return entries
}

export async function createDropboxFolder(token: string, folderPath: string, rootNs: string | null): Promise<void> {
  const headers = buildJsonHeaders(token, rootNs)
  const res = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
    method: 'POST', headers,
    body: JSON.stringify({ path: folderPath, autorename: false }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    // Ignore "already exists" errors
    if (/path\/conflict\/folder/.test(txt)) return
    throw new Error('create_folder failed (' + res.status + '): ' + txt.slice(0, 200))
  }
}

export async function getDropboxTempLink(token: string, filePath: string, rootNs: string | null): Promise<string> {
  const headers = buildJsonHeaders(token, rootNs)
  const res = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
    method: 'POST', headers,
    body: JSON.stringify({ path: filePath }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error('temporary_link failed (' + res.status + '): ' + txt.slice(0, 200))
  }
  const data = await res.json()
  return data.link as string
}

export async function deleteDropboxPath(token: string, filePath: string, rootNs: string | null): Promise<void> {
  const headers = buildJsonHeaders(token, rootNs)
  const res = await fetch('https://api.dropboxapi.com/2/files/delete_v2', {
    method: 'POST', headers,
    body: JSON.stringify({ path: filePath }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error('delete failed (' + res.status + '): ' + txt.slice(0, 200))
  }
}

export function isImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|svg|bmp|heic)$/i.test(name)
}
export function isVideoName(name: string): boolean {
  return /\.(mp4|mov|avi|webm|mkv|m4v)$/i.test(name)
}

// Read the saved Dropbox configuration from localStorage (available after MediaLibraryView validates).
export function readDropboxConfig(): { token: string | null; basePath: string; rootNs: string | null } {
  if (typeof window === 'undefined') return { token: null, basePath: '', rootNs: null }
  const token = window.localStorage.getItem(DROPBOX_TOKEN_KEY)
  const customPath = window.localStorage.getItem(DROPBOX_CUSTOM_PATH_KEY) || ''
  const basePath = customPath || window.localStorage.getItem(DROPBOX_BASE_PATH_KEY) || ''
  const rootNs = window.localStorage.getItem(DROPBOX_ROOT_NS_KEY) || null
  return { token, basePath, rootNs }
}
