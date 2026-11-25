import { Test, TestingModule } from '@nestjs/testing';
import { ReferralController } from '../presentation/controllers/referral.controller';
import { ReferralService } from '../application/use-cases/referral.service';

const mockService = {
  createReferral: jest.fn(),
  getReferrals: jest.fn(),
  getMyIncoming: jest.fn(),
  getMyOutgoing: jest.fn(),
  getDashboardStats: jest.fn(),
  getReferralById: jest.fn(),
  updateReferral: jest.fn(),
  triageReferral: jest.fn(),
  updateStatus: jest.fn(),
  addNote: jest.fn(),
  getNotes: jest.fn(),
  addAttachment: jest.fn(),
  getAttachments: jest.fn(),
  getHistory: jest.fn(),
  softDeleteReferral: jest.fn(),
};

describe('ReferralController', () => {
  let controller: ReferralController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
      providers: [
        { provide: ReferralService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /referrals', () => {
    it('should call referralService.getReferrals with query and caller', async () => {
      const mockResult = {
        data: [{ id: 'ref-1' }],
        total: 1,
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      mockService.getReferrals.mockResolvedValue(mockResult);

      const req = { user: { userId: 'u-1', roles: ['ADMIN'] } };
      const query = { page: 1, limit: 20 };

      const res = await controller.getReferrals(req, query as any);
      expect(mockService.getReferrals).toHaveBeenCalledWith(query, req.user);
      expect(res).toEqual(mockResult);
    });
  });

  describe('POST /referrals', () => {
    it('should call referralService.createReferral with user and DTO', async () => {
      const mockCreated = { id: 'ref-new-1', status: 'SUBMITTED' };
      mockService.createReferral.mockResolvedValue(mockCreated);

      const req = { user: { userId: 'u-doc', roles: ['DOCTOR'] } };
      const dto = {
        patientId: 'p-1',
        receivingFacilityId: 'f-2',
        reasonForReferral: 'Cardiology review',
      };

      const res = await controller.createReferral(req, dto as any);
      expect(mockService.createReferral).toHaveBeenCalledWith(req.user, dto);
      expect(res).toEqual(mockCreated);
    });
  });

  describe('GET /referrals/:id', () => {
    it('should call referralService.getReferralById with id and caller', async () => {
      const mockRef = { id: 'ref-1', referralNumber: 'REF-2026-00001' };
      mockService.getReferralById.mockResolvedValue(mockRef);

      const req = { user: { userId: 'u-doc', roles: ['DOCTOR'] } };
      const res = await controller.getReferralById(req, 'ref-1');
      expect(mockService.getReferralById).toHaveBeenCalledWith('ref-1', req.user);
      expect(res).toEqual(mockRef);
    });
  });

  describe('GET /referrals/my-incoming', () => {
    it('should call referralService.getMyIncoming with caller and query', async () => {
      const mockResult = { data: [{ id: 'ref-in-1' }], total: 1 };
      mockService.getMyIncoming.mockResolvedValue(mockResult);

      const req = { user: { userId: 'u-doc-rec', roles: ['DOCTOR'] } };
      const query = { status: 'SUBMITTED' };

      const res = await controller.getMyIncoming(req, query as any);
      expect(mockService.getMyIncoming).toHaveBeenCalledWith(req.user, query);
      expect(res).toEqual(mockResult);
    });
  });

  describe('GET /referrals/my-outgoing', () => {
    it('should call referralService.getMyOutgoing with caller and query', async () => {
      const mockResult = { data: [{ id: 'ref-out-1' }], total: 1 };
      mockService.getMyOutgoing.mockResolvedValue(mockResult);

      const req = { user: { userId: 'u-doc-ref', roles: ['DOCTOR'] } };
      const query = { status: 'SUBMITTED' };

      const res = await controller.getMyOutgoing(req, query as any);
      expect(mockService.getMyOutgoing).toHaveBeenCalledWith(req.user, query);
      expect(res).toEqual(mockResult);
    });
  });

  describe('GET /referrals/dashboard/stats', () => {
    it('should call referralService.getDashboardStats with facilityId', async () => {
      const mockStats = { totalReferrals: 10, pendingTriage: 2 };
      mockService.getDashboardStats.mockResolvedValue(mockStats);

      const res = await controller.getDashboardStats('fac-1');
      expect(mockService.getDashboardStats).toHaveBeenCalledWith('fac-1');
      expect(res).toEqual(mockStats);
    });
  });

  describe('Notes, attachments, and status', () => {
    it('should handle addNote with role fallback', async () => {
      mockService.addNote.mockResolvedValue({ id: 'note-1' });
      const req = { user: { userId: 'u-1', roles: ['DOCTOR'] } };
      const dto = { noteText: 'Patient vitals stable', isPrivate: false };

      const res = await controller.addNote(req, 'ref-1', dto as any);
      expect(mockService.addNote).toHaveBeenCalledWith('ref-1', 'u-1', 'DOCTOR', dto);
      expect(res).toEqual({ id: 'note-1' });
    });

    it('should handle getNotes', async () => {
      mockService.getNotes.mockResolvedValue([{ id: 'n-1' }]);
      const res = await controller.getNotes('ref-1');
      expect(mockService.getNotes).toHaveBeenCalledWith('ref-1');
      expect(res).toEqual([{ id: 'n-1' }]);
    });

    it('should handle getHistory', async () => {
      mockService.getHistory.mockResolvedValue([{ id: 'h-1', toStatus: 'SUBMITTED' }]);
      const res = await controller.getHistory('ref-1');
      expect(mockService.getHistory).toHaveBeenCalledWith('ref-1');
      expect(res).toEqual([{ id: 'h-1', toStatus: 'SUBMITTED' }]);
    });
  });
});

