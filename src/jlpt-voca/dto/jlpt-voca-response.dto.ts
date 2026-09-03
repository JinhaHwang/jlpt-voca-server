import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JlptVocaResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '学校' })
  word: string;

  @ApiProperty({ example: 'school' })
  meaning: string;

  @ApiProperty({ example: 'がっこう' })
  furigana: string;

  @ApiProperty({ example: 'gakkou' })
  romaji: string;

  @ApiProperty({ example: '5', enum: ['1', '2', '3', '4', '5'] })
  level: string;

  @ApiProperty({ example: '학교' })
  meaning_ko: string;
}

export class JlptVocaPaginationMetaResponseDto {
  @ApiProperty({ example: 680 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiPropertyOptional({
    example: 14,
    description: '전체 데이터가 0건이면 생략됩니다.',
  })
  totalPages?: number;
}

export class JlptVocaListResponseDto {
  @ApiProperty({ type: () => [JlptVocaResponseDto] })
  items: JlptVocaResponseDto[];

  @ApiProperty({ type: () => JlptVocaPaginationMetaResponseDto })
  meta: JlptVocaPaginationMetaResponseDto;
}

export class JlptVocaLevelTotalResponseDto {
  @ApiProperty({ example: '5', enum: ['1', '2', '3', '4', '5'] })
  level: string;

  @ApiProperty({ example: 680 })
  total: number;
}

export class JlptVocaLevelsMetaResponseDto {
  @ApiProperty({ example: 8150 })
  total: number;

  @ApiProperty({ type: () => [JlptVocaLevelTotalResponseDto] })
  levels: JlptVocaLevelTotalResponseDto[];
}

export class FuriganaPositionResponseDto {
  @ApiProperty({ example: 0, description: '문장 내 한자의 시작 인덱스' })
  start: number;

  @ApiProperty({ example: 1, description: '문장 내 한자의 끝 인덱스' })
  end: number;

  @ApiProperty({ example: 'がく', description: '한자의 후리가나' })
  text: string;

  @ApiProperty({ example: '学' })
  kanji: string;
}

export class ExampleSentenceResponseDto {
  @ApiProperty({ example: '学校' })
  word: string;

  @ApiProperty({ example: '학교' })
  word_korean_meaning: string;

  @ApiProperty({ example: '毎日、学校へ行きます。' })
  sentence: string;

  @ApiProperty({ example: '매일 학교에 갑니다.' })
  korean_meaning: string;

  @ApiProperty({ type: () => [FuriganaPositionResponseDto] })
  furigana_positions: FuriganaPositionResponseDto[];
}
