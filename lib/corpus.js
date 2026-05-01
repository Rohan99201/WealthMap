/**
 * Given an investment record and its last-updated date,
 * compound the corpus forward by however many months have passed.
 *
 * Formula: FV = corpus * (1 + r)^n  +  monthly * [(1+r)^n - 1] / r
 * where r = annual_return / 12 / 100, n = months elapsed
 */
export function compoundCorpus(investment, lastUpdatedDate) {
  const now = new Date()
  const last = new Date(lastUpdatedDate)

  // Calculate full months elapsed
  const months =
    (now.getFullYear() - last.getFullYear()) * 12 +
    (now.getMonth() - last.getMonth())

  if (months <= 0) return investment.corpus

  const r = investment.return / 100 / 12
  const n = months
  const corpus = Number(investment.corpus)
  const monthly = Number(investment.amount)

  if (r === 0) {
    return Math.round(corpus + monthly * n)
  }

  const growth = corpus * Math.pow(1 + r, n)
  const sipGrowth = monthly * (Math.pow(1 + r, n) - 1) / r
  return Math.round(growth + sipGrowth)
}

/**
 * Project corpus N years into the future from current value
 */
export function projectCorpus(corpus, monthly, annualReturn, years) {
  const r = annualReturn / 100 / 12
  const n = years * 12
  if (r === 0) return Math.round(corpus + monthly * n)
  return Math.round(
    corpus * Math.pow(1 + r, n) +
    monthly * (Math.pow(1 + r, n) - 1) / r
  )
}
