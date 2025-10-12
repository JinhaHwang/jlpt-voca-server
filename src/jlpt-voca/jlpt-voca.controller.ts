import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetJlptVocaQueryDto } from './dto/get-jlpt-voca-query.dto';
import { GetRandomVocaQueryDto } from './dto/get-random-voca-query.dto';
import { GetWordExactQueryDto } from './dto/get-word-exact-query.dto';
import { JlptVocaService } from './jlpt-voca.service';

@ApiTags('JLPT Vocabulary')
@Controller('jlpt-voca')
export class JlptVocaController {
  constructor(private readonly jlptVocaService: JlptVocaService) {}

  @Get()
  @ApiOperation({
    summary: 'JLPT 단어 목록 조회',
    description:
      '레벨별 단어 목록 조회 및 검색 (search, word, meaning, meaning_ko)',
  })
  async list(@Query() query: GetJlptVocaQueryDto) {
    return this.jlptVocaService.findAll(query);
  }

  @Get('random')
  @ApiOperation({
    summary: '랜덤 단어 조회',
    description: '레벨별 또는 전체에서 랜덤으로 단어 1개 조회',
  })
  async random(@Query() query: GetRandomVocaQueryDto) {
    return this.jlptVocaService.findRandom(query);
  }

  @Get('word')
  @ApiOperation({
    summary: '단어 정확히 일치 검색',
    description: 'word 필드가 정확히 일치하는 단어 조회',
  })
  async findByWordExact(@Query() query: GetWordExactQueryDto) {
    return this.jlptVocaService.findByWordExact(query);
  }
}
