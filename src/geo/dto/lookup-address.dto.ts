import { IsNotEmpty, IsString } from 'class-validator';

export class LookupAddressDto {
  @IsString()
  @IsNotEmpty()
  address!: string;
}
