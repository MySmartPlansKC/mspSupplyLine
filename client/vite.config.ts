import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  /** Local API default matches server PORT=3001; override in client/.env for prod-style setups. */
  const apiProxyTarget = env.VITE_API_PROXY_TARGET ?? 'http://localhost:3001';

  return {
    plugins: [tailwindcss(), react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      allowedHosts: ['supplyline.mysmartplans.com', 'localhost', '127.0.0.1'],
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
