import { neon } from '@neondatabase/serverless'

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  return neon(process.env.DATABASE_URL)
}

export async function initDb() {
  const sql = getDb()
  await sql`
    CREATE TABLE IF NOT EXISTS finance_data (
      id          SERIAL PRIMARY KEY,
      section     TEXT NOT NULL,
      item_id     BIGINT NOT NULL,
      payload     JSONB NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(section, item_id)
    )
  `
  await sql`
    CREATE INDEX IF NOT EXISTS idx_finance_section ON finance_data(section)
  `
  // Corpus growth tracking: store the month each investment was last compounded
  await sql`
    CREATE TABLE IF NOT EXISTS corpus_snapshots (
      item_id       BIGINT PRIMARY KEY,
      corpus        NUMERIC NOT NULL,
      last_updated  DATE NOT NULL DEFAULT CURRENT_DATE
    )
  `
  return true
}
