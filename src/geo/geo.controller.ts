import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';
import { LookupAddressDto } from './dto/lookup-address.dto';

@ApiTags('Geo')
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('coordinates')
  @ApiOperation({
    summary: 'TMAP 도로명/지번 주소 좌표 조회',
    description:
      '도로명 또는 지번 주소를 전달하면 TMAP Full Address Geo API를 호출하여 좌표 정보를 반환합니다.',
  })
  async lookupCoordinates(@Query() query: LookupAddressDto) {
    return this.geoService.lookupAddress(query.address);
  }
}
