import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

type TmapFullAddrGeoResponse = Record<string, unknown>;

@Injectable()
export class GeoService {
  private readonly baseUrl = 'https://apis.openapi.sk.com/tmap/geo/fullAddrGeo';

  async lookupAddress(address: string): Promise<TmapFullAddrGeoResponse> {
    const rawAppKey = process.env.TMAP_APP_KEY;
    const appKey = rawAppKey?.trim();
    if (!appKey || appKey === 'undefined' || appKey === 'null') {
      throw new ServiceUnavailableException(
        'TMAP_APP_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    const normalizedAddress = address.trim();

    const url = new URL(this.baseUrl);
    url.searchParams.set('version', '1');
    url.searchParams.set('format', 'json');
    url.searchParams.set('coordType', 'WGS84GEO');
    url.searchParams.set('fullAddr', normalizedAddress);
    url.searchParams.set('callback', 'result');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          appKey,
        },
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
}
