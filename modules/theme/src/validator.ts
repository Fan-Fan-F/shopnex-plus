// Validates theme packages before import or activation: directory structure, required templates,
// path traversal safety, settings_schema.json format, and Liquid syntax.
import { checkLiquid } from './code'

export const VALID_THEME_DIRS = [
  'layout',
  'templates',
  'sections',
  'snippets',
  'assets',
  'config',
  'locales',
] as const

export type ValidThemeDir = (typeof VALID_THEME_DIRS)[number]

export type ThemeValidationIssue = {
  type: 'error' | 'warning'
  code: string
  file?: string
  message: string
  line?: number | null
}

export type ThemeValidationResult = {
  valid: boolean
  issues: ThemeValidationIssue[]
  stats: {
    totalFiles: number
    liquidFiles: number
    assetFiles: number
    configFiles: number
  }
}

/**
 * Checks if a relative path inside a theme package is safe (no path traversal, valid directory).
 */
export function isSafeThemePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false
  const normalized = filePath.replace(/\\/g, '/').trim()
  if (normalized.startsWith('/') || normalized.includes('//')) return false
  if (normalized.includes('..') || normalized.includes('\0')) return false

  const parts = normalized.split('/')
  if (parts.length < 2) return false
  const topDir = parts[0]!

  return (VALID_THEME_DIRS as readonly string[]).includes(topDir)
}

/**
 * Validates a theme file collection (e.g. { "layout/theme.liquid": "...", ... }).
 */
export function validateThemePackage(files: Record<string, string>): ThemeValidationResult {
  const issues: ThemeValidationIssue[] = []
  const filePaths = Object.keys(files)

  let liquidFiles = 0
  let assetFiles = 0
  let configFiles = 0

  if (filePaths.length === 0) {
    issues.push({
      type: 'error',
      code: 'EMPTY_THEME',
      message: 'Theme package contains no files',
    })
    return {
      valid: false,
      issues,
      stats: { totalFiles: 0, liquidFiles: 0, assetFiles: 0, configFiles: 0 },
    }
  }

  // 1. Path safety and directory categorization
  for (const path of filePaths) {
    if (!isSafeThemePath(path)) {
      issues.push({
        type: 'error',
        code: 'INVALID_PATH',
        file: path,
        message: `File path '${path}' is outside allowed theme directories or contains unsafe traversal characters`,
      })
      continue
    }

    if (path.startsWith('assets/')) {
      assetFiles++
    } else if (path.startsWith('config/')) {
      configFiles++
    }

    if (path.endsWith('.liquid')) {
      liquidFiles++
      const content = files[path] ?? ''
      const problem = checkLiquid(content)
      if (problem) {
        issues.push({
          type: 'error',
          code: 'LIQUID_SYNTAX_ERROR',
          file: path,
          message: problem.message,
          line: problem.line,
        })
      }
    }
  }

  // 2. Required core templates
  const hasLayoutTheme = filePaths.some((p) => p === 'layout/theme.liquid')
  if (!hasLayoutTheme) {
    issues.push({
      type: 'error',
      code: 'MISSING_REQUIRED_FILE',
      file: 'layout/theme.liquid',
      message: "Theme is missing the required main layout template 'layout/theme.liquid'",
    })
  }

  const hasIndexTemplate = filePaths.some((p) => p === 'templates/index.liquid' || p === 'templates/index.json')
  if (!hasIndexTemplate) {
    issues.push({
      type: 'error',
      code: 'MISSING_REQUIRED_FILE',
      file: 'templates/index.liquid',
      message: "Theme is missing the homepage template ('templates/index.liquid' or 'templates/index.json')",
    })
  }

  // 3. Recommended files
  const hasProductTemplate = filePaths.some((p) => p.startsWith('templates/product.'))
  if (!hasProductTemplate) {
    issues.push({
      type: 'warning',
      code: 'MISSING_RECOMMENDED_FILE',
      file: 'templates/product.liquid',
      message: "Theme does not provide a product page template ('templates/product.liquid' or 'templates/product.json')",
    })
  }

  // 4. Validate settings_schema.json if present
  const schemaPath = 'config/settings_schema.json'
  if (files[schemaPath]) {
    try {
      const parsed = JSON.parse(files[schemaPath]!)
      if (!Array.isArray(parsed)) {
        issues.push({
          type: 'error',
          code: 'INVALID_SETTINGS_SCHEMA',
          file: schemaPath,
          message: "'config/settings_schema.json' must be a JSON array of setting sections",
        })
      } else {
        for (let i = 0; i < parsed.length; i++) {
          const section = parsed[i]
          if (!section || typeof section !== 'object' || typeof section.name !== 'string') {
            issues.push({
              type: 'error',
              code: 'INVALID_SETTINGS_SCHEMA_SECTION',
              file: schemaPath,
              message: `Section at index ${i} in 'config/settings_schema.json' must have a 'name' property`,
            })
          }
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        code: 'INVALID_JSON',
        file: schemaPath,
        message: `Failed to parse '${schemaPath}': ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  // 5. Validate settings_data.json if present
  const dataPath = 'config/settings_data.json'
  if (files[dataPath]) {
    try {
      const parsed = JSON.parse(files[dataPath]!)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        issues.push({
          type: 'error',
          code: 'INVALID_SETTINGS_DATA',
          file: dataPath,
          message: "'config/settings_data.json' must be a JSON object",
        })
      }
    } catch (error) {
      issues.push({
        type: 'error',
        code: 'INVALID_JSON',
        file: dataPath,
        message: `Failed to parse '${dataPath}': ${error instanceof Error ? error.message : String(error)}`,
      })
    }
  }

  const hasErrors = issues.some((i) => i.type === 'error')

  return {
    valid: !hasErrors,
    issues,
    stats: {
      totalFiles: filePaths.length,
      liquidFiles,
      assetFiles,
      configFiles,
    },
  }
}
