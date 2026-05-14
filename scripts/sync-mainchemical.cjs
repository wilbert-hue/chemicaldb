/**
 * Updates Mainchemical.xlsx — "Molecules Names" sheet only — from lib/molecule-names-data.ts.
 * Master Data stays authoritative in Excel; run export-mainchemical-master-json.cjs for the dashboard JSON.
 */
const fs = require('fs')
const path = require('path')
const XLSX = require('xlsx')

const ROOT = path.join(__dirname, '..')
const XLSX_PATH = path.join(ROOT, 'Mainchemical.xlsx')
const MOLECULE_TS = path.join(ROOT, 'lib', 'molecule-names-data.ts')

/** Parse `MOLECULE_NAMES_COLUMNS` from molecule-names-data.ts (single-quoted string arrays). */
function loadMoleculeNamesColumnsFromTs(filePath) {
  const src = fs.readFileSync(filePath, 'utf8')
  const marker = 'MOLECULE_NAMES_COLUMNS'
  const mi = src.indexOf(marker)
  if (mi === -1) throw new Error(`${filePath}: missing ${marker}`)
  const eq = src.indexOf('=', mi)
  if (eq === -1) throw new Error(`${filePath}: missing = after ${marker}`)
  const open = src.indexOf('[', eq)
  if (open === -1) throw new Error(`${filePath}: missing opening [ for columns`)

  let i = open
  if (src[i] !== '[') throw new Error('Expected [')
  i++
  const columns = []

  function readString(start) {
    let j = start
    if (src[j] !== "'") throw new Error(`Expected ' at ${j}`)
    j++
    let s = ''
    while (j < src.length) {
      const c = src[j]
      if (c === '\\') {
        j++
        if (j < src.length) s += src[j++]
        continue
      }
      if (c === "'") {
        j++
        return { value: s, next: j }
      }
      s += c
      j++
    }
    throw new Error('Unterminated string')
  }

  while (true) {
    while (i < src.length && /\s/.test(src[i])) i++
    if (src[i] === ']') {
      i++
      break
    }
    if (src[i] !== '[') {
      throw new Error(`${filePath}: expected column array at offset ${i}`)
    }
    i++
    const col = []
    while (true) {
      while (i < src.length && /\s/.test(src[i])) i++
      if (src[i] === ']') {
        i++
        break
      }
      const { value, next } = readString(i)
      col.push(value)
      i = next
      while (i < src.length && /\s/.test(src[i])) i++
      if (src[i] === ',') i++
    }
    columns.push(col)
    while (i < src.length && /\s/.test(src[i])) i++
    if (src[i] === ',') i++
  }

  if (columns.length !== 6) {
    throw new Error(`${filePath}: expected 6 molecule columns, got ${columns.length}`)
  }
  return columns
}

function getMoleculeGridRows(moleculeColumns) {
  const max = Math.max(...moleculeColumns.map((c) => c.length))
  const out = []
  for (let i = 0; i < max; i++) {
    out.push(moleculeColumns.map((col) => col[i] ?? ''))
  }
  return out
}

function main() {
  const wb = XLSX.readFile(XLSX_PATH, { cellDates: true })

  const molSheetName = 'Molecules Names'
  if (!wb.Sheets[molSheetName]) {
    throw new Error(`Sheet "${molSheetName}" not found`)
  }
  const moleculeColumns = loadMoleculeNamesColumnsFromTs(MOLECULE_TS)
  const grid = getMoleculeGridRows(moleculeColumns)
  const molMatrix = []
  molMatrix.push([null, null, null, null, null, null, null])
  molMatrix.push([null, 'Molecule Names', null, null, null, null, null])
  for (const line of grid) {
    molMatrix.push([null, ...line])
  }
  wb.Sheets[molSheetName] = XLSX.utils.aoa_to_sheet(molMatrix)

  XLSX.writeFile(wb, XLSX_PATH)
  console.log(`Updated ${XLSX_PATH}: Molecules Names (${grid.length} grid rows)`)
}

main()
