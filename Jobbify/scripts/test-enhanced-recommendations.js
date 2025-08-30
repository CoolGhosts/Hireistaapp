#!/usr/bin/env node

/**
 * Enhanced Test Script for Job Recommendation Algorithm v1.1
 * Tests the improved scoring algorithms and edge cases
 */

console.log('🧪 Testing Enhanced Job Recommendation Algorithm v1.1\n');

// Enhanced mock data for comprehensive testing
const mockJobs = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc',
    location: 'San Francisco, CA',
    pay: '$120k - $160k',
    tags: ['Full-time', 'JavaScript', 'React', 'Node.js', 'Remote-friendly']
  },
  {
    id: '2', 
    title: 'Frontend Developer',
    company: 'StartupLabs',
    location: 'Remote',
    pay: '$80k - $110k',
    tags: ['Full-time', 'React', 'TypeScript', 'Remote']
  },
  {
    id: '3',
    title: 'DevOps Engineer',
    company: 'CloudTech LLC',
    location: 'Austin, TX',
    pay: '$100k - $140k',
    tags: ['Full-time', 'AWS', 'Docker', 'Kubernetes']
  },
  {
    id: '4',
    title: 'Junior Web Developer',
    company: 'WebSolutions',
    location: 'New York, NY', 
    pay: '$60k - $80k',
    tags: ['Full-time', 'HTML', 'CSS', 'JavaScript', 'Entry-level']
  },
  {
    id: '5',
    title: 'Lead Software Architect',
    company: 'Enterprise Corp',
    location: 'Seattle, WA',
    pay: '$180k - $220k',
    tags: ['Full-time', 'Architecture', 'Leadership', 'Java', 'Microservices']
  },
  {
    id: '6',
    title: 'Full Stack Developer',
    company: 'InnovateTech',
    location: 'Work from Home',
    pay: '$95k - $130k',
    tags: ['Full-time', 'React', 'Node.js', 'MongoDB', 'Remote', 'WFH']
  },
  {
    id: '7',
    title: 'Software Engineer II',
    company: 'MegaCorp',
    location: 'San Francisco Bay Area',
    pay: '$140k - $170k',
    tags: ['Full-time', 'Python', 'Machine Learning', 'Senior-level']
  },
  {
    id: '8',
    title: 'Software Dev',
    company: 'QuickStart',
    location: 'San Fran, CA',
    pay: '$110k - $145k',
    tags: ['Full-time', 'JavaScript', 'React', 'Startup']
  }
];

const mockUserPreferences = {
  user_id: 'test-user',
  preferred_locations: ['San Francisco', 'Remote', 'Bay Area'],
  max_commute_distance: 30,
  remote_work_preference: 'preferred',
  willing_to_relocate: false,
  preferred_job_types: ['Full-time'],
  preferred_industries: ['Technology'],
  preferred_company_sizes: ['startup', 'medium'],
  experience_level: 'senior',
  preferred_roles: ['Software Engineer', 'Developer', 'Full Stack'],
  min_salary: 100000,
  max_salary: 180000,
  salary_currency: 'USD',
  salary_negotiable: true,
  preferred_schedule: 'flexible',
  location_weight: 0.25,
  salary_weight: 0.30,
  role_weight: 0.25,
  company_weight: 0.20,
  auto_learn_from_swipes: true
};

// Enhanced scoring functions (copied from the service)
function calculateLocationScore(job, preferences) {
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
      else if (jobLocation.split(',')[0].trim() === prefLoc.split(',')[0].trim()) {
        locationMatch = true;
        bestMatchScore = Math.max(bestMatchScore, 85);
      }
      // State/region match
      else if (jobLocation.includes(prefLoc.split(',').pop()?.trim() || '')) {
        locationMatch = true;
        bestMatchScore = Math.max(bestMatchScore, 65);
      }
      // Partial word match (e.g., "San Francisco" matches "San Fran")
      else {
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
}

function calculateSalaryScore(job, preferences) {
  // Extract salary range from job.pay string
  const salaryMatch = job.pay.match(/\$?(\d+(?:,\d+)?(?:k|K)?)\s*-?\s*\$?(\d+(?:,\d+)?(?:k|K)?)?/);
  
  if (!salaryMatch) {
    return 50; // Neutral score
  }
  
  // Parse salary values
  const parseAmount = (amount) => {
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
}

function calculateRoleScore(job, preferences) {
  let score = 0;

  // Enhanced job title matching with fuzzy logic
  const jobTitle = job.title.toLowerCase();
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
          (word === 'engineer' && roleWord === 'eng')
        )
      );

      if (matchingWords.length > 0) {
        const matchRatio = matchingWords.length / Math.max(jobTitleWords.length, roleWords.length);
        bestRoleMatch = Math.max(bestRoleMatch, 40 + (matchRatio * 40));
      }
    }
  }

  score += bestRoleMatch;

  // Enhanced tag matching
  let tagScore = 0;
  const relevantTags = job.tags.filter(tag => {
    const tagLower = tag.toLowerCase();
    return preferences.preferred_roles.some(role =>
      tagLower.includes(role.toLowerCase()) || role.toLowerCase().includes(tagLower)
    ) ||
    preferences.preferred_industries.some(industry =>
      tagLower.includes(industry.toLowerCase()) || industry.toLowerCase().includes(tagLower)
    );
  });

  if (relevantTags.length > 0) {
    tagScore = Math.min(25, relevantTags.length * 8);
  }

  score += tagScore;

  // Experience level matching
  const experienceKeywords = {
    'senior': ['senior', 'lead', 'principal', 'expert', '5+ years', 'advanced'],
    'mid': ['mid', 'intermediate', 'experienced', '3-5 years', 'regular'],
    'junior': ['junior', 'associate', 'entry', '1-2 years', 'early career']
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

  score += 5; // Base score

  return Math.min(100, Math.max(0, score));
}

function calculateCompanyScore(job, preferences) {
  let score = 50; // Base score

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
}

function calculateJobMatchScore(job, preferences) {
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
}

// Run the test
console.log('📊 User Preferences:');
console.log(`   🎯 Experience Level: ${mockUserPreferences.experience_level}`);
console.log(`   📍 Preferred Locations: ${mockUserPreferences.preferred_locations.join(', ')}`);
console.log(`   🏠 Remote Preference: ${mockUserPreferences.remote_work_preference}`);
console.log(`   💰 Salary Range: $${mockUserPreferences.min_salary?.toLocaleString()} - $${mockUserPreferences.max_salary?.toLocaleString()}`);
console.log(`   🔧 Preferred Roles: ${mockUserPreferences.preferred_roles.join(', ')}`);
console.log(`   ⚖️  Weights: Location(${mockUserPreferences.location_weight}) | Salary(${mockUserPreferences.salary_weight}) | Role(${mockUserPreferences.role_weight}) | Company(${mockUserPreferences.company_weight})`);
console.log('');

console.log('🎯 Job Recommendations (Enhanced Algorithm v1.1):');
console.log('=' .repeat(80));

const recommendations = mockJobs.map(job => calculateJobMatchScore(job, mockUserPreferences));
const sortedRecommendations = recommendations.sort((a, b) => b.overall_score - a.overall_score);

sortedRecommendations.forEach((rec, index) => {
  console.log(`${index + 1}. ${rec.job.title} at ${rec.job.company}`);
  console.log(`   📍 ${rec.job.location} | 💰 ${rec.job.pay}`);
  console.log(`   🎯 Overall Score: ${rec.overall_score}/100`);
  console.log(`   📊 Breakdown: Location(${rec.location_score}) | Salary(${rec.salary_score}) | Role(${rec.role_score}) | Company(${rec.company_score})`);
  console.log(`   💡 ${rec.recommendation_reason}`);
  console.log('');
});

console.log('✅ Enhanced algorithm test completed!');
console.log('\n🔍 Key Improvements in v1.1:');
console.log('   • Enhanced remote work detection (WFH, work from home, anywhere)');
console.log('   • Fuzzy location matching (San Francisco ↔ San Fran, Bay Area)');
console.log('   • Better role matching with abbreviations (dev ↔ developer)');
console.log('   • Experience level keyword detection');
console.log('   • Improved scoring weights and thresholds');
console.log('   • More comprehensive tag analysis');
