import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { visualizer } from "rollup-plugin-visualizer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // This plugin provides fast refresh for React components
    react({
      jsxRuntime: "automatic",
      jsxImportSource: "react",
    }),
    // The visualizer plugin helps analyze your bundle size and composition
    visualizer({
      filename: "./dist/stats.html",
      open: false, // Set to true to automatically open the visualizer on build
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  esbuild: {
    // Suppresses a specific esbuild warning, which is a good practice
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
  optimizeDeps: {
    // Forces pre-bundling for these core dependencies during development
    include: [
      "react", 
      "react-dom",
      "wouter",
      "axios",
      "zustand"
    ],
    // Removed the 'exclude' list. It's generally better to let Vite handle these,
    // especially since they are dynamically imported in production.
    force: true,
  },
  resolve: {
    // Defines aliases for cleaner import paths, like @/ and @shared/
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    target: "esnext",
    // Use the Terser minifier for smaller production builds
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Defines the manual chunks for vendors. This is crucial for code splitting.
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip'
          ],
          'pdf-vendor': ['jspdf', 'html2canvas'],
          'charts-vendor': ['recharts'],
          'stripe-vendor': ['@stripe/react-stripe-js', '@stripe/stripe-js'],
          'date-vendor': ['luxon', 'date-fns', 'date-fns-tz'],
          'form-vendor': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'motion-vendor': ['framer-motion'],
          'utils-vendor': ['clsx', 'class-variance-authority', 'tailwind-merge'],
        },
        // Ensures consistent and readable file names for chunks and assets
        chunkFileNames: (chunkInfo) => {
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || 'asset';
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Disabling sourcemaps in production helps reduce final bundle size
    sourcemap: false,
  },
  server: {
    fs: { strict: true, deny: ["**/.*"] },
    hmr: { overlay: false },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});