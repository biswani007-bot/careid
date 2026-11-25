import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'Target Patient Profile UUID (if doctor initiates) or Doctor Profile UUID (if patient initiates)' })
  @IsNotEmpty()
  @IsString()
  participantId!: string;

  @ApiPropertyOptional({ description: 'Associated Facility ID' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Subject or consultation topic' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ description: 'Initial message body' })
  @IsOptional()
  @IsString()
  initialMessage?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Direct message text content' })
  @IsNotEmpty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Optional attachment UUID' })
  @IsOptional()
  @IsString()
  attachmentId?: string;
}

export class DirectMessageResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  conversationId!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty()
  senderRole!: string;

  @ApiProperty()
  content!: string;

  @ApiPropertyOptional()
  attachmentId?: string;

  @ApiProperty()
  isRead!: boolean;

  @ApiPropertyOptional()
  readAt?: string;

  @ApiProperty()
  createdAt!: string;
}

export class ConversationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  patientProfileId!: string;

  @ApiPropertyOptional()
  patientName?: string;

  @ApiProperty()
  doctorId!: string;

  @ApiPropertyOptional()
  doctorName?: string;

  @ApiPropertyOptional()
  facilityId?: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty()
  lastMessageAt!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional({ type: DirectMessageResponseDto })
  lastMessage?: DirectMessageResponseDto;

  @ApiProperty({ default: 0 })
  unreadCount!: number;
}
