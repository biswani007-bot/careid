import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { HealthCardController } from '../presentation/controllers/health-card.controller';
import { HealthCardService } from '../application/use-cases/health-card.service';

describe('HealthCardController (Mobile Harmonization & List Contract)', () => {
  let controller: HealthCardController;
  let mockService: any;

  const sampleCard: any = {
    id: 'card-uuid-1',
    patientProfileId: 'profile-uuid-1',
    cardNumber: 'HC-2026-9999',
    status: 'ACTIVE',
    version: 1,
    emergencyFlag: false,
    issuedAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2027-01-01T00:00:00.000Z',
    qrPayload: 'sample-qr-token',
  };

  beforeEach(async () => {
    mockService = {
      getActiveCard: jest.fn(),
      issueCard: jest.fn(),
      getWalletPass: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCardController],
      providers: [
        {
          provide: HealthCardService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<HealthCardController>(HealthCardController);
  });

  describe('getActiveCard (GET /health-cards)', () => {
    it('should return hybrid object with data array [card] for Flutter mobile compatibility', async () => {
      mockService.getActiveCard.mockResolvedValue(sampleCard);

      const req = { user: { userId: 'user-patient-1' } };
      const response = await controller.getActiveCard(req);

      expect(mockService.getActiveCard).toHaveBeenCalledWith('user-patient-1');
      expect(response.id).toBe('card-uuid-1');
      expect(response.cardNumber).toBe('HC-2026-9999');
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].cardNumber).toBe('HC-2026-9999');
    });

    it('should return { data: [] } when patient does not have a card yet (graceful 404 handling)', async () => {
      mockService.getActiveCard.mockRejectedValue(new NotFoundException('Health Card not found'));

      const req = { user: { userId: 'user-patient-new' } };
      const response = await controller.getActiveCard(req);

      expect(mockService.getActiveCard).toHaveBeenCalledWith('user-patient-new');
      expect(response).toEqual({ data: [] });
    });
  });

  describe('getActiveCardDirect (GET /health-cards/active)', () => {
    it('should return single card DTO directly', async () => {
      mockService.getActiveCard.mockResolvedValue(sampleCard);

      const req = { user: { userId: 'user-patient-1' } };
      const response = await controller.getActiveCardDirect(req);

      expect(mockService.getActiveCard).toHaveBeenCalledWith('user-patient-1');
      expect(response.id).toBe('card-uuid-1');
      expect(response.cardNumber).toBe('HC-2026-9999');
    });
  });
});

