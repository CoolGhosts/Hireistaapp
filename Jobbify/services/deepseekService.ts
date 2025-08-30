import axios from 'axios';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-r1-0528:free';

// IMPORTANT: Never commit your API key to source control in production!
import * as Private from '@/config/private';
const OPENROUTER_API_KEY = Private.OPENROUTER_API_KEY || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
console.log('API Key Loaded:', OPENROUTER_API_KEY ? `Yes, length: ${OPENROUTER_API_KEY.length}` : 'No');

interface DeepSeekResult {
  content: string;
}

export interface JobDetails {
  company: string;
  position: string;
  contactPerson?: string;
  keyRequirements?: string;
  userSkills?: string;
  companyInfo?: string;
}

export interface CoverLetterOptions {
  tone: 'professional' | 'conversational' | 'enthusiastic';
  style: 'traditional' | 'modern' | 'creative';
  focus: 'experience' | 'skills' | 'culture-fit';
}

export async function getDeepSeekResumeFeedback(resumeText: string, siteUrl?: string, siteTitle?: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured. Please check your .env file.');
  }
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': Private.SITE_URL || process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost',
    'X-Title': Private.SITE_NAME || process.env.EXPO_PUBLIC_SITE_NAME || 'Jobbify',
  };
  if (siteUrl) headers['HTTP-Referer'] = siteUrl;
  if (siteTitle) headers['X-Title'] = siteTitle;

  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content:
`You are a professional resume advisor. Analyze the following resume and provide actionable, detailed feedback in strict JSON format.

Instructions:
- Always provide a resume score between 60 and 100 (never zero).
- Always provide at least 3 strengths and 3 areas to improve, as bullet points.
- Always check for missing sections (like Education, Work Experience, Skills, Contact Info).
- For each main section in the resume (Education, Work Experience, Skills, etc.), provide a score out of 10, a short feedback summary, and 1-2 suggestions.
- Suggest 2-3 job matches based on the resume, with title, company, match percentage, location, salary, and missing skills.
- If you are unsure, make your best guess based on the content.
- Respond ONLY with valid JSON in the following format:

{
  "overallScore": 85,
  "strengths": ["Well-organized format", "Strong technical skills", "Clear career progression"],
  "improvement": ["Add more quantifiable achievements", "Include a summary section", "Expand on leadership experience"],
  "missingSections": ["Certifications"],
  "sectionsFeedback": [
    {
      "name": "Education",
      "score": 8,
      "feedback": "Strong academic background.",
      "suggestions": ["Add GPA", "Include relevant coursework"]
    },
    {
      "name": "Work Experience",
      "score": 7,
      "feedback": "Good experience, but lacks quantifiable achievements.",
      "suggestions": ["Add metrics", "Expand on leadership roles"]
    }
  ],
  "jobMatches": [
    {
      "title": "Software Engineer",
      "company": "TechCorp",
      "matchPercentage": 92,
      "location": "Remote",
      "salary": "$100,000",
      "missingSkills": ["Docker"]
    }
  ]
}

Resume:\n${resumeText}`,
      },
    ],
    max_tokens: 2000, // Prevent 402 token limit errors
    temperature: 0.7
  };

  try {
    const response = await axios.post(API_URL, body, { headers, timeout: 180000 });
    if (!response.data?.choices) {
      console.error('Unexpected response format:', response.data);
      throw new Error('Failed to retrieve resume feedback');
    }
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your .env file.');
    }
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating resume feedback:', error);
    throw error;
  }
}

export async function generateAICoverLetter(
  jobDetails: JobDetails, 
  options: CoverLetterOptions, 
  resumeText?: string
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key is not configured. Please check your .env file.');
  }
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': Private.SITE_URL || process.env.EXPO_PUBLIC_SITE_URL || 'http://localhost',
    'X-Title': Private.SITE_NAME || process.env.EXPO_PUBLIC_SITE_NAME || 'Jobbify',
  };

  // Clean empty fields to avoid "undefined" text in prompt
  const cleanJobDetails = Object.entries(jobDetails).reduce((acc, [key, value]) => {
    if (value && value.trim() !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, string>);

  const prompt = `
You are a professional cover letter writer. Create a personalized cover letter for a job application 
with the following details:

Company: ${cleanJobDetails.company || '[Company name not provided]'}
Position: ${cleanJobDetails.position || '[Position not provided]'}
${cleanJobDetails.contactPerson ? `Contact Person: ${cleanJobDetails.contactPerson}` : ''}
${cleanJobDetails.keyRequirements ? `Key Requirements: ${cleanJobDetails.keyRequirements}` : ''}
${cleanJobDetails.userSkills ? `Applicant Skills: ${cleanJobDetails.userSkills}` : ''}
${cleanJobDetails.companyInfo ? `Company Information: ${cleanJobDetails.companyInfo}` : ''}

Instructions:
- Tone: ${options.tone} (${getToneDescription(options.tone)})
- Style: ${options.style} (${getStyleDescription(options.style)})
- Focus on: ${options.focus} (${getFocusDescription(options.focus)})
${resumeText ? '- Use relevant details from the attached resume to personalize the letter' : ''}

The cover letter should:
1. Have a professional greeting (using the contact person's name if provided)
2. Include a compelling introduction that grabs attention
3. Highlight the applicant's relevant skills and experience that match the job requirements
4. Explain why they are interested in the company and position specifically
5. End with a strong call to action and professional closing
6. Be concise (around 300-400 words)
7. Be ready to use with minimal editing

${resumeText ? `\nResume for reference:\n${resumeText}` : ''}
`;

  const body = {
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 800, // Limit tokens for cover letters
    temperature: 0.8
  };

  try {
    const response = await axios.post(API_URL, body, { headers, timeout: 180000 });
    if (!response.data?.choices) {
      console.error('Unexpected response format:', response.data);
      throw new Error('Failed to generate cover letter');
    }
    if (response.status === 401) {
      throw new Error('Invalid API key. Please check your .env file.');
    }
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating cover letter:', error);
    return "I'm sorry, I couldn't generate a cover letter at this time. Please try again later.";
  }
}

// Helper functions for describing tone, style, and focus options
function getToneDescription(tone: string): string {
  switch(tone) {
    case 'professional': return 'formal, business-appropriate language';
    case 'conversational': return 'friendly but still professional tone';
    case 'enthusiastic': return 'energetic and passionate language';
    default: return 'professional tone';
  }
}

function getStyleDescription(style: string): string {
  switch(style) {
    case 'traditional': return 'standard business letter format';
    case 'modern': return 'contemporary, straightforward approach';
    case 'creative': return 'unique style that showcases personality';
    default: return 'standard format';
  }
}

function getFocusDescription(focus: string): string {
  switch(focus) {
    case 'experience': return 'highlighting relevant work history and achievements';
    case 'skills': return 'emphasizing specific abilities and competencies';
    case 'culture-fit': return 'demonstrating alignment with company values and culture';
    default: return 'balanced approach';
  }
}
