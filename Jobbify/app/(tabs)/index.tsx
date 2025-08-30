import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Animated, PanResponder, Platform,
  ActivityIndicator, FlatList, Alert, ToastAndroid,
  Pressable, TextInput, SafeAreaView, ScrollView, Modal, StatusBar,
  TouchableWithoutFeedback, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import TabHeader from '@/components/TabHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appearance } from 'react-native';
import { useAppContext, useSafeAppContext } from '@/context/AppContext';
import { applyToJob, updateApplicationStatus, fetchApplications, getAppliedJobIds } from '@/services/jobApplicationService';
import { getCoverLetterStatusMap, getEnhancedCoverLetterStatusMap } from '@/services/coverLetterService';
import { CoverLetterAttachmentModal } from '@/components/CoverLetterAttachmentModal';
import { CoverLetterStatusIndicator } from '@/components/CoverLetterStatusIndicator';
import { fetchJobs, fetchJobsWithCaching, fetchJobsForUser } from '@/services/JobsService';
import { refreshJobs, testApiConnection } from '@/services/remoteOkService';
import { LightTheme, DarkTheme, ThemeColors } from '@/constants/Theme';
import { ApiDebugger } from '@/components/ApiDebugger';
import { router } from 'expo-router';
import { Job as ContextJob, AppliedJob } from '@/context/AppContext';
import { useAuthCheck } from '@/utils/authCheck';
import { supabase } from '@/lib/supabase';
import { recordSwipe, saveJobToBookmarks } from '@/services/swipeService';
import {
  getPersonalizedJobRecommendations,
  recordEnhancedSwipe,
  recordRecommendationInteraction,
  getUserJobPreferences,
  JobRecommendation,
  JobMatchingResult
} from '@/services/jobRecommendationService';
import { getFilteredJobsForUser, recordJobInteraction } from '@/services/FilteredJobsService';

import { SmartLogo, getCompanyLogoUrl } from '@/components/SmartLogo';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65; // Reduced from 0.75 to avoid overlapping buttons in default state

// Simple function to prevent errors if we've gone past array bounds
const getCardIndex = (index: number, cards: any[]): number => {
  // If we've swiped through all cards, go back to the first
  if (index >= cards.length) {
    return 0;
  }
  return index;
};

// No longer needed as timeline is removed

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  pay: string;
  image: string;
  distance: string;
  tags: string[];
  description: string;
  qualifications: string[];
  requirements: string[];
}

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  logo: string;
  appliedAt: string;
  status: string;
  statusColor: string;
  job?: Job; // Optional reference to the full job
}

interface Message {
  id: string;
  contact: string;
  company: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    pay: '$90K - $120K',
    image: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
    distance: '5 km',
    tags: ['React', 'JavaScript', 'Remote'],
    description: 'We are looking for an experienced Frontend Developer with React skills to join our growing team.',
    qualifications: ['Experience in React', 'Strong organizational skills', 'Excellent communication'],
    requirements: ['Bachelors degree preferred', 'Ability to travel']
  },
  {
    id: '2',
    title: 'UX Designer',
    company: 'DesignHub',
    location: 'New York, NY',
    pay: '$85K - $110K',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=688&q=80',
    distance: '3 km',
    tags: ['UI/UX', 'Figma', 'Design'],
    description: 'Join our team to create beautiful and functional user experiences for our clients.',
    qualifications: ['Experience in UX design', 'Strong portfolio', 'Excellent communication'],
    requirements: ['Bachelors degree preferred', 'Previous design experience']
  },
  {
    id: '3',
    title: 'Data Scientist',
    company: 'DataFlow',
    location: 'Austin, TX',
    pay: '$100K - $130K',
    image: 'https://images.unsplash.com/photo-1573496799652-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1169&q=80',
    distance: '8 km',
    tags: ['Python', 'Machine Learning', 'SQL'],
    description: 'Looking for a data scientist to help us extract insights from our growing dataset.',
    qualifications: ['Experience in data science', 'Strong analytical skills', 'Excellent communication'],
    requirements: ['Bachelors degree preferred', 'Previous data science experience']
  },
  {
    id: '4',
    title: 'Mobile Developer',
    company: 'AppWorks',
    location: 'Chicago, IL',
    pay: '$95K - $125K',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
    distance: '2 km',
    tags: ['iOS', 'Android', 'React Native'],
    description: 'Help us build our mobile applications for iOS and Android platforms.',
    qualifications: ['Experience in mobile development', 'Strong portfolio', 'Excellent communication'],
    requirements: ['Bachelors degree preferred', 'Previous mobile development experience']
  },
  {
    id: '5',
    title: 'Event Coordinator',
    company: 'Party Planners Inc.',
    location: 'Miami, FL',
    pay: '$55K - $65K',
    image: 'https://images.unsplash.com/photo-1573497161161-c3e73707e25c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
    distance: '4 km',
    tags: ['Event Planning', 'Management', 'Creative'],
    description: 'Organize and manage corporate events and private parties.',
    qualifications: ['Experience in event planning', 'Strong organizational skills', 'Excellent communication'],
    requirements: ['Bachelors degree preferred', 'Ability to travel']
  },
  {
    id: '6',
    title: 'Customer Support Rep',
    company: 'HelpDesk Heroes',
    location: 'Remote',
    pay: '$40K - $50K',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
    distance: 'Remote',
    tags: ['Customer Service', 'Communication', 'Remote'],
    description: 'Provide support to customers via phone and email.',
    qualifications: ['Excellent communication skills', 'Problem-solving abilities', 'Patience'],
    requirements: ['High school diploma', 'Previous customer service experience']
  },
];

// JobsScreenWrapper component to safely handle context
const JobsScreenWrapper = () => {
  // Enforce authentication
  useAuthCheck();

  // Pre-extract the context values here - separating context use from render
  const context = useAppContext();

  // Use separate state for applications to ensure reactivity
  const [localApplications, setLocalApplications] = useState<AppliedJob[]>([]);
  const [coverLetterStatusMap, setCoverLetterStatusMap] = useState<Record<string, boolean>>({});

  // Cover letter attachment modal state
  const [coverLetterModalVisible, setCoverLetterModalVisible] = useState(false);
  const [selectedJobForCoverLetter, setSelectedJobForCoverLetter] = useState<Job | null>(null);

  // Handle opening cover letter modal
  const openCoverLetterModal = (job: Job) => {
    setSelectedJobForCoverLetter(job);
    setCoverLetterModalVisible(true);
  };

  // Handle closing cover letter modal
  const closeCoverLetterModal = () => {
    setCoverLetterModalVisible(false);
    setSelectedJobForCoverLetter(null);
  };

  // Handle cover letter attachment change
  const handleCoverLetterAttachmentChange = async (hasAttachment: boolean) => {
    if (selectedJobForCoverLetter && context.user?.id) {
      // Update the cover letter status map
      setCoverLetterStatusMap(prev => ({
        ...prev,
        [selectedJobForCoverLetter.id]: hasAttachment
      }));

      // Refresh the cover letter status map from the server
      try {
        const statusMap = await getCoverLetterStatusMap(context.user.id);
        setCoverLetterStatusMap(statusMap);
      } catch (error) {
        console.error('Error refreshing cover letter status:', error);
      }
    }
  };

  // Initialize applications from context
  useEffect(() => {
    setLocalApplications(context.applications);
  }, [context.applications]);

  // Initialize cover letter status map
  useEffect(() => {
    if (context.user) {
      getCoverLetterStatusMap(context.user.id)
        .then(coverLetterMap => {
          setCoverLetterStatusMap(coverLetterMap);
        })
        .catch(error => {
          console.error('Error fetching cover letter status:', error);
        });
    }
  }, [context.user]);

  // Create a wrapper for addApplication that updates local state immediately
  const handleAddApplication = useCallback((job: Job) => {
    console.log('[DEBUG] Adding application for job:', job.id, job.title);

    // First call the context method to persist to storage
    context.addApplication(job);

    // Then update local state immediately for UI responsiveness
    setLocalApplications(prevApps => {
      // Check if this job is already in applications
      if (prevApps.some(app => app.job.id === job.id)) {
        console.log('[DEBUG] Application already exists, not adding duplicate');
        return prevApps;
      }

      console.log('[DEBUG] Adding new application to local state');

      // Add the new application to the beginning of the list
      const newApps = [{
        job,
        status: 'applying' as const, // Fix the TypeScript error by using "as const"
        statusColor: '#FFC107',
        appliedAt: new Date().toISOString(),
      }, ...prevApps];

      console.log(`[DEBUG] Local applications count is now: ${newApps.length}`);
      return newApps;
    });
  }, [context.addApplication]);

  // Provide pre-extracted values as props, but use local applications state
  return (
    <>
      <JobsScreen
        theme={context.theme}
        addApplication={handleAddApplication}
        userApplications={localApplications}
        coverLetterStatusMap={coverLetterStatusMap}
        user={context.user}
        openCoverLetterModal={openCoverLetterModal}
      />

      {/* Cover Letter Attachment Modal */}
      {selectedJobForCoverLetter && (
        <CoverLetterAttachmentModal
          visible={coverLetterModalVisible}
          onClose={closeCoverLetterModal}
          jobId={selectedJobForCoverLetter.id}
          userId={context.user?.id || ''}
          jobTitle={selectedJobForCoverLetter.title}
          companyName={selectedJobForCoverLetter.company}
          themeColors={context.theme === 'light' ? LightTheme : DarkTheme}
          onAttachmentChange={handleCoverLetterAttachmentChange}
        />
      )}
    </>
  );
};

// Modified JobsScreen to receive props instead of using context directly
const JobsScreen: React.FC<{
  theme: 'light' | 'dark',
  addApplication: (job: Job) => void,
  userApplications: AppliedJob[],
  coverLetterStatusMap: Record<string, boolean>,
  user: any,
  openCoverLetterModal: (job: Job) => void
}> = ({
  theme,
  addApplication,
  userApplications,
  coverLetterStatusMap,
  user,
  openCoverLetterModal
}) => {  // Using React.FC to explicitly type the component
  // Use theme-derived values in a separate memo to avoid render-time calculations
  const themeColors = React.useMemo(() => {
    return theme === 'light' ? LightTheme : DarkTheme;
  }, [theme]);

  // Enhanced theme-aware colors for better visibility
  const redColor = React.useMemo(() => themeColors.passButtonColor, [themeColors]);
  const greenColor = React.useMemo(() => themeColors.applyButtonColor, [themeColors]);
  const blueColor = React.useMemo(() => themeColors.infoButtonColor, [themeColors]);
  const overlayIconColor = React.useMemo(() => themeColors.text, [themeColors]);

  // Enhanced icon colors for better contrast in both themes
  const iconColorInactive = React.useMemo(() => themeColors.textSecondary, [themeColors]);
  const iconColorActive = React.useMemo(() => themeColors.background, [themeColors]);
  const insets = useSafeAreaInsets();

  // Current swipe position for visual feedback during gesture
  const [swipePosition, setSwipePosition] = useState({ x: 0, y: 0 });
  // Whether the card is currently being swiped
  const [isSwiping, setIsSwiping] = useState(false);
  // Animation completion states
  const [hasSwipedLeft, setHasSwipedLeft] = useState(false);
  const [hasSwipedRight, setHasSwipedRight] = useState(false);

  // Don't need these anymore
  const swipeAnim = useRef(new Animated.ValueXY()).current;
  const [swipeOverlay, setSwipeOverlay] = useState<'like' | 'save' | 'pass' | 'info' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeTintColor, setSwipeTintColor] = useState<'none' | 'green' | 'red' | 'blue'>('none');

  // Progress stats
  const [jobsApplied, setJobsApplied] = useState(0);
  const [jobsTarget] = useState(12);
  const [progressPercent, setProgressPercent] = useState(0);



  // Jobs state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [coverLetterStatus, setCoverLetterStatus] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // State for personalized recommendations
  const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
  const [matchingResult, setMatchingResult] = useState<JobMatchingResult | null>(null);
  const [hasUserPreferences, setHasUserPreferences] = useState(false);
  const [showRecommendationInfo, setShowRecommendationInfo] = useState(false);
  const [isJobDetailsVisible, setIsJobDetailsVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isViewingFromInbox, setIsViewingFromInbox] = useState(false);

  // Animation and button states
  const [undoActive, setUndoActive] = useState(false);
  const [passActive, setPassActive] = useState(false);
  const [infoActive, setInfoActive] = useState(false);
  const [likeActive, setLikeActive] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;
  const passScale = useRef(new Animated.Value(1)).current;
  const infoScale = useRef(new Animated.Value(1)).current;
  const [swipedJobs, setSwipedJobs] = useState<{job: Job, direction: 'left' | 'right', index: number}[]>([]);

  // Safe current job reference - get the current job with error checking
  const safeCurrentJob = React.useMemo(() => {
    return filteredJobs[currentIndex] || null;
  }, [filteredJobs, currentIndex]);

  // Filter state


  // Inbox messages state (mock data)
  const [messages] = useState<Message[]>([
    {
      id: '1',
      contact: 'John Recruiter',
      company: 'TechCorp',
      avatar: 'https://randomuser.me/api/portraits/men/41.jpg',
      lastMessage: 'We would like to invite you for an interview next week.',
      timestamp: 'Today, 2:30 PM',
      unread: true
    },
    {
      id: '2',
      contact: 'Sarah HR',
      company: 'DesignHub',
      avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
      lastMessage: 'Thank you for your application. We will review it shortly.',
      timestamp: 'Yesterday',
      unread: false
    },
    {
      id: '3',
      contact: 'Mike Manager',
      company: 'DataFlow',
      avatar: 'https://randomuser.me/api/portraits/men/22.jpg',
      lastMessage: 'Can you provide some examples of your previous work?',
      timestamp: 'Apr 8',
      unread: true
    },
  ]);

  // Restore showAppliedNotification and setShowAppliedNotification state
  const [showAppliedNotification, setShowAppliedNotification] = useState(false);
  // Restore isSearchVisible and setIsSearchVisible state
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Add state for filter visibility


  // Add state for API debugger visibility
  const [showApiDebugger, setShowApiDebugger] = useState(false);

  // --- Animated Filter Panel ---


  // Show a notification message
  const showNotification = (message: string) => {
    console.log(message);
    // Set notification state and auto-hide after a delay
    setShowAppliedNotification(true);
    setTimeout(() => {
      setShowAppliedNotification(false);
    }, 2000);
  };

  // Animate button press effect
  const animateButton = (scaleAnim: Animated.Value, toValue: number) => {
    Animated.spring(scaleAnim, {
      toValue,
      friction: 5,
      tension: 40,
      useNativeDriver: true
    }).start();
  };

  // Complete a swipe animation
  const completeSwipeAnimation = (direction: 'left' | 'right') => {
    if (!safeCurrentJob) return;

    // Set animation state to prevent multiple swipes at once
    setIsAnimating(true);

    // Record the swipe in our state
    setSwipedJobs(prev => [...prev, { job: safeCurrentJob, direction, index: currentIndex }]);

    // Permanently remove this job from the filtered jobs array to prevent it from reappearing
    setFilteredJobs(currentJobs => {
      return currentJobs.filter(job => job.id !== safeCurrentJob.id);
    });

    // Clean up the animation state
    setTimeout(() => {
      setIsAnimating(false);
      setSwipeOverlay(null);
      setSwipeTintColor('none');
    }, 300);
  };

  // Handle left swipe (pass)
  const handleSwipeLeft = useCallback(async () => {
    if (!safeCurrentJob || isAnimating) return;

    // Set animating state immediately to prevent concurrent swipes
    setIsAnimating(true);

    // Close modal if open to ensure smooth transition
    if (isJobDetailsVisible) {
      closeJobDetailsWithAnimation();
    }

    // Log the job being swiped left
    console.log('Swiping job left to pass:', safeCurrentJob.id, safeCurrentJob.title);

    // Record job interaction for learning
    if (user?.id) {
      try {
        const jobId = parseInt(safeCurrentJob.id);
        if (!isNaN(jobId)) {
          await recordJobInteraction(user.id, jobId, 'dislike');
        }
      } catch (error) {
        console.error('Error recording job interaction:', error);
      }
    }

    // Store job reference to avoid race conditions
    const jobToSwipe = { ...safeCurrentJob };
    const currentIndexSnapshot = currentIndex;

    // Add to swipedJobs array to enable undo functionality
    setSwipedJobs(prev => {
      const newSwipedJobs = [...prev, { job: jobToSwipe, direction: 'left' as 'left', index: currentIndexSnapshot }];

      // Save swiped job IDs to AsyncStorage for persistence
      // Load existing IDs first, then add the new one
      loadSwipedJobIds().then(existingIds => {
        const updatedIds = [...existingIds, jobToSwipe.id];
        saveSwipedJobIds(updatedIds);
      }).catch(err => console.error('Error updating swiped job IDs:', err));

      return newSwipedJobs;
    });
    console.log('Job added to swipedJobs array and saved to AsyncStorage');

    // Permanently remove this job from the filtered jobs array to prevent it from reappearing
    setFilteredJobs(prev => prev.filter(job => job.id !== jobToSwipe.id));
    console.log('Removed job from filtered jobs to prevent reappearing');

    // Record the enhanced swipe with job details for learning
    if (user) {
      // Get the match score for this job if available
      const recommendation = recommendations.find(rec => rec.job.id === jobToSwipe.id);
      const matchScore = recommendation?.overall_score;

      recordEnhancedSwipe(user.id, jobToSwipe, 'left', matchScore)
        .then(() => {
          console.log('Enhanced swipe recorded for learning algorithm');
          // Also record the interaction for analytics
          return recordRecommendationInteraction(user.id, jobToSwipe.id, {
            was_viewed: true,
            was_swiped: true,
            swipe_direction: 'left'
          });
        })
        .catch((err: Error) => {
          console.error('Failed to record enhanced swipe:', err);
          // Fallback to basic swipe recording
          return recordSwipe(jobToSwipe.id, user.id, 'dislike');
        })
        .catch((fallbackErr: Error) => {
          console.error('Failed to record fallback swipe:', fallbackErr);
        });
    }

    // Set swiped state to trigger visual effect
    setHasSwipedLeft(true);

    // Move to next card after a delay
    setTimeout(() => {
      goToNextCard();

      // Reset animation state
      setIsAnimating(false);
      setSwipeOverlay(null);
      setSwipeTintColor('none');
    }, 300);
  }, [safeCurrentJob, user, currentIndex, isAnimating]);

  // Handle undo of previous swipe
  const handleUndoSwipe = async () => {
    // Don't do anything if no jobs to restore or already animating
    if (swipedJobs.length === 0 || isAnimating) return;

    console.log('Undoing swipe, current swiped jobs:', swipedJobs.length);

    // Get the last swiped job
    const lastSwipedJob = swipedJobs[swipedJobs.length - 1];

    // Reset all visual states
    setIsAnimating(true);
    setHasSwipedLeft(false);
    setHasSwipedRight(false);
    setSwipePosition({ x: 0, y: 0 });
    swipeAnim.setValue({ x: 0, y: 0 });

    // If it was a right swipe (like), we'd need to remove it from applications
    if (lastSwipedJob.direction === 'right') {
      console.log('Removing job from saved list:', lastSwipedJob.job.title);
      // In a real app with a backend, remove it from saved jobs
    }

    // Add the job back to our filtered jobs array
    setFilteredJobs(currentJobs => {
      // Create a new array with the job inserted at the current index
      const newJobs = [...currentJobs];
      newJobs.splice(currentIndex, 0, lastSwipedJob.job);
      return newJobs;
    });

    // Remove from swiped jobs history in memory
    setSwipedJobs(prev => prev.slice(0, -1));

    // Remove the job ID from AsyncStorage as well
    try {
      // Get current stored job IDs
      const storedIds = await loadSwipedJobIds();
      // Remove the undone job ID
      const updatedIds = storedIds.filter(id => id !== lastSwipedJob.job.id);
      // Save the updated list back to AsyncStorage
      await saveSwipedJobIds(updatedIds);
      console.log('Removed job ID from persisted storage during undo');
    } catch (error) {
      console.error('Failed to update AsyncStorage during undo:', error);
    }

    // Show feedback to user
    showNotification('Brought back previous job');

    // Clean up animation state after a delay
    setTimeout(() => {
      setIsAnimating(false);
      setSwipeOverlay(null);
      setSwipeTintColor('none');
    }, 300);
  };
  // Create a test job application
  const createTestJobApplication = () => {
    if (!user) return;

    // Use a job from the actual jobs data if available, otherwise use mock job
    let testJob = null;

    // Try to find a job from the fetched jobs first
    if (jobs && jobs.length > 0) {
      testJob = jobs[0];
    } else if (mockJobs && mockJobs.length > 0) {
      testJob = mockJobs[0];
    }

    if (!testJob) {
      console.log('No jobs available for test application');
      return;
    }

    // Check if we already have an application for this job
    if (userApplications.some(app => app.job.id === testJob.id)) {
      console.log('[DEBUG] Application already exists, not adding duplicate');
      return;
    }

    // Add to context
    addApplication(testJob);

    // Log for debugging
    console.log('Created test application for:', testJob.title);
  };

  // State for Tinder-like expandable job details
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const detailsAnimation = useRef(new Animated.Value(0)).current;

  // Enhanced modal animation values for smooth slide-up/down animations
  const modalSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current; // Start off-screen
  const backdropOpacityAnim = useRef(new Animated.Value(0)).current;
  const modalDragY = useRef(new Animated.Value(0)).current; // For gesture handling
  const [isDragging, setIsDragging] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Debug helper to track interactions
  const logInteraction = (event: string, data: Record<string, any>) => {
    console.log(`Panel interaction: ${event}`, data);
  };

  // Pan responder for modal gesture handling
  const modalPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to vertical gestures and when not already dragging horizontally
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        modalDragY.setOffset(modalDragY._value);
        modalDragY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow downward dragging
        if (gestureState.dy > 0) {
          modalDragY.setValue(gestureState.dy);
          // Update backdrop opacity based on drag distance
          const dragProgress = Math.min(gestureState.dy / 200, 1);
          backdropOpacityAnim.setValue(0.7 * (1 - dragProgress));
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        setIsDragging(false);
        modalDragY.flattenOffset();

        // If dragged down more than 100px or with sufficient velocity, close modal
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeJobDetailsWithAnimation();
        } else {
          // Snap back to original position
          Animated.parallel([
            Animated.spring(modalDragY, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 8,
            }),
            Animated.timing(backdropOpacityAnim, {
              toValue: 0.7,
              duration: 200,
              useNativeDriver: false,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Improved pan responder with better touch handling
  const detailsPanResponder = useRef(
    PanResponder.create({
      // Always grant the responder to this component
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,

      // For movement-based interactions
      onMoveShouldSetPanResponder: (_, gesture) => {
        logInteraction('onMoveShouldSetPanResponder', { dx: gesture.dx, dy: gesture.dy });
        // Less strict gesture detection
        return Math.abs(gesture.dy) > 5;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      // Handle active gestures
      onPanResponderGrant: () => {
        logInteraction('onPanResponderGrant', {});
      },

      onPanResponderMove: (_, gesture) => {
        logInteraction('onPanResponderMove', { dy: gesture.dy });
        // Allow all vertical movement for more fluid interaction
        const newValue = detailsExpanded ?
          1 + (gesture.dy / (SCREEN_HEIGHT * 0.6)) : // When expanded, start from 1 and go down
          (gesture.dy / -(SCREEN_HEIGHT * 0.6));    // When collapsed, start from 0 and go up

        // Clamp values between 0 and 1 with less restriction
        const clampedValue = Math.min(Math.max(newValue, 0), 1);
        detailsAnimation.setValue(clampedValue);
      },

      onPanResponderRelease: (_, gesture) => {
        logInteraction('onPanResponderRelease', { dy: gesture.dy, vy: gesture.vy });
        // Use velocity and distance for more natural interaction
        if (detailsExpanded) {
          // When expanded, determine if we should collapse
          if (gesture.dy > 50 || gesture.vy > 0.3) {
            collapseJobDetails();
          } else {
            // Snap back to fully expanded
            Animated.spring(detailsAnimation, {
              toValue: 1,
              useNativeDriver: false, // Can't use native driver with layout properties
              tension: 50,
              friction: 7
            }).start();
          }
        } else {
          // When collapsed, determine if we should expand
          if (gesture.dy < -50 || gesture.vy < -0.3) {
            expandJobDetails();
          } else {
            // Snap back to collapsed
            Animated.spring(detailsAnimation, {
              toValue: 0,
              useNativeDriver: false, // Can't use native driver with layout properties
              tension: 50,
              friction: 7
            }).start();
          }
        }
      },

      // Ensure we release the responder properly
      onPanResponderTerminationRequest: () => true,
      onPanResponderTerminate: () => {
        logInteraction('onPanResponderTerminate', {});
      }
    })
  ).current;

  // Enhanced openJobDetails with smooth slide-up animation
  const openJobDetails = (job: Job, fromInbox: boolean = false) => {
    // Set the selected job first
    setSelectedJob(job);

    // Store context of where this was opened from
    setIsViewingFromInbox(fromInbox);

    // Reset all animation values to ensure starting fresh
    modalSlideAnim.setValue(SCREEN_HEIGHT);
    backdropOpacityAnim.setValue(0);
    modalDragY.setValue(0);
    setIsDragging(false);

    // Make the modal visible
    setModalVisible(true);
    setIsJobDetailsVisible(true);

    // Use requestAnimationFrame for smoother animation
    requestAnimationFrame(() => {
      // Smooth slide-up animation with backdrop fade-in
      Animated.parallel([
        Animated.timing(modalSlideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacityAnim, {
          toValue: 0.7,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]).start();
    });
  };

  // Expand job details with animation
  const expandJobDetails = () => {
    console.log('Expanding job details');
    setDetailsExpanded(true);
    Animated.spring(detailsAnimation, {
      toValue: 1,
      useNativeDriver: false, // Can't use native driver with layout properties
      tension: 50,
      friction: 7
    }).start(() => {
      console.log('Expand animation completed');
    });
  };

  // Collapse job details with animation
  const collapseJobDetails = () => {
    console.log('Collapsing job details');
    setDetailsExpanded(false);
    Animated.spring(detailsAnimation, {
      toValue: 0,
      useNativeDriver: false, // Can't use native driver with layout properties
      tension: 80,
      friction: 7
    }).start(() => {
      console.log('Collapse animation completed');
      // Only close the modal if we're not already expanded again
      if (!detailsExpanded) {
        setIsJobDetailsVisible(false);
      }
    });
  };

  // Enhanced close function with smooth slide-down animation
  const closeJobDetailsWithAnimation = () => {
    console.log('Closing job details with animation');

    // Smooth slide-down animation with backdrop fade-out
    Animated.parallel([
      Animated.timing(modalSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacityAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      // Reset state after animation completes
      setModalVisible(false);
      setIsJobDetailsVisible(false);
      setIsViewingFromInbox(false);
      setDetailsExpanded(false);
      modalDragY.setValue(0);
      setIsDragging(false);
    });
  };

  // Close job details modal (legacy function for compatibility)
  const closeJobDetails = () => {
    closeJobDetailsWithAnimation();
  };

  // Manual toggle for when gestures fail
  const toggleJobDetails = () => {
    console.log('Manually toggling job details');
    if (detailsExpanded) {
      collapseJobDetails();
    } else {
      expandJobDetails();
    }
  };

  // Improved touch handlers for visual feedback during swipe
  const handleTouchStart = useRef({ x: 0, y: 0 });

  // Track if this was a tap or a swipe
  const isTap = useRef(true);

  const onTouchStart = (e: any) => {
    // Reset tap detection on touch start
    isTap.current = true;

    handleTouchStart.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY
    };
    setIsSwiping(true);
  };

  const onTouchMove = (e: any) => {
    if (!isSwiping) return;

    const deltaX = e.nativeEvent.pageX - handleTouchStart.current.x;

    // If moved more than a threshold, it's not a tap anymore
    if (Math.abs(deltaX) > 10) {
      isTap.current = false;
    }
    const deltaY = e.nativeEvent.pageY - handleTouchStart.current.y;

    // Update position for visual feedback
    setSwipePosition({
      x: deltaX,
      y: Math.min(Math.max(deltaY, -100), 100)
    });

    // Show appropriate overlay based on direction
    if (deltaX > 80) {
      setSwipeOverlay('like');
      setSwipeTintColor('green');
    } else if (deltaX < -80) {
      setSwipeOverlay('pass');
      setSwipeTintColor('red');
    } else {
      setSwipeOverlay(null);
      setSwipeTintColor('none');
    }
  };

  const onTouchEnd = (e: any) => {
    if (!isSwiping) return;

    const deltaX = e.nativeEvent.pageX - handleTouchStart.current.x;
    const deltaY = e.nativeEvent.pageY - handleTouchStart.current.y;

    // Detect if this was a tap (minimal movement in any direction)
    if (isTap.current && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // It was a tap, so open job details
      console.log('Card tapped, opening job details');
      openJobDetails(safeCurrentJob);
    }
    // Detect significant horizontal swipe
    else if (Math.abs(deltaX) > 100) {
      if (deltaX > 0) {
        // Right swipe
        setHasSwipedRight(true);
        handleSwipeRight();
      } else {
        // Left swipe
        setHasSwipedLeft(true);
        handleSwipeLeft();
      }
    } else {
      // Reset position if not swiped far enough
      setSwipePosition({ x: 0, y: 0 });
    }

    setIsSwiping(false);
    setSwipeOverlay(null);
    setSwipeTintColor('none');
  };

  // Animation refs for smoother transitions
  const nextCardAnim = useRef(new Animated.Value(0)).current;

  // Simple function to move to next card
  const goToNextCard = () => {
    // Create spring animation for the next card to become the current one
    Animated.spring(nextCardAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    }).start(() => {
      // Reset animation value for next use
      nextCardAnim.setValue(0);

      // Check if we need to load more jobs (but don't call if already loading)
      if (currentIndex >= filteredJobs.length - 3 && !isLoadingJobsRef.current) {
        console.log('Running low on jobs, fetching more...');
        loadJobs();
      }

      // Update index and reset states
      setCurrentIndex(currentIndex + 1);
      setHasSwipedLeft(false);
      setHasSwipedRight(false);
      setSwipePosition({ x: 0, y: 0 });
    });
  };

  // Immediately handle a right swipe
  const handleSwipeRight = useCallback(async () => {
    if (!safeCurrentJob || isAnimating) return;

    // Set animating state immediately to prevent concurrent swipes
    setIsAnimating(true);

    // Close modal if open to ensure smooth transition
    if (isJobDetailsVisible) {
      closeJobDetailsWithAnimation();
    }

    // Log the job being swiped right
    console.log('Swiping job right to save:', safeCurrentJob.id, safeCurrentJob.title);

    // Record job interaction for learning
    if (user?.id) {
      try {
        const jobId = parseInt(safeCurrentJob.id);
        if (!isNaN(jobId)) {
          await recordJobInteraction(user.id, jobId, 'like');
        }
      } catch (error) {
        console.error('Error recording job interaction:', error);
      }
    }

    // Store job reference to avoid race conditions
    const jobToSwipe = { ...safeCurrentJob };
    const currentIndexSnapshot = currentIndex;

    // Add to applications in context
    addApplication(jobToSwipe);

    // Add to swiped jobs array to enable undo functionality
    setSwipedJobs(prev => {
      const newSwipedJobs = [...prev, { job: jobToSwipe, direction: 'right' as 'right', index: currentIndexSnapshot }];

      // Save swiped job IDs to AsyncStorage for persistence
      loadSwipedJobIds().then(existingIds => {
        const updatedIds = [...existingIds, jobToSwipe.id];
        saveSwipedJobIds(updatedIds);
      }).catch(err => console.error('Error updating swiped job IDs:', err));

      return newSwipedJobs;
    });

    // Permanently remove this job from the filtered jobs array to prevent it from reappearing
    setFilteredJobs(prev => prev.filter(job => job.id !== jobToSwipe.id));
    console.log('Removed job from filtered jobs to prevent reappearing');

    // Record the enhanced swipe with job details for learning
    if (user) {
      // Get the match score for this job if available
      const recommendation = recommendations.find(rec => rec.job.id === jobToSwipe.id);
      const matchScore = recommendation?.overall_score;

      recordEnhancedSwipe(user.id, jobToSwipe, 'right', matchScore)
        .then(() => {
          console.log('Enhanced swipe recorded for learning algorithm');
          // Also record the interaction for analytics
          return recordRecommendationInteraction(user.id, jobToSwipe.id, {
            was_viewed: true,
            was_swiped: true,
            swipe_direction: 'right'
          });
        })
        .catch((err: Error) => {
          console.error('Failed to record enhanced swipe:', err);
          // Fallback to basic swipe recording
          return recordSwipe(jobToSwipe.id, user.id, 'like');
        })
        .catch((fallbackErr: Error) => {
          console.error('Failed to record fallback swipe:', fallbackErr);
        });

      // Save to bookmarks
      saveJobToBookmarks(jobToSwipe.id, user.id)
        .catch((err: Error) => {
          console.error('Failed to save to bookmarks:', err);
        });
    }

    // Set swiped state to trigger visual effect
    setHasSwipedRight(true);

    // Move to next card after a delay
    setTimeout(() => {
      goToNextCard();

      // Reset animation state
      setIsAnimating(false);
      setSwipeOverlay(null);
      setSwipeTintColor('none');
    }, 300);
  }, [safeCurrentJob, user, addApplication, currentIndex, isAnimating]);

  // Button handlers
  const handleButtonSwipeLeft = useCallback(() => {
    handleSwipeLeft();
  }, [handleSwipeLeft]);

  const handleButtonSwipeRight = useCallback(() => {
    handleSwipeRight();
  }, [handleSwipeRight]);

  // Render the cards with touch handlers
  const renderCards = () => {
    if (isLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={{ marginTop: 20, color: themeColors.text }}>Loading jobs...</Text>
        </View>
      );
    }

    if (filteredJobs.length === 0) {
      return (
        <View style={styles.noJobsContainer}>
          <Text style={[styles.noJobsText, { color: themeColors.text }]}>
            No jobs match your criteria.
          </Text>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: themeColors.tint }]}
            onPress={() => {
              setSearchQuery('');
              setFilteredJobs(jobs);
            }}
          >
            <Text style={[styles.clearButtonText, { color: '#fff' }]}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Only render the current card and next card for performance
    const currentJob = filteredJobs[getCardIndex(currentIndex, filteredJobs)];
    const nextJob = filteredJobs[getCardIndex(currentIndex + 1, filteredJobs)];

    return (
      <>
        {/* Next card (shown underneath the current card) */}
        {nextJob && (
          <Animated.View
            key={`next-card-${currentIndex+1}`}
            style={[
              styles.card,
              styles.nextCardStyle,
              // Animate next card position when current card is swiped
              {
                transform: [
                  {
                    scale: hasSwipedLeft || hasSwipedRight ?
                      nextCardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.95, 1]
                      }) : 0.95
                  },
                  {
                    translateY: hasSwipedLeft || hasSwipedRight ?
                      nextCardAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0]
                      }) : 10
                  }
                ],
                zIndex: 999 // Lower z-index to stay below buttons by default
              }
            ]}
          >
            <LinearGradient
              colors={themeColors.cardGradient}
              style={{ flex: 1, borderRadius: 24 }}
            >
              {/* Next card content */}
              <View style={styles.cardImageHalfWrapper}>
                <SmartLogo
                  company={nextJob.company}
                  logoUrl={nextJob.image || getCompanyLogoUrl(nextJob.company)}
                  style={styles.cardImageHalf}
                  resizeMode="cover"
                />

                {/* Company Logo Overlay */}
                <View style={styles.logoOverlayHalf}>
                  <SmartLogo
                    company={nextJob.company}
                    logoUrl={nextJob.logo || getCompanyLogoUrl(nextJob.company)}
                    style={styles.companyLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={[styles.cardDetailsHalf, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.cardTitleModern, { color: themeColors.text }]} numberOfLines={1}>
                  {nextJob.title}
                </Text>
                <Text style={[styles.cardCompany, { color: themeColors.textSecondary }]}>
                  {nextJob.company}
                </Text>
                <Text style={[styles.cardLocationModern, { color: themeColors.textSecondary }]}>
                  {nextJob.location}
                </Text>
                <View style={styles.tagsContainerModern}>
                  {nextJob.tags.slice(0, 3).map((tag, index) => (
                    <View
                      key={index}
                      style={[styles.tagModern, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                    >
                      <Text style={[styles.tagTextModern, { color: themeColors.text }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.payContainerModern}>
                  <FontAwesome name="money" size={16} color={themeColors.tint} style={{ marginRight: 6 }} />
                  <Text style={[styles.payModern, { color: themeColors.text }]}>
                    {nextJob.pay}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Current card (on top) */}
        {currentJob && (
          <Animated.View
            key={`card-${currentIndex}`}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={[
              styles.card,
              // Dynamic transform styling based on swipe state and position
              hasSwipedLeft ?
                {
                  transform: [
                    { translateX: -SCREEN_WIDTH * 1.5 },
                    { rotate: '-12deg' }
                  ],
                  opacity: swipeAnim.x.interpolate({
                    inputRange: [-SCREEN_WIDTH * 1.5, 0],
                    outputRange: [0, 1],
                    extrapolate: 'clamp'
                  }),
                  zIndex: 3000 // Highest z-index during swiping
                } :
                hasSwipedRight ?
                  {
                    transform: [
                      { translateX: SCREEN_WIDTH * 1.5 },
                      { rotate: '12deg' }
                    ],
                    opacity: swipeAnim.x.interpolate({
                      inputRange: [0, SCREEN_WIDTH * 1.5],
                      outputRange: [1, 0],
                      extrapolate: 'clamp'
                    }),
                    zIndex: 3000 // Highest z-index during swiping
                  } :
                  {
                    transform: [
                      { translateX: swipePosition.x },
                      { translateY: swipePosition.y },
                      { rotate: `${swipePosition.x * 0.05}deg` }
                    ],
                    zIndex: Math.abs(swipePosition.x) > 10 ? 3000 : 1000 // Higher z-index when actively swiping, lower when static
                  },
              // Border styling based on swipe direction
              hasSwipedLeft && { borderColor: '#FF3B30', borderWidth: 2 },
              hasSwipedRight && { borderColor: '#4CD964', borderWidth: 2 },
              // Dynamic border during swipe
              swipeOverlay === 'like' && { borderColor: '#4CD964', borderWidth: 2 },
              swipeOverlay === 'pass' && { borderColor: '#FF3B30', borderWidth: 2 },
            ]}
          >
            {/* Color tint overlay for right swipe (green) */}
            {swipePosition.x > 0 && (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.tintOverlay,
                  {
                    backgroundColor: `rgba(76, 217, 100, ${Math.min(Math.abs(swipePosition.x) / 300, 0.3)})`,
                    borderRadius: 22
                  }
                ]}
              />
            )}

            {/* Color tint overlay for left swipe (red) */}
            {swipePosition.x < 0 && (
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  styles.tintOverlay,
                  {
                    backgroundColor: `rgba(255, 59, 48, ${Math.min(Math.abs(swipePosition.x) / 300, 0.3)})`,
                    borderRadius: 22
                  }
                ]}
              />
            )}

            <LinearGradient
              colors={themeColors.cardGradient}
              style={{ flex: 1, borderRadius: 24 }}
            >
              {/* Card Content */}
              <View style={styles.cardImageHalfWrapper}>
                  <SmartLogo
                    company={currentJob.company}
                    logoUrl={currentJob.image || getCompanyLogoUrl(currentJob.company)}
                    style={styles.cardImageHalf}
                    resizeMode="cover"
                  />

                  {/* Company Logo Overlay */}
                  <View style={styles.logoOverlayHalf}>
                    <SmartLogo
                      company={currentJob.company}
                      logoUrl={currentJob.logo || getCompanyLogoUrl(currentJob.company)}
                      style={styles.companyLogo}
                      resizeMode="contain"
                    />
                  </View>
              </View>

              <View style={[styles.cardDetailsHalf, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.cardTitleModern, { color: themeColors.text }]} numberOfLines={1}>
                  {currentJob.title}
                </Text>
                <Text style={[styles.cardCompany, { color: themeColors.textSecondary }]}>
                  {currentJob.company}
                </Text>
                <Text style={[styles.cardLocationModern, { color: themeColors.textSecondary }]}>
                  {currentJob.location}
                </Text>
                <View style={styles.tagsContainerModern}>
                  {currentJob.tags.slice(0, 3).map((tag, index) => (
                    <View
                      key={index}
                      style={[styles.tagModern, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                    >
                      <Text style={[styles.tagTextModern, { color: themeColors.text }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.payContainerModern}>
                  <FontAwesome name="money" size={16} color={themeColors.tint} style={{ marginRight: 6 }} />
                  <Text style={[styles.payModern, { color: themeColors.text }]}>
                    {currentJob.pay}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Dynamic PASS label */}
            {swipePosition.x < -20 && (
              <View
                style={[
                  styles.passLabelTopContainer,
                  {
                    transform: [
                      { rotate: '25deg' },
                      { scale: 1 + Math.min(Math.abs(swipePosition.x) / 200, 0.8) }
                    ],
                    opacity: Math.min(Math.abs(swipePosition.x) / 100, 1)
                  }
                ]}
              >
                <Text
                  style={[
                    styles.actionLabelTop,
                    {
                      fontSize: 24 + Math.min(Math.abs(swipePosition.x) / 10, 18),
                      letterSpacing: 1.5
                    }
                  ]}
                >
                  PASS
                </Text>
              </View>
            )}

            {/* Dynamic APPLY label */}
            {swipePosition.x > 20 && (
              <View
                style={[
                  styles.applyLabelTopContainer,
                  {
                    transform: [
                      { rotate: '-25deg' },
                      { scale: 1 + Math.min(Math.abs(swipePosition.x) / 200, 0.8) }
                    ],
                    opacity: Math.min(Math.abs(swipePosition.x) / 100, 1)
                  }
                ]}
              >
                <Text
                  style={[
                    styles.actionLabelTop,
                    {
                      fontSize: 24 + Math.min(Math.abs(swipePosition.x) / 10, 18),
                      letterSpacing: 1.5
                    }
                  ]}
                >
                  APPLY
                </Text>
              </View>
            )}

            {/* Show overlays based on swipe state or animation state */}
            {(hasSwipedRight || swipeOverlay === 'like') && (
              <View style={[styles.overlayBadge, styles.likeBadge]}>
                <FontAwesome name="check" size={28} color="#fff" />
                <Text style={styles.overlayText}>SAVE</Text>
              </View>
            )}

            {(hasSwipedLeft || swipeOverlay === 'pass') && (
              <View style={[styles.overlayBadge, styles.passBadge]}>
                <FontAwesome name="close" size={28} color="#fff" />
                <Text style={styles.overlayText}>PASS</Text>
              </View>
            )}
          </Animated.View>
        )}
      </>
    );
  };



  // Render the search modal
  const renderSearchModal = () => {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={[styles.searchModalContainer, { backgroundColor: themeColors.card, width: '90%' }]}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 16 }}>
            Search Jobs
          </Text>
          <TextInput
            style={{ height: 50, borderColor: themeColors.border, borderWidth: 1, paddingHorizontal: 16, marginBottom: 16, borderRadius: 8, color: themeColors.text }}
            placeholder="Job title, company, or keywords"
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={{ backgroundColor: themeColors.tint, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
            onPress={() => {
              const filtered = jobs.filter(job =>
                job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
              );
              setFilteredJobs(filtered);
              setCurrentIndex(0);
              setIsSearchVisible(false);
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center' }}
            onPress={() => setIsSearchVisible(false)}
          >
            <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };



  // Enhanced job details modal with smooth slide-up animation and gesture handling
  const renderJobDetailsModal = () => {
    if (!selectedJob) return null;

    // Job details panel content
    const companyLogo = selectedJob.logo || getCompanyLogoUrl(selectedJob.company);

    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeJobDetails}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'transparent' }]}>
          {/* Enhanced backdrop with dynamic opacity */}
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: 'rgba(0,0,0,1)',
                opacity: backdropOpacityAnim,
              }
            ]}
          >
            {/* Touchable backdrop to close when tapping outside */}
            <TouchableWithoutFeedback onPress={closeJobDetails}>
              <View style={StyleSheet.absoluteFillObject} />
            </TouchableWithoutFeedback>
          </Animated.View>

          {/* Enhanced sliding panel with gesture handling */}
          <Animated.View
            {...modalPanResponder.panHandlers}
            style={[
              styles.enhancedModalPanel,
              {
                backgroundColor: themeColors.card,
                transform: [
                  { translateY: Animated.add(modalSlideAnim, modalDragY) }
                ],
              }
            ]}
          >
            {/* Enhanced drag handle with visual feedback */}
            <View style={styles.enhancedDragHandle}>
              <View style={[styles.dragIndicator, { backgroundColor: themeColors.textSecondary }]} />
              {isDragging && (
                <Text style={[styles.dragHint, { color: themeColors.textSecondary }]}>
                  Release to close
                </Text>
              )}
            </View>

            {/* Enhanced content container with proper scrolling */}
            <View style={styles.enhancedPanelContent}>
              <ScrollView>
                {/* Header section with logo and close button */}
                <View style={styles.detailsHeader}>
                  {/* Company logo */}
                  <View style={styles.companyLogoContainer}>
                    <SmartLogo
                      company={selectedJob.company}
                      logoUrl={companyLogo}
                      style={styles.companyLogoLarge}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Close button */}
                  <TouchableOpacity
                    style={styles.detailsCloseButton}
                    onPress={closeJobDetails}
                    activeOpacity={0.7}
                  >
                    <FontAwesome name="close" size={20} color={themeColors.text} />
                  </TouchableOpacity>
                </View>

                {/* Job title and basic info */}
                <View style={styles.jobMainDetails}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.jobDetailsTitleText, { color: themeColors.text, flex: 1 }]}>
                      {selectedJob.title}
                    </Text>
                    {isViewingFromInbox && (
                      <View style={[styles.statusBadge, { backgroundColor: '#4CD964' + '20', marginLeft: 8 }]}>
                        <FontAwesome name="check-circle" size={14} color="#4CD964" style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: '#4CD964', fontSize: 12 }]}>Applied</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.jobDetailsCompany, { color: themeColors.textSecondary }]}>
                    {selectedJob.company}
                  </Text>
                  <Text style={[styles.jobDetailsLocationText, { color: themeColors.textSecondary }]}>
                    {selectedJob.location}
                  </Text>
                  <Text style={[styles.jobDetailsPayText, { color: themeColors.tint }]}>
                    {selectedJob.pay}
                  </Text>

                  {/* Tags section */}
                  <View style={styles.tagsContainerModern}>
                    {selectedJob.tags.map((tag, index) => (
                      <View
                        key={index}
                        style={[styles.tagModern, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}
                      >
                        <Text style={[styles.tagTextModern, { color: themeColors.text }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Action buttons - Context-aware based on where opened from */}
                <View style={styles.jobActionButtons}>
                  {isViewingFromInbox ? (
                    // When viewing from inbox (already applied), show different actions
                    <>
                      <TouchableOpacity
                        style={[styles.jobActionButton, {backgroundColor: themeColors.tint + '15'}]}
                        onPress={() => {
                          console.log('Edit Cover Letter button pressed');
                          closeJobDetails();
                          openCoverLetterModal(selectedJob);
                        }}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="edit" size={22} color={themeColors.tint} />
                        <Text style={[styles.jobActionText, {color: themeColors.tint}]}>Cover Letter</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.jobActionButton, {backgroundColor: '#4CD964' + '15'}]}
                        onPress={() => {
                          console.log('Application Status button pressed');
                          closeJobDetails();
                          // Could navigate to application status or show status info
                          showNotification('Application submitted successfully');
                        }}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="check-circle" size={22} color="#4CD964" />
                        <Text style={[styles.jobActionText, {color: '#4CD964'}]}>Applied</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // When viewing from browse mode, show original actions
                    <>
                      <TouchableOpacity
                        style={[styles.jobActionButton, {backgroundColor: '#FF3B30' + '15'}]}
                        onPress={() => {
                          console.log('Pass button pressed');
                          closeJobDetails();
                          handleSwipeLeft();
                        }}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="close" size={24} color="#FF3B30" />
                        <Text style={[styles.jobActionText, {color: '#FF3B30'}]}>Pass</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.jobActionButton, {backgroundColor: themeColors.tint + '15'}]}
                        onPress={() => {
                          console.log('Save button pressed');
                          addApplication(selectedJob);
                          closeJobDetails();
                          showNotification('Job saved to inbox');
                        }}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="bookmark" size={22} color={themeColors.tint} />
                        <Text style={[styles.jobActionText, {color: themeColors.tint}]}>Save</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.jobActionButton, {backgroundColor: '#4CD964' + '15'}]}
                        onPress={() => {
                          console.log('Apply button pressed');
                          closeJobDetails();
                          handleSwipeRight();
                        }}
                        activeOpacity={0.7}
                      >
                        <FontAwesome name="check" size={24} color="#4CD964" />
                        <Text style={[styles.jobActionText, {color: '#4CD964'}]}>Apply</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Description section */}
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    About This Role
                  </Text>
                  <Text style={[styles.paragraphText, { color: themeColors.text, marginBottom: 16, lineHeight: 24 }]}>
                    {selectedJob.description}
                  </Text>
                </View>

                {/* Qualifications section */}
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Qualifications
                  </Text>
                  <View style={styles.bulletListContainer}>
                    {selectedJob.qualifications.map((qual, index) => (
                      <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={[styles.bulletText, { color: themeColors.text }]}>
                          {qual}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Requirements section */}
                <View style={styles.sectionContainer}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Requirements
                  </Text>
                  <View style={styles.bulletListContainer}>
                    {selectedJob.requirements.map((req, index) => (
                      <View key={index} style={styles.bulletItem}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={[styles.bulletText, { color: themeColors.text }]}>
                          {req}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Add bottom spacing for better scroll experience */}
                <View style={{height: 100}} />
              </ScrollView>
            </View>
          </Animated.View>
        </View>
        {/* Action buttons overlay when modal is visible */}
        <View style={[
          styles.buttonsContainer,
          { bottom: insets.bottom ? insets.bottom + 6 : 16 }
        ]}>
          <TouchableOpacity
            style={[styles.button, styles.undoButton, { backgroundColor: themeColors.card }]}
            onPress={handleUndoSwipe}
            activeOpacity={0.7}
            disabled={swipedJobs.length === 0}
            onPressIn={() => setUndoActive(true)}
            onPressOut={() => setUndoActive(false)}
          >
            <Animated.View style={[styles.buttonInner, { borderColor: theme === 'dark' ? '#222' : '#FFC107', opacity: swipedJobs.length === 0 ? 0.4 : 1, backgroundColor: undoActive ? (theme === 'dark' ? '#FFC107' : '#FFF8E1') : 'transparent' }] }>
              <FontAwesome name="undo" size={24} color={undoActive ? (theme === 'dark' ? '#222' : '#FFC107') : '#fff'} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.passButton, { backgroundColor: themeColors.card }]}
            onPress={handleButtonSwipeLeft}
            activeOpacity={0.7}
            onPressIn={() => { animateButton(passScale, 0.92); setPassActive(true); }}
            onPressOut={() => { animateButton(passScale, 1); setPassActive(false); }}
          >
            <Animated.View style={[styles.buttonInner, {borderColor: theme === 'dark' ? '#222' : redColor, transform: [{ scale: passScale }], backgroundColor: passActive ? (theme === 'dark' ? '#FF5252' : '#FFEBEE') : 'transparent' }] }>
              <FontAwesome name="close" size={26} color={passActive ? iconColorActive : iconColorInactive} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.infoButton, { backgroundColor: themeColors.card }]}
            onPress={() => openJobDetails(safeCurrentJob)}
            activeOpacity={0.7}
            onPressIn={() => { animateButton(infoScale, 0.92); setInfoActive(true); }}
            onPressOut={() => { animateButton(infoScale, 1); setInfoActive(false); }}
          >
            <Animated.View style={[styles.buttonInner, {borderColor: theme === 'dark' ? '#222' : blueColor, transform: [{ scale: infoScale }], backgroundColor: infoActive ? (theme === 'dark' ? '#42A5F5' : '#E3F2FD') : 'transparent' }] }>
              <FontAwesome name="info-circle" size={26} color={infoActive ? iconColorActive : iconColorInactive} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.likeButton, { backgroundColor: themeColors.card }]}
            onPress={handleButtonSwipeRight}
            activeOpacity={0.7}
            onPressIn={() => { animateButton(likeScale, 0.92); setLikeActive(true); }}
            onPressOut={() => { animateButton(likeScale, 1); setLikeActive(false); }}
          >
            <Animated.View style={[styles.buttonInner, {borderColor: theme === 'dark' ? '#222' : greenColor, transform: [{ scale: likeScale }], backgroundColor: likeActive ? (theme === 'dark' ? '#4CAF50' : '#E8F5E9') : 'transparent' }] }>
              <FontAwesome name="check-circle" size={26} color={likeActive ? iconColorActive : iconColorInactive} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  };



  // Get animated style for the current card
  const getCardAnimatedStyle = () => {
    const rotate = swipeAnim.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 1.5, 0, SCREEN_WIDTH / 1.5],
      outputRange: ['-12deg', '0deg', '12deg'],
      extrapolate: 'clamp',
    });

    return {
      transform: [
        { rotate },
        { translateX: swipeAnim.x },
        { translateY: swipeAnim.y }
      ],
      borderRadius: 22,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 5,
      height: CARD_HEIGHT,
      backgroundColor: themeColors.card,
    };
  };

  const moveCardOffScreen = (direction: 'left' | 'right') => {
    if (isAnimating || !safeCurrentJob) return;

    // Set animating flag
    setIsAnimating(true);

    // Store the job that's being swiped for potential undo
    setSwipedJobs(prev => [...prev, { job: safeCurrentJob, direction, index: currentIndex }]);

    // Determine final position
    const xPosition = direction === 'left' ? -SCREEN_WIDTH * 1.5 : SCREEN_WIDTH * 1.5;

    // Simple animation to move card off screen
    Animated.timing(swipeAnim, {
      toValue: { x: xPosition, y: 0 },
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Reset animation position
      swipeAnim.setValue({ x: 0, y: 0 });

      // Perform the action based on direction
      if (direction === 'right') {
        // Save to inbox
        handleSwipeRight();
        } else {
        // Move to next card
        setCurrentIndex(currentIndex + 1);
      }

      // Reset animation flag with a small delay to prevent immediate interaction
      setTimeout(() => {
      setIsAnimating(false);
      }, 50);
    });
  };

  // Auto-create a test job application when jobs are loaded
  useEffect(() => {
    // Wait for jobs to be loaded and user to be available
    const timer = setTimeout(() => {
      if (user && (jobs.length > 0 || mockJobs.length > 0)) {
        console.log('Creating test job application on mount...');
        createTestJobApplication();
      }
    }, 3000); // Give more time for jobs to load

    return () => clearTimeout(timer);
  }, [user, jobs]); // Depend on both user and jobs

  // Save swiped job IDs to AsyncStorage for persistence across sessions (user-specific)
  const saveSwipedJobIds = async (jobIds: string[]) => {
    try {
      if (!user?.id) {
        console.log('No user logged in, skipping swiped job IDs save');
        return;
      }
      const userSpecificKey = `swipedJobIds_${user.id}`;
      await AsyncStorage.setItem(userSpecificKey, JSON.stringify(jobIds));
      console.log(`Saved ${jobIds.length} swiped job IDs to AsyncStorage for user ${user.id}`);
    } catch (error) {
      console.error('Failed to save swiped job IDs to AsyncStorage:', error);
    }
  };

  // Load swiped job IDs from AsyncStorage (user-specific)
  const loadSwipedJobIds = async (): Promise<string[]> => {
    try {
      if (!user?.id) {
        console.log('No user logged in, returning empty swiped job IDs');
        return [];
      }
      const userSpecificKey = `swipedJobIds_${user.id}`;
      const storedIds = await AsyncStorage.getItem(userSpecificKey);
      if (storedIds) {
        const ids = JSON.parse(storedIds) as string[];
        console.log(`Loaded ${ids.length} previously swiped job IDs from AsyncStorage for user ${user.id}`);
        return ids;
      }
      return [];
    } catch (error) {
      console.error('Failed to load swiped job IDs from AsyncStorage:', error);
      return [];
    }
  };

  // Function to reset swiped jobs when we're running low (user-specific)
  const resetSwipedJobs = async () => {
    try {
      if (!user?.id) {
        console.log('No user logged in, skipping swiped job reset');
        return [];
      }
      const userSpecificKey = `swipedJobIds_${user.id}`;
      await AsyncStorage.removeItem(userSpecificKey);
      console.log(`🔄 Reset swiped job history to show more options for user ${user.id}`);
      return [];
    } catch (error) {
      console.error('Error resetting swiped jobs:', error);
      return [];
    }
  };

  // Function to load personalized job recommendations
  const loadPersonalizedRecommendations = async (jobData: Job[]) => {
    if (!user?.id) {
      console.log('No user ID available for personalized recommendations');
      return jobData;
    }

    try {
      console.log('Loading personalized recommendations...');

      // Check if user has preferences
      const userPrefs = await getUserJobPreferences(user.id);
      setHasUserPreferences(!!userPrefs);

      if (!userPrefs) {
        console.log('No user preferences found, showing all jobs');
        return jobData;
      }

      // Get personalized recommendations
      const result = await getPersonalizedJobRecommendations(user.id, jobData);
      setMatchingResult(result);
      setRecommendations(result.recommendations);

      console.log(`Generated ${result.recommendations.length} personalized recommendations from ${result.total_jobs_analyzed} jobs`);

      // Return the recommended jobs in order of score
      return result.recommendations.map(rec => rec.job);

    } catch (error) {
      console.error('Error loading personalized recommendations:', error);
      // Fallback to showing all jobs
      return jobData;
    }
  };

  // Add a ref to track if we're already loading jobs to prevent concurrent calls
  const isLoadingJobsRef = useRef(false);
  const lastLoadAttemptRef = useRef(0);

  // Helper function to format salary
  const formatSalary = (min?: number, max?: number, currency: string = 'USD'): string => {
    if (!min && !max) return 'Salary not specified';

    const formatNumber = (num: number) => {
      if (num >= 1000) {
        return `${(num / 1000).toFixed(0)}k`;
      }
      return num.toString();
    };

    const symbol = currency === 'USD' ? '$' : currency;

    if (min && max) {
      return `${symbol}${formatNumber(min)} - ${symbol}${formatNumber(max)}`;
    } else if (min) {
      return `${symbol}${formatNumber(min)}+`;
    } else if (max) {
      return `Up to ${symbol}${formatNumber(max)}`;
    }

    return 'Salary not specified';
  };

  // Function to load jobs - defined outside useEffect so it can be called from elsewhere
  const loadJobs = async (forceReset = false) => {
    const now = Date.now();
    
    // Debounce: prevent calls within 2 seconds of each other
    if (now - lastLoadAttemptRef.current < 2000 && !forceReset) {
      console.log('[JOBS] Debouncing loadJobs call - too soon since last attempt');
      return;
    }
    
    // Prevent concurrent calls to loadJobs
    if (isLoadingJobsRef.current) {
      console.log('[JOBS] Jobs already loading, skipping duplicate call');
      return;
    }
    
    lastLoadAttemptRef.current = now;

    console.log(`[JOBS] Starting loadJobs (forceReset: ${forceReset})`);
    isLoadingJobsRef.current = true;
    setIsLoading(true);
    
    // Set a timeout to reset loading flag in case of hanging
    const timeoutId = setTimeout(() => {
      console.log('[JOBS] Loading timeout reached, resetting loading flag');
      isLoadingJobsRef.current = false;
      setIsLoading(false);
    }, 30000); // 30 second timeout
    try {
      if (!user?.id) {
        console.log('[JOBS] Guest mode - loading general job recommendations');
        const jobData = await fetchJobsWithCaching(1, 50, forceReset);
        setJobs(jobData);
        return;
      }

      console.log('[JOBS] Fetching personalized jobs for user...');
      const personalizedJobs = await fetchJobsForUser(user.id, 50, true);
      console.log(`[JOBS] Successfully loaded ${personalizedJobs.length} personalized jobs`);

      // Jobs are already in the correct format from the new service
      const jobData = personalizedJobs;

      // Load previously swiped job IDs from AsyncStorage
      let persistedSwipedJobIds = await loadSwipedJobIds();

      // Combine with current session's swiped job IDs
      const currentSwipedJobIds = swipedJobs.map(sj => sj.job.id);
      let allSwipedJobIds = [...new Set([...persistedSwipedJobIds, ...currentSwipedJobIds])];

      // Check if we're running out of jobs (less than 5 left)
      let newJobs = jobData.filter(job => !allSwipedJobIds.includes(job.id));

      // If we have fewer than 5 jobs left, reset swiped jobs history
      if (newJobs.length < 5 || forceReset) {
        await resetSwipedJobs();
        allSwipedJobIds = []; // Clear swiped jobs in memory
        newJobs = jobData; // Use all jobs
        console.log('⚠️ Running low on new jobs - resetting job history');
      }

      console.log(`After processing swiped jobs (${allSwipedJobIds.length} total), ${newJobs.length} jobs available`);

      // Update state with the fetched jobs, preserving current jobs if this is a refresh
      setJobs(prevJobs => {
        // Combine previous and new jobs, removing duplicates
        const combinedJobs = [...prevJobs, ...newJobs];
        const uniqueJobs = Array.from(new Map(combinedJobs.map(job => [job.id, job])).values());
        return uniqueJobs;
      });

      // Update filtered jobs, preserving current filtered jobs
      setFilteredJobs(prevFiltered => {
        // If we're starting fresh (index is 0), use all new jobs
        if (currentIndex === 0) {
          return newJobs;
        }
        // Otherwise, append new jobs to existing filtered jobs
        return [...prevFiltered, ...newJobs];
      });
    } catch (error) {
      console.error('[JOBS] Error loading jobs:', error);
      // Fallback to mockJobs if there's an error, but still filter out swiped jobs
      const swipedJobIds = swipedJobs.map(sj => sj.job.id);
      const newMockJobs = mockJobs.filter(job => !swipedJobIds.includes(job.id));

      console.log(`[JOBS] Using ${newMockJobs.length} mock jobs as fallback`);

      setJobs(prevJobs => {
        const combinedJobs = [...prevJobs, ...newMockJobs];
        const uniqueJobs = Array.from(new Map(combinedJobs.map(job => [job.id, job])).values());
        return uniqueJobs;
      });

      setFilteredJobs(prevFiltered => {
        if (currentIndex === 0) {
          return newMockJobs;
        }
        return [...prevFiltered, ...newMockJobs];
      });
    } finally {
      console.log('[JOBS] loadJobs completed, resetting loading flags');
      clearTimeout(timeoutId);
      setIsLoading(false);
      isLoadingJobsRef.current = false;
    }
  };

  // Load jobs only after user is authenticated - optimized for faster startup
  useEffect(() => {
    // Only load jobs if user is authenticated and not already loading
    if (user?.id && !isLoadingJobsRef.current) {
      console.log('[JOBS] User authenticated, starting initial job load...');
      loadJobs();
    } else if (!user?.id) {
      console.log('[JOBS] No authenticated user, skipping job load');
    }
  }, [user?.id]); // Only depend on user ID

  // Set up background refresh listeners - separate from initial load
  useEffect(() => {
    if (!user?.id) return; // Early return if no user

    // Only set up AppState listener after user is available
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('[JOBS] App has come to the foreground, refreshing jobs...');
        loadJobs();
      }
    });

    // Set up a refresh interval to keep job data fresh (every 10 minutes to reduce load)
    const refreshInterval = setInterval(() => {
      console.log('[JOBS] Auto-refreshing jobs data...');
      loadJobs();
    }, 600000); // Changed to 10 minutes to reduce frequency

    // Cleanup subscriptions on unmount
    return () => {
      console.log('[JOBS] Component unmounting, cleaning up subscriptions...');
      // Reset loading flag on unmount to prevent stuck states
      isLoadingJobsRef.current = false;
      setIsLoading(false);
      appStateSubscription.remove();
      clearInterval(refreshInterval);
    };
  }, [user?.id]); // Depend on user ID to recreate when user changes

  // Reset animation values when current index changes (when we move to a new card)
  React.useEffect(() => {
    // Reset all animation values and states when moving to a new card
    swipeAnim.setValue({x: 0, y: 0});
    setSwipeOverlay(null);
    setSwipeTintColor('none');
    setIsAnimating(false);

    // Reset modal animations to ensure clean state for next job
    modalSlideAnim.setValue(SCREEN_HEIGHT);
    backdropOpacityAnim.setValue(0);
    modalDragY.setValue(0);
    setIsDragging(false);
  }, [currentIndex]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background, paddingBottom: insets.bottom || 16 }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

      {/* Header with JOBS title */}
      <View style={[styles.tabsHeader, { paddingVertical: 16, marginBottom: 10 }]}>
        <Text style={[styles.headerTitle, { color: themeColors.text, fontSize: 24, letterSpacing: 1 }]}>
          JOBS {!user && <Text style={{ fontSize: 14, color: themeColors.textSecondary }}>• Guest Mode</Text>}
        </Text>
        <View style={{ flexDirection: 'row' }}>
          {/* Guest user sign up button */}
          {!user && (
            <TouchableOpacity
              style={[styles.guestSignUpButton, { backgroundColor: themeColors.tint, marginRight: 10 }]}
              onPress={() => router.push('/(auth)/signup')}
            >
              <FontAwesome name="user-plus" size={16} color="white" />
              <Text style={styles.guestSignUpText}>Sign Up</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.refreshButton, { marginRight: 10 }]}
            onPress={() => setShowApiDebugger(!showApiDebugger)}
          >
            <FontAwesome name="bug" size={20} color={showApiDebugger ? themeColors.tint : themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, { marginRight: 10 }]}
            onPress={() => loadJobs(true)}
          >
            <FontAwesome name="refresh" size={20} color={themeColors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailsCloseButton}>
            <FontAwesome name="times" size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* User instruction hint - repositioned to bottom */}
      <BlurView
        tint={theme === 'dark' ? 'dark' : 'light'}
        intensity={80}
        style={[styles.swipeHintContainer, { bottom: 20 }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="gesture-swipe-right" size={20} color={themeColors.tint} style={{ marginRight: 5 }} />
          <Text style={{ color: themeColors.text, fontSize: 14 }}>Swipe right to save jobs to inbox</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 5 }}>
          <MaterialCommunityIcons name="gesture-swipe-left" size={20} color={themeColors.textSecondary} style={{ marginRight: 5 }} />
          <Text style={{ color: themeColors.text, fontSize: 14 }}>Swipe left to pass jobs</Text>
        </View>
      </BlurView>

      {/* Removed search bar */}



      {/* API Debugger */}
      {showApiDebugger && (
        <View style={{ paddingHorizontal: 16, marginBottom: 16, zIndex: 20 }}>
          <ApiDebugger />
        </View>
      )}



      {/* Browse Jobs View */}
      <ScrollView 
        style={styles.contentContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Card Viewing Area - Remove constraining containers */}
        <View style={styles.cardViewingArea}>
          {/* Cards will render here without constraints */}
        </View>

        {/* Bottom action buttons */}
        {!modalVisible && (
          <View style={[
            styles.buttonsContainer,
            { bottom: insets.bottom ? insets.bottom + 6 : 16 }
          ]}>
          <TouchableOpacity
            style={[styles.button, styles.undoButton, { backgroundColor: themeColors.card }]}
            onPress={handleUndoSwipe}
            activeOpacity={0.7}
            disabled={swipedJobs.length === 0}
            onPressIn={() => setUndoActive(true)}
            onPressOut={() => setUndoActive(false)}
          >
            <Animated.View style={[styles.buttonInner, { borderColor: theme === 'dark' ? '#222' : '#FFC107', opacity: swipedJobs.length === 0 ? 0.4 : 1, backgroundColor: undoActive ? (theme === 'dark' ? '#FFC107' : '#FFF8E1') : 'transparent' }] }>
              <FontAwesome name="undo" size={24} color={undoActive ? (theme === 'dark' ? '#222' : '#FFC107') : '#fff'} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.passButton, { backgroundColor: themeColors.card }]}
            onPress={handleButtonSwipeLeft}
            activeOpacity={0.7}
            onPressIn={() => { animateButton(passScale, 0.92); setPassActive(true); }}
            onPressOut={() => { animateButton(passScale, 1); setPassActive(false); }}
          >
            <Animated.View style={[styles.buttonInner, {borderColor: theme === 'dark' ? '#222' : redColor, transform: [{ scale: passScale }], backgroundColor: passActive ? (theme === 'dark' ? '#FF5252' : '#FFEBEE') : 'transparent' }] }>
              <FontAwesome name="close" size={26} color={passActive ? iconColorActive : iconColorInactive} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.infoButton, { backgroundColor: themeColors.card }]}
            onPress={() => openJobDetails(safeCurrentJob)}
            activeOpacity={0.7}
            onPressIn={() => { animateButton(infoScale, 0.92); setInfoActive(true); }}
            onPressOut={() => { animateButton(infoScale, 1); setInfoActive(false); }}
          >
            <Animated.View style={[styles.buttonInner, {borderColor: theme === 'dark' ? '#222' : blueColor, transform: [{ scale: infoScale }], backgroundColor: infoActive ? (theme === 'dark' ? '#42A5F5' : '#E3F2FD') : 'transparent' }] }>
              <FontAwesome name="info-circle" size={26} color={infoActive ? iconColorActive : iconColorInactive} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.likeButton, { backgroundColor: themeColors.card }]}
            onPress={handleButtonSwipeRight}
            activeOpacity={0.7}
            onPressIn={() => { animateButton(likeScale, 0.92); setLikeActive(true); }}
            onPressOut={() => { animateButton(likeScale, 1); setLikeActive(false); }}
          >
            <Animated.View style={[styles.buttonInner, {borderColor: theme === 'dark' ? '#222' : greenColor, transform: [{ scale: likeScale }], backgroundColor: likeActive ? (theme === 'dark' ? '#4CAF50' : '#E8F5E9') : 'transparent' }] }>
              <FontAwesome name="check-circle" size={26} color={likeActive ? iconColorActive : iconColorInactive} />
            </Animated.View>
          </TouchableOpacity>
        </View>
        )}
        
        {/* Search Modal */}
        <Modal
          visible={isSearchVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsSearchVisible(false)}
        >
          {renderSearchModal()}
        </Modal>

        {/* Enhanced Job Details Modal */}
        {renderJobDetailsModal()}

        {/* Applied Notification */}
        {showAppliedNotification && (
          <View style={[styles.appliedNotification, { backgroundColor: themeColors.card }]}>
            <FontAwesome name="check-circle" size={24} color={theme === 'dark' ? '#000' : themeColors.text} />
            <Text style={[styles.appliedNotificationText, { color: theme === 'dark' ? '#fff' : themeColors.text }]}>Applied Successfully!</Text>
          </View>
        )}

        {/* Render cards at root level to allow free movement over all UI elements */}
        <View style={styles.cardsOverlay}>
          {renderCards()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default JobsScreenWrapper;

// Define styles for components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    overflow: 'visible', // Ensure container doesn't clip cards during swiping
  },

  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 1500, // Higher z-index to prevent default card overlap
  },
  // Added new overlay styles for swipe actions
  overlayBadge: {
    position: 'absolute',
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  likeBadge: {
    backgroundColor: '#4CD964', // Green color
    top: 50,
    right: 20,
    transform: [{ rotate: '10deg' }],
    borderWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  passBadge: {
    backgroundColor: '#FF3B30', // Red color
    top: 50,
    left: 20,
    transform: [{ rotate: '-10deg' }],
    borderWidth: 0,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekDayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  selectedDayButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrowButton: {
    position: 'absolute',
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardViewingArea: {
    flex: 1,
    // Remove constraints to allow cards to move freely
  },
  
  scrollContentContainer: {
    flexGrow: 1,
  },
  cardsOverlay: {
    position: 'absolute',
    top: 80, // Reduced top margin to properly position cards below header
    left: 0,
    right: 0,
    bottom: 160, // Increased bottom margin to clear action buttons
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'box-none', // Allow touches to pass through to underlying elements when not touching cards
    zIndex: 900, // Below action buttons but above content
  },
  progressContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  progressDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressPercent: {
    fontSize: 12,
    marginRight: 10,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacer: {
    width: 10,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderRadius: 18,
    zIndex: 5,
    elevation: 5,
  },
  searchInputModern: {
    flex: 1,
    height: 44,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '500',
    backgroundColor: 'transparent',
  },
  filterIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginLeft: 2,
  },
  tabSelector: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTabButton: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    overflow: 'visible', // Ensure content container doesn't clip cards
  },
  tabsHeader: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  listContent: {
    paddingVertical: 8,
    paddingBottom: 120,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  searchModalContainer: {
    padding: 16,
    borderRadius: 12,
  },
  jobDetailsModalContainer: {
    padding: 16,
    borderRadius: 12,
  },
  jobDetailsImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  jobDetailsInfo: {
    padding: 16,
  },
  jobDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  jobDetailsLocation: {
    fontSize: 14,
    marginBottom: 4,
  },
  jobDetailsPay: {
    fontSize: 14,
    marginBottom: 8,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  paragraphText: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  bulletListContainer: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 15,
    marginRight: 8,
    color: '#4285F4',
    fontWeight: 'bold',
  },
  bulletText: {
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  jobDetailsDescription: {
    fontSize: 14,
  },
  applyButton: {
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  // Enhanced modal panel styles
  enhancedModalPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    zIndex: 1000,
  },
  enhancedDragHandle: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  dragHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  enhancedPanelContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 24,
  },
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 16, // Reduced margin for wider cards (8px on each side)
    height: CARD_HEIGHT,
    borderRadius: 28, // Increased border radius for more modern look
    overflow: 'hidden',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 }, // Enhanced shadow for better depth
    shadowOpacity: 0.2, // Slightly stronger shadow
    shadowRadius: 16, // Larger shadow radius for softer effect
    elevation: 12, // Higher elevation for better depth on Android
    borderWidth: 0,
    zIndex: 1000, // Lower default z-index, will be overridden during swiping
  },
  nextCardStyle: {
    transform: [{ scale: 0.95 }],
    top: 10,
    zIndex: 999, // Lower than current card and below buttons by default
  },
  cardInner: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  cardInfo: {
    padding: 20,
  },
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    color: '#fff',
    marginLeft: 5,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  cardLocation: {
    color: '#fff',
    fontSize: 16,
    marginTop: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 5,
    marginBottom: 5,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  buttonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center', // Center buttons
    alignItems: 'center',
    gap: 18, // Increased gap for better spacing with larger cards
    padding: 12, // Slightly increased padding
    zIndex: 5000, // Ensure buttons stay above panels
    elevation: 5000,
  },
  button: {
    width: 64, // Slightly larger for better touch target
    height: 64, // Slightly larger
    borderRadius: 32, // Adjusted border radius
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Enhanced shadow
    shadowOpacity: 0.15, // Stronger shadow
    shadowRadius: 6, // Larger shadow radius
    elevation: 4, // Higher elevation
  },
  buttonInner: {
    width: 52, // Slightly larger for better proportion
    height: 52, // Slightly larger
    borderRadius: 26, // Adjusted border radius
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginHorizontal: 8, // Maintained margin
  },
  passButton: {
    backgroundColor: '#fff',
  },
  infoButton: {
    backgroundColor: '#fff',
  },
  likeButton: {
    backgroundColor: '#fff',
  },
  undoButton: {
    marginRight: 18,
    shadowColor: '#FFC107',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  noJobsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noJobsText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  appliedNotification: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    gap: 10,
  },
  appliedNotificationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notificationContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  filterInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  cardImageHalfWrapper: {
    width: '100%',
    height: '55%', // Increased image area for more visual impact
    borderTopLeftRadius: 28, // Match card border radius
    borderTopRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#f5f5f5',
  },
  cardImageHalf: {
    width: '100%',
    height: '100%',
  },
  logoOverlayHalf: {
    position: 'absolute',
    top: '50%', // Center vertically
    left: '50%', // Center horizontally
    width: 80, // Fixed width for consistent centering
    height: 80, // Fixed height for consistent centering
    backgroundColor: '#fff',
    borderRadius: 40, // Larger border radius for bigger logo
    padding: 8, // Increased padding for better spacing
    zIndex: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2, // Stronger shadow for better visibility
    shadowRadius: 12, // Larger shadow radius
    elevation: 8, // Higher elevation for Android
    transform: [{ translateX: -40 }, { translateY: -40 }], // Center based on actual container size
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyLogo: {
    width: 64, // Larger logo for better visibility on Android
    height: 64,
    borderRadius: 32,
    backgroundColor: 'transparent', // Ensure transparent background
    resizeMode: 'contain', // Ensure logo fits properly without cutting off
  },
  cardDetailsHalf: {
    width: '100%',
    height: '45%', // Adjusted to match image area change
    borderBottomLeftRadius: 28, // Match card border radius
    borderBottomRightRadius: 28,
    padding: 24, // Increased padding for better spacing with larger cards
    zIndex: 3,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    justifyContent: 'flex-start', // Align content to top for better hierarchy
  },
  cardTitleModern: {
    color: '#333',
    fontSize: 22, // Increased font size for larger cards
    fontWeight: '700', // Bolder font
    marginBottom: 8, // Increased margin for better spacing
    letterSpacing: 0.3, // Slightly more letter spacing for modern typography
    lineHeight: 28, // Better line height for readability
  },
  cardLocationModern: {
    color: '#666',
    fontSize: 15, // Slightly larger for better readability
    marginBottom: 12, // Increased margin for better spacing
    fontWeight: '500', // Medium weight for better hierarchy
    lineHeight: 20, // Better line height
  },
  tagsContainerModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16, // Increased margin for better spacing with larger cards
    gap: 6, // Increased gap for better spacing
  },
  tagModern: {
    backgroundColor: 'rgba(66, 133, 244, 0.1)', // Slightly more opaque for better visibility
    paddingHorizontal: 14, // Increased padding for larger cards
    paddingVertical: 7, // Increased padding
    borderRadius: 18, // More rounded corners for modern look
    marginRight: 8,
    marginBottom: 8,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tagTextModern: {
    color: '#4285F4',
    fontSize: 13, // Slightly larger for better readability
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  payContainerModern: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(66, 133, 244, 0.1)', // Slightly more opaque
    paddingHorizontal: 12, // Increased padding
    paddingVertical: 8, // Increased padding
    borderRadius: 14, // More rounded
    alignSelf: 'flex-start',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  payModern: {
    color: '#333',
    fontWeight: '700',
    fontSize: 19, // Slightly larger for better visibility
    opacity: 0.9, // Slight opacity for contrast with title
    letterSpacing: 0.2,
  },
  distanceModern: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 24, // Increased spacing from top
    right: 24, // Increased spacing from right
    backgroundColor: 'rgba(255,255,255,0.9)', // More opaque for better visibility
    paddingHorizontal: 12, // Increased padding
    paddingVertical: 8, // Increased padding
    borderRadius: 18, // More rounded
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Stronger shadow
    shadowRadius: 6, // Larger shadow radius
    elevation: 3, // Higher elevation
  },
  distanceTextModern: {
    color: '#333',
    marginLeft: 6,
    fontSize: 13, // Slightly larger for better readability
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  overlayContainerModern: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  overlayBadgeModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 3,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  overlayTextModern: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 12,
  },

  // Modern card styles for enhanced UI
  cardImageWrapper: {
    width: '100%',
    height: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardCompany: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  companyBadge: {
    position: 'absolute',
    bottom: -24, // Adjusted for larger image area
    left: 24, // Increased spacing from left
    backgroundColor: '#fff',
    borderRadius: 24, // Larger border radius
    padding: 3, // Slightly increased padding
    borderWidth: 3, // Thicker border for better definition
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, // Enhanced shadow
    shadowOpacity: 0.15, // Stronger shadow
    shadowRadius: 6, // Larger shadow radius
    elevation: 5, // Higher elevation
    zIndex: 10,
  },
  cardDetails: {
    padding: 16,
    paddingTop: 24,
    flex: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  // Company information layout
  companyInfoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  jobTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  jobTagPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  jobTagText: { // Renamed from tagText to avoid duplication
    fontSize: 12,
    fontWeight: '500',
  },
  jobMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  jobSalaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  jobDistanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobDistanceText: {
    fontSize: 13,
    marginLeft: 4,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    marginRight: 10,
  },

  // Tinder-like details panel styles
  tinderDetailsPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 20,
    zIndex: 2000, // Higher z-index to overlay cards and buttons when opened
  },
  panelDragHandle: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  panelHandle: {
    width: 40,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 8,
  },
  panelPeekTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  companyLogoContainer: {
    width: 88,
    height: 88,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  companyLogoLarge: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  detailsCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  jobMainDetails: {
    marginBottom: 24,
  },
  jobDetailsTitleText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  jobDetailsCompany: {
    fontSize: 16,
    marginBottom: 4,
  },
  jobDetailsLocationText: {
    fontSize: 14,
    marginBottom: 8,
  },
  jobDetailsPayText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  jobActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    marginBottom: 24,
  },
  jobActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 10,
  },
  jobActionText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleDetailsButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  toggleDetailsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  swipeHintContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    marginHorizontal: 'auto',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  // Add these new styles for the action labels
  passLabelContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    backgroundColor: 'rgba(255, 59, 48, 0.9)', // Red with opacity
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    transform: [{ translateY: -25 }],
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  applyLabelContainer: {
    position: 'absolute',
    left: 20,
    top: '50%',
    backgroundColor: 'rgba(76, 217, 100, 0.9)', // Green with opacity
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    transform: [{ translateY: -25 }],
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tintOverlay: {
    zIndex: 10,
    pointerEvents: 'none'
  },

  passLabelTopContainer: {
    position: 'absolute',
    right: '10%',
    top: '15%',
    zIndex: 50,
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  applyLabelTopContainer: {
    position: 'absolute',
    left: '10%',
    top: '15%',
    zIndex: 50,
    backgroundColor: 'rgba(76, 217, 100, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  actionLabelTop: {
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  guestSignUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  guestSignUpText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

});
