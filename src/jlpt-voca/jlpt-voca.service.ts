import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { GetJlptVocaQueryDto } from './dto/get-jlpt-voca-query.dto';

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
}
