import { NextResponse } from 'next/server'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function POST(request: Request) {
  const body = await request.json()
  const { to, subject, html } = body

  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!RESEND_API_KEY) {
    // If no API key configured, just log and return success (graceful degradation)
    console.log('[send-email] No RESEND_API_KEY configured. Would have sent:', { to, subject })
    return NextResponse.json({ success: true, simulated: true })
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('[send-email] Resend API error:', data)
      return NextResponse.json({ error: data }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    console.error('[send-email] Fetch error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
