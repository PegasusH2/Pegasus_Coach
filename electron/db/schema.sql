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

CREATE TABLE IF NOT EXISTS weight_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  pesoKg REAL NOT NULL,
  notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_weight_entry_fecha ON weight_entry(fecha);

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
