import { IsOptional, IsString } from 'class-validator';

export class GetWordExactQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
