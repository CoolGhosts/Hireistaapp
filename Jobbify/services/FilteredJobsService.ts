import { supabase } from '@/lib/supabase';
import { Job } from '@/types/Job';
import { fetchJobs } from './JobsService';

export interface UserJobPreferences {
  user_id: string;
  preferred_job_types: string[];
  experience_level: string;
  preferred_industries: string[];
  preferred_company_sizes: string[];
  remote_work_preference: 'required' | 'preferred' | 'acceptable' | 'not_preferred';
  preferred_locations: string[];
  willing_to_relocate: boolean;
  min_salary?: number;
  max_salary?: number;
  preferred_job_titles: string[];
  required_skills: string[];
  preferred_skills: string[];
}

export interface FilteredJobsResponse {
  jobs: Job[];
  total_count: number;
  cache_used: boolean;
  preferences_applied: UserJobPreferences | null;
}

/**
 * Get user's job preferences from the database
 */
export const getUserJobPreferences = async (userId: string): Promise<UserJobPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_job_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
};

/**
 * Generate a hash for filter criteria to use for caching
 */
const generateFilterHash = (preferences: UserJobPreferences): string => {
  const filterData = {
    job_types: preferences.preferred_job_types.sort(),
    experience: preferences.experience_level,
    industries: preferences.preferred_industries.sort(),
    company_sizes: preferences.preferred_company_sizes.sort(),
    remote: preferences.remote_work_preference,
    locations: preferences.preferred_locations.sort(),
    relocate: preferences.willing_to_relocate,
    salary_min: preferences.min_salary,
    salary_max: preferences.max_salary,
    titles: preferences.preferred_job_titles.sort(),
    required_skills: preferences.required_skills.sort(),
    preferred_skills: preferences.preferred_skills.sort()
  };
  
  return btoa(JSON.stringify(filterData)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
};

/**
 * Check if cached filtered jobs exist and are still valid
 */
const getCachedFilteredJobs = async (filterHash: string): Promise<number[] | null> => {
  try {
    const { data, error } = await supabase
      .from('filtered_job_cache')
      .select('job_ids, expires_at')
      .eq('filter_hash', filterHash)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cache is still valid
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      // Cache expired, delete it
      await supabase
        .from('filtered_job_cache')
        .delete()
        .eq('filter_hash', filterHash);
      return null;
    }

    return data.job_ids;
  } catch (error) {
    console.error('Error checking cached jobs:', error);
    return null;
  }
};

/**
 * Cache filtered job results
 */
const cacheFilteredJobs = async (filterHash: string, jobIds: number[]): Promise<void> => {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

    await supabase
      .from('filtered_job_cache')
      .upsert({
        filter_hash: filterHash,
        job_ids: jobIds,
        total_count: jobIds.length,
        expires_at: expiresAt.toISOString()
      });
  } catch (error) {
    console.error('Error caching filtered jobs:', error);
  }
};

/**
 * Fetch jobs from external APIs and store them in the database
 */
const fetchAndStoreJobs = async (): Promise<void> => {
  try {
    console.log('Fetching fresh jobs from external APIs...');
    
    // Fetch jobs from external APIs
    const externalJobs = await fetchJobs();
    
    if (externalJobs.length === 0) {
      console.log('No jobs fetched from external APIs');
      return;
    }

    // Transform and store jobs in database
    const jobsToInsert = externalJobs.map(job => ({
      external_id: job.id,
      source: 'api',
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      job_type: mapJobType(job.type),
      experience_level: mapExperienceLevel(job.title, job.description),
      industry: mapIndustry(job.company, job.description),
      company_size: mapCompanySize(job.company),
      salary_min: extractSalaryMin(job.salary),
      salary_max: extractSalaryMax(job.salary),
      remote: job.remote || job.location?.toLowerCase().includes('remote') || false,
      hybrid: job.location?.toLowerCase().includes('hybrid') || false,
      company_logo_url: job.logo,
      application_url: job.url,
      posted_date: job.postedDate ? new Date(job.postedDate) : new Date(),
      expires_date: job.expiresDate ? new Date(job.expiresDate) : null
    }));

    // Insert jobs, ignoring duplicates
    const { error } = await supabase
      .from('jobs')
      .upsert(jobsToInsert, { 
        onConflict: 'external_id,source',
        ignoreDuplicates: true 
      });

    if (error) {
      console.error('Error storing jobs:', error);
    } else {
      console.log(`Successfully stored ${jobsToInsert.length} jobs`);
    }
  } catch (error) {
    console.error('Error fetching and storing jobs:', error);
  }
};

/**
 * Map job type from external API to our standard types
 */
const mapJobType = (type?: string): string => {
  if (!type) return 'Full-time';
  
  const lowerType = type.toLowerCase();
  if (lowerType.includes('part')) return 'Part-time';
  if (lowerType.includes('contract') || lowerType.includes('freelance')) return 'Contract';
  if (lowerType.includes('intern')) return 'Internship';
  if (lowerType.includes('temp')) return 'Temporary';
  
  return 'Full-time';
};

/**
 * Map experience level based on job title and description
 */
const mapExperienceLevel = (title: string, description?: string): string => {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  if (text.includes('senior') || text.includes('sr.') || text.includes('lead')) return 'senior';
  if (text.includes('junior') || text.includes('jr.')) return 'junior';
  if (text.includes('entry') || text.includes('graduate') || text.includes('intern')) return 'entry';
  if (text.includes('principal') || text.includes('staff') || text.includes('architect')) return 'lead';
  if (text.includes('director') || text.includes('vp') || text.includes('chief')) return 'executive';
  
  return 'mid';
};

/**
 * Map industry based on company and job description
 */
const mapIndustry = (company: string, description?: string): string => {
  const text = `${company} ${description || ''}`.toLowerCase();
  
  if (text.includes('tech') || text.includes('software') || text.includes('engineer')) return 'Technology';
  if (text.includes('health') || text.includes('medical') || text.includes('pharma')) return 'Healthcare';
  if (text.includes('bank') || text.includes('finance') || text.includes('investment')) return 'Finance';
  if (text.includes('education') || text.includes('university') || text.includes('school')) return 'Education';
  if (text.includes('marketing') || text.includes('advertising')) return 'Marketing';
  if (text.includes('sales')) return 'Sales';
  if (text.includes('design') || text.includes('creative')) return 'Design';
  if (text.includes('data') || text.includes('analytics')) return 'Data Science';
  if (text.includes('product') || text.includes('pm')) return 'Product Management';
  if (text.includes('hr') || text.includes('human resources')) return 'Human Resources';
  if (text.includes('operations') || text.includes('ops')) return 'Operations';
  if (text.includes('customer') || text.includes('support')) return 'Customer Service';
  if (text.includes('consulting')) return 'Consulting';
  if (text.includes('media') || text.includes('journalism')) return 'Media';
  if (text.includes('non-profit') || text.includes('nonprofit')) return 'Non-profit';
  if (text.includes('government') || text.includes('public')) return 'Government';
  
  return 'Other';
};

/**
 * Map company size (this is a rough estimation)
 */
const mapCompanySize = (company: string): string => {
  // This would ideally be enhanced with a company database
  // For now, we'll use some heuristics
  const knownLargeCompanies = ['google', 'microsoft', 'amazon', 'apple', 'facebook', 'meta', 'netflix', 'uber', 'airbnb'];
  const companyLower = company.toLowerCase();
  
  if (knownLargeCompanies.some(large => companyLower.includes(large))) {
    return 'enterprise';
  }
  
  // Default to medium for now
  return 'medium';
};

/**
 * Extract minimum salary from salary string
 */
const extractSalaryMin = (salary?: string): number | null => {
  if (!salary) return null;
  
  const numbers = salary.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  
  const firstNumber = parseInt(numbers[0]);
  
  // Handle different formats (K, thousands, etc.)
  if (salary.toLowerCase().includes('k') && firstNumber < 1000) {
    return firstNumber * 1000;
  }
  
  return firstNumber;
};

/**
 * Extract maximum salary from salary string
 */
const extractSalaryMax = (salary?: string): number | null => {
  if (!salary) return null;
  
  const numbers = salary.match(/\d+/g);
  if (!numbers || numbers.length < 2) return extractSalaryMin(salary);
  
  const secondNumber = parseInt(numbers[1]);
  
  // Handle different formats (K, thousands, etc.)
  if (salary.toLowerCase().includes('k') && secondNumber < 1000) {
    return secondNumber * 1000;
  }
  
  return secondNumber;
};

/**
 * Get filtered jobs for a user based on their preferences
 */
export const getFilteredJobsForUser = async (
  userId: string, 
  limit: number = 50, 
  offset: number = 0,
  forceRefresh: boolean = false
): Promise<FilteredJobsResponse> => {
  try {
    // Get user preferences
    const preferences = await getUserJobPreferences(userId);
    
    if (!preferences) {
      // No preferences set, return all recent jobs
      const { data: allJobs, error } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_date', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        jobs: allJobs || [],
        total_count: allJobs?.length || 0,
        cache_used: false,
        preferences_applied: null
      };
    }

    // Generate filter hash for caching
    const filterHash = generateFilterHash(preferences);
    
    // Check cache first (unless force refresh)
    let cachedJobIds: number[] | null = null;
    if (!forceRefresh) {
      cachedJobIds = await getCachedFilteredJobs(filterHash);
    }

    let jobIds: number[];
    let cacheUsed = false;

    if (cachedJobIds) {
      jobIds = cachedJobIds;
      cacheUsed = true;
      console.log(`Using cached filtered jobs for user ${userId}`);
    } else {
      // Fetch fresh jobs if needed
      await fetchAndStoreJobs();
      
      // Get filtered jobs using the database function
      const { data: filteredJobs, error } = await supabase
        .rpc('get_filtered_jobs', {
          p_user_id: userId,
          p_limit: 1000, // Get more for caching
          p_offset: 0
        });

      if (error) throw error;

      jobIds = (filteredJobs || []).map((job: any) => job.id);
      
      // Cache the results
      await cacheFilteredJobs(filterHash, jobIds);
      console.log(`Cached ${jobIds.length} filtered jobs for user ${userId}`);
    }

    // Get the actual job data for the requested page
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .in('id', jobIds.slice(offset, offset + limit))
      .order('posted_date', { ascending: false });

    if (jobsError) throw jobsError;

    return {
      jobs: jobs || [],
      total_count: jobIds.length,
      cache_used: cacheUsed,
      preferences_applied: preferences
    };

  } catch (error) {
    console.error('Error getting filtered jobs:', error);
    
    // Fallback to all jobs
    const { data: fallbackJobs, error: fallbackError } = await supabase
      .from('jobs')
      .select('*')
      .order('posted_date', { ascending: false })
      .limit(limit)
      .range(offset, offset + limit - 1);

    return {
      jobs: fallbackJobs || [],
      total_count: fallbackJobs?.length || 0,
      cache_used: false,
      preferences_applied: null
    };
  }
};

/**
 * Record user interaction with a job for learning purposes
 */
export const recordJobInteraction = async (
  userId: string,
  jobId: number,
  interactionType: 'view' | 'like' | 'dislike' | 'apply' | 'save' | 'share'
): Promise<void> => {
  try {
    await supabase
      .from('user_job_interactions')
      .upsert({
        user_id: userId,
        job_id: jobId,
        interaction_type: interactionType
      });
  } catch (error) {
    console.error('Error recording job interaction:', error);
  }
};

/**
 * Clear expired cache entries
 */
export const clearExpiredCache = async (): Promise<void> => {
  try {
    await supabase
      .from('filtered_job_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};
