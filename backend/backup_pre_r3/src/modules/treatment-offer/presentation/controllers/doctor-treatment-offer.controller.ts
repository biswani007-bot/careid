import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { TreatmentOfferService } from '../../application/use-cases/treatment-offer.service';
import {
  CreateTreatmentOfferDto,
  UpdateTreatmentOfferDto,
  DispatchTreatmentOfferDto,
  CancelTreatmentOfferDto,
  TreatmentOfferQueryDto,
  TreatmentOfferDetailDto,
  TreatmentOfferStatusResponseDto,
  SubmitClinicalReviewDto,
  ClinicalReviewResponseDto,
  SubmitClinicianAttestationDto,
  ClinicianAttestationResponseDto,
  FinancingPreviewDto,
  FinancingPreviewResponseDto,
  BindFinancingDto,
  FinancingOfferResponseDto,
  ApproveDiscountDto,
  DiscountApprovalResponseDto,
  ResendOfferNotificationDto,
  ResendNotificationResponseDto,
} from '../dto/treatment-offer.dto';

@ApiTags('Doctor Treatment Offers')
@Controller('doctors/treatment-offers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class DoctorTreatmentOfferController {
  constructor(private readonly service: TreatmentOfferService) {}

  @Post()
  @Roles('DOCTOR', 'PRACTITIONER')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new draft treatment proposal' })
  @SwaggerResponse({ status: 201, type: TreatmentOfferDetailDto })
  async createOffer(@Req() req: any, @Body() dto: CreateTreatmentOfferDto): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.createOffer(userId, dto);
  }

  @Get()
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List authored treatment proposals' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of authored treatment offers' })
  async getDoctorOffers(@Req() req: any, @Query() query: TreatmentOfferQueryDto) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getDoctorOffers(userId, query, roles);
  }

  @Get(':offerId')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get treatment offer details' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async getOfferById(@Req() req: any, @Param('offerId') offerId: string): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getDoctorOfferById(userId, offerId, roles);
  }

  @Put(':offerId')
  @Roles('DOCTOR', 'PRACTITIONER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update draft treatment offer' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async updateOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: UpdateTreatmentOfferDto,
  ): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.updateOffer(userId, offerId, dto);
  }

  @Post(':offerId/dispatch')
  @Roles('DOCTOR', 'PRACTITIONER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock draft and dispatch treatment offer to patient' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async dispatchOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto?: DispatchTreatmentOfferDto,
  ): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.dispatchOffer(userId, offerId, dto);
  }

  @Get(':offerId/status')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inspect live offer lifecycle status and review timestamps' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferStatusResponseDto })
  async getOfferStatus(@Req() req: any, @Param('offerId') offerId: string): Promise<TreatmentOfferStatusResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getOfferStatus(userId, offerId, roles);
  }

  @Post(':offerId/cancel')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Doctor cancels active treatment proposal with clinical justification' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async cancelOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: CancelTreatmentOfferDto,
  ): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.cancelOffer(userId, offerId, roles, dto);
  }

  @Get(':offerId/acceptance-certificate')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve cryptographic offer acceptance certificate (Stage 8)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, description: 'Cryptographic acceptance certificate with verification hash' })
  async getAcceptanceCertificate(
    @Req() req: any,
    @Param('offerId') offerId: string,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getAcceptanceCertificate(userId, offerId, roles);
  }

  @Get(':offerId/clearance')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get multidisciplinary pre-op clearance checklist (Stage 9)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, description: 'Multidisciplinary clearance checklist' })
  async getClearance(
    @Req() req: any,
    @Param('offerId') offerId: string,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getClearance(userId, offerId, roles);
  }

  @Put(':offerId/clearance')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update multidisciplinary pre-op clearance status (Stage 9)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, description: 'Updated clearance checklist' })
  async updateClearance(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.updateClearance(userId, offerId, dto, roles);
  }

  // ─── STAGE 1–6 CLINICAL LIFECYCLE ENDPOINTS ──────────────────────────────────

  @Post(':offerId/clinical-review')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit multidisciplinary clinical review for treatment offer (APPROVED, REJECTED, NEEDS_INFORMATION)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: ClinicalReviewResponseDto })
  async submitClinicalReview(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: SubmitClinicalReviewDto,
  ): Promise<ClinicalReviewResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.submitClinicalReview(userId, offerId, dto, roles);
  }

  @Get(':offerId/clinical-review')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current clinical review decision and notes' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: ClinicalReviewResponseDto })
  async getClinicalReview(
    @Req() req: any,
    @Param('offerId') offerId: string,
  ): Promise<ClinicalReviewResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getClinicalReview(userId, offerId, roles);
  }

  @Post(':offerId/attest')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Physician attests to clinical necessity and appropriateness of proposed care' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: ClinicianAttestationResponseDto })
  async attestOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: SubmitClinicianAttestationDto,
  ): Promise<ClinicianAttestationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.submitAttestation(userId, offerId, dto);
  }

  @Get(':offerId/attestations')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List physician attestations and digital signature records for treatment offer' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: [ClinicianAttestationResponseDto] })
  async getAttestations(
    @Req() req: any,
    @Param('offerId') offerId: string,
  ): Promise<ClinicianAttestationResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getAttestations(userId, offerId, roles);
  }

  @Post(':offerId/financing-preview')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate financing tenure, down-payment, and monthly EMI simulation' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: FinancingPreviewResponseDto })
  async getFinancingPreview(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto?: FinancingPreviewDto,
  ): Promise<FinancingPreviewResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.getFinancingPreview(userId, offerId, dto);
  }

  @Put(':offerId/financing')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bind partner healthcare financing package to treatment proposal' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: FinancingOfferResponseDto })
  async bindFinancing(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: BindFinancingDto,
  ): Promise<FinancingOfferResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.bindFinancing(userId, offerId, dto);
  }

  @Get(':offerId/financing')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve bound partner financing offer for treatment proposal' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: FinancingOfferResponseDto })
  async getOfferFinancing(
    @Req() req: any,
    @Param('offerId') offerId: string,
  ): Promise<FinancingOfferResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getOfferFinancing(userId, offerId, roles);
  }

  @Post(':offerId/approve-discount')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Supervisor approves or rejects treatment offer discount exceeding 15% threshold' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: DiscountApprovalResponseDto })
  async approveDiscount(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: ApproveDiscountDto,
  ): Promise<DiscountApprovalResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.approveDiscount(userId, offerId, dto, roles);
  }

  @Get(':offerId/discount-status')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inspect discount approval audit status, thresholds, and supervisor decision' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: DiscountApprovalResponseDto })
  async getDiscountStatus(
    @Req() req: any,
    @Param('offerId') offerId: string,
  ): Promise<DiscountApprovalResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getDiscountStatus(userId, offerId, roles);
  }

  // ─── STAGE 16 NOTIFICATION & SMS RESEND ──────────────────────────────────────

  @Post(':offerId/resend')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend treatment proposal notification / SMS reminder to patient with rate limiting' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: ResendNotificationResponseDto })
  async resendNotification(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto?: ResendOfferNotificationDto,
  ): Promise<ResendNotificationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.resendOfferNotification(userId, offerId, dto, roles);
  }
}

