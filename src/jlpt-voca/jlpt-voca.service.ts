import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GetJlptVocaQueryDto } from './dto/get-jlpt-voca-query.dto';
import { GetRandomVocaByIdsQueryDto } from './dto/get-random-voca-by-ids-query.dto';
import { GetRandomVocaByLevelQueryDto } from './dto/get-random-voca-by-level-query.dto';
import { GetWordExactQueryDto } from './dto/get-word-exact-query.dto';
import { JlptVocaAgentsService } from './jlpt-voca-agents.service';

export interface JlptVocaRecord {
  [key: string]: unknown;
}

@Injectable()
export class JlptVocaService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jlptVocaAgentsService: JlptVocaAgentsService,
  ) {}

  private shuffleArray<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async findAll(query: GetJlptVocaQueryDto) {
    const client = this.supabaseService.getClient();

    const limit = Math.min(query.limit ?? 50, 200);
    const page = query.page ?? 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const onlyMeta = query.onlyMeta ?? false;

    let builder = client
      .from('DD_JLPT_VOCA')
      .select('*', { count: 'exact', head: onlyMeta });

    if (query.level) {
      builder = builder.eq('level', query.level);
    }

    // 검색 조건 처리
    if (query.search) {
      // search 파라미터: word, meaning, meaning_ko를 OR로 검색 (우선순위: word > meaning > meaning_ko)
      builder = builder.or(
        `word.ilike.%${query.search}%,meaning.ilike.%${query.search}%,meaning_ko.ilike.%${query.search}%`,
      );
      // 우선순위 정렬: word 일치 > meaning 일치 > meaning_ko 일치
      builder = builder.order('word', { ascending: true });
    } else if (query.word) {
      // word 필드만 like 검색
      builder = builder.ilike('word', `%${query.word}%`);
    } else if (query.meaning) {
      // meaning 필드만 like 검색
      builder = builder.ilike('meaning', `%${query.meaning}%`);
    } else if (query.meaning_ko) {
      // meaning_ko 필드만 like 검색
      builder = builder.ilike('meaning_ko', `%${query.meaning_ko}%`);
    }

    if (onlyMeta) {
      const { error, count } = await builder;

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      return {
        items: [],
        meta: {
          total: count ?? 0,
          page,
          limit,
          totalPages: count && limit > 0 ? Math.ceil(count / limit) : undefined,
        },
      };
    }

    const { data, error, count } = await builder.range(from, to);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return {
      items: (data ?? []) as JlptVocaRecord[],
      meta: {
        total: count ?? 0,
        page,
        limit,
        totalPages: count && limit > 0 ? Math.ceil(count / limit) : undefined,
      },
    };
  }

  async getLevelsMeta() {
    const client = this.supabaseService.getClient();
    const levels = ['1', '2', '3', '4', '5'];

    const results = await Promise.all(
      levels.map(async (level) => {
        const { error, count } = await client
          .from('DD_JLPT_VOCA')
          .select('*', { count: 'exact', head: true })
          .eq('level', level);

        if (error) {
          throw new InternalServerErrorException(error.message);
        }

        const total = count ?? 0;

        return {
          level,
          total,
        };
      }),
    );

    const aggregatedTotal = results.reduce((sum, item) => sum + item.total, 0);

    return {
      total: aggregatedTotal,
      levels: results,
    };
  }

  async findRandomByLevel(
    query: GetRandomVocaByLevelQueryDto,
  ): Promise<JlptVocaRecord[]> {
    const client = this.supabaseService.getClient();

    const limit = Math.min(query.count ?? 1, 50);

    if (limit <= 0) {
      return [];
    }
    const idsQuery = client.from('DD_JLPT_VOCA').select('id');

    if (query.level) {
      idsQuery.eq('level', query.level);
    }

    const { data: candidateIds, error: idsError } = await idsQuery;

    if (idsError) {
      throw new InternalServerErrorException(idsError.message);
    }

    const rows = (candidateIds ?? []) as Array<{ id: number | string }>;
    const shuffledIds = this.shuffleArray(
      rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id)),
    );

    if (shuffledIds.length === 0) {
      return [];
    }

    const selectedIds = shuffledIds.slice(
      0,
      Math.min(limit, shuffledIds.length),
    );

    const { data, error } = await client
      .from('DD_JLPT_VOCA')
      .select('*')
      .in('id', selectedIds);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.shuffleArray(data ?? []) as JlptVocaRecord[];
  }

  async findRandomByIds(
    query: GetRandomVocaByIdsQueryDto,
  ): Promise<JlptVocaRecord[]> {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('DD_JLPT_VOCA')
      .select('*')
      .in('id', query.ids);

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return this.shuffleArray(data ?? []) as JlptVocaRecord[];
  }

  async findByWordExact(query: GetWordExactQueryDto) {
    const client = this.supabaseService.getClient();

    if (!query.search) {
      throw new NotFoundException('Search parameter is required');
    }

    const { data, error } = await client
      .from('DD_JLPT_VOCA')
      .select('*')
      .eq('word', query.search)
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (!data) {
      throw new NotFoundException(
        `Word '${query.search}' not found in vocabulary`,
      );
    }

    return data as JlptVocaRecord;
  }

  async generateExampleSentenceForWord(word: string) {
    const sanitizedWord = word.trim();

    const result =
      await this.jlptVocaAgentsService.generateExampleSentence(
        sanitizedWord,
      );

    return {
      word: sanitizedWord,
      sentence: result.sentence,
      korean_meaning: result.solution.korean_meaning,
      furigana_by_index: result.solution.furigana_by_index,
    };
  }
}
