import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SupabaseService } from '../src/supabase/supabase.service';

type JlptVocaRecord = {
  id: number;
  word: string;
  meaning: string;
  meaning_ko: string;
  level: string;
};

class MockSupabaseClient {
  constructor(private readonly data: JlptVocaRecord[]) {}

  from(table: string) {
    if (table !== 'DD_JLPT_VOCA') {
      throw new Error(`Unexpected table: ${table}`);
    }
    return new MockSupabaseQuery(this.data);
  }
}

class MockSupabaseQuery {
  private filtered: JlptVocaRecord[];
  private selectedColumns: string | undefined;
  private head = false;
  private shouldCount = false;
  private orderField: string | undefined;
  private orderAscending = true;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;

  constructor(private readonly data: JlptVocaRecord[]) {
    this.filtered = [...data];
  }

  select(columns: string, options?: { count?: 'exact'; head?: boolean }) {
    this.selectedColumns = columns;
    this.shouldCount = options?.count === 'exact';
    this.head = options?.head ?? false;
    return this;
  }

  eq(field: keyof JlptVocaRecord, value: unknown) {
    this.filtered = this.filtered.filter(
      (row) => String(row[field]) === String(value),
    );
    return this;
  }

  ilike(field: keyof JlptVocaRecord, pattern: string) {
    const term = pattern.replace(/%/g, '').toLowerCase();
    this.filtered = this.filtered.filter((row) => {
      const value = String(row[field] ?? '').toLowerCase();
      if (pattern.startsWith('%') && pattern.endsWith('%')) {
        return value.includes(term);
      }
      if (pattern.startsWith('%')) {
        return value.endsWith(term);
      }
      if (pattern.endsWith('%')) {
        return value.startsWith(term);
      }
      return value === term;
    });
    return this;
  }

  or(condition: string) {
    const parts = condition.split(',');
    this.filtered = this.filtered.filter((row) =>
      parts.some((part) => this.matchesOrCondition(row, part)),
    );
    return this;
  }

  order(field: keyof JlptVocaRecord, options?: { ascending?: boolean }) {
    this.orderField = field;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  in(field: keyof JlptVocaRecord, values: unknown[]) {
    const valueSet = new Set(values.map((value) => String(value)));
    this.filtered = this.filtered.filter((row) =>
      valueSet.has(String(row[field])),
    );
    return this;
  }

  async maybeSingle() {
    const response = await this.buildResponse();
    const data = Array.isArray(response.data)
      ? (response.data[0] ?? null)
      : null;
    return { data, error: null };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: {
          data: unknown;
          error: null;
          count?: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ) {
    return Promise.resolve(this.buildResponse()).then(onfulfilled, onrejected);
  }

  private matchesOrCondition(row: JlptVocaRecord, expression: string) {
    const [field, operator, rawValue] = expression.split('.');
    if (!field || !operator) {
      return false;
    }
    const value = rawValue ?? '';
    if (operator === 'ilike') {
      const pattern = value;
      const term = pattern.replace(/%/g, '').toLowerCase();
      const candidate = String(
        row[field as keyof JlptVocaRecord] ?? '',
      ).toLowerCase();

      if (pattern.startsWith('%') && pattern.endsWith('%')) {
        return candidate.includes(term);
      }
      if (pattern.startsWith('%')) {
        return candidate.endsWith(term);
      }
      if (pattern.endsWith('%')) {
        return candidate.startsWith(term);
      }
      return candidate === term;
    }

    return false;
  }

  private projectRow(row: JlptVocaRecord) {
    if (!this.selectedColumns || this.selectedColumns === '*') {
      return { ...row };
    }

    const columns = this.selectedColumns.split(',').map((col) => col.trim());
    return columns.reduce<Record<string, unknown>>((acc, col) => {
      acc[col] = (row as Record<string, unknown>)[col];
      return acc;
    }, {});
  }

  private buildResponse() {
    let rows = [...this.filtered];

    if (this.orderField) {
      const field = this.orderField;
      const modifier = this.orderAscending ? 1 : -1;
      rows.sort((a, b) => {
        const left = String(a[field] ?? '');
        const right = String(b[field] ?? '');
        return left.localeCompare(right) * modifier;
      });
    }

    const totalCount = this.shouldCount ? rows.length : undefined;

    if (this.rangeFrom !== null && this.rangeTo !== null) {
      rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
    }

    const data = this.head ? null : rows.map((row) => this.projectRow(row));

    return {
      data,
      error: null,
      count: totalCount,
    };
  }
}

describe('JLPT Vocabulary (e2e)', () => {
  let app: INestApplication;
  let mathRandomSpy: jest.SpyInstance;

  const sampleVoca: JlptVocaRecord[] = [
    { id: 1, level: '5', word: '学校', meaning: 'school', meaning_ko: '학교' },
    {
      id: 2,
      level: '5',
      word: '先生',
      meaning: 'teacher',
      meaning_ko: '선생님',
    },
    { id: 3, level: '5', word: '猫', meaning: 'cat', meaning_ko: '고양이' },
    { id: 4, level: '5', word: '犬', meaning: 'dog', meaning_ko: '개' },
    { id: 5, level: '5', word: '本', meaning: 'book', meaning_ko: '책' },
    { id: 6, level: '4', word: '雨', meaning: 'rain', meaning_ko: '비' },
    { id: 7, level: '4', word: '風', meaning: 'wind', meaning_ko: '바람' },
    { id: 8, level: '4', word: '海', meaning: 'sea', meaning_ko: '바다' },
    { id: 9, level: '4', word: '森', meaning: 'forest', meaning_ko: '숲' },
    { id: 10, level: '4', word: '空', meaning: 'sky', meaning_ko: '하늘' },
    { id: 11, level: '3', word: '勉強', meaning: 'study', meaning_ko: '공부' },
    { id: 12, level: '3', word: '試験', meaning: 'exam', meaning_ko: '시험' },
    { id: 13, level: '3', word: '成績', meaning: 'grade', meaning_ko: '성적' },
    { id: 14, level: '3', word: '部屋', meaning: 'room', meaning_ko: '방' },
    { id: 15, level: '3', word: '映画', meaning: 'movie', meaning_ko: '영화' },
    {
      id: 16,
      level: '2',
      word: '自由',
      meaning: 'freedom',
      meaning_ko: '자유',
    },
    {
      id: 17,
      level: '2',
      word: '経験',
      meaning: 'experience',
      meaning_ko: '경험',
    },
    {
      id: 18,
      level: '2',
      word: '準備',
      meaning: 'prepare',
      meaning_ko: '준비',
    },
    {
      id: 19,
      level: '2',
      word: '連絡',
      meaning: 'contact',
      meaning_ko: '연락',
    },
    {
      id: 20,
      level: '2',
      word: '関係',
      meaning: 'relation',
      meaning_ko: '관계',
    },
    {
      id: 21,
      level: '1',
      word: '存在',
      meaning: 'existence',
      meaning_ko: '존재',
    },
    { id: 22, level: '1', word: '論文', meaning: 'thesis', meaning_ko: '논문' },
    {
      id: 23,
      level: '1',
      word: '環境',
      meaning: 'environment',
      meaning_ko: '환경',
    },
    {
      id: 24,
      level: '1',
      word: '情報',
      meaning: 'information',
      meaning_ko: '정보',
    },
    {
      id: 25,
      level: '1',
      word: '技術',
      meaning: 'technology',
      meaning_ko: '기술',
    },
  ];

  const levelCounts = sampleVoca.reduce<Record<string, number>>((acc, item) => {
    acc[item.level] = (acc[item.level] ?? 0) + 1;
    return acc;
  }, {});

  beforeAll(async () => {
    process.env.SUPABASE_URL ??= 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_SECRET ??= 'dummy-service-role-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue({
        getClient: () => new MockSupabaseClient(sampleVoca),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterAll(async () => {
    mathRandomSpy.mockRestore();
    await app.close();
  });

  describe('/api/jlpt-voca/search', () => {
    it('returns full list with default pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search')
        .expect(200);

      expect(response.body.items).toHaveLength(sampleVoca.length);
      expect(response.body.meta).toMatchObject({
        total: sampleVoca.length,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('supports custom limit and page', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?page=1&limit=10')
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(10);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: sampleVoca.length,
      });
    });

    it('applies level filter', async () => {
      for (const level of Object.keys(levelCounts)) {
        const response = await request(app.getHttpServer())
          .get(`/api/jlpt-voca/search?level=${level}`)
          .expect(200);

        expect(response.body.items).toHaveLength(levelCounts[level]);
        expect(
          response.body.items.every(
            (item: { level: string }) => item.level === level,
          ),
        ).toBe(true);
        expect(response.body.meta).toMatchObject({
          total: levelCounts[level],
          page: 1,
          totalPages: 1,
        });
      }
    });

    it('honors pagination with level filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?level=1&page=2&limit=20')
        .expect(200);

      expect(response.body.items).toHaveLength(0);
      expect(response.body.meta).toMatchObject({
        total: levelCounts['1'],
        page: 2,
        limit: 20,
        totalPages: 1,
      });
    });

    it('caps limit at 200 and returns available data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?limit=200')
        .expect(200);

      expect(response.body.items).toHaveLength(sampleVoca.length);
      expect(response.body.meta.limit).toBe(200);
    });

    it('returns only metadata when onlyMeta flag is set', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?onlyMeta=true&page=1&limit=200&level=3')
        .expect(200);

      expect(response.body.items).toEqual([]);
      expect(response.body.meta).toMatchObject({
        total: levelCounts['3'],
        page: 1,
        limit: 200,
        totalPages: 1,
      });
    });

    it('searches across word, meaning, and meaning_ko', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?search=学校')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        word: '学校',
        meaning: 'school',
        meaning_ko: '학교',
        level: '5',
      });
    });

    it('combines search with level filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?search=学校&level=5')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].level).toBe('5');
    });

    it('filters by word only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?word=学校')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].word).toBe('学校');
    });

    it('filters by meaning only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?meaning=school')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].meaning).toBe('school');
    });

    it('filters by meaning_ko only', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?meaning_ko=학교')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].meaning_ko).toBe('학교');
    });

    it('combines word and level filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?word=学校&level=5')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject({
        word: '学校',
        level: '5',
      });
    });

    it('rejects invalid page parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?page=0')
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['page must not be less than 1']),
      );
    });

    it('rejects limit greater than allowed maximum', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?limit=201')
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['limit must not be greater than 200']),
      );
    });

    it('rejects limit smaller than 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/search?limit=0')
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['limit must not be less than 1']),
      );
    });
  });

  describe('/api/jlpt-voca/totals-by-level', () => {
    it('returns aggregated metadata per level', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/totals-by-level')
        .expect(200);

      expect(response.body.total).toBe(sampleVoca.length);
      expect(response.body.levels).toHaveLength(5);
      response.body.levels.forEach((item: { level: string; total: number }) => {
        expect(item.total).toBe(levelCounts[item.level]);
      });
    });
  });

  describe('/api/jlpt-voca/find', () => {
    it('finds word by exact match', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/find?search=学校')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        word: '学校',
        level: '5',
      });
    });
  });

  describe('/api/jlpt-voca/random/level', () => {
    it('returns a single random item when no level specified', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/random/level')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('returns specified count for a level', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/random/level?level=1&count=3')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(
        response.body.every((item: { level: string }) => item.level === '1'),
      ).toBe(true);
    });

    it('caps results to available records for higher count', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/random/level?level=3&count=10')
        .expect(200);

      expect(response.body).toHaveLength(levelCounts['3']);
      expect(
        response.body.every((item: { level: string }) => item.level === '3'),
      ).toBe(true);
    });
  });

  describe('/api/jlpt-voca/random/ids', () => {
    it('returns shuffled records for provided ids', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/random/ids?ids=1&ids=2&ids=3&ids=4&ids=5')
        .expect(200);

      const ids = response.body.map((item: { id: number }) => item.id).sort();
      expect(ids).toEqual([1, 2, 3, 4, 5]);
    });

    it('rejects single id requests with validation error', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jlpt-voca/random/ids?ids=1')
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining(['ids must be an array']),
      );
    });
  });
});
