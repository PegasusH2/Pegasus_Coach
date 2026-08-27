// Copia los ficheros no-TypeScript que el proceso main necesita en tiempo de ejecución
// (schema.sql) al directorio de salida compilado dist-electron.
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const src = path.join(root, 'electron', 'db', 'schema.sql')
const destDir = path.join(root, 'dist-electron', 'electron', 'db')
const dest = path.join(destDir, 'schema.sql')

fs.mkdirSync(destDir, { recursive: true })
fs.copyFileSync(src, dest)
console.log(`Copiado ${src} -> ${dest}`)
