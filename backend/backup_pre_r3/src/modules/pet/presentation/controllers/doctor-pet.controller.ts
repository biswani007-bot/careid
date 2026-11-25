import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { PetService } from '../../application/use-cases/pet.service';
import {
  PetResponseDto,
  CreatePetClinicalRecordDto,
  PetClinicalRecordResponseDto,
  PetTimelineItemDto,
} from '../dto/pet.dto';

@ApiTags('Doctor - Pet Clinical Records')
@Controller('doctors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-Auth')
export class DoctorPetController {
  constructor(private readonly petService: PetService) {}

  @Get('patients/:patientProfileId/pets')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pets belonging to a patient profile' })
  @ApiParam({ name: 'patientProfileId', description: 'Patient Profile ID' })
  @SwaggerResponse({ status: 200, type: [PetResponseDto] })
  async getPatientPets(
    @Req() req: any,
    @Param('patientProfileId') patientProfileId: string,
  ): Promise<PetResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getPetsByPatientProfile(patientProfileId, userId, roles);
  }

  @Get('pets/:petId')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pet clinical profile by ID' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, type: PetResponseDto })
  async getPet(
    @Req() req: any,
    @Param('petId') petId: string,
  ): Promise<PetResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getPetById(petId, userId, roles);
  }

  @Get('pets/:petId/timeline')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get veterinary clinical and vaccination timeline for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, type: [PetTimelineItemDto] })
  async getPetTimeline(
    @Req() req: any,
    @Param('petId') petId: string,
  ): Promise<PetTimelineItemDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getPetTimeline(petId, userId, roles);
  }

  @Post('pets/:petId/records')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a veterinary clinical record to a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @SwaggerResponse({ status: 201, type: PetClinicalRecordResponseDto })
  async addClinicalRecord(
    @Req() req: any,
    @Param('petId') petId: string,
    @Body() dto: CreatePetClinicalRecordDto,
  ): Promise<PetClinicalRecordResponseDto> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.addClinicalRecord(petId, userId, roles, dto);
  }

  @Get('pets/:petId/records')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all veterinary clinical records for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @SwaggerResponse({ status: 200, type: [PetClinicalRecordResponseDto] })
  async getClinicalRecords(
    @Req() req: any,
    @Param('petId') petId: string,
  ): Promise<PetClinicalRecordResponseDto[]> {
    const userId = req.user?.id || req.user?.userId;
    const roles: string[] = req.user?.roles || (req.user?.role ? [req.user.role] : []);
    return this.petService.getClinicalRecords(petId, userId, roles);
  }
}
