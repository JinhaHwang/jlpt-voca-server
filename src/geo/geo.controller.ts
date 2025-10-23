import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';
import { LookupAddressDto } from './dto/lookup-address.dto';
import { GetTransitRoutesDto } from './dto/get-transit-routes.dto';

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

  @Post('transit/routes')
  @ApiOperation({
    summary: '대중교통 경로 탐색',
    description:
      'TMAP Transit Routes API를 호출하여 출발지-도착지 기준 대중교통 경로를 조회합니다.',
  })
  @ApiBody({ type: GetTransitRoutesDto })
  async getTransitRoutes(@Body() body: GetTransitRoutesDto) {
    return this.geoService.getTransitRoutes(body);
  }
}
