import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

function attachmentVaultPlugin() {
  return {
    name: 'attachment-vault-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const pathname = decodeURIComponent(parsedUrl.pathname);

        // 1. Handle file streaming: /api/v1/attachments/file/:filename
        if (pathname.startsWith('/api/v1/attachments/file/')) {
          const filename = pathname.replace('/api/v1/attachments/file/', '').trim();

          const possiblePaths = [
            path.resolve('public/api/v1/attachments/file', filename),
            path.resolve('public/attachments', filename),
            path.resolve('scratch/test_files', filename),
            path.resolve('scratch', filename),
          ];

          let foundPath = possiblePaths.find((p) => fs.existsSync(p));

          if (!foundPath) {
            const cleanName = filename.toLowerCase();
            if (cleanName.includes('blood') || cleanName.includes('medical')) {
              foundPath = path.resolve('scratch/medical_blood_panel.pdf');
            } else if (cleanName.includes('panoramic') || cleanName.includes('dental') || cleanName.includes('opg')) {
              foundPath = path.resolve('scratch/dental_panoramic_opg.pdf');
            } else if (cleanName.includes('fundus') || cleanName.includes('vision') || cleanName.includes('retinal')) {
              foundPath = path.resolve('scratch/vision_fundus_retinal.pdf');
            }
          }

          if (foundPath && fs.existsSync(foundPath)) {
            const stat = fs.statSync(foundPath);
            let contentType = 'application/octet-stream';
            const lower = foundPath.toLowerCase();
            if (lower.endsWith('.pdf')) contentType = 'application/pdf';
            else if (lower.endsWith('.png')) contentType = 'image/png';
            else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) contentType = 'image/jpeg';
            else if (lower.endsWith('.webp')) contentType = 'image/webp';
            else if (lower.endsWith('.dcm')) contentType = 'application/dicom';

            res.writeHead(200, {
              'Content-Type': contentType,
              'Content-Length': stat.size,
              'Content-Disposition': `inline; filename="${path.basename(foundPath)}"`,
              'Access-Control-Allow-Origin': '*',
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=3600',
            });
            fs.createReadStream(foundPath).pipe(res);
            return;
          }
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), attachmentVaultPlugin()],
  server: {
    port: 5174,
    open: false,
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
