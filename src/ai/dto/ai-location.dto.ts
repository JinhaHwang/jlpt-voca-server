import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class AiLocationDto {
  @ApiPropertyOptional({ example: 37.5665 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 126.978 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
