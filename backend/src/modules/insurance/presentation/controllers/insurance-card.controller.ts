import {
  Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { InsuranceService } from '../../application/use-cases/insurance.service';
import { CreateFullPolicyDto } from '../dto/create-provider.dto';
import { InsurancePolicyResponseDto } from '../dto/insurance-response.dto';

@ApiTags('Patient Insurance Cards')
@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class InsuranceCardController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Get('patients/:patientId/insurance-cards')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all insurance cards for a specific patient' })
  @ApiParam({ name: 'patientId', description: 'Patient Profile ID or User ID' })
  @SwaggerResponse({ status: 200, type: [InsurancePolicyResponseDto] })
  async getPatientInsuranceCards(
    @Req() req: any,
    @Param('patientId') patientId: string,
  ): Promise<InsurancePolicyResponseDto[]> {
    const callerId = req.user?.id || req.user?.userId;
    const targetId = patientId === 'me' ? callerId : patientId;
    return this.insuranceService.getPatientInsuranceCards(targetId);
  }

  @Post('patients/:patientId/insurance-cards')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create / add an insurance card for a specific patient' })
  @ApiParam({ name: 'patientId', description: 'Patient Profile ID or User ID' })
  @SwaggerResponse({ status: 201, type: InsurancePolicyResponseDto })
  async createPatientInsuranceCard(
    @Req() req: any,
    @Param('patientId') patientId: string,
    @Body() dto: CreateFullPolicyDto,
  ): Promise<InsurancePolicyResponseDto> {
    const callerId = req.user?.id || req.user?.userId;
    const targetId = patientId === 'me' ? callerId : patientId;
    return this.insuranceService.createPatientInsuranceCard(targetId, req.user, dto);
  }

  @Get('insurance-cards/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get insurance card details by ID' })
  @ApiParam({ name: 'id', description: 'Insurance Card ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async getInsuranceCardById(
    @Param('id') id: string,
  ): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.getInsuranceCardById(id);
  }

  @Put('insurance-cards/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update insurance card details' })
  @ApiParam({ name: 'id', description: 'Insurance Card ID' })
  @SwaggerResponse({ status: 200, type: InsurancePolicyResponseDto })
  async updateInsuranceCard(
    @Param('id') id: string,
    @Body() dto: Partial<CreateFullPolicyDto>,
  ): Promise<InsurancePolicyResponseDto> {
    return this.insuranceService.updateInsuranceCard(id, dto);
  }

  @Delete('insurance-cards/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove / soft-delete an insurance card' })
  @ApiParam({ name: 'id', description: 'Insurance Card ID' })
  @SwaggerResponse({ status: 200, description: 'Insurance card removed' })
  async deleteInsuranceCard(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.insuranceService.deleteInsuranceCard(id);
  }
}

