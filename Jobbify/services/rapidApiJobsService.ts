import axios from 'axios';
import * as Private from '@/config/private';

const RAPIDAPI_KEY = Private.RAPIDAPI_KEY || process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'jsearch.p.rapidapi.com';

// Fetch job search results
// Strictly filters for jobs posted within the last week
export async function fetchJobSearch({ query, location, location_type = 'ANY', num_pages = 1 }: {
  query: string;
  location?: string;
  location_type?: string;
  num_pages?: number;
}) {
  // Corrected endpoint according to RapidAPI docs
  const url = 'https://jsearch.p.rapidapi.com/search';
  
  // Add cache busting and date filter parameter
  const cacheBuster = new Date().getTime();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Format date for API: YYYY-MM-DD
  const dateStr = oneWeekAgo.toISOString().split('T')[0];
  
  const params = {
    query,
    location: location || '',
    location_type,
    num_pages,
    date_posted: `${dateStr}`,  // Only get jobs posted since this date
    _cb: cacheBuster.toString(), // Cache busting
  };
  
  const response = await axios.get(url, {
    params,
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
  });
  
  // Apply additional filtering on the returned data
  if (response.data && response.data.data) {
    // Filter jobs to only include those with all required fields and from the past week
    response.data.data = response.data.data.filter((job: any) => {
      if (!job) return false;
      
      // Check posting date if available
      let isRecent = false;
      if (job.job_posted_at_datetime_utc) {
        const postDate = new Date(job.job_posted_at_datetime_utc);
        isRecent = !isNaN(postDate.getTime()) && postDate >= oneWeekAgo;
      }
      
      return isRecent;
    }).map((job: any) => {
      // Process each job through our normalizer which will further filter
      const normalizedJob = normalizeJob(job);
      return normalizedJob;
    }).filter((job: any) => job !== null); // Remove any null results from the normalizer
  }
  
  return response.data;
}

// Fetch job salary info
export async function fetchJobSalary({ jobTitle, location, yearsOfExperience = 0 }: {
  jobTitle: string;
  location?: string;
  yearsOfExperience?: number;
}) {
  const url = 'https://search.p.rapidapi.com/getdata/salary';
  const params = {
    jobTitle,
    location: location || '',
    years_of_experience: yearsOfExperience.toString(),
  };
  const response = await axios.get(url, {
    params,
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'search.p.rapidapi.com',
    },
  });
  return response.data;
}

// Helper to normalize job data for your app UI
export function normalizeJob(raw: any) {
  // Check if job has required fields
  const hasImage = Boolean(raw.employer_logo);
  const hasDescription = Boolean(raw.job_description && raw.job_description.trim().length > 0);
  const hasUrl = Boolean(raw.job_apply_link || raw.job_google_link || raw.apply_link);
  
  // Check for pay/salary information
  const hasPay = Boolean(raw.job_salary || raw.salary_min || raw.salary_max || raw.job_salary_period);
  
  // Check if we can extract qualifications and requirements
  const canExtractQualificationsRequirements = raw.job_highlights || 
    (raw.job_description && raw.job_description.length >= 50);
  
  // Only return jobs with all required fields
  if (!hasDescription || !hasUrl || !hasPay || !canExtractQualificationsRequirements) {
    return null;
  }
  
  // Extract qualifications and requirements from job_highlights or generate from description
  let qualifications: string[] = [];
  let requirements: string[] = [];
  
  if (raw.job_highlights) {
    // Use provided highlights if available
    qualifications = raw.job_highlights.qualifications || [];
    requirements = raw.job_highlights.requirements || [];
  } 
  
  // If no qualifications/requirements found, extract them from description
  if (qualifications.length === 0 || requirements.length === 0) {
    const description = raw.job_description || '';
    const sentences = description.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
    
    // Keywords for extraction
    const qualificationKeywords = [
      'skill', 'ability', 'knowledge', 'proficient', 'experience with', 'familiar with',
      'expertise in', 'understanding of', 'background in'
    ];
    
    const requirementKeywords = [
      'degree', 'education', 'certification', 'years of experience', 'qualification',
      'required', 'must have', 'needed', 'essential'
    ];
    
    // Process sentences to extract qualifications and requirements
    sentences.forEach((sentence: string) => {
      const lowerSentence = sentence.toLowerCase();
      const cleanSentence = sentence.trim().replace(/^\s*[-•*]\s*/, '');
      
      if (qualifications.length < 3 && 
          qualificationKeywords.some(kw => lowerSentence.includes(kw))) {
        qualifications.push(cleanSentence);
      }
      
      if (requirements.length < 3 && 
          requirementKeywords.some(kw => lowerSentence.includes(kw))) {
        requirements.push(cleanSentence);
      }
    });
  }
  
  // If still no qualifications/requirements, provide fallbacks
  if (qualifications.length === 0) {
    qualifications = ['Excellent communication skills', 'Team player', 'Problem-solving abilities'];
  }
  
  if (requirements.length === 0) {
    requirements = ['Bachelor\'s degree preferred', 'Previous relevant experience'];
  }

  // Format the pay data consistently
  const formattedPay = raw.job_salary || 
    (raw.salary_min && raw.salary_max ? 
      `$${raw.salary_min}-$${raw.salary_max}${raw.salary_currency ? ' ' + raw.salary_currency : ''}` : 
      'Competitive salary');
      
  return {
    id: raw.job_id || raw.id || '',
    title: raw.job_title || '',
    company: raw.employer_name || '',
    location: raw.job_location || raw.job_city || '',
    pay: formattedPay,
    image: raw.employer_logo || '',
    logo: raw.employer_logo || '',
    distance: '', // Not provided by API
    tags: raw.job_employment_types || (raw.job_employment_type ? [raw.job_employment_type] : []),
    description: raw.job_description || '',
    qualifications: qualifications,
    requirements: requirements,
    url: raw.job_apply_link || raw.job_google_link || raw.apply_link || '',
  };
}
