'use client'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

type Meeting = {
  id: string
  title: string
  date: string
  duration: number
  transcript?: string
  summary?: string
}

const SETTINGS_PATH = '_config/settings.json'
const BUCKET = 'campaigns-media'
const MEETINGS_KEY = 'meetings_v1'

export function MeetingsView() {
  const [subTab, setSubTab] = useState<'live' | 'list'>('live')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  // Recording state
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'stopped'>('idle')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [showTitleInput, setShowTitleInput] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Processing
  const [processing, setProcessing] = useState(false)
  const [processStep, setProcessStep] = useState<'transcribing' | 'summarizing' | null>(null)
  const [processError, setProcessError] = useState('')

  // Meetings list
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null)

  useEffect(() => {
    loadSettings()
    loadMeetings()
  }, [])

  async function loadSettings() {
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(SETTINGS_PATH)
      if (data && !error) {
        const text = await data.text()
        const json = JSON.parse(text)
        if (json.openai_key) { setApiKey(json.openai_key); setApiKeyInput(json.openai_key) }
      }
    } catch {}
  }

  async function saveApiKey() {
    setSavingKey(true)
    try {
      let existing: Record<string, string> = {}
      try {
        const { data } = await supabase.storage.from(BUCKET).download(SETTINGS_PATH)
        if (data) existing = JSON.parse(await data.text())
      } catch {}
      const blob = new Blob([JSON.stringify({ ...existing, openai_key: apiKeyInput.trim() })], { type: 'application/json' })
      await supabase.storage.from(BUCKET).upload(SETTINGS_PATH, blob, { upsert: true })
      setApiKey(apiKeyInput.trim())
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2000)
    } catch {}
    finally { setSavingKey(false) }
  }

  function loadMeetings() {
    try { const s = localStorage.getItem(MEETINGS_KEY); if (s) setMeetings(JSON.parse(s)) } catch {}
  }

  function saveMeetingsList(list: Meeting[]) {
    try { localStorage.setItem(MEETINGS_KEY, JSON.stringify(list)) } catch {}
    setMeetings(list)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const mr = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setRecordingState('stopped')
        setShowTitleInput(true)
      }
      mediaRecorderRef.current = mr
      mr.start(1000)
      setRecordingState('recording')
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('לא ניתן לגשת למיקרופון. בדוק הרשאות דפדפן.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  function saveMeetingWithTitle() {
    if (!meetingTitle.trim() || !audioBlob) return
    const m: Meeting = { id: Date.now().toString(), title: meetingTitle.trim(), date: new Date().toISOString(), duration: recordingSeconds }
    const updated = [m, ...meetings]
    saveMeetingsList(updated)
    setCurrentMeeting(m)
    setMeetingTitle('')
    setShowTitleInput(false)
  }

  async function summarizeMeeting(meeting: Meeting, blob?: Blob) {
    if (!apiKey) { setProcessError('נדרש מפתח OpenAI. פתח גלגל שיניים ↗'); return }
    const audio = blob || audioBlob
    if (!audio) { setProcessError('אין הקלטה'); return }
    setProcessing(true); setProcessError('')
    try {
      setProcessStep('transcribing')
      const fd = new FormData()
      fd.append('file', audio, 'recording.webm')
      fd.append('model', 'whisper-1')
      fd.append('language', 'he')
      const tr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: fd
      })
      const td = await tr.json()
      if (!tr.ok) throw new Error(td.error?.message || 'שגיאת תמלול')
      const transcript = td.text

      setProcessStep('summarizing')
      const sr = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'אתה עוזר מקצועי לסיכום פגישות עסקיות בתעשיית המוזיקה. סכם בעברית, כלול: נושאים שנדונו, החלטות שהתקבלו, ומשימות לביצוע.' },
            { role: 'user', content: `תמלול:\n\n${transcript}\n\nסכם את הפגישה.` }
          ],
          temperature: 0.3
        })
      })
      const sd = await sr.json()
      if (!sr.ok) throw new Error(sd.error?.message || 'שגיאת סיכום')
      const summary = sd.choices[0].message.content

      const updated = meetings.map(m => m.id === meeting.id ? { ...m, transcript, summary } : m)
      if (currentMeeting?.id === meeting.id) setCurrentMeeting({ ...meeting, transcript, summary })
      saveMeetingsList(updated)
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'שגיאה')
    } finally { setProcessing(false); setProcessStep(null) }
  }

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }) }
    catch { return iso }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">פגישות</h1>
        <button onClick={() => setShowSettings(!showSettings)}
          className={'p-2 rounded-xl transition-colors ' + (showSettings ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800')}
          title="הגדרות OpenAI">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-6 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">מפתח OpenAI API</h3>
          <div className="flex gap-2">
            <input type="password" placeholder="sk-..." value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-700 dark:text-white font-mono" />
            <button onClick={saveApiKey} disabled={savingKey || !apiKeyInput.trim()}
              className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap">
              {keySaved ? '✓ נשמר' : savingKey ? 'שומר...' : 'שמור מפתח'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">המפתח נשמר בענן ומסונכרן בין מכשירים</p>
          {apiKey && <p className="mt-1 text-xs text-emerald-600 font-medium">✓ מפתח מוגדר</p>}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        {[{key:'live', label:'סכם פגישה live'}, {key:'list', label:`פגישות שמורות${meetings.length ? ' ('+meetings.length+')' : ''}`}].map(({key, label}) => (
          <button key={key} onClick={() => setSubTab(key as 'live'|'list')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${subTab===key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'}`}>
            {key === 'live' && <span className={`w-2 h-2 rounded-full ${subTab==='live' && recordingState==='recording' ? 'bg-red-400 animate-pulse' : subTab==='live' ? 'bg-red-300' : 'bg-gray-300'}`} />}
            {label}
          </button>
        ))}
      </div>

      {/* LIVE TAB */}
      {subTab === 'live' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-8">
            <div className="flex flex-col items-center gap-6">
              {/* Timer display */}
              <div className={`text-5xl font-black tabular-nums tracking-tight ${recordingState === 'recording' ? 'text-red-500' : 'text-gray-200 dark:text-gray-700'}`}>
                {fmt(recordingSeconds)}
              </div>

              {/* Mic button */}
              {recordingState === 'idle' && (
                <button onClick={startRecording}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-xl hover:shadow-2xl transition-all flex items-center justify-center">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                  </svg>
                </button>
              )}

              {recordingState === 'recording' && (
                <button onClick={stopRecording}
                  className="w-24 h-24 rounded-full bg-gray-900 hover:bg-black text-white shadow-xl hover:shadow-2xl transition-all flex items-center justify-center ring-4 ring-red-500/40">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="5" y="5" width="14" height="14" rx="2"/>
                  </svg>
                </button>
              )}

              {recordingState === 'recording' && (
                <div className="flex items-center gap-2 text-red-500 font-semibold text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  מקליט...
                </div>
              )}

              {recordingState === 'idle' && (
                <p className="text-sm text-gray-400">לחץ להתחלת הקלטה</p>
              )}
            </div>

            {/* Title input */}
            {showTitleInput && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  ✓ הקלטה הסתיימה ({fmt(recordingSeconds)}). תן שם לפגישה:
                </p>
                <div className="flex gap-2">
                  <input type="text" placeholder="שם הפגישה..." value={meetingTitle}
                    onChange={e => setMeetingTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMeetingWithTitle() }}
                    autoFocus
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-gray-700 dark:text-white" />
                  <button onClick={saveMeetingWithTitle} disabled={!meetingTitle.trim()}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                    שמור
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summarize CTA */}
          {currentMeeting && audioBlob && !currentMeeting.summary && (
            <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-bold text-indigo-900 dark:text-indigo-200">{currentMeeting.title}</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{fmt(currentMeeting.duration)} · {fmtDate(currentMeeting.date)}</p>
                </div>
                <button onClick={() => summarizeMeeting(currentMeeting)} disabled={processing || !apiKey}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                  {processing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {processStep === 'transcribing' ? 'מתמלל...' : 'מסכם...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      סכם פגישה
                    </>
                  )}
                </button>
              </div>
              {!apiKey && <p className="text-xs text-amber-600 mt-3 font-medium">⚠ הגדר מפתח OpenAI API בגלגל השיניים למעלה</p>}
              {processError && <p className="text-xs text-red-500 mt-2">{processError}</p>}
            </div>
          )}

          {/* Summary result */}
          {currentMeeting?.summary && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-gray-800 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-bold text-gray-900 dark:text-white">{currentMeeting.title}</h3>
                <span className="text-xs text-gray-400">{fmt(currentMeeting.duration)}</span>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                {currentMeeting.summary}
              </div>
              {currentMeeting.transcript && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">הצג תמלול מלא</summary>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">{currentMeeting.transcript}</p>
                </details>
              )}
              <button onClick={() => { setCurrentMeeting(null); setAudioBlob(null); setRecordingState('idle'); setRecordingSeconds(0) }}
                className="mt-4 text-xs text-gray-400 hover:text-indigo-600 transition-colors font-medium">
                ← הקלטה חדשה
              </button>
            </div>
          )}
        </div>
      )}

      {/* LIST TAB */}
      {subTab === 'list' && (
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p className="text-sm">אין פגישות שמורות</p>
              <button onClick={() => setSubTab('live')} className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium">התחל הקלטה ←</button>
            </div>
          ) : meetings.map(m => (
            <div key={m.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <button onClick={() => setExpandedMeeting(expandedMeeting === m.id ? null : m.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(m.date)} · {fmt(m.duration)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {m.summary
                    ? <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">סוכם</span>
                    : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">ממתין</span>}
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedMeeting === m.id ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>
              {expandedMeeting === m.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4 bg-gray-50 dark:bg-gray-700/30">
                  {m.summary ? (
                    <>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">סיכום</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{m.summary}</p>
                      {m.transcript && (
                        <details className="mt-3">
                          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">הצג תמלול</summary>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{m.transcript}</p>
                        </details>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">הפגישה טרם סוכמה</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
