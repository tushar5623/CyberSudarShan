import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'
import { resolveApiBaseUrl } from './src/lib/api.js'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_')
    resolveApiBaseUrl(process.env.VITE_API_BASE_URL ?? env.VITE_API_BASE_URL, { production: true })
  }
  return { plugins: [react()] }
})
