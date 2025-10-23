import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GeoService } from './geo.service';

describe('GeoService', () => {
  const originalFetch = global.fetch;
  let service: GeoService;

  beforeEach(() => {
    service = new GeoService();
    process.env.TMAP_APP_KEY = 'test-app-key';
  });

  afterEach(() => {
    delete process.env.TMAP_APP_KEY;
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as Record<string, unknown>).fetch;
    }
    jest.clearAllMocks();
  });

  it('throws ServiceUnavailableException when TMAP_APP_KEY is missing', async () => {
    delete process.env.TMAP_APP_KEY;
    await expect(
      service.lookupAddress('서울특별시 성동구 동원북로22번길 8'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('parses JSONP wrapped payloads', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          'result({"coordinateInfo":{"coordinate":[{"lat":"37.561","lon":"127.040"}]}});',
        ),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await service.lookupAddress(
      '서울특별시 성동구 동원북로22번길 8',
    );

    expect(result).toEqual({
      coordinateInfo: {
        coordinate: [{ lat: '37.561', lon: '127.040' }],
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestedUrl, options] = fetchMock.mock.calls[0];
    expect(options).toMatchObject({
      method: 'GET',
      headers: { appKey: 'test-app-key' },
    });

    const url =
      requestedUrl instanceof URL
        ? requestedUrl
        : new URL(requestedUrl as string);
    expect(url.hostname).toBe('apis.openapi.sk.com');
    expect(url.searchParams.get('fullAddr')).toBe(
      '서울특별시 성동구 동원북로22번길 8',
    );
    expect(url.searchParams.get('coordType')).toBe('WGS84GEO');
  });

  it('throws InternalServerErrorException when API responds with error', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('internal error'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      service.lookupAddress('서울특별시 성동구 동원북로22번길 8'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('requests transit routes with filtered payload', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve('{"plan":{"itineraries":[{"totalTime":1234}]}}'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await service.getTransitRoutes({
      startX: '127.02479803562213',
      startY: '37.504585233865086',
      endX: '127.03747630119366',
      endY: '37.479103923078995',
      format: 'json',
      count: 2,
      lang: 0,
      searchDttm: '202401011200',
    });

    expect(result).toEqual({
      plan: { itineraries: [{ totalTime: 1234 }] },
    });

    const [requestedUrl, options] = fetchMock.mock.calls[0];
    expect(requestedUrl).toBe('https://apis.openapi.sk.com/transit/routes');
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        appKey: 'test-app-key',
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    expect(JSON.parse(options.body as string)).toEqual({
      startX: '127.02479803562213',
      startY: '37.504585233865086',
      endX: '127.03747630119366',
      endY: '37.479103923078995',
      format: 'json',
      count: 2,
      lang: 0,
      searchDttm: '202401011200',
    });
  });

  it('throws InternalServerErrorException when transit API responds with error', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('bad request'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      service.getTransitRoutes({
        startX: '127.0',
        startY: '37.0',
        endX: '128.0',
        endY: '38.0',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
