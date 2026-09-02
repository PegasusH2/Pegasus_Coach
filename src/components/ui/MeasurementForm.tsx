import { useState } from 'react'
import { Field } from './Field'
import { Button } from './Button'
import { hoyIso } from '@/lib/format'
import { createMeasurement, updateMeasurement } from '@/lib/supabase/measurementRepo'
import type { Measurement, MeasurementInput } from '@/types'

export interface CampoMedicion {
  key: keyof Measurement
  label: string
  suffix?: string
}

/** Formulario genérico de alta/edición de una medición parcial (pliegues o
 * perímetros); ningún campo es obligatorio. Con `editing` pasa a modo edición:
 * precarga sus valores y guarda con `updateMeasurement` en vez de crear una fila. */
export function MeasurementForm({
  userId,
  campos,
  onSaved,
  editing,
  onCancel,
}: {
  userId: string
  campos: CampoMedicion[]
  onSaved: () => void
  editing?: Measurement
  onCancel?: () => void
}) {
  const [fecha, setFecha] = useState(editing?.fecha ?? hoyIso())
  const [valores, setValores] = useState<Record<string, string>>(() => {
    if (!editing) return {}
    const init: Record<string, string> = {}
    for (const c of campos) {
      const v = (editing as unknown as Record<string, number | null>)[c.key as string]
      if (v !== null && v !== undefined) init[c.key as string] = String(v)
    }
    return init
  })
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      const data: MeasurementInput = {
        userId,
        fecha,
        pectoral: null,
        axila: null,
        triceps: null,
        subescapular: null,
        abdomen: null,
        suprailiaco: null,
        cuadriceps: null,
        porcentajeGraso: null,
        brazo: null,
        cintura: null,
        cadera: null,
        muslo: null,
        pecho: null,
        cuello: null,
        notas: editing?.notas ?? null,
      }
      for (const c of campos) {
        const raw = valores[c.key as string]
        if (raw && raw.trim() !== '') {
          ;(data as Record<string, unknown>)[c.key as string] = Number(raw)
        }
      }
      if (editing) {
        await updateMeasurement(editing.id, data)
      } else {
        await createMeasurement(data)
        setValores({})
      }
      onSaved()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        {campos.map((c) => (
          <Field
            key={c.key as string}
            label={c.label}
            type="number"
            suffix={c.suffix}
            value={valores[c.key as string] ?? ''}
            onChange={(e) => setValores((v) => ({ ...v, [c.key as string]: e.target.value }))}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-end gap-2">
        {editing && onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
        )}
        <Button onClick={guardar} disabled={guardando}>
          {editing ? 'Guardar cambios' : 'Guardar medición'}
        </Button>
      </div>
    </div>
  )
}
