// Next.js API route that performs sentiment analysis using OpenAI's API, with a keyword-based fallback if the API fails.


// used to send responses in Next.js API routes
import { NextResponse } from 'next/server'; 

// defines allowed sentiment values
type SentimentalLabel = 'positive' | 'negative' | 'neutral'; 

// Structure of the sentiment result
type SentimentalResult = {
  sentiment: SentimentalLabel; // classification result
  confidence: number;          // confidence score (0-1)
  reason: string;              // short explanation
};

// Extends result with who generated it (OpenAI or fallback)
type SentimentalResponse = SentimentalResult & {
  provider: 'openai' | 'keyword-fallback';
};

// OpenAI model to use - set via environment variable or default to mini model for testing
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'gpt-4.1-mini';

// Converts raw JSON string to structured objects
function parsedModelOutput(content: string): SentimentalResult {
  const parsed = JSON.parse(content) as {
    sentiment?: string;
    confidence?: number;
    reason?: string;
  };
  return {
    sentiment: (parsed.sentiment ?? 'neutral') as SentimentalLabel,
    confidence: parsed.confidence ?? 0,
    reason: parsed.reason ?? '',
  };
}

/**
 * calls the OpenAI Responses API and asks the model to clasify the sentiment of the text as positive, negative or neutral.
 */
async function analyzeWithOpenAI(text: string): Promise<Omit<SentimentalResponse, 'provider'>> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_API_KEY,
      input: [
        {
          role: 'system',
          content: 
          'Your are a sentiment classifier. Return strict JSON only. Format: { "sentiment": "positive" | "negative" | "neutral", "confidence": 0..1, "reason":"short reason"}'
        },
        {
          role: 'user',
          content: text,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error('OPENAI request failed: (${response.status}): errorBody');
  }

  const payload = (await response.json()) as {
    sentiment?: string;
    confidence?: number;
    reason?: string;
  };


  const sentiment = payload.sentiment;
  const confidence = payload.confidence;
  const reason = payload.reason;

  // Validate the output to ensure it matches our expected schema
  if (
    sentiment !== 'positive' && sentiment !== 'negative' && sentiment !== 'neutral' ||
    typeof confidence !== 'number' ||
    confidence < 0 || confidence > 1 || typeof reason !== 'string'||
      reason.length === 0
  ) {
    throw new Error('Output model did not match expected JSON schema');
  }
  
  return {
    sentiment,
    confidence,
    reason: reason,
  };
}

/**
 * Local fallback so development can proceed if no API key is configured.
 */

function analyzeWithKeywords(text: string): Omit<SentimentalResponse, 'provider'> {
  const normalizedText = text.toLowerCase();

  if (/(great | excellent | amazing | awesome | good | love)/.test(normalizedText)) {
    return {
      sentiment: 'positive',
      confidence: 0.55,
      reason: 'Detected positive keywords.',
    };
  }
  if (/(terrible | awful | bad | hate | worst)/.test(normalizedText)) {
    return {
      sentiment: 'negative',
      confidence: 0.55,
      reason: 'Detected negative keywords.',
    };
  }
  return {
    sentiment: 'neutral',
    confidence: 0.5,
    reason: 'No strong sentiment keywords detected.',
  };
}

/** 
 * POST API route handler 
 * Accepts: { text: string }
 * Returns: sentiment analysis result
*/

export async function POST(req: Request) {

  try {
    const body = (await req.json()) as { text: string };
    const text = body.text?.trim();

    // Validate input
    if (!text) {
      return NextResponse.json({error: 'Please provide a non-empty text field.'}, { status: 400 });
  }

  try {
    // Try OpenAI first
    const aiResult = await analyzeWithOpenAI(text);
    return NextResponse.json({ ...aiResult, provider: 'openai' satisfies SentimentalResponse ['provider'] });
  } catch (openAiError) {
    console.warn('[sentiment] OpenAI unavailable, using fallback:', openAiError);
    const fallback = analyzeWithKeywords(text);
    return NextResponse.json({
      ...fallback,
      provder: 'keyword-fallback' satisfies SentimentalResponse ['provider'], // fix typo in provider key
    });
  }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
}

/**
 * Key issues needed to be addressed:
 * Wrong API format (input instead of messsages)
 * Misnamed variable (OPENAI_API_KEY)
 * Typo (provider)
 * Unused function (parsedModelOutput)
 * Not extracting choice[0].message.content
 */

