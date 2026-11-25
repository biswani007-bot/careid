import {
  Controller, Post, Get, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { QrService } from '../../application/use-cases/qr.service';
import {
  GenerateQrDto, VerifyQrPayloadDto, RotateQrDto, RevokeQrDto,
  BulkGenerateQrDto, BulkQrActionDto, UpdateQrDto,
} from '../dto/generate-qr.dto';
import {
  QrResponseDto, QrVerificationResultDto, QrAnalyticsResponseDto,
  QrHistoryItemDto, QrScanLogItemDto,
} from '../dto/qr-response.dto';

@ApiTags('Enterprise QR Subsystem')
@Controller('qr')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a cryptographically signed QR token for any business entity' })
  @SwaggerResponse({ status: 201, type: QrResponseDto })
  async createQr(@Req() req: any, @Body() dto: GenerateQrDto): Promise<QrResponseDto> {
    return this.qrService.generateQr(req.user.userId, dto);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Alias for generating a signed QR identity' })
  @SwaggerResponse({ status: 201, type: QrResponseDto })
  async generateQrAlias(@Req() req: any, @Body() dto: GenerateQrDto): Promise<QrResponseDto> {
    return this.qrService.generateQr(req.user.userId, dto);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify QR token signature, check validity status, and log scan details' })
  @SwaggerResponse({ status: 200, type: QrVerificationResultDto })
  async verifyQr(@Req() req: any, @Body() dto: VerifyQrPayloadDto): Promise<QrVerificationResultDto> {
    return this.qrService.verifyQrPayload(dto, req.user.userId);
  }

  @Post('rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate QR token by ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async rotateQrAlias(@Req() req: any, @Body() dto?: { id?: string; reason?: string }): Promise<QrResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.qrService.rotateQr(userId, dto?.id, { reason: dto?.reason }, roles);
  }

  @Post(':id/rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate QR token (invalidates old token, generates new version)' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async rotateQr(@Req() req: any, @Param('id') id: string, @Body() dto: RotateQrDto): Promise<QrResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.qrService.rotateQr(userId, id, dto, roles);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke QR token by ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async revokeQrAlias(@Req() req: any, @Body() dto?: { id?: string; reason?: string }): Promise<QrResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.qrService.revokeQr(userId, dto?.id, { reason: dto?.reason }, roles);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a QR token' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async revokeQr(@Req() req: any, @Param('id') id: string, @Body() dto: RevokeQrDto): Promise<QrResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.qrService.revokeQr(userId, id, dto, roles);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a revoked or archived QR token' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async restoreQr(@Req() req: any, @Param('id') id: string): Promise<QrResponseDto> {
    return this.qrService.restoreQr(req.user.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a QR token' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async archiveQr(@Req() req: any, @Param('id') id: string): Promise<QrResponseDto> {
    return this.qrService.archiveQr(req.user.userId, id);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all QR tokens owned by current user (supports entityType filtering)' })
  @ApiQuery({ name: 'entityType', required: false })
  @SwaggerResponse({ status: 200, type: [QrResponseDto] })
  async getUserQrs(@Req() req: any, @Query('entityType') entityType?: string): Promise<QrResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.qrService.getUserQrs(userId, entityType);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search QR tokens directory by token or entity ID' })
  @ApiQuery({ name: 'q', required: true })
  @SwaggerResponse({ status: 200, type: [QrResponseDto] })
  async searchQrs(@Query('q') query: string): Promise<QrResponseDto[]> {
    return this.qrService.searchQrs(query);
  }

  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get QR scan and usage analytics' })
  @SwaggerResponse({ status: 200, type: QrAnalyticsResponseDto })
  async getAnalytics(): Promise<QrAnalyticsResponseDto> {
    return this.qrService.getAnalytics();
  }

  @Get('history/doctor')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get scan audit log history for the authenticated doctor' })
  @SwaggerResponse({ status: 200, type: [QrScanLogItemDto] })
  async getDoctorScanHistory(@Req() req: any): Promise<QrScanLogItemDto[]> {
    const userId = req.user?.userId || req.user?.id;
    return this.qrService.getDoctorScanHistory(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get QR details by ID' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async getQrById(@Req() req: any, @Param('id') id: string): Promise<QrResponseDto> {
    return this.qrService.getQrById(req.user.userId, id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update QR code validity or parameters' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: QrResponseDto })
  async updateQr(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateQrDto): Promise<QrResponseDto> {
    return this.qrService.updateQr(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a QR token' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, description: 'QR Code soft-deleted' })
  async softDeleteQr(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.qrService.softDeleteQr(req.user.userId, id);
  }

  @Get(':id/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get complete status lifecycle history for a QR code' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: [QrHistoryItemDto] })
  async getQrHistory(@Req() req: any, @Param('id') id: string): Promise<QrHistoryItemDto[]> {
    return this.qrService.getQrHistory(req.user.userId, id);
  }

  @Get(':id/scans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get scan audit log history for a QR code' })
  @ApiParam({ name: 'id', description: 'QR Code ID' })
  @SwaggerResponse({ status: 200, type: [QrScanLogItemDto] })
  async getQrScanLogs(@Req() req: any, @Param('id') id: string): Promise<QrScanLogItemDto[]> {
    return this.qrService.getQrScanLogs(req.user.userId, id);
  }

  @Post('bulk-generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk generate QR tokens for multiple entities' })
  @SwaggerResponse({ status: 201, type: [QrResponseDto] })
  async bulkGenerate(@Req() req: any, @Body() dto: BulkGenerateQrDto): Promise<QrResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.qrService.bulkGenerate(userId, dto);
  }

  @Post('bulk-rotate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk rotate multiple QR tokens' })
  @SwaggerResponse({ status: 200, description: 'Bulk rotation summary' })
  async bulkRotate(@Req() req: any, @Body() dto: BulkQrActionDto): Promise<any> {
    const userId = req.user?.id || req.user?.userId;
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.qrService.bulkRotate(userId, dto, roles);
  }

  @Post('bulk-revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk revoke multiple QR tokens' })
  @SwaggerResponse({ status: 200, description: 'Bulk revocation summary' })
  async bulkRevoke(@Req() req: any, @Body() dto: BulkQrActionDto): Promise<any> {
    const userId = req.user?.id || req.user?.userId;
    const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.qrService.bulkRevoke(userId, dto, roles);
  }
}
