import { NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '../../../lib/auth'
import { getDb } from '../../../lib/db'
import { compoundCorpus } from '../../../lib/corpus'

const VALID_SECTIONS = [
  'salary', 'assets', 'liabilities', 'investments',
  'savings', 'goals', 'essentials', 'budget'
]

async function requireAuth(request) {
  const token = getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

// GET /api/data  — load all sections, auto-compound investments
export async function GET(request) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sql = getDb()

  try {
    const rows = await sql`
      SELECT section, item_id, payload, created_at, updated_at
      FROM finance_data
      ORDER BY created_at ASC
    `

    // Group by section
    const data = Object.fromEntries(VALID_SECTIONS.map(s => [s, []]))

    for (const row of rows) {
      const item = { ...row.payload, id: Number(row.item_id) }

      // Auto-compound investments corpus
      if (row.section === 'investments') {
        const updatedCorpus = compoundCorpus(item, row.updated_at)
        if (updatedCorpus !== item.corpus) {
          item.corpus = updatedCorpus
          item._corpusUpdated = true
          // Persist updated corpus back to DB (fire and forget)
          sql`
            UPDATE finance_data
            SET payload = ${JSON.stringify({ ...row.payload, corpus: updatedCorpus })}::jsonb,
                updated_at = NOW()
            WHERE section = 'investments' AND item_id = ${row.item_id}
          `.catch(console.error)
        }
      }

      if (data[row.section]) data[row.section].push(item)
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/data error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// POST /api/data  — add item to a section
export async function POST(request) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section, item } = await request.json()
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  const sql = getDb()
  const itemId = item.id || Date.now()
  const payload = { ...item, id: itemId }

  try {
    await sql`
      INSERT INTO finance_data (section, item_id, payload)
      VALUES (${section}, ${itemId}, ${JSON.stringify(payload)}::jsonb)
      ON CONFLICT (section, item_id)
      DO UPDATE SET payload = ${JSON.stringify(payload)}::jsonb, updated_at = NOW()
    `
    return NextResponse.json({ ok: true, item: payload })
  } catch (err) {
    console.error('POST /api/data error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// PUT /api/data  — update an existing item
export async function PUT(request) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section, item } = await request.json()
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  const sql = getDb()

  try {
    const result = await sql`
      UPDATE finance_data
      SET payload = ${JSON.stringify(item)}::jsonb, updated_at = NOW()
      WHERE section = ${section} AND item_id = ${item.id}
      RETURNING item_id
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/data error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// DELETE /api/data  — remove an item
export async function DELETE(request) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section, id } = await request.json()
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  const sql = getDb()

  try {
    await sql`
      DELETE FROM finance_data
      WHERE section = ${section} AND item_id = ${id}
    `
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/data error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
