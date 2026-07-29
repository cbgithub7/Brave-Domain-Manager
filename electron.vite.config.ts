import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    // No externalizeDepsPlugin here: webPreferences.sandbox is true, and a
    // sandboxed preload's require() only resolves Node built-ins, not
    // arbitrary node_modules packages. Everything the preload needs
    // (@electron-toolkit/preload, @shared/ipc-contract) must be bundled in;
    // only 'electron' itself stays external (it's a virtual/native module).
    build: {
      rollupOptions: {
        external: ['electron']
      }
    },
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
