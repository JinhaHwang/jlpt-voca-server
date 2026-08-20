import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreateStudyInsightDto {
  @ApiProperty({ example: 2, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  level: number;

  @ApiProperty({ example: 14, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unit: number;

  @ApiProperty({ example: 50, minimum: 1, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  targetWordCount: number;

  @ApiProperty({ example: 32, minimum: 0, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  learnedWordCount: number;

  @ApiProperty({ example: 8, minimum: 0, maximum: 200 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  repeatWordCount: number;

  @ApiProperty({ example: 1, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reviewCount: number;

  @ApiProperty({ example: 1080, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalStudySeconds: number;
}
