import { NextResponse } from 'next/server'
import { signToken } from '../../../lib/auth'
import { initDb } from '../../../lib/db'

export async function POST(request) {
  try {
    const { password } = await request.json()
    const correct = process.env.APP_PASSWORD || 'Rohan07@'

    if (password !== correct) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Init DB on first login (idempotent)
    try { await initDb() } catch (e) { console.error('DB init error:', e) }

    const token = await signToken()

    const response = NextResponse.json({ ok: true })
    response.cookies.set('wm_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })
    return response
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set('wm_token', '', { maxAge: 0, path: '/' })
  return response
}
