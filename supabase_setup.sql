-- =============================================
-- DATA LAKE GOVERNANCE HUB — Setup completo
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. ESQUEMAS
CREATE SCHEMA IF NOT EXISTS bronze;
CREATE SCHEMA IF NOT EXISTS silver;
CREATE SCHEMA IF NOT EXISTS gold;
CREATE SCHEMA IF NOT EXISTS audit;

-- 2. USUARIOS
CREATE TABLE public.lake_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('data_engineer','data_scientist','analyst','admin')),
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.lake_users (email, full_name, role, department) VALUES
('carlos.ingeniero@eafit.edu.co', 'Carlos Martínez', 'data_engineer', 'TI'),
('maria.ciencia@eafit.edu.co', 'María López', 'data_scientist', 'Innovación'),
('pedro.analista@eafit.edu.co', 'Pedro García', 'analyst', 'Comercial'),
('admin@eafit.edu.co', 'Admin Lake', 'admin', 'TI');

-- 3. BRONZE — Ventas raw
CREATE TABLE bronze.ventas_raw (
    id BIGSERIAL PRIMARY KEY,
    raw_data JSONB NOT NULL,
    source_system TEXT NOT NULL,
    ingested_at TIMESTAMPTZ DEFAULT now(),
    ingested_by TEXT,
    file_name TEXT,
    batch_id UUID DEFAULT gen_random_uuid()
);

INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-01","producto":"Sensor IoT X200","cantidad":150,"precio_unit":45000,"vendedor":"Juan Pérez","ciudad":"Medellín","cliente_nit":"900123456","cliente_nombre":"Acueducto Municipal"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260301.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-01","producto":"Válvula Industrial V50","cantidad":80,"precio_unit":120000,"vendedor":"Ana Gómez","ciudad":"Bogotá","cliente_nit":"800456789","cliente_nombre":"Constructora Andina"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260301.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-02","producto":"Medidor Caudal M100","cantidad":200,"precio_unit":35000,"vendedor":"Juan Pérez","ciudad":"Cali","cliente_nit":"901789012","cliente_nombre":"EPM Regional"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260302.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-02","producto":"Sensor IoT X200","cantidad":null,"precio_unit":45000,"vendedor":"","ciudad":"medellin","cliente_nit":"900123456","cliente_nombre":"Acueducto Municipal"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260302.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-03","producto":"Bomba Sumergible BS30","cantidad":25,"precio_unit":890000,"vendedor":"Carlos Ruiz","ciudad":"Barranquilla","cliente_nit":"800111222","cliente_nombre":"Acueducto del Atlántico"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260303.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-03","producto":"Tubería PVC 4in","cantidad":500,"precio_unit":8500,"vendedor":"Ana Gómez","ciudad":"Bogotá","cliente_nit":"900333444","cliente_nombre":"Obras Nacionales SAS"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260303.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-04","producto":"Sensor IoT X200","cantidad":75,"precio_unit":45000,"vendedor":"Juan Pérez","ciudad":"Medellín","cliente_nit":"900123456","cliente_nombre":"Acueducto Municipal"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260304.json');
INSERT INTO bronze.ventas_raw (raw_data, source_system, ingested_by, file_name) VALUES ('{"fecha":"2026-03-05","producto":"Medidor Caudal M100","cantidad":300,"precio_unit":35000,"vendedor":"Carlos Ruiz","ciudad":"Cartagena","cliente_nit":"800555666","cliente_nombre":"Aguas de Cartagena"}', 'SAP-ERP', 'etl-pipeline', 'export_ventas_20260305.json');

-- BRONZE — Sensores IoT
CREATE TABLE bronze.sensores_raw (
    id BIGSERIAL PRIMARY KEY,
    raw_data JSONB NOT NULL,
    source_system TEXT DEFAULT 'iot-gateway',
    ingested_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO bronze.sensores_raw (raw_data) VALUES ('{"sensor_id":"SEN-001","tipo":"caudal","valor":245.7,"unidad":"L/s","ubicacion":"Planta Norte","timestamp":"2026-03-15T10:00:00Z","bateria":85}');
INSERT INTO bronze.sensores_raw (raw_data) VALUES ('{"sensor_id":"SEN-002","tipo":"presion","valor":4.2,"unidad":"bar","ubicacion":"Red Principal","timestamp":"2026-03-15T10:00:00Z","bateria":72}');
INSERT INTO bronze.sensores_raw (raw_data) VALUES ('{"sensor_id":"SEN-003","tipo":"calidad","valor":7.1,"unidad":"pH","ubicacion":"Punto Captación","timestamp":"2026-03-15T10:00:00Z","bateria":91}');
INSERT INTO bronze.sensores_raw (raw_data) VALUES ('{"sensor_id":"SEN-001","tipo":"caudal","valor":-5.0,"unidad":"L/s","ubicacion":"Planta Norte","timestamp":"2026-03-15T10:05:00Z","bateria":85}');
INSERT INTO bronze.sensores_raw (raw_data) VALUES ('{"sensor_id":"SEN-004","tipo":"nivel","valor":12.3,"unidad":"m","ubicacion":"Tanque Reserva","timestamp":"2026-03-15T10:00:00Z","bateria":45}');

-- 4. SILVER — Ventas limpias
CREATE TABLE silver.ventas_clean (
    id BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    producto TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unit NUMERIC(12,2) NOT NULL CHECK (precio_unit > 0),
    vendedor TEXT NOT NULL,
    ciudad TEXT NOT NULL,
    cliente_nit TEXT,
    cliente_nombre TEXT,
    ingreso_total NUMERIC(15,2) GENERATED ALWAYS AS (cantidad * precio_unit) STORED,
    source_record_id BIGINT REFERENCES bronze.ventas_raw(id),
    processed_at TIMESTAMPTZ DEFAULT now(),
    quality_score NUMERIC(3,2) DEFAULT 1.00
);

-- Transformación Bronze a Silver
INSERT INTO silver.ventas_clean (fecha, producto, cantidad, precio_unit, vendedor, ciudad, cliente_nit, cliente_nombre, source_record_id, quality_score)
SELECT
    (raw_data->>'fecha')::date,
    raw_data->>'producto',
    (raw_data->>'cantidad')::integer,
    (raw_data->>'precio_unit')::numeric,
    COALESCE(NULLIF(raw_data->>'vendedor', ''), 'Sin asignar'),
    INITCAP(raw_data->>'ciudad'),
    raw_data->>'cliente_nit',
    raw_data->>'cliente_nombre',
    id,
    CASE WHEN raw_data->>'vendedor' = '' THEN 0.70 ELSE 1.00 END
FROM bronze.ventas_raw
WHERE (raw_data->>'cantidad') IS NOT NULL
  AND (raw_data->>'cantidad')::integer > 0
  AND (raw_data->>'precio_unit')::numeric > 0;

-- SILVER — Sensores limpios
CREATE TABLE silver.sensores_clean (
    id BIGSERIAL PRIMARY KEY,
    sensor_id TEXT NOT NULL,
    tipo_medicion TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    unidad TEXT NOT NULL,
    ubicacion TEXT NOT NULL,
    timestamp_lectura TIMESTAMPTZ NOT NULL,
    bateria_pct INTEGER,
    is_anomaly BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO silver.sensores_clean (sensor_id, tipo_medicion, valor, unidad, ubicacion, timestamp_lectura, bateria_pct, is_anomaly)
SELECT
    raw_data->>'sensor_id',
    raw_data->>'tipo',
    (raw_data->>'valor')::numeric,
    raw_data->>'unidad',
    raw_data->>'ubicacion',
    (raw_data->>'timestamp')::timestamptz,
    (raw_data->>'bateria')::integer,
    CASE WHEN (raw_data->>'valor')::numeric < 0 THEN TRUE ELSE FALSE END
FROM bronze.sensores_raw;

-- 5. GOLD — Vistas materializadas
CREATE MATERIALIZED VIEW gold.ventas_por_ciudad AS
SELECT
    ciudad,
    COUNT(*) AS num_transacciones,
    SUM(cantidad) AS unidades_vendidas,
    SUM(ingreso_total) AS ingreso_total,
    ROUND(AVG(ingreso_total), 2) AS ticket_promedio,
    ROUND(AVG(quality_score), 2) AS calidad_promedio,
    MIN(fecha) AS primera_venta,
    MAX(fecha) AS ultima_venta
FROM silver.ventas_clean
GROUP BY ciudad ORDER BY ingreso_total DESC;

CREATE MATERIALIZED VIEW gold.ventas_por_producto AS
SELECT
    producto,
    COUNT(*) AS num_transacciones,
    SUM(cantidad) AS unidades_vendidas,
    SUM(ingreso_total) AS ingreso_total,
    ROUND(AVG(precio_unit), 2) AS precio_promedio
FROM silver.ventas_clean
GROUP BY producto ORDER BY ingreso_total DESC;

CREATE MATERIALIZED VIEW gold.estado_sensores AS
SELECT
    sensor_id, tipo_medicion, ubicacion,
    ROUND(AVG(valor), 2) AS valor_promedio,
    MIN(valor) AS valor_min, MAX(valor) AS valor_max,
    unidad, MIN(bateria_pct) AS bateria_actual,
    BOOL_OR(is_anomaly) AS tiene_anomalias,
    COUNT(*) AS total_lecturas
FROM silver.sensores_clean
GROUP BY sensor_id, tipo_medicion, ubicacion, unidad;

-- Catálogo de datos
CREATE TABLE gold.data_catalog (
    id SERIAL PRIMARY KEY,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    description TEXT,
    owner TEXT,
    classification TEXT CHECK (classification IN ('public', 'internal', 'confidential', 'restricted')),
    has_pii BOOLEAN DEFAULT FALSE,
    row_count BIGINT,
    freshness TEXT,
    quality_score NUMERIC(3,2),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO gold.data_catalog (schema_name, table_name, description, owner, classification, has_pii, row_count, freshness, quality_score) VALUES
('bronze', 'ventas_raw', 'Datos crudos de ventas desde SAP ERP', 'equipo-datos', 'confidential', true, 8, 'daily', 0.85),
('bronze', 'sensores_raw', 'Lecturas crudas de sensores IoT', 'equipo-iot', 'internal', false, 5, 'real-time', 0.80),
('silver', 'ventas_clean', 'Ventas validadas y normalizadas', 'equipo-datos', 'confidential', true, 7, 'daily', 0.95),
('silver', 'sensores_clean', 'Sensores validados con anomalias marcadas', 'equipo-iot', 'internal', false, 5, 'near-real-time', 0.92),
('gold', 'ventas_por_ciudad', 'Agregacion de ventas por ciudad', 'equipo-bi', 'internal', false, 5, 'daily', 0.98),
('gold', 'ventas_por_producto', 'Agregacion de ventas por producto', 'equipo-bi', 'internal', false, 5, 'daily', 0.98),
('gold', 'estado_sensores', 'Dashboard de estado de sensores IoT', 'equipo-iot', 'public', false, 4, 'hourly', 0.97);

-- 6. AUDITORÍA
CREATE TABLE audit.access_log (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    user_role TEXT,
    action TEXT NOT NULL,
    schema_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    row_count INTEGER,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    details JSONB
);

INSERT INTO audit.access_log (user_email, user_role, action, schema_name, table_name, row_count, ip_address) VALUES
('carlos.ingeniero@eafit.edu.co', 'data_engineer', 'INSERT', 'bronze', 'ventas_raw', 8, '10.0.1.15'),
('carlos.ingeniero@eafit.edu.co', 'data_engineer', 'INSERT', 'silver', 'ventas_clean', 7, '10.0.1.15'),
('maria.ciencia@eafit.edu.co', 'data_scientist', 'SELECT', 'silver', 'ventas_clean', 7, '10.0.2.22'),
('pedro.analista@eafit.edu.co', 'analyst', 'SELECT', 'gold', 'ventas_por_ciudad', 5, '10.0.3.8'),
('pedro.analista@eafit.edu.co', 'analyst', 'EXPORT', 'gold', 'ventas_por_ciudad', 5, '10.0.3.8'),
('maria.ciencia@eafit.edu.co', 'data_scientist', 'SELECT', 'gold', 'estado_sensores', 4, '10.0.2.22'),
('admin@eafit.edu.co', 'admin', 'SELECT', 'audit', 'access_log', 6, '10.0.0.1');

-- 7. VISTAS PÚBLICAS (para API REST de Supabase)
CREATE OR REPLACE VIEW public.gold_ventas_por_ciudad AS SELECT * FROM gold.ventas_por_ciudad;
CREATE OR REPLACE VIEW public.gold_ventas_por_producto AS SELECT * FROM gold.ventas_por_producto;
CREATE OR REPLACE VIEW public.gold_estado_sensores AS SELECT * FROM gold.estado_sensores;
CREATE OR REPLACE VIEW public.gold_data_catalog AS SELECT * FROM gold.data_catalog;
CREATE OR REPLACE VIEW public.silver_ventas_clean AS SELECT * FROM silver.ventas_clean;
CREATE OR REPLACE VIEW public.silver_sensores_clean AS SELECT * FROM silver.sensores_clean;
CREATE OR REPLACE VIEW public.bronze_ventas_raw AS SELECT * FROM bronze.ventas_raw;
CREATE OR REPLACE VIEW public.bronze_sensores_raw AS SELECT * FROM bronze.sensores_raw;
CREATE OR REPLACE VIEW public.audit_access_log AS SELECT * FROM audit.access_log;

-- 8. PERMISOS
GRANT USAGE ON SCHEMA bronze TO anon, authenticated;
GRANT USAGE ON SCHEMA silver TO anon, authenticated;
GRANT USAGE ON SCHEMA gold TO anon, authenticated;
GRANT USAGE ON SCHEMA audit TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA bronze TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA silver TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA gold TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA audit TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
