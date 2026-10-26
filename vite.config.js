import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {

  const env = loadEnv(mode, process.cwd(),'');

  return {
   plugins: [react()],
   server: {
    proxy: {
      '/ollama_api':{
        target: env.VITE_OLLAMA_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama_api/, ''),
      },
    },
   }
  };
});
