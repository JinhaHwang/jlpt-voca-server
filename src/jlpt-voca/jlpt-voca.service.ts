import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GetJlptVocaQueryDto } from './dto/get-jlpt-voca-query.dto';
import { GetRandomVocaQueryDto } from './dto/get-random-voca-query.dto';

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

  async findRandom(query: GetRandomVocaQueryDto) {
    const client = this.supabaseService.getClient();

    // 먼저 전체 개수를 가져옵니다
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
      return null;
    }

    // 랜덤 offset 생성
    const randomOffset = Math.floor(Math.random() * count);

    // 랜덤 위치의 단어 하나 가져오기
    let dataBuilder = client.from('DD_JLPT_VOCA').select('*');

    if (query.level) {
      dataBuilder = dataBuilder.eq('level', query.level);
    }

    const result = await dataBuilder
      .range(randomOffset, randomOffset)
      .limit(1)
      .single();

    if (result.error) {
      throw new InternalServerErrorException(result.error.message);
    }

    return result.data as JlptVocaRecord;
  }
}
