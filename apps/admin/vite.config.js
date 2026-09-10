import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        // Off when docs-capture.js drives this server headlessly — otherwise
        // every capture run (and every --force rerun) pops a new visible
        // browser tab pointed at the fixture admin.
        open: process.env.DOCS_CAPTURE !== "true",
    },
    build: {
        // Built straight into the server, which serves the SPA same-origin in
        // production (see apps/server/server.js). Not committed - the root
        // .gitignore covers apps/server/out/.
        outDir: '../server/out/admin',
        emptyOutDir: true, // required: Vite won't clear a dir outside its root
        sourcemap: false,
    },
    esbuild: {
        jsx: 'automatic',
    },
});
