import {
  Controller,
  Get,
  Post,
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
  AcceptTreatmentOfferDto,
  RejectTreatmentOfferDto,
  TreatmentOfferQueryDto,
  TreatmentOfferDetailDto,
} from '../dto/treatment-offer.dto';

@ApiTags('Patient Treatment Offers')
@Controller('patients/treatment-offers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class PatientTreatmentOfferController {
  constructor(private readonly service: TreatmentOfferService) {}

  @Get()
  @Roles('PATIENT', 'FAMILY_MEMBER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List received treatment offers for authenticated patient' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of received treatment proposals' })
  async getPatientOffers(@Req() req: any, @Query() query: TreatmentOfferQueryDto) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPatientOffers(userId, query, roles);
  }

  @Get(':offerId')
  @Roles('PATIENT', 'FAMILY_MEMBER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Patient view of treatment offer (Triggers PATIENT_REVIEWING state)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async getOfferById(@Req() req: any, @Param('offerId') offerId: string): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPatientOfferById(userId, offerId, roles);
  }

  @Post(':offerId/accept')
  @Roles('PATIENT', 'FAMILY_MEMBER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Patient ratifies and accepts treatment offer (RATIFIED_ACCEPTED)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async acceptOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: AcceptTreatmentOfferDto,
  ): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.ratifyOffer(userId, offerId, dto, roles);
  }

  @Post(':offerId/reject')
  @Roles('PATIENT', 'FAMILY_MEMBER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Patient declines treatment offer proposal (DECLINED)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, type: TreatmentOfferDetailDto })
  async rejectOffer(
    @Req() req: any,
    @Param('offerId') offerId: string,
    @Body() dto: RejectTreatmentOfferDto,
  ): Promise<TreatmentOfferDetailDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.declineOffer(userId, offerId, dto, roles);
  }
}

