import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

export async function POST(request: Request) {
  const body = await request.json()
  const { to, subject, html } = body

  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log('[send-email] No Gmail credentials configured.')
    return NextResponse.json({ error: 'Email not configured' }, { status: 500 })
  }

  try {
    await transporter.sendMail({
      from: `"Task Manager" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[send-email] Error:', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
