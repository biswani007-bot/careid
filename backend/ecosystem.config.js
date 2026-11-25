/**
 * ==============================================================================
 * CareID Enterprise Backend — aaPanel PM2 Process Manager Configuration
 * ==============================================================================
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 reload ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 *   pm2 logs careid-backend-api
 * ==============================================================================
 */

module.exports = {
  apps: [
    {
      name: 'careid-backend-api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork', // Fork mode ensures stable Prisma connection pool handling and prevents port contention
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000,
      env: {
        NODE_ENV: 'production',
        APP_ENV: 'staging',
        PORT: 3073,
        HOST: '127.0.0.1',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
