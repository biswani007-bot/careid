/**
 * ==============================================================================
 * CareID Enterprise Backend — Staging PM2 Process Manager Configuration
 * ==============================================================================
 * Dedicated, isolated staging application configuration for aaPanel / PM2.
 * Strictly binds to Port 3074 and isolated staging database 360api_staging.
 *
 * Usage:
 *   pm2 start ecosystem.staging.config.js
 *   pm2 reload ecosystem.staging.config.js
 *   pm2 stop ecosystem.staging.config.js
 *   pm2 logs careid-backend-staging
 * ==============================================================================
 */

module.exports = {
  apps: [
    {
      name: 'careid-backend-staging',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        PORT: 3074,
        HOST: '127.0.0.1',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:5432/360api_staging?schema=public',
        OCR_WORKER_URL: 'http://127.0.0.1:5051',
      },
      error_file: 'logs/pm2-staging-error.log',
      out_file: 'logs/pm2-staging-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};

