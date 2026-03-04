import Anthropic from '@anthropic-ai/sdk';

export interface AnalysisResult {
  summary: string;
  riskAssessment: string;
  keyDevelopments: string[];
  escalationProbability: 'Low' | 'Medium' | 'High' | 'Critical';
  escalationReasoning: string;
  generatedAt: string;
}

export async function generateAnalysis(
  headlines: string[],
  escalationLevel: number
): Promise<AnalysisResult> {
  if (headlines.length < 2) {
    return {
      summary: 'Insufficient news data to generate analysis. RSS feeds may be temporarily unavailable.',
      riskAssessment: 'Unable to assess risk without current news data.',
      keyDevelopments: ['News feeds unavailable — check server logs', 'Historical timeline data is still displayed below', 'Analysis will auto-retry when feeds recover'],
      escalationProbability: 'Low',
      escalationReasoning: 'Default due to no live data.',
      generatedAt: new Date().toISOString(),
    };
  }

  const headlineText = headlines.slice(0, 15).map((h, i) => `${i + 1}. ${h}`).join('\n');

  // Instantiate at call-time so process.env is populated by dotenv
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system: `Geopolitical analyst. US-Iran tensions. Be factual, measured, cite headlines only. No invented facts. Reply ONLY with JSON:
{"summary":"2-3 sentences","riskAssessment":"1-2 sentences","keyDevelopments":["x","x","x"],"escalationProbability":"Low|Medium|High|Critical","escalationReasoning":"brief"}`,
    messages: [
      {
        role: 'user',
        content: `Score:${escalationLevel}/100\nHeadlines:\n${headlineText}`,
      },
    ],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';

  // Strip any markdown code fences Claude might wrap around JSON
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(clean);
    return { ...parsed, generatedAt: new Date().toISOString() };
  } catch {
    console.warn('[anthropic] JSON parse failed, raw:', clean.slice(0, 300));
    // Return a graceful fallback rather than crashing the route
    return {
      summary: 'Analysis parsing failed — Claude response was malformed. Will retry on next refresh.',
      riskAssessment: 'Unable to assess — response format error.',
      keyDevelopments: ['Response parse error — check server logs', 'Manual refresh may resolve this'],
      escalationProbability: 'Low' as const,
      escalationReasoning: 'Parse failure fallback.',
      generatedAt: new Date().toISOString(),
    };
  }
}
