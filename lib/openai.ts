import { createOpenAI } from '@ai-sdk/openai';

if (!process.env.NEXT_PUBLIC_API_KEY) {
  throw new Error('Missing environment variable NEXT_PUBLIC_API_KEY');
}

export const openai = createOpenAI({
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  compatibility: 'strict'
});

export default openai;