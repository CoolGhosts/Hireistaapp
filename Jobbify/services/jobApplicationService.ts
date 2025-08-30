/**
 * Job application service for managing job applications
 */
import axios from 'axios';
import { Job, AppliedJob } from '@/context/AppContext';
import { API_URL, tryFetchWithFallbacks } from './remoteOkService';
import { supabase } from '@/lib/supabase';

// Import email generation service
import { generateApplicationEmail } from './emailGenerationService';

/**
 * Validate if a job exists in the database
 */
const validateJobExists = async (jobId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (error) {
      console.log(`Job ${jobId} does not exist in database:`, error.message);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error(`Error validating job existence for ${jobId}:`, error);
    return false;
  }
};

/**
 * Apply to a job
 */
export const applyToJob = async (jobId: string, userId: string, coverLetter?: string) => {
  try {
    console.log('Applying to job:', jobId);

    // Prevent applications to mock jobs
    if (jobId.startsWith('mock-job-')) {
      console.error(`Cannot apply to job: Job ${jobId} is a mock job and doesn't exist in database`);
      return { success: false, error: 'Cannot apply to mock jobs' };
    }

    // First validate that the job exists in the database
    const jobExists = await validateJobExists(jobId);
    if (!jobExists) {
      console.error(`Cannot apply to job: Job ${jobId} does not exist in database`);
      return { success: false, error: 'Job not found in database' };
    }

    // Generate a unique application-specific email for this application
    const applicationEmail = await generateApplicationEmail(userId, jobId);
    console.log(`Using application email: ${applicationEmail}`);
    
    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/applications`, {
        job_id: jobId,
        profile_id: userId,
        cover_letter: coverLetter || '',
        application_email: applicationEmail
      });
      
      if (response.status === 201) {
        console.log('Successfully applied via FastAPI:', response.data);
        return { success: true, data: response.data, applicationEmail };
      }
    } catch (apiError) {
      console.error('Error applying via FastAPI:', apiError);
    }
    
    // Fall back to direct Supabase method if API fails
    const { data, error } = await supabase
      .from('matches')
      .insert({
        profile_id: userId,
        job_id: jobId,
        status: 'applying',
        cover_letter: coverLetter || '',
        application_email: applicationEmail,
        metadata: {
          applied_at: new Date().toISOString(),
          source: 'direct-application'
        }
      })
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Successfully applied to job via Supabase:', data);
    return { success: true, data, applicationEmail };
  } catch (error) {
    console.error('Error applying to job:', error);
    return { success: false, error };
  }
};

/**
 * Save a job to bookmarks
 */
export const saveJobToBookmarks = async (jobId: string, userId: string) => {
  try {
    console.log('Saving job to bookmarks:', jobId);
    
    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/bookmarks`, {
        job_id: jobId,
        profile_id: userId
      });
      
      if (response.status === 201) {
        console.log('Successfully saved to bookmarks via FastAPI:', response.data);
        return { success: true, data: response.data };
      }
    } catch (apiError) {
      console.error('Error saving to bookmarks via FastAPI:', apiError);
    }
    
    // Fall back to direct Supabase method if API fails
    
    // First check if bookmark already exists
    const { data: existingBookmark, error: checkError } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();
    
    if (existingBookmark) {
      console.log('Job already bookmarked:', existingBookmark);
      return { success: true, data: existingBookmark };
    }
    
    // No existing bookmark, insert a new one
    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        profile_id: userId,
        job_id: jobId
      })
      .select()
      .single();
      
    if (error) throw error;
    
    console.log('Successfully saved to bookmarks via Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error saving to bookmarks:', error);
    return { success: false, error };
  }
};

/**
 * Record a swipe (like or dislike)
 */
export const recordSwipe = async (jobId: string, userId: string, direction: 'like' | 'dislike') => {
  try {
    console.log('Recording swipe:', direction, 'for job:', jobId);
    
    // Map the direction to 'right' or 'left' to match the schema constraint
    const dbDirection = direction === 'like' ? 'right' : 'left';
    
    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/swipe`, {
        job_id: jobId,
        profile_id: userId,
        direction: dbDirection
      });
      
      if (response.status === 201) {
        console.log('Successfully recorded swipe via FastAPI:', response.data);
        
        // If it's a "like" swipe, also save to matches for backward compatibility
        if (direction === 'like') {
          await saveToMatches(jobId, userId);
        }
        
        return { success: true, data: response.data };
      }
    } catch (apiError) {
      console.error('Error recording swipe via FastAPI:', apiError);
    }
    
    // Fall back to direct Supabase method if API fails
    const { data, error } = await supabase
      .from('swipes')
      .insert({
        user_id: userId,
        job_id: jobId,
        direction: dbDirection
      })
      .select()
      .single();
      
    if (error) throw error;
    
    // If it's a "like" swipe, also save to matches for backward compatibility
    if (direction === 'like') {
      await saveToMatches(jobId, userId);
    }
    
    console.log('Successfully recorded swipe via Supabase:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error recording swipe:', error);
    return { success: false, error };
  }
};

// Helper function to save to matches table for backward compatibility
const saveToMatches = async (jobId: string, userId: string) => {
  try {
    // Validate that the job exists in the database before creating a match
    const jobExists = await validateJobExists(jobId);
    if (!jobExists) {
      console.error(`Cannot create match: Job ${jobId} does not exist in database`);
      return false;
    }

    // Try using the new FastAPI endpoint
    try {
      const response = await axios.post(`${API_URL}/matches`, {
        job_id: jobId,
        profile_id: userId
      });

      if (response.status === 201) {
        console.log('Successfully saved to matches via FastAPI:', response.data);
        return true;
      }
    } catch (apiError) {
      console.error('Error saving to matches via FastAPI:', apiError);
    }

    // Fall back to direct Supabase method if API fails
    const { error } = await supabase
      .from('matches')
      .insert({
        profile_id: userId,
        job_id: jobId,
        status: 'applying'
      });

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error saving to matches:', error);
    return false;
  }
};

/**
 * Update an application status
 */
export const updateApplicationStatus = async (jobId: string, userId: string, status: string) => {
  try {
    console.log('Updating application status:', status, 'Job ID:', jobId);
    
    const { data, error } = await supabase
      .from('matches')
      .update({
        status: status,
        updated_at: new Date().toISOString()
      })
      .match({ profile_id: userId, job_id: jobId });
      
    if (error) throw error;
    
    return { success: true, message: `Status updated to ${status}` };
  } catch (error) {
    console.error('Error updating application status:', error);
    return { success: false, error };
  }
};

/**
 * Fetch all job applications for a user
 */
export const fetchApplications = async (userId: string) => {
  try {
    console.log('[FETCH] Getting all applications for user ID:', userId);
    
    // Try fetching from API first (with user-specific filtering)
    try {
      const apiEndpoints = [
        'http://10.0.0.9:8000/jobs/applications', // Use the working IP from logs
        'http://localhost:8000/jobs/applications',
        'http://127.0.0.1:8000/jobs/applications',
        'http://10.0.2.2:8000/jobs/applications'
      ];

      let apiData = null;

      // Try each endpoint until we get a successful response
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`[FETCH] Trying to fetch applications from: ${endpoint} for user ${userId}`);
          const url = new URL(endpoint);
          url.searchParams.append('profile_id', userId);

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            apiData = await response.json();
            console.log(`[FETCH] Successfully fetched ${apiData.length} applications from API: ${endpoint} for user ${userId}`);
            break;
          } else {
            console.log(`[FETCH] API returned status ${response.status} from ${endpoint}`);
          }
        } catch (apiError) {
          console.log(`[FETCH] Failed to fetch from ${endpoint}:`, apiError);
        }
      }
      
      if (apiData && Array.isArray(apiData) && apiData.length > 0) {
        console.log(`[FETCH] Found ${apiData.length} applications from API`);
        
        // Convert API data to the expected format
        const applications = apiData.map(app => {
          return {
            job: app.job_data || {
              id: app.job_id,
              title: app.job_data?.title || 'Unknown Job',
              company: app.job_data?.company || 'Unknown Company',
              location: app.job_data?.location || 'Unknown Location',
            },
            status: app.status,
            statusColor: getStatusColor(app.status),
            appliedAt: app.created_at,
          };
        });
        
        console.log(`[FETCH] Returning ${applications.length} total applications from API`);
        return applications;
      }
    } catch (apiError) {
      console.error('[FETCH] Error fetching from API, falling back to Supabase:', apiError);
    }
    
    // Fall back to direct Supabase query if API fails
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select(`
        *,
        jobs:job_id (*)
      `)
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });
      
    console.log('[FETCH] Found matches count:', matches?.length, 'Error:', matchesError);
    
    if (matchesError) {
      console.error('[FETCH] Error getting applications:', matchesError);
      throw matchesError;
    }
    
    if (!matches || matches.length === 0) {
      console.log('[FETCH] No applications found for user');
      return [];
    }
    
    // Log each match for debugging
    matches.forEach((match, index) => {
      console.log(`[FETCH] Match ${index + 1}: ID=${match.id}, Job ID=${match.job_id}, Status=${match.status}`);
      if (match.jobs) {
        console.log(`[FETCH] Match ${index + 1} Job: Title=${match.jobs.title}, Company=${match.jobs.company}`);
      } else {
        console.log(`[FETCH] Match ${index + 1} has no associated job data`);
      }
    });
    
    // Convert matches to the expected format
    const applications = matches.map(match => {
      const app = {
        job: match.jobs || {
          id: match.job_id,
          title: match.metadata?.job_title || 'Unknown Job',
          company: match.metadata?.job_company || 'Unknown Company',
          location: match.metadata?.job_location || 'Unknown Location',
        },
        status: match.status,
        statusColor: getStatusColor(match.status),
        appliedAt: match.created_at,
      };
      
      console.log(`[FETCH] Mapped application: ${app.job.title}, status: ${app.status}`);
      return app;
    });
    
    console.log(`[FETCH] Returning ${applications.length} total applications`);
    return applications;
  } catch (error) {
    console.error('[FETCH] Error fetching applications:', error);
    return [];
  }
};

// Helper to get status color based on status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return '#FFC107'; // Yellow
    case 'applying': return '#FFC107'; // Yellow
    case 'accepted': return '#4CAF50'; // Green
    case 'denied': return '#F44336'; // Red
    case 'responded': return '#2196F3'; // Blue
    default: return '#9E9E9E'; // Grey
  }
};

/**
 * Creates a test job application for debugging
 */
export async function createTestJobApplication(userId: string): Promise<boolean> {
  try {
    console.log('Creating test job application for user:', userId);
    
    // First, get a job from the API
    try {
      // Try to fetch a job from our API
      const jobEndpoints = [
        'http://10.0.0.9:8000/jobs', // Use the working IP from logs
        'http://localhost:8000/jobs',
        'http://127.0.0.1:8000/jobs',
        'http://10.0.2.2:8000/jobs'
      ];
      
      let job = null;
      
      // Try each endpoint until we get a successful response
      for (const endpoint of jobEndpoints) {
        try {
          console.log(`Trying to fetch job from: ${endpoint}`);
          const response = await fetch(endpoint, { 
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              // Pick a random job
              const randomIndex = Math.floor(Math.random() * data.length);
              job = data[randomIndex];
              console.log(`Got test job with ID ${job.id}: ${job.title}`);
              break;
            }
          }
        } catch (error) {
          console.log(`Failed to fetch job from ${endpoint}:`, error);
        }
      }
      
      if (job) {
        // Try to apply to this job via the API
        const applicationEndpoints = [
          'http://10.0.0.9:8000/jobs/applications', // Use the working IP from logs
          'http://localhost:8000/jobs/applications',
          'http://127.0.0.1:8000/jobs/applications',
          'http://10.0.2.2:8000/jobs/applications'
        ];
        
        // Prepare application data
        const applicationData = {
          job_id: job.id,
          user_id: userId,
          job_data: job
        };
        
        // Try each endpoint until we get a successful response
        for (const endpoint of applicationEndpoints) {
          try {
            console.log(`Trying to create test application via: ${endpoint}`);
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(applicationData)
            });
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Successfully created test application: ${data.id}`);
              return true;
            }
          } catch (error) {
            console.log(`Failed to create test application via ${endpoint}:`, error);
          }
        }
      }
    } catch (apiError) {
      console.error('Error creating test application via API:', apiError);
    }
    
    // Fall back to Supabase if API fails
    // Find existing jobs instead of creating one (due to RLS)
    const { data: existingJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title')
      .limit(10); // Get multiple jobs to choose from
      
    if (jobsError) {
      console.error('Error finding jobs:', jobsError);
      return false;
    }
    
    if (!existingJobs || existingJobs.length === 0) {
      console.error('No jobs found in the database.');
      return false;
    }
    
    // Choose a random job instead of always using the first one
    const randomIndex = Math.floor(Math.random() * existingJobs.length);
    const jobId = existingJobs[randomIndex].id;
    console.log('Using random job with ID:', jobId, 'Title:', existingJobs[randomIndex].title);
    
    // Check if this job has already been applied to
    const { data: existingApplication, error: checkError } = await supabase
      .from('matches')
      .select('job_id')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .single();
      
    if (!checkError && existingApplication) {
      console.log('Already applied to this job, choosing another');
      // Try again with a different job if possible
      if (existingJobs.length > 1) {
        const newIndex = (randomIndex + 1) % existingJobs.length;
        const newJobId = existingJobs[newIndex].id;
        console.log('Trying alternate job with ID:', newJobId, 'Title:', existingJobs[newIndex].title);
        
        const { data, error } = await supabase
          .from('matches')
          .insert({
            profile_id: userId,
            job_id: newJobId,
            status: 'pending'
          })
          .select()
          .single();
          
        if (error) {
          console.error('Error creating test job application with alternate job:', error);
          return false;
        }
        
        console.log('Successfully created test job application with alternate job:', data);
        return true;
      }
    }
    
    // Create a job application using the selected job
    const { data, error } = await supabase
      .from('matches')
      .insert({
        profile_id: userId,
        job_id: jobId,
        status: 'pending'
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error creating test job application:', error);
      return false;
    }
    
    console.log('Successfully created test job application:', data);
    return true;
  } catch (error) {
    console.error('Error in createTestJobApplication:', error);
    return false;
  }
}

/**
 * Import jobs from the API into the Supabase database
 */
export async function importJobsFromAPI(): Promise<{ success: boolean, count: number }> {
  try {
    console.log('Importing jobs from API to database...');
    
    // Use the known working endpoint
    const endpoint = 'http://10.0.0.190:8000/jobs/';
    
    try {
      console.log(`Fetching jobs from: ${endpoint}`);
      
      // Configure headers
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      const response = await axios.get(endpoint, { 
        timeout: 8000,
        headers
      });
      
      let jobsData = null;
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        jobsData = response.data;
        console.log(`Received array of ${response.data.length} items from API`);
      } else if (response.data && typeof response.data === 'object') {
        if (response.data.data && Array.isArray(response.data.data)) {
          jobsData = response.data.data;
        } else if (response.data.jobs && Array.isArray(response.data.jobs)) {
          jobsData = response.data.jobs;
        }
      }
      
      if (!jobsData || !Array.isArray(jobsData) || jobsData.length === 0) {
        console.log('No valid job data returned from API, using fallback data');
        
        // Try to load from the local fallback JSON
        try {
          const fallbackData = require('../jobs-fallback.json');
          if (fallbackData && Array.isArray(fallbackData) && fallbackData.length > 0) {
            jobsData = fallbackData;
            console.log('Successfully loaded jobs from fallback JSON file');
          }
        } catch (fallbackError) {
          console.log('Failed to load fallback JSON:', fallbackError);
          return { success: false, count: 0 };
        }
      }
      
      if (!jobsData || !Array.isArray(jobsData) || jobsData.length === 0) {
        return { success: false, count: 0 };
      }
      
      // Prepare jobs for Supabase - only take the first 5 to avoid too many
      const jobsToImport = jobsData.slice(0, 5).map(job => ({
        title: job.title || 'Unknown Job',
        company: job.company || 'Unknown Company',
        location: job.location || 'Remote',
        description: job.description || '',
        salary: job.salary || job.pay || null,
      }));
      
      // Try to insert just one job to test if we have permissions
      const { error: testError } = await supabase
        .from('jobs')
        .insert([jobsToImport[0]])
        .select();
        
      if (testError) {
        console.error("RLS restrictions prevent job creation:", testError);
        console.log("Checking if jobs already exist to use...");
        
        // Check if jobs already exist in the database
        const { data: existingJobs } = await supabase
          .from('jobs')
          .select('id')
          .limit(1);
          
        if (existingJobs && existingJobs.length > 0) {
          console.log("Found existing jobs, you can use these for applications");
          return { success: true, count: 1 };
        } else {
          console.error("No jobs exist and you don't have permission to create them");
          return { success: false, count: 0 };
        }
      }
      
      // If test succeeded, proceed with rest of jobs
      const { data, error } = await supabase
        .from('jobs')
        .insert(jobsToImport.slice(1))
        .select();
        
      if (error) {
        console.error('Error importing additional jobs to database:', error);
        return { success: true, count: 1 }; // We already inserted one job successfully
      }
      
      const totalCount = 1 + (data?.length || 0);
      console.log(`Successfully imported ${totalCount} jobs to database`);
      return { success: true, count: totalCount };
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return { success: false, count: 0 };
    }
  } catch (error) {
    console.error('Error in importJobsFromAPI:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Creates a mock job application with embedded job data and a unique email
 * This bypasses the need for the jobs table by storing job info directly
 */
export async function createMockApplication(userId: string): Promise<boolean> {
  try {
    console.log('Creating mock application with embedded job data...');
    
    // First, check if a mock application already exists
    const { data: existingApps, error: checkError } = await supabase
      .from('matches')
      .select('job_id')
      .eq('profile_id', userId);
    
    // Get a list of job IDs that the user has already applied to
    const appliedJobIds = existingApps ? existingApps.map(app => app.job_id) : [];
    console.log(`User has already applied to ${appliedJobIds.length} jobs:`, appliedJobIds);
    
    // Fetch all available jobs to choose from
    const { data: availableJobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, title, company, location, description, salary, url')
      .limit(20);
      
    if (jobsError || !availableJobs || availableJobs.length === 0) {
      console.log('No jobs available to apply to');
      return false;
    }
    
    // Filter out jobs that the user has already applied to
    const unappliedJobs = availableJobs.filter(job => !appliedJobIds.includes(job.id));
    
    if (unappliedJobs.length === 0) {
      console.log('User has already applied to all available jobs');
      return false;
    }
    
    // Choose a random job from the available unapplied jobs
    const randomIndex = Math.floor(Math.random() * unappliedJobs.length);
    const selectedJob = unappliedJobs[randomIndex];
    
    console.log(`Applying to job: ${selectedJob.id} - ${selectedJob.title}`);
    
    // Generate a cover letter
    const coverLetter = `Dear ${selectedJob.company} Hiring Team,

I am writing to express my interest in the ${selectedJob.title} position at ${selectedJob.company}. With my skills and experience, I believe I would be a great fit for this role.

${selectedJob.description ? 'I was particularly drawn to ' + selectedJob.description.substring(0, 100) + '...' : 'I am excited about the opportunity to contribute to your team.'}

Thank you for considering my application. I look forward to the opportunity to discuss how my background, skills, and experience can be beneficial to ${selectedJob.company}.

Sincerely,
[Applicant Name]`;

    // Generate a unique application email
    const applicationEmail = await generateApplicationEmail(userId, selectedJob.id);
    
    // Create a job application with the selected job
    const { data, error } = await supabase
      .from('matches')
      .insert({
        profile_id: userId,
        job_id: selectedJob.id,
        status: 'pending',
        cover_letter: coverLetter,
        application_email: applicationEmail,
        metadata: {
          job_title: selectedJob.title,
          job_company: selectedJob.company,
          job_location: selectedJob.location,
          job_salary: selectedJob.salary,
          job_url: selectedJob.url,
          applied_at: new Date().toISOString(),
          source: 'mock-application'
        }
      })
      .select();
      
    if (error) {
      console.error('Error creating mock application:', error);
      return false;
    }
    
    console.log('Successfully created mock application:', data);
    return true;
  } catch (error) {
    console.error('Error in createMockApplication:', error);
    return false;
  }
}

/**
 * Get a list of job IDs that a user has already applied to
 * This is useful for debugging purposes
 */
export async function getAppliedJobIds(userId: string): Promise<string[]> {
  try {
    console.log('[DEBUG] Checking jobs user has already applied to');
    
    const { data, error } = await supabase
      .from('matches')
      .select('job_id')
      .eq('profile_id', userId);
      
    if (error) {
      console.error('[ERROR] Failed to get applied job IDs:', error);
      return [];
    }
    
    const jobIds = data.map(match => match.job_id);
    console.log(`[DEBUG] User has applied to ${jobIds.length} jobs:`, jobIds);
    
    return jobIds;
  } catch (error) {
    console.error('[ERROR] Error in getAppliedJobIds:', error);
    return [];
  }
}

/**
 * Apply to a job on behalf of a user (admin function)
 */
export async function applyOnBehalfOfUser(jobId: string, userId: string, coverLetter?: string): Promise<any> {
  try {
    console.log(`[ADMIN] Applying to job ${jobId} on behalf of user ${userId}`);
    
    // Check if the user has already applied to this job
    const { data: existingApp } = await supabase
      .from('matches')
      .select('id')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();
      
    if (existingApp) {
      console.log('[ADMIN] User has already applied to this job');
      return { success: false, error: 'User has already applied to this job', existingApplication: existingApp };
    }
    
    // Generate a unique application email
    const applicationEmail = await generateApplicationEmail(userId, jobId);
    
    // Get job details for better metadata
    const { data: jobData } = await supabase
      .from('jobs')
      .select('title, company, location, url')
      .eq('id', jobId)
      .single();
    
    // Create the application
    const { data, error } = await supabase
      .from('matches')
      .insert({
        profile_id: userId,
        job_id: jobId,
        status: 'applying',
        cover_letter: coverLetter || '',
        application_email: applicationEmail,
        metadata: {
          applied_at: new Date().toISOString(),
          source: 'admin-application',
          job_title: jobData?.title,
          job_company: jobData?.company,
          job_location: jobData?.location,
          job_url: jobData?.url
        }
      })
      .select();
      
    if (error) {
      console.error('[ADMIN] Error applying on behalf of user:', error);
      return { success: false, error };
    }
    
    console.log('[ADMIN] Successfully applied on behalf of user:', data);
    return { success: true, data, applicationEmail };
  } catch (error) {
    console.error('[ADMIN] Error in applyOnBehalfOfUser:', error);
    return { success: false, error };
  }
}

/**
 * Get detailed application data including cover letters and application emails
 * SECURITY: userId is REQUIRED - never return all users' data
 */
export async function getDetailedApplications(userId: string): Promise<any[]> {
  try {
    // SECURITY: Always require userId - never return all applications
    if (!userId) {
      console.error('SECURITY ERROR: getDetailedApplications called without userId');
      throw new Error('User ID is required for security');
    }

    const { data, error } = await supabase
      .from('application_data') // Using the view we created
      .select('*')
      .eq('profile_id', userId) // ALWAYS filter by user
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting detailed applications:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getDetailedApplications:', error);
    return [];
  }
}
