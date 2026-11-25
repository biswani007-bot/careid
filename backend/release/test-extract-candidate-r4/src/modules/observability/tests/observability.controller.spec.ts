import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ObservabilityController } from '../presentation/controllers/observability.controller';
import { ObservabilityService } from '../application/use-cases/observability.service';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/infrastructure/decorators/roles.decorator';

describe('ObservabilityController (SEC-AUD-02 Authorization Tests)', () => {
  let controller: ObservabilityController;
  let service: ObservabilityService;
  let reflector: Reflector;
  let rolesGuard: RolesGuard;

  const mockObservabilityService = {
    getDashboardStats: jest.fn().mockResolvedValue({ totalLogs: 100 }),
    getHealthStatus: jest.fn().mockResolvedValue({ status: 'HEALTHY', components: [] }),
    recordMetric: jest.fn().mockResolvedValue({ id: 'metric-1' }),
    getMetrics: jest.fn().mockResolvedValue([{ id: 'metric-1' }]),
    getLogs: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
    getTraces: jest.fn().mockResolvedValue([{ id: 'trace-1' }]),
    getBackgroundJobs: jest.fn().mockResolvedValue([{ id: 'job-1' }]),
    getBackgroundJobById: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getPerformanceSnapshot: jest.fn().mockResolvedValue({ p95LatencyMs: 120 }),
  };

  const adminMethods: Array<keyof ObservabilityController> = [
    'getDashboard',
    'recordMetric',
    'getMetrics',
    'getMetricsByCategory',
    'getLogs',
    'getLogsByRequestId',
    'getTraces',
    'getTraceById',
    'getBackgroundJobs',
    'getBackgroundJobById',
    'getPerformanceSnapshot',
    'getStatistics',
  ];

  const publicMethods: Array<keyof ObservabilityController> = [
    'getHealth',
    'getLiveness',
    'getReadiness',
  ];

  beforeEach(async () => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObservabilityController],
      providers: [
        { provide: ObservabilityService, useValue: mockObservabilityService },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    controller = module.get<ObservabilityController>(ObservabilityController);
    service = module.get<ObservabilityService>(ObservabilityService);
  });

  describe('Role Metadata Configuration', () => {
    adminMethods.forEach((methodName) => {
      it(`should require ADMIN and SUPER_ADMIN roles on ${String(methodName)}`, () => {
        const handler = controller[methodName];
        const roles = reflector.get<string[]>(ROLES_KEY, handler);
        expect(roles).toBeDefined();
        expect(roles).toEqual(expect.arrayContaining(['ADMIN', 'SUPER_ADMIN']));
        expect(roles).toHaveLength(2);
      });
    });

    publicMethods.forEach((methodName) => {
      it(`should NOT require roles on public probe ${String(methodName)}`, () => {
        const handler = controller[methodName];
        const roles = reflector.get<string[]>(ROLES_KEY, handler);
        expect(roles).toBeUndefined();
      });
    });
  });

  describe('RolesGuard Enforcement (SEC-AUD-02 Runtime Access Control)', () => {
    function createMockContext(handler: Function, user?: any): ExecutionContext {
      return {
        getHandler: () => handler,
        getClass: () => ObservabilityController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
          getResponse: () => ({}),
          getNext: () => ({}),
        }),
      } as unknown as ExecutionContext;
    }

    describe('Administrative Telemetry Endpoints', () => {
      it('should DENY access to unauthenticated user (missing user in request)', () => {
        const context = createMockContext(controller.getDashboard, undefined);
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(false);
      });

      it('should DENY access to user with PATIENT role', () => {
        const context = createMockContext(controller.getDashboard, {
          userId: 'patient-1',
          roles: ['PATIENT'],
        });
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(false);
      });

      it('should DENY access to user with DOCTOR role', () => {
        const context = createMockContext(controller.getLogs, {
          userId: 'doc-1',
          roles: ['DOCTOR'],
        });
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(false);
      });

      it('should DENY access to user with FACILITY_ADMIN role', () => {
        const context = createMockContext(controller.getTraces, {
          userId: 'facility-admin-1',
          roles: ['FACILITY_ADMIN'],
        });
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(false);
      });

      it('should GRANT access to user with ADMIN role', () => {
        const context = createMockContext(controller.getDashboard, {
          userId: 'admin-1',
          roles: ['ADMIN'],
        });
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(true);
      });

      it('should GRANT access to user with SUPER_ADMIN role', () => {
        const context = createMockContext(controller.getBackgroundJobs, {
          userId: 'superadmin-1',
          roles: ['SUPER_ADMIN'],
        });
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(true);
      });

      it('should GRANT access to user with multiple roles including ADMIN', () => {
        const context = createMockContext(controller.getPerformanceSnapshot, {
          userId: 'staff-admin-1',
          roles: ['STAFF', 'ADMIN'],
        });
        const canActivate = rolesGuard.canActivate(context);
        expect(canActivate).toBe(true);
      });
    });

    describe('Public Health Probe Endpoints', () => {
      publicMethods.forEach((methodName) => {
        it(`should allow unauthenticated callers on ${String(methodName)}`, () => {
          const context = createMockContext(controller[methodName], undefined);
          const canActivate = rolesGuard.canActivate(context);
          expect(canActivate).toBe(true);
        });
      });
    });
  });

  describe('Endpoint Execution Delegations', () => {
    it('getDashboard should call service.getDashboardStats', async () => {
      const result = await controller.getDashboard();
      expect(result).toEqual({ totalLogs: 100 });
      expect(mockObservabilityService.getDashboardStats).toHaveBeenCalled();
    });

    it('getHealth should return component health map', async () => {
      const result = await controller.getHealth();
      expect(result.status).toBe('HEALTHY');
      expect(mockObservabilityService.getHealthStatus).toHaveBeenCalled();
    });

    it('getLiveness should return UP status', async () => {
      const result = await controller.getLiveness();
      expect(result.status).toBe('UP');
      expect(result.timestamp).toBeDefined();
    });

    it('getReadiness should return READY when healthy', async () => {
      const result = await controller.getReadiness();
      expect(result.status).toBe('READY');
      expect(result.database).toBe('CONNECTED');
    });
  });
});
