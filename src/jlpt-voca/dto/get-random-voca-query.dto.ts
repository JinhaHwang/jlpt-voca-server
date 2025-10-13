import { IsOptional, IsString, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetRandomVocaQueryDto {
  @ApiProperty({ required: false, description: 'JLPT 레벨' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({
    required: false,
    description: '조회할 단어 ID 배열',
    type: [Number],
    example: [1, 2, 3, 4, 5],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  ids?: number[];
}
