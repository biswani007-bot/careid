import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static pool: Pool;
  private static adapter: PrismaPg;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hvapi_db?schema=public';
    if (!DatabaseService.pool || (DatabaseService.pool as any).ended || (DatabaseService.pool as any)._ending) {
      // Safe pool configuration: connection limits, timeouts, and SSL options
      const rawMax = parseInt(process.env.DB_POOL_MAX || '10', 10);
      const poolMax = !isNaN(rawMax) && rawMax >= 1 && rawMax <= 100 ? rawMax : 10;

      const rawTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '5000', 10);
      const connectionTimeoutMillis = !isNaN(rawTimeout) && rawTimeout >= 500 && rawTimeout <= 60000 ? rawTimeout : 5000;

      const rawIdleTimeout = parseInt(process.env.DB_IDLE_TIMEOUT_MS || '10000', 10);
      const idleTimeoutMillis = !isNaN(rawIdleTimeout) && rawIdleTimeout >= 1000 ? rawIdleTimeout : 10000;

      let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;
      if (process.env.DATABASE_SSL === 'true') {
        const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
        ssl = { rejectUnauthorized };
      } else if (connectionString.includes('sslmode=require') || connectionString.includes('sslmode=no-verify')) {
        ssl = { rejectUnauthorized: false };
      }

      DatabaseService.pool = new Pool({
        connectionString,
        max: poolMax,
        connectionTimeoutMillis,
        idleTimeoutMillis,
        ...(ssl !== undefined ? { ssl } : {}),
      });
      DatabaseService.adapter = new PrismaPg(DatabaseService.pool);
    }
    super({
      adapter: DatabaseService.adapter,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (DatabaseService.pool) {
      const p = DatabaseService.pool;
      DatabaseService.pool = undefined as any;
      DatabaseService.adapter = undefined as any;
      await p.end().catch(() => {});
    }
  }
}
