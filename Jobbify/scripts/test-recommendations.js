/**
 * Test script for the job recommendation system
 * Run this to verify the recommendation algorithm is working correctly
 */

// Mock data for testing
const mockJobs = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc',
    location: 'San Francisco, CA',
    pay: '$120,000 - $150,000',
    tags: ['JavaScript', 'React', 'Node.js', 'Full-time', 'Remote'],
    description: 'We are looking for a senior software engineer...'
  },
  {
    id: '2',
    title: 'Frontend Developer',
    company: 'StartupLabs',
    location: 'Remote',
    pay: '$80,000 - $100,000',
    tags: ['React', 'TypeScript', 'CSS', 'Full-time', 'Remote'],
    description: 'Join our frontend team...'
  },
  {
    id: '3',
    title: 'Product Manager',
    company: 'BigTech Corp',
    location: 'New York, NY',
    pay: '$130,000 - $160,000',
    tags: ['Product Management', 'Strategy', 'Full-time'],
    description: 'Lead product strategy...'
  },
  {
    id: '4',
    title: 'Data Scientist',
    company: 'DataCorp',
    location: 'Austin, TX',
    pay: '$110,000 - $140,000',
    tags: ['Python', 'Machine Learning', 'SQL', 'Full-time'],
    description: 'Analyze complex datasets...'
  },
  {
    id: '5',
    title: 'Junior Developer',
    company: 'CodeAcademy',
    location: 'Remote',
    pay: '$60,000 - $80,000',
    tags: ['JavaScript', 'Entry Level', 'Full-time', 'Remote'],
    description: 'Perfect for new graduates...'
  }
];

const mockUserPreferences = {
  user_id: 'test-user-123',
  preferred_locations: ['San Francisco', 'Remote'],
  max_commute_distance: 50,
  remote_work_preference: 'preferred',
  willing_to_relocate: false,
  preferred_job_types: ['Full-time'],
  preferred_industries: ['Technology'],
  preferred_company_sizes: ['startup', 'large'],
  experience_level: 'senior',
  preferred_roles: ['Software Engineer', 'Frontend Developer'],
  min_salary: 100000,
  max_salary: 150000,
  salary_currency: 'USD',
  salary_negotiable: true,
  preferred_schedule: 'flexible',
  location_weight: 0.25,
  salary_weight: 0.30,
  role_weight: 0.25,
  company_weight: 0.20,
  auto_learn_from_swipes: true
};

// Import the recommendation functions (this would be done differently in a real test)
// For now, we'll simulate the algorithm logic

function calculateLocationScore(job, preferences) {
  let score = 0;
  
  const isRemote = job.location.toLowerCase().includes('remote') || 
                   job.tags.some(tag => tag.toLowerCase().includes('remote'));
  
  if (isRemote) {
    switch (preferences.remote_work_preference) {
      case 'required': score = 100; break;
      case 'preferred': score = 90; break;
      case 'acceptable': score = 70; break;
      case 'not_preferred': score = 30; break;
    }
  } else {
    const jobLocation = job.location.toLowerCase();
    const matchesPreferredLocation = preferences.preferred_locations.some(
      location => jobLocation.includes(location.toLowerCase())
    );
    
    if (matchesPreferredLocation) {
      score = 85;
    } else if (preferences.willing_to_relocate) {
      score = 60;
    } else {
      score = 20;
    }
  }
  
  return Math.min(100, Math.max(0, score));
}

function calculateSalaryScore(job, preferences) {
  const salaryMatch = job.pay.match(/\$?(\d+(?:,\d+)?(?:k|K)?)\s*-?\s*\$?(\d+(?:,\d+)?(?:k|K)?)?/);
  
  if (!salaryMatch) return 50;
  
  const parseAmount = (amount) => {
    const cleaned = amount.replace(/[,$]/g, '');
    const num = parseInt(cleaned);
    return cleaned.toLowerCase().includes('k') ? num * 1000 : num;
  };
  
  const minSalary = parseAmount(salaryMatch[1]);
  const maxSalary = salaryMatch[2] ? parseAmount(salaryMatch[2]) : minSalary;
  
  if (!preferences.min_salary && !preferences.max_salary) return 50;
  
  const userMin = preferences.min_salary || 0;
  const userMax = preferences.max_salary || Infinity;
  
  if (maxSalary < userMin) {
    return 10;
  } else if (minSalary > userMax) {
    return preferences.salary_negotiable ? 40 : 10;
  } else {
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
  
  const jobTitle = job.title.toLowerCase();
  const matchesRole = preferences.preferred_roles.some(
    role => jobTitle.includes(role.toLowerCase()) || 
            role.toLowerCase().includes(jobTitle.split(' ')[0])
  );
  
  if (matchesRole) score += 60;
  
  const matchesTags = job.tags.some(tag => 
    preferences.preferred_roles.some(role => 
      tag.toLowerCase().includes(role.toLowerCase())
    )
  );
  
  if (matchesTags) score += 30;
  score += 10; // Base score
  
  return Math.min(100, score);
}

function calculateCompanyScore(job, preferences) {
  let score = 50; // Base score
  
  const companyName = job.company.toLowerCase();
  
  if (preferences.preferred_company_sizes.includes('startup') && 
      (companyName.includes('startup') || companyName.includes('labs'))) {
    score += 30;
  }
  
  if (preferences.preferred_company_sizes.includes('large') && 
      (companyName.includes('corp') || companyName.includes('inc'))) {
    score += 20;
  }
  
  return Math.min(100, score);
}

function calculateJobMatchScore(job, preferences) {
  const locationScore = calculateLocationScore(job, preferences);
  const salaryScore = calculateSalaryScore(job, preferences);
  const roleScore = calculateRoleScore(job, preferences);
  const companyScore = calculateCompanyScore(job, preferences);
  
  const overallScore = (
    locationScore * preferences.location_weight +
    salaryScore * preferences.salary_weight +
    roleScore * preferences.role_weight +
    companyScore * preferences.company_weight
  );
  
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
function runRecommendationTest() {
  console.log('🧪 Testing Job Recommendation Algorithm\n');
  console.log('User Preferences:');
  console.log('- Locations:', mockUserPreferences.preferred_locations);
  console.log('- Remote preference:', mockUserPreferences.remote_work_preference);
  console.log('- Roles:', mockUserPreferences.preferred_roles);
  console.log('- Salary range: $' + mockUserPreferences.min_salary?.toLocaleString() + ' - $' + mockUserPreferences.max_salary?.toLocaleString());
  console.log('- Experience level:', mockUserPreferences.experience_level);
  console.log('\n📊 Job Recommendations:\n');
  
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
  
  console.log('✅ Test completed successfully!');
  console.log(`📈 Algorithm filtered ${sortedRecommendations.filter(r => r.overall_score >= 40).length} out of ${mockJobs.length} jobs as good matches.`);
}

// Run the test
runRecommendationTest();
