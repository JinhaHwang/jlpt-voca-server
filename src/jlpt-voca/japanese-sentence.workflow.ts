import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';
import { z } from 'zod';

const JAPANESE_SENTENCE_TRACE = 'jlpt-sentence-creator';

const JapaneseSentenceToSolutionJsonSchema = z.object({
  korean_meaning: z.string(),
  original_sentence: z.string(),
  furigana_by_index: z.record(z.string(), z.string()),
});

const japaneseSentenceCreator = new Agent({
  name: 'Japanese sentence creator',
  instructions: `일본어 단어를 입력받아 해당 단어를 포함한 정확하고 자연스러운 예문을 한 문장 작성하세요. 예문은 일상적으로 쓰이는 문장을 사용하고, 단어의 의미와 용법이 명확하게 드러나도록 하세요.

# Output Format
- 출력은 반드시 일본어 예문 1문장으로만 작성하세요.`,
  model: 'gpt-5-nano',
  modelSettings: {
    reasoning: {
      effort: 'low',
    },
    store: true,
  },
});

const japaneseSentenceToSolutionJson = new Agent({
  name: 'Japanese sentence to solution json',
  instructions: `일본어 예문을 입력받아, 아래의 정보를 추출하고 가공하여 JSON 형식으로 반환하세요.

- 입력 예문 내의 전체 한글 뜻(번역)
- 입력 예문 자체
- 예문의 각 한자(漢字)가 위치한 인덱스(index)를 키로 하고, 해당 인덱스의 한자에 대해 표현할 후리가나(읽는 법, 가타카나 또는 히라가나)를 값으로 하는 맵(딕셔너리 또는 배열 등 구조적 타입)

모든 단계를 논리적으로 차례로 생각하고 분석한 후, 마지막에 JSON 결과를 출력하세요.

# Steps

1. 일본어 예문을 받아 해당 예문의 전체 한글 뜻(자연스러운 한국어 번역)을 먼저 도출하세요.
2. 예문을 한자 단위로 분해하고, 각각의 한자가 예문 내 어느 인덱스(즉, 문장 내 몇 번째 글자인지)에 위치해 있는지에 파악하세요.
3. 각 한자마다 그 인덱스에 후리가나(읽는 법)를 매핑하여 기록하세요 (단, 한자가 아닌 글자는 무시).
4. 결과를 정의된 JSON 포맷에 맞춰 작성하세요.

# Output Format

아래와 같은 키를 포함하는 JSON 객체로 출력하세요.

- korean_meaning: [예문의 한글 뜻]
- original_sentence: [입력받은 일본어 예문]
- furigana_by_index: { [인덱스: 후리가나], ... }
    * 인덱스는 0부터 시작하는 문자 단위의 순서입니다.
    * furigana_by_index에는 예문 내 각 한자의 인덱스만 키로 포함시키세요.

예시:
{
  "korean_meaning": "나는 도서관에 갑니다.",
  "original_sentence": "私は図書館に行きます。",
  "furigana_by_index": {
    "0": "わたし",
    "2": "と",
    "3": "しょ",
    "4": "かん",
    "6": "い"
  }
}

# Examples

## 입력 예시
입력: 今日は天気がいいですね。

## 출력 예시
{
  "korean_meaning": "오늘은 날씨가 좋네요.",
  "original_sentence": "今日は天気がいいですね。",
  "furigana_by_index": {
    "0": "きょう",
    "2": "てん",
    "3": "き"
  }
}

(실제 예문은 훨씬 더 길거나 복잡할 수 있으므로, 모든 한자에 대해 인덱스와 올바른 후리가나가 매핑되어야 합니다.)

# Notes

- 한자 외의 문자(히라가나, 가타카나, 알파벳, 숫자 등)는 furigana_by_index의 키로 포함하지 않습니다.
- 정확한 일본어 해석(의역이 아닌 자연스러운 번역)을 우선합니다.
- 후리가나는 히라가나/가타카나 혼합 표기가 적절하다면 그대로 사용하세요.
- 한 예문에 한자가 하나도 없다면 furigana_by_index는 빈 객체({})로 두세요.`,
  model: 'gpt-5-chat-latest',
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

type WorkflowInput = { input_as_text: string };

type FuriganaSolution = z.infer<typeof JapaneseSentenceToSolutionJsonSchema>;

export type JapaneseSentenceWorkflowResult = {
  sentence: string;
  solution: FuriganaSolution;
  rawSolutionJson: string;
};

type AgentRunOutput<TFinal> = {
  finalOutput?: TFinal;
  newItems: Array<{ rawItem: AgentInputItem }>;
};

export const runWorkflow = async (
  workflow: WorkflowInput,
): Promise<JapaneseSentenceWorkflowResult> => {
  return withTrace(JAPANESE_SENTENCE_TRACE, async () => {
    const conversationHistory: AgentInputItem[] = [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: workflow.input_as_text,
          },
        ],
      },
    ];

    const runner = new Runner({
      traceMetadata: {
        __trace_source__: 'agent-builder',
        workflow_id: 'wf_68f7a90c04788190b84a0227d28d2e6f082c12e6567ce83b',
      },
    });

    const japaneseSentenceCreatorResult =
      (await runner.run(japaneseSentenceCreator, [
        ...conversationHistory,
      ])) as AgentRunOutput<string>;

    conversationHistory.push(
      ...japaneseSentenceCreatorResult.newItems.map((item) => item.rawItem),
    );

    if (!japaneseSentenceCreatorResult.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    const sentence = japaneseSentenceCreatorResult.finalOutput;

    const japaneseSentenceToSolutionJsonResult =
      (await runner.run(japaneseSentenceToSolutionJson, [
        ...conversationHistory,
      ])) as AgentRunOutput<string>;

    conversationHistory.push(
      ...japaneseSentenceToSolutionJsonResult.newItems.map(
        (item) => item.rawItem,
      ),
    );

    const rawAgentOutput = japaneseSentenceToSolutionJsonResult.finalOutput;

    if (!rawAgentOutput) {
      throw new Error('Agent result is undefined');
    }

    const { parsed: parsedSolution, rawJson } = parseAgentJson(rawAgentOutput);

    return {
      sentence,
      solution: parsedSolution,
      rawSolutionJson: rawJson,
    };
  });
};

function parseAgentJson(
  output: string,
): { parsed: FuriganaSolution; rawJson: string } {
  const normalized = output.trim();
  const jsonSegment = extractFirstJsonObject(normalized);

  try {
    const parsed = JSON.parse(jsonSegment) as unknown;
    return {
      parsed: JapaneseSentenceToSolutionJsonSchema.parse(parsed),
      rawJson: JSON.stringify(parsed),
    };
  } catch (error) {
    throw new Error('Invalid agent JSON output', { cause: error });
  }
}

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Agent output did not include a JSON object.');
  }

  return text.slice(start, end + 1);
}
