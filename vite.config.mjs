import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    server: {
        proxy: {
            '/api/fal/queue': {
                target: 'https://queue.fal.run',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/fal\/queue/, ''),
                router(req) {
                    // Status & result polling (GET /requests/...) must go to fal.run
                    // Submissions (POST) go to queue.fal.run
                    if (req.method === 'GET' && req.url.includes('/requests/')) {
                        return 'https://fal.run';
                    }
                    return 'https://queue.fal.run';
                }
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
