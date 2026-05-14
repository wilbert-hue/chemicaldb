/**
 * Reads Mainchemical.xlsx → Sheet "Master Data" (headers row 5, data row 6+)
 * and writes public/data/master-data.json with all columns including 2023–2028
 * Value / Volume and CAGR fields, mirroring Excel.
 */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const ROOT = path.join(__dirname, '..')
const WORKBOOK_PATH = path.join(ROOT, 'Mainchemical.xlsx')
const SHEET_NAME = 'Master Data'
const HEADER_ROW_INDEX = 4
const FIRST_DATA_ROW_INDEX = 5
const OUT_FILE = path.join(ROOT, 'public', 'data', 'master-data.json')

const PIVOT_SHEET_NAME = 'Pivot Table'

function normalizeHeader(cell, index) {
  const s = String(cell ?? '').trim()
  return s || `col_${index}`
}

function isNumericColumnName(name) {
  const t = String(name ?? '').trim()
  return /\d{4}\s+(Value|Volume)$/.test(t) || /CAGR$/i.test(t)
}

function cellToValue(headerKey, raw) {
  if (raw === '' || raw === undefined || raw === null) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (!t) return null
    if (isNumericColumnName(headerKey)) {
      const n = Number(t.replace(/,/g, ''))
      return Number.isFinite(n) ? n : t
    }
    return t
  }
  return String(raw).trim() || null
}

/**
 * Reads the pivot "Grand Total" row (Excel footer total for the Methimazole pivot).
 * Σ 2025 Volume in the dashboard uses this total so it matches Excel (54,706) rather than
 * the raw sum of Master Data detail volumes (different basis in your workbook — 831,417).
 */
function readPivotGrandTotals(matrix) {
  if (!matrix?.length) return null
  let headerRowIdx = -1
  for (let i = 0; i < matrix.length; i++) {
    const cell0 = matrix[i]?.[0]
    if (cell0 != null && String(cell0).trim() === 'Row Labels') {
      headerRowIdx = i
      break
    }
  }
  if (headerRowIdx === -1) return null

  const headerRow = matrix[headerRowIdx] ?? []
  const headerNames = headerRow.map((h, i) => normalizeHeader(h, i))

  let totalRow = null
  for (let i = headerRowIdx + 1; i < matrix.length; i++) {
    const row = matrix[i]
    if (!row?.length) continue
    if (String(row[0] ?? '').trim() === 'Grand Total') {
      totalRow = row
      break
    }
  }
  if (!totalRow) return null

  const out = {}
  for (let c = 1; c < headerNames.length; c++) {
    const key = String(headerNames[c] ?? '').trim()
    if (!key || key.startsWith('col_')) continue
    const raw = totalRow[c]
    if (raw === '' || raw === undefined || raw === null) continue
    const num = cellToValue(key, raw)
    if (typeof num === 'number' && Number.isFinite(num)) {
      out[key] = num
    }
  }
  return out
}

function main() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Missing workbook: ${WORKBOOK_PATH}`)
  }

  const workbook = XLSX.readFile(WORKBOOK_PATH, { cellDates: true })
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found in Mainchemical.xlsx`)

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (matrix.length <= FIRST_DATA_ROW_INDEX) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
    fs.writeFileSync(OUT_FILE, JSON.stringify({ headers: [], rows: [] }), 'utf8')
    console.log('Wrote empty master-data.json')
    return
  }

  const headerCells = matrix[HEADER_ROW_INDEX] ?? []
  const headers = headerCells.map((h, i) => normalizeHeader(h, i))

  const rows = []
  for (let r = FIRST_DATA_ROW_INDEX; r < matrix.length; r++) {
    const line = matrix[r]
    if (!line || !line.some((c) => c !== '' && c != null)) continue

    const obj = {}
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c]
      obj[key] = cellToValue(key, line[c])
    }
    rows.push(obj)
  }

  const displayHeaders = headers.filter((h, i) => !(h === 'col_0' && i === 0))
  const trimmedRows = rows.map((row) => {
    const next = {}
    for (const h of displayHeaders) {
      next[h] = row[h] ?? null
    }
    return next
  })

  let pivotGrandTotals = null
  const pivotSheet = workbook.Sheets[PIVOT_SHEET_NAME]
  if (pivotSheet) {
    const pivotMatrix = XLSX.utils.sheet_to_json(pivotSheet, { header: 1, defval: '' })
    pivotGrandTotals = readPivotGrandTotals(pivotMatrix)
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
  const payload = {
    meta: {
      source: 'Mainchemical.xlsx',
      sheet: SHEET_NAME,
      exportedAt: new Date().toISOString(),
      rowCount: trimmedRows.length,
      pivotGrandTotals,
    },
    headers: displayHeaders,
    rows: trimmedRows,
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload), 'utf8')
  console.log(`Wrote ${OUT_FILE} (${trimmedRows.length} rows, ${displayHeaders.length} columns)`)
}

main()
