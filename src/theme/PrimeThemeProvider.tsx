import { PrimeReactProvider } from 'primereact/api'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'
import type { ReactNode } from 'react'
import 'primeicons/primeicons.css'

const ReelPreset = definePreset(Aura, {
  components: {
    tooltip: {
      root: {
        borderRadius: '0.5rem',
        padding: '0.45rem 0.7rem',
        shadow: '0 4px 16px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      },
      colorScheme: {
        light: {
          root: {
            background: '#ffffff',
            color: '#334155',
          },
        },
      },
    },
  },
})

const value = {
  ripple: true,
  inputStyle: 'outlined' as const,
  theme: {
    preset: ReelPreset,
    options: {
      prefix: 'p',
      darkModeSelector: 'none',
      cssLayer: false,
    },
  },
}

export function PrimeThemeProvider({ children }: { children: ReactNode }) {
  return <PrimeReactProvider value={value}>{children}</PrimeReactProvider>
}
