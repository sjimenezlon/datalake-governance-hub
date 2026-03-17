'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase'
import type {
  VentasPorCiudad,
  VentasPorProducto,
  CatalogEntry,
  AccessLog,
  EstadoSensor,
  LakeUser,
  VentaClean,
  VentaRaw,
} from '@/lib/supabase'

const TABS = [
  { key: 'dashboard', label: 'Dashboard Gold', icon: '📊' },
  { key: 'bronze', label: 'Bronze (Raw)', icon: '🥉' },
  { key: 'silver', label: 'Silver (Clean)', icon: '🥈' },
  { key: 'catalog', label: 'Catálogo', icon: '📋' },
  { key: 'sensors', label: 'Sensores IoT', icon: '📡' },
  { key: 'audit', label: 'Auditoría', icon: '🔒' },
  { key: 'users', label: 'Usuarios', icon: '👥' },
  { key: 'architecture', label: 'Arquitectura', icon: '🏗️' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [ventasCiudad, setVentasCiudad] = useState<VentasPorCiudad[]>([])
  const [ventasProducto, setVentasProducto] = useState<VentasPorProducto[]>([])
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [sensores, setSensores] = useState<EstadoSensor[]>([])
  const [users, setUsers] = useState<LakeUser[]>([])
  const [ventasClean, setVentasClean] = useState<VentaClean[]>([])
  const [ventasRaw, setVentasRaw] = useState<VentaRaw[]>([])

  useEffect(() => {
    async function fetchAll() {
      try {
        const supabase = getSupabase()
        const [
          resCiudad,
          resProducto,
          resCatalog,
          resLogs,
          resSensores,
          resUsers,
          resClean,
          resRaw,
        ] = await Promise.all([
          supabase.from('gold_ventas_por_ciudad').select('*'),
          supabase.from('gold_ventas_por_producto').select('*'),
          supabase.from('gold_data_catalog').select('*'),
          supabase
            .from('audit_access_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(50),
          supabase.from('gold_estado_sensores').select('*'),
          supabase.from('lake_users').select('*'),
          supabase
            .from('silver_ventas_clean')
            .select('*')
            .order('fecha', { ascending: true }),
          supabase
            .from('bronze_ventas_raw')
            .select('*')
            .order('ingested_at', { ascending: true }),
        ])

        if (resCiudad.data) setVentasCiudad(resCiudad.data)
        if (resProducto.data) setVentasProducto(resProducto.data)
        if (resCatalog.data) setCatalog(resCatalog.data)
        if (resLogs.data) setLogs(resLogs.data)
        if (resSensores.data) setSensores(resSensores.data)
        if (resUsers.data) setUsers(resUsers.data)
        if (resClean.data) setVentasClean(resClean.data)
        if (resRaw.data) setVentasRaw(resRaw.data)

        // Check for errors
        const allErrors = [resCiudad, resProducto, resCatalog, resLogs, resSensores, resUsers, resClean, resRaw]
          .filter(r => r.error)
          .map(r => r.error?.message)
        if (allErrors.length > 0 && allErrors.length === 8) {
          setError(allErrors[0] || 'Error de conexión')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(n)

  const fmtNum = (n: number) => new Intl.NumberFormat('es-CO').format(n)

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-300 text-lg">Conectando al Data Lake...</p>
          <p className="text-slate-500 text-sm mt-1">Supabase PostgreSQL</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-8 max-w-lg text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-red-300 text-xl font-bold mb-2">Error de Conexión</h2>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <p className="text-slate-400 text-xs">
            Verifica que las variables <code className="bg-slate-800 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code className="bg-slate-800 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> estén configuradas.
          </p>
        </div>
      </div>
    )
  }

  const totalIngreso = ventasCiudad.reduce((s, v) => s + Number(v.ingreso_total), 0)
  const totalTransacciones = ventasCiudad.reduce((s, v) => s + v.num_transacciones, 0)
  const avgCalidad =
    ventasCiudad.length > 0
      ? ventasCiudad.reduce((s, v) => s + Number(v.calidad_promedio), 0) / ventasCiudad.length
      : 0
  const bronzeCount = ventasRaw.length
  const silverCount = ventasClean.length
  const rejectedCount = bronzeCount - silverCount

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Data Lake Governance Hub
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Arquitectura Medallion &middot; Supabase + Vercel &middot; Gestión y Gobernanza de Datos EAFIT
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-800 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-emerald-300 text-xs font-medium">Live — PostgreSQL</span>
              </div>
              <div className="bg-slate-800 rounded-lg px-3 py-1.5">
                <span className="text-slate-400 text-xs">{catalog.length} datasets catalogados</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* NAV TABS */}
      <nav className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto scrollbar-hide">
            {TABS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="mr-1.5">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ======================== DASHBOARD (GOLD) ======================== */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Dashboard de Negocio</h2>
              <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-xs rounded-full font-medium">
                CAPA GOLD
              </span>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-500 text-xs uppercase tracking-wide">Ingreso Total</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{fmt(totalIngreso)}</p>
                <p className="text-slate-600 text-xs mt-1">Capa Gold &middot; Agregado por ciudad</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-500 text-xs uppercase tracking-wide">Transacciones</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{totalTransacciones}</p>
                <p className="text-slate-600 text-xs mt-1">Silver &rarr; Gold (validadas)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-500 text-xs uppercase tracking-wide">Calidad Promedio</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">{(avgCalidad * 100).toFixed(0)}%</p>
                <p className="text-slate-600 text-xs mt-1">Quality Score ponderado</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <p className="text-slate-500 text-xs uppercase tracking-wide">Registros Rechazados</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {rejectedCount} <span className="text-sm text-slate-500">de {bronzeCount}</span>
                </p>
                <p className="text-slate-600 text-xs mt-1">Bronze &rarr; Silver (filtrados)</p>
              </div>
            </div>

            {/* Tables side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ventas por Ciudad */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h3 className="font-semibold text-sm">Ventas por Ciudad</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/50">
                        <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Ciudad</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Txns</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Ingreso</th>
                        <th className="px-4 py-2.5 text-center text-xs text-slate-500 font-medium">Calidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasCiudad.map((v, i) => (
                        <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 font-medium text-slate-200">{v.ciudad}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">{v.num_transacciones}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">
                            {fmt(Number(v.ingreso_total))}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                Number(v.calidad_promedio) >= 0.9
                                  ? 'bg-emerald-900/50 text-emerald-400'
                                  : 'bg-amber-900/50 text-amber-400'
                              }`}
                            >
                              {(Number(v.calidad_promedio) * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ventas por Producto */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                  <h3 className="font-semibold text-sm">Ventas por Producto</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-800/50">
                        <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Producto</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Uds</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Ingreso</th>
                        <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Precio Prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasProducto.map((v, i) => (
                        <tr key={i} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-4 py-2.5 font-medium text-slate-200">{v.producto}</td>
                          <td className="px-4 py-2.5 text-right text-slate-400">
                            {fmtNum(v.unidades_vendidas)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-emerald-400 font-medium">
                            {fmt(Number(v.ingreso_total))}
                          </td>
                          <td className="px-4 py-2.5 text-right text-slate-400">
                            {fmt(Number(v.precio_promedio))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-950/30 border border-blue-900/50 rounded-xl p-4">
              <p className="text-blue-300 text-sm">
                <strong>Nota pedagógica:</strong> Este dashboard SOLO consume datos de la capa <strong>Gold</strong>{' '}
                (vistas materializadas). Nunca accede directamente a Bronze ni Silver. Así funciona la separación de
                capas en un Data Lake real.
              </p>
            </div>
          </div>
        )}

        {/* ======================== BRONZE ======================== */}
        {activeTab === 'bronze' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Datos Crudos (Raw)</h2>
              <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 text-xs rounded-full font-medium">
                CAPA BRONZE
              </span>
              <span className="text-slate-500 text-sm">{ventasRaw.length} registros</span>
            </div>

            <div className="bg-amber-950/20 border border-amber-900/30 rounded-xl p-4 mb-6">
              <p className="text-amber-300 text-sm">
                <strong>Bronze = Inmutable.</strong> Estos son los datos tal como llegaron del sistema fuente (SAP ERP).
                Observa los errores intencionales: cantidades <code className="bg-slate-800 px-1 rounded">null</code>,
                ciudades en minúsculas, vendedores vacíos. Nunca se modifican aquí — la limpieza ocurre en Silver.
              </p>
            </div>

            <div className="space-y-3">
              {ventasRaw.map((r) => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded font-mono">
                        ID: {r.id}
                      </span>
                      <span className="text-slate-500 text-xs">{r.source_system}</span>
                      <span className="text-slate-600 text-xs">{r.file_name}</span>
                    </div>
                    <span className="text-slate-600 text-xs font-mono">
                      {new Date(r.ingested_at).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-300 overflow-x-auto">
                    {JSON.stringify(r.raw_data, null, 2)}
                  </pre>
                  {/* Highlight data quality issues */}
                  {(() => {
                    const d = r.raw_data as Record<string, unknown>
                    const issues: string[] = []
                    if (d.cantidad === null) issues.push('cantidad es NULL')
                    if (d.vendedor === '') issues.push('vendedor vacío')
                    if (typeof d.ciudad === 'string' && d.ciudad !== d.ciudad.charAt(0).toUpperCase() + d.ciudad.slice(1))
                      issues.push(`ciudad no normalizada: "${d.ciudad}"`)
                    return issues.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {issues.map((issue, i) => (
                          <span key={i} className="bg-red-950/50 border border-red-900 text-red-400 text-xs px-2 py-0.5 rounded">
                            ⚠ {issue}
                          </span>
                        ))}
                      </div>
                    ) : null
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================== SILVER ======================== */}
        {activeTab === 'silver' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Datos Limpios y Validados</h2>
              <span className="px-2 py-0.5 bg-indigo-900/50 text-indigo-400 text-xs rounded-full font-medium">
                CAPA SILVER
              </span>
              <span className="text-slate-500 text-sm">{ventasClean.length} registros (de {ventasRaw.length} en Bronze)</span>
            </div>

            <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 mb-6">
              <p className="text-indigo-300 text-sm">
                <strong>Bronze &rarr; Silver:</strong> Los datos fueron limpiados, tipados, deduplicados y validados.
                Registros con <code className="bg-slate-800 px-1 rounded">cantidad = null</code> fueron rechazados.
                Ciudades normalizadas con <code className="bg-slate-800 px-1 rounded">INITCAP()</code>.
                Vendedores vacíos reemplazados por &ldquo;Sin asignar&rdquo; con quality_score reducido.
                La columna <code className="bg-slate-800 px-1 rounded">ingreso_total</code> es un campo calculado
                (GENERATED ALWAYS AS).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-indigo-400">{ventasRaw.length}</p>
                <p className="text-slate-500 text-xs mt-1">Registros Bronze (entrada)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">{ventasClean.length}</p>
                <p className="text-slate-500 text-xs mt-1">Registros Silver (aprobados)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-400">{rejectedCount}</p>
                <p className="text-slate-500 text-xs mt-1">Rechazados por calidad</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/50">
                      <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">ID</th>
                      <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Fecha</th>
                      <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Producto</th>
                      <th className="px-3 py-2.5 text-right text-xs text-slate-500 font-medium">Cant.</th>
                      <th className="px-3 py-2.5 text-right text-xs text-slate-500 font-medium">Precio</th>
                      <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Vendedor</th>
                      <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-medium">Ciudad</th>
                      <th className="px-3 py-2.5 text-right text-xs text-slate-500 font-medium">Ingreso</th>
                      <th className="px-3 py-2.5 text-center text-xs text-slate-500 font-medium">Calidad</th>
                      <th className="px-3 py-2.5 text-center text-xs text-slate-500 font-medium">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasClean.map((v) => (
                      <tr key={v.id} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-500 font-mono text-xs">{v.id}</td>
                        <td className="px-3 py-2 text-slate-300">{v.fecha}</td>
                        <td className="px-3 py-2 text-slate-200 font-medium">{v.producto}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{fmtNum(v.cantidad)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{fmt(Number(v.precio_unit))}</td>
                        <td className="px-3 py-2 text-slate-300">
                          {v.vendedor === 'Sin asignar' ? (
                            <span className="text-amber-400">{v.vendedor}</span>
                          ) : (
                            v.vendedor
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{v.ciudad}</td>
                        <td className="px-3 py-2 text-right text-emerald-400 font-medium">
                          {fmt(Number(v.ingreso_total))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              Number(v.quality_score) >= 0.9
                                ? 'bg-emerald-900/50 text-emerald-400'
                                : 'bg-amber-900/50 text-amber-400'
                            }`}
                          >
                            {(Number(v.quality_score) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-slate-600 text-xs font-mono">B#{v.source_record_id}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================== CATÁLOGO ======================== */}
        {activeTab === 'catalog' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Catálogo de Datos</h2>
              <span className="text-slate-500 text-sm">{catalog.length} datasets registrados</span>
            </div>

            <div className="bg-purple-950/20 border border-purple-900/30 rounded-xl p-4 mb-6">
              <p className="text-purple-300 text-sm">
                <strong>El catálogo es obligatorio.</strong> Todo dataset que entra al Lake debe tener: dueño,
                descripción, clasificación de sensibilidad, indicador de PII, score de calidad y frecuencia de
                actualización. Sin esto, el Data Lake se convierte en un Data Swamp.
              </p>
            </div>

            <div className="grid gap-4">
              {catalog.map((c) => (
                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          c.schema_name === 'bronze'
                            ? 'bg-amber-900/50 text-amber-400'
                            : c.schema_name === 'silver'
                            ? 'bg-indigo-900/50 text-indigo-400'
                            : 'bg-emerald-900/50 text-emerald-400'
                        }`}
                      >
                        {c.schema_name}
                      </span>
                      <code className="text-sm font-mono text-slate-300">
                        {c.schema_name}.{c.table_name}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.has_pii && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-400 font-medium">
                          PII
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          c.classification === 'confidential'
                            ? 'bg-red-900/30 text-red-400'
                            : c.classification === 'internal'
                            ? 'bg-blue-900/30 text-blue-400'
                            : c.classification === 'restricted'
                            ? 'bg-purple-900/30 text-purple-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.classification}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{c.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-400">Owner:</strong> {c.owner}
                    </span>
                    <span>
                      <strong className="text-slate-400">Filas:</strong> {fmtNum(c.row_count)}
                    </span>
                    <span>
                      <strong className="text-slate-400">Freshness:</strong> {c.freshness}
                    </span>
                    <span>
                      <strong className="text-slate-400">Calidad:</strong>{' '}
                      <span
                        className={
                          Number(c.quality_score) >= 0.95
                            ? 'text-emerald-400'
                            : Number(c.quality_score) >= 0.9
                            ? 'text-blue-400'
                            : 'text-amber-400'
                        }
                      >
                        {(Number(c.quality_score) * 100).toFixed(0)}%
                      </span>
                    </span>
                  </div>
                  {/* Quality bar */}
                  <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        Number(c.quality_score) >= 0.95
                          ? 'bg-emerald-500'
                          : Number(c.quality_score) >= 0.9
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Number(c.quality_score) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================== SENSORES ======================== */}
        {activeTab === 'sensors' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Estado de Sensores IoT</h2>
              <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-xs rounded-full font-medium">
                GOLD
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sensores.map((s, i) => (
                <div
                  key={i}
                  className={`bg-slate-900 border rounded-xl p-5 ${
                    s.tiene_anomalias ? 'border-red-800' : 'border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-lg text-slate-200">{s.sensor_id}</div>
                      <div className="text-sm text-slate-500">{s.ubicacion}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.tiene_anomalias && (
                        <span className="px-2 py-1 bg-red-900/50 text-red-400 text-xs rounded-full animate-pulse">
                          Anomalía
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          s.bateria_actual >= 70
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : s.bateria_actual >= 50
                            ? 'bg-amber-900/50 text-amber-400'
                            : 'bg-red-900/50 text-red-400'
                        }`}
                      >
                        {s.bateria_actual}% bat.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-blue-400">{s.valor_promedio}</div>
                      <div className="text-xs text-slate-500">Promedio</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-slate-300">{s.valor_min}</div>
                      <div className="text-xs text-slate-500">Mín</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-slate-300">{s.valor_max}</div>
                      <div className="text-xs text-slate-500">Máx</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-lg font-bold text-slate-300">{s.total_lecturas}</div>
                      <div className="text-xs text-slate-500">Lecturas</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{s.tipo_medicion}</span>
                    <span>&middot;</span>
                    <span>{s.unidad}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================== AUDITORÍA ======================== */}
        {activeTab === 'audit' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Log de Auditoría de Accesos</h2>
              <span className="text-slate-500 text-sm">{logs.length} registros</span>
            </div>

            <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-4 mb-6">
              <p className="text-rose-300 text-sm">
                <strong>Trazabilidad completa.</strong> Cada acceso al Data Lake queda registrado: quién accedió, a qué
                tabla, qué acción realizó, cuántas filas consultó y desde qué IP. Esto es un requisito de gobernanza y
                cumplimiento regulatorio (Habeas Data, GDPR, SOX).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/50">
                      <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Timestamp</th>
                      <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Usuario</th>
                      <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Rol</th>
                      <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Acción</th>
                      <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">Tabla</th>
                      <th className="px-4 py-2.5 text-right text-xs text-slate-500 font-medium">Filas</th>
                      <th className="px-4 py-2.5 text-left text-xs text-slate-500 font-medium">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-t border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">
                          {new Date(l.timestamp).toLocaleString('es-CO')}
                        </td>
                        <td className="px-4 py-2 text-slate-300 text-xs">{l.user_email}</td>
                        <td className="px-4 py-2">
                          <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">
                            {l.user_role}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              l.action === 'SELECT'
                                ? 'bg-blue-900/50 text-blue-400'
                                : l.action === 'INSERT'
                                ? 'bg-emerald-900/50 text-emerald-400'
                                : l.action === 'EXPORT'
                                ? 'bg-purple-900/50 text-purple-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {l.action}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">
                          {l.schema_name}.{l.table_name}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-400">{l.row_count}</td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{l.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================== USUARIOS ======================== */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <h2 className="text-xl font-bold">Usuarios del Data Lake</h2>
              <span className="text-slate-500 text-sm">{users.length} usuarios</span>
            </div>

            <div className="bg-cyan-950/20 border border-cyan-900/30 rounded-xl p-4 mb-6">
              <p className="text-cyan-300 text-sm">
                <strong>Control de acceso por rol (RBAC).</strong> Cada usuario tiene un rol que determina qué zonas del
                Lake puede acceder. <code className="bg-slate-800 px-1 rounded">data_engineer</code> → Bronze+Silver+Gold.{' '}
                <code className="bg-slate-800 px-1 rounded">data_scientist</code> → Silver (masked)+Gold.{' '}
                <code className="bg-slate-800 px-1 rounded">analyst</code> → Solo Gold.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((u) => (
                <div key={u.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        u.role === 'admin'
                          ? 'bg-red-900/50 text-red-400'
                          : u.role === 'data_engineer'
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : u.role === 'data_scientist'
                          ? 'bg-purple-900/50 text-purple-400'
                          : 'bg-blue-900/50 text-blue-400'
                      }`}
                    >
                      {u.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{u.full_name}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-red-900/50 text-red-400'
                          : u.role === 'data_engineer'
                          ? 'bg-emerald-900/50 text-emerald-400'
                          : u.role === 'data_scientist'
                          ? 'bg-purple-900/50 text-purple-400'
                          : 'bg-blue-900/50 text-blue-400'
                      }`}
                    >
                      {u.role}
                    </span>
                    <span className="text-xs text-slate-500">{u.department}</span>
                  </div>
                  <div className="mt-3 text-xs text-slate-600">
                    <strong className="text-slate-500">Acceso: </strong>
                    {u.role === 'admin' && 'Bronze + Silver + Gold + Audit + Admin'}
                    {u.role === 'data_engineer' && 'Bronze (R/W) + Silver (R/W) + Gold (R)'}
                    {u.role === 'data_scientist' && 'Silver masked (R) + Gold (R) + Sandbox (R/W)'}
                    {u.role === 'analyst' && 'Gold (R) — solo lectura capa de negocio'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================== ARQUITECTURA ======================== */}
        {activeTab === 'architecture' && (
          <div>
            <h2 className="text-xl font-bold mb-6">Arquitectura del Data Lake</h2>

            {/* Medallion flow */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-4">
                Arquitectura Medallion — Flujo de Datos
              </h3>
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                {[
                  {
                    zone: 'Bronze',
                    color: 'amber',
                    icon: '🥉',
                    desc: 'Datos crudos, inmutables. JSONB tal cual llega del sistema fuente.',
                    tables: ['ventas_raw', 'sensores_raw'],
                    records: ventasRaw.length,
                  },
                  {
                    zone: 'Silver',
                    color: 'indigo',
                    icon: '🥈',
                    desc: 'Limpio, tipado, validado. Nulos tratados, duplicados eliminados.',
                    tables: ['ventas_clean', 'sensores_clean', 'ventas_masked'],
                    records: ventasClean.length,
                  },
                  {
                    zone: 'Gold',
                    color: 'emerald',
                    icon: '🥇',
                    desc: 'Vistas materializadas de negocio. Agregaciones listas para consumo.',
                    tables: ['ventas_por_ciudad', 'ventas_por_producto', 'estado_sensores', 'data_catalog'],
                    records: ventasCiudad.length + ventasProducto.length,
                  },
                ].map((z, i) => (
                  <div key={z.zone} className="flex-1 flex flex-col sm:flex-row items-stretch">
                    <div
                      className={`flex-1 rounded-xl p-4 border ${
                        z.color === 'amber'
                          ? 'bg-amber-950/30 border-amber-900/50'
                          : z.color === 'indigo'
                          ? 'bg-indigo-950/30 border-indigo-900/50'
                          : 'bg-emerald-950/30 border-emerald-900/50'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <span className="text-2xl">{z.icon}</span>
                        <div
                          className={`font-bold text-sm mt-1 ${
                            z.color === 'amber'
                              ? 'text-amber-400'
                              : z.color === 'indigo'
                              ? 'text-indigo-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {z.zone}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 text-center mb-3">{z.desc}</p>
                      <div className="space-y-1">
                        {z.tables.map((t) => (
                          <div key={t} className="bg-slate-900/50 rounded px-2 py-1 text-xs font-mono text-slate-400 text-center">
                            {t}
                          </div>
                        ))}
                      </div>
                      <div className="text-center mt-2">
                        <span className="text-xs text-slate-600">{z.records} registros</span>
                      </div>
                    </div>
                    {i < 2 && (
                      <div className="flex items-center justify-center py-2 sm:px-2">
                        <span className="text-slate-600 text-xl sm:rotate-0 rotate-90">&rarr;</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Governance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-3 text-red-400">Seguridad implementada</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Row Level Security (RLS)</strong> en tablas Silver</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Enmascaramiento PII</strong> vista ventas_masked</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">RBAC</strong> 4 roles con permisos diferenciados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Auditoría</strong> log de cada acceso con IP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Cifrado</strong> Supabase TLS + AES-256 at rest</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="font-semibold text-sm mb-3 text-blue-400">Gobernanza implementada</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Catálogo de datos</strong> con metadatos obligatorios</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Clasificación</strong> public / internal / confidential</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Quality Score</strong> calculado por dataset</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Linaje</strong> Bronze → Silver → Gold trazable</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5">&#10003;</span>
                    <span><strong className="text-slate-300">Data Stewardship</strong> owner por dataset</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-semibold text-sm mb-3 text-slate-400">Stack Tecnológico</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'Supabase', desc: 'PostgreSQL + RLS + Auth', color: 'emerald' },
                  { name: 'Next.js 14', desc: 'React SSR framework', color: 'blue' },
                  { name: 'Vercel', desc: 'Edge deployment', color: 'slate' },
                  { name: 'Tailwind CSS', desc: 'Utility-first styling', color: 'cyan' },
                ].map((t) => (
                  <div key={t.name} className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="font-medium text-sm text-slate-200">{t.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 text-center text-sm text-slate-500 py-6 mt-12">
        <p className="font-medium text-slate-400">Data Lake Governance Hub — Universidad EAFIT 2026</p>
        <p className="mt-1">Gestión y Gobernanza de Datos &middot; Supabase + Next.js + Vercel</p>
        <p className="mt-1 text-slate-600">Arquitectura Medallion &middot; DAMA-DMBOK2 &middot; RLS &middot; Datos reales</p>
      </footer>
    </div>
  )
}
