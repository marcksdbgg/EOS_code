import { defineConfig } from 'vite';

export default defineConfig({
    // Prevent vite from obscuring rust errors
    clearScreen: false,

    // Tauri expects a fixed port
    server: {
        port: 5173,
        strictPort: true,
        watch: {
            ignored: ['**/src-tauri/**']
        }
    },

    // Build configuration
    build: {
        // Tauri uses Chromium on Windows and WebKit on macOS/Linux
        target: process.env.TAURI_ENV_PLATFORM === 'windows'
            ? 'chrome105'
            : 'safari14',
        // Produce sourcemaps for debugging
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: './src/index.html'
            }
        }
    },

    // Public directory for static assets
    publicDir: 'public',

    // Root directory
    root: './src'
});
