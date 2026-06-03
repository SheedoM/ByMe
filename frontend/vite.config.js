import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { validateFrontendEnv } from './vite.env.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  validateFrontendEnv({ mode, env, processEnv: process.env })

  return {
    plugins: [react()],
    server: {
      port: 5175,
    },
  }
})
