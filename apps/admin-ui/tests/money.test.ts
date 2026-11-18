import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { formatCentsInput, formatMoney, getCurrencyDigits, toCents } from '../src/lib/money'

describe('getCurrencyDigits', () => {
  test('returns correct fraction digits for currency codes', () => {
    assert.equal(getCurrencyDigits('USD'), 2)
    assert.equal(getCurrencyDigits('JPY'), 0)
    assert.equal(getCurrencyDigits('KRW'), 0)
    assert.equal(getCurrencyDigits('BHD'), 3)
    assert.equal(getCurrencyDigits('KWD'), 3)
    assert.equal(getCurrencyDigits(undefined), 2)
  })
})

describe('formatMoney', () => {
  test('formats 2-decimal currencies (USD)', () => {
    assert.equal(formatMoney(1999, 'USD'), '$19.99')
    assert.equal(formatMoney(500, 'USD'), '$5.00')
    assert.equal(formatMoney(0, 'USD'), '$0.00')
  })

  test('formats 0-decimal currencies (JPY) without dividing by 100', () => {
    assert.equal(formatMoney(1000, 'JPY'), '¥1,000')
    assert.equal(formatMoney(250, 'JPY'), '¥250')
    assert.equal(formatMoney(0, 'JPY'), '¥0')
  })

  test('formats 3-decimal currencies (BHD)', () => {
    assert.equal(formatMoney(1250, 'BHD'), 'BHD\u00A01.250')
  })
})

describe('toCents', () => {
  test('parses decimal amounts for default/USD currency', () => {
    assert.equal(toCents('19.99'), 1999)
    assert.equal(toCents('5'), 500)
    assert.equal(toCents('1,250.5'), 125050)
    assert.equal(toCents(' 0.10 '), 10)
    assert.equal(toCents('0'), 0)
  })
  test('parses amounts for 0-decimal currencies (JPY)', () => {
    assert.equal(toCents('1000', 'JPY'), 1000)
    assert.equal(toCents('250', 'JPY'), 250)
    assert.ok(Number.isNaN(toCents('12.50', 'JPY'))) // Decimals invalid in JPY
  })
  test('parses amounts for 3-decimal currencies (BHD)', () => {
    assert.equal(toCents('1.250', 'BHD'), 1250)
    assert.equal(toCents('0.5', 'BHD'), 500)
    assert.ok(Number.isNaN(toCents('1.2345', 'BHD'))) // Too many decimals
  })
  test('empty means null', () => {
    assert.equal(toCents(''), null)
    assert.equal(toCents('   '), null)
  })
  test('junk is NaN', () => {
    for (const junk of ['abc', 'NaN', '1.234', '1e5', '1.2.3', '.', '-', '--5', '$5'])
      assert.ok(Number.isNaN(toCents(junk)), junk)
  })
})

describe('formatCentsInput', () => {
  test('formats finite numbers with default 2 decimals', () => {
    assert.equal(formatCentsInput(1999), '19.99')
    assert.equal(formatCentsInput(0), '0.00')
  })
  test('formats numbers with currency precision', () => {
    assert.equal(formatCentsInput(1000, 'JPY'), '1000')
    assert.equal(formatCentsInput(1250, 'BHD'), '1.250')
  })
  test('never renders NaN', () => {
    for (const v of [null, undefined, Number.NaN, Infinity, 'abc' as unknown as number])
      assert.equal(formatCentsInput(v), '')
  })
})
