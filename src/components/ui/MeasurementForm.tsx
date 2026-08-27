import { useState } from 'react'
import { Field } from './Field'
import { Button } from './Button'
import { hoyIso } from '@/lib/format'
import type { Measurement, MeasurementInput } from '@shared/types'

export interface CampoMedicion {
  key: keyof Measurement
  label: string
  suffix?: string
}

/** Formulario genérico de alta de una medición parcial (pliegues o perímetros); ningún campo es obligatorio. */
export function MeasurementForm({
  campos,
  onSaved,
}: {
  campos: CampoMedicion[]
  onSaved: () => void
}) {
  const [fecha, setFecha] = useState(hoyIso())
  const [valores, setValores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  async function guardar() {
    setGuardando(true)
    try {
      const data: MeasurementInput = {
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
        notas: null,
      }
      for (const c of campos) {
        const raw = valores[c.key as string]
        if (raw && raw.trim() !== '') {
          ;(data as Record<string, unknown>)[c.key as string] = Number(raw)
        }
      }
      await window.pegasus.measurements.create(data)
      setValores({})
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
      <div className="mt-3 flex justify-end">
        <Button onClick={guardar} disabled={guardando}>
          Guardar medición
        </Button>
      </div>
    </div>
  )
}
