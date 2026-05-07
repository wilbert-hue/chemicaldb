/**
 * Reads Pivot-Indian Animal Pharmaceutical Drug market.xlsx → Master Data
 * and writes public/data/master-data.json for the dashboard.
 */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const WORKBOOK_BASENAME = 'Pivot-Indian Animal Pharmaceutical Drug market.xlsx'
const SHEET_NAME = 'Master Data'
const HEADER_ROW_INDEX = 4
const FIRST_DATA_ROW_INDEX = 5

function normalizeHeader(cell, index) {
  const s = String(cell ?? '').trim()
  return s || `col_${index}`
}

function resolveWorkbookPath() {
  const root = path.join(__dirname, '..')
  const local = path.join(root, WORKBOOK_BASENAME)
  if (fs.existsSync(local)) return local
  const env = process.env.MASTER_DATA_XLSX_PATH
  if (env && fs.existsSync(env)) return env
  throw new Error(
    `Workbook not found. Put "${WORKBOOK_BASENAME}" in the project root or set MASTER_DATA_XLSX_PATH.`
  )
}

function main() {
  const workbookPath = resolveWorkbookPath()
  const outDir = path.join(__dirname, '..', 'public', 'data')
  const outFile = path.join(outDir, 'master-data.json')

  const workbook = XLSX.readFile(workbookPath)
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) {
    throw new Error(`Sheet "${SHEET_NAME}" not found`)
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (matrix.length <= FIRST_DATA_ROW_INDEX) {
    fs.mkdirSync(outDir, { recursive: true })
    fs.writeFileSync(outFile, JSON.stringify({ headers: [], rows: [] }), 'utf8')
    console.log('Wrote empty master-data.json (no data rows)')
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
      const raw = line[c]
      if (raw === '' || raw === undefined) {
        obj[key] = null
      } else if (typeof raw === 'number') {
        obj[key] = raw
      } else {
        obj[key] = String(raw).trim() || null
      }
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

  fs.mkdirSync(outDir, { recursive: true })
  const payload = {
    meta: {
      source: WORKBOOK_BASENAME,
      sheet: SHEET_NAME,
      exportedAt: new Date().toISOString(),
      rowCount: trimmedRows.length,
    },
    headers: displayHeaders,
    rows: trimmedRows,
  }
  fs.writeFileSync(outFile, JSON.stringify(payload), 'utf8')
  console.log(`Wrote ${outFile} (${trimmedRows.length} rows)`)
}

main()
