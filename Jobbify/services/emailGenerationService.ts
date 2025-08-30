/**
 * Email Generation Service
 * 
 * This service provides functionality to generate unique application-specific 
 * emails for users to apply to jobs with a unique identity for each application.
 */
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

/**
 * Email generation options
 */
interface EmailGenerationOptions {
  // Base domain to use for generated emails
  domain?: string;
  // Custom prefix for the email (defaults to username/first part of user's email)
  customPrefix?: string;
}

/**
 * Default email generation domain
 */
const DEFAULT_DOMAIN = 'jobbify-apply.com';

/**
 * Generate a unique application-specific email for a user
 * 
 * @param userId The user's ID
 * @param jobId The job ID being applied to
 * @param options Optional configuration for email generation
 * @returns A unique email address for the application
 */
export async function generateApplicationEmail(
  userId: string,
  jobId: string,
  options: EmailGenerationOptions = {}
): Promise<string> {
  try {
    // Check if an email was already generated for this user and job
    const { data: existingEmail } = await supabase
      .from('application_emails')
      .select('email')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingEmail?.email) {
      console.log(`Using existing application email: ${existingEmail.email}`);
      return existingEmail.email;
    }

    // Get user info to generate a personalized prefix
    const { data: userData } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .single();

    // Generate a prefix based on available info
    let prefix = '';
    if (options.customPrefix) {
      prefix = options.customPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else if (userData?.email) {
      // Use first part of user's email as default
      prefix = userData.email.split('@')[0].toLowerCase();
    } else if (userData?.name) {
      // Fall back to user's name with no spaces
      prefix = userData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    } else {
      // Last resort: use "applicant" as prefix
      prefix = 'applicant';
    }

    // Create a unique identifier for this specific application
    const uniqueId = nanoid(8).toLowerCase();

    // Create a job-specific suffix (truncated job ID to keep email reasonable length)
    const jobSuffix = jobId.toString().slice(0, 8).replace(/[^a-z0-9]/g, '');

    // Generate the email
    const domain = options.domain || DEFAULT_DOMAIN;
    const email = `${prefix}.${jobSuffix}.${uniqueId}@${domain}`;

    // Store the generated email in the database
    await supabase.from('application_emails').insert({
      profile_id: userId,
      job_id: jobId,
      email: email,
      created_at: new Date().toISOString()
    });

    console.log(`Generated new application email: ${email}`);
    return email;
  } catch (error) {
    console.error('Error generating application email:', error);
    // Fallback to a generic format if there's an error
    const fallbackEmail = `applicant.${userId.slice(0, 8)}.${jobId.slice(0, 8)}@${options.domain || DEFAULT_DOMAIN}`;
    return fallbackEmail;
  }
}

/**
 * List all application emails for a user
 */
export async function listUserApplicationEmails(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('application_emails')
      .select(`
        email, 
        created_at,
        job_id,
        jobs(title, company)
      `)
      .eq('profile_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error listing application emails:', error);
    return [];
  }
}

/**
 * Get the application email for a specific user and job
 */
export async function getApplicationEmail(userId: string, jobId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('application_emails')
      .select('email')
      .eq('profile_id', userId)
      .eq('job_id', jobId)
      .maybeSingle();

    return data?.email || null;
  } catch (error) {
    console.error('Error getting application email:', error);
    return null;
  }
}
