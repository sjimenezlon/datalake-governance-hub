'use client'

import type { VentaRaw, VentaClean } from '@/lib/supabase'
import PedagogicalNote from './PedagogicalNote'

interface Props {
  ventasRaw: VentaRaw[]
  ventasClean: VentaClean[]
}

export default function CompareTab({ ventasRaw, ventasClean }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

  // Match bronze records to their silver counterparts
  const comparisons = ventasRaw.map((raw) => {
    const d = raw.raw_data as Record<string, unknown>
    const silver = ventasClean.find((c) => c.source_record_id === raw.id)
    const issues: string[] = []

    if (d.cantidad === null) issues.push('cantidad NULL → RECHAZADO')
    if (d.vendedor === '') issues.push('vendedor vacío → "Sin asignar"')
    if (typeof d.ciudad === 'string' && d.ciudad.toLowerCase() === d.ciudad) issues.push(`"${d.ciudad}" → "${silver?.ciudad || 'INITCAP'}"`)

    return { raw, rawData: d, silver, issues, rejected: !silver }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Comparación Bronze vs Silver</h2>
        <span className="px-2 py-0.5 bg-cyan-900/50 text-cyan-400 text-xs rounded-full font-medium">
          TRANSFORMACIÓN
        </span>
      </div>

      <PedagogicalNote title="¿Cómo leer esta comparación?" type="concept" defaultOpen={true}>
        <p>Cada tarjeta muestra un registro Bronze (izquierda) junto a su versión Silver (derecha). Así puedes ver <strong>exactamente qué cambió</strong> en la transformación:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
          <li><span className="text-emerald-400 font-bold">Verde &quot;LIMPIO&quot;</span> — el registro pasó sin modificaciones, quality_score = 1.00</li>
          <li><span className="text-amber-400 font-bold">Amarillo &quot;N transformaciones&quot;</span> — se corrigieron campos (vendedor vacío, ciudad normalizada)</li>
          <li><span className="text-red-400 font-bold">Rojo &quot;RECHAZADO&quot;</span> — el registro NO pasó a Silver por fallar las reglas de calidad</li>
          <li>Los campos problemáticos en Bronze aparecen resaltados en <span className="text-red-400">rojo</span></li>
          <li>Los campos corregidos en Silver aparecen en <span className="text-emerald-400">verde</span></li>
        </ul>
      </PedagogicalNote>

      <PedagogicalNote title="¿Por qué es importante esta comparación?" type="governance" defaultOpen={false}>
        <p>En gobernanza de datos, la <strong>trazabilidad de transformaciones</strong> es un requisito. Debes poder demostrar:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
          <li>Qué reglas de limpieza se aplicaron y por qué</li>
          <li>Qué registros fueron rechazados y el motivo exacto</li>
          <li>Que los datos Silver son una representación fiel (pero limpia) de Bronze</li>
        </ul>
        <p className="mt-2 text-slate-400 text-xs">Marco de referencia: DAMA-DMBOK2, Área 6 (Integración e Interoperabilidad) y Área 11 (Calidad de Datos).</p>
      </PedagogicalNote>

      <PedagogicalNote title="Encuentra los problemas del registro #4" type="exercise" defaultOpen={false}>
        <p>Busca la tarjeta con etiqueta roja <strong>&quot;RECHAZADO&quot;</strong>. Identifica:</p>
        <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs">
          <li>¿Qué campo tiene valor NULL? ¿Por qué eso bloquea el ingreso a Silver?</li>
          <li>¿Qué campo tiene string vacío? ¿Cómo lo habría corregido Silver si no fuera rechazado?</li>
          <li>¿Qué campo tiene inconsistencia de formato? ¿Qué función SQL lo normaliza?</li>
        </ol>
      </PedagogicalNote>

      <div className="space-y-4">
        {comparisons.map(({ raw, rawData, silver, issues, rejected }) => (
          <div
            key={raw.id}
            className={`bg-slate-900 border rounded-xl overflow-hidden ${
              rejected ? 'border-red-800' : issues.length > 0 ? 'border-amber-800' : 'border-slate-800'
            }`}
          >
            {/* Header */}
            <div className={`px-5 py-3 flex items-center justify-between ${
              rejected ? 'bg-red-950/30' : 'bg-slate-800/30'
            }`}>
              <div className="flex items-center gap-3">
                <span className="bg-amber-900/50 text-amber-400 text-xs px-2 py-0.5 rounded font-mono font-bold">
                  B#{raw.id}
                </span>
                {silver && (
                  <>
                    <span className="text-slate-600">→</span>
                    <span className="bg-indigo-900/50 text-indigo-400 text-xs px-2 py-0.5 rounded font-mono font-bold">
                      S#{silver.id}
                    </span>
                  </>
                )}
                <span className="text-slate-500 text-xs">{raw.file_name}</span>
              </div>
              {rejected ? (
                <span className="bg-red-900/50 text-red-400 text-xs px-3 py-1 rounded-full font-medium animate-pulse">
                  RECHAZADO
                </span>
              ) : issues.length > 0 ? (
                <span className="bg-amber-900/50 text-amber-400 text-xs px-3 py-1 rounded-full font-medium">
                  {issues.length} transformación(es)
                </span>
              ) : (
                <span className="bg-emerald-900/50 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium">
                  LIMPIO
                </span>
              )}
            </div>

            {/* Comparison grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              {/* Bronze side */}
              <div className="p-4">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">Bronze (Raw)</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {Object.entries(rawData).map(([key, val]) => {
                    const isProblematic = (key === 'cantidad' && val === null) ||
                      (key === 'vendedor' && val === '') ||
                      (key === 'ciudad' && typeof val === 'string' && val.toLowerCase() === val && val !== val.charAt(0).toUpperCase() + val.slice(1))
                    return (
                      <div key={key} className="contents">
                        <span className="text-slate-500 py-0.5">{key}</span>
                        <span className={`py-0.5 font-mono ${
                          isProblematic ? 'text-red-400 font-bold bg-red-950/30 px-1 rounded' : 'text-slate-300'
                        }`}>
                          {val === null ? 'NULL' : val === '' ? '""' : String(val)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Silver side */}
              <div className={`p-4 ${rejected ? 'opacity-40' : ''}`}>
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-2">
                  Silver (Clean) {rejected && '— No existe'}
                </div>
                {silver ? (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-slate-500 py-0.5">fecha</span>
                    <span className="text-slate-300 py-0.5 font-mono">{silver.fecha}</span>
                    <span className="text-slate-500 py-0.5">producto</span>
                    <span className="text-slate-300 py-0.5 font-mono">{silver.producto}</span>
                    <span className="text-slate-500 py-0.5">cantidad</span>
                    <span className="text-emerald-400 py-0.5 font-mono font-bold">{silver.cantidad}</span>
                    <span className="text-slate-500 py-0.5">precio_unit</span>
                    <span className="text-slate-300 py-0.5 font-mono">{fmt(Number(silver.precio_unit))}</span>
                    <span className="text-slate-500 py-0.5">vendedor</span>
                    <span className={`py-0.5 font-mono ${silver.vendedor === 'Sin asignar' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                      {silver.vendedor}
                    </span>
                    <span className="text-slate-500 py-0.5">ciudad</span>
                    <span className="text-emerald-400 py-0.5 font-mono font-bold">{silver.ciudad}</span>
                    <span className="text-slate-500 py-0.5">ingreso_total</span>
                    <span className="text-emerald-400 py-0.5 font-mono font-bold">{fmt(Number(silver.ingreso_total))}</span>
                    <span className="text-slate-500 py-0.5">quality_score</span>
                    <span className={`py-0.5 font-mono font-bold ${Number(silver.quality_score) >= 0.9 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {(Number(silver.quality_score) * 100).toFixed(0)}%
                    </span>
                  </div>
                ) : (
                  <div className="text-red-400 text-xs">
                    Registro filtrado por regla de calidad: cantidad NULL o &le; 0
                  </div>
                )}
              </div>
            </div>

            {/* Issues footer */}
            {issues.length > 0 && (
              <div className="px-5 py-2 bg-slate-800/30 border-t border-slate-800 flex flex-wrap gap-2">
                {issues.map((issue, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded ${
                    issue.includes('RECHAZADO') ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'
                  }`}>
                    {issue}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
