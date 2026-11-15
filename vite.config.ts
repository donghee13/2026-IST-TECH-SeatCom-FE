import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // /api 로 시작하는 요청을 백엔드(목업) 서버로 넘김. CORS 문제를 피하려고 씀
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://127.0.0.1:8001',
          changeOrigin: true,
        },
      },
    },
  }
})