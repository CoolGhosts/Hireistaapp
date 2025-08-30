import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, FlatList, Image, SafeAreaView, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { useAppContext } from '@/context';
import { LightTheme, DarkTheme } from '@/constants';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface Skill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  matchPercentage: number;
  logo: string;
  salary: string;
  postedDate: string;
  skills: string[];
  description: string;
}

// Mock skills data
const mockUserSkills: Skill[] = [
  { name: 'JavaScript', level: 'expert' },
  { name: 'React', level: 'advanced' },
  { name: 'Node.js', level: 'intermediate' },
  { name: 'TypeScript', level: 'advanced' },
  { name: 'HTML/CSS', level: 'expert' },
  { name: 'UI/UX Design', level: 'intermediate' },
  { name: 'RESTful APIs', level: 'advanced' },
  { name: 'Git', level: 'advanced' },
];

// Mock job matches data
const mockJobMatches: JobMatch[] = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    matchPercentage: 95,
    logo: 'https://randomuser.me/api/portraits/men/41.jpg',
    salary: '$120,000 - $150,000',
    postedDate: '2 days ago',
    skills: ['JavaScript', 'React', 'TypeScript', 'HTML/CSS', 'Redux'],
    description: "Looking for an experienced frontend developer to join our team working on cutting-edge web applications. You'll be responsible for building user interfaces, implementing new features, and optimizing performance."
  },
  {
    id: '2',
    title: 'Full Stack Engineer',
    company: 'Innovate Solutions',
    location: 'Remote',
    matchPercentage: 88,
    logo: 'https://randomuser.me/api/portraits/women/65.jpg',
    salary: '$110,000 - $140,000',
    postedDate: '1 week ago',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
    description: "Join our growing team to build and maintain web applications from frontend to backend. This role offers the chance to work across the entire stack and contribute to the architecture of our products."
  },
  {
    id: '3',
    title: 'UI/UX Developer',
    company: 'DesignForward',
    location: 'Los Angeles, CA',
    matchPercentage: 82,
    logo: 'https://randomuser.me/api/portraits/men/22.jpg',
    salary: '$100,000 - $130,000',
    postedDate: '3 days ago',
    skills: ['React', 'HTML/CSS', 'UI/UX Design', 'Figma', 'JavaScript'],
    description: "We're seeking a talented UI/UX Developer to help create beautiful and intuitive user interfaces. You'll work closely with our design team to bring mockups to life with clean, efficient code."
  },
  {
    id: '4',
    title: 'Frontend Team Lead',
    company: 'GrowthTech',
    location: 'New York, NY',
    matchPercentage: 79,
    logo: 'https://randomuser.me/api/portraits/women/45.jpg',
    salary: '$140,000 - $170,000',
    postedDate: '5 days ago',
    skills: ['JavaScript', 'React', 'Team Leadership', 'TypeScript', 'CI/CD'],
    description: "Lead our frontend development team of 5 engineers. You'll oversee development processes, make architectural decisions, mentor junior developers, and still get your hands dirty with code."
  },
  {
    id: '5',
    title: 'React Native Developer',
    company: 'MobileFirst',
    location: 'Austin, TX',
    matchPercentage: 76,
    logo: 'https://randomuser.me/api/portraits/men/32.jpg',
    salary: '$105,000 - $135,000',
    postedDate: '1 day ago',
    skills: ['React Native', 'JavaScript', 'TypeScript', 'Mobile Development', 'Redux'],
    description: "Join our mobile app development team creating cross-platform applications with React Native. You'll be responsible for developing new features and ensuring smooth performance on both iOS and Android."
  },
];

function JobRecommenderScreen() {
  const { theme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  
  const [skills, setSkills] = useState<Skill[]>(mockUserSkills);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newSkill, setNewSkill] = useState('');
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<Skill['level']>('intermediate');
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  
  // Simulate loading job matches
  useEffect(() => {
    const timer = setTimeout(() => {
      setJobMatches(mockJobMatches);
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Add a new skill
  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    const skillToAdd: Skill = {
      name: newSkill.trim(),
      level: selectedSkillLevel,
    };
    
    setSkills(prevSkills => [...prevSkills, skillToAdd]);
    setNewSkill('');
    setSelectedSkillLevel('intermediate');
  };
  
  // Remove a skill
  const handleRemoveSkill = (skillName: string) => {
    setSkills(prevSkills => prevSkills.filter(skill => skill.name !== skillName));
  };
  
  // Get color based on skill level
  const getSkillLevelColor = (level: Skill['level']) => {
    switch (level) {
      case 'beginner':
        return '#4FC3F7'; // Light blue
      case 'intermediate':
        return '#26A69A'; // Teal
      case 'advanced':
        return '#7E57C2'; // Purple
      case 'expert':
        return '#EF5350'; // Red
      default:
        return themeColors.tint;
    }
  };
  
  // Get color based on match percentage
  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return '#4CAF50'; // Green
    if (percentage >= 80) return '#8BC34A'; // Light Green
    if (percentage >= 70) return '#CDDC39'; // Lime
    if (percentage >= 60) return '#FFC107'; // Amber
    return '#FF9800'; // Orange
  };
  
  // Render a skill item
  const renderSkillItem = ({ item }: { item: Skill }) => (
    <View style={styles.skillItemContainer}>
      <View 
        style={[
          styles.skillItem, 
          { 
            backgroundColor: `${getSkillLevelColor(item.level)}20`,
            borderColor: getSkillLevelColor(item.level) 
          }
        ]}
      >
        <Text style={[styles.skillName, { color: themeColors.text }]}>{item.name}</Text>
        <View style={[styles.skillLevel, { backgroundColor: getSkillLevelColor(item.level) }]}>
          <Text style={styles.skillLevelText}>{item.level}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.removeSkillButton}
        onPress={() => handleRemoveSkill(item.name)}
      >
        <FontAwesome name="times-circle" size={20} color={themeColors.error} />
      </TouchableOpacity>
    </View>
  );
  
  // Render a skill level option
  const renderSkillLevelOption = (level: Skill['level']) => (
    <TouchableOpacity
      key={level}
      style={[
        styles.skillLevelOption,
        selectedSkillLevel === level && { 
          backgroundColor: `${getSkillLevelColor(level)}20`,
          borderColor: getSkillLevelColor(level),
        }
      ]}
      onPress={() => setSelectedSkillLevel(level)}
    >
      <Text 
        style={[
          styles.skillLevelOptionText,
          { color: selectedSkillLevel === level ? getSkillLevelColor(level) : themeColors.textSecondary }
        ]}
      >
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Text>
    </TouchableOpacity>
  );
  
  // Render a job match item
  const renderJobItem = ({ item }: { item: JobMatch }) => (
    <TouchableOpacity 
      style={[styles.jobItem, { backgroundColor: themeColors.card }]}
      onPress={() => setSelectedJob(item)}
    >
      <View style={styles.jobHeader}>
        <Image source={{ uri: item.logo }} style={styles.companyLogo} />
        <View style={styles.jobInfo}>
          <Text style={[styles.jobTitle, { color: themeColors.text }]}>{item.title}</Text>
          <Text style={[styles.companyName, { color: themeColors.textSecondary }]}>{item.company}</Text>
          <View style={styles.jobMeta}>
            <View style={styles.locationContainer}>
              <FontAwesome name="map-marker" size={12} color={themeColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>{item.location}</Text>
            </View>
            <View style={styles.dateContainer}>
              <FontAwesome name="clock-o" size={12} color={themeColors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={[styles.dateText, { color: themeColors.textSecondary }]}>{item.postedDate}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.matchBadge, { backgroundColor: `${getMatchColor(item.matchPercentage)}20` }]}>
          <Text style={[styles.matchText, { color: getMatchColor(item.matchPercentage) }]}>
            {item.matchPercentage}%
          </Text>
        </View>
      </View>
      
      <View style={styles.jobSkills}>
        {item.skills.slice(0, 3).map((skill, index) => (
          <View 
            key={index} 
            style={[styles.jobSkillItem, { backgroundColor: `${themeColors.tint}15` }]}
          >
            <Text style={[styles.jobSkillText, { color: themeColors.text }]}>{skill}</Text>
          </View>
        ))}
        {item.skills.length > 3 && (
          <View style={[styles.jobSkillItem, { backgroundColor: `${themeColors.textSecondary}15` }]}>
            <Text style={[styles.jobSkillText, { color: themeColors.textSecondary }]}>+{item.skills.length - 3}</Text>
          </View>
        )}
      </View>
      
      <Text 
        style={[styles.jobDescription, { color: themeColors.textSecondary }]} 
        numberOfLines={2}
      >
        {item.description}
      </Text>
      
      <View style={styles.salaryContainer}>
        <FontAwesome name="money" size={16} color={themeColors.success} style={{ marginRight: 6 }} />
        <Text style={[styles.salaryText, { color: themeColors.success }]}>{item.salary}</Text>
      </View>
      
      <TouchableOpacity 
        style={[styles.applyButton, { backgroundColor: themeColors.tint }]}
        onPress={() => {}}
      >
        <Text style={styles.applyButtonText}>Apply Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
  
  // Render the skills section
  const renderSkillsSection = () => (
    <View style={styles.skillsSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>My Skills</Text>
        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
          Add or remove skills to get better job matches
        </Text>
      </View>
      
      <View style={styles.skillsList}>
        <FlatList
          data={skills}
          renderItem={renderSkillItem}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.skillsListContent}
        />
      </View>
      
      <View style={[styles.addSkillContainer, { backgroundColor: themeColors.card }]}>
        <TextInput
          style={[styles.addSkillInput, { backgroundColor: themeColors.background, color: themeColors.text }]}
          placeholder="Add a new skill..."
          placeholderTextColor={themeColors.textSecondary}
          value={newSkill}
          onChangeText={setNewSkill}
        />
        
        <View style={styles.skillLevelSelector}>
          {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map(level => 
            renderSkillLevelOption(level)
          )}
        </View>
        
        <TouchableOpacity 
          style={[styles.addSkillButton, { backgroundColor: themeColors.tint }]}
          onPress={handleAddSkill}
          disabled={!newSkill.trim()}
        >
          <Text style={styles.addSkillButtonText}>Add Skill</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Render the job matches section
  const renderJobMatchesSection = () => (
    <View style={styles.jobMatchesSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Job Matches</Text>
        <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
          Based on your skill profile
        </Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>
            Finding jobs that match your skills...
          </Text>
        </View>
      ) : jobMatches.length > 0 ? (
        <FlatList
          data={jobMatches}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.jobsListContent}
          scrollEnabled={false} // We're already in a ScrollView
        />
      ) : (
        <View style={styles.noJobsContainer}>
          <FontAwesome name="briefcase" size={50} color={themeColors.textSecondary} style={{ marginBottom: 16 }} />
          <Text style={[styles.noJobsText, { color: themeColors.text }]}>No job matches found</Text>
          <Text style={[styles.noJobsSubtext, { color: themeColors.textSecondary }]}>
            Try adding more skills or adjusting your skill levels
          </Text>
        </View>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {renderSkillsSection()}
        {renderJobMatchesSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  skillsSection: {
    marginBottom: 10,
  },
  skillsList: {
    marginBottom: 10,
  },
  skillsListContent: {
    paddingHorizontal: 16,
  },
  skillItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 4,
  },
  skillName: {
    fontSize: 14,
    marginRight: 8,
  },
  skillLevel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  skillLevelText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  removeSkillButton: {
    marginLeft: 4,
  },
  addSkillContainer: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  addSkillInput: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  skillLevelSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  skillLevelOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginHorizontal: 2,
  },
  skillLevelOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addSkillButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  addSkillButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  jobMatchesSection: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  jobsListContent: {
    padding: 16,
  },
  jobItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  companyLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  jobInfo: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  companyName: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobMeta: {
    flexDirection: 'row',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    fontSize: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    justifyContent: 'center',
  },
  matchText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  jobSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  jobSkillItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  jobSkillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  salaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  salaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noJobsContainer: {
    padding: 30,
    alignItems: 'center',
  },
  noJobsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noJobsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default JobRecommenderScreen;
