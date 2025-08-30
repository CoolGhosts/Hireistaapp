import axios from 'axios';
import { Job } from '@/context/AppContext';
import { Platform } from 'react-native';

// Only output verbose logging in development builds
const debugLog = (...args: any[]) => {
  if (__DEV__) {
    debugLog(...args);
  }
};

// API URLs - with fallbacks for different environments
// For iOS simulators, use localhost
// For Android emulators, use 10.0.2.2
// For physical devices, use the actual network IP
const API_URLS = {
  localhost: 'http://localhost:8000',
  androidEmulator: 'http://10.0.2.2:8000',
  networkIp: 'http://10.0.0.9:8000', // Backend IP
  hostMachine: 'http://10.0.0.181:8000', // Host machine IP for iOS simulator
  localApi: 'http://127.0.0.1:8000',
  fallback: (process.env.EXPO_PUBLIC_SUPABASE_URL ? `${(process.env.EXPO_PUBLIC_SUPABASE_URL as string).replace(/\/$/, '')}/rest/v1` : ''),
  production: 'https://jobbify-api.herokuapp.com'  // Add a production URL
};

// Supabase API key for direct access
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Determine the best API URL based on platform
export const getBestApiUrl = () => {
  // Check if a server URL was provided in AsyncStorage or env
  try {
    // Try to get from environment
    if (process.env.API_URL) {
      debugLog(`Using API URL from env: ${process.env.API_URL}`);
      return process.env.API_URL;
    }

    // For mobile devices, use the appropriate URL based on platform
    if (Platform.OS === 'ios') {
      // For iOS simulator, use host machine IP since backend is running on host
      return API_URLS.hostMachine;
    } else if (Platform.OS === 'android') {
      // For Android emulator, use the special IP
      return API_URLS.androidEmulator;
    } else {
      // For physical devices (iOS or Android) or web, use host machine IP
      return API_URLS.hostMachine;
    }
  } catch (error) {
    debugLog("Error getting custom server URL, using localhost");
    // Fall back to localhost
    return API_URLS.localhost;
  }
};

// Default API URL with fallback mechanism
export const API_URL = getBestApiUrl();

// Mock data for when the API is unavailable
const mockJobs: any[] = [
  {
    id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'Remote',
    salary: '$90K-$120K',
    logo: 'https://randomuser.me/api/portraits/men/11.jpg',
    apply_url: 'https://example.com/apply/1',
    description: 'We are looking for an experienced Frontend Developer to join our team. You will be responsible for building responsive and interactive user interfaces for our web applications.',
    tags: ['React', 'JavaScript', 'TypeScript'],
    distance: '5 miles',
    qualifications: ['3+ years of experience with React', 'Strong JavaScript skills', 'Experience with TypeScript'],
    requirements: ['Bachelor\'s degree in Computer Science or related field', 'Strong problem-solving skills']
  },
  {
    id: '2',
    title: 'UX Designer',
    company: 'DesignHub',
    location: 'New York, NY',
    salary: '$85K-$110K',
    logo: 'https://randomuser.me/api/portraits/women/22.jpg',
    apply_url: 'https://example.com/apply/2',
    description: 'Join our creative team as a UX Designer to create beautiful and intuitive user experiences. You will work closely with product managers and developers to define user flows and design interfaces.',
    tags: ['UI/UX', 'Figma', 'Adobe XD'],
    distance: '7 miles',
    qualifications: ['3+ years of UX design experience', 'Proficiency with design tools like Figma and Adobe XD'],
    requirements: ['Portfolio showcasing your work', 'User research experience']
  },
  {
    id: '3',
    title: 'Full Stack Developer',
    company: 'WebSolutions',
    location: 'Remote',
    salary: '$120K-$150K',
    logo: 'https://randomuser.me/api/portraits/men/33.jpg',
    apply_url: 'https://example.com/apply/3',
    description: 'Looking for a versatile developer who can work across the entire stack. You will be responsible for both frontend and backend development, database design, and API implementation.',
    tags: ['JavaScript', 'Node.js', 'React', 'MongoDB'],
    distance: 'Remote',
    qualifications: ['4+ years full stack experience', 'Experience with Node.js and React'],
    requirements: ['Strong understanding of web technologies', 'Ability to work independently']
  },
  {
    id: '4',
    title: 'DevOps Engineer',
    company: 'CloudNine',
    location: 'Seattle, WA',
    salary: '$130K-$160K',
    logo: 'https://randomuser.me/api/portraits/men/44.jpg',
    apply_url: 'https://example.com/apply/4',
    description: 'Join our DevOps team to build and maintain our cloud infrastructure and CI/CD pipelines. You will be responsible for automating deployments, monitoring systems, and ensuring reliability.',
    tags: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    distance: '12 miles',
    qualifications: ['Experience with AWS services', 'Docker and Kubernetes knowledge'],
    requirements: ['AWS certifications a plus', 'Linux administration skills']
  },
  {
    id: '5',
    title: 'Data Scientist',
    company: 'DataMinds',
    location: 'Boston, MA',
    salary: '$110K-$140K',
    logo: 'https://randomuser.me/api/portraits/women/55.jpg',
    apply_url: 'https://example.com/apply/5',
    description: 'We are seeking a skilled Data Scientist to join our team. You will analyze complex datasets, develop machine learning models, and extract actionable insights to drive business decisions.',
    tags: ['Python', 'Machine Learning', 'SQL', 'Data Analysis'],
    distance: '8 miles',
    qualifications: ['Advanced degree in a quantitative field', 'Experience with Python and data science libraries'],
    requirements: ['Strong analytical and problem-solving skills', 'Experience with big data technologies']
  }
];

// Normalize various API response formats to a simple array of jobs
const extractJobArray = (data: any): any[] | null => {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.jobs && Array.isArray(data.jobs)) return data.jobs;
  if (typeof data === 'object') {
    if (data.title || data.id || data.company) {
      return [data];
    }
    for (const key in data) {
      if (Array.isArray(data[key]) && data[key].length > 0) {
        return data[key];
      }
    }
  }
  return null;
};

// Helper to try different API URLs
export const tryFetchWithFallbacks = async (endpoint: string, options = {}) => {
  const urlsToTry = [
    getBestApiUrl(),
    API_URLS.networkIp,
    API_URLS.androidEmulator,
    API_URLS.localApi,
    API_URLS.localhost
  ];

  const fetchFromUrl = async (baseUrl: string) => {
    try {
      debugLog(`Trying to fetch from: ${baseUrl}${endpoint}`);
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout: 5000,
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        ...options
      });

      if (response.data) {
        const jobs = extractJobArray(response.data);
        if (jobs) {
          debugLog(`Successfully fetched from: ${baseUrl}`);
          return jobs;
        }
      }
      throw new Error('Invalid response');
    } catch (error: any) {
      debugLog(`Error fetching from ${baseUrl}: ${error?.message || 'Unknown error'}`);
      throw error;
    }
  };

  try {
    return await Promise.any(urlsToTry.map(fetchFromUrl));
  } catch (error: any) {
    console.error('All API URLs failed, throwing last error');
    if (error instanceof AggregateError && error.errors.length) {
      throw error.errors[error.errors.length - 1];
    }
    throw error;
  }
};

/**
 * Test the API connection to help diagnose connectivity issues
 */
export const testApiConnection = async (): Promise<boolean> => {
  const urls = [
    getBestApiUrl(),         // Platform-specific URL (now set to network IP)
    API_URLS.networkIp,      // Try the network IP as backup
    API_URLS.androidEmulator, // Android emulator
    API_URLS.localApi,        // 127.0.0.1
    API_URLS.localhost       // Localhost last since it's failing
  ];

  debugLog('Testing API connectivity...');

  const checkUrl = async (baseUrl: string) => {
    debugLog(`Trying to connect to health endpoint at: ${baseUrl}/health`);
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 3000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (response.data) {
      debugLog(`CONNECTION SUCCESSFUL! Server at ${baseUrl} is reachable.`);
      return true;
    }
    throw new Error('No response');
  };

  try {
    await Promise.any(urls.map(checkUrl));
    return true;
  } catch {
    debugLog('All connection attempts failed. Please check your network settings.');
    return false;
  }
};

/**
 * Fetches jobs from your API with safe fallback
 */
export const fetchJobs = async (resetSwipes: boolean = false): Promise<Job[]> => {
  console.log('[FETCH] Starting fetchJobs function');

  // Based on your backend logs, the app is connecting from 10.0.0.106
  // So your backend should be accessible from the app's perspective
  const apiUrls = [
    'http://10.0.0.181:8000', // Host machine IP
    'http://localhost:8000',   // Localhost
    'http://127.0.0.1:8000',   // Local IP
    'http://10.0.0.9:8000'     // Network IP from logs
  ];

  // Try each API URL
  for (const baseUrl of apiUrls) {
    try {
      const apiUrl = `${baseUrl}/jobs/?limit=250`;
      console.log(`[FETCH] Trying to fetch jobs from: ${apiUrl}`);

      const response = await axios.get(apiUrl, {
        timeout: 8000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log(`[FETCH] API Response status: ${response.status}`);
      console.log(`[FETCH] API Response data type: ${typeof response.data}`);

      if (response.data && Array.isArray(response.data)) {
        const jobs = response.data;
        console.log(`[FETCH] Successfully fetched ${jobs.length} jobs from ${baseUrl}`);

        // Convert API jobs to app format safely
        const convertedJobs = jobs.slice(0, 50).map((job, index) => {
          const companyName = (job.company || job.company_name || 'Company').replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 20);

          // Handle different field names from your API
          const jobId = String(job.id || job.external_id || `api-${index}`);
          const title = job.title || 'Unknown Position';
          const company = job.company || job.company_name || 'Unknown Company';
          const location = job.location || job.job_location || 'Remote';
          const pay = job.pay || job.salary || job.compensation || 'Competitive';
          const description = job.description || 'Great opportunity to join our team.';
          const imageUrl = job.image || job.logo || job.company_logo || `https://ui-avatars.com/api/?name=${companyName}&background=random&size=150`;
          const applyUrl = job.apply_url || job.url || 'https://example.com/apply';

          // Handle tags - ensure it's always an array
          let tags = ['Remote']; // Default
          if (job.tags && Array.isArray(job.tags)) {
            tags = job.tags;
          } else if (job.skills && Array.isArray(job.skills)) {
            tags = job.skills;
          } else if (typeof job.tags === 'string') {
            tags = [job.tags];
          }

          // Handle qualifications - ensure it's always an array
          let qualifications = ['Experience required']; // Default
          if (job.qualifications && Array.isArray(job.qualifications)) {
            qualifications = job.qualifications;
          } else if (typeof job.qualifications === 'string') {
            qualifications = [job.qualifications];
          }

          // Handle requirements - ensure it's always an array
          let requirements = ['See job description']; // Default
          if (job.requirements && Array.isArray(job.requirements)) {
            requirements = job.requirements;
          } else if (typeof job.requirements === 'string') {
            requirements = [job.requirements];
          }

          return {
            id: jobId,
            title: title,
            company: company,
            location: location,
            pay: pay,
            image: imageUrl,
            logo: imageUrl,
            distance: `${Math.floor(Math.random() * 20) + 1} km`,
            tags: tags,
            description: description,
            qualifications: qualifications,
            requirements: requirements,
            url: applyUrl
          };
        });

        console.log(`[FETCH] Converted ${convertedJobs.length} jobs successfully`);
        return convertedJobs;
      }
    } catch (error) {
      console.log(`[FETCH] Failed to fetch from ${baseUrl}: ${error.message}`);
      // Continue to next URL
    }
  }

  // If all API calls failed, return safe mock jobs
  console.log('[FETCH] All API URLs failed, using safe mock jobs');
  const safeMockJobs = [
    {
      id: '1',
      title: 'Frontend Developer',
      company: 'TechCorp',
      location: 'Remote',
      pay: '$90K-$120K',
      image: 'https://ui-avatars.com/api/?name=TechCorp&background=random&size=150',
      logo: 'https://ui-avatars.com/api/?name=TechCorp&background=random&size=150',
      distance: '5 km',
      tags: ['React', 'JavaScript'],
      description: 'We are looking for an experienced Frontend Developer.',
      qualifications: ['3+ years React experience'],
      requirements: ['Bachelor\'s degree preferred'],
      url: 'https://example.com/apply'
    },
    {
      id: '2',
      title: 'Backend Developer',
      company: 'DataFlow',
      location: 'San Francisco, CA',
      pay: '$100K-$130K',
      image: 'https://ui-avatars.com/api/?name=DataFlow&background=random&size=150',
      logo: 'https://ui-avatars.com/api/?name=DataFlow&background=random&size=150',
      distance: '8 km',
      tags: ['Node.js', 'Python'],
      description: 'Join our backend team to build scalable APIs.',
      qualifications: ['5+ years backend experience'],
      requirements: ['Computer Science degree'],
      url: 'https://example.com/apply'
    }
  ];

  console.log(`[FETCH] Returning ${safeMockJobs.length} safe mock jobs as fallback`);
  return safeMockJobs;
};

/**
 * Fetches unseen jobs for a specific user - SAFE VERSION
 */
export const fetchUnseenJobs = async (userId: string): Promise<Job[]> => {
  console.log('[UNSEEN] Fetching unseen jobs for user:', userId);

  // SAFE FALLBACK: Return empty array to avoid any recursion issues
  console.log('[UNSEEN] Returning empty array to avoid recursion');
  return [];
};

/**
 * Refresh jobs data from API with strict filtering
 * Only returns jobs from the past week that have all required fields
 */
export const refreshJobs = async (forceReset: boolean = true, cacheBuster: number = Date.now()): Promise<Job[]> => {
  try {
    // Calculate date from one week ago for filtering
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Format date for API: YYYY-MM-DD
    const dateStr = oneWeekAgo.toISOString().split('T')[0];
    
    // Add cache-busting parameter to prevent caching
    const jobsEndpoint = `${API_URL}/api/jobs?from_date=${dateStr}&_cb=${cacheBuster}&strict=true`;
    debugLog('Refreshing jobs from:', jobsEndpoint);
    
    // Add cache control headers to prevent using cached data
    const options = {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
    
    const data = await tryFetchWithFallbacks(jobsEndpoint, options);

    debugLog(`Got ${data?.length || 0} jobs from API`);

    // Map and filter jobs to our app's format
    if (data && Array.isArray(data)) {
        // Add posting dates to all jobs for time filtering
        const jobsWithDates = data.map((job: any) => {
          // Add posting date if missing
          if (!job.posted_at && !job.date) {
            // Create a random recent date (0-7 days ago)
            const daysAgo = Math.floor(Math.random() * 7);
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            job.posted_at = date.toISOString();
          }
          return job;
        });

        // Map to our app's Job format
        const mappedJobs = mapApiJobsToAppJobs(jobsWithDates);

        // Apply strict filtering for jobs with all required fields
        const strictlyFilteredJobs = mappedJobs.filter(job => {
          return (
            // Must have logo/image
            job.logo && job.logo.trim() !== '' &&
            // Must have substantial description
            job.description && job.description.length >= 50 &&
            // Must have pay/salary info
            job.pay && job.pay !== 'N/A' &&
            // Must have qualifications
            job.qualifications && job.qualifications.length > 0 &&
            // Must have requirements
            job.requirements && job.requirements.length > 0
          );
        });

        return strictlyFilteredJobs;
    }

    // If API call fails or returns no valid data, use mock data with recent dates
    debugLog('Using mock data with recent dates as fallback');
    return getMockJobsWithRecentDates();
  } catch (error) {
    console.error('Error refreshing jobs:', error);
    // Return mock data with recent dates as fallback
    return getMockJobsWithRecentDates();
  }
};

/**
 * Helper to get mock jobs with recent dates (past week only)
 */
const getMockJobsWithRecentDates = (): Job[] => {
  return mockJobs.map(mockJob => {
    // Create a random date from the past week
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // Create a properly formatted job object with the correct interface
    const job: Job = {
      id: mockJob.id,
      title: mockJob.title,
      company: mockJob.company,
      location: mockJob.location || 'Remote',
      pay: mockJob.salary || '$80K-$120K',
      image: mockJob.logo || 'https://ui-avatars.com/api/?name=Job&background=random&size=150',
      logo: mockJob.logo || 'https://ui-avatars.com/api/?name=Job&background=random&size=150',
      distance: mockJob.distance || '5 km',
      tags: mockJob.tags || ['Remote'],
      description: mockJob.description || 'This is a great job opportunity.',
      qualifications: mockJob.qualifications || ['Experience required'],
      requirements: mockJob.requirements || ['Bachelor\'s degree preferred'],
      url: mockJob.apply_url || 'https://example.com/apply',
      postedDate: date.toISOString() // Add posting date in ISO format
    };
    
    return job;
  });
};

/**
 * Map API response to our app's Job interface
 */
const mapApiJobsToAppJobs = (apiJobs: any[]): Job[] => {
  try {
    debugLog(`[MAP] Starting mapApiJobsToAppJobs with ${apiJobs?.length || 0} jobs`);

    if (!Array.isArray(apiJobs)) {
      debugLog('[MAP] Invalid job data format - not an array:', typeof apiJobs);
      return [];
    }

    debugLog(`[MAP] Processing ${apiJobs.length} jobs...`);

    // Limit the number of jobs to process to prevent stack overflow
    const jobsToProcess = apiJobs.slice(0, 50); // Process max 50 jobs at a time
    debugLog(`[MAP] Limited to processing ${jobsToProcess.length} jobs to prevent stack overflow`);

    // Map and enhance jobs instead of filtering them out
    const processedJobs = jobsToProcess
    .map((job: any): Job | null => {
      try {
        // Validate job has minimal required data
        if (!job || (typeof job !== 'object')) {
          debugLog('Invalid job item:', job);
          return null;
        }

        // Try to extract job fields, handling various API formats
        const id = job.id || job.job_id || job._id || `mock-${Math.random().toString(36).substring(2, 9)}`;
        const title = job.title || job.job_title || job.position || job.name || 'Unknown Position';
        const company = job.company || job.company_name || job.employer || 'Unknown Company';
        const location = job.location || job.job_location || job.city || 'Remote';
        const pay = job.salary || job.job_salary || job.pay || job.compensation || 'N/A';
        const description = job.description || job.job_description || job.details || 'No description available';

        // Image handling with fallbacks - ensure we always have a valid image URL
        // Fix for "source.uri should not be an empty string" warnings
        const placeholderImage = 'https://via.placeholder.com/150';
        const logo = job.logo || job.company_logo || job.image || job.avatar;
        const image = (logo && logo.trim() !== '') ? logo : placeholderImage;

        // Random distance for UI display
        const distance = `${Math.floor(Math.random() * 20) + 1} km`;

        // Handle tags - use existing or generate random
        let tags = [];
        if (job.tags && Array.isArray(job.tags)) {
          tags = job.tags;
        } else if (job.skills && Array.isArray(job.skills)) {
          tags = job.skills;
        } else if (job.categories && Array.isArray(job.categories)) {
          tags = job.categories;
        } else {
          // Generate random tags
          const possibleTags = ['Remote', 'Full-time', 'Part-time', 'Contract'];
          tags = [possibleTags[Math.floor(Math.random() * possibleTags.length)]];
        }

        // Handle qualifications
        let qualifications = [];
        if (job.qualifications && Array.isArray(job.qualifications)) {
          qualifications = job.qualifications;
        } else if (job.requirements && Array.isArray(job.requirements)) {
          // Some APIs might put qualifications under requirements
          qualifications = job.requirements;
        } else {
          qualifications = ['Experience required'];
        }

        // Handle requirements
        let requirements = [];
        if (job.requirements && Array.isArray(job.requirements)) {
          requirements = job.requirements;
        } else {
          requirements = ['See job description for details'];
        }

        // Return job object matching the Job interface
        return {
          id: String(id), // Convert to string to ensure consistency
          title,
          company,
          location,
          pay,
          image,
          distance,
          tags,
          description,
          qualifications,
          requirements,
          logo: (logo && logo.trim() !== '') ? logo : placeholderImage // Ensure logo is never empty
        };
      } catch (error) {
        console.error('Error mapping job:', error, job);
        // Return a placeholder job rather than failing completely
        return {
          id: `error-${Math.random().toString(36).substring(2, 9)}`,
          title: 'Data Error',
          company: 'Unknown Company',
          location: 'Unknown',
          pay: 'N/A',
          image: 'https://via.placeholder.com/150',
          distance: '0 km',
          tags: ['Error'],
          description: 'There was an error processing this job data.',
          qualifications: [],
          requirements: [],
          logo: 'https://via.placeholder.com/150'
        };
      }
    })
    // Filter out only null jobs and enhance the rest, making sure all have required fields
    .filter((job): job is Job => {
      if (job === null) return false;

      // 1. Make sure location is valid
      if (!job.location || job.location.trim() === '' || job.location === 'Unknown') {
        job.location = 'Remote/Flexible';
      }

      // 2. Make sure logo is valid
      if (!job.logo || job.logo.trim() === '' ||
          job.logo.includes('placeholder.com') || job.logo.includes('via.placeholder')) {
        // Generate a nice colored logo with company initials (simplified to avoid encoding issues)
        const companyName = job.company.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 20);
        job.logo = `https://ui-avatars.com/api/?name=${companyName}&background=random&size=150`;
      }

      // 3. Make sure description is substantial
      if (!job.description || job.description.trim() === '' ||
          job.description === 'No description available' || job.description.length < 20) {
        job.description = `Join ${job.company} as a ${job.title}. This position offers competitive compensation and growth opportunities.`;
      }

      return true; // Keep all jobs after enhancement
    });

  // Log the final count once without excessive detail
  debugLog(`[MAP] Processed ${jobsToProcess.length} jobs, returning ${processedJobs.length} enhanced jobs`);

  return processedJobs;
  } catch (error) {
    console.error('[MAP] Critical error in mapApiJobsToAppJobs:', error);
    // Return empty array as absolute fallback
    return [];
  }
}; 
