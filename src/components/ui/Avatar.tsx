// No hay fotos de perfil en la app — iniciales generadas a partir del nombre,
// con un color determinista (mismo nombre = mismo color siempre).
const COLORES = ['#e8383d', '#f0a53a', '#e8b93a', '#3aa0e8', '#7a5af5', '#2fbf8f']

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function colorPara(nombre: string): string {
  let hash = 0
  for (let i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) | 0
  return COLORES[Math.abs(hash) % COLORES.length]
}

export function Avatar({ nombre, size = 36 }: { nombre: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, backgroundColor: colorPara(nombre || '?') }}
    >
      {iniciales(nombre || '?')}
    </div>
  )
}
