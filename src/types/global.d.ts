import type { PegasusApi } from '@shared/api'

declare global {
  interface Window {
    pegasus: PegasusApi
  }
}

export {}
