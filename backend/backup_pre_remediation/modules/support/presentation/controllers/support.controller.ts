import {
  Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { Roles } from '@modules/auth/infrastructure/decorators/roles.decorator';
import { SupportService } from '../../application/use-cases/support.service';
import {
  CreateTicketDto, UpdateTicketDto, TicketReplyDto, TicketQueryDto, SupportTicketResponseDto,
} from '../dto/support.dto';

@ApiTags('Support & Tickets')
@Controller('support/tickets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create support ticket' })
  @SwaggerResponse({ status: 201, type: SupportTicketResponseDto })
  async createTicket(@Req() req: any, @Body() dto: CreateTicketDto): Promise<SupportTicketResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const userEmail = req.user?.email;
    const userName = req.user?.name || `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || undefined;
    return this.supportService.createTicket(userId, userEmail, userName, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List support tickets (filtered by user ownership or admin/staff access)' })
  @SwaggerResponse({ status: 200, description: 'Paginated support ticket list' })
  async getTickets(@Req() req: any, @Query() query: TicketQueryDto) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.supportService.getTickets(userId, roles, query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get support ticket details by ID' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @SwaggerResponse({ status: 200, type: SupportTicketResponseDto })
  async getTicketById(@Req() req: any, @Param('id') id: string): Promise<SupportTicketResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.supportService.getTicketById(id, userId, roles);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'STAFF', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update support ticket status, priority or assignment (Admin/Staff)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @SwaggerResponse({ status: 200, type: SupportTicketResponseDto })
  async updateTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ): Promise<SupportTicketResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.supportService.updateTicket(id, dto, userId, roles);
  }

  @Post(':id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add message reply to support ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @SwaggerResponse({ status: 201, description: 'Created reply object' })
  async addReply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TicketReplyDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.supportService.addReply(id, userId, roles, dto);
  }

  @Get(':id/replies')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all replies for support ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @SwaggerResponse({ status: 200, description: 'List of ticket replies' })
  async getReplies(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.supportService.getReplies(id, userId, roles);
  }
}

