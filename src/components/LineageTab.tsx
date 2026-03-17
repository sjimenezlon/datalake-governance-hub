'use client'

import type { VentaRaw, VentaClean, VentasPorCiudad } from '@/lib/supabase'
import PedagogicalNote from './PedagogicalNote'

interface Props {
  ventasRaw: VentaRaw[]
  ventasClean: VentaClean[]
  ventasCiudad: VentasPorCiudad[]
}

export default function LineageTab({ ventasRaw, ventasClean, ventasCiudad }: Props) {
  // Build lineage: for each silver record, show its bronze source
  const lineageRecords = ventasClean.map((clean) => {
    const source = ventasRaw.find((r) => r.id === clean.source_record_id)
    return { clean, source }
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold">Linaje de Datos (Data Lineage)</h2>
        <span className="px-2 py-0.5 bg-purple-900/50 text-purple-400 text-xs rounded-full font-medium">
          GOBERNANZA
        </span>
      </div>

      <PedagogicalNote title="¿Qué es el linaje de datos (Data Lineage)?" type="concept" defaultOpen={true}>
        <p>El linaje documenta el <strong>origen</strong>, las <strong>transformaciones</strong> y el <strong>destino</strong> de cada dato. Responde preguntas como:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
          <li>&quot;Este KPI de $22M en Barranquilla... ¿de dónde sale exactamente?&quot;</li>
          <li>&quot;Si cambio el pipeline de limpieza, ¿qué reportes se afectan?&quot; (impact analysis)</li>
          <li>&quot;Un regulador pide demostrar cómo se calculó este reporte&quot; (compliance)</li>
        </ul>
        <p className="mt-2 text-slate-400 text-xs">Implementado con <code className="bg-slate-800 px-1 rounded">source_record_id BIGINT REFERENCES bronze.ventas_raw(id)</code> en Silver.</p>
      </PedagogicalNote>

      <PedagogicalNote title="Rastrea un dato sospechoso" type="exercise" defaultOpen={false}>
        <p>Imagina que el KPI de Barranquilla parece muy alto. ¿Cómo lo rastrearías?</p>
        <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs">
          <li><strong>Gold</strong>: ventas_por_ciudad muestra Barranquilla con $22.250.000</li>
          <li><strong>Silver</strong>: busca <code className="bg-slate-800 px-1 rounded">WHERE ciudad = &apos;Barranquilla&apos;</code> → 1 registro: Bomba Sumergible BS30, 25 uds × $890K</li>
          <li><strong>Bronze</strong>: sigue el source_record_id → registro #5, archivo export_ventas_20260303.json, fuente SAP-ERP</li>
          <li><strong>Verificación</strong>: el dato es correcto. Una bomba sumergible industrial sí cuesta $890K. El KPI es válido.</li>
        </ol>
      </PedagogicalNote>

      <PedagogicalNote title="Herramientas de linaje en producción" type="governance" defaultOpen={false}>
        <p>En la vida real, el linaje se automatiza con herramientas especializadas:</p>
        <ul className="list-disc ml-5 mt-2 space-y-1 text-xs">
          <li><strong>Apache Atlas</strong> — open source, integrado con Hadoop/Hive/Spark</li>
          <li><strong>OpenLineage</strong> — estándar abierto, integrado con Airflow y dbt</li>
          <li><strong>dbt lineage</strong> — grafo automático desde archivos SQL</li>
          <li><strong>Microsoft Purview</strong> — plataforma enterprise de gobernanza</li>
        </ul>
        <p className="mt-2 text-slate-400 text-xs">Marco: DAMA-DMBOK2, Área 10 (Gestión de Metadatos).</p>
      </PedagogicalNote>

      {/* Visual Lineage Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-5">
          Grafo de Linaje — Flujo completo
        </h3>

        <div className="space-y-4">
          {/* Source Systems */}
          <div className="flex items-center gap-3">
            <div className="w-28 text-right text-xs text-slate-500 font-medium">FUENTE</div>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-slate-300">SAP ERP</div>
                <div className="text-slate-500">Ventas, clientes</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-slate-300">IoT Gateway</div>
                <div className="text-slate-500">Sensores, telemetría</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28" />
            <div className="text-slate-600 pl-8">↓ <span className="text-xs">Ingestión batch/streaming</span></div>
          </div>

          {/* Bronze */}
          <div className="flex items-center gap-3">
            <div className="w-28 text-right text-xs text-amber-400 font-bold">BRONZE</div>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-amber-300">ventas_raw</div>
                <div className="text-amber-500">{ventasRaw.length} registros · JSONB · inmutable</div>
              </div>
              <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-amber-300">sensores_raw</div>
                <div className="text-amber-500">5 registros · JSONB · inmutable</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28" />
            <div className="text-slate-600 pl-8">↓ <span className="text-xs">Limpieza, validación, tipado, INITCAP, COALESCE</span></div>
          </div>

          {/* Silver */}
          <div className="flex items-center gap-3">
            <div className="w-28 text-right text-xs text-indigo-400 font-bold">SILVER</div>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-indigo-300">ventas_clean</div>
                <div className="text-indigo-500">{ventasClean.length} registros · tipado · validado</div>
              </div>
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-indigo-300">sensores_clean</div>
                <div className="text-indigo-500">5 registros · anomalías marcadas</div>
              </div>
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg px-3 py-2 text-xs opacity-70">
                <div className="font-medium text-indigo-300">ventas_masked</div>
                <div className="text-indigo-500">Vista · PII enmascarado</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28" />
            <div className="text-slate-600 pl-8">↓ <span className="text-xs">GROUP BY, SUM, AVG, COUNT — Vistas materializadas</span></div>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-3">
            <div className="w-28 text-right text-xs text-emerald-400 font-bold">GOLD</div>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-emerald-300">ventas_por_ciudad</div>
                <div className="text-emerald-500">{ventasCiudad.length} ciudades · KPIs</div>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-emerald-300">ventas_por_producto</div>
                <div className="text-emerald-500">Agregación productos</div>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-emerald-300">estado_sensores</div>
                <div className="text-emerald-500">Dashboard IoT</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-28" />
            <div className="text-slate-600 pl-8">↓ <span className="text-xs">API REST Supabase → Next.js</span></div>
          </div>

          {/* Consumers */}
          <div className="flex items-center gap-3">
            <div className="w-28 text-right text-xs text-cyan-400 font-bold">CONSUMO</div>
            <div className="flex gap-2 flex-wrap">
              <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-cyan-300">Dashboard Web</div>
                <div className="text-cyan-500">Next.js + Vercel</div>
              </div>
              <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-cyan-300">Analistas</div>
                <div className="text-cyan-500">Solo lectura Gold</div>
              </div>
              <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-lg px-3 py-2 text-xs">
                <div className="font-medium text-cyan-300">ML/AI</div>
                <div className="text-cyan-500">Feature store</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record-level lineage */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="font-semibold text-sm">Linaje a Nivel de Registro</h3>
          <p className="text-xs text-slate-500 mt-1">Cada registro de Silver tiene referencia directa a su fuente en Bronze</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Silver ID</th>
                <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Producto</th>
                <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Ciudad</th>
                <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-medium">Calidad</th>
                <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-medium">→</th>
                <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Bronze ID</th>
                <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Fuente</th>
                <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Archivo</th>
              </tr>
            </thead>
            <tbody>
              {lineageRecords.map(({ clean, source }) => (
                <tr key={clean.id} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2.5">
                    <span className="bg-indigo-900/50 text-indigo-400 text-xs px-2 py-0.5 rounded font-mono">
                      S#{clean.id}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 text-xs">{clean.producto}</td>
                  <td className="px-4 py-2.5 text-slate-300 text-xs">{clean.ciudad}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      Number(clean.quality_score) >= 0.9
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'bg-amber-900/50 text-amber-400'
                    }`}>
                      {(Number(clean.quality_score) * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-slate-600">←</td>
                  <td className="px-4 py-2.5">
                    <span className="bg-amber-900/50 text-amber-400 text-xs px-2 py-0.5 rounded font-mono">
                      B#{clean.source_record_id}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{source?.source_system || '-'}</td>
                  <td className="px-4 py-2.5 text-slate-600 text-xs font-mono">{source?.file_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PedagogicalNote title="GDPR Art. 15 y Habeas Data" type="why" defaultOpen={false}>
        <p>El derecho de acceso (GDPR Art. 15, Ley 1581 Art. 12 en Colombia) exige que puedas explicar a un ciudadano <strong>qué datos tienes suyos y de dónde vienen</strong>. Sin linaje, es imposible cumplir este requisito legal.</p>
      </PedagogicalNote>
    </div>
  )
}
