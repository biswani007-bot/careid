import { Reflector } from '@nestjs/core';
import { ExecutionContext, NotFoundException } from '@nestjs/common';
import { CmsController } from '../presentation/controllers/cms.controller';
import { CmsService } from '../application/use-cases/cms.service';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { ROLES_KEY } from '@modules/auth/infrastructure/decorators/roles.decorator';

describe('CMS Public/Private Boundaries & Security (Phase 3)', () => {
  let controller: CmsController;
  let service: jest.Mocked<CmsService>;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    service = {
      getStatistics: jest.fn(),
      createPage: jest.fn(),
      getPages: jest.fn(),
      getPageById: jest.fn(),
      getPage: jest.fn(),
      updatePage: jest.fn(),
      softDeletePage: jest.fn(),
      searchPages: jest.fn(),
      createFaq: jest.fn(),
      getFaqs: jest.fn(),
      getFaqById: jest.fn(),
      updateFaq: jest.fn(),
      softDeleteFaq: jest.fn(),
      createAnnouncement: jest.fn(),
      getAnnouncements: jest.fn(),
      getAnnouncementById: jest.fn(),
      updateAnnouncement: jest.fn(),
      softDeleteAnnouncement: jest.fn(),
      createPolicy: jest.fn(),
      getPolicies: jest.fn(),
      getPolicyById: jest.fn(),
      updatePolicy: jest.fn(),
      softDeletePolicy: jest.fn(),
      createBanner: jest.fn(),
      getBanners: jest.fn(),
      getBannerById: jest.fn(),
      updateBanner: jest.fn(),
      softDeleteBanner: jest.fn(),
      createMedia: jest.fn(),
      getMedia: jest.fn(),
      searchMedia: jest.fn(),
      softDeleteMedia: jest.fn(),
      createBlock: jest.fn(),
      getBlocks: jest.fn(),
      updateBlock: jest.fn(),
      softDeleteBlock: jest.fn(),
    } as unknown as jest.Mocked<CmsService>;

    controller = new CmsController(service);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  function createMockContext(handler: Function, userRoles?: string[]): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => CmsController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRoles ? { userId: 'u-1', roles: userRoles } : undefined,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  describe('1. Anonymous Public Reads & Query-Level Filtering', () => {
    it('GET /cms/pages: defaults to PUBLISHED status for anonymous callers', async () => {
      service.getPages.mockResolvedValue([]);
      const req = {}; // Anonymous (no req.user)

      await controller.getPages(req, undefined);

      expect(service.getPages).toHaveBeenCalledWith('PUBLISHED');
    });

    it('GET /cms/pages: ignores non-admin requested status and enforces PUBLISHED', async () => {
      service.getPages.mockResolvedValue([]);
      const req = { user: { userId: 'patient-1', roles: ['PATIENT'] } };

      await controller.getPages(req, 'DRAFT');

      expect(service.getPages).toHaveBeenCalledWith('PUBLISHED');
    });

    it('GET /cms/pages: allows authenticated ADMIN to query DRAFT status', async () => {
      service.getPages.mockResolvedValue([]);
      const req = { user: { userId: 'admin-1', roles: ['ADMIN'] } };

      await controller.getPages(req, 'DRAFT');

      expect(service.getPages).toHaveBeenCalledWith('DRAFT');
    });

    it('GET /cms/pages/search: strictly searches across PUBLISHED pages only', async () => {
      service.searchPages.mockResolvedValue([]);

      await controller.searchPages('telehealth');

      expect(service.searchPages).toHaveBeenCalledWith('telehealth', 'PUBLISHED');
    });

    it('GET /cms/faqs: strictly requests PUBLISHED FAQs', async () => {
      service.getFaqs.mockResolvedValue([]);

      await controller.getFaqs('GENERAL');

      expect(service.getFaqs).toHaveBeenCalledWith('GENERAL', 'PUBLISHED');
    });

    it('GET /cms/announcements: strictly requests active, published announcements (activeOnly=true)', async () => {
      service.getAnnouncements.mockResolvedValue([]);

      await controller.getAnnouncements();

      expect(service.getAnnouncements).toHaveBeenCalledWith(true);
    });

    it('GET /cms/banners: strictly requests active, published banners (activeOnly=true)', async () => {
      service.getBanners.mockResolvedValue([]);

      await controller.getBanners();

      expect(service.getBanners).toHaveBeenCalledWith(true);
    });

    it('GET /cms/policies: strictly requests PUBLISHED policies', async () => {
      service.getPolicies.mockResolvedValue([]);

      await controller.getPolicies('PRIVACY');

      expect(service.getPolicies).toHaveBeenCalledWith('PRIVACY', 'PUBLISHED');
    });
  });

  describe('2. Unpublished/Draft Content Exclusion on Single Resource Lookup', () => {
    it('GET /cms/pages/:id: returns page when status is PUBLISHED', async () => {
      const mockPublishedPage: any = {
        id: 'p-1',
        title: 'Privacy Policy',
        slug: 'privacy',
        status: 'PUBLISHED',
      };
      service.getPageById.mockResolvedValue(mockPublishedPage);

      const result = await controller.getPageById({}, 'p-1');
      expect(result.id).toBe('p-1');
      expect(result.status).toBe('PUBLISHED');
    });

    it('GET /cms/pages/:id: throws NotFoundException when an anonymous caller accesses a DRAFT page', async () => {
      const mockDraftPage: any = {
        id: 'p-draft',
        title: 'Internal Confidential Roadmap',
        slug: 'roadmap',
        status: 'DRAFT',
      };
      service.getPageById.mockResolvedValue(mockDraftPage);

      await expect(controller.getPageById({}, 'p-draft')).rejects.toThrow(NotFoundException);
    });

    it('GET /cms/pages/:id: allows an authenticated ADMIN to preview a DRAFT page', async () => {
      const mockDraftPage: any = {
        id: 'p-draft',
        title: 'Internal Draft',
        slug: 'draft',
        status: 'DRAFT',
      };
      service.getPageById.mockResolvedValue(mockDraftPage);
      const req = { user: { userId: 'admin-1', roles: ['ADMIN'] } };

      const result = await controller.getPageById(req, 'p-draft');
      expect(result.id).toBe('p-draft');
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('3. Administrative Protection & Role Guards on Media & Blocks', () => {
    it('GET /cms/media: denies anonymous access', () => {
      const context = createMockContext(CmsController.prototype.getMedia, undefined);
      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('GET /cms/media: denies non-admin access (PATIENT)', () => {
      const context = createMockContext(CmsController.prototype.getMedia, ['PATIENT']);
      expect(rolesGuard.canActivate(context)).toBe(false);
    });

    it('GET /cms/media: allows ADMIN access', () => {
      const context = createMockContext(CmsController.prototype.getMedia, ['ADMIN']);
      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('GET /cms/blocks: denies anonymous and non-admin access', () => {
      const contextAnon = createMockContext(CmsController.prototype.getBlocks, undefined);
      expect(rolesGuard.canActivate(contextAnon)).toBe(false);

      const contextDoctor = createMockContext(CmsController.prototype.getBlocks, ['DOCTOR']);
      expect(rolesGuard.canActivate(contextDoctor)).toBe(false);

      const contextAdmin = createMockContext(CmsController.prototype.getBlocks, ['SUPER_ADMIN']);
      expect(rolesGuard.canActivate(contextAdmin)).toBe(true);
    });
  });

  describe('4. Administrative Mutation Protections (Anonymous & Non-Admin Rejection)', () => {
    const mutativeMethodNames = [
      'createPage',
      'updatePage',
      'softDeletePage',
      'createFaq',
      'updateFaq',
      'softDeleteFaq',
      'createAnnouncement',
      'updateAnnouncement',
      'softDeleteAnnouncement',
      'createPolicy',
      'updatePolicy',
      'softDeletePolicy',
      'createBanner',
      'updateBanner',
      'softDeleteBanner',
      'createMedia',
      'softDeleteMedia',
      'createBlock',
      'updateBlock',
      'softDeleteBlock',
      'getStatistics',
    ];

    mutativeMethodNames.forEach((name) => {
      const handler = (CmsController.prototype as any)[name];

      it(`${name}: denies access to anonymous callers`, () => {
        const context = createMockContext(handler, undefined);
        expect(rolesGuard.canActivate(context)).toBe(false);
      });

      it(`${name}: denies access to PATIENT credentials`, () => {
        const context = createMockContext(handler, ['PATIENT']);
        expect(rolesGuard.canActivate(context)).toBe(false);
      });

      it(`${name}: denies access to DOCTOR credentials`, () => {
        const context = createMockContext(handler, ['DOCTOR']);
        expect(rolesGuard.canActivate(context)).toBe(false);
      });

      it(`${name}: allows access to ADMIN credentials`, () => {
        const context = createMockContext(handler, ['ADMIN']);
        expect(rolesGuard.canActivate(context)).toBe(true);
      });

      it(`${name}: allows access to SUPER_ADMIN credentials`, () => {
        const context = createMockContext(handler, ['SUPER_ADMIN']);
        expect(rolesGuard.canActivate(context)).toBe(true);
      });
    });
  });
});
