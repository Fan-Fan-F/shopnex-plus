import assert from 'node:assert/strict'
import test, { describe } from 'node:test'
import { isSafeThemePath, validateThemePackage } from '../src/validator'

describe('theme package validator', () => {
  describe('isSafeThemePath', () => {
    test('accepts valid paths in allowed directories', () => {
      assert.ok(isSafeThemePath('layout/theme.liquid'))
      assert.ok(isSafeThemePath('templates/index.liquid'))
      assert.ok(isSafeThemePath('templates/product.json'))
      assert.ok(isSafeThemePath('sections/header.liquid'))
      assert.ok(isSafeThemePath('snippets/icon.liquid'))
      assert.ok(isSafeThemePath('assets/main.css'))
      assert.ok(isSafeThemePath('config/settings_schema.json'))
      assert.ok(isSafeThemePath('locales/en.default.json'))
    })

    test('rejects path traversal attempts', () => {
      assert.equal(isSafeThemePath('../evil.liquid'), false)
      assert.equal(isSafeThemePath('templates/../../evil.liquid'), false)
      assert.equal(isSafeThemePath('/layout/theme.liquid'), false)
      assert.equal(isSafeThemePath('layout//theme.liquid'), false)
      assert.equal(isSafeThemePath('layout/\0evil.liquid'), false)
    })

    test('rejects unauthorized root directories', () => {
      assert.equal(isSafeThemePath('node_modules/package.json'), false)
      assert.equal(isSafeThemePath('secrets/credentials.env'), false)
      assert.equal(isSafeThemePath('random.txt'), false)
    })
  })

  describe('validateThemePackage', () => {
    const validTheme = {
      'layout/theme.liquid': '<html><body>{{ content_for_layout }}</body></html>',
      'templates/index.liquid': '<h1>Welcome</h1>',
      'templates/product.liquid': '<h1>{{ product.title }}</h1>',
      'config/settings_schema.json': JSON.stringify([
        {
          name: 'General',
          settings: [{ type: 'color', id: 'bg_color', label: 'Background' }],
        },
      ]),
      'config/settings_data.json': JSON.stringify({ current: { bg_color: '#fff' } }),
    }

    test('passes for a well-formed theme package', () => {
      const result = validateThemePackage(validTheme)
      assert.equal(result.valid, true)
      assert.equal(result.issues.length, 0)
      assert.equal(result.stats.totalFiles, 5)
      assert.equal(result.stats.liquidFiles, 3)
      assert.equal(result.stats.configFiles, 2)
    })

    test('fails for an empty theme package', () => {
      const result = validateThemePackage({})
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'EMPTY_THEME'))
    })

    test('fails when missing required layout/theme.liquid', () => {
      const files = {
        'templates/index.liquid': '<h1>Welcome</h1>',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'MISSING_REQUIRED_FILE' && i.file === 'layout/theme.liquid'))
    })

    test('fails when missing required homepage index template', () => {
      const files = {
        'layout/theme.liquid': '<html></html>',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'MISSING_REQUIRED_FILE' && i.file === 'templates/index.liquid'))
    })

    test('warns when missing recommended product template', () => {
      const files = {
        'layout/theme.liquid': '<html></html>',
        'templates/index.liquid': '<h1>Home</h1>',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, true) // Only a warning, not fatal error
      assert.ok(result.issues.some((i) => i.code === 'MISSING_RECOMMENDED_FILE'))
    })

    test('detects unsafe path traversals and invalid directories', () => {
      const files = {
        ...validTheme,
        '../etc/passwd': 'root:x:0:0',
        'unauthorized/file.txt': 'data',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'INVALID_PATH'))
    })

    test('detects Liquid template syntax errors', () => {
      const files = {
        ...validTheme,
        'templates/index.liquid': '{% if unclosed %} hello',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'LIQUID_SYNTAX_ERROR'))
    })

    test('detects invalid settings_schema.json format', () => {
      const files = {
        ...validTheme,
        'config/settings_schema.json': '{"not": "an array"}',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'INVALID_SETTINGS_SCHEMA'))
    })

    test('detects invalid JSON in configuration files', () => {
      const files = {
        ...validTheme,
        'config/settings_data.json': '{ broken json',
      }
      const result = validateThemePackage(files)
      assert.equal(result.valid, false)
      assert.ok(result.issues.some((i) => i.code === 'INVALID_JSON'))
    })
  })
})
