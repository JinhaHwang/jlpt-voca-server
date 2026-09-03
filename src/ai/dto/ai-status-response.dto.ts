import { ApiProperty } from '@nestjs/swagger';

export class AiStatusResponseDto {
  @ApiProperty({ example: 'received' })
  status: string;
}
