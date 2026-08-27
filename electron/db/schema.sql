CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nombre TEXT NOT NULL DEFAULT '',
  pesoInicial REAL,
  fechaInicio TEXT,
  neatObjetivoPasos INTEGER
);

CREATE TABLE IF NOT EXISTS mesociclo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  nombre TEXT,
  fechaInicio TEXT
);

CREATE TABLE IF NOT EXISTS semana (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mesocicloId INTEGER NOT NULL REFERENCES mesociclo(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  fechaInicio TEXT
);

CREATE TABLE IF NOT EXISTS macro_plan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  semanaId INTEGER REFERENCES semana(id) ON DELETE SET NULL,
  neatObjetivoPasos INTEGER,
  aguaLitros REAL,
  salGramos REAL,
  entrenamientoDiasSemana INTEGER,
  entrenamientoDuracionMin INTEGER,
  pesoCorporalRef REAL,
  porcentajeGraso REAL,
  normocalorico REAL,
  diasOn INTEGER,
  proteinaOn REAL,
  hidratosOn REAL,
  grasasOn REAL,
  diasOff INTEGER,
  proteinaOff REAL,
  hidratosOff REAL,
  grasasOff REAL,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_macro_plan_fecha ON macro_plan(fecha);

-- remoteId/createdAt/updatedAt son para la sincronización opcional con la
-- Cuenta Pegasus (ver electron/sync/); el borrado local sigue siendo físico,
-- como en el resto de la app. En una instalación existente
-- (weight_entry ya creada sin estas columnas) db/index.ts las añade con
-- ALTER TABLE de forma idempotente al arrancar — este CREATE TABLE solo
-- cubre instalaciones nuevas.
CREATE TABLE IF NOT EXISTS weight_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  pesoKg REAL NOT NULL,
  notas TEXT,
  remoteId TEXT,
  createdAt TEXT,
  updatedAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_weight_entry_fecha ON weight_entry(fecha);
-- idx_weight_entry_remote se crea en db/index.ts, DESPUÉS de ensureColumn(), no aquí:
-- en una instalación existente la columna remoteId todavía no existe en este punto
-- (se añade por ALTER TABLE más abajo en el arranque), y este CREATE INDEX se ejecuta
-- como parte del mismo db.run(schema) que crea las tablas, antes de esa migración.

CREATE TABLE IF NOT EXISTS measurement (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  pectoral REAL,
  axila REAL,
  triceps REAL,
  subescapular REAL,
  abdomen REAL,
  suprailiaco REAL,
  cuadriceps REAL,
  porcentajeGraso REAL,
  brazo REAL,
  cintura REAL,
  cadera REAL,
  muslo REAL,
  pecho REAL,
  cuello REAL,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_measurement_fecha ON measurement(fecha);

-- ---------------------------------------------------------------------
-- Sincronización opcional con la Cuenta Pegasus (Supabase). Vacías/sin uso
-- en instalaciones sin cuenta — ver electron/sync/.
-- ---------------------------------------------------------------------

-- Almacén clave-valor genérico: sesión de Supabase Auth (persistida por el
-- adaptador de storage propio, ver electron/sync/supabaseStorage.ts),
-- deviceId, lastSyncedAt. Mismo rol que la tabla `settings` de Pegasus Tracker.
CREATE TABLE IF NOT EXISTS sync_kv (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Outbox local: cambios pendientes de subir a Supabase. Solo se usa la
-- entidad 'weight_entry' por ahora (ver docs de la propuesta de integración
-- Tracker+Nutrition — fase 1).
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity TEXT NOT NULL,
  entityId TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  lastAttemptAt TEXT,
  lastError TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
