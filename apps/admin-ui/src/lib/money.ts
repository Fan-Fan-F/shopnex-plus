const formats = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: string): Intl.NumberFormat {
  const code = currency.toUpperCase()
  let f = formats.get(code)
  if (!f) {
    try {
      f = new Intl.NumberFormat('en', { style: 'currency', currency: code })
    } catch {
      f = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' })
    }
    formats.set(code, f)
  }
  return f
}

export function getCurrencyDigits(currency?: string): number {
  if (!currency) return 2
  return getFormatter(currency).resolvedOptions().maximumFractionDigits ?? 2
}

/** Formats minor units (cents for USD, yen for JPY, fils for BHD) with appropriate currency symbol & decimals */
export function formatMoney(cents: number, currency: string) {
  const f = getFormatter(currency)
  const digits = f.resolvedOptions().maximumFractionDigits ?? 2
  return f.format(cents / 10 ** digits)
}

/** "19.99" → 1999 (USD), "1500" → 1500 (JPY), "" → null, junk → NaN */
export function toCents(text: string, currency?: string): number | null {
  const trimmed = text.trim().replace(/,/g, '')
  if (trimmed === '') return null
  const digits = getCurrencyDigits(currency)
  const regex = digits === 0 ? /^-?\d+$/ : new RegExp(`^-?\\d*(\\.\\d{0,${digits}})?$`)
  if (!regex.test(trimmed) || !/\d/.test(trimmed)) return Number.NaN
  return Math.round(Number(trimmed) * 10 ** digits)
}

/** Cents as the text shown in a money input; null/undefined/non-finite → "" (never "NaN"). */
export function formatCentsInput(cents: number | null | undefined, currency?: string) {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return ''
  const digits = getCurrencyDigits(currency)
  return (cents / 10 ** digits).toFixed(digits)
}
