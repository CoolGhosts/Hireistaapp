import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, TextInput, FlatList, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { useAppContext } from '../../../context';
import { LightTheme, DarkTheme } from '../../../constants';
import { FontAwesome } from '@expo/vector-icons';

interface SalaryData {
  jobTitle: string;
  location: string;
  averageSalary: number;
  salaryRange: {
    low: number;
    high: number;
  };
  experience: {
    entry: number;
    mid: number;
    senior: number;
  };
  topCompanies: {
    name: string;
    salary: number;
  }[];
  skills: {
    name: string;
    impact: number; // percentage impact on salary
  }[];
  trend: 'up' | 'down' | 'stable';
  trendValue: number; // percentage
}

// Mock salary data for different job titles
const mockSalaryData: { [key: string]: SalaryData } = {
  'Frontend Developer': {
    jobTitle: 'Frontend Developer',
    location: 'United States',
    averageSalary: 95000,
    salaryRange: {
      low: 75000,
      high: 135000,
    },
    experience: {
      entry: 70000,
      mid: 95000,
      senior: 130000,
    },
    topCompanies: [
      { name: 'Google', salary: 145000 },
      { name: 'Microsoft', salary: 135000 },
      { name: 'Apple', salary: 140000 },
      { name: 'Amazon', salary: 132000 },
      { name: 'Meta', salary: 150000 },
    ],
    skills: [
      { name: 'React', impact: 15 },
      { name: 'TypeScript', impact: 12 },
      { name: 'CSS/SASS', impact: 8 },
      { name: 'JavaScript', impact: 10 },
      { name: 'Redux', impact: 7 },
    ],
    trend: 'up',
    trendValue: 4.2,
  },
  'Backend Developer': {
    jobTitle: 'Backend Developer',
    location: 'United States',
    averageSalary: 105000,
    salaryRange: {
      low: 85000,
      high: 145000,
    },
    experience: {
      entry: 80000,
      mid: 105000,
      senior: 140000,
    },
    topCompanies: [
      { name: 'Google', salary: 155000 },
      { name: 'Microsoft', salary: 140000 },
      { name: 'Oracle', salary: 145000 },
      { name: 'Amazon', salary: 150000 },
      { name: 'IBM', salary: 135000 },
    ],
    skills: [
      { name: 'Node.js', impact: 14 },
      { name: 'Python', impact: 16 },
      { name: 'Java', impact: 12 },
      { name: 'SQL', impact: 10 },
      { name: 'AWS', impact: 15 },
    ],
    trend: 'up',
    trendValue: 5.1,
  },
  'Full Stack Developer': {
    jobTitle: 'Full Stack Developer',
    location: 'United States',
    averageSalary: 110000,
    salaryRange: {
      low: 85000,
      high: 150000,
    },
    experience: {
      entry: 85000,
      mid: 110000,
      senior: 145000,
    },
    topCompanies: [
      { name: 'Google', salary: 160000 },
      { name: 'Microsoft', salary: 150000 },
      { name: 'Amazon', salary: 155000 },
      { name: 'Meta', salary: 165000 },
      { name: 'Netflix', salary: 170000 },
    ],
    skills: [
      { name: 'React', impact: 12 },
      { name: 'Node.js', impact: 12 },
      { name: 'Python', impact: 10 },
      { name: 'MongoDB', impact: 8 },
      { name: 'AWS', impact: 14 },
    ],
    trend: 'up',
    trendValue: 6.3,
  },
  'UX/UI Designer': {
    jobTitle: 'UX/UI Designer',
    location: 'United States',
    averageSalary: 90000,
    salaryRange: {
      low: 70000,
      high: 130000,
    },
    experience: {
      entry: 65000,
      mid: 90000,
      senior: 125000,
    },
    topCompanies: [
      { name: 'Apple', salary: 135000 },
      { name: 'Meta', salary: 130000 },
      { name: 'Google', salary: 140000 },
      { name: 'Airbnb', salary: 125000 },
      { name: 'Microsoft', salary: 120000 },
    ],
    skills: [
      { name: 'Figma', impact: 18 },
      { name: 'Adobe XD', impact: 15 },
      { name: 'Prototyping', impact: 12 },
      { name: 'User Research', impact: 10 },
      { name: 'Design Systems', impact: 14 },
    ],
    trend: 'up',
    trendValue: 3.8,
  },
  'Data Scientist': {
    jobTitle: 'Data Scientist',
    location: 'United States',
    averageSalary: 120000,
    salaryRange: {
      low: 95000,
      high: 165000,
    },
    experience: {
      entry: 90000,
      mid: 120000,
      senior: 160000,
    },
    topCompanies: [
      { name: 'Google', salary: 175000 },
      { name: 'Microsoft', salary: 165000 },
      { name: 'Amazon', salary: 170000 },
      { name: 'Meta', salary: 180000 },
      { name: 'Apple', salary: 160000 },
    ],
    skills: [
      { name: 'Python', impact: 15 },
      { name: 'Machine Learning', impact: 20 },
      { name: 'SQL', impact: 10 },
      { name: 'Statistics', impact: 12 },
      { name: 'Data Visualization', impact: 8 },
    ],
    trend: 'up',
    trendValue: 7.5,
  },
};

// Popular job titles for quick selection
const popularJobTitles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'UX/UI Designer',
  'Data Scientist',
  'DevOps Engineer',
  'Product Manager',
  'Mobile Developer',
  'QA Engineer',
];

// Location options
const locationOptions = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'Australia',
  'India',
  'Singapore',
  'Remote',
];

function SalaryInsightsScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('United States');
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [currentSalaryData, setCurrentSalaryData] = useState<SalaryData | null>(null);
  
  // Handle search submission
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Find the closest match in our mock data
      // In a real app, this would call an API
      const normalizedQuery = searchQuery.toLowerCase().trim();
      const matchedJob = Object.keys(mockSalaryData).find(job => 
        job.toLowerCase().includes(normalizedQuery)
      );
      
      if (matchedJob) {
        setSelectedJobTitle(matchedJob);
        setCurrentSalaryData({
          ...mockSalaryData[matchedJob],
          location: selectedLocation
        });
      }
    }
  };
  
  // Handle job title selection
  const handleJobTitleSelect = (jobTitle: string) => {
    setSelectedJobTitle(jobTitle);
    setSearchQuery(jobTitle);
    
    if (mockSalaryData[jobTitle]) {
      setCurrentSalaryData({
        ...mockSalaryData[jobTitle],
        location: selectedLocation
      });
    }
  };
  
  // Handle location change
  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
    
    if (currentSalaryData) {
      // In a real app, this would fetch new data based on location
      // For our mock, we'll just update the location
      setCurrentSalaryData({
        ...currentSalaryData,
        location
      });
    }
  };
  
  // Format salary
  const formatSalary = (salary: number) => {
    return '$' + salary.toLocaleString();
  };
  
  // Render the search and filter section
  const renderSearchSection = () => (
    <View style={styles.searchSection}>
      <Text style={[styles.screenTitle, { color: themeColors.text }]}>Salary Insights</Text>
      <Text style={[styles.screenSubtitle, { color: themeColors.textSecondary }]}>
        Explore salary data for different job titles and locations
      </Text>
      
      <View style={[styles.searchContainer, { backgroundColor: themeColors.card }]}>
        <View style={styles.searchInputContainer}>
          <FontAwesome name="search" size={16} color={themeColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search job titles..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.searchButton, { backgroundColor: themeColors.tint }]}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Popular Job Titles</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.popularJobsScroll}
      >
        {popularJobTitles.map(job => (
          <TouchableOpacity
            key={job}
            style={[
              styles.jobTitlePill,
              { backgroundColor: themeColors.card },
              selectedJobTitle === job && { backgroundColor: themeColors.tint + '20', borderColor: themeColors.tint },
            ]}
            onPress={() => handleJobTitleSelect(job)}
          >
            <Text 
              style={[
                styles.jobTitlePillText, 
                { color: themeColors.text },
                selectedJobTitle === job && { color: themeColors.tint },
              ]}
            >
              {job}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Location</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.locationsScroll}
      >
        {locationOptions.map(location => (
          <TouchableOpacity
            key={location}
            style={[
              styles.locationPill,
              { backgroundColor: themeColors.card },
              selectedLocation === location && { backgroundColor: themeColors.tint + '20', borderColor: themeColors.tint },
            ]}
            onPress={() => handleLocationChange(location)}
          >
            <FontAwesome 
              name="map-marker" 
              size={12} 
              color={selectedLocation === location ? themeColors.tint : themeColors.textSecondary}
              style={styles.locationIcon}
            />
            <Text
              style={[
                styles.locationPillText,
                { color: themeColors.text },
                selectedLocation === location && { color: themeColors.tint },
              ]}
            >
              {location}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
  
  // Render salary data insights
  const renderSalaryInsights = () => {
    if (!currentSalaryData) return null;
    
    return (
      <View style={styles.insightsSection}>
        <View style={[styles.salaryOverviewCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.overviewHeader}>
            <View style={styles.overviewTitleContainer}>
              <Text style={[styles.jobTitleText, { color: themeColors.text }]}>
                {currentSalaryData.jobTitle}
              </Text>
              <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
                <FontAwesome name="map-marker" size={12} color={themeColors.textSecondary} /> {currentSalaryData.location}
              </Text>
            </View>
            
            <View style={styles.salaryTrendContainer}>
              <FontAwesome 
                name={currentSalaryData.trend === 'up' ? 'arrow-up' : 'arrow-down'} 
                size={12} 
                color={currentSalaryData.trend === 'up' ? themeColors.success : themeColors.error}
                style={styles.trendIcon}
              />
              <Text 
                style={[
                  styles.trendText, 
                  { color: currentSalaryData.trend === 'up' ? themeColors.success : themeColors.error }
                ]}
              >
                {currentSalaryData.trendValue}%
              </Text>
            </View>
          </View>
          
          <View style={styles.averageSalaryContainer}>
            <Text style={[styles.averageSalaryLabel, { color: themeColors.textSecondary }]}>Average Salary</Text>
            <Text style={[styles.averageSalaryValue, { color: themeColors.text }]}>
              {formatSalary(currentSalaryData.averageSalary)}
            </Text>
            <Text style={[styles.salaryRangeText, { color: themeColors.textSecondary }]}>
              Range: {formatSalary(currentSalaryData.salaryRange.low)} - {formatSalary(currentSalaryData.salaryRange.high)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 20 }]}>Salary by Experience</Text>
        <View style={[styles.experienceCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.experienceLevel}>
            <Text style={[styles.experienceLevelLabel, { color: themeColors.textSecondary }]}>Entry Level</Text>
            <Text style={[styles.experienceSalary, { color: themeColors.text }]}>
              {formatSalary(currentSalaryData.experience.entry)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <View style={styles.experienceLevel}>
            <Text style={[styles.experienceLevelLabel, { color: themeColors.textSecondary }]}>Mid Level</Text>
            <Text style={[styles.experienceSalary, { color: themeColors.text }]}>
              {formatSalary(currentSalaryData.experience.mid)}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          <View style={styles.experienceLevel}>
            <Text style={[styles.experienceLevelLabel, { color: themeColors.textSecondary }]}>Senior Level</Text>
            <Text style={[styles.experienceSalary, { color: themeColors.text }]}>
              {formatSalary(currentSalaryData.experience.senior)}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 20 }]}>Top Paying Companies</Text>
        <FlatList
          data={currentSalaryData.topCompanies}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.companiesContainer}
          renderItem={({ item }) => (
            <View style={[styles.companyCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.companyLogo, { backgroundColor: themeColors.tint + '20' }]}>
                <Text style={[styles.companyInitial, { color: themeColors.tint }]}>
                  {item.name.charAt(0)}
                </Text>
              </View>
              <Text style={[styles.companyName, { color: themeColors.text }]}>{item.name}</Text>
              <Text style={[styles.companySalary, { color: themeColors.textSecondary }]}>
                {formatSalary(item.salary)}
              </Text>
            </View>
          )}
        />
        
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginTop: 20 }]}>Skills Impact on Salary</Text>
        <View style={[styles.skillsCard, { backgroundColor: themeColors.card }]}>
          {currentSalaryData.skills.map((skill) => (
            <View key={skill.name} style={styles.skillItem}>
              <View style={styles.skillNameContainer}>
                <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
                <Text style={[styles.skillImpact, { color: themeColors.success }]}>+{skill.impact}%</Text>
              </View>
              <View style={[styles.skillBar, { backgroundColor: themeColors.border }]}>
                <View 
                  style={[
                    styles.skillBarFill, 
                    { width: `${skill.impact * 3}%`, backgroundColor: themeColors.tint }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <FontAwesome name="line-chart" size={60} color={themeColors.tint} style={styles.emptyStateIcon} />
      <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>Discover Salary Insights</Text>
      <Text style={[styles.emptyStateText, { color: themeColors.textSecondary }]}>
        Search for a job title or select from the popular options above to see detailed salary information and trends.
      </Text>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Stack.Screen options={{ title: 'Salary Insights' }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderSearchSection()}
        {currentSalaryData ? renderSalaryInsights() : renderEmptyState()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  searchSection: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  popularJobsScroll: {
    paddingBottom: 8,
    paddingTop: 4,
    marginBottom: 20,
  },
  jobTitlePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  jobTitlePillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationsScroll: {
    paddingBottom: 8,
    paddingTop: 4,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  locationIcon: {
    marginRight: 6,
  },
  locationPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  insightsSection: {
    padding: 16,
    paddingTop: 0,
  },
  salaryOverviewCard: {
    borderRadius: 12,
    padding: 16,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  overviewTitleContainer: {
    flex: 1,
  },
  jobTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
  },
  salaryTrendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trendIcon: {
    marginRight: 4,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  averageSalaryContainer: {
    alignItems: 'center',
  },
  averageSalaryLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  averageSalaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  salaryRangeText: {
    fontSize: 14,
  },
  experienceCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  experienceLevel: {
    flex: 1,
    alignItems: 'center',
  },
  experienceLevelLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  experienceSalary: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    marginHorizontal: 10,
  },
  companiesContainer: {
    paddingVertical: 8,
  },
  companyCard: {
    width: 120,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  companyLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  companySalary: {
    fontSize: 12,
  },
  skillsCard: {
    borderRadius: 12,
    padding: 16,
  },
  skillItem: {
    marginBottom: 16,
  },
  skillNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillImpact: {
    fontSize: 12,
    fontWeight: '600',
  },
  skillBar: {
    height: 8,
    borderRadius: 4,
  },
  skillBarFill: {
    height: 8,
    borderRadius: 4,
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SalaryInsightsScreen;
