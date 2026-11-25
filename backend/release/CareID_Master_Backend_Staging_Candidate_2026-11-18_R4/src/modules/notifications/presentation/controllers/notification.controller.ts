import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { NotificationService } from '../../application/use-cases/notification.service';
import {
  NotificationTemplateResponseDto, NotificationResponseDto, NotificationPreferenceResponseDto,
  NotificationQueueResponseDto, NotificationAuditLogResponseDto, NotificationDashboardResponseDto,
} from '../dto/notification-response.dto';
import {
  CreateTemplateDto, UpdateTemplateDto, CreateNotificationDto,
  UpdateNotificationPreferenceDto, RetryQueueDto,
} from '../dto/notification-enterprise.dto';

@ApiTags('Notifications')
@Controller(['notifications', 'notification'])
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─── Dashboard Stats ─────────────────────────────────────────────────────

  @Get('dashboard/stats')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get Enterprise Notification Platform stats & queue summary' })
  @SwaggerResponse({ status: 200, type: NotificationDashboardResponseDto })
  async getDashboardStats(): Promise<NotificationDashboardResponseDto> {
    return this.notificationService.getDashboardStats();
  }

  // ─── Preferences (Static routes must precede dynamic :id) ─────────────────

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user notification preferences' })
  @SwaggerResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async getPreferences(@Req() req: any): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.getPreferences(req.user?.userId);
  }

  @Put('preferences')
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user notification channel preferences' })
  @SwaggerResponse({ status: 200, type: NotificationPreferenceResponseDto })
  async updatePreferences(
    @Req() req: any,
    @Body() dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreferenceResponseDto> {
    return this.notificationService.updatePreferences(req.user?.userId, dto);
  }

  // ─── Queue (Static routes must precede dynamic :id) ───────────────────────

  @Get('queue')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pending/queued notification delivery items with optional filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'notificationType', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @SwaggerResponse({ status: 200, type: [NotificationQueueResponseDto] })
  async getPendingQueueItems(
    @Query('status') status?: string,
    @Query('notificationType') notificationType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<NotificationQueueResponseDto[]> {
    return this.notificationService.getPendingQueueItems({
      status, notificationType, dateFrom, dateTo, page, limit,
    });
  }

  @Post('queue/retry')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry queued/failed notification delivery attempts' })
  @SwaggerResponse({ status: 200, description: 'Retry execution result' })
  async retryQueue(@Req() req: any, @Body() dto: RetryQueueDto): Promise<{ retried: number }> {
    return this.notificationService.retryQueue(dto, req.user?.userId);
  }

  @Post('queue/process')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process pending notification queue and dispatch via gateways' })
  @SwaggerResponse({ status: 200, description: 'Queue processing result' })
  async processQueue(): Promise<{ processed: number; sent: number; failed: number }> {
    return this.notificationService.processPendingQueue();
  }

  // ─── Audit (Static routes must precede dynamic :id) ───────────────────────

  @Get('audit')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List notification audit logs' })
  @SwaggerResponse({ status: 200, type: [NotificationAuditLogResponseDto] })
  async getAuditLogs(): Promise<NotificationAuditLogResponseDto[]> {
    return this.notificationService.getAuditLogs();
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Publish/dispatch a notification across channels' })
  @SwaggerResponse({ status: 201, type: NotificationResponseDto })
  async createNotification(@Req() req: any, @Body() dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    return this.notificationService.createNotification(req.user?.userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List notifications for recipient or platform' })
  @ApiQuery({ name: 'recipientUserId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ'] })
  @SwaggerResponse({ status: 200, type: [NotificationResponseDto] })
  async getNotifications(
    @Req() req: any,
    @Query('recipientUserId') recipientUserId?: string,
    @Query('status') status?: string,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getNotifications(
      recipientUserId,
      status,
      req.user?.userId,
      req.user?.roles || [],
    );
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get total unread notifications count for current user' })
  @SwaggerResponse({ status: 200, description: 'Unread notification count' })
  async getUnreadCount(@Req() req: any): Promise<{ unreadCount: number }> {
    return this.notificationService.getUnreadCount(req.user?.userId);
  }

  @Put('read-all')
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread notifications as READ for current user' })
  @SwaggerResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Req() req: any): Promise<{ success: boolean; markedCount: number }> {
    return this.notificationService.markAllAsRead(req.user?.userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get notification details by ID' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @SwaggerResponse({ status: 200, type: NotificationResponseDto })
  async getNotificationById(@Req() req: any, @Param('id') id: string): Promise<any> {
    if (id === 'templates') {
      return this.notificationService.getTemplates();
    }
    return this.notificationService.getNotificationById(id, req.user?.userId, req.user?.roles || []);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as READ' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @SwaggerResponse({ status: 200, type: NotificationResponseDto })
  async markAsRead(@Req() req: any, @Param('id') id: string): Promise<NotificationResponseDto> {
    return this.notificationService.markAsRead(id, req.user?.userId, req.user?.roles || []);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @SwaggerResponse({ status: 200, description: 'Notification soft-deleted' })
  async softDeleteNotification(@Req() req: any, @Param('id') id: string): Promise<any> {
    return this.notificationService.softDeleteNotification(id, req.user?.userId, req.user?.roles || []);
  }
}
