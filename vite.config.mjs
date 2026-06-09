import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        proxy: {
            '/api/fal/queue': {
                target: 'https://queue.fal.run',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/fal\/queue/, '')
            },
            '/api/fal/files': {
                target: 'https://api.fal.ai/v1/serverless/files',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/fal\/files/, '')
            }
        }
    }
});
