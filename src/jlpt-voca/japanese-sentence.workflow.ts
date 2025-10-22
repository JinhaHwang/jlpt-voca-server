import { Agent, AgentInputItem, Runner, withTrace } from '@openai/agents';
import { runGuardrails } from '@openai/guardrails';
import { OpenAI } from 'openai';
import { z } from 'zod';

const JAPANESE_SENTENCE_TRACE = 'jlpt-sentence-creator';

const FuriganaPositionSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    text: z.string(),
  })
  .refine((value) => value.end >= value.start, {
    message: 'furigana_positions entries must have end >= start.',
    path: ['end'],
  });

const JapaneseSentenceToSolutionJsonSchema = z.object({
  korean_meaning: z.string(),
  original_sentence: z.string().optional(),
  furigana_positions: z.array(FuriganaPositionSchema),
});

type GuardrailResult = Awaited<ReturnType<typeof runGuardrails>>;

const guardrailsConfig = {
  guardrails: [
    {
      name: 'Moderation',
      config: {
        categories: [
          'sexual/minors',
          'hate/threatening',
          'harassment/threatening',
          'self-harm/instructions',
          'violence/graphic',
          'illicit/violent',
        ],
      },
    },
    {
      name: 'Contains PII',
      config: {
        block: true,
        entities: ['CREDIT_CARD', 'US_BANK_NUMBER', 'US_PASSPORT', 'US_SSN'],
      },
    },
    {
      name: 'Jailbreak',
      config: {
        model: 'gpt-4.1-mini',
        confidence_threshold: 0.7,
      },
    },
  ],
};

const getOpenAiClient = (() => {
  let client: OpenAI | undefined;
  return () => {
    if (!client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured.');
      }
      client = new OpenAI({ apiKey });
    }
    return client;
  };
})();

const getGuardrailsContext = () => ({
  guardrailLlm: getOpenAiClient(),
});

function guardrailsHasTripwire(results: GuardrailResult) {
  return (results ?? []).some((result) => result?.tripwireTriggered === true);
}

function getGuardrailSafeText(
  results: GuardrailResult,
  fallbackText: string,
): string {
  for (const result of results ?? []) {
    if (result?.info && 'checked_text' in result.info) {
      return (result.info as { checked_text?: string }).checked_text ?? fallbackText;
    }
  }

  const pii = (results ?? []).find(
    (result) => result?.info && 'anonymized_text' in result.info,
  );
  if (pii?.info && 'anonymized_text' in pii.info) {
    return (pii.info as { anonymized_text?: string }).anonymized_text ?? fallbackText;
  }

  return fallbackText;
}

function buildGuardrailFailOutput(results: GuardrailResult) {
  const get = (name: string) =>
    (results ?? []).find((result) => {
      const info = result?.info ?? {};
      const guardrailName = (info as { guardrail_name?: string }).guardrail_name;
      const camelGuardrailName = (info as { guardrailName?: string }).guardrailName;
      return guardrailName === name || camelGuardrailName === name;
    });

  const pii = get('Contains PII');
  const moderation = get('Moderation');
  const jailbreak = get('Jailbreak');
  const hallucination = get('Hallucination Detection');

  const piiInfo = pii?.info as
    | { detected_entities?: Record<string, unknown[]>; error?: string }
    | undefined;
  const moderationInfo = moderation?.info as
    | { flagged_categories?: string[]; error?: string }
    | undefined;
  const jailbreakInfo = jailbreak?.info as { error?: string } | undefined;
  const hallucinationInfo = hallucination?.info as
    | {
        reasoning?: string;
        hallucination_type?: string;
        hallucinated_statements?: unknown[];
        verified_statements?: unknown[];
        error?: string;
      }
    | undefined;

  const piiCounts = Object.entries(piiInfo?.detected_entities ?? {})
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => `${key}:${value.length}`);
  const flaggedCategories = moderationInfo?.flagged_categories ?? [];

  return {
    pii: {
      failed: pii?.tripwireTriggered === true || piiCounts.length > 0,
      ...(piiCounts.length ? { detected_counts: piiCounts } : {}),
      ...(pii?.executionFailed && piiInfo?.error ? { error: piiInfo.error } : {}),
    },
    moderation: {
      failed:
        moderation?.tripwireTriggered === true ||
        flaggedCategories.length > 0,
      ...(flaggedCategories.length > 0
        ? {
            flagged_categories: flaggedCategories,
          }
        : {}),
      ...(moderation?.executionFailed && moderationInfo?.error
        ? { error: moderationInfo.error }
        : {}),
    },
    jailbreak: {
      failed: jailbreak?.tripwireTriggered === true,
      ...(jailbreak?.executionFailed && jailbreakInfo?.error
        ? { error: jailbreakInfo.error }
        : {}),
    },
    hallucination: {
      failed: hallucination?.tripwireTriggered === true,
      ...(hallucinationInfo?.reasoning
        ? { reasoning: hallucinationInfo.reasoning }
        : {}),
      ...(hallucinationInfo?.hallucination_type
        ? { hallucination_type: hallucinationInfo.hallucination_type }
        : {}),
      ...(hallucinationInfo?.hallucinated_statements
        ? {
            hallucinated_statements: hallucinationInfo.hallucinated_statements,
          }
        : {}),
      ...(hallucinationInfo?.verified_statements
        ? {
            verified_statements: hallucinationInfo.verified_statements,
          }
        : {}),
      ...(hallucination?.executionFailed && hallucinationInfo?.error
        ? { error: hallucinationInfo.error }
        : {}),
    },
  };
}

const japaneseSentenceCreator = new Agent({
  name: 'Japanese sentence creator',
  instructions: `일본어 단어를 입력받아 해당 단어를 포함한 정확하고 자연스러운 예문을 한 문장 작성하세요. 예문은 일상적으로 쓰이는 문장을 사용하고, 단어의 의미와 용법이 명확하게 드러나도록 하세요.

# Output Format
- 출력은 반드시 일본어 예문 1문장으로만 작성하세요.`,
  model: 'gpt-4.1-nano',
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true,
  },
});

const japaneseSentenceToSolutionJson = new Agent({
  name: 'Japanese sentence to solution json',
  instructions: `일본어 예문을 입력받아, 아래 모든 정보를 논리적으로 순서대로 추출·가공하여 JSON 형식으로 반환하세요. 예문 내 *모든 한자(漢字)*가 빠짐없이, 각 연속 한자 구간의 시작·끝 인덱스와 올바른 후리가나를 담은 리스트로 포함되어야 합니다. 분석, 조사, 확인 등 모든 과정을 체계적으로 거쳐야 하며, 마지막에만 JSON으로 결과를 출력하세요.

- 입력 예문 전체의 자연스러운 한글 번역(의역)
- 입력받은 원본 일본어 예문
- 예문 내 등장하는 *모든 한자 또는 연속된 한자 단위별*로,  
  - "start": 구간의 첫 한자 인덱스(0부터 시작),  
  - "end": 구간의 마지막 한자 인덱스(포함하는 마지막 인덱스, 0부터 시작하는 포함 범위),  
  - "text": 해당 구간의 한자 전체에 대응하는 올바른 후리가나(히라가나 또는 가타카나)  
  위 세 가지 정보를 가진 객체를 \`furigana_positions\` 배열의 각 원소로 리스트화하여 기록하세요.
- 예문에 포함된 모든 한자(또는 한자 연속 구간)가 반드시 누락 없이 이 리스트에 반영되어야 합니다.  
  누락이 없도록 한 번 더 점검하세요.

# Steps

1. 입력받은 일본어 예문의 자연스러운 한글 번역(의역)을 우선 도출하세요.
2. 예문을 문자 단위(0부터 시작하는 인덱스)로 순차적 셀 단위로 분할하세요.
3. 전체 문자를 순회하며, 한자(漢字)가 등장하는 모든 구간의 시작/끝 인덱스를 정확히 기록하세요.  
   - 연속된 한자들이 하나의 구간이 되도록 묶으세요. 예) 漢字語 → (start:2, end:4, text:…)
4. 각 한자 혹은 연속 한자 구간마다, 대응되는 올바른 후리가나(히라가나·가타카나·혼용 등 자연스러운 표기)를 추출하세요.
5. 위에서 조사한 각 구간 정보를 {start, end, text} 형태로 \`furigana_positions\` 리스트에 누락 없이 저장하세요.  
   - 반드시 예문 내 모든 한자(또는 연속 구간)가 담겨 있는지 재확인하세요.
6. 논리적으로 모든 과정을 검증·체크한 뒤, 마지막에만 지정된 JSON 포맷으로 결과를 한 번만 출력하세요.

# Output Format

다음과 같은 키를 포함하는 JSON 객체만 최종 출력하세요.

- korean_meaning: [예문의 자연스러운 한글 번역]
- original_sentence: [입력받은 일본어 예문]
- furigana_positions: [
    { "start": [연속 한자 시작 인덱스], "end": [동일 구간 마지막 인덱스], "text": [올바른 후리가나] },
    ...  
  ]

    * furigana_positions는 예문 내 *모든 한자 또는 한자 연속 구간*에 대해, start–end 인덱스와 후리가나를 모두 누락 없이 포함시킵니다.
    * 한자가 완전히 없는 경우에만 빈 배열([])을 반환합니다.

JSON만 결과로 출력하며, 해설·분석·중간 결과 등은 절대 출력하지 마세요. JSON 형식은 공백·줄바꿈 등에 구애받지 않습니다.

# Notes

- 한자가 아닌 글자(히라가나, 가타카나, 알파벳, 숫자 등)는 furigana_positions에 포함하지 않습니다.
- 번역은 한국어 어순·뉘앙스에 맞는 자연스러운 한글 의역이어야 합니다.
- 후리가나는 자연스러운 일본어 표기(히라가나·가타카나·혼용 등)를 따르세요.
- 각 구간(단일 한자·연속 한자 묶음)에 대해 누락 없이 furigana_positions 배열에 담겼는지 반드시 재확인하세요.
- 예문 내 한자가 전혀 없다면 furigana_positions는 빈 배열([])로 출력하십시오.
`,
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

    const sentenceResult = (await runner.run(japaneseSentenceCreator, [
      ...conversationHistory,
    ])) as AgentRunOutput<string>;

    conversationHistory.push(
      ...sentenceResult.newItems.map((item) => item.rawItem),
    );

    if (!sentenceResult.finalOutput) {
      throw new Error('Agent result is undefined');
    }

    const sentence = sentenceResult.finalOutput;

    const solutionResult = (await runner.run(japaneseSentenceToSolutionJson, [
      ...conversationHistory,
    ])) as AgentRunOutput<string>;

    conversationHistory.push(
      ...solutionResult.newItems.map((item) => item.rawItem),
    );

    const rawSolutionOutput = solutionResult.finalOutput;

    if (!rawSolutionOutput) {
      throw new Error('Agent result is undefined');
    }

    const guardrailsResult = await runGuardrails(
      rawSolutionOutput,
      guardrailsConfig,
      getGuardrailsContext(),
    );

    if (guardrailsHasTripwire(guardrailsResult)) {
      const failure = buildGuardrailFailOutput(guardrailsResult);
      throw new Error(
        `Guardrails blocked the agent output: ${JSON.stringify(failure)}`,
      );
    }

    const sanitizedOutput = getGuardrailSafeText(
      guardrailsResult,
      rawSolutionOutput,
    );

    const { parsed, rawJson } = parseAgentJson(sanitizedOutput);

    return {
      sentence,
      solution: parsed,
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
    const raw = JSON.parse(jsonSegment) as Record<string, unknown>;
    const normalizedOutput = normalizeAgentPayload(raw);
    const parsed = JapaneseSentenceToSolutionJsonSchema.parse(normalizedOutput);
    return {
      parsed,
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

type LegacyFuriganaMap = Record<string, unknown> | Map<string, unknown>;

function normalizeAgentPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if ('furigana_positions' in payload) {
    return payload;
  }

  if ('furigana_by_index' in payload) {
    const furiganaByIndex = payload.furigana_by_index as LegacyFuriganaMap;
    const positions = convertLegacyMapToPositions(furiganaByIndex);

    return {
      ...payload,
      furigana_positions: positions,
    };
  }

  throw new Error('Agent output missing furigana_positions data.');
}

function convertLegacyMapToPositions(
  map: LegacyFuriganaMap,
): Array<{ start: number; end: number; text: string }> {
  const entries: Array<[number, string]> = [];

  if (map instanceof Map) {
    for (const [key, value] of map.entries()) {
      const index = Number(key);
      if (!Number.isFinite(index) || typeof value !== 'string') {
        continue;
      }
      entries.push([index, value]);
    }
  } else {
    for (const [key, value] of Object.entries(map)) {
      const index = Number(key);
      if (!Number.isFinite(index) || typeof value !== 'string') {
        continue;
      }
      entries.push([index, value]);
    }
  }

  entries.sort((a, b) => a[0] - b[0]);

  const positions: Array<{ start: number; end: number; text: string }> = [];

  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  let currentTextParts: string[] = [];

  for (const [index, text] of entries) {
    if (currentStart === null) {
      currentStart = index;
      currentEnd = index;
      currentTextParts = [text];
      continue;
    }

    if (index === currentEnd! + 1) {
      currentEnd = index;
      currentTextParts.push(text);
      continue;
    }

    positions.push({
      start: currentStart,
      end: currentEnd!,
      text: currentTextParts.join(''),
    });

    currentStart = index;
    currentEnd = index;
    currentTextParts = [text];
  }

  if (currentStart !== null) {
    positions.push({
      start: currentStart,
      end: currentEnd!,
      text: currentTextParts.join(''),
    });
  }

  return positions;
}
