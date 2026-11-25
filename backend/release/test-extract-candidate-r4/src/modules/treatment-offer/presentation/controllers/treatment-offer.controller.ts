import {
  Controller,
  Get,
  Put,
  Param,
  Body,
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

@ApiTags('Treatment Offers')
@Controller('treatment-offers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class TreatmentOfferController {
  constructor(private readonly service: TreatmentOfferService) {}

  @Get(':offerId/acceptance-certificate')
  @Roles('DOCTOR', 'PRACTITIONER', 'ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve cryptographic offer acceptance certificate (Stage 8)' })
  @ApiParam({ name: 'offerId', description: 'Treatment offer UUID' })
  @SwaggerResponse({ status: 200, description: 'Cryptographic acceptance certificate' })
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
}

