/**
 * Job Recommendation Service
 * Implements personalized job filtering and recommendation algorithm
 */

import { supabase } from '@/lib/supabase';
import { Job } from '@/context/AppContext';

// Types for user preferences
export interface UserJobPreferences {
  id?: string;
  user_id: string;
  
  // Location preferences
  preferred_locations: string[];
  max_commute_distance: number;
  remote_work_preference: 'required' | 'preferred' | 'acceptable' | 'not_preferred';
  willing_to_relocate: boolean;
  
  // Job type preferences
  preferred_job_types: string[];
  preferred_industries: string[];
  preferred_company_sizes: string[];
  
  // Experience and role preferences
  experience_level: 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  preferred_roles: string[];
  
  // Compensation preferences
  min_salary?: number;
  max_salary?: number;
  salary_currency: string;
  salary_negotiable: boolean;
  
  // Work schedule preferences
  preferred_schedule: 'flexible' | 'standard' | 'shift_work' | 'weekends_ok';
  
  // Preference weights (for scoring algorithm)
  location_weight: number;
  salary_weight: number;
  role_weight: number;
  company_weight: number;
  
  // Learning preferences
  auto_learn_from_swipes: boolean;
}

export interface JobRecommendation {
  job: Job;
  overall_score: number;
  location_score: number;
  salary_score: number;
  role_score: number;
  company_score: number;
  recommendation_reason: string;
}

export interface JobMatchingResult {
  recommendations: JobRecommendation[];
  total_jobs_analyzed: number;
  filtered_jobs_count: number;
  algorithm_version: string;
}

/**
 * Get user's job preferences
 */
export const getUserJobPreferences = async (userId: string): Promise<UserJobPreferences | null> => {
  try {
    const { data, error } = await supabase
      .from('user_job_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found - return null
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user job preferences:', error);
    return null;
  }
};

/**
 * Save or update user's job preferences
 */
export const saveUserJobPreferences = async (preferences: UserJobPreferences): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_job_preferences')
      .upsert(preferences, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving user job preferences:', error);
    return false;
  }
};

/**
 * Calculate location score based on user preferences
 */
const calculateLocationScore = (job: Job, preferences: UserJobPreferences): number => {
  let score = 0;

  // Check if job is remote with more comprehensive detection
  const isRemote = job.location.toLowerCase().includes('remote') ||
                   job.location.toLowerCase().includes('work from home') ||
                   job.location.toLowerCase().includes('anywhere') ||
                   job.location.toLowerCase().includes('wfh') ||
                   job.tags.some(tag =>
                     tag.toLowerCase().includes('remote') ||
                     tag.toLowerCase().includes('work from home') ||
                     tag.toLowerCase().includes('wfh')
                   );

  if (isRemote) {
    switch (preferences.remote_work_preference) {
      case 'required':
        score = 100;
        break;
      case 'preferred':
        score = 95;
        break;
      case 'acceptable':
        score = 75;
        break;
      case 'not_preferred':
        score = 35;
        break;
    }
  } else {
    // Enhanced location matching with fuzzy matching
    const jobLocation = job.location.toLowerCase();
    let locationMatch = false;
    let bestMatchScore = 0;

    for (const preferredLoc of preferences.preferred_locations) {
      const prefLoc = preferredLoc.toLowerCase();

      // Exact match (highest score)
      if (jobLocation.includes(prefLoc) || prefLoc.includes(jobLocation)) {
        locationMatch = true;
        bestMatchScore = Math.max(bestMatchScore, 95);
      }
      // City match (extract city from "City, State" format)
      else if (jobLocation && prefLoc && jobLocation.split(',')[0].trim() === prefLoc.split(',')[0].trim()) {
        locationMatch = true;
        bestMatchScore = Math.max(bestMatchScore, 85);
      }
      // State/region match
      else if (jobLocation && prefLoc && jobLocation.includes(prefLoc.split(',').pop()?.trim() || '')) {
        locationMatch = true;
        bestMatchScore = Math.max(bestMatchScore, 65);
      }
      // Partial word match (e.g., "San Francisco" matches "San Fran")
      else if (jobLocation && prefLoc) {
        const jobWords = jobLocation.split(/[\s,]+/);
        const prefWords = prefLoc.split(/[\s,]+/);
        const matchingWords = jobWords.filter(word =>
          prefWords.some(prefWord =>
            word.includes(prefWord) || prefWord.includes(word)
          )
        );
        if (matchingWords.length >= Math.min(2, prefWords.length)) {
          locationMatch = true;
          bestMatchScore = Math.max(bestMatchScore, 70);
        }
      }
    }

    if (locationMatch) {
      score = bestMatchScore;
    } else if (preferences.willing_to_relocate) {
      score = 55;
    } else {
      score = 25;
    }

    // Apply penalty for strong remote preference but non-remote job
    if (preferences.remote_work_preference === 'required') {
      score = Math.max(0, score - 50);
    } else if (preferences.remote_work_preference === 'preferred') {
      score = Math.max(0, score - 20);
    }
  }

  return Math.min(100, Math.max(0, score));
};

/**
 * Calculate salary score based on user preferences
 */
const calculateSalaryScore = (job: Job, preferences: UserJobPreferences): number => {
  // Extract salary range from job.pay string
  const salaryMatch = job.pay.match(/\$?(\d+(?:,\d+)?(?:k|K)?)\s*-?\s*\$?(\d+(?:,\d+)?(?:k|K)?)?/);
  
  if (!salaryMatch) {
    // No salary info available
    return 50; // Neutral score
  }
  
  // Parse salary values
  const parseAmount = (amount: string): number => {
    const cleaned = amount.replace(/[,$]/g, '');
    const num = parseInt(cleaned);
    return cleaned.toLowerCase().includes('k') ? num * 1000 : num;
  };
  
  const minSalary = parseAmount(salaryMatch[1]);
  const maxSalary = salaryMatch[2] ? parseAmount(salaryMatch[2]) : minSalary;
  
  // Calculate score based on overlap with user's salary range
  if (!preferences.min_salary && !preferences.max_salary) {
    return 50; // No preference set
  }
  
  const userMin = preferences.min_salary || 0;
  const userMax = preferences.max_salary || Infinity;
  
  // Check for overlap
  if (maxSalary < userMin) {
    return 10; // Too low
  } else if (minSalary > userMax) {
    return preferences.salary_negotiable ? 40 : 10; // Too high, but negotiable
  } else {
    // Calculate overlap percentage
    const overlapStart = Math.max(minSalary, userMin);
    const overlapEnd = Math.min(maxSalary, userMax);
    const overlapSize = overlapEnd - overlapStart;
    const userRangeSize = userMax - userMin;
    const jobRangeSize = maxSalary - minSalary;
    
    const overlapPercentage = overlapSize / Math.min(userRangeSize, jobRangeSize);
    return Math.min(100, 60 + (overlapPercentage * 40));
  }
};

/**
 * Calculate role score based on user preferences
 */
const calculateRoleScore = (job: Job, preferences: UserJobPreferences): number => {
  let score = 0;

  // Enhanced job title matching with fuzzy logic
  const jobTitle = (job.title || '').toLowerCase();
  const jobTitleWords = jobTitle.split(/[\s\-_]+/);

  let bestRoleMatch = 0;
  for (const role of preferences.preferred_roles) {
    const roleWords = role.toLowerCase().split(/[\s\-_]+/);

    // Exact title match
    if (jobTitle.includes(role.toLowerCase()) || role.toLowerCase().includes(jobTitle)) {
      bestRoleMatch = Math.max(bestRoleMatch, 90);
    }
    // Key word matching
    else {
      const matchingWords = jobTitleWords.filter(word =>
        roleWords.some(roleWord =>
          word.includes(roleWord) || roleWord.includes(word) ||
          // Handle common abbreviations
          (word === 'dev' && roleWord === 'developer') ||
          (word === 'developer' && roleWord === 'dev') ||
          (word === 'eng' && roleWord === 'engineer') ||
          (word === 'engineer' && roleWord === 'eng') ||
          (word === 'mgr' && roleWord === 'manager') ||
          (word === 'manager' && roleWord === 'mgr')
        )
      );

      if (matchingWords.length > 0) {
        const matchRatio = matchingWords.length / Math.max(jobTitleWords.length, roleWords.length);
        bestRoleMatch = Math.max(bestRoleMatch, 40 + (matchRatio * 40));
      }
    }
  }

  score += bestRoleMatch;

  // Enhanced tag matching with weighted scoring
  let tagScore = 0;
  const relevantTags = job.tags.filter(tag => {
    const tagLower = tag.toLowerCase();
    return preferences.preferred_roles.some(role =>
      tagLower.includes(role.toLowerCase()) || role.toLowerCase().includes(tagLower)
    ) ||
    preferences.preferred_industries.some(industry =>
      tagLower.includes(industry.toLowerCase()) || industry.toLowerCase().includes(tagLower)
    ) ||
    preferences.preferred_job_types.some(type =>
      tagLower.includes(type.toLowerCase()) || type.toLowerCase().includes(tagLower)
    );
  });

  if (relevantTags.length > 0) {
    tagScore = Math.min(25, relevantTags.length * 8); // Up to 25 points for relevant tags
  }

  score += tagScore;

  // Experience level matching
  const experienceKeywords = {
    'entry': ['entry', 'junior', 'associate', 'trainee', 'graduate', 'intern'],
    'junior': ['junior', 'associate', 'entry', '1-2 years', 'early career'],
    'mid': ['mid', 'intermediate', 'experienced', '3-5 years', 'regular'],
    'senior': ['senior', 'lead', 'principal', 'expert', '5+ years', 'advanced'],
    'lead': ['lead', 'principal', 'staff', 'architect', 'head', 'chief'],
    'executive': ['director', 'vp', 'cto', 'ceo', 'executive', 'head of']
  };

  const userLevel = preferences.experience_level;
  const levelKeywords = experienceKeywords[userLevel] || [];

  const hasLevelMatch = levelKeywords.some(keyword =>
    jobTitle.includes(keyword) ||
    job.tags.some(tag => tag.toLowerCase().includes(keyword))
  );

  if (hasLevelMatch) {
    score += 15;
  }

  // Base score for any job (reduced since we have more specific scoring now)
  score += 5;

  return Math.min(100, Math.max(0, score));
};

/**
 * Calculate company score based on user preferences
 */
const calculateCompanyScore = (job: Job, preferences: UserJobPreferences): number => {
  // This is a simplified implementation
  // In a real system, you'd have company data including size, industry, etc.
  
  let score = 50; // Base score
  
  // Check if company name suggests size (very basic heuristic)
  const companyName = job.company.toLowerCase();
  
  if (preferences.preferred_company_sizes.includes('startup') && 
      (companyName.includes('startup') || companyName.includes('labs'))) {
    score += 30;
  }
  
  if (preferences.preferred_company_sizes.includes('large') && 
      (companyName.includes('corp') || companyName.includes('inc') || 
       companyName.includes('ltd') || companyName.includes('llc'))) {
    score += 20;
  }
  
  return Math.min(100, score);
};

/**
 * Calculate overall job match score
 */
export const calculateJobMatchScore = (job: Job, preferences: UserJobPreferences): JobRecommendation => {
  const locationScore = calculateLocationScore(job, preferences);
  const salaryScore = calculateSalaryScore(job, preferences);
  const roleScore = calculateRoleScore(job, preferences);
  const companyScore = calculateCompanyScore(job, preferences);
  
  // Calculate weighted overall score
  const overallScore = (
    locationScore * preferences.location_weight +
    salaryScore * preferences.salary_weight +
    roleScore * preferences.role_weight +
    companyScore * preferences.company_weight
  );
  
  // Generate recommendation reason
  const reasons = [];
  if (locationScore > 80) reasons.push('great location match');
  if (salaryScore > 80) reasons.push('salary fits your range');
  if (roleScore > 80) reasons.push('matches your role preferences');
  if (companyScore > 70) reasons.push('good company fit');
  
  const recommendation_reason = reasons.length > 0 
    ? `Recommended because: ${reasons.join(', ')}`
    : 'General match based on your preferences';
  
  return {
    job,
    overall_score: Math.round(overallScore * 100) / 100,
    location_score: Math.round(locationScore * 100) / 100,
    salary_score: Math.round(salaryScore * 100) / 100,
    role_score: Math.round(roleScore * 100) / 100,
    company_score: Math.round(companyScore * 100) / 100,
    recommendation_reason
  };
};

/**
 * Get personalized job recommendations for a user
 */
export const getPersonalizedJobRecommendations = async (
  userId: string,
  jobs: Job[],
  minScore: number = 35
): Promise<JobMatchingResult> => {
  try {
    console.log(`Getting personalized recommendations for user ${userId} with ${jobs.length} jobs`);

    // Get user preferences with better error handling
    const preferences = await getUserJobPreferences(userId);

    if (!preferences) {
      console.log('No user preferences found, showing all jobs');
      // Return all jobs with neutral scoring if no preferences set
      const defaultRecommendations = jobs.map(job => ({
        job,
        overall_score: 50,
        location_score: 50,
        salary_score: 50,
        role_score: 50,
        company_score: 50,
        recommendation_reason: 'Complete your job preferences for personalized recommendations'
      }));

      return {
        recommendations: defaultRecommendations,
        total_jobs_analyzed: jobs.length,
        filtered_jobs_count: jobs.length,
        algorithm_version: 'v1.1-default'
      };
    }

    console.log(`Found user preferences, generating personalized recommendations...`);

    // Get user's previous swipes for learning
    const { data: swipeHistory } = await supabase
      .from('swipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100); // Get recent swipe history

    // Calculate scores for all jobs
    const scoredJobs = jobs.map(job => calculateJobMatchScore(job, preferences));

    // Apply learning from swipe history if enabled
    let adjustedJobs = scoredJobs;
    if (preferences.auto_learn_from_swipes && swipeHistory && swipeHistory.length > 0) {
      adjustedJobs = applySwipeLearning(scoredJobs, swipeHistory);
    }

    // Filter jobs that meet minimum score threshold
    const filteredJobs = adjustedJobs.filter(rec => rec.overall_score >= minScore);

    // Sort by overall score (highest first)
    const sortedRecommendations = filteredJobs.sort((a, b) => b.overall_score - a.overall_score);

    // Save recommendations to database for analytics
    await saveRecommendationsToDatabase(userId, sortedRecommendations);

    console.log(`Generated ${sortedRecommendations.length} recommendations from ${jobs.length} jobs`);

    return {
      recommendations: sortedRecommendations,
      total_jobs_analyzed: jobs.length,
      filtered_jobs_count: sortedRecommendations.length,
      algorithm_version: 'v1.1-enhanced'
    };

  } catch (error) {
    console.error('Error generating personalized recommendations:', error);

    // Fallback to returning all jobs with neutral scoring
    const fallbackRecommendations = jobs.map(job => ({
      job,
      overall_score: 50,
      location_score: 50,
      salary_score: 50,
      role_score: 50,
      company_score: 50,
      recommendation_reason: 'Error in recommendation system - showing all jobs'
    }));

    return {
      recommendations: fallbackRecommendations,
      total_jobs_analyzed: jobs.length,
      filtered_jobs_count: jobs.length,
      algorithm_version: 'v1.1-fallback'
    };
  }
};

/**
 * Apply machine learning from user's swipe history
 */
const applySwipeLearning = (
  recommendations: JobRecommendation[],
  swipeHistory: any[]
): JobRecommendation[] => {
  // Analyze patterns in liked vs disliked jobs
  const likedJobs = swipeHistory.filter(swipe => swipe.direction === 'right');
  const dislikedJobs = swipeHistory.filter(swipe => swipe.direction === 'left');

  if (likedJobs.length === 0) {
    return recommendations; // No learning data available
  }

  // Calculate preference adjustments based on swipe patterns
  const learningAdjustments = calculateLearningAdjustments(likedJobs, dislikedJobs);

  // Apply adjustments to recommendations
  return recommendations.map(rec => {
    let adjustedScore = rec.overall_score;

    // Apply learned preferences
    if (learningAdjustments.preferredCompanies.includes(rec.job.company.toLowerCase())) {
      adjustedScore += 10;
    }

    if (learningAdjustments.preferredLocations.some(loc =>
      rec.job.location.toLowerCase().includes(loc))) {
      adjustedScore += 8;
    }

    if (learningAdjustments.preferredTags.some(tag =>
      rec.job.tags.some(jobTag => jobTag.toLowerCase().includes(tag)))) {
      adjustedScore += 5;
    }

    // Apply negative adjustments for disliked patterns
    if (learningAdjustments.dislikedCompanies.includes(rec.job.company.toLowerCase())) {
      adjustedScore -= 15;
    }

    if (learningAdjustments.dislikedLocations.some(loc =>
      rec.job.location.toLowerCase().includes(loc))) {
      adjustedScore -= 10;
    }

    return {
      ...rec,
      overall_score: Math.max(0, Math.min(100, adjustedScore)),
      recommendation_reason: adjustedScore !== rec.overall_score
        ? `${rec.recommendation_reason} (adjusted based on your preferences)`
        : rec.recommendation_reason
    };
  });
};

/**
 * Calculate learning adjustments from swipe history
 */
const calculateLearningAdjustments = (likedJobs: any[], dislikedJobs: any[]) => {
  const preferredCompanies = [...new Set(likedJobs.map(job => job.job_company?.toLowerCase()).filter(Boolean))];
  const preferredLocations = [...new Set(likedJobs.map(job => job.job_location?.toLowerCase()).filter(Boolean))];
  const preferredTags = [...new Set(likedJobs.flatMap(job => job.job_tags || []).map(tag => tag.toLowerCase()))];

  const dislikedCompanies = [...new Set(dislikedJobs.map(job => job.job_company?.toLowerCase()).filter(Boolean))];
  const dislikedLocations = [...new Set(dislikedJobs.map(job => job.job_location?.toLowerCase()).filter(Boolean))];

  return {
    preferredCompanies,
    preferredLocations,
    preferredTags,
    dislikedCompanies,
    dislikedLocations
  };
};

/**
 * Save recommendations to database for analytics
 */
const saveRecommendationsToDatabase = async (
  userId: string,
  recommendations: JobRecommendation[]
): Promise<void> => {
  try {
    // Only save top 50 recommendations to avoid database bloat
    const topRecommendations = recommendations.slice(0, 50);

    const recommendationRecords = topRecommendations.map(rec => {
      return {
        user_id: userId,
        job_id: rec.job.id, // Keep as string/UUID, don't convert to integer
        overall_score: rec.overall_score,
        location_score: rec.location_score,
        salary_score: rec.salary_score,
        role_score: rec.role_score,
        company_score: rec.company_score,
        algorithm_version: 'v1.1',
        recommendation_reason: rec.recommendation_reason
      };
    });

    // Deduplicate records by user and job to avoid upsert errors
    const uniqueRecords = Array.from(
      new Map(
        recommendationRecords.map(rec => [
          `${rec.user_id}-${rec.job_id}`,
          rec
        ])
      ).values()
    );

    // Use upsert to handle duplicates
    const { error } = await supabase
      .from('job_recommendations')
      .upsert(uniqueRecords, {
        onConflict: 'user_id,job_id'
      });

    if (error) {
      console.error('Error saving recommendations to database:', error);
    }
  } catch (error) {
    console.error('Error in saveRecommendationsToDatabase:', error);
  }
};

/**
 * Record user interaction with a recommendation
 */
export const recordRecommendationInteraction = async (
  userId: string,
  jobId: string,
  interaction: {
    was_viewed?: boolean;
    was_swiped?: boolean;
    swipe_direction?: 'left' | 'right';
    was_applied?: boolean;
  }
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('job_recommendations')
      .update({
        ...interaction,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('job_id', jobId); // Keep as string, don't parse as integer

    if (error) {
      console.error('Error recording recommendation interaction:', error);
    }
  } catch (error) {
    console.error('Error in recordRecommendationInteraction:', error);
  }
};

/**
 * Enhanced swipe recording with job details for learning
 */
export const recordEnhancedSwipe = async (
  userId: string,
  job: Job,
  direction: 'left' | 'right',
  matchScore?: number
): Promise<void> => {
  try {
    // Extract salary range from job.pay
    const salaryMatch = job.pay.match(/\$?(\d+(?:,\d+)?(?:k|K)?)\s*-?\s*\$?(\d+(?:,\d+)?(?:k|K)?)?/);
    let minSalary = null;
    let maxSalary = null;

    if (salaryMatch) {
      const parseAmount = (amount: string): number => {
        const cleaned = amount.replace(/[,$]/g, '');
        const num = parseInt(cleaned);
        return cleaned.toLowerCase().includes('k') ? num * 1000 : num;
      };

      minSalary = parseAmount(salaryMatch[1]);
      maxSalary = salaryMatch[2] ? parseAmount(salaryMatch[2]) : minSalary;
    }

    const swipeRecord = {
      user_id: userId,
      job_id: job.id, // Keep as string/UUID, don't parse as integer
      direction,
      job_title: job.title,
      job_company: job.company,
      job_location: job.location,
      job_salary_min: minSalary,
      job_salary_max: maxSalary,
      job_type: job.tags.find(tag =>
        ['full-time', 'part-time', 'contract', 'freelance'].includes(tag.toLowerCase())
      ) || null,
      job_remote: job.location.toLowerCase().includes('remote') ||
                  job.tags.some(tag => tag.toLowerCase().includes('remote')),
      job_tags: job.tags,
      match_score: matchScore
    };

    const { error } = await supabase
      .from('swipes')
      .upsert(swipeRecord, {
        onConflict: 'user_id,job_id'
      });

    if (error) {
      console.error('Error recording enhanced swipe:', error);
    }

    // Also record the interaction in recommendations table
    await recordRecommendationInteraction(userId, job.id, {
      was_swiped: true,
      swipe_direction: direction
    });

  } catch (error) {
    console.error('Error in recordEnhancedSwipe:', error);
  }
};

/**
 * Get default user preferences for new users
 */
export const getDefaultUserPreferences = (userId: string): UserJobPreferences => {
  return {
    user_id: userId,
    preferred_locations: [],
    max_commute_distance: 50,
    remote_work_preference: 'preferred',
    willing_to_relocate: false,
    preferred_job_types: ['Full-time'],
    preferred_industries: [],
    preferred_company_sizes: [],
    experience_level: 'mid',
    preferred_roles: [],
    salary_currency: 'USD',
    salary_negotiable: true,
    preferred_schedule: 'flexible',
    location_weight: 0.25,
    salary_weight: 0.30,
    role_weight: 0.25,
    company_weight: 0.20,
    auto_learn_from_swipes: true
  };
};
