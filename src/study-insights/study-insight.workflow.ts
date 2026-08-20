import { Agent, Runner, withTrace } from '@openai/agents';
import { z } from 'zod';

import type { StudyInsightContext } from './study-insights.service';

const TRACE_NAME = 'study-insight-creator';
const StudyInsightMessageSchema = z.object({
  summary: z.string().min(1).max(100),
  nextAction: z.string().min(1).max(100),
});

export type StudyInsightMessage = z.infer<typeof StudyInsightMessageSchema>;

const studyInsightAgent = new Agent({
  name: 'Study insight creator',
  instructions: `당신은 JLPT 회독 학습 서비스 다독다독의 학습 코치입니다.
입력으로 제공된 확정된 학습 상태를 해석해 한국어 안내 문구를 작성하세요.
- 수치, 레벨, Unit, 상태를 변경하거나 새 학습량을 제안하지 마세요.
- summary는 현재 성취를 사실적으로 설명하는 한 문장입니다.
- nextAction은 remainingWordCount와 repeatWordCount에 근거한 한 문장입니다.
- 과장, 죄책감을 주는 표현, 시험 합격 보장은 사용하지 마세요.
- 각 문장은 100자 이내로 작성하세요.`,
  model: 'gpt-4.1-nano',
  modelSettings: {
    temperature: 0.4,
    maxTokens: 256,
    store: false,
  },
  outputType: StudyInsightMessageSchema,
});

export const runStudyInsightWorkflow = async (
  context: StudyInsightContext,
): Promise<StudyInsightMessage> =>
  withTrace(TRACE_NAME, async () => {
    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'dadokdadok-api',
        feature: TRACE_NAME,
      },
    });
    const result = await runner.run(studyInsightAgent, JSON.stringify(context));

    if (!result.finalOutput) {
      throw new Error('Study insight agent result is undefined.');
    }

    return StudyInsightMessageSchema.parse(result.finalOutput);
  });
