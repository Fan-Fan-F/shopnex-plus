import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  isValidCountryCode,
  normalizeCountryCode,
  normalizePhone,
  normalizePostalCode,
  validateAddress,
} from '../src/address'
import { toMailingAddress } from '../src/checkout'

describe('checkout address validation & normalization', () => {
  describe('isValidCountryCode', () => {
    test('validates 2-letter uppercase ISO country codes', () => {
      assert.equal(isValidCountryCode('US'), true)
      assert.equal(isValidCountryCode('ca'), true)
      assert.equal(isValidCountryCode('GB'), true)
      assert.equal(isValidCountryCode('JP'), true)
    })

    test('rejects non-2-letter or invalid country codes', () => {
      assert.equal(isValidCountryCode('USA'), false)
      assert.equal(isValidCountryCode('12'), false)
      assert.equal(isValidCountryCode('U1'), false)
      assert.equal(isValidCountryCode(''), false)
      assert.equal(isValidCountryCode(null), false)
      assert.equal(isValidCountryCode(undefined), false)
    })
  })

  describe('normalizeCountryCode', () => {
    test('normalizes valid country codes', () => {
      assert.equal(normalizeCountryCode('us'), 'US')
      assert.equal(normalizeCountryCode(' gb '), 'GB')
    })

    test('throws for invalid country codes', () => {
      assert.throws(() => normalizeCountryCode('invalid'), /Invalid country code/)
      assert.throws(() => normalizeCountryCode(''), /Country code is required/)
    })
  })

  describe('normalizePhone', () => {
    test('cleans whitespace and returns trimmed phone', () => {
      assert.equal(normalizePhone(' +1 555-123-4567 '), '+1 555-123-4567')
      assert.equal(normalizePhone('   '), null)
      assert.equal(normalizePhone(null), null)
    })
  })

  describe('normalizePostalCode', () => {
    test('cleans internal excess spacing and trims', () => {
      assert.equal(normalizePostalCode('  SW1A   1AA  '), 'SW1A 1AA')
      assert.equal(normalizePostalCode(' 10001 '), '10001')
      assert.equal(normalizePostalCode('   '), null)
    })
  })

  describe('validateAddress', () => {
    test('passes for valid cross-border shipping address', () => {
      const res = validateAddress({
        lastName: 'Smith',
        address1: '123 Main St',
        city: 'New York',
        countryCode: 'US',
      })
      assert.equal(res.valid, true)
      assert.equal(res.errors.length, 0)
    })

    test('reports missing required fields', () => {
      const res = validateAddress({
        lastName: '',
        address1: '',
        city: '   ',
        countryCode: 'invalid',
      })
      assert.equal(res.valid, false)
      assert.ok(res.errors.includes('Last name is required'))
      assert.ok(res.errors.includes('Address line 1 is required'))
      assert.ok(res.errors.includes('City is required'))
      assert.ok(res.errors.includes('A valid 2-letter country code (ISO 3166-1 alpha-2) is required'))
    })
  })

  describe('toMailingAddress', () => {
    test('cleans and normalizes fields into MailingAddress shape', () => {
      const parsed = toMailingAddress({
        firstName: ' Alice ',
        lastName: ' Wonder ',
        company: '   ',
        address1: ' 456 Elm Ave ',
        address2: ' Suite 100 ',
        city: ' Seattle ',
        province: ' WA ',
        countryCode: ' us ',
        zip: '  98101  ',
        phone: '  +12065550199  ',
      })

      assert.equal(parsed.firstName, 'Alice')
      assert.equal(parsed.lastName, 'Wonder')
      assert.equal(parsed.company, null)
      assert.equal(parsed.address1, '456 Elm Ave')
      assert.equal(parsed.address2, 'Suite 100')
      assert.equal(parsed.city, 'Seattle')
      assert.equal(parsed.province, 'WA')
      assert.equal(parsed.countryCode, 'US')
      assert.equal(parsed.zip, '98101')
      assert.equal(parsed.phone, '+12065550199')
    })
  })
})
