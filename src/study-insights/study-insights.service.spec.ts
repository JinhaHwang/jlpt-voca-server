import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { runStudyInsightWorkflow } from './study-insight.workflow';
import { StudyInsightsService } from './study-insights.service';

jest.mock('./study-insight.workflow', () => ({
  runStudyInsightWorkflow: jest.fn(),
}));

const mockedWorkflow = jest.mocked(runStudyInsightWorkflow);

describe('StudyInsightsService', () => {
  const input = {
    level: 2,
    unit: 14,
    targetWordCount: 50,
    learnedWordCount: 32,
    repeatWordCount: 8,
    reviewCount: 0,
    totalStudySeconds: 1080,
  };

  beforeEach(() => jest.clearAllMocks());

  it('calculates progress and merges the AI message', async () => {
    const service = new StudyInsightsService(
      new ConfigService({ OPENAI_API_KEY: 'test-key' }),
    );
    mockedWorkflow.mockResolvedValue({
      summary: 'N2 Unit 14 학습을 80% 완료했어요.',
      nextAction: '남은 10단어부터 마무리해 보세요.',
    });

    await expect(service.createInsight(input)).resolves.toEqual({
      status: 'in_progress',
      progressRate: 80,
      summary: 'N2 Unit 14 학습을 80% 완료했어요.',
      nextAction: '남은 10단어부터 마무리해 보세요.',
    });
    expect(mockedWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        studiedWordCount: 40,
        remainingWordCount: 10,
        progressRate: 80,
      }),
    );
  });

  it('treats a recorded review as completed', async () => {
    const service = new StudyInsightsService(
      new ConfigService({ OPENAI_API_KEY: 'test-key' }),
    );
    mockedWorkflow.mockResolvedValue({
      summary: '오늘 Unit 학습을 완료했어요.',
      nextAction: '완료한 내용을 가볍게 복습해 보세요.',
    });

    const result = await service.createInsight({
      ...input,
      learnedWordCount: 0,
      repeatWordCount: 0,
      reviewCount: 1,
    });

    expect(result.status).toBe('completed');
    expect(result.progressRate).toBe(100);
  });

  it('does not call OpenAI without an API key', async () => {
    const service = new StudyInsightsService(new ConfigService({}));

    await expect(service.createInsight(input)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockedWorkflow).not.toHaveBeenCalled();
  });
});
