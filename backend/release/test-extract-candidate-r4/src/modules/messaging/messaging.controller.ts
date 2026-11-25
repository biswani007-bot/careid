import {
  Controller, Get, Post, Put, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { MessagingService } from './messaging.service';
import {
  CreateConversationDto,
  SendMessageDto,
  ConversationResponseDto,
  DirectMessageResponseDto,
} from './dto/messaging.dto';

@ApiTags('Patient-Doctor Messaging Inbox (Doctor App)')
@Controller('conversations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all direct message conversations for current user' })
  @SwaggerResponse({ status: 200, type: [ConversationResponseDto] })
  async getConversations(@Req() req: any): Promise<ConversationResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    return this.service.getConversations(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new clinical conversation thread between doctor and patient' })
  @SwaggerResponse({ status: 201, type: ConversationResponseDto })
  async createConversation(
    @Req() req: any,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.createConversation(userId, dto, roles);
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get total unread message badge count for current user' })
  @SwaggerResponse({ status: 200, description: 'Unread badge count' })
  async getUnreadCount(@Req() req: any): Promise<{ unreadCount: number }> {
    const userId = req.user?.userId || req.user?.id;
    return this.service.getUnreadCount(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get conversation details by ID' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @SwaggerResponse({ status: 200, type: ConversationResponseDto })
  async getConversationById(@Req() req: any, @Param('id') id: string): Promise<ConversationResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    return this.service.getConversationById(id, userId);
  }

  @Get(':id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get chronological message history for conversation thread' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @SwaggerResponse({ status: 200, type: [DirectMessageResponseDto] })
  async getMessages(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<DirectMessageResponseDto[]> {
    const userId = req.user?.userId || req.user?.id;
    return this.service.getMessages(id, userId);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send direct message in conversation thread' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @SwaggerResponse({ status: 201, type: DirectMessageResponseDto })
  async sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<DirectMessageResponseDto> {
    const userId = req.user?.userId || req.user?.id;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.service.sendMessage(id, userId, dto, roles);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread incoming messages in conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @SwaggerResponse({ status: 200, description: 'Read state updated' })
  async markAsRead(@Req() req: any, @Param('id') id: string): Promise<{ success: boolean }> {
    const userId = req.user?.userId || req.user?.id;
    return this.service.markAsRead(id, userId);
  }
}

