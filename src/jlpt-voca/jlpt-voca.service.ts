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

export interface JlptVocaRecord {
  [key: string]: unknown;
}

@Injectable()
export class JlptVocaService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(query: GetJlptVocaQueryDto) {
    const client = this.supabaseService.getClient();

    const limit = Math.min(query.limit ?? 50, 200);
    const page = query.page ?? 1;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let builder = client.from('DD_JLPT_VOCA').select('*', { count: 'exact' });

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

  async findRandomByLevel(
    query: GetRandomVocaByLevelQueryDto,
  ): Promise<JlptVocaRecord[]> {
    const client = this.supabaseService.getClient();

    const requestedCount = Math.min(query.count ?? 1, 50);
    let countBuilder = client
      .from('DD_JLPT_VOCA')
      .select('*', { count: 'exact', head: true });

    if (query.level) {
      countBuilder = countBuilder.eq('level', query.level);
    }

    const { count, error: countError } = await countBuilder;

    if (countError) {
      throw new InternalServerErrorException(countError.message);
    }

    if (!count || count === 0) {
      return [];
    }

    const availableCount = count ?? 0;
    const limit = Math.min(requestedCount, availableCount);
    const offsets = new Set<number>();
    const items: JlptVocaRecord[] = [];

    while (items.length < limit && offsets.size < availableCount) {
      const randomOffset = Math.floor(Math.random() * availableCount);

      if (offsets.has(randomOffset)) {
        continue;
      }

      offsets.add(randomOffset);

      let dataBuilder = client.from('DD_JLPT_VOCA').select('*');

      if (query.level) {
        dataBuilder = dataBuilder.eq('level', query.level);
      }

      const { data, error } = await dataBuilder
        .range(randomOffset, randomOffset)
        .limit(1);

      if (error) {
        throw new InternalServerErrorException(error.message);
      }

      if (data && data.length > 0) {
        items.push(data[0] as JlptVocaRecord);
      }
    }

    return items;
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

    const shuffled = [...(data ?? [])];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled as JlptVocaRecord[];
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
}
