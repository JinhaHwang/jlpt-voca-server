import { IsOptional, IsString } from 'class-validator';

export class GetRandomVocaQueryDto {
  @IsOptional()
  @IsString()
  level?: string;
}
