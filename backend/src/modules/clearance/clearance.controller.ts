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
  HttpCode,
  HttpStatus,
  Req,
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
import { ClearanceService } from './clearance.service';
import {
  CreateClearanceRequirementDto,
  UpdateClearanceRequirementDto,
  QueryClearanceRequirementsDto,
  CreateClearancePolicyDto,
  UpdateClearancePolicyDto,
  QueryClearancePoliciesDto,
  UpdateOfferClearancePayloadDto,
  SubmitClearanceDecisionDto,
} from './clearance.dto';

@ApiTags('Clinical Clearance & Readiness')
@Controller('admin/clearance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class ClearanceController {
  constructor(private readonly clearanceService: ClearanceService) {}

  // ─── Requirement Catalogue Endpoints ──────────────────────────────────────

  @Get('requirements')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List clearance requirements catalogue with pagination & filters' })
  async listRequirements(@Query() query: QueryClearanceRequirementsDto) {
    return this.clearanceService.listRequirements(query);
  }

  @Get('requirements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get clearance requirement details by ID or Code' })
  @ApiParam({ name: 'id', description: 'Requirement UUID or Code' })
  async getRequirementById(@Param('id') id: string) {
    return this.clearanceService.getRequirementById(id);
  }

  @Post('requirements')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new clearance requirement in catalogue' })
  async createRequirement(@Req() req: any, @Body() dto: CreateClearanceRequirementDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.createRequirement(dto, userId);
  }

  @Put('requirements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update existing clearance requirement' })
  @ApiParam({ name: 'id', description: 'Requirement UUID or Code' })
  async updateRequirement(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateClearanceRequirementDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.updateRequirement(id, dto, userId);
  }

  @Patch('requirements/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle clearance requirement active/inactive status' })
  async toggleRequirementStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE',
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.toggleRequirementStatus(id, status, userId);
  }

  @Delete('requirements/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete or archive clearance requirement (fails if referenced by active workflows)' })
  async deleteRequirement(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.deleteRequirement(id, userId);
  }

  // ─── Clearance Policy Endpoints ───────────────────────────────────────────

  @Get('policies')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List facility & procedure clearance policies' })
  async listPolicies(@Query() query: QueryClearancePoliciesDto) {
    return this.clearanceService.listPolicies(query);
  }

  @Get('policies/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'FACILITY_ADMIN', 'STAFF')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get clearance policy details with assigned requirements' })
  async getPolicyById(@Param('id') id: string) {
    return this.clearanceService.getPolicyById(id);
  }

  @Post('policies')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new clearance policy with assigned requirements' })
  async createPolicy(@Req() req: any, @Body() dto: CreateClearancePolicyDto) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.createPolicy(dto, userId);
  }

  @Put('policies/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update or publish versioned clearance policy' })
  async updatePolicy(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateClearancePolicyDto,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.updatePolicy(id, dto, userId);
  }

  @Delete('policies/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete clearance policy' })
  async deletePolicy(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.userId;
    return this.clearanceService.deletePolicy(id, userId);
  }
}
