import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from '../../application/use-cases/admin.service';

@ApiTags('Clinical Practice Types')
@Controller('clinical-practice-types')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth('JWT-Auth')
export class ClinicalPracticeTypesController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active clinical practice types for form dropdowns' })
  @SwaggerResponse({ status: 200, description: 'Active clinical practice types' })
  async getActiveClinicalPracticeTypes(): Promise<any[]> {
    return this.adminService.getActiveClinicalPracticeTypes();
  }
}
