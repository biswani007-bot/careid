import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '@modules/auth/infrastructure/guards/roles.guard';
import { PetService } from '../../application/use-cases/pet.service';
import {
  CreatePetDto, UpdatePetDto, AddPetVaccinationDto, PetResponseDto, PetVaccinationResponseDto,
} from '../dto/pet.dto';

@ApiTags('Pet Health Records')
@Controller('pets')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class PetController {
  constructor(private readonly petService: PetService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new pet profile' })
  @SwaggerResponse({ status: 201, type: PetResponseDto })
  async createPet(@Req() req: any, @Body() dto: CreatePetDto): Promise<PetResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    return this.petService.createPet(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pets (filtered by user ownership or admin/staff access)' })
  @ApiQuery({ name: 'species', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @SwaggerResponse({ status: 200, description: 'Paginated pet list' })
  async getPets(
    @Req() req: any,
    @Query('species') species?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getPets(userId, roles, {
      species,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pet profile by ID' })
  @ApiParam({ name: 'id', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, type: PetResponseDto })
  async getPetById(@Req() req: any, @Param('id') id: string): Promise<PetResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getPetById(id, userId, roles);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update pet profile' })
  @ApiParam({ name: 'id', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, type: PetResponseDto })
  async updatePet(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePetDto,
  ): Promise<PetResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.updatePet(id, userId, roles, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete pet profile' })
  @ApiParam({ name: 'id', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, description: 'Pet deleted successfully' })
  async deletePet(@Req() req: any, @Param('id') id: string): Promise<{ success: boolean }> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.deletePet(id, userId, roles);
  }

  @Post(':id/vaccinations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add vaccination record to pet' })
  @ApiParam({ name: 'id', description: 'Pet ID' })
  @SwaggerResponse({ status: 201, type: PetVaccinationResponseDto })
  async addVaccination(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddPetVaccinationDto,
  ): Promise<PetVaccinationResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.addVaccination(id, userId, roles, dto);
  }

  @Get(':id/vaccinations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all vaccination records for pet' })
  @ApiParam({ name: 'id', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, type: [PetVaccinationResponseDto] })
  async getVaccinations(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<PetVaccinationResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getVaccinations(id, userId, roles);
  }
}

