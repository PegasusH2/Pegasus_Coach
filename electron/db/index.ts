import fs from 'node:fs'
import path from 'node:path'
// sql.js no tiene tipos ESM limpios para el build de Node; se usa require dinámico.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require('sql.js') as (config?: unknown) => Promise<SqlJsStatic>

interface SqlJsStatement {
  bind(params?: unknown[]): boolean
  step(): boolean
  getAsObject(): Record<string, unknown>
  free(): void
}

interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void
  prepare(sql: string): SqlJsStatement
  export(): Uint8Array
  close(): void
}

interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase
}

let db: SqlJsDatabase | null = null
let dbFilePath = ''

export async function initDatabase(userDataPath: string): Promise<void> {
  const SQL = await initSqlJs()
  dbFilePath = path.join(userDataPath, 'pegasus-nutrition.sqlite')

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath)
    db = new SQL.Database(new Uint8Array(fileBuffer))
  } else {
    db = new SQL.Database()
  }

  const schemaPath = path.join(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  db.run(schema)

  const profileRows = all<{ id: number }>('SELECT id FROM profile WHERE id = 1')
  if (profileRows.length === 0) {
    run('INSERT INTO profile (id, nombre) VALUES (1, ?)', [''])
  }

  // Instalaciones que ya tenían weight_entry antes de la sincronización
  // (sin remoteId/createdAt/updatedAt/deletedAt) — se añaden aquí de forma
  // idempotente, nunca se recrea ni se borra la tabla. schema.sql ya cubre
  // las instalaciones nuevas.
  ensureColumn('weight_entry', 'remoteId', 'TEXT')
  ensureColumn('weight_entry', 'createdAt', 'TEXT')
  ensureColumn('weight_entry', 'updatedAt', 'TEXT')
  ensureColumn('weight_entry', 'deletedAt', 'TEXT')

  persist()
}

/** Añade una columna a una tabla ya existente solo si todavía no existe — nunca destructivo. */
function ensureColumn(table: string, column: string, sqlType: string): void {
  if (!db) return
  const columns = all<{ name: string }>(`PRAGMA table_info(${table})`)
  if (columns.some((c) => c.name === column)) return
  db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`)
}

/** Almacén clave-valor genérico (sesión de Supabase, deviceId, lastSyncedAt). */
export function kvGet(key: string): string | null {
  const row = get<{ value: string }>('SELECT value FROM sync_kv WHERE key = ?', [key])
  return row?.value ?? null
}

export function kvSet(key: string, value: string): void {
  run('INSERT INTO sync_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ])
}

export function kvDelete(key: string): void {
  run('DELETE FROM sync_kv WHERE key = ?', [key])
}

export function persist(): void {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(dbFilePath, Buffer.from(data))
}

// db.export() (usado por persist()) resetea last_insert_rowid() a 0 en
// sql.js — por eso se captura AQUÍ, justo tras el INSERT/UPDATE y antes de
// persistir, en vez de dejar que lastInsertId() la consulte más tarde (que
// siempre habría devuelto 0 tras cualquier run() previo).
let capturedLastInsertId = 0

function captureLastInsertId(): void {
  if (!db) return
  const stmt = db.prepare('SELECT last_insert_rowid() as id')
  try {
    stmt.step()
    capturedLastInsertId = (stmt.getAsObject() as { id: number }).id
  } finally {
    stmt.free()
  }
}

export function run(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('Base de datos no inicializada')
  db.run(sql, params)
  captureLastInsertId()
  persist()
}

/** Igual que run() pero sin persistir a disco — para usarse dentro de una transacción manual. */
export function runNoPersist(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('Base de datos no inicializada')
  db.run(sql, params)
  captureLastInsertId()
}

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  if (!db) throw new Error('Base de datos no inicializada')
  const stmt = db.prepare(sql)
  const results: T[] = []
  try {
    stmt.bind(params)
    while (stmt.step()) {
      results.push(stmt.getAsObject() as T)
    }
  } finally {
    stmt.free()
  }
  return results
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  const rows = all<T>(sql, params)
  return rows[0]
}

export function lastInsertId(): number {
  return capturedLastInsertId
}

/** Ejecuta varias escrituras y persiste una sola vez al final (evita reescribir el fichero N veces). */
export function transaction(fn: () => void): void {
  if (!db) throw new Error('Base de datos no inicializada')
  db.run('BEGIN')
  try {
    fn()
    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }
  persist()
}

export function closeDatabase(): void {
  if (db) {
    persist()
    db.close()
    db = null
  }
}
