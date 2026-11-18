// Multi-currency pricing & charm pricing for cross-border e-commerce. Pure math, no external dependencies.

export type CharmRounding = 'none' | '99' | '95' | '00'

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'])

/** Returns standard fraction digits for a currency code (e.g. 0 for JPY, 3 for BHD, 2 for USD) */
export function getCurrencyDecimals(currencyCode: string): number {
  const code = currencyCode.toUpperCase()
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3
  return 2
}

/**
 * Rounds an amount in minor units according to psychological (charm) pricing rules.
 */
export function roundToCharm(amountMinor: number, currencyCode: string, charm: CharmRounding = 'none'): number {
  if (amountMinor <= 0 || charm === 'none') {
    return Math.round(amountMinor)
  }

  const decimals = getCurrencyDecimals(currencyCode)

  if (decimals === 2) {
    const baseMajor = Math.floor(amountMinor / 100)
    if (charm === '99') {
      return baseMajor * 100 + 99
    }
    if (charm === '95') {
      return baseMajor * 100 + 95
    }
    if (charm === '00') {
      return Math.round(amountMinor / 100) * 100
    }
  } else if (decimals === 0) {
    // Zero-decimal currencies like JPY: round to nearest hundred or ending in 99/95/00
    const baseHundred = Math.floor(amountMinor / 100)
    if (charm === '99') {
      return Math.max(99, baseHundred * 100 + 99)
    }
    if (charm === '95') {
      return Math.max(95, baseHundred * 100 + 95)
    }
    if (charm === '00') {
      return Math.round(amountMinor / 100) * 100
    }
  } else if (decimals === 3) {
    // 3-decimal currencies like BHD/KWD (1000 minor units per major unit)
    const baseMajor = Math.floor(amountMinor / 1000)
    if (charm === '99') {
      return baseMajor * 1000 + 990
    }
    if (charm === '95') {
      return baseMajor * 1000 + 950
    }
    if (charm === '00') {
      return Math.round(amountMinor / 1000) * 1000
    }
  }

  return Math.round(amountMinor)
}

export type ConvertMoneyOptions = {
  /** Source amount in base currency's minor units */
  amountMinor: number
  /** Base currency code of amount (e.g. 'USD') */
  baseCurrency: string
  /** Target presentment currency code (e.g. 'EUR', 'JPY') */
  targetCurrency: string
  /** Exchange rate dictionary: target units per 1 unit of base currency, or rates against a common reference */
  rates: Record<string, number>
  /** Optional markup/margin percentage to buffer FX fluctuations (e.g. 2 for 2% margin) */
  marginPercent?: number
  /** Charm rounding strategy */
  charm?: CharmRounding
}

export type ConvertMoneyResult = {
  amountMinor: number
  currencyCode: string
  rate: number
  marginPercent: number
  decimals: number
}

/**
 * Converts money from a base currency into a target currency with dynamic precision, optional margin, and charm pricing.
 */
export function convertMoney(options: ConvertMoneyOptions): ConvertMoneyResult {
  const { amountMinor, baseCurrency, targetCurrency, rates, marginPercent = 0, charm = 'none' } = options

  const baseCode = baseCurrency.toUpperCase()
  const targetCode = targetCurrency.toUpperCase()
  const targetDecimals = getCurrencyDecimals(targetCode)
  const baseDecimals = getCurrencyDecimals(baseCode)

  if (baseCode === targetCode && marginPercent === 0 && charm === 'none') {
    return {
      amountMinor,
      currencyCode: targetCode,
      rate: 1,
      marginPercent: 0,
      decimals: targetDecimals,
    }
  }

  // Resolve exchange rate
  let effectiveRate = 1
  if (baseCode !== targetCode) {
    if (rates[targetCode] != null && (rates[baseCode] == null || baseCode === 'USD')) {
      // Direct rate from base (or base is reference USD)
      effectiveRate = rates[targetCode]!
    } else if (rates[targetCode] != null && rates[baseCode] != null) {
      // Cross-currency conversion via common reference
      effectiveRate = rates[targetCode]! / rates[baseCode]!
    } else {
      throw new Error(`Missing exchange rate for ${baseCode} to ${targetCode}`)
    }
  }

  if (effectiveRate <= 0 || !Number.isFinite(effectiveRate)) {
    throw new Error(`Invalid exchange rate ${effectiveRate} for ${targetCode}`)
  }

  // Convert major units
  const baseMajor = amountMinor / 10 ** baseDecimals
  const marginMultiplier = 1 + Math.max(0, marginPercent) / 100
  const targetMajor = baseMajor * effectiveRate * marginMultiplier
  let targetMinor = targetMajor * 10 ** targetDecimals

  targetMinor = roundToCharm(targetMinor, targetCode, charm)

  return {
    amountMinor: targetMinor,
    currencyCode: targetCode,
    rate: effectiveRate,
    marginPercent,
    decimals: targetDecimals,
  }
}

export type MultiCurrencyPricingInput = {
  /** Original line item totals in base currency minor units */
  lines: number[]
  /** Shipping in base currency minor units */
  shippingCents: number
  /** Base currency code */
  baseCurrency: string
  /** Target presentment currency code */
  targetCurrency: string
  /** Exchange rates table */
  rates: Record<string, number>
  /** FX buffer margin percent (default 0) */
  marginPercent?: number
  /** Charm rounding rule for lines */
  charm?: CharmRounding
}

/**
 * Converts all line items and shipping in a PricingInput into target currency minor units.
 */
export function convertPricingInput(input: MultiCurrencyPricingInput): {
  lines: number[]
  shippingCents: number
  currencyCode: string
  rate: number
} {
  const { lines, shippingCents, baseCurrency, targetCurrency, rates, marginPercent = 0, charm = 'none' } = input

  const targetLines = lines.map(
    (lineMinor) =>
      convertMoney({
        amountMinor: lineMinor,
        baseCurrency,
        targetCurrency,
        rates,
        marginPercent,
        charm,
      }).amountMinor,
  )

  const targetShipping =
    shippingCents === 0
      ? 0
      : convertMoney({
          amountMinor: shippingCents,
          baseCurrency,
          targetCurrency,
          rates,
          marginPercent,
          charm: 'none', // shipping uses standard rounding
        }).amountMinor

  const sample = convertMoney({
    amountMinor: 100,
    baseCurrency,
    targetCurrency,
    rates,
    marginPercent: 0,
    charm: 'none',
  })

  return {
    lines: targetLines,
    shippingCents: targetShipping,
    currencyCode: targetCurrency.toUpperCase(),
    rate: sample.rate,
  }
}
