import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: '2026-09-03T12:00:00.000Z', format: 'date-time' })
  timestamp: string;
}
