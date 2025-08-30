import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  Dimensions,
  Alert,
  Linking,
  Animated
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as WebBrowser from 'expo-web-browser';
import { decode } from 'base64-arraybuffer';
import { 
  FontAwesome, 
  MaterialIcons, 
  Feather, 
  MaterialCommunityIcons, 
  Ionicons 
} from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { DarkTheme, LightTheme, type ThemeColors } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import { ProfileHeader } from '@/components/ProfileHeader';
import { StatsRow } from '@/components/StatsRow';
import { ResumeManager } from '@/components/ResumeManager';
import { SocialLinks } from '@/components/SocialLinks';
// Fix the PDF Viewer import
import PDFViewer from '@/components/PDFViewer';


// Type definitions
type UserType = {
  id: string;
  email?: string;
  userType?: 'job_seeker' | 'employer';
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    status?: 'online' | 'offline' | 'busy';
  };
  status?: 'online' | 'offline' | 'busy';
  full_name?: string;
  avatar_url?: string;
};

type ResumeFileType = {
  name: string;
  uri: string;
  type: string;
  size: number;
};

type SocialLinksType = {
  github: string;
  linkedin: string;
  website: string;
};

type StatsDataType = {
  applications: number;
  interviews: number;
  offers: number;
};

interface Theme extends ThemeColors {
  dark: boolean;
  error: string;
  primary: string;
  tint: string;
  border: string;
  textSecondary: string;
  background: string;
}

const ProfileScreen = () => {
  const { theme, user, signOut, refreshUserProfile, isLoading, toggleTheme } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [resumeFile, setResumeFile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [socialLinks, setSocialLinks] = useState({
    github: '',
    linkedin: '',
    website: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState({
    applications: 0,
    interviews: 0,
    offers: 0
  });



  // Theme toggle animation
  const toggleAnimation = useState(new Animated.Value(theme === 'light' ? 0 : 1))[0];
  
  const activeSocialLinks = [
    { type: 'github' as const, url: socialLinks.github },
    { type: 'linkedin' as const, url: socialLinks.linkedin },
    { type: 'website' as const, url: socialLinks.website }
  ].filter(link => link.url);
  
  const statsData = [
    { label: 'Applications', value: stats.applications },
    { label: 'Interviews', value: stats.interviews },
    { label: 'Offers', value: stats.offers },
  ];
  
  const handleSocialLinkChange = (field: 'github' | 'linkedin' | 'website', value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleSaveSocialLinks = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          github_url: socialLinks.github || null,
          linkedin_url: socialLinks.linkedin || null,
          website_url: socialLinks.website || null
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      Alert.alert('Success', 'Your profile has been updated');
      setIsEditing(false);
      setDataFetched(true);
    } catch (error) {
      console.error('Error updating social links:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };
  
  const handleSocialPress = (type: string, url: string) => {
    if (!url) return;

    // Ensure the URL has a protocol
    let formattedUrl = url;
    if (!/^https?:\/\//i.test(url)) {
      formattedUrl = 'https://' + url;
    }

    Linking.openURL(formattedUrl).catch(err => {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Could not open the link');
    });
  };

  // Enhanced theme toggle with smooth animation
  const handleThemeToggle = () => {
    const newThemeValue = theme === 'light' ? 1 : 0;

    // Animate the toggle slider
    Animated.timing(toggleAnimation, {
      toValue: newThemeValue,
      duration: 200,
      useNativeDriver: false,
    }).start();

    // Call the original toggle function
    toggleTheme();
  };



  // Fetch user profile data
  // Define fetchUserProfile function outside of useEffect for broader scope
  const fetchUserProfile = async () => {
    if (!user) return;
    
    // Don't fetch if we've already loaded the data and aren't explicitly refreshing
    if (dataFetched && !profileLoading) return;
    
    setProfileLoading(true);
    try {
      // Fetch main profile with social links - SECURITY: Always filter by current user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('github_url, linkedin_url, website_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile data:', profileError);
        throw profileError;
      }
      
      if (profileData) {
        setSocialLinks({
          github: profileData.github_url || '',
          linkedin: profileData.linkedin_url || '',
          website: profileData.website_url || ''
        });
      }
      
      if (user.userType === 'job_seeker') {
        // Fetch job seeker profile - SECURITY: Always filter by current user
        const { data, error } = await supabase
          .from('job_seeker_profiles')
          .select('*')
          .eq('profile_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching job seeker profile:', error);
          throw error; // Ignore not found errors
        }
        
        if (data?.resume_url) {
          setResumeFile({
            name: 'Resume',
            uri: data.resume_url,
          });
        }
        
        // Fetch application stats - SECURITY: Always filter by current user
        const { data: statsData, error: statsError } = await supabase
          .from('job_seeker_application_stats')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();
          
        if (statsError && statsError.code !== 'PGRST116') console.error('Error fetching stats:', statsError);
        
        if (statsData) {
          setStats({
            applications: statsData.pending_applications || 0,
            interviews: statsData.interviews || 0,
            offers: statsData.offers || 0
          });
        }
      }



      setDataFetched(true);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };
  
  // Sync animation with theme changes
  useEffect(() => {
    toggleAnimation.setValue(theme === 'light' ? 0 : 1);
  }, [theme, toggleAnimation]);

  // Initial data fetch on mount
  useEffect(() => {
    if (user && !dataFetched) {
      fetchUserProfile();
    }
  }, [user, dataFetched]);

  // Use focus effect to fetch data only when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user && (!dataFetched || isLoading)) {
        fetchUserProfile();
      }
      
      // Clean-up function
      return () => {};
    }, [user, dataFetched, isLoading, fetchUserProfile])
  );

  // Avatar edit functionality has been removed as per requirements
  
  // Bio functionality has been removed as per requirements
  
  const handleResumeUpload = async () => {
    // TODO: implement resume upload
    Alert.alert('Info', 'Resume upload functionality will be implemented soon');
  };
  
  const handleResumePreview = () => {
    if (resumeFile?.uri) {
      // In a real app, you would open the PDF or document
      Alert.alert('Resume Preview', `Previewing resume: ${resumeFile.name}`);
    } else {
      Alert.alert('No Resume', 'Please upload a resume first');
    }
  };
  
  const handleResumeDownload = async () => {
    if (resumeFile?.uri) {
      // In a real app, you would implement file download
      Alert.alert('Download', `Downloading resume: ${resumeFile.name}`);
    } else {
      Alert.alert('No Resume', 'No resume available to download');
    }
  };
  
  const handleResumeDelete = async () => {
    if (!resumeFile) return;
    
    try {
      // In a real app, you would also delete the file from storage
      setResumeFile(null);
      Alert.alert('Success', 'Resume has been removed');
    } catch (error) {
      console.error('Error deleting resume:', error);
      Alert.alert('Error', 'Failed to delete resume');
    }
  };
  
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            // The auth state change listener in the root layout will handle navigation
          },
        },
      ]
    );
  };

  if (profileLoading || isLoading || !user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={user.name || 'User'}
          title={user.userType === 'job_seeker' ? 'Job Seeker' : 'Service Provider'}
          avatarUrl={user.avatar}
          status="online"
          onEditAvatar={() => {}} // No-op as per requirements
        />

        {/* Debug Button - Temporary */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: '#ff6b6b' }]}
            onPress={() => router.push('/debug')}
          >
            <FontAwesome name="bug" size={20} color="white" />
            <Text style={styles.debugButtonText}>Debug & Clear Auth Data</Text>
          </TouchableOpacity>
        </View>

        {/* Application Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Application Stats
          </Text>
          <StatsRow stats={statsData} />
        </View>



        {/* Theme Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
            Appearance
          </Text>
          <View style={[styles.themeToggleContainer, { backgroundColor: themeColors.cardSecondary }]}>
            <View style={styles.themeToggleInfo}>
              <FontAwesome
                name={theme === 'light' ? 'sun-o' : 'moon-o'}
                size={20}
                color={themeColors.text}
                style={styles.themeIcon}
              />
              <View style={styles.themeTextContainer}>
                <Text style={[styles.themeToggleLabel, { color: themeColors.text }]}>
                  Theme
                </Text>
                <Text style={[styles.themeToggleDescription, { color: themeColors.textSecondary }]}>
                  {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleThemeToggle}
              style={[
                styles.themeToggleButton,
                {
                  backgroundColor: theme === 'light' ? '#E0E0E0' : '#333333',
                }
              ]}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.themeToggleSlider,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{
                      translateX: toggleAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 22],
                      })
                    }],
                  }
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Job Preferences */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.preferenceItem, { borderBottomColor: themeColors.border }]}
            onPress={() => router.push('/(modals)/job-preferences')}
            activeOpacity={0.7}
          >
            <View style={styles.preferenceContent}>
              <FontAwesome
                name="filter"
                size={20}
                color={themeColors.text}
                style={styles.preferenceIcon}
              />
              <View style={styles.preferenceTextContainer}>
                <Text style={[styles.preferenceLabel, { color: themeColors.text }]}>
                  Job Preferences
                </Text>
                <Text style={[styles.preferenceDescription, { color: themeColors.textSecondary }]}>
                  Customize your job search filters
                </Text>
              </View>
            </View>
            <FontAwesome
              name="chevron-right"
              size={16}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Social Links
            </Text>
            {isEditing ? (
              <View style={styles.editButtons}>
                <TouchableOpacity 
                  onPress={handleSaveSocialLinks}
                  style={[styles.saveButton, { backgroundColor: themeColors.tint }]}
                >
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  style={[styles.cancelButton, { borderColor: themeColors.border }]}
                >
                  <Text style={[styles.buttonText, { color: themeColors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={{ color: themeColors.tint }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.socialLinksForm}>
              <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                <View style={styles.inputWithIcon}>
                  <FontAwesome 
                    name="github" 
                    size={20} 
                    color={themeColors.textSecondary} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    placeholder="GitHub URL"
                    placeholderTextColor={themeColors.textSecondary}
                    value={socialLinks.github}
                    onChangeText={(text) => handleSocialLinkChange('github', text)}
                    style={[styles.input, { color: themeColors.text }]}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                <View style={styles.inputWithIcon}>
                  <FontAwesome 
                    name="linkedin" 
                    size={20} 
                    color={themeColors.textSecondary} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    placeholder="LinkedIn URL"
                    placeholderTextColor={themeColors.textSecondary}
                    value={socialLinks.linkedin}
                    onChangeText={(text) => handleSocialLinkChange('linkedin', text)}
                    style={[styles.input, { color: themeColors.text }]}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={[styles.inputContainer, { marginBottom: 16 }]}>
                <View style={styles.inputWithIcon}>
                  <FontAwesome 
                    name="globe" 
                    size={20} 
                    color={themeColors.textSecondary} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    placeholder="Personal Website"
                    placeholderTextColor={themeColors.textSecondary}
                    value={socialLinks.website}
                    onChangeText={(text) => handleSocialLinkChange('website', text)}
                    style={[styles.input, { color: themeColors.text }]}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>
          ) : activeSocialLinks.length > 0 ? (
            <SocialLinks links={activeSocialLinks} onPress={handleSocialPress} />
          ) : (
            <Text style={[styles.noLinksText, { color: themeColors.textSecondary }]}>
              No social links added. Tap 'Edit' to add some.
            </Text>
          )}
        </View>

        {/* Resume Manager */}
        {user.userType === 'job_seeker' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Resume
            </Text>
            <ResumeManager
              resumeFile={resumeFile}
              onUpload={handleResumeUpload}
              onPreview={handleResumePreview}
              onDownload={handleResumeDownload}
              onDelete={handleResumeDelete}
            />
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={[styles.signOutButton, { backgroundColor: themeColors.error }]}
        >
          <FontAwesome name="sign-out" size={16} color="white" style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    padding: 8,
    borderRadius: 4,
  },
  cancelButton: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    color: 'white',
  },
  socialLinksForm: {
    marginBottom: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    padding: 8,
    fontSize: 16,
  },
  noLinksText: {
    fontSize: 16,
    marginBottom: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#dc3545', // Default red color if theme error color is not available
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Theme toggle styles
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  themeToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeIcon: {
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  themeTextContainer: {
    flex: 1,
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  themeToggleDescription: {
    fontSize: 14,
  },
  themeToggleButton: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  themeToggleSlider: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Recommendation banner styles
  recommendationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noPreferencesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 18,
  },
  preferencesButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  preferencesButtonText: {
    fontSize: 16,
  },
  setupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceIcon: {
    marginRight: 16,
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 14,
  },
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});


