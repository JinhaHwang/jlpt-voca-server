import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class GetTransitRoutesDto {
  @ApiProperty({
    description: '출발지 좌표(경도, WGS84)',
    example: '127.02479803562213',
  })
  @IsString()
  @IsNotEmpty()
  startX!: string;

  @ApiProperty({
    description: '출발지 좌표(위도, WGS84)',
    example: '37.504585233865086',
  })
  @IsString()
  @IsNotEmpty()
  startY!: string;

  @ApiProperty({
    description: '도착지 좌표(경도, WGS84)',
    example: '127.03747630119366',
  })
  @IsString()
  @IsNotEmpty()
  endX!: string;

  @ApiProperty({
    description: '도착지 좌표(위도, WGS84)',
    example: '37.479103923078995',
  })
  @IsString()
  @IsNotEmpty()
  endY!: string;

  @ApiPropertyOptional({
    description: '언어 선택 (0: 국문, 1: 영문)',
    example: 0,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  lang?: number;

  @ApiPropertyOptional({
    description: '응답 포맷 (json 또는 xml)',
    example: 'json',
    enum: ['json', 'xml'],
  })
  @IsOptional()
  @IsIn(['json', 'xml'])
  format?: 'json' | 'xml';

  @ApiPropertyOptional({
    description: '최대 응답 결과 개수 (1~10)',
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiPropertyOptional({
    description: '타임머신 검색 요청 시각 (yyyymmddhhmi)',
    example: '202401011200',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, {
    message: 'searchDttm은 yyyymmddhhmi 형식의 12자리 숫자여야 합니다.',
  })
  searchDttm?: string;
}
