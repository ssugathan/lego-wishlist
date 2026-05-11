import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev proxy mirrors the production Vercel function in api/notion/[...path].js:
// both inject Authorization + Notion-Version server-side so the API key
// never reaches the browser. Reading NOTION_API_KEY via loadEnv (not
// import.meta.env) keeps it out of the client bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/notion': {
          target: 'https://api.notion.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/notion/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (env.NOTION_API_KEY) {
                proxyReq.setHeader('Authorization', `Bearer ${env.NOTION_API_KEY}`);
              }
              proxyReq.setHeader('Notion-Version', '2022-06-28');
            });
          },
        },
      },
    },
  };
});
