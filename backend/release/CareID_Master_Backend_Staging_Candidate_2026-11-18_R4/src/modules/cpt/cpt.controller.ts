import {
  Controller,
  Get,
  Param,
  Query,
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
import { CptService } from './cpt.service';
import { CptItemDto, CptQueryDto } from './cpt.dto';

@ApiTags('CPT Catalogue')
@Controller('cpt')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class CptController {
  constructor(private readonly cptService: CptService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List CPT procedure codes with category filtering and pagination (Phase 8)' })
  @SwaggerResponse({ status: 200, description: 'Paginated list of CPT codes' })
  async getCptCodes(@Query() query: CptQueryDto) {
    return this.cptService.getCptCodes(query);
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search CPT procedure codes by code or keyword (Phase 8)' })
  @ApiQuery({ name: 'q', description: 'Search term', required: true })
  @SwaggerResponse({ status: 200, type: [CptItemDto] })
  async searchCptCodes(@Query('q') q: string) {
    return this.cptService.searchCptCodes(q);
  }

  @Get(':code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get CPT procedure code details (Phase 8)' })
  @ApiParam({ name: 'code', description: 'CPT Code (e.g. 93458)' })
  @SwaggerResponse({ status: 200, type: CptItemDto })
  async getCptByCode(@Param('code') code: string): Promise<CptItemDto> {
    return this.cptService.getCptByCode(code);
  }
}

