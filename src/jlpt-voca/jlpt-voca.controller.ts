import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetJlptVocaQueryDto } from './dto/get-jlpt-voca-query.dto';
import { GetRandomVocaByIdsQueryDto } from './dto/get-random-voca-by-ids-query.dto';
import { GetRandomVocaByLevelQueryDto } from './dto/get-random-voca-by-level-query.dto';
import { GetWordExactQueryDto } from './dto/get-word-exact-query.dto';
import { GenerateExampleSentenceDto } from './dto/generate-example-sentence.dto';
import { JlptVocaService } from './jlpt-voca.service';

@ApiTags('JLPT Vocabulary')
@Controller('jlpt-voca')
export class JlptVocaController {
  constructor(private readonly jlptVocaService: JlptVocaService) {}

  @Get('search')
  @ApiOperation({
    summary: 'JLPT 단어 목록 조회',
    description:
      '레벨별 단어 목록 조회 및 검색 (search, word, meaning, meaning_ko)',
  })
  async list(@Query() query: GetJlptVocaQueryDto) {
    return this.jlptVocaService.findAll(query);
  }

  @Get('totals-by-level')
  @ApiOperation({
    summary: '레벨 메타 정보 조회',
    description: 'JLPT 레벨별 전체 단어 수와 전체 합계를 반환',
  })
  async levelsMeta() {
    return this.jlptVocaService.getLevelsMeta();
  }

  @Get('random/level')
  @ApiOperation({
    summary: '레벨 기반 랜덤 단어 조회',
    description: '레벨 별 또는 전체에서 지정한 개수만큼 랜덤 단어 조회',
  })
  async randomByLevel(@Query() query: GetRandomVocaByLevelQueryDto) {
    return this.jlptVocaService.findRandomByLevel(query);
  }

  @Get('random/ids')
  @ApiOperation({
    summary: 'ID 배열 기반 단어 랜덤 섞기',
    description: '쿼리로 전달된 ID 배열에 해당하는 단어들을 랜덤으로 섞어서 반환',
  })
  async randomByIds(@Query() query: GetRandomVocaByIdsQueryDto) {
    return this.jlptVocaService.findRandomByIds(query);
  }

  @Get('find')
  @ApiOperation({
    summary: '단어 정확히 일치 검색',
    description: 'word 필드가 정확히 일치하는 단어 조회',
  })
  async findByWordExact(@Query() query: GetWordExactQueryDto) {
    return this.jlptVocaService.findByWordExact(query);
  }

  @Post('examples')
  @ApiOperation({
    summary: 'OpenAI 예문 및 후리가나 생성',
    description:
      '일본어 단어를 입력받아 OpenAI 에이전트를 통해 예문과 한자별 후리가나 매핑을 생성합니다.',
  })
  @HttpCode(200)
  async createExampleSentence(@Body() body: GenerateExampleSentenceDto) {
    return this.jlptVocaService.generateExampleSentenceForWord(body.word);
  }
}
