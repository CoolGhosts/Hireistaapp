import axios from 'axios';
import * as Private from '@/config/private';

const OPENROUTER_API_KEY = Private.OPENROUTER_API_KEY || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const YOUR_SITE_URL = Private.SITE_URL || process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost';
const YOUR_SITE_NAME = Private.SITE_NAME || process.env.EXPO_PUBLIC_SITE_NAME || 'Jobbify';

if (!OPENROUTER_API_KEY) {
  console.warn('EXPO_PUBLIC_OPENROUTER_API_KEY is not set in environment variables');
}

export const getOpenRouterCompletion = async (prompt: string): Promise<string> => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key missing');
  }
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-r1-0528:free',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': YOUR_SITE_URL,
          'X-Title': YOUR_SITE_NAME,
        },
        timeout: 180000,
      }
    );

    return response.data?.choices?.[0]?.message?.content ?? '';
  } catch (error: any) {
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('Error getting completion from OpenRouter:', errorMessage);
    throw new Error(`Failed to get completion from OpenRouter: ${errorMessage}`);
  }
};

export default { getOpenRouterCompletion };
