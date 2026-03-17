import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Missing Supabase environment variables')
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

export interface VentasPorCiudad {
  ciudad: string
  num_transacciones: number
  unidades_vendidas: number
  ingreso_total: number
  ticket_promedio: number
  calidad_promedio: number
  primera_venta: string
  ultima_venta: string
}

export interface VentasPorProducto {
  producto: string
  num_transacciones: number
  unidades_vendidas: number
  ingreso_total: number
  precio_promedio: number
}

export interface CatalogEntry {
  id: number
  schema_name: string
  table_name: string
  description: string
  owner: string
  classification: string
  has_pii: boolean
  row_count: number
  freshness: string
  quality_score: number
  updated_at: string
}

export interface AccessLog {
  id: number
  user_email: string
  user_role: string
  action: string
  schema_name: string
  table_name: string
  row_count: number
  ip_address: string
  timestamp: string
}

export interface EstadoSensor {
  sensor_id: string
  tipo_medicion: string
  ubicacion: string
  valor_promedio: number
  valor_min: number
  valor_max: number
  unidad: string
  bateria_actual: number
  tiene_anomalias: boolean
  total_lecturas: number
}

export interface LakeUser {
  id: string
  email: string
  full_name: string
  role: string
  department: string
}

export interface VentaClean {
  id: number
  fecha: string
  producto: string
  cantidad: number
  precio_unit: number
  vendedor: string
  ciudad: string
  ingreso_total: number
  quality_score: number
  source_record_id: number
}

export interface VentaRaw {
  id: number
  raw_data: Record<string, unknown>
  source_system: string
  ingested_at: string
  ingested_by: string
  file_name: string
}
