import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
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
import { SafetyHoldAdminService } from './safety-hold-admin.service';
import {
  CreateSafetyHoldCategoryDto,
  UpdateSafetyHoldCategoryDto,
  QuerySafetyHoldCategoriesDto,
  ClinicalSummaryConfigDto,
  ReconcileLegacySafetyHoldsDto,
} from './safety-hold.dto';

@ApiTags('Admin Safety Hold & Clinical Summary Governance')
@Controller('admin/safety-holds')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class SafetyHoldAdminController {
  constructor(private readonly service: SafetyHoldAdminService) {}

  // ─── 1. Safety Hold Categories ──────────────────────────────────────────────

  @Get('categories')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'DOCTOR', 'PRACTITIONER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List dynamic clinical safety hold categories with pagination' })
  @SwaggerResponse({ status: 200, description: 'Paginated safety hold categories' })
  async listCategories(@Query() query: QuerySafetyHoldCategoriesDto) {
    return this.service.listCategories(query);
  }

  @Post('categories')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new dynamic clinical safety hold category' })
  @SwaggerResponse({ status: 201, description: 'Category created' })
  async createCategory(@Req() req: any, @Body() dto: CreateSafetyHoldCategoryDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.createCategory(dto, userId);
  }

  @Put('categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update dynamic clinical safety hold category' })
  @ApiParam({ name: 'id', description: 'Category Item UUID' })
  @SwaggerResponse({ status: 200, description: 'Category updated' })
  async updateCategory(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSafetyHoldCategoryDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.updateCategory(id, dto, userId);
  }

  @Patch('categories/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle safety hold category active status' })
  @ApiParam({ name: 'id', description: 'Category Item UUID' })
  @SwaggerResponse({ status: 200, description: 'Category status updated' })
  async toggleCategoryStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.toggleCategoryStatus(id, status, userId);
  }

  @Delete('categories/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive safety hold category' })
  @ApiParam({ name: 'id', description: 'Category Item UUID' })
  @SwaggerResponse({ status: 200, description: 'Category archived' })
  async deleteCategory(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.deleteCategory(id, userId);
  }

  // ─── 2. Clinical Summary Configuration ──────────────────────────────────────

  @Get('summary-config')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN', 'DOCTOR', 'PRACTITIONER', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get consultation clinical summary display configuration' })
  @SwaggerResponse({ status: 200, description: 'Summary configuration' })
  async getSummaryConfig() {
    return this.service.getSummaryConfig();
  }

  @Put('summary-config')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update consultation clinical summary display configuration' })
  @SwaggerResponse({ status: 200, description: 'Summary configuration updated' })
  async updateSummaryConfig(@Req() req: any, @Body() dto: ClinicalSummaryConfigDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.updateSummaryConfig(dto, userId);
  }

  // ─── 3. Legacy Safety Hold Reconciliation ───────────────────────────────────

  @Get('reconciliation-status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Inspect count of legacy records containing embedded safety hold history' })
  @SwaggerResponse({ status: 200, description: 'Reconciliation status' })
  async getReconciliationStatus() {
    return this.service.getReconciliationStatus();
  }

  @Post('reconcile-legacy')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Safely parse and reconcile legacy embedded safety holds into structured records without data loss' })
  @SwaggerResponse({ status: 200, description: 'Reconciliation results with audit provenance' })
  async reconcileLegacy(@Req() req: any, @Body() dto: ReconcileLegacySafetyHoldsDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.service.reconcileLegacyRecords(dto, userId);
  }
}
