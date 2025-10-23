import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GetTransitRoutesDto } from './dto/get-transit-routes.dto';

type TmapFullAddrGeoResponse = Record<string, unknown>;
type TransitRoutesResponse = Record<string, unknown>;

@Injectable()
export class GeoService {
  private readonly fullAddrUrl =
    'https://apis.openapi.sk.com/tmap/geo/fullAddrGeo';
  private readonly transitUrl = 'https://apis.openapi.sk.com/transit/routes';

  async lookupAddress(address: string): Promise<TmapFullAddrGeoResponse> {
    const appKey = this.getAppKey();
    const normalizedAddress = address.trim();

    const url = new URL(this.fullAddrUrl);
    url.searchParams.set('version', '1');
    url.searchParams.set('format', 'json');
    url.searchParams.set('coordType', 'WGS84GEO');
    url.searchParams.set('fullAddr', normalizedAddress);
    url.searchParams.set('callback', 'result');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { appKey },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'TMAP API 요청 중 네트워크 오류가 발생했습니다.',
        { cause: error as Error },
      );
    }

    const body = await response.text();
    if (!response.ok) {
      throw new InternalServerErrorException(
        `TMAP API 오류 (${response.status}): ${body}`,
      );
    }

    const cleaned = this.extractJsonPayload(body);

    try {
      return JSON.parse(cleaned) as TmapFullAddrGeoResponse;
    } catch (error) {
      throw new InternalServerErrorException(
        'TMAP API 응답을 파싱할 수 없습니다.',
        { cause: error as Error },
      );
    }
  }

  async getTransitRoutes(
    payload: GetTransitRoutesDto,
  ): Promise<TransitRoutesResponse> {
    const appKey = this.getAppKey();
    const filteredPayload = this.filterPayload(payload);

    let response: Response;
    try {
      response = await fetch(this.transitUrl, {
        method: 'POST',
        headers: {
          appKey,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filteredPayload),
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'TMAP Transit API 요청 중 네트워크 오류가 발생했습니다.',
        { cause: error as Error },
      );
    }

    const text = await response.text();
    if (!response.ok) {
      throw new InternalServerErrorException(
        `TMAP Transit API 오류 (${response.status}): ${text}`,
      );
    }

    try {
      return JSON.parse(text) as TransitRoutesResponse;
    } catch (error) {
      throw new InternalServerErrorException(
        'TMAP Transit API 응답을 파싱할 수 없습니다.',
        { cause: error as Error },
      );
    }
  }

  private filterPayload(payload: Partial<GetTransitRoutesDto>) {
    return Object.entries(
      payload as Record<string, unknown>,
    ).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        value !== 'undefined'
      ) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (!trimmed) {
            return accumulator;
          }
          accumulator[key] = trimmed;
          return accumulator;
        }
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
  }

  private extractJsonPayload(payload: string): string {
    const trimmed = payload.trim();
    if (!trimmed.startsWith('result(')) {
      return trimmed;
    }

    const withoutPrefix = trimmed.slice('result('.length);
    if (withoutPrefix.endsWith(');')) {
      return withoutPrefix.slice(0, -2);
    }
    if (withoutPrefix.endsWith(')')) {
      return withoutPrefix.slice(0, -1);
    }
    return withoutPrefix;
  }

  private getAppKey(): string {
    const rawAppKey = process.env.TMAP_APP_KEY;
    const appKey = rawAppKey?.trim();
    if (!appKey || appKey === 'undefined' || appKey === 'null') {
      throw new ServiceUnavailableException(
        'TMAP_APP_KEY 환경변수가 설정되지 않았습니다.',
      );
    }
    return appKey;
  }
}
