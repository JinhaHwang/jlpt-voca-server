import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LookupAddressDto {
  @ApiProperty({
    description: '도로명 또는 지번 주소',
    example: '서울특별시 성동구 동원북로22번길 8',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;
}
