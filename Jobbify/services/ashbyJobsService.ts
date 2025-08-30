import { Job } from '@/context/AppContext';
import { processJobDescriptionWithAI } from './aiAssistantService';

// Ashby API Response Interfaces
interface AshbyAddress {
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
}

interface AshbySecondaryLocation {
  location: string;
  address: AshbyAddress;
}

interface AshbyCompensationComponent {
  id: string;
  summary: string;
  compensationType: 'Salary' | 'EquityPercentage' | 'Bonus' | 'Commission' | 'Other';
  interval: string;
  currencyCode?: string;
  minValue?: number;
  maxValue?: number;
}

interface AshbyCompensationTier {
  id: string;
  tierSummary: string;
  title: string;
  additionalInformation?: string;
  components: AshbyCompensationComponent[];
}

interface AshbyCompensation {
  compensationTierSummary?: string;
  scrapeableCompensationSalarySummary?: string;
  compensationTiers: AshbyCompensationTier[];
  summaryComponents: AshbyCompensationComponent[];
}

interface AshbyJob {
  title: string;
  location: string;
  secondaryLocations?: AshbySecondaryLocation[];
  department?: string;
  team?: string;
  isListed: boolean;
  isRemote: boolean;
  descriptionHtml: string;
  descriptionPlain: string;
  publishedAt: string;
  employmentType: 'FullTime' | 'PartTime' | 'Intern' | 'Contract' | 'Temporary';
  address?: {
    postalAddress: AshbyAddress;
  };
  jobUrl: string;
  applyUrl: string;
  compensation?: AshbyCompensation;
}

interface AshbyApiResponse {
  apiVersion: string;
  jobs: AshbyJob[];
}

// Configuration
const ASHBY_API_BASE_URL = 'https://api.ashbyhq.com/posting-api/job-board';

/**
 * Fetch jobs from Ashby API
 * @param jobBoardName - The Ashby job board name (e.g., "Ashby", "YourCompany")
 * @param includeCompensation - Whether to include compensation data
 * @returns Promise<Job[]> - Array of jobs in app format
 */
export const fetchAshbyJobs = async (
  jobBoardName: string,
  includeCompensation: boolean = true
): Promise<Job[]> => {
  try {
    console.log(`Fetching jobs from Ashby job board: ${jobBoardName}`);

    // Construct API URL
    const url = `${ASHBY_API_BASE_URL}/${jobBoardName}${includeCompensation ? '?includeCompensation=true' : ''}`;

    // Add cache-busting parameter to ensure fresh data
    const cacheBuster = new Date().getTime();
    const finalUrl = `${url}${includeCompensation ? '&' : '?'}_cb=${cacheBuster}`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });

    if (!response.ok) {
      console.error(`Ashby API request failed with status ${response.status}: ${response.statusText}`);
      return [];
    }

    const data: AshbyApiResponse = await response.json();

    if (!data || !data.jobs || !Array.isArray(data.jobs)) {
      console.log('No jobs found in Ashby API response');
      return [];
    }

    // Filter and map jobs
    const mappedJobs = await mapAshbyJobsToAppJobs(data.jobs);
    console.log(`Successfully fetched and mapped ${mappedJobs.length} jobs from Ashby`);

    return mappedJobs;
  } catch (error) {
    console.error('Error fetching jobs from Ashby API:', error);
    return [];
  }
};

/**
 * Map Ashby jobs to app Job interface
 * Filters out unlisted jobs and jobs without required data
 */
const mapAshbyJobsToAppJobs = async (ashbyJobs: AshbyJob[]): Promise<Job[]> => {
  // Filter jobs to only include listed ones with required data
  const validJobs = ashbyJobs.filter((job) => {
    return (
      job.isListed &&
      job.title &&
      job.descriptionPlain &&
      job.applyUrl &&
      job.publishedAt
    );
  });

  // Process jobs with AI enhancement
  const processedJobs = await Promise.all(validJobs.map(async (ashbyJob) => {
    // Generate unique ID for the job
    const jobId = `ashby-${ashbyJob.jobUrl.split('/').pop() || Date.now()}`;

    // Extract company name from job URL or use a default
    const company = extractCompanyFromUrl(ashbyJob.jobUrl) || 'Company';

    // Format location
    const location = formatLocation(ashbyJob);

    // Format compensation
    const pay = formatCompensation(ashbyJob.compensation);

    // Generate tags from job data
    const tags = generateTags(ashbyJob);

    // Process job description with AI for better quality and readability
    const processedDescription = await processJobDescriptionWithAI(
      ashbyJob.descriptionPlain || '',
      ashbyJob.title,
      company
    );

    // Generate placeholder image (you can customize this)
    const image = generatePlaceholderImage(company);

    return {
      id: jobId,
      title: ashbyJob.title,
      company,
      location,
      pay,
      image,
      logo: image,
      distance: ashbyJob.isRemote ? 'Remote' : '2 km', // Default distance for non-remote jobs
      tags,
      description: processedDescription.cleanDescription, // Use AI-processed clean description
      qualifications: processedDescription.qualifications, // Use AI-extracted qualifications
      requirements: processedDescription.requirements, // Use AI-extracted requirements
      url: ashbyJob.applyUrl,
      postedDate: ashbyJob.publishedAt,
    };
  }));

  return processedJobs;
};

/**
 * Extract company name from Ashby job URL
 */
const extractCompanyFromUrl = (jobUrl: string): string | null => {
  try {
    const url = new URL(jobUrl);
    const hostname = url.hostname;

    // Extract company name from subdomain (e.g., jobs.company.com -> company)
    if (hostname.includes('jobs.')) {
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      }
    }

    // Extract from ashbyhq.com URLs (e.g., jobs.ashbyhq.com/company -> company)
    if (hostname.includes('ashbyhq.com')) {
      const pathParts = url.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        return pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract company name from URL:', jobUrl);
    return null;
  }
};

/**
 * Format location from Ashby job data
 */
const formatLocation = (ashbyJob: AshbyJob): string => {
  if (ashbyJob.isRemote) {
    return ashbyJob.location ? `${ashbyJob.location} (Remote)` : 'Remote';
  }

  return ashbyJob.location || 'Location not specified';
};

/**
 * Format compensation data from Ashby
 */
const formatCompensation = (compensation?: AshbyCompensation): string => {
  if (!compensation) {
    return 'Competitive salary';
  }

  // Use the scrapeable summary if available (most concise)
  if (compensation.scrapeableCompensationSalarySummary) {
    return compensation.scrapeableCompensationSalarySummary;
  }

  // Use the tier summary if available
  if (compensation.compensationTierSummary) {
    return compensation.compensationTierSummary;
  }

  // Build from summary components
  if (compensation.summaryComponents && compensation.summaryComponents.length > 0) {
    const salaryComponent = compensation.summaryComponents.find(
      comp => comp.compensationType === 'Salary'
    );

    if (salaryComponent && salaryComponent.minValue && salaryComponent.maxValue) {
      const currency = salaryComponent.currencyCode || 'USD';
      const min = formatCurrency(salaryComponent.minValue, currency);
      const max = formatCurrency(salaryComponent.maxValue, currency);
      return `${min} - ${max}`;
    }
  }

  return 'Competitive salary';
};

/**
 * Format currency values
 */
const formatCurrency = (value: number, currencyCode: string): string => {
  const symbol = currencyCode === 'USD' ? '$' : currencyCode;
  if (value >= 1000) {
    return `${symbol}${Math.round(value / 1000)}K`;
  }
  return `${symbol}${value}`;
};

/**
 * Generate tags from Ashby job data
 */
const generateTags = (ashbyJob: AshbyJob): string[] => {
  const tags: string[] = [];

  // Add employment type
  if (ashbyJob.employmentType) {
    const employmentTypeMap: { [key: string]: string } = {
      'FullTime': 'Full-time',
      'PartTime': 'Part-time',
      'Intern': 'Internship',
      'Contract': 'Contract',
      'Temporary': 'Temporary'
    };
    tags.push(employmentTypeMap[ashbyJob.employmentType] || ashbyJob.employmentType);
  }

  // Add remote tag
  if (ashbyJob.isRemote) {
    tags.push('Remote');
  }

  // Add department if available
  if (ashbyJob.department) {
    tags.push(ashbyJob.department);
  }

  // Add team if available and different from department
  if (ashbyJob.team && ashbyJob.team !== ashbyJob.department) {
    tags.push(ashbyJob.team);
  }

  return tags;
};

/**
 * Generate placeholder image for company
 */
const generatePlaceholderImage = (company: string): string => {
  // Use a set of professional placeholder images
  const placeholderImages = [
    'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=688&q=80',
    'https://images.unsplash.com/photo-1573496799652-1c28c88b4f3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1169&q=80',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80',
    'https://images.unsplash.com/photo-1573497161161-c3e73707e25c?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80',
  ];

  // Use company name to consistently select the same image
  const safeCompany = company || 'Unknown Company';
  const hash = safeCompany.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return placeholderImages[hash % placeholderImages.length];
};

// Note: extractQualificationsAndRequirements function removed - now using AI processing

/**
 * Validate Ashby job board name format
 */
export const validateJobBoardName = (jobBoardName: string): boolean => {
  // Basic validation - should be non-empty and contain only valid URL characters
  return /^[a-zA-Z0-9_-]+$/.test(jobBoardName);
};

/**
 * Get available job board configurations
 * You can extend this to support multiple job boards
 */
export const getJobBoardConfigurations = () => {
  return [
    {
      name: 'Ashby',
      boardName: 'Ashby',
      description: 'Ashby\'s own job board'
    },
    // Add more job boards here as needed
    // {
    //   name: 'Your Company',
    //   boardName: 'your-company-name',
    //   description: 'Your company job board'
    // }
  ];
};
