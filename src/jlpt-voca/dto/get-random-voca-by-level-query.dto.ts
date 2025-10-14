import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetRandomVocaByLevelQueryDto {
  @ApiPropertyOptional({
    description: 'JLPT 레벨 (미지정 시 전체 레벨에서 조회)',
    example: '1',
  })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({
    description: '조회할 단어 개수 (최대 50)',
    example: 3,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;
}
