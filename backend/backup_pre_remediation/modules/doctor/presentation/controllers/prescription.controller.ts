import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  Query,
  StreamableFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { DoctorService } from '../../application/use-cases/doctor.service';
import {
  UpdatePrescriptionDto,
  PrescriptionRefillDto,
  DiscontinuePrescriptionDto,
  PrescriptionDetailDto,
  PrescriptionExportResponseDto,
  PrescriptionRefillItemDto,
} from '../dto/doctor-patient-management.dto';

@ApiTags('Prescriptions')
@Controller('prescriptions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class PrescriptionController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get(':prescriptionId')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get detailed prescription with medications and refill history' })
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionDetailDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Invalid UUID' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Unauthorized access' })
  @SwaggerResponse({ status: 404, description: 'Prescription not found' })
  async getPrescription(
    @Req() req: any,
    @Param('prescriptionId') prescriptionId: string,
  ): Promise<PrescriptionDetailDto> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.doctorService.getPrescriptionDetails(req.user.userId, prescriptionId, roles, req.ip);
  }

  @Put(':prescriptionId')
  @Roles('DOCTOR', 'PRACTITIONER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update prescription instructions or medication items' })
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionDetailDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Validation failure or already discontinued' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Authorizing doctor only' })
  @SwaggerResponse({ status: 404, description: 'Prescription not found' })
  async updatePrescription(
    @Req() req: any,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: UpdatePrescriptionDto,
  ): Promise<PrescriptionDetailDto> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.doctorService.updatePrescription(req.user.userId, prescriptionId, dto, roles, req.ip);
  }

  @Post(':prescriptionId/refill')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Authorize and record a prescription refill' })
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 201, type: PrescriptionDetailDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Discontinued or maximum refills exceeded' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Prescription not found' })
  async refillPrescription(
    @Req() req: any,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: PrescriptionRefillDto,
  ): Promise<PrescriptionDetailDto> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.doctorService.refillPrescription(req.user.userId, prescriptionId, dto, roles, req.ip);
  }

  @Patch(':prescriptionId/discontinue')
  @Roles('DOCTOR', 'PRACTITIONER')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Discontinue an active prescription with clinical justification' })
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200, type: PrescriptionDetailDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Missing reason or already discontinued' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden - Authorizing doctor only' })
  @SwaggerResponse({ status: 404, description: 'Prescription not found' })
  async discontinuePrescription(
    @Req() req: any,
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: DiscontinuePrescriptionDto,
  ): Promise<PrescriptionDetailDto> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.doctorService.discontinuePrescription(req.user.userId, prescriptionId, dto, roles, req.ip);
  }

  @Get(':prescriptionId/export')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export clinical prescription summary for printing or pharmacy fulfillment (JSON or PDF)' })
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @ApiQuery({ name: 'format', required: false, enum: ['JSON', 'PDF'], description: 'Export format: JSON (default) or PDF binary stream' })
  @SwaggerResponse({ status: 200, type: PrescriptionExportResponseDto })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Invalid UUID' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Prescription not found' })
  async exportPrescription(
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
    @Param('prescriptionId') prescriptionId: string,
    @Query('format') format?: string,
  ): Promise<any> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    const isPdf = format?.toUpperCase() === 'PDF' || req.headers?.accept?.includes('application/pdf');

    if (isPdf) {
      const pdfBuffer = await this.doctorService.exportPrescriptionPdf(req.user.userId, prescriptionId, roles, req.ip);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="prescription-${prescriptionId.substring(0, 8).toUpperCase()}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      return new StreamableFile(pdfBuffer);
    }

    return this.doctorService.exportPrescription(req.user.userId, prescriptionId, roles, req.ip);
  }

  @Get(':prescriptionId/refills')
  @Roles('DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'PATIENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get refill history and audit log for a prescription' })
  @ApiParam({ name: 'prescriptionId', description: 'Prescription UUID' })
  @SwaggerResponse({ status: 200 })
  @SwaggerResponse({ status: 400, description: 'Bad Request - Invalid UUID' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  @SwaggerResponse({ status: 403, description: 'Forbidden' })
  @SwaggerResponse({ status: 404, description: 'Prescription not found' })
  async getPrescriptionRefills(
    @Req() req: any,
    @Param('prescriptionId') prescriptionId: string,
  ): Promise<{ prescriptionId: string; refillCount: number; maxRefills?: number | null; refills: PrescriptionRefillItemDto[] }> {
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.doctorService.getPrescriptionRefills(req.user.userId, prescriptionId, roles, req.ip);
  }
}

