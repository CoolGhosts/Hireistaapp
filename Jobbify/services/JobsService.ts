import { Job } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import { processJobDescriptionWithAI, ProcessedJobDescription } from './aiAssistantService';
import { fetchJobs as fetchJobsFromAPI } from './remoteOkService';
import {
  cacheJobsInSupabase,
  getCachedJobs,
  getJobsForUser,
  hasFreshJobs,
  cleanupExpiredJobs
} from './supabaseJobCacheService';

interface ApiJob {
  job_title: string;
  company_name: string;
  job_location: string;
  job_description: string;
  job_salary_range?: string;
  job_id: string;
  job_posted_date?: string;
  job_apply_link?: string;
  job_category?: string;
  job_type?: string;
  job_employment_type?: string;
}

// RemoteOK API (prioritized)
const REMOTEOK_API_URL = 'https://remoteok.io/api';

// Fallback RapidAPI
const API_HOST = 'active-jobs-db.p.rapidapi.com';
import * as Private from '@/config/private';
const API_KEY = Private.RAPIDAPI_KEY || Constants.expoConfig?.extra?.RAPIDAPI_KEY || '';
const API_URL = 'https://active-jobs-db.p.rapidapi.com/active-ats-expired';

// Note: Ashby integration removed - focusing on RemoteOK API, external APIs and database jobs

/**
 * Fetch jobs from RemoteOK API (prioritized source)
 */
const fetchJobsFromRemoteOK = async (): Promise<Job[]> => {
  try {
    console.log('Fetching jobs from RemoteOK API...');

    const response = await fetch(REMOTEOK_API_URL, {
      headers: {
        'User-Agent': 'Jobbify-App/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`RemoteOK API failed with status ${response.status}`);
      return [];
    }

    const data = await response.json();

    // RemoteOK returns an array where first item is metadata, rest are jobs
    const jobs = data.slice(1);

    if (!jobs || jobs.length === 0) {
      console.log('No jobs returned from RemoteOK API');
      return [];
    }

    console.log(`Fetched ${jobs.length} jobs from RemoteOK`);

    // Filter for recent jobs (last 30 days) and process with AI
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobs = jobs.filter((job: any) => {
      if (!job.date) return true; // Include jobs without date
      const jobDate = new Date(job.date);
      return jobDate >= thirtyDaysAgo;
    });

    console.log(`Filtered to ${recentJobs.length} recent jobs from RemoteOK`);

    // Process jobs with AI enhancement
    const processedJobs = await Promise.all(
      recentJobs.slice(0, 20).map(async (remoteJob: any) => { // Limit to 20 jobs for performance
        try {
          // Use company logo if available, otherwise generate Clearbit URL
          let companyLogo = '';
          if (remoteJob.company_logo && remoteJob.company_logo.trim() !== '') {
            companyLogo = remoteJob.company_logo;
          } else {
            const companyName = remoteJob.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
            companyLogo = `https://logo.clearbit.com/${companyName}.com?size=300`;
          }

          // Format salary
          let salary = 'Competitive salary';
          if (remoteJob.salary) {
            salary = remoteJob.salary;
          } else if (remoteJob.salary_min && remoteJob.salary_max) {
            salary = `$${remoteJob.salary_min.toLocaleString()} - $${remoteJob.salary_max.toLocaleString()}`;
          } else if (remoteJob.salary_min) {
            salary = `$${remoteJob.salary_min.toLocaleString()}+`;
          }

          // Process description with AI
          let processedDescription;
          try {
            processedDescription = await processJobDescriptionWithAI(
              remoteJob.description || '',
              remoteJob.position,
              remoteJob.company
            );
          } catch (error) {
            console.warn(`AI processing failed for RemoteOK job ${remoteJob.position}, using fallback`);
            processedDescription = {
              cleanDescription: cleanDescriptionManually(remoteJob.description || ''),
              qualifications: extractQualificationsFromTags(remoteJob.tags || [], remoteJob.position),
              requirements: extractRequirementsFromDescription(remoteJob.description || '', remoteJob.position),
              keyHighlights: [`Remote ${remoteJob.position} at ${remoteJob.company}`, 'Fully remote work', 'Competitive compensation'],
              summary: `${remoteJob.company} is seeking a ${remoteJob.position} for a fully remote position.`
            };
          }

          return {
            id: `remoteok-${remoteJob.id}`,
            title: remoteJob.position,
            company: remoteJob.company,
            location: remoteJob.location || 'Remote',
            pay: salary,
            image: companyLogo,
            logo: companyLogo,
            distance: 'Remote',
            tags: [...(remoteJob.tags || []).slice(0, 5), 'Remote'], // Include top tags + Remote
            description: processedDescription.cleanDescription,
            qualifications: processedDescription.qualifications,
            requirements: processedDescription.requirements,
            url: remoteJob.apply_url || remoteJob.url || `https://remoteok.io/remote-jobs/${remoteJob.slug}`,
            postedDate: remoteJob.date ? new Date(remoteJob.date).toISOString() : new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error processing RemoteOK job ${remoteJob.position}:`, error);
          return null;
        }
      })
    );

    // Filter out null results and prioritize by logo availability
    const validJobs = processedJobs.filter((job): job is Job => job !== null);
    const prioritizedJobs = await prioritizeJobsWithLogos(validJobs);

    console.log(`Successfully processed ${prioritizedJobs.length} jobs from RemoteOK`);
    return prioritizedJobs;

  } catch (error) {
    console.error('Error fetching jobs from RemoteOK:', error);
    return [];
  }
};

/**
 * Fetch real jobs from the Supabase database
 */
const fetchJobsFromDatabase = async (): Promise<Job[]> => {
  try {
    console.log('🚀 [JOBSERVICE] DISABLED: Skipping database jobs to force fresh API calls...');
    return []; // Force API usage by returning empty

    console.log('Fetching jobs from Supabase database...');

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .limit(50)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs from database:', error);
      return [];
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs found in database');
      return [];
    }

    // Convert database jobs to our Job interface with proper logo URLs
    const convertedJobs: Job[] = jobs.map(job => {
      // Generate proper logo URL for database jobs
      const companyName = (job.company || 'Unknown Company').toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      const companyLogo = `https://logo.clearbit.com/${companyName}.com?size=300`;

      return {
        id: job.id, // Use the real UUID from database
        title: job.title || 'Unknown Job',
        company: job.company || 'Unknown Company',
        location: job.location || 'Remote',
        pay: job.salary || 'Competitive',
        image: job.logo || companyLogo,
        logo: job.logo || companyLogo,
        distance: '2 km', // Default distance
        tags: job.requirements || ['Remote', 'Full-time'],
        description: job.description || 'No description available',
        qualifications: job.qualifications || ['Experience required'],
        requirements: job.requirements || ['Bachelor\'s degree preferred'],
        url: job.url || '',
        postedDate: job.created_at
      };
    });

    console.log(`Successfully converted ${convertedJobs.length} jobs from database`);

    // Prioritize database jobs with original logos
    const prioritizedJobs = await prioritizeJobsWithLogos(convertedJobs);
    return prioritizedJobs;
  } catch (error) {
    console.error('Exception fetching jobs from database:', error);
    return [];
  }
};

// Fallback mock data for when the API is unavailable
// NOTE: These mock jobs should NOT be used for applications as they don't exist in the database
// They are only for display purposes when no real jobs are available
const mockJobs: Job[] = [
  {
    id: 'mock-job-1', // Use mock prefix to prevent confusion with real job IDs
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    pay: '$120K - $150K',
    image: 'https://logo.clearbit.com/techcorp.com?size=300',
    logo: 'https://logo.clearbit.com/techcorp.com?size=300',
    distance: '2 km',
    tags: ['JavaScript', 'React', 'TypeScript'],
    description: 'Join our dynamic team as a Senior Frontend Developer! We\'re building next-generation web applications using cutting-edge technologies. You\'ll work with React, TypeScript, and modern development tools while collaborating with talented designers and backend engineers. This role offers excellent growth opportunities, competitive compensation, and the chance to make a real impact on our products used by millions of users.',
    qualifications: ['5+ years in frontend development', 'Strong React and TypeScript skills', 'Experience with modern build tools', 'Knowledge of responsive design principles', 'Familiarity with testing frameworks', 'Understanding of web performance optimization'],
    requirements: ['Bachelor\'s degree in Computer Science or related field', 'Previous startup or fast-paced environment experience', 'Strong portfolio of web applications', 'Excellent problem-solving skills']
  },
  {
    id: 'mock-job-2',
    title: 'UX Designer',
    company: 'DesignHub',
    location: 'New York, NY',
    pay: '$90K - $120K',
    image: 'https://logo.clearbit.com/designhub.com?size=300',
    logo: 'https://logo.clearbit.com/designhub.com?size=300',
    distance: '3 km',
    tags: ['UI/UX', 'Figma', 'Design'],
    description: 'Create exceptional user experiences that delight our clients and their customers. As a UX Designer at DesignHub, you\'ll lead design projects from research to final implementation, working closely with product managers and developers. You\'ll conduct user research, create wireframes and prototypes, and ensure our designs are both beautiful and functional. This role offers the opportunity to work on diverse projects across various industries.',
    qualifications: ['3+ years of UX design experience', 'Strong portfolio showcasing design process', 'Proficiency with Figma, Sketch, or Adobe XD', 'Experience with user research methods', 'Understanding of design systems', 'Excellent visual design skills'],
    requirements: ['Bachelor\'s degree in Design, HCI, or related field', 'Portfolio demonstrating UX design process', 'Experience with design thinking methodologies', 'Strong communication and presentation skills']
  },
  {
    id: 'mock-job-3',
    title: 'Data Scientist',
    company: 'DataFlow',
    location: 'Austin, TX',
    pay: '$100K - $130K',
    image: 'https://logo.clearbit.com/dataflow.com?size=300',
    logo: 'https://logo.clearbit.com/dataflow.com?size=300',
    distance: '8 km',
    tags: ['Python', 'Machine Learning', 'SQL'],
    description: 'Transform data into actionable insights as a Data Scientist at DataFlow! You\'ll work with large datasets to build predictive models, create data visualizations, and drive business decisions through analytics. Our team uses cutting-edge machine learning techniques and cloud technologies to solve complex problems. This role offers the opportunity to work on diverse projects spanning customer analytics, product optimization, and business intelligence.',
    qualifications: ['3+ years of data science experience', 'Strong Python and SQL skills', 'Experience with machine learning frameworks', 'Knowledge of statistical analysis', 'Data visualization expertise', 'Experience with cloud platforms (AWS/GCP/Azure)'],
    requirements: ['Master\'s degree in Data Science, Statistics, or related field', 'Experience with Python, R, or similar languages', 'Knowledge of machine learning algorithms', 'Strong analytical and problem-solving skills']
  },
  {
    id: 'mock-job-4',
    title: 'Mobile Developer',
    company: 'AppWorks',
    location: 'Chicago, IL',
    pay: '$95K - $125K',
    image: 'https://logo.clearbit.com/appworks.com?size=300',
    logo: 'https://logo.clearbit.com/appworks.com?size=300',
    distance: '2 km',
    tags: ['Swift', 'Kotlin', 'Mobile'],
    description: 'We need a skilled mobile developer to work on our cross-platform applications.',
    qualifications: ['3+ years in mobile development', 'Experience with Swift and Kotlin', 'Knowledge of mobile UI design'],
    requirements: ['Bachelors degree in CS or related', 'Familiarity with native mobile development']
  },
  {
    id: 'mock-job-5',
    title: 'DevOps Engineer',
    company: 'CloudNine',
    location: 'Seattle, WA',
    pay: '$130K - $160K',
    image: 'https://logo.clearbit.com/cloudnine.com?size=300',
    logo: 'https://logo.clearbit.com/cloudnine.com?size=300',
    distance: '5 km',
    tags: ['AWS', 'Docker', 'Kubernetes'],
    description: 'Join our team to build and maintain our cloud infrastructure and deployment pipeline.',
    qualifications: ['Experience with AWS services', 'Strong Docker and Kubernetes knowledge', 'CI/CD pipeline setup'],
    requirements: ['Bachelors degree', 'AWS certifications a plus']
  }
];

/**
 * Fetch jobs from multiple sources with priority order
 * Priority: 1. Fresh jobs from job API, 2. RemoteOK API, 3. Database jobs, 4. External API, 5. Mock data
 * Uses AI processing to ensure high-quality, readable job descriptions
 * Prioritizes fresh API jobs for better variety and up-to-date listings
 */
export const fetchJobs = async (page = 1, limit = 20): Promise<Job[]> => {
  try {
    console.log('🔥 UPDATED LOGIC [31:50]: Fetching fresh jobs from API first...');

    // FORCE API USAGE: Always try to get fresh jobs from our job API first
    console.log('🔥 FORCING API CALL: Trying to fetch fresh jobs from job API...');
    try {
      const apiJobs = await fetchJobsFromAPI();
      console.log(`🔥 API RESPONSE: Got ${apiJobs?.length || 0} jobs from API`);
      if (apiJobs && apiJobs.length > 0) {
        console.log(`🔥 SUCCESS: Using ${apiJobs.length} fresh jobs from job API`);
        return apiJobs;
      }
      console.log('🔥 API returned no jobs, trying fallbacks...');
    } catch (apiError) {
      console.log('🔥 API ERROR:', apiError);
    }

    console.log('No fresh jobs from API, trying RemoteOK API...');

    // Second, try RemoteOK API (prioritized for better logos and quality)
    const remoteOKJobs = await fetchJobsFromRemoteOK();
    if (remoteOKJobs.length > 0) {
      console.log(`Using ${remoteOKJobs.length} jobs from RemoteOK API`);
      return remoteOKJobs;
    }

    console.log('No jobs from RemoteOK, trying database jobs...');

    // Third, try to get jobs from our database as fallback
    const databaseJobs = await fetchJobsFromDatabase();
    if (databaseJobs.length > 0) {
      console.log(`Using ${databaseJobs.length} jobs from database`);
      return databaseJobs;
    }

    console.log('No jobs in database, trying external API...');

    // Add cache-busting parameter to ensure fresh data on each request
    const cacheBuster = new Date().getTime();

    const options = {
      method: 'GET',
      headers: {
        'x-rapidapi-host': API_HOST,
        'x-rapidapi-key': API_KEY,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    };

    const response = await fetch(`${API_URL}?page=${page}&limit=${limit}&_cb=${cacheBuster}`, options);

    if (!response.ok) {
      if (response.status === 401) {
        console.log('API authentication failed, using filtered mock data');
        // Use time-filtered mock data instead
        const weekAgoMockJobs = await filterMostRecentJobsFromMockData(mockJobs);
        return weekAgoMockJobs;
      } else {
        console.error(`API request failed with status ${response.status}`);
        // Fall back to database jobs even if empty, then mock data
        return databaseJobs.length > 0 ? databaseJobs : await filterMostRecentJobsFromMockData(mockJobs);
      }
    }

    const data = await response.json();
    const apiJobs = await mapApiJobsToAppJobs(data);

    // If API returns jobs, use them, otherwise fall back to database or mock data
    if (apiJobs.length > 0) {
      console.log(`Using ${apiJobs.length} jobs from external API`);
      return apiJobs;
    } else {
      console.log('No valid jobs from API, falling back to database or mock data');
      return databaseJobs.length > 0 ? databaseJobs : await filterMostRecentJobsFromMockData(mockJobs);
    }
  } catch (error) {
    console.error('Error fetching jobs:', error);

    // Final fallback: try database jobs, then mock data
    try {
      const databaseJobs = await fetchJobsFromDatabase();
      if (databaseJobs.length > 0) {
        console.log('Using database jobs as error fallback');
        return databaseJobs;
      }
    } catch (dbError) {
      console.error('Database fallback also failed:', dbError);
    }

    console.log('Using mock data as final fallback');
    return await filterMostRecentJobsFromMockData(mockJobs);
  }
};

/**
 * Fetch jobs with Supabase caching - new optimized version
 */
export const fetchJobsWithCaching = async (page = 1, limit = 20, forceRefresh = false): Promise<Job[]> => {
  try {
    console.log('🔥 SUPABASE CACHING: Fetching jobs with intelligent caching...');

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      await cleanupExpiredJobs();
    }

    // Check if we have fresh cached jobs (unless force refresh)
    if (!forceRefresh) {
      const hasFreshRemoteOK = await hasFreshJobs('remoteok', 2);
      const hasFreshAPI = await hasFreshJobs('job-api', 2);

      if (hasFreshRemoteOK || hasFreshAPI) {
        console.log('Using fresh cached jobs');
        const cachedJobs = await getCachedJobs(undefined, limit, (page - 1) * limit);
        if (cachedJobs.length > 0) {
          return cachedJobs;
        }
      }
    }

    console.log('Fetching fresh jobs from APIs...');

    // Try to get fresh jobs from our job API
    const freshJobs = await fetchJobsFromAPI();
    if (freshJobs.length > 0) {
      console.log(`Caching ${freshJobs.length} fresh jobs from job API`);
      await cacheJobsInSupabase(freshJobs, 'job-api', 24);
      return freshJobs.slice(0, limit);
    }

    // Try RemoteOK API
    const remoteOKJobs = await fetchJobsFromRemoteOK();
    if (remoteOKJobs.length > 0) {
      console.log(`Caching ${remoteOKJobs.length} jobs from RemoteOK API`);
      await cacheJobsInSupabase(remoteOKJobs, 'remoteok', 24);
      return remoteOKJobs.slice(0, limit);
    }

    // Fallback to any cached jobs (even older ones)
    console.log('Using any available cached jobs as fallback...');
    const fallbackCachedJobs = await getCachedJobs(undefined, limit, (page - 1) * limit);
    if (fallbackCachedJobs.length > 0) {
      return fallbackCachedJobs;
    }

    // Final fallback to mock data
    console.log('Using mock data as final fallback');
    const mockJobsFiltered = await filterMostRecentJobsFromMockData(mockJobs);
    await cacheJobsInSupabase(mockJobsFiltered, 'mock-data', 1); // Cache for 1 hour
    return mockJobsFiltered.slice(0, limit);

  } catch (error) {
    console.error('Error fetching jobs:', error);

    // Error fallback: try cached jobs
    try {
      const cachedJobs = await getCachedJobs(undefined, limit, (page - 1) * limit);
      if (cachedJobs.length > 0) {
        console.log('Using cached jobs as error fallback');
        return cachedJobs;
      }
    } catch (cacheError) {
      console.error('Cache fallback also failed:', cacheError);
    }

    // Final error fallback: mock data
    console.log('Using mock data as error fallback');
    return await filterMostRecentJobsFromMockData(mockJobs);
  }
};

/**
 * Get jobs for a specific user with personalization
 * Works for both authenticated users and guests
 */
export const fetchJobsForUser = async (userId?: string, limit = 20, excludeSwipedJobs = true): Promise<Job[]> => {
  try {
    if (userId) {
      console.log(`[JOBS] Fetching personalized jobs for user ${userId}`);
    } else {
      console.log('[JOBS] Fetching general jobs for guest user');
    }

    console.log('[JOBS] Calling getJobsForUser...');
    // Use the Supabase service to get jobs for the user (or general jobs for guests)
    let timedOut = false;
    const timeoutMs = 8000; // 8s safety timeout to avoid hanging the UI
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        timedOut = true;
        reject(new Error(`[JOBS] getJobsForUser timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    );

    let jobs: Job[] = [];
    try {
      jobs = await Promise.race([
        getJobsForUser(userId, limit, excludeSwipedJobs),
        timeoutPromise,
      ]) as Job[];
      console.log(`[JOBS] getJobsForUser returned ${jobs.length} jobs`);
    } catch (e) {
      console.warn('[JOBS] getJobsForUser failed or timed out:', (e as Error)?.message || e);
    }

    if (!timedOut && jobs.length > 0) {
      console.log('[JOBS] Using jobs from getJobsForUser');
      return jobs;
    }

    console.log('[JOBS] No jobs from getJobsForUser, trying getCachedJobs...');
    // Fallback to general cached jobs
    const cachedJobs = await getCachedJobs(undefined, limit);
    console.log(`[JOBS] getCachedJobs returned ${cachedJobs.length} jobs`);
    if (cachedJobs.length > 0) return cachedJobs;

    console.log('[JOBS] Cached jobs empty, falling back to fetchJobsWithCaching...');
    return await fetchJobsWithCaching(1, limit);
  } catch (error) {
    console.error('[JOBS] Error fetching jobs for user:', error);
    console.log('[JOBS] Falling back to fetchJobsWithCaching...');
    // Fallback to general job fetching
    return await fetchJobsWithCaching(1, limit);
  }
};

/**
 * Filter mock data to only show jobs from the past week and prioritize by logo availability
 */
const filterMostRecentJobsFromMockData = async (jobs: Job[]): Promise<Job[]> => {
  // Calculate date from one week ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Generate random recent dates for mock data
  // In real data, we'd use the actual job posting date
  const jobsWithDates = jobs.map(job => {
    // Create a random date between now and a week ago
    const daysAgo = Math.floor(Math.random() * 7);
    const randomRecentDate = new Date();
    randomRecentDate.setDate(randomRecentDate.getDate() - daysAgo);

    // Add posting date to the job
    return {
      ...job,
      postedDate: randomRecentDate.toISOString()
    };
  });

  // Prioritize mock jobs with logos (though mock jobs should have logos)
  const prioritizedJobs = await prioritizeJobsWithLogos(jobsWithDates);
  return prioritizedJobs;
};

/**
 * Map API response to our app's Job interface with AI-enhanced processing
 * Strictly filters jobs to meet ALL criteria:
 * 1. Has picture/logo, job URL, description, pay range, qualifications, requirements
 * 2. Posted within the last week
 * 3. Uses AI to process job descriptions for better quality and readability
 */
const mapApiJobsToAppJobs = async (apiResponse: any): Promise<Job[]> => {
  if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data)) {
    return [];
  }
  
  // Calculate date from one week ago
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Filter out jobs without essential fields (less strict to preserve more jobs)
  const validJobs = apiResponse.data.filter((apiJob: ApiJob) => {
    // Essential: Must have title and company
    const hasTitle = apiJob.job_title && apiJob.job_title.trim().length > 0;
    const hasCompany = apiJob.company_name && apiJob.company_name.trim().length > 0;

    // Essential: Must have some description (even if short)
    const hasDescription = apiJob.job_description && apiJob.job_description.trim().length > 10;

    // Optional: Job URL (we'll provide fallback if missing)
    const hasJobUrl = apiJob.job_apply_link && apiJob.job_apply_link.trim().length > 0;

    // Optional: Pay range (we'll provide fallback if missing)
    const hasPayRange = apiJob.job_salary_range && apiJob.job_salary_range.trim().length > 0;

    // Optional: Posting date (we'll use current date if missing)
    let isRecent = true; // Default to true to be less strict
    if (apiJob.job_posted_date) {
      const postDate = new Date(apiJob.job_posted_date);
      isRecent = !isNaN(postDate.getTime()) && postDate >= oneWeekAgo;
    }

    // Job must meet essential criteria only
    return hasTitle && hasCompany && hasDescription;
  });
  
  // Process jobs with AI enhancement and robust fallbacks
  const processedJobs = await Promise.all(validJobs.map(async (apiJob: ApiJob) => {
    // Extract salary range with better fallbacks
    let pay = 'Competitive salary';
    if (apiJob.job_salary_range && apiJob.job_salary_range.trim().length > 0) {
      pay = apiJob.job_salary_range;
    } else {
      // Try to extract salary from description
      const description = apiJob.job_description || '';
      const salaryMatch = description.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per|\/)\s*(?:year|hour|month))?/i);
      if (salaryMatch) {
        pay = salaryMatch[0];
      }
    }

    // Generate smarter tags based on job title and description
    const possibleTags = ['Remote', 'Full-time', 'Part-time', 'Contract', 'JavaScript', 'React',
      'Python', 'UI/UX', 'Data Science', 'Marketing', 'Sales', 'Engineering', 'Design'];
    const randomTags: string[] = [];

    // Add job-specific tags based on title
    const jobTitle = apiJob.job_title.toLowerCase();
    if (jobTitle.includes('remote')) randomTags.push('Remote');
    if (jobTitle.includes('full') || jobTitle.includes('time')) randomTags.push('Full-time');
    if (jobTitle.includes('part')) randomTags.push('Part-time');
    if (jobTitle.includes('contract')) randomTags.push('Contract');

    // Add technology tags based on title/description
    const content = (apiJob.job_title + ' ' + apiJob.job_description).toLowerCase();
    if (content.includes('javascript') || content.includes('js')) randomTags.push('JavaScript');
    if (content.includes('react')) randomTags.push('React');
    if (content.includes('python')) randomTags.push('Python');
    if (content.includes('design') || content.includes('ui') || content.includes('ux')) randomTags.push('UI/UX');

    // Add random tags if we don't have enough
    while (randomTags.length < 3) {
      const randomTag = possibleTags[Math.floor(Math.random() * possibleTags.length)];
      if (!randomTags.includes(randomTag)) {
        randomTags.push(randomTag);
      }
    }

    // Add type/category as tag if available
    if (apiJob.job_category) randomTags.push(apiJob.job_category);
    if (apiJob.job_type) randomTags.push(apiJob.job_type);

    // Random distance for UI display
    const distance = `${Math.floor(Math.random() * 20) + 1} km`;

    // Extract company name properly for logo generation
    let rawCompanyName = 'Unknown Company';
    if (typeof apiJob.company_name === 'string') {
      rawCompanyName = apiJob.company_name;
    } else if (apiJob.company_name && typeof apiJob.company_name === 'object') {
      // Handle Adzuna API response format
      rawCompanyName = apiJob.company_name.display_name || apiJob.company_name.name || 'Unknown Company';
    }

    // Generate company logo URL using Clearbit API
    const cleanCompanyName = rawCompanyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const companyLogo = `https://logo.clearbit.com/${cleanCompanyName}.com?size=300`;

    // Fallback images for when Clearbit doesn't have the logo
    const fallbackImages = [
      'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=688&q=80',
      'https://images.unsplash.com/photo-1573496799652-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1169&q=80',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
      'https://images.unsplash.com/photo-1573497161161-c3e73707e25c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
    ];
    const fallbackImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];

    // Process job description with AI for better quality and readability
    console.log(`Processing job: ${apiJob.job_title} at ${apiJob.company_name} with AI...`);

    let processedDescription;
    try {
      processedDescription = await processJobDescriptionWithAI(
        apiJob.job_description || '',
        apiJob.job_title,
        apiJob.company_name
      );
    } catch (error) {
      console.warn(`AI processing failed for job ${apiJob.job_title}, using fallback:`, error);
      // Fallback to manual processing if AI fails
      processedDescription = {
        cleanDescription: cleanDescriptionManually(apiJob.job_description || ''),
        qualifications: extractQualificationsManually(apiJob.job_description || '', apiJob.job_title),
        requirements: extractRequirementsManually(apiJob.job_description || '', apiJob.job_title),
        keyHighlights: [`Work as ${apiJob.job_title} at ${apiJob.company_name}`, 'Competitive compensation', 'Growth opportunities'],
        summary: `${apiJob.company_name} is seeking a ${apiJob.job_title} to join their team.`
      };
    }
    
    // Use the already extracted company name from logo generation
    const companyName = rawCompanyName;

    return {
      id: apiJob.job_id,
      title: apiJob.job_title,
      company: companyName, // Use extracted string company name
      location: apiJob.job_location || 'Location not specified',
      pay,
      image: companyLogo, // Use company logo as primary image
      logo: companyLogo, // Use company logo
      distance,
      tags: [...new Set(randomTags)], // Remove any duplicates
      description: processedDescription.cleanDescription, // Use AI-processed clean description
      qualifications: processedDescription.qualifications, // Use AI-extracted qualifications
      requirements: processedDescription.requirements, // Use AI-extracted requirements
      url: apiJob.job_apply_link || '#', // Provide fallback URL
      postedDate: apiJob.job_posted_date ? new Date(apiJob.job_posted_date).toISOString() : new Date().toISOString()
    };
  }));

  // Sort jobs to prioritize those with original logos
  const sortedJobs = await prioritizeJobsWithLogos(processedJobs);
  return sortedJobs;
};

// Well-known companies that definitely have logos on Clearbit
const COMPANIES_WITH_LOGOS = new Set([
  'google', 'microsoft', 'apple', 'amazon', 'facebook', 'meta', 'netflix', 'uber', 'airbnb',
  'spotify', 'twitter', 'linkedin', 'github', 'slack', 'zoom', 'salesforce', 'adobe',
  'intel', 'nvidia', 'tesla', 'paypal', 'stripe', 'shopify', 'dropbox', 'atlassian',
  'oracle', 'ibm', 'cisco', 'vmware', 'mongodb', 'redis', 'docker', 'kubernetes',
  'techcorp', 'designhub', 'dataflow', 'appworks', 'cloudnine' // Our mock companies
]);

// Function to check if a company logo exists via Clearbit API
async function checkLogoExists(logoUrl: string, companyName: string): Promise<boolean> {
  try {
    // Quick check for well-known companies
    const cleanCompanyName = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    if (COMPANIES_WITH_LOGOS.has(cleanCompanyName)) {
      return true;
    }

    // For unknown companies, do a quick HEAD request
    const response = await fetch(logoUrl, { method: 'HEAD' });
    return response.ok && response.status === 200;
  } catch (error) {
    return false;
  }
}

// Function to prioritize jobs with original logos
async function prioritizeJobsWithLogos(jobs: Job[]): Promise<Job[]> {
  console.log('Checking logo availability for job prioritization...');

  // Check logo availability for each job (with timeout to avoid delays)
  const jobsWithLogoStatus = await Promise.all(
    jobs.map(async (job) => {
      try {
        // Set a timeout for logo checking to avoid long delays
        const logoCheckPromise = checkLogoExists(job.logo, job.company);
        const timeoutPromise = new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 1500) // 1.5 second timeout (reduced for better performance)
        );

        const hasOriginalLogo = await Promise.race([logoCheckPromise, timeoutPromise]);

        return {
          ...job,
          hasOriginalLogo,
          logoScore: hasOriginalLogo ? 1 : 0
        };
      } catch (error) {
        console.warn(`Logo check failed for ${job.company}:`, error);
        return {
          ...job,
          hasOriginalLogo: false,
          logoScore: 0
        };
      }
    })
  );

  // Sort jobs: Original logos first, then by posting date
  const sortedJobs = jobsWithLogoStatus.sort((a, b) => {
    // Primary sort: Jobs with original logos first
    if (a.logoScore !== b.logoScore) {
      return b.logoScore - a.logoScore; // Higher score (original logo) first
    }

    // Secondary sort: More recent jobs first
    const dateA = new Date(a.postedDate || 0).getTime();
    const dateB = new Date(b.postedDate || 0).getTime();
    return dateB - dateA;
  });

  // Remove the temporary logoScore property
  const finalJobs = sortedJobs.map(({ logoScore, hasOriginalLogo, ...job }) => job);

  const jobsWithLogos = sortedJobs.filter(job => job.hasOriginalLogo).length;
  console.log(`Prioritized ${jobsWithLogos} jobs with original logos out of ${jobs.length} total jobs`);

  return finalJobs;
}

// Manual processing fallback functions
function cleanDescriptionManually(description: string): string {
  return description
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
    .replace(/\$\{[^}]*\}/g, '') // Remove template literals
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function extractQualificationsManually(description: string, jobTitle: string): string[] {
  const qualifications = [];
  const content = description.toLowerCase();

  // Basic skill extraction
  if (content.includes('javascript') || content.includes('js')) qualifications.push('JavaScript experience');
  if (content.includes('react')) qualifications.push('React framework knowledge');
  if (content.includes('python')) qualifications.push('Python programming skills');
  if (content.includes('communication')) qualifications.push('Excellent communication skills');
  if (content.includes('team') || content.includes('collaboration')) qualifications.push('Team collaboration experience');
  if (content.includes('problem') || content.includes('solving')) qualifications.push('Strong problem-solving abilities');

  // Job-specific qualifications
  if (jobTitle.toLowerCase().includes('senior')) qualifications.push('Senior-level experience required');
  if (jobTitle.toLowerCase().includes('developer') || jobTitle.toLowerCase().includes('engineer')) {
    qualifications.push('Software development experience');
    qualifications.push('Technical problem-solving skills');
  }

  // Fallback qualifications
  if (qualifications.length === 0) {
    qualifications.push('Relevant experience in the field');
    qualifications.push('Strong analytical skills');
    qualifications.push('Excellent communication abilities');
  }

  return qualifications.slice(0, 8); // Limit to 8 qualifications
}

function extractRequirementsManually(description: string, jobTitle: string): string[] {
  const requirements = [];
  const content = description.toLowerCase();

  // Basic requirement extraction
  if (content.includes('degree') || content.includes('bachelor') || content.includes('education')) {
    requirements.push('Bachelor\'s degree or equivalent experience');
  }
  if (content.includes('years') && content.includes('experience')) {
    const yearMatch = content.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/);
    if (yearMatch) {
      requirements.push(`${yearMatch[1]}+ years of relevant experience`);
    } else {
      requirements.push('Previous relevant experience required');
    }
  }

  // Job-specific requirements
  if (jobTitle.toLowerCase().includes('developer') || jobTitle.toLowerCase().includes('engineer')) {
    requirements.push('Programming experience required');
  }
  if (jobTitle.toLowerCase().includes('senior')) {
    requirements.push('Senior-level experience required');
  }

  // Fallback requirements
  if (requirements.length === 0) {
    requirements.push('Relevant educational background or experience');
    requirements.push('Strong work ethic and dedication');
    requirements.push('Ability to work in a team environment');
  }

  return requirements.slice(0, 6); // Limit to 6 requirements
}

// Helper functions for RemoteOK processing
function extractQualificationsFromTags(tags: string[], jobTitle: string): string[] {
  const qualifications: string[] = [];

  // Convert tags to qualifications
  tags.forEach(tag => {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes('javascript') || lowerTag === 'js') {
      qualifications.push('JavaScript programming experience');
    } else if (lowerTag.includes('react')) {
      qualifications.push('React framework knowledge');
    } else if (lowerTag.includes('python')) {
      qualifications.push('Python programming skills');
    } else if (lowerTag.includes('node')) {
      qualifications.push('Node.js development experience');
    } else if (lowerTag.includes('typescript')) {
      qualifications.push('TypeScript experience');
    } else if (lowerTag.length > 2) {
      qualifications.push(`Experience with ${tag}`);
    }
  });

  // Add general qualifications
  qualifications.push('Strong communication skills for remote work');
  qualifications.push('Self-motivated and independent work style');
  qualifications.push('Experience with remote collaboration tools');

  return qualifications.slice(0, 8);
}

function extractRequirementsFromDescription(description: string, jobTitle: string): string[] {
  const requirements: string[] = [];
  const content = description.toLowerCase();

  // Basic requirement extraction
  if (content.includes('degree') || content.includes('bachelor') || content.includes('education')) {
    requirements.push('Bachelor\'s degree or equivalent experience');
  }
  if (content.includes('years') && content.includes('experience')) {
    const yearMatch = content.match(/(\d+)\+?\s*years?\s*(?:of\s*)?experience/);
    if (yearMatch) {
      requirements.push(`${yearMatch[1]}+ years of relevant experience`);
    } else {
      requirements.push('Previous relevant experience required');
    }
  }

  // Remote work requirements
  requirements.push('Reliable internet connection for remote work');
  requirements.push('Ability to work independently');

  // Job-specific requirements
  if (jobTitle.toLowerCase().includes('senior')) {
    requirements.push('Senior-level experience required');
  }

  // Fallback requirements
  if (requirements.length < 3) {
    requirements.push('Strong problem-solving skills');
    requirements.push('Excellent written communication');
  }

  return requirements.slice(0, 6);
}
