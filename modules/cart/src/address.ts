// Address standardization & ISO 3166-1 alpha-2 validation for cross-border checkout.

const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/

export type AddressValidationResult = {
  valid: boolean
  errors: string[]
}

/**
 * Checks if a string is a syntactically valid ISO 3166-1 alpha-2 country code (2 letters).
 */
export function isValidCountryCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false
  const trimmed = code.trim().toUpperCase()
  return ISO_COUNTRY_CODE_REGEX.test(trimmed)
}

/**
 * Normalizes and validates an ISO country code. Throws Error if invalid.
 */
export function normalizeCountryCode(code: string | null | undefined): string {
  if (!code || typeof code !== 'string') {
    throw new Error('Country code is required')
  }
  const normalized = code.trim().toUpperCase()
  if (!ISO_COUNTRY_CODE_REGEX.test(normalized)) {
    throw new Error(`Invalid country code '${code}': must be a 2-letter ISO 3166-1 alpha-2 code`)
  }
  return normalized
}

/**
 * Cleans phone numbers: trims whitespace, returns null if empty.
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null
  const trimmed = phone.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Normalizes postal/ZIP codes: trims, strips excessive internal spacing.
 */
export function normalizePostalCode(zip: string | null | undefined): string | null {
  if (!zip || typeof zip !== 'string') return null
  const cleaned = zip.trim().replace(/\s+/g, ' ')
  return cleaned.length > 0 ? cleaned : null
}

export type AddressInputFields = {
  firstName?: string | null
  lastName?: string | null
  company?: string | null
  address1?: string | null
  address2?: string | null
  city?: string | null
  province?: string | null
  countryCode?: string | null
  zip?: string | null
  phone?: string | null
}

/**
 * Validates an address input for cross-border shipping requirements.
 */
export function validateAddress(a: AddressInputFields): AddressValidationResult {
  const errors: string[] = []

  if (!a.lastName?.trim()) {
    errors.push('Last name is required')
  }
  if (!a.address1?.trim()) {
    errors.push('Address line 1 is required')
  }
  if (!a.city?.trim()) {
    errors.push('City is required')
  }
  if (!isValidCountryCode(a.countryCode)) {
    errors.push('A valid 2-letter country code (ISO 3166-1 alpha-2) is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
