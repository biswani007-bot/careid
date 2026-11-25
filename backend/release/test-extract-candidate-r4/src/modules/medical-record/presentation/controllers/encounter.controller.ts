import {
  Controller,
  Post,
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
import { MedicalRecordService } from '../../application/use-cases/medical-record.service';
import { ProcedureDto, VitalSignsDto } from '../dto/create-medical-record.dto';

@ApiTags('Encounters')
@Controller('encounters')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class EncounterController {
  constructor(private readonly service: MedicalRecordService) {}

  @Post(':id/procedures')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Document intra-operative procedure details for encounter (Stage 17)' })
  @ApiParam({ name: 'id', description: 'Encounter or Medical Record UUID' })
  @SwaggerResponse({ status: 201, description: 'Procedure documented successfully' })
  async addProcedure(
    @Req() req: any,
    @Param('id') encounterId: string,
    @Body() dto: ProcedureDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.addEncounterProcedure(userId, encounterId, dto);
  }

  @Post(':id/hemodynamics')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record intra-operative hemodynamic vitals for encounter (Stage 18)' })
  @ApiParam({ name: 'id', description: 'Encounter or Medical Record UUID' })
  @SwaggerResponse({ status: 201, description: 'Hemodynamic observations recorded successfully' })
  async addHemodynamics(
    @Req() req: any,
    @Param('id') encounterId: string,
    @Body() dto: VitalSignsDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.addEncounterHemodynamics(userId, encounterId, dto);
  }
}

