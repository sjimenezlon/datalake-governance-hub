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
import QualityTab from '@/components/QualityTab'
import LineageTab from '@/components/LineageTab'
import CompareTab from '@/components/CompareTab'
import PedagogicalNote from '@/components/PedagogicalNote'

const TABS = [
  { key: 'dashboard', label: 'Dashboard Gold', icon: '📊' },
  { key: 'compare', label: 'Bronze vs Silver', icon: '🔄' },
  { key: 'quality', label: 'Calidad', icon: '✅' },
  { key: 'lineage', label: 'Linaje', icon: '🔗' },
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
  const [welcomeOpen, setWelcomeOpen] = useState(true)

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

      {/* WELCOME BANNER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-emerald-950/40 border border-blue-900/40 rounded-xl overflow-hidden">
          <button
            onClick={() => setWelcomeOpen(!welcomeOpen)}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎓</span>
              <span className="text-sm font-semibold text-blue-300">
                Bienvenido al Data Lake Governance Hub — esta plataforma es un laboratorio real de Gestión y Gobernanza de Datos
              </span>
            </div>
            <span className="text-slate-500 text-xs whitespace-nowrap ml-2">{welcomeOpen ? '▲ Ocultar' : '▼ Mostrar'}</span>
          </button>
          {welcomeOpen && (
            <div className="px-5 pb-5 text-sm text-slate-300 leading-relaxed space-y-3">
              <p>
                Aquí puedes explorar cómo funciona un <strong className="text-blue-300">Data Lake con arquitectura Medallion</strong> (Bronze → Silver → Gold)
                conectado a una base de datos <strong className="text-emerald-300">PostgreSQL real</strong> en Supabase. Todos los datos que ves son consultados en vivo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">Capas de datos</p>
                  <p className="text-xs text-slate-400"><strong>Dashboard Gold</strong> — KPIs de negocio desde vistas materializadas. <strong>Bronze</strong> — datos crudos inmutables. <strong>Silver</strong> — datos limpios y tipados.</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
                  <p className="text-xs font-bold text-purple-400 uppercase tracking-wide mb-1">Calidad y linaje</p>
                  <p className="text-xs text-slate-400"><strong>Bronze vs Silver</strong> — compara antes/después. <strong>Calidad</strong> — métricas de completitud. <strong>Linaje</strong> — trazabilidad de transformaciones.</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800/50">
                  <p className="text-xs font-bold text-cyan-400 uppercase tracking-wide mb-1">Gobernanza</p>
                  <p className="text-xs text-slate-400"><strong>Catálogo</strong> — metadatos obligatorios. <strong>Sensores</strong> — detección de anomalías. <strong>Auditoría</strong> — log de accesos. <strong>Usuarios</strong> — RBAC.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

            <PedagogicalNote title="¿Qué es la Capa Gold?" type="concept" defaultOpen={false}>
              <p>
                La capa <strong>Gold</strong> contiene <strong>vistas materializadas</strong> (materialized views) — son consultas SQL pre-calculadas
                que PostgreSQL almacena como tablas físicas. En lugar de ejecutar JOINs y agregaciones costosas cada vez que un analista consulta,
                el resultado ya está listo.
              </p>
              <p className="mt-2">
                En este proyecto, <code className="bg-slate-800 px-1 rounded">gold_ventas_por_ciudad</code> y{' '}
                <code className="bg-slate-800 px-1 rounded">gold_ventas_por_producto</code> son vistas materializadas que agregan datos
                desde <code className="bg-slate-800 px-1 rounded">silver_ventas_clean</code>. El Dashboard <strong>solo</strong> lee de Gold,
                nunca toca Bronze ni Silver directamente.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="Separación de capas" type="governance" defaultOpen={false}>
              <p>
                Un principio fundamental de gobernanza es que <strong>los analistas de negocio nunca deben acceder a la capa Bronze</strong>.
                Bronze contiene datos crudos con errores, duplicados y formatos inconsistentes. Si un analista construye un reporte desde Bronze,
                los números estarán mal.
              </p>
              <p className="mt-2">
                La separación Bronze → Silver → Gold garantiza que cada capa tenga un propósito claro:
                Bronze = inmutabilidad, Silver = calidad, Gold = consumo de negocio.
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="Observa el quality score de Medellín" type="exercise" defaultOpen={false}>
              <p>
                Mira la tabla &quot;Ventas por Ciudad&quot; abajo. ¿El quality score de Medellín es 100%? Probablemente no.
                ¿Por qué no es perfecto si los datos ya pasaron por Silver?
              </p>
              <p className="mt-2">
                <strong>Pista:</strong> Ve a la tab <strong>Bronze vs Silver</strong> y busca registros de Medellín.
                ¿Algún registro tenía un vendedor vacío? Cuando Silver reemplaza un valor faltante con &quot;Sin asignar&quot; usando COALESCE,
                el quality_score baja a 0.85 porque el dato original era incompleto. La limpieza no elimina la evidencia del problema.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="KPI 4: Registros Rechazados" type="why" defaultOpen={false}>
              <p>
                El cuarto KPI muestra cuántos registros de Bronze <strong>no llegaron a Silver</strong>. Esto no es un error del pipeline
                — es una decisión de gobernanza. Un registro con <code className="bg-slate-800 px-1 rounded">cantidad = NULL</code> no
                puede participar en cálculos de ingreso, así que se rechaza.
              </p>
              <p className="mt-2">
                En producción, este número genera alertas: si de repente el 50% de los registros son rechazados,
                hay un problema en el sistema fuente (SAP ERP) que debe investigarse.
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="Este dashboard SOLO consume datos de la capa Gold" type="concept" defaultOpen={true}>
              <p>
                Este dashboard SOLO consume datos de la capa <strong>Gold</strong> (vistas materializadas).
                Nunca accede directamente a Bronze ni Silver. Así funciona la separación de capas en un Data Lake real.
              </p>
            </PedagogicalNote>
          </div>
        )}

        {/* ======================== COMPARE ======================== */}
        {activeTab === 'compare' && (
          <CompareTab ventasRaw={ventasRaw} ventasClean={ventasClean} />
        )}

        {/* ======================== QUALITY ======================== */}
        {activeTab === 'quality' && (
          <QualityTab ventasRaw={ventasRaw} ventasClean={ventasClean} catalog={catalog} />
        )}

        {/* ======================== LINEAGE ======================== */}
        {activeTab === 'lineage' && (
          <LineageTab ventasRaw={ventasRaw} ventasClean={ventasClean} ventasCiudad={ventasCiudad} />
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

            <PedagogicalNote title="¿Qué es Bronze?" type="concept" defaultOpen={true}>
              <p>
                Bronze es la <strong>zona de aterrizaje</strong> (landing zone) del Data Lake. Los datos llegan aquí exactamente como
                los envía el sistema fuente, sin ninguna transformación. Se almacenan en formato <strong>JSONB</strong> (schema-on-read),
                lo que significa que no necesitan un esquema predefinido — PostgreSQL los guarda como JSON binario y puedes consultarlos después.
              </p>
              <p className="mt-2">
                Cada registro tiene metadatos de ingestión: <code className="bg-slate-800 px-1 rounded">source_system</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">ingested_at</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">file_name</code>. Estos metadatos son esenciales para la trazabilidad.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="¿Por qué nunca modificar Bronze?" type="why" defaultOpen={false}>
              <p>
                Bronze es <strong>inmutable</strong> por tres razones críticas:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Reprocesamiento:</strong> si descubres un bug en tu pipeline Silver, puedes volver a correrlo desde Bronze sin pedir los datos de nuevo al sistema fuente.</li>
                <li><strong>Evidencia legal:</strong> en auditorías regulatorias (Habeas Data, SOX), necesitas demostrar qué datos recibiste originalmente, sin alteraciones.</li>
                <li><strong>Debugging:</strong> cuando un número no cuadra en Gold, puedes rastrear el problema hasta el dato original en Bronze.</li>
              </ul>
            </PedagogicalNote>

            <PedagogicalNote title="Encuentra los 3 errores en el registro #4" type="exercise" defaultOpen={false}>
              <p>
                Busca el registro con <strong>ID 4</strong> en la lista de abajo. Tiene al menos 3 problemas de calidad de datos:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li><code className="bg-slate-800 px-1 rounded">cantidad</code> es <strong>NULL</strong> — no se puede calcular ingreso sin cantidad</li>
                <li><code className="bg-slate-800 px-1 rounded">vendedor</code> es un <strong>string vacío</strong> (&quot;&quot;) — no se sabe quién realizó la venta</li>
                <li><code className="bg-slate-800 px-1 rounded">ciudad</code> no está <strong>normalizada</strong> — puede estar en minúsculas o con formato inconsistente</li>
              </ol>
              <p className="mt-2">
                ¿Qué pasa con este registro cuando llega a Silver? Ve a la tab <strong>Silver</strong> y busca el ID 4...
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="Metadatos de ingestión" type="governance" defaultOpen={false}>
              <p>
                Cada registro Bronze incluye metadatos que responden preguntas clave de gobernanza:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code className="bg-slate-800 px-1 rounded">source_system</code> — ¿De dónde vino? (SAP ERP, IoT gateway, etc.)</li>
                <li><code className="bg-slate-800 px-1 rounded">ingested_at</code> — ¿Cuándo llegó al Lake?</li>
                <li><code className="bg-slate-800 px-1 rounded">file_name</code> — ¿De qué archivo se extrajo?</li>
                <li><code className="bg-slate-800 px-1 rounded">batch_id</code> — ¿En qué lote de carga entró? Permite hacer rollback de un lote completo</li>
              </ul>
              <p className="mt-2">
                Sin estos metadatos, no puedes hacer linaje (trazar un dato desde Gold hasta su origen) ni auditar el pipeline.
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="¿Qué es Silver?" type="concept" defaultOpen={true}>
              <p>
                Silver es la capa de datos <strong>limpios, tipados y validados</strong>. A diferencia de Bronze (JSONB sin esquema),
                Silver tiene columnas con tipos estrictos: <code className="bg-slate-800 px-1 rounded">DATE</code>,{' '}
                <code className="bg-slate-800 px-1 rounded">INTEGER</code>, <code className="bg-slate-800 px-1 rounded">NUMERIC(12,2)</code>.
                Si un dato no cumple las reglas de calidad, no entra a Silver.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="Las 6 transformaciones Bronze → Silver" type="concept" defaultOpen={false}>
              <p>
                El pipeline de Silver aplica estas transformaciones:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li><strong>Type casting:</strong> <code className="bg-slate-800 px-1 rounded">(raw_data-&gt;&gt;&apos;cantidad&apos;)::INTEGER</code> — de texto JSON a entero</li>
                <li><strong>COALESCE:</strong> <code className="bg-slate-800 px-1 rounded">COALESCE(vendedor, &apos;Sin asignar&apos;)</code> — valores nulos/vacíos reciben un default</li>
                <li><strong>INITCAP:</strong> <code className="bg-slate-800 px-1 rounded">INITCAP(ciudad)</code> — &quot;medellín&quot; → &quot;Medellín&quot;, normalización</li>
                <li><strong>Filtrado:</strong> <code className="bg-slate-800 px-1 rounded">WHERE cantidad IS NOT NULL</code> — registros inválidos no pasan</li>
                <li><strong>Quality score:</strong> se calcula con reglas (vendedor presente = 1.0, ausente = 0.85)</li>
                <li><strong>Generated columns:</strong> <code className="bg-slate-800 px-1 rounded">ingreso_total = cantidad * precio_unit</code></li>
              </ol>
            </PedagogicalNote>

            <PedagogicalNote title="El campo ingreso_total es GENERATED ALWAYS AS" type="tip" defaultOpen={false}>
              <p>
                La columna <code className="bg-slate-800 px-1 rounded">ingreso_total</code> no se inserta manualmente — PostgreSQL la calcula
                automáticamente cada vez que <code className="bg-slate-800 px-1 rounded">cantidad</code> o{' '}
                <code className="bg-slate-800 px-1 rounded">precio_unit</code> cambian:
              </p>
              <p className="mt-2">
                <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300">ingreso_total NUMERIC(15,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED</code>
              </p>
              <p className="mt-2">
                Esto garantiza consistencia: es imposible que ingreso_total no coincida con cantidad x precio.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="¿Por qué hay menos registros en Silver que en Bronze?" type="exercise" defaultOpen={false}>
              <p>
                Bronze tiene <strong>{ventasRaw.length}</strong> registros pero Silver tiene <strong>{ventasClean.length}</strong>.
                ¿Qué pasó con {rejectedCount === 1 ? 'el registro faltante' : `los ${rejectedCount} registros faltantes`}?
              </p>
              <p className="mt-2">
                Ve a la tab <strong>Bronze</strong> y busca registros marcados con ⚠. Los que tienen{' '}
                <code className="bg-slate-800 px-1 rounded">cantidad = NULL</code> fueron rechazados porque el pipeline Silver
                tiene la regla <code className="bg-slate-800 px-1 rounded">WHERE cantidad IS NOT NULL</code>.
                No es un error — es gobernanza de calidad: mejor rechazar un dato malo que contaminar los reportes de Gold.
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="¿Por qué es obligatorio el catálogo?" type="governance" defaultOpen={true}>
              <p>
                Sin un catálogo, el Data Lake se convierte en un <strong>Data Swamp</strong> (pantano de datos). Un Data Swamp es un
                Lake donde nadie sabe qué datos hay, quién los puso, qué significan ni si se pueden confiar.
              </p>
              <p className="mt-2">
                El catálogo responde 5 preguntas esenciales: <strong>¿Qué hay?</strong> (tabla y descripción),{' '}
                <strong>¿De quién es?</strong> (owner/steward), <strong>¿Qué tan sensible es?</strong> (clasificación),{' '}
                <strong>¿Qué tan fresco?</strong> (freshness), <strong>¿Qué tan bueno?</strong> (quality score).
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="Clasificación de datos" type="concept" defaultOpen={false}>
              <p>
                Cada dataset tiene una clasificación de sensibilidad que determina quién puede accederlo:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong className="text-slate-300">Public:</strong> datos abiertos, cualquiera puede verlos (ej. catálogo de productos publicado)</li>
                <li><strong className="text-blue-400">Internal:</strong> uso interno de la organización, no sale afuera (ej. métricas de ventas agregadas)</li>
                <li><strong className="text-red-400">Confidential:</strong> acceso restringido, contiene información sensible del negocio (ej. precios de costo, márgenes)</li>
                <li><strong className="text-purple-400">Restricted:</strong> máxima protección, datos regulados por ley (ej. datos personales bajo Habeas Data)</li>
              </ul>
            </PedagogicalNote>

            <PedagogicalNote title="PII — Información Personal Identificable" type="concept" defaultOpen={false}>
              <p>
                <strong>PII</strong> (Personally Identifiable Information) son datos que identifican a una persona: nombre, cédula, email, dirección, teléfono.
                En Colombia, la <strong>Ley 1581 de 2012 (Habeas Data)</strong> obliga a proteger estos datos con medidas técnicas y organizativas.
              </p>
              <p className="mt-2">
                En este Data Lake, las tablas marcadas con <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded text-xs font-medium">PII</span> requieren
                enmascaramiento (ver tab Usuarios). Un NIT como <code className="bg-slate-800 px-1 rounded">900123456</code> se muestra como{' '}
                <code className="bg-slate-800 px-1 rounded">900****56</code> a roles sin autorización.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="La barra de calidad cambia de color" type="tip" defaultOpen={false}>
              <p>
                La barra de calidad de cada dataset usa un semáforo:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><span className="text-emerald-400 font-bold">Verde</span> (&ge;95%) — excelente calidad, listo para consumo</li>
                <li><span className="text-blue-400 font-bold">Azul</span> (&ge;90%) — buena calidad, aceptable para reportes</li>
                <li><span className="text-amber-400 font-bold">Ámbar</span> (&ge;85%) — calidad media, investigar campos faltantes</li>
                <li><span className="text-red-400 font-bold">Rojo</span> (&lt;85%) — calidad baja, no usar en decisiones críticas</li>
              </ul>
            </PedagogicalNote>

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

            <PedagogicalNote title="Detección de anomalías en IoT" type="concept" defaultOpen={true}>
              <p>
                El pipeline de sensores no solo almacena lecturas — también <strong>detecta anomalías</strong> automáticamente.
                Una anomalía es un valor que es físicamente imposible o estadísticamente improbable para el tipo de medición.
              </p>
              <p className="mt-2">
                Por ejemplo, un sensor de temperatura en Medellín que reporta -40°C o 200°C se marca como anómalo.
                El campo <code className="bg-slate-800 px-1 rounded">tiene_anomalias</code> en la vista Gold se calcula
                comparando lecturas contra rangos válidos definidos por tipo de sensor.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="SEN-001 tiene anomalía. ¿Qué valor es imposible?" type="exercise" defaultOpen={false}>
              <p>
                Busca el sensor <strong>SEN-001</strong> en las tarjetas de abajo. Tiene el badge rojo &quot;Anomalía&quot;.
              </p>
              <p className="mt-2">
                Observa sus valores: promedio, mínimo y máximo. ¿Cuál de esos valores parece imposible para el tipo de medición?
                Si es un sensor de temperatura, ¿tendría sentido un valor negativo extremo o un pico de 150°C?
              </p>
              <p className="mt-2">
                <strong>¿Cómo lo detectó el pipeline?</strong> El SQL compara cada lectura contra un rango configurable por tipo:
                <code className="bg-slate-800 px-1 rounded ml-1">WHERE valor NOT BETWEEN rango_min AND rango_max</code>.
                Si alguna lectura cae fuera, el sensor se marca con anomalía.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="SEN-004 tiene batería al 45%" type="tip" defaultOpen={false}>
              <p>
                En producción, un sensor con batería por debajo del 50% generaría una <strong>alerta de mantenimiento</strong> automática.
                El equipo de campo recibiría una notificación para reemplazar la batería antes de que el sensor deje de transmitir.
              </p>
              <p className="mt-2">
                Los colores del badge de batería siguen la convención: <span className="text-emerald-400">verde</span> (&ge;70%),{' '}
                <span className="text-amber-400">ámbar</span> (&ge;50%), <span className="text-red-400">rojo</span> (&lt;50%).
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="¿Por qué auditar cada acceso?" type="governance" defaultOpen={true}>
              <p>
                La auditoría no es opcional — es un <strong>requisito legal y regulatorio</strong>:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Ley 1581 de 2012 (Habeas Data Colombia):</strong> obliga a registrar quién accede a datos personales y con qué propósito</li>
                <li><strong>GDPR (si hay datos de ciudadanos UE):</strong> requiere demostrar accountability y trazabilidad de accesos</li>
                <li><strong>SOX (si la empresa cotiza en bolsa):</strong> los controles de acceso a datos financieros deben ser auditables</li>
              </ul>
              <p className="mt-2">
                Además, la auditoría permite detectar <strong>comportamientos anómalos</strong>: ¿por qué un analista descargó 10,000 registros
                de una tabla confidencial a las 3am? El log te da la evidencia.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="Campos del log de auditoría" type="concept" defaultOpen={false}>
              <p>
                Cada entrada del log captura:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Timestamp:</strong> cuándo exactamente ocurrió el acceso (zona horaria UTC)</li>
                <li><strong>Usuario:</strong> email del usuario autenticado (ligado a lake_users)</li>
                <li><strong>Rol:</strong> con qué rol accedió (admin, data_engineer, analyst, etc.)</li>
                <li><strong>Acción:</strong> SELECT (consulta), INSERT (carga), EXPORT (descarga), UPDATE, DELETE</li>
                <li><strong>Tabla:</strong> schema.tabla que fue accedida</li>
                <li><strong>Filas:</strong> cuántas filas fueron afectadas — un EXPORT de 10,000 filas es diferente de un SELECT de 5</li>
                <li><strong>IP:</strong> dirección IP desde donde se conectó — ayuda a detectar accesos desde ubicaciones no autorizadas</li>
              </ul>
            </PedagogicalNote>

            <PedagogicalNote title="¿Quién descargó (EXPORT) datos? ¿Es preocupante?" type="exercise" defaultOpen={false}>
              <p>
                Revisa la tabla de abajo y busca acciones de tipo <span className="px-2 py-0.5 bg-purple-900/50 text-purple-400 rounded text-xs font-medium">EXPORT</span>.
              </p>
              <p className="mt-2">
                Preguntas para analizar:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>¿Quién hizo el EXPORT? ¿Su rol tiene autorización para descargar datos de esa tabla?</li>
                <li>¿De qué tabla descargó? Si es una tabla con PII (ej. datos personales), ¿está justificado?</li>
                <li>¿Cuántas filas descargó? Un EXPORT masivo de una tabla confidencial debería activar una alerta</li>
                <li>¿A qué hora lo hizo? Un EXPORT fuera de horario laboral es una señal de alerta (red flag)</li>
              </ul>
              <p className="mt-2">
                En un sistema real, estos patrones se detectan con <strong>SIEM</strong> (Security Information and Event Management).
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="Principio de mínimo privilegio" type="governance" defaultOpen={true}>
              <p>
                Cada usuario recibe el <strong>mínimo acceso necesario</strong> para hacer su trabajo. Un analista de negocio
                solo necesita Gold (datos agregados listos para consumo). Darle acceso a Bronze sería un riesgo:
                podría ver datos crudos con PII sin enmascarar, o construir reportes con datos sucios.
              </p>
              <p className="mt-2">
                Este principio es un pilar de seguridad de la información (ISO 27001) y de gobernanza de datos (DAMA-DMBOK2).
                Si un usuario cambia de rol, sus permisos deben actualizarse inmediatamente.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="RBAC — Control de Acceso Basado en Roles" type="concept" defaultOpen={false}>
              <p>
                <strong>RBAC</strong> (Role-Based Access Control) asigna permisos a <strong>roles</strong>, no a usuarios individuales.
                Esto simplifica la administración: en vez de configurar permisos para 500 usuarios, defines 4 roles y asignas cada usuario a uno.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code className="bg-slate-800 px-1 rounded">admin</code> — acceso total + gestión de usuarios y políticas</li>
                <li><code className="bg-slate-800 px-1 rounded">data_engineer</code> — Bronze (R/W) + Silver (R/W) + Gold (R) — construye y mantiene pipelines</li>
                <li><code className="bg-slate-800 px-1 rounded">data_scientist</code> — Silver masked (R) + Gold (R) + Sandbox (R/W) — analiza datos sin ver PII</li>
                <li><code className="bg-slate-800 px-1 rounded">analyst</code> — Gold (R) — solo consume datos limpios y agregados</li>
              </ul>
              <p className="mt-2">
                En Supabase, esto se implementa con <strong>Row Level Security (RLS)</strong> — PostgreSQL evalúa el rol del usuario
                en cada consulta y filtra las filas automáticamente.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="Enmascaramiento PII (PII Masking)" type="concept" defaultOpen={false}>
              <p>
                Los data scientists necesitan acceder a datos de Silver para entrenar modelos, pero <strong>no necesitan ver datos personales</strong>.
                El enmascaramiento (masking) reemplaza parte del dato sensible con asteriscos:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>NIT: <code className="bg-slate-800 px-1 rounded">900123456</code> → <code className="bg-slate-800 px-1 rounded">900****56</code></li>
                <li>Email: <code className="bg-slate-800 px-1 rounded">juan@empresa.com</code> → <code className="bg-slate-800 px-1 rounded">j***@empresa.com</code></li>
                <li>Cédula: <code className="bg-slate-800 px-1 rounded">1017234567</code> → <code className="bg-slate-800 px-1 rounded">1017****67</code></li>
              </ul>
              <p className="mt-2">
                En este Lake, existe una vista <code className="bg-slate-800 px-1 rounded">silver_ventas_masked</code> que los
                data scientists ven en lugar de la tabla real. El dato original nunca sale de Silver.
              </p>
            </PedagogicalNote>

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

            <PedagogicalNote title="Stack tecnológico" type="concept" defaultOpen={true}>
              <p>
                Este Data Lake usa <strong>Supabase</strong> como backend porque es un <strong>PostgreSQL real</strong> con
                Row Level Security (RLS) nativo — no es un simulador, es la misma tecnología que usan empresas en producción.
                Supabase además provee Auth, Storage y APIs automáticas.
              </p>
              <p className="mt-2">
                <strong>Vercel</strong> despliega la app en el edge (CDN global) con Next.js 14. La combinación
                Supabase + Vercel permite tener un Data Lake funcional con gobernanza real en minutos, sin infraestructura propia.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="DAMA-DMBOK2 — Áreas de conocimiento implementadas" type="governance" defaultOpen={false}>
              <p>
                DAMA-DMBOK2 define <strong>11 áreas de conocimiento</strong> en gestión de datos. Este proyecto implementa varias:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Data Governance:</strong> políticas, roles, clasificación, catálogo obligatorio</li>
                <li><strong>Data Quality:</strong> quality scores, validación en Silver, métricas de completitud</li>
                <li><strong>Data Security:</strong> RLS, RBAC, enmascaramiento PII, cifrado TLS + AES-256</li>
                <li><strong>Data Architecture:</strong> arquitectura Medallion (Bronze → Silver → Gold)</li>
                <li><strong>Data Integration:</strong> pipelines Bronze → Silver con transformaciones SQL</li>
                <li><strong>Metadata Management:</strong> catálogo de datos con metadatos de ingestión</li>
                <li><strong>Data Storage:</strong> PostgreSQL con JSONB (Bronze) y tablas tipadas (Silver/Gold)</li>
              </ul>
              <p className="mt-2">
                Las áreas no implementadas (Master Data, Data Warehousing, Document/Content, Reference Data) son oportunidades
                para extender el proyecto.
              </p>
            </PedagogicalNote>

            <PedagogicalNote title="¿Por qué PostgreSQL y no S3 + Spark?" type="why" defaultOpen={false}>
              <p>
                En producción, un Data Lake típicamente usa <strong>S3</strong> (almacenamiento) + <strong>Spark</strong> (procesamiento)
                + <strong>Delta Lake/Iceberg</strong> (formato). Entonces, ¿por qué usamos PostgreSQL?
              </p>
              <p className="mt-2">
                Para enseñanza, PostgreSQL tiene ventajas importantes:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Mismo SQL:</strong> las consultas Bronze → Silver → Gold son las mismas que escribirías en Spark SQL o dbt</li>
                <li><strong>RLS nativo:</strong> S3 no tiene seguridad a nivel de fila — PostgreSQL sí, sin configurar herramientas extra</li>
                <li><strong>Cero infraestructura:</strong> Supabase es gratis, no necesitas AWS/GCP/Azure</li>
                <li><strong>Mismos conceptos:</strong> JSONB = schema-on-read (como Parquet), vistas materializadas = Gold layer, triggers = CDC</li>
              </ul>
              <p className="mt-2">
                Los conceptos de gobernanza (catálogo, clasificación, RBAC, auditoría, quality scores) son <strong>idénticos</strong>
                independientemente de si usas PostgreSQL, Databricks o Snowflake.
              </p>
            </PedagogicalNote>

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
