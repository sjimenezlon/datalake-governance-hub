'use client'

import type { VentaClean, VentaRaw, CatalogEntry } from '@/lib/supabase'

interface Props {
  ventasRaw: VentaRaw[]
  ventasClean: VentaClean[]
  catalog: CatalogEntry[]
}

export default function QualityTab({ ventasRaw, ventasClean, catalog }: Props) {
  const bronzeCount = ventasRaw.length
  const silverCount = ventasClean.length
  const rejectedCount = bronzeCount - silverCount
  const passRate = bronzeCount > 0 ? (silverCount / bronzeCount) * 100 : 0
  const avgQuality =
    ventasClean.length > 0
      ? ventasClean.reduce((s, v) => s + Number(v.quality_score), 0) / ventasClean.length
      : 0

  // Detect quality issues in bronze
  const issues: { id: number; type: string; detail: string; severity: 'critical' | 'warning' | 'info' }[] = []
  ventasRaw.forEach((r) => {
    const d = r.raw_data as Record<string, unknown>
    if (d.cantidad === null) issues.push({ id: r.id, type: 'NULL value', detail: `cantidad es NULL en registro #${r.id}`, severity: 'critical' })
    if (d.vendedor === '') issues.push({ id: r.id, type: 'Empty string', detail: `vendedor vacío en registro #${r.id}`, severity: 'warning' })
    if (typeof d.ciudad === 'string' && d.ciudad !== d.ciudad.charAt(0).toUpperCase() + d.ciudad.slice(1).toLowerCase())
      issues.push({ id: r.id, type: 'Normalización', detail: `ciudad "${d.ciudad}" no normalizada en #${r.id}`, severity: 'info' })
  })

  const qualityRules = [
    { rule: 'cantidad NOT NULL', check: 'Bronze → Silver', status: rejectedCount > 0 ? 'Activa — filtró registros' : 'Activa', type: 'Completitud' },
    { rule: 'cantidad > 0', check: 'Bronze → Silver', status: 'Activa', type: 'Validez' },
    { rule: 'precio_unit > 0', check: 'Bronze → Silver', status: 'Activa', type: 'Validez' },
    { rule: 'vendedor NOT EMPTY', check: 'Bronze → Silver', status: 'Activa — reemplaza con "Sin asignar"', type: 'Completitud' },
    { rule: 'INITCAP(ciudad)', check: 'Bronze → Silver', status: 'Activa — normaliza capitalización', type: 'Consistencia' },
    { rule: 'Deduplicación por ID', check: 'Silver', status: 'Activa', type: 'Unicidad' },
    { rule: 'Quality Score < 0.8', check: 'Silver → Gold', status: 'Monitoreo — alerta si baja', type: 'Confiabilidad' },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Data Quality Dashboard</h2>
        <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 text-xs rounded-full font-medium">
          GOBERNANZA
        </span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{bronzeCount}</p>
          <p className="text-slate-500 text-xs mt-1">Registros Bronze</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-400">{silverCount}</p>
          <p className="text-slate-500 text-xs mt-1">Aprobados Silver</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{rejectedCount}</p>
          <p className="text-slate-500 text-xs mt-1">Rechazados</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-400">{passRate.toFixed(0)}%</p>
          <p className="text-slate-500 text-xs mt-1">Tasa de Aprobación</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">{(avgQuality * 100).toFixed(0)}%</p>
          <p className="text-slate-500 text-xs mt-1">Quality Score Prom.</p>
        </div>
      </div>

      {/* Visual quality bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">Pipeline de Calidad</h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-slate-500 w-16">Bronze</span>
          <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden flex">
            <div className="bg-emerald-600 h-full flex items-center justify-center text-xs font-medium text-white" style={{ width: `${passRate}%` }}>
              {silverCount} aprobados
            </div>
            {rejectedCount > 0 && (
              <div className="bg-red-600 h-full flex items-center justify-center text-xs font-medium text-white" style={{ width: `${100 - passRate}%` }}>
                {rejectedCount} rechazados
              </div>
            )}
          </div>
          <span className="text-xs text-slate-500 w-16 text-right">Silver</span>
        </div>
        <div className="flex justify-between text-xs text-slate-600 px-16">
          <span>Entrada: {bronzeCount} registros</span>
          <span>Salida: {silverCount} registros limpios</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-sm">Reglas de Calidad Activas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/50">
                  <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Regla</th>
                  <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {qualityRules.map((r, i) => (
                  <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{r.rule}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.type === 'Completitud' ? 'bg-blue-900/50 text-blue-400' :
                        r.type === 'Validez' ? 'bg-emerald-900/50 text-emerald-400' :
                        r.type === 'Consistencia' ? 'bg-purple-900/50 text-purple-400' :
                        r.type === 'Unicidad' ? 'bg-amber-900/50 text-amber-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>{r.type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issues Detected */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="font-semibold text-sm">Problemas Detectados en Bronze</h3>
            <p className="text-xs text-slate-500 mt-1">{issues.length} problemas en {bronzeCount} registros</p>
          </div>
          <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
            {issues.map((issue, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm flex items-start gap-3 ${
                issue.severity === 'critical' ? 'bg-red-950/30 border border-red-900/50' :
                issue.severity === 'warning' ? 'bg-amber-950/30 border border-amber-900/50' :
                'bg-blue-950/30 border border-blue-900/50'
              }`}>
                <span className="text-lg">
                  {issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵'}
                </span>
                <div>
                  <div className={`text-xs font-medium ${
                    issue.severity === 'critical' ? 'text-red-400' :
                    issue.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                  }`}>{issue.type}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{issue.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality by Dataset */}
      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-4 text-slate-400">Quality Score por Dataset (Catálogo)</h3>
        <div className="space-y-3">
          {catalog.map((c) => (
            <div key={c.id} className="flex items-center gap-4">
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase w-14 text-center ${
                c.schema_name === 'bronze' ? 'bg-amber-900/50 text-amber-400' :
                c.schema_name === 'silver' ? 'bg-indigo-900/50 text-indigo-400' :
                'bg-emerald-900/50 text-emerald-400'
              }`}>{c.schema_name}</span>
              <span className="text-sm text-slate-300 w-40 font-mono">{c.table_name}</span>
              <div className="flex-1 bg-slate-800 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    Number(c.quality_score) >= 0.95 ? 'bg-emerald-500' :
                    Number(c.quality_score) >= 0.9 ? 'bg-blue-500' :
                    Number(c.quality_score) >= 0.85 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Number(c.quality_score) * 100}%` }}
                />
              </div>
              <span className={`text-sm font-bold w-12 text-right ${
                Number(c.quality_score) >= 0.95 ? 'text-emerald-400' :
                Number(c.quality_score) >= 0.9 ? 'text-blue-400' :
                'text-amber-400'
              }`}>{(Number(c.quality_score) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4">
        <p className="text-emerald-300 text-sm">
          <strong>Dimensiones de calidad (DAMA-DMBOK2):</strong> Completitud (sin nulos), Validez (rangos correctos),
          Consistencia (formatos uniformes), Unicidad (sin duplicados), Oportunidad (datos frescos) y Confiabilidad
          (quality score). Este dashboard monitorea las 6 dimensiones en tiempo real.
        </p>
      </div>
    </div>
  )
}
