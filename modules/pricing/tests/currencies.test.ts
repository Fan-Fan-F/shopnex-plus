import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import {
  convertMoney,
  convertPricingInput,
  getCurrencyDecimals,
  roundToCharm,
} from '../src/currencies'

describe('currencies & multi-currency pricing', () => {
  describe('getCurrencyDecimals', () => {
    test('identifies zero-decimal currencies', () => {
      assert.equal(getCurrencyDecimals('JPY'), 0)
      assert.equal(getCurrencyDecimals('jpy'), 0)
      assert.equal(getCurrencyDecimals('KRW'), 0)
      assert.equal(getCurrencyDecimals('VND'), 0)
      assert.equal(getCurrencyDecimals('CLP'), 0)
    })

    test('identifies three-decimal currencies', () => {
      assert.equal(getCurrencyDecimals('BHD'), 3)
      assert.equal(getCurrencyDecimals('kwd'), 3)
      assert.equal(getCurrencyDecimals('OMR'), 3)
      assert.equal(getCurrencyDecimals('JOD'), 3)
    })

    test('defaults to two decimals for standard currencies', () => {
      assert.equal(getCurrencyDecimals('USD'), 2)
      assert.equal(getCurrencyDecimals('EUR'), 2)
      assert.equal(getCurrencyDecimals('GBP'), 2)
      assert.equal(getCurrencyDecimals('CNY'), 2)
      assert.equal(getCurrencyDecimals('AUD'), 2)
    })
  })

  describe('roundToCharm', () => {
    test('handles 2-decimal currencies', () => {
      // 1942 cents ($19.42)
      assert.equal(roundToCharm(1942, 'USD', 'none'), 1942)
      assert.equal(roundToCharm(1942, 'USD', '99'), 1999)
      assert.equal(roundToCharm(1942, 'USD', '95'), 1995)
      assert.equal(roundToCharm(1942, 'USD', '00'), 1900)
      assert.equal(roundToCharm(1968, 'USD', '00'), 2000)
    })

    test('handles 0-decimal currencies (JPY)', () => {
      // 2540 yen
      assert.equal(roundToCharm(2540, 'JPY', 'none'), 2540)
      assert.equal(roundToCharm(2540, 'JPY', '99'), 2599)
      assert.equal(roundToCharm(2540, 'JPY', '95'), 2595)
      assert.equal(roundToCharm(2540, 'JPY', '00'), 2500)
      assert.equal(roundToCharm(2580, 'JPY', '00'), 2600)
    })

    test('handles 3-decimal currencies (BHD)', () => {
      // 1420 fils (1.420 BHD)
      assert.equal(roundToCharm(1420, 'BHD', 'none'), 1420)
      assert.equal(roundToCharm(1420, 'BHD', '99'), 1990)
      assert.equal(roundToCharm(1420, 'BHD', '95'), 1950)
      assert.equal(roundToCharm(1420, 'BHD', '00'), 1000)
      assert.equal(roundToCharm(1600, 'BHD', '00'), 2000)
    })

    test('ignores zero or negative amounts', () => {
      assert.equal(roundToCharm(0, 'USD', '99'), 0)
      assert.equal(roundToCharm(-50, 'USD', '99'), -50)
    })
  })

  describe('convertMoney', () => {
    const rates = {
      EUR: 0.92,
      JPY: 155.0,
      BHD: 0.376,
      CAD: 1.35,
    }

    test('returns exact amount when base and target currencies match', () => {
      const res = convertMoney({
        amountMinor: 1999,
        baseCurrency: 'USD',
        targetCurrency: 'USD',
        rates,
      })
      assert.equal(res.amountMinor, 1999)
      assert.equal(res.currencyCode, 'USD')
      assert.equal(res.rate, 1)
      assert.equal(res.decimals, 2)
    })

    test('converts USD to EUR (2 decimals to 2 decimals)', () => {
      // $100.00 (10000 cents) * 0.92 = 92.00 EUR (9200 cents)
      const res = convertMoney({
        amountMinor: 10000,
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rates,
      })
      assert.equal(res.amountMinor, 9200)
      assert.equal(res.currencyCode, 'EUR')
      assert.equal(res.decimals, 2)
    })

    test('converts USD to JPY (2 decimals to 0 decimals)', () => {
      // $20.00 (2000 cents) * 155.0 = 3100 JPY
      const res = convertMoney({
        amountMinor: 2000,
        baseCurrency: 'USD',
        targetCurrency: 'JPY',
        rates,
      })
      assert.equal(res.amountMinor, 3100)
      assert.equal(res.currencyCode, 'JPY')
      assert.equal(res.decimals, 0)
    })

    test('converts USD to BHD (2 decimals to 3 decimals)', () => {
      // $10.00 (1000 cents) * 0.376 = 3.760 BHD = 3760 fils
      const res = convertMoney({
        amountMinor: 1000,
        baseCurrency: 'USD',
        targetCurrency: 'BHD',
        rates,
      })
      assert.equal(res.amountMinor, 3760)
      assert.equal(res.currencyCode, 'BHD')
      assert.equal(res.decimals, 3)
    })

    test('applies FX margin buffer correctly', () => {
      // $100.00 * 0.92 * 1.05 (5% margin) = 96.60 EUR = 9660 cents
      const res = convertMoney({
        amountMinor: 10000,
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rates,
        marginPercent: 5,
      })
      assert.equal(res.amountMinor, 9660)
    })

    test('applies charm pricing on converted amount', () => {
      // $19.99 * 0.92 = 18.3908 EUR
      // With charm '99' -> 18.99 EUR (1899 cents)
      const res = convertMoney({
        amountMinor: 1999,
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rates,
        charm: '99',
      })
      assert.equal(res.amountMinor, 1899)
    })

    test('converts cross-currencies via common base', () => {
      // CAD to EUR (CAD=1.35, EUR=0.92)
      // 135 CAD = 100 USD = 92 EUR
      const res = convertMoney({
        amountMinor: 13500, // 135.00 CAD
        baseCurrency: 'CAD',
        targetCurrency: 'EUR',
        rates,
      })
      assert.equal(res.amountMinor, 9200)
    })

    test('throws for missing exchange rates', () => {
      assert.throws(
        () =>
          convertMoney({
            amountMinor: 1000,
            baseCurrency: 'USD',
            targetCurrency: 'XYZ',
            rates,
          }),
        /Missing exchange rate/,
      )
    })

    test('throws for invalid exchange rates', () => {
      assert.throws(
        () =>
          convertMoney({
            amountMinor: 1000,
            baseCurrency: 'USD',
            targetCurrency: 'EUR',
            rates: { EUR: -0.5 },
          }),
        /Invalid exchange rate/,
      )
    })
  })

  describe('convertPricingInput', () => {
    const rates = { EUR: 0.9 }

    test('converts lines and shipping for pricing pipeline', () => {
      const res = convertPricingInput({
        lines: [1000, 2000], // $10.00, $20.00
        shippingCents: 500, // $5.00
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        rates,
        charm: 'none',
      })

      assert.deepEqual(res.lines, [900, 1800]) // 9.00 EUR, 18.00 EUR
      assert.equal(res.shippingCents, 450) // 4.50 EUR
      assert.equal(res.currencyCode, 'EUR')
      assert.equal(res.rate, 0.9)
    })
  })
})
