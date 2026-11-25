import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
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
import { CptService } from './cpt.service';
import { CptItemDto, CptQueryDto, CreateProcedureDto, UpdateProcedureDto } from './cpt.dto';

@ApiTags('CPT & Procedure Catalogue')
@Controller('cpt')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class CptController {
  constructor(private readonly cptService: CptService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List procedure / CPT codes with category and status filtering' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of procedure codes' })
  async getCptCodes(@Query() query: CptQueryDto) {
    return this.cptService.getCptCodes(query);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search procedure codes by code or keyword' })
  @ApiQuery({ name: 'q', description: 'Search term', required: true })
  @SwaggerResponse({ status: 200, type: [CptItemDto] })
  async searchCptCodes(@Query('q') q: string) {
    return this.cptService.searchCptCodes(q);
  }

  @Get(':code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get procedure code details by code' })
  @ApiParam({ name: 'code', description: 'Procedure code (e.g. 93458 or LOCAL-PROC-01)' })
  @SwaggerResponse({ status: 200, type: CptItemDto })
  async getCptByCode(@Param('code') code: string): Promise<CptItemDto> {
    return this.cptService.getCptByCode(code);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new procedure to the catalogue (Admin only)' })
  @SwaggerResponse({ status: 201, description: 'Procedure registered successfully', type: CptItemDto })
  @SwaggerResponse({ status: 409, description: 'Procedure code already exists' })
  async createProcedure(@Body() dto: CreateProcedureDto): Promise<CptItemDto> {
    return this.cptService.createProcedure(dto);
  }

  @Put(':code')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update procedure details or status (Admin only)' })
  @ApiParam({ name: 'code', description: 'Procedure code to update' })
  @SwaggerResponse({ status: 200, description: 'Procedure updated successfully', type: CptItemDto })
  @SwaggerResponse({ status: 404, description: 'Procedure not found' })
  async updateProcedure(
    @Param('code') code: string,
    @Body() dto: UpdateProcedureDto,
  ): Promise<CptItemDto> {
    return this.cptService.updateProcedure(code, dto);
  }

  @Delete(':code')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a procedure from catalogue (Admin only; historical records preserved)' })
  @ApiParam({ name: 'code', description: 'Procedure code to deactivate' })
  @SwaggerResponse({ status: 200, description: 'Procedure deactivated' })
  async deleteProcedure(@Param('code') code: string) {
    return this.cptService.deleteProcedure(code);
  }
}
