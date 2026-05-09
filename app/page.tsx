'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { getMoleculeNamesRows } from '@/lib/molecule-names-data'

const MOLECULE = 'Methimazole'

type ViewTab = 'methimazole' | 'molecule-names'

export type MasterRow = Record<string, string | number | null>

type MasterPayload = {
  headers: string[]
  rows: MasterRow[]
}

function formatCell(value: string | number | null): string {
  if (value == null) return '—'
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toLocaleString()
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 })
  }
  return String(value)
}

function isNumericHeader(h: string): boolean {
  return h === '2025 Value' || h === '2025 Volume'
}

function totals(rows: MasterRow[]) {
  let value = 0
  let volume = 0
  for (const r of rows) {
    const v = r['2025 Value']
    const vol = r['2025 Volume']
    if (typeof v === 'number') value += v
    if (typeof vol === 'number') volume += vol
  }
  return { value, volume }
}

function filterByMolecule(rows: MasterRow[], molecule: string): MasterRow[] {
  const q = molecule.trim().toLowerCase()
  return rows.filter((r) => {
    const v = r.Molecule
    if (v == null) return false
    return String(v).trim().toLowerCase() === q
  })
}

const HIDDEN_COLUMNS = new Set(['Molecule'])

function isHiddenColumn(h: string): boolean {
  return HIDDEN_COLUMNS.has(String(h).trim())
}

function MoleculeNamesTable() {
  const gridRows = useMemo(() => getMoleculeNamesRows(), [])

  const headerClass =
    'border border-neutral-400 bg-amber-200 px-3 py-3.5 text-center text-base font-semibold text-neutral-900 box-border'
  const bodyCellClass =
    'border border-neutral-400 bg-white px-3 py-2.5 text-left text-sm text-neutral-900 align-middle min-h-[2.75rem] box-border'

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-300/30 ring-1 ring-slate-900/5 overflow-hidden">
      <div className="overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[640px] table-fixed border-collapse">
          <colgroup>
            {Array.from({ length: 6 }, (_, i) => (
              <col key={i} style={{ width: `${100 / 6}%` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={6} className={headerClass}>
                Molecule Names
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {gridRows.map((cells, ri) => (
              <tr key={ri}>
                {cells.map((cell, ci) => (
                  <td key={ci} className={bodyCellClass}>
                    {cell || '\u00a0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('methimazole')
  const [headers, setHeaders] = useState<string[]>([])
  const [allRows, setAllRows] = useState<MasterRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/data/master-data.json', { cache: 'no-store' })
        if (!res.ok) {
          throw new Error(`Could not load master data (${res.status})`)
        }
        const body = (await res.json()) as MasterPayload
        if (cancelled) return
        if (!Array.isArray(body.headers) || !Array.isArray(body.rows)) {
          throw new Error('Invalid master-data.json shape')
        }
        setHeaders(body.headers)
        setAllRows(body.rows)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load master data.')
          setHeaders([])
          setAllRows([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => filterByMolecule(allRows, MOLECULE), [allRows])
  const displayHeaders = useMemo(() => headers.filter((h) => !isHiddenColumn(h)), [headers])
  const { value: sumValue, volume: sumVolume } = useMemo(() => totals(rows), [rows])

  const subBarRight =
    activeTab === 'methimazole' ? (
      <span className="text-sky-900/90">{MOLECULE}</span>
    ) : (
      <span className="text-sky-900/90">Molecule Names</span>
    )

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-sky-50/40 text-slate-900">
      <header className="border-b border-slate-300/80 shadow-sm">
        <div className="bg-[#f0f2f5]">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-6 sm:py-7 flex items-center gap-4">
            <div className="shrink-0 flex items-center">
              <Image
                src="/logo.png"
                alt="Coherent Market Insights"
                width={200}
                height={64}
                className="h-auto w-auto max-h-[3.25rem] sm:max-h-16 w-[min(100%,11rem)] sm:w-[13rem]"
                priority
              />
            </div>
            <div className="flex-1 flex justify-center min-w-0 px-2">
              <div className="text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Coherent Dashboard</h1>
                <p className="mt-1 text-sm sm:text-base font-normal text-black">
                  Indian Animal Pharmaceutical Drug Market
                </p>
              </div>
            </div>
            <div className="shrink-0 w-[11rem] sm:w-[13rem] hidden lg:block" aria-hidden />
          </div>
        </div>
        <div className="bg-[#dfe3e8] border-t border-slate-300/60">
          <div className="mx-auto max-w-[1600px] px-4 sm:px-8 py-2.5 sm:py-3">
            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-snug">
              Master Data for Indian Animal Pharmaceutical Drug Market <span className="text-slate-500">|</span>{' '}
              {subBarRight}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-8 flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-72 shrink-0">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-200/50 ring-1 ring-slate-900/5 lg:sticky lg:top-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">View</h2>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('methimazole')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'methimazole'
                    ? 'bg-gradient-to-r from-sky-600 to-slate-800 text-white shadow-md shadow-sky-900/25'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                }`}
              >
                {MOLECULE}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('molecule-names')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === 'molecule-names'
                    ? 'bg-gradient-to-r from-sky-600 to-slate-800 text-white shadow-md shadow-sky-900/25'
                    : 'bg-slate-50 text-slate-800 border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
                }`}
              >
                Molecule Names
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          {activeTab === 'molecule-names' ? (
            <MoleculeNamesTable />
          ) : (
            <>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </div>
              )}

              {loading && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600 text-sm">
                  Loading master data…
                </div>
              )}

              {!loading && !error && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-md shadow-slate-200/40 ring-1 ring-slate-900/5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Filtered rows</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{rows.length}</p>
                      <p className="text-xs text-slate-500 mt-1">For {MOLECULE}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-md shadow-slate-200/40 ring-1 ring-slate-900/5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Σ 2025 value</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                        {sumValue.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Filtered sum</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-md shadow-slate-200/40 ring-1 ring-slate-900/5">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Σ 2025 volume</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                        {sumVolume.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Filtered sum</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl shadow-slate-300/30 ring-1 ring-slate-900/5 flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                      <h2 className="text-lg font-semibold text-slate-900">{MOLECULE}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Complete Master Data table for this molecule — {rows.length.toLocaleString()} row
                        {rows.length === 1 ? '' : 's'} · scroll to view all
                      </p>
                    </div>

                    {rows.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center p-16 text-slate-500 text-sm">
                        No rows for this molecule in Master Data.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border-collapse">
                          <thead className="sticky top-0 z-20 shadow-sm">
                            <tr className="bg-gradient-to-r from-slate-800 via-slate-800 to-sky-900 text-white">
                              {displayHeaders.map((h) => (
                                <th
                                  key={h}
                                  scope="col"
                                  className={`px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                                    isNumericHeader(h) ? 'text-right' : 'text-left'
                                  }`}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, ri) => (
                              <tr
                                key={`${MOLECULE}-${ri}`}
                                className={`border-b border-slate-100 transition-colors hover:bg-sky-50/60 ${
                                  ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                                }`}
                              >
                                {displayHeaders.map((h) => (
                                  <td
                                    key={h}
                                    className={`px-4 py-3 whitespace-nowrap text-slate-800 ${
                                      isNumericHeader(h) ? 'text-right tabular-nums font-medium text-slate-900' : ''
                                    }`}
                                  >
                                    {formatCell(row[h] ?? null)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
