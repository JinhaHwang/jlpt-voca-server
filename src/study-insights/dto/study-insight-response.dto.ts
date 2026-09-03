import { ApiProperty } from '@nestjs/swagger';

export class StudyInsightResponseDto {
  @ApiProperty({
    enum: ['not_started', 'in_progress', 'completed'],
    example: 'in_progress',
  })
  status: 'not_started' | 'in_progress' | 'completed';

  @ApiProperty({ example: 80, minimum: 0, maximum: 100 })
  progressRate: number;

  @ApiProperty({ example: 'N2 Unit 14 학습을 80% 완료했어요.' })
  summary: string;

  @ApiProperty({
    example: '남은 10단어를 학습한 뒤 헷갈린 8단어를 복습해 보세요.',
  })
  nextAction: string;
}
