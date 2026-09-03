import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '7a5a3df3-b70a-47fb-9672-3eb1cc6a92db',
  })
  id: string;

  @ApiProperty({ example: 'dadok', nullable: true, type: String })
  username: string | null;

  @ApiProperty({ example: '다독이', nullable: true, type: String })
  fullName: string | null;

  @ApiProperty({
    example: 'https://example.com/avatar.png',
    nullable: true,
    type: String,
  })
  avatarUrl: string | null;

  @ApiProperty({
    example: '2026-09-03T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
    type: String,
  })
  createdAt: string | null;

  @ApiProperty({
    example: '2026-09-03T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
    type: String,
  })
  updatedAt: string | null;
}
