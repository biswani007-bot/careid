import {
  Controller, Post, Get, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, Res, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MedicalRecordService } from '../../application/use-cases/medical-record.service';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto } from '../dto/create-medical-record.dto';
import { CreateAttachmentDto, UpdateAttachmentDto } from '../dto/create-attachment.dto';
import {
  MedicalRecordResponseDto,
  MedicalAttachmentResponseDto,
  AttachmentVersionResponseDto,
  MedicalTimelineItemDto,
} from '../dto/medical-record-response.dto';
import { CreateMedicalRecordAddendumDto, MedicalRecordAddendumResponseDto } from '../dto/addendum.dto';
import { CreateRecordShareGrantDto, RecordShareGrantResponseDto } from '../dto/record-share.dto';

@ApiTags('Medical Records')
@Controller(['medical-records', 'records'])
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-Auth')
export class MedicalRecordController {
  constructor(private readonly service: MedicalRecordService) {}

  // ─── Medical Records Endpoints ─────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new medical record with encounter, vitals, diagnosis, and procedures' })
  @SwaggerResponse({ status: 201, type: MedicalRecordResponseDto })
  async createRecord(@Req() req: any, @Body() dto: CreateMedicalRecordDto): Promise<MedicalRecordResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.createRecord(userId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Workflow B: Create record and upload attachment atomically' })
  @ApiConsumes('multipart/form-data')
  @SwaggerResponse({ status: 201, type: MedicalRecordResponseDto })
  async uploadRecordDirect(
    @Req() req: any,
    @Body() dto: any,
    @UploadedFile() file?: any,
  ): Promise<MedicalRecordResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.uploadRecordWithFile(userId, dto, roles, file);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all medical records for the authenticated patient' })
  @ApiQuery({ name: 'category', enum: ['GENERAL_MEDICAL', 'DENTAL', 'VISION'], required: false, description: 'Filter records by category (Medical, Dental, Vision)' })
  @SwaggerResponse({ status: 200, type: [MedicalRecordResponseDto] })
  async getRecords(
    @Req() req: any,
    @Query('category') category?: string,
  ): Promise<MedicalRecordResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.getRecords(userId, category);
  }

  @Get('export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Export patient medical records as unified PDF' })
  @ApiQuery({ name: 'format', required: false, enum: ['PDF', 'JSON'], example: 'PDF' })
  @ApiQuery({ name: 'recordIds', required: false, type: String, description: 'Optional comma-separated record IDs to include' })
  async exportRecords(
    @Req() req: any,
    @Res() res: any,
    @Query('format') format = 'PDF',
    @Query('recordIds') recordIds?: string,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.userId;
    const ids = recordIds ? recordIds.split(',').map((s) => s.trim()).filter(Boolean) : undefined;

    if (format.toUpperCase() === 'PDF') {
      const buffer = await this.service.exportRecordsPdf(userId, ids);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="careid-medical-records.pdf"');
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
      return;
    }

    const records = await this.service.getRecords(userId);
    res.json({ format: 'JSON', records });
  }

  @Get('timeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get unified medical timeline combining records and attachments' })
  @SwaggerResponse({ status: 200, type: [MedicalTimelineItemDto] })
  async getTimeline(@Req() req: any): Promise<MedicalTimelineItemDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.getTimeline(userId);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search medical records by title, complaints, notes, diagnosis, or plan' })
  @ApiQuery({ name: 'q', description: 'Search term', required: true })
  @SwaggerResponse({ status: 200, type: [MedicalRecordResponseDto] })
  async searchRecords(@Req() req: any, @Query('q') query: string): Promise<MedicalRecordResponseDto[]> {
    return this.service.searchRecords(req.user.userId, query);
  }

  @Get('favorites')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all favorited health records for authenticated patient' })
  @SwaggerResponse({ status: 200, type: [MedicalRecordResponseDto] })
  async getFavoriteRecords(@Req() req: any): Promise<MedicalRecordResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.getFavoriteRecords(userId);
  }

  @Get('dental')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dental records for authenticated patient' })
  @SwaggerResponse({ status: 200, type: [MedicalRecordResponseDto] })
  async getDentalRecords(@Req() req: any): Promise<MedicalRecordResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.getRecords(userId, 'DENTAL');
  }

  @Get('vision')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get vision records for authenticated patient' })
  @SwaggerResponse({ status: 200, type: [MedicalRecordResponseDto] })
  async getVisionRecords(@Req() req: any): Promise<MedicalRecordResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.getRecords(userId, 'VISION');
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a specific medical record by ID' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: MedicalRecordResponseDto })
  async getRecordById(@Req() req: any, @Param('id') id: string): Promise<MedicalRecordResponseDto> {
    return this.service.getRecordById(req.user.userId, id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing medical record (blocked if ARCHIVED)' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: MedicalRecordResponseDto })
  async updateRecord(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMedicalRecordDto): Promise<MedicalRecordResponseDto> {
    const roles = (req.user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r.name));
    return this.service.updateRecord(req.user.userId, id, dto, roles);
  }

  @Post(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle or mark medical record as favorite' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, description: 'Favorite status updated' })
  async favoriteRecord(@Req() req: any, @Param('id') id: string): Promise<{ success: boolean; isFavorite: boolean }> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.setFavoriteRecord(userId, id, true);
  }

  @Delete(':id/favorite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove medical record from favorites' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, description: 'Removed from favorites' })
  async unfavoriteRecord(@Req() req: any, @Param('id') id: string): Promise<{ success: boolean; isFavorite: boolean }> {
    const userId = req.user?.id || req.user?.userId;
    return this.service.setFavoriteRecord(userId, id, false);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a medical record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, description: 'Medical record soft-deleted' })
  async softDeleteRecord(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.service.softDeleteRecord(req.user.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a medical record (makes record immutable)' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: MedicalRecordResponseDto })
  async archiveRecord(@Req() req: any, @Param('id') id: string): Promise<MedicalRecordResponseDto> {
    const roles = (req.user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r.name));
    return this.service.archiveRecord(req.user.userId, id, roles);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted or archived medical record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: MedicalRecordResponseDto })
  async restoreRecord(@Req() req: any, @Param('id') id: string): Promise<MedicalRecordResponseDto> {
    const roles = (req.user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r.name));
    return this.service.restoreRecord(req.user.userId, id, roles);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload and link an attachment to a specific medical record' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 201, type: MedicalAttachmentResponseDto })
  async uploadRecordAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file?: any,
  ): Promise<MedicalAttachmentResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.uploadAttachment(userId, id, dto, roles, file);
  }

  @Get(':id/attachments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all attachments linked to a specific medical record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: [MedicalAttachmentResponseDto] })
  async getRecordAttachments(@Req() req: any, @Param('id') id: string): Promise<MedicalAttachmentResponseDto[]> {
    return this.service.getRecordAttachments(req.user.userId, id);
  }

  // ─── Addenda Endpoints (Priority 2) ────────────────────────────────────────

  @Post(':id/addenda')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Append clinical addendum without mutating finalized record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 201, type: MedicalRecordAddendumResponseDto })
  async createAddendum(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateMedicalRecordAddendumDto,
  ): Promise<MedicalRecordAddendumResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createAddendum(userId, id, dto, roles, req.ip);
  }

  @Get(':id/addenda')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all clinical addenda appended to a medical record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: [MedicalRecordAddendumResponseDto] })
  async getAddenda(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<MedicalRecordAddendumResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getAddenda(userId, id, roles);
  }

  // ─── Record Share Grants (Priority 9) ─────────────────────────────────────

  @Post(':id/share')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create time-bound, purpose-restricted share grant for record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 201, type: RecordShareGrantResponseDto })
  async createShareGrant(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateRecordShareGrantDto,
  ): Promise<RecordShareGrantResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createShareGrant(userId, id, dto, roles, req.ip);
  }

  @Get(':id/shares')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active and historical share grants for medical record' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @SwaggerResponse({ status: 200, type: [RecordShareGrantResponseDto] })
  async getShareGrants(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<RecordShareGrantResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getShareGrants(userId, id, roles);
  }

  @Delete(':id/share/:grantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an existing record share grant immediately' })
  @ApiParam({ name: 'id', description: 'Medical Record ID' })
  @ApiParam({ name: 'grantId', description: 'Share Grant ID' })
  @SwaggerResponse({ status: 200, description: 'Share grant revoked successfully' })
  async revokeShareGrant(
    @Req() req: any,
    @Param('id') id: string,
    @Param('grantId') grantId: string,
  ): Promise<{ message: string; revokedAt: string }> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.revokeShareGrant(userId, id, grantId, roles, req.ip);
  }
}

@ApiTags('Public Record Share')
@Controller('shares')
export class ShareController {
  constructor(private readonly service: MedicalRecordService) {}

  @Get(':shareToken')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access shared clinical record via time-bound token' })
  @ApiParam({ name: 'shareToken', description: 'Cryptographic share token' })
  @SwaggerResponse({ status: 200, description: 'Shared medical record content' })
  async accessSharedRecord(@Param('shareToken') shareToken: string): Promise<any> {
    return this.service.accessSharedRecord(shareToken);
  }
}

@ApiTags('Attachments Platform')
@Controller('attachments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-Auth')
export class AttachmentController {
  constructor(private readonly service: MedicalRecordService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload an unlinked or global attachment (supports binary file upload and JSON metadata)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @SwaggerResponse({ status: 201, type: MedicalAttachmentResponseDto })
  async uploadGlobalAttachment(
    @Req() req: any,
    @Body() dto: any,
    @UploadedFile() file?: any,
  ): Promise<MedicalAttachmentResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.uploadAttachment(userId, null, dto, roles, file);
  }

  @Get('file/:filename')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stream private attachment file with security headers' })
  @ApiParam({ name: 'filename', description: 'Attachment file name' })
  async serveAttachmentFile(
    @Req() req: any,
    @Param('filename') filename: string,
    @Res() res: any,
  ): Promise<void> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.serveAttachmentFile(filename, userId, roles, res);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get attachment metadata by ID' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @SwaggerResponse({ status: 200, type: MedicalAttachmentResponseDto })
  async getAttachmentById(@Req() req: any, @Param('id') id: string): Promise<MedicalAttachmentResponseDto> {
    return this.service.getAttachmentById(req.user.userId, id);
  }

  @Get(':id/download-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate secure pre-signed download URL for private attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @ApiQuery({ name: 'expiresIn', required: false, description: 'Expiry duration in seconds (60-86400)' })
  async getPresignedDownloadUrl(
    @Req() req: any,
    @Param('id') id: string,
    @Query('expiresIn') expiresIn?: number,
  ): Promise<any> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.getPresignedAttachmentUrl(id, userId, roles, expiresIn ? Number(expiresIn) : undefined);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update attachment category, metadata, or upload a new file version' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @SwaggerResponse({ status: 200, type: MedicalAttachmentResponseDto })
  async updateAttachment(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAttachmentDto): Promise<MedicalAttachmentResponseDto> {
    return this.service.updateAttachment(req.user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @SwaggerResponse({ status: 200, description: 'Attachment soft-deleted' })
  async softDeleteAttachment(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.service.softDeleteAttachment(req.user.userId, id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @SwaggerResponse({ status: 200, type: MedicalAttachmentResponseDto })
  async restoreAttachment(@Req() req: any, @Param('id') id: string): Promise<MedicalAttachmentResponseDto> {
    return this.service.restoreAttachment(req.user.userId, id);
  }

  @Get(':id/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get file version history for an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment ID' })
  @SwaggerResponse({ status: 200, type: [AttachmentVersionResponseDto] })
  async getAttachmentVersions(@Req() req: any, @Param('id') id: string): Promise<AttachmentVersionResponseDto[]> {
    return this.service.getAttachmentVersions(req.user.userId, id);
  }
}
