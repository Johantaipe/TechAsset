import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxy = { '/api': 'http://127.0.0.1:5106' }
export default defineConfig(({ mode }) => {
  const routes = mode === 'demo' ? undefined : proxy
  return { plugins: [react()], server: { proxy: routes }, preview: { proxy: routes } }
})
