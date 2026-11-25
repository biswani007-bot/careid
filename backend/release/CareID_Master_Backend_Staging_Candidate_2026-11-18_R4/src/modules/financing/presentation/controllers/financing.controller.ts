import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { FinancingService } from '../../application/use-cases/financing.service';
import {
  ApplyFinancingDto,
  UpdateApplicationStatusDto,
  FinancingOptionResponseDto,
  FinancingApplicationResponseDto,
  AcceptFinancingOfferDto,
  RejectFinancingOfferDto,
} from '../dto/financing.dto';

@ApiTags('Financing & Financial Assistance')
@Controller('financing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class FinancingController {
  constructor(private readonly financingService: FinancingService) {}

  @Get('options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List available healthcare financing options and partners' })
  @SwaggerResponse({ status: 200, type: [FinancingOptionResponseDto] })
  async getOptions(): Promise<FinancingOptionResponseDto[]> {
    return this.financingService.getOptions();
  }

  @Get('offers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pre-approved healthcare financing offers for current patient' })
  @SwaggerResponse({ status: 200, type: [FinancingOptionResponseDto] })
  async getOffers(@Req() req: any): Promise<any> {
    const userId = req.user?.id || req.user?.userId;
    return this.financingService.getOffers(userId);
  }

  @Get('offers/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get details of specific healthcare financing offer or treatment proposal' })
  @ApiParam({ name: 'id', description: 'Offer or Application ID' })
  @SwaggerResponse({ status: 200 })
  async getOfferById(@Req() req: any, @Param('id') id: string): Promise<any> {
    const userId = req.user?.id || req.user?.userId;
    return this.financingService.getOfferById(id, userId);
  }

  @Post('offers/:id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept pre-approved healthcare financing offer (Initiates partner underwriting review)' })
  @ApiParam({ name: 'id', description: 'Financing Offer, Option, or Application ID' })
  @SwaggerResponse({ status: 200, type: FinancingApplicationResponseDto, description: 'Financing application under review' })
  async acceptOffer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto?: AcceptFinancingOfferDto,
  ): Promise<FinancingApplicationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.financingService.acceptOffer(id, userId, dto);
  }

  @Post('offers/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject healthcare financing offer' })
  @ApiParam({ name: 'id', description: 'Financing Offer, Option, or Application ID' })
  @SwaggerResponse({ status: 200, type: FinancingApplicationResponseDto, description: 'Financing application marked rejected' })
  async rejectOffer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto?: RejectFinancingOfferDto,
  ): Promise<FinancingApplicationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.financingService.rejectOffer(id, userId, dto?.declineReason || dto?.reason);
  }

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit application for healthcare financing / EMI assistance' })
  @SwaggerResponse({ status: 201, type: FinancingApplicationResponseDto })
  async apply(@Req() req: any, @Body() dto: ApplyFinancingDto): Promise<FinancingApplicationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const userEmail = req.user?.email;
    const userName = req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || undefined;
    return this.financingService.apply(userId, userEmail, userName, dto);
  }

  @Get('applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List financing applications (scoped to patient or global for admin/staff)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'partnerName', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @SwaggerResponse({ status: 200, description: 'Paginated list of financing applications' })
  async getApplications(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('partnerName') partnerName?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.financingService.getApplications(userId, roles, {
      status,
      partnerName,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('applications/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get financing application details by ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @SwaggerResponse({ status: 200, type: FinancingApplicationResponseDto })
  async getApplicationById(@Req() req: any, @Param('id') id: string): Promise<FinancingApplicationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.financingService.getApplicationById(id, userId, roles);
  }

  @Patch('applications/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update financing application review status (Admin/Staff)' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @SwaggerResponse({ status: 200, type: FinancingApplicationResponseDto })
  async updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ): Promise<FinancingApplicationResponseDto> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.financingService.updateStatus(id, roles, dto);
  }
}

