// Checkbox + leyenda "Aplicar recomendaciones de macros según sexo" — compartido
// entre MacrosFlexibles.tsx (configuración de un plan real) y CalculadoraMacros.tsx
// (cálculo suelto), para no duplicar el contenido ni el estilo. Puramente
// informativo: no alimenta ningún cálculo, solo se muestra/oculta.
import type { Sexo } from '@/types'

/** Mismo estilo que el resto de la tarjeta "General" (borde + bg-panel), sin colores nuevos. */
function BloqueRecomendacion({ titulo, filas }: { titulo: string; filas: [string, string][] }) {
  return (
    <div className="rounded-control border border-bg-border bg-bg-panel p-2">
      <div className="mb-1 text-xs font-semibold text-text-primary">{titulo}</div>
      <div className="flex flex-col gap-0.5 text-xs text-text-secondary">
        {filas.map(([label, valor]) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-text-muted">{label}:</span>
            <span className="text-right">{valor}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const RECOMENDACION_PERDIDA: [string, string][] = [
  ['Proteína', '1,6–2,2 g/kg'],
  ['Grasas', '0,6–1,0 g/kg'],
  ['Carbohidratos', 'Calorías restantes'],
  ['Calorías', 'Déficit 10–20%'],
]
const RECOMENDACION_GANANCIA: [string, string][] = [
  ['Proteína', '1,6–2,0 g/kg'],
  ['Grasas', '0,7–1,0 g/kg'],
  ['Carbohidratos', 'Calorías restantes'],
  ['Calorías', 'Superávit 5–15%'],
]

/** Si se conoce el sexo del cliente (hombre/mujer) solo se muestran sus dos bloques
 * — si no (otro/prefiero no decir/sin dato), se muestran los cuatro como antes,
 * porque no hay forma de saber cuál aplica. */
function LeyendaRecomendacionesSexo({ sexo }: { sexo?: Sexo | null }) {
  const mostrarHombre = sexo == null || sexo === 'hombre'
  const mostrarMujer = sexo == null || sexo === 'mujer'
  return (
    <div className="mt-2 border-t border-bg-border pt-2">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {mostrarHombre && (
          <>
            <BloqueRecomendacion titulo="Hombre — Pérdida de grasa" filas={RECOMENDACION_PERDIDA} />
            <BloqueRecomendacion titulo="Hombre — Ganancia muscular" filas={RECOMENDACION_GANANCIA} />
          </>
        )}
        {mostrarMujer && (
          <>
            <BloqueRecomendacion titulo="Mujer — Pérdida de grasa" filas={RECOMENDACION_PERDIDA} />
            <BloqueRecomendacion titulo="Mujer — Ganancia muscular" filas={RECOMENDACION_GANANCIA} />
          </>
        )}
      </div>
      <p className="mt-1.5 text-xs text-text-muted">
        Las recomendaciones se calculan principalmente según peso, actividad y objetivo. El sexo se utiliza para
        ajustar las necesidades energéticas, no para establecer macros completamente diferentes.
      </p>
    </div>
  )
}

export function RecomendacionesMacrosSexoToggle({
  checked,
  onChange,
  disabled,
  sexo,
}: {
  checked: boolean
  onChange: (valor: boolean) => void
  disabled?: boolean
  /** Sexo del cliente al que aplica esta configuración — si se indica ('hombre'/'mujer'),
   * la leyenda solo muestra ese bloque. Sin indicar (p.ej. la Calculadora suelta, sin
   * cliente asociado) se muestran los cuatro. */
  sexo?: Sexo | null
}) {
  return (
    <>
      <label className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" className="accent-pegasus-red" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        Aplicar recomendaciones de macros según sexo
      </label>
      {checked && <LeyendaRecomendacionesSexo sexo={sexo} />}
    </>
  )
}
