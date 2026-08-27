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

  persist()
}

export function persist(): void {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(dbFilePath, Buffer.from(data))
}

export function run(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('Base de datos no inicializada')
  db.run(sql, params)
  persist()
}

/** Igual que run() pero sin persistir a disco — para usarse dentro de una transacción manual. */
export function runNoPersist(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('Base de datos no inicializada')
  db.run(sql, params)
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
  const row = get<{ id: number }>('SELECT last_insert_rowid() as id')
  return row?.id ?? 0
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
