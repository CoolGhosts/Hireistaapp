// aiAssistantService.ts
// AI API wrapper for Jobbify AI Assistant and Job Description Processing

import { getOpenRouterCompletion } from './openRouterService';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
import * as Private from '@/config/private';
const OPENAI_API_KEY = Private.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
const HAS_OPENAI_KEY = !!OPENAI_API_KEY;

// Interface for processed job description
export interface ProcessedJobDescription {
  cleanDescription: string;
  qualifications: string[];
  requirements: string[];
  keyHighlights: string[];
  summary: string;
}

// Generic AI completion function
async function getAIResponse(messages: Array<{role: string, content: string}>, maxTokens: number = 256): Promise<string> {
  // Use OpenAI if key provided, otherwise fallback to OpenRouter DeepSeek
  if (!HAS_OPENAI_KEY) {
    try {
      // For OpenRouter, we need to format the messages into a single prompt
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
      return await getOpenRouterCompletion(prompt);
    } catch (e) {
      return 'AI service unavailable. Please try again later.';
    }
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      return `AI API error: ${response.statusText}`;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No answer from AI.';
  } catch (err) {
    return 'Failed to connect to AI service.';
  }
}

export async function getAICompletion(userMessage: string): Promise<string> {
  return getAIResponse([
    { role: 'system', content: 'You are a helpful AI career assistant for job seekers. Answer concisely and with actionable advice.' },
    { role: 'user', content: userMessage },
  ], 256);
}

// AI-powered job description processing
export async function processJobDescriptionWithAI(
  rawDescription: string,
  jobTitle: string,
  company: string
): Promise<ProcessedJobDescription> {
  try {
    const prompt = `Please analyze this job description and provide a comprehensive, readable summary. Extract ALL important information without filtering out details.

Job Title: ${jobTitle}
Company: ${company}
Raw Description: ${rawDescription}

Please provide your response in the following JSON format:
{
  "cleanDescription": "A clean, readable paragraph describing the role and responsibilities without code syntax or formatting issues",
  "qualifications": ["List ALL qualifications, skills, and preferred experience mentioned"],
  "requirements": ["List ALL requirements, education, certifications, and mandatory criteria"],
  "keyHighlights": ["3-5 key selling points about this role that would attract candidates"],
  "summary": "A 2-3 sentence compelling summary of the role"
}

Important guidelines:
- Include ALL qualifications and requirements, don't limit the number
- Make the description readable and professional
- Remove any code syntax, HTML tags, or formatting artifacts
- Preserve all important details about compensation, benefits, work arrangements
- If information is missing, don't make it up - just work with what's provided
- Focus on making it appealing and informative for job seekers`;

    const response = await getAIResponse([
      { role: 'system', content: 'You are an expert job description processor. Always respond with valid JSON in the exact format requested.' },
      { role: 'user', content: prompt },
    ], 1500);

    // Try to parse the JSON response
    try {
      const parsed = JSON.parse(response);

      // Validate the response has required fields
      if (parsed.cleanDescription && parsed.qualifications && parsed.requirements &&
          parsed.keyHighlights && parsed.summary) {
        return {
          cleanDescription: parsed.cleanDescription,
          qualifications: Array.isArray(parsed.qualifications) ? parsed.qualifications : [],
          requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
          keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : [],
          summary: parsed.summary
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', parseError);
    }

    // Fallback: if AI response isn't valid JSON, create a basic processed version
    return createFallbackProcessedDescription(rawDescription, jobTitle, company);

  } catch (error) {
    console.error('Error processing job description with AI:', error);
    return createFallbackProcessedDescription(rawDescription, jobTitle, company);
  }
}

// Fallback function for when AI processing fails
function createFallbackProcessedDescription(
  rawDescription: string,
  jobTitle: string,
  company: string
): ProcessedJobDescription {
  // Clean the description of common formatting issues
  const cleanDescription = rawDescription
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
    .replace(/\$\{[^}]*\}/g, '') // Remove template literals
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Basic extraction using the existing keyword approach
  const qualificationKeywords = [
    'skill', 'ability', 'knowledge', 'proficient', 'experience with', 'familiar with',
    'expertise in', 'understanding of', 'background in', 'passion for', 'love for',
    'competent in', 'strong', 'advanced', 'expert', 'specialized in', 'trained in',
    'capable of', 'qualified', 'proficiency', 'mastery', 'fluent in', 'competency'
  ];

  const requirementKeywords = [
    'degree', 'education', 'certification', 'years of experience', 'qualification',
    'required', 'must have', 'needed', 'essential', 'bachelor', 'master', 'phd',
    'mandatory', 'necessary', 'prerequisite', 'minimum', 'at least', 'preferred',
    'diploma', 'license', 'certificate', 'accreditation', 'graduate'
  ];

  const sentences = cleanDescription.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const qualifications: string[] = [];
  const requirements: string[] = [];

  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    const cleanSentence = sentence.trim();

    const isQualification = qualificationKeywords.some(keyword =>
      lowerSentence.includes(keyword)
    );
    const isRequirement = requirementKeywords.some(keyword =>
      lowerSentence.includes(keyword)
    );

    if (isQualification && !qualifications.includes(cleanSentence)) {
      qualifications.push(cleanSentence);
    }
    if (isRequirement && !requirements.includes(cleanSentence)) {
      requirements.push(cleanSentence);
    }
  });

  // Provide fallbacks if nothing was extracted
  if (qualifications.length === 0) {
    qualifications.push(
      'Excellent communication skills',
      'Strong problem-solving abilities',
      'Team collaboration experience',
      'Attention to detail'
    );
  }

  if (requirements.length === 0) {
    requirements.push(
      'Bachelor\'s degree or equivalent experience',
      'Relevant work experience',
      'Proficiency with industry-standard tools'
    );
  }

  return {
    cleanDescription: cleanDescription || `Join ${company} as a ${jobTitle}. This role offers an opportunity to work with a great team on exciting projects.`,
    qualifications,
    requirements,
    keyHighlights: [
      `Work as a ${jobTitle} at ${company}`,
      'Opportunity for professional growth',
      'Collaborative team environment'
    ],
    summary: `${company} is seeking a ${jobTitle} to join their team and contribute to exciting projects.`
  };
}
