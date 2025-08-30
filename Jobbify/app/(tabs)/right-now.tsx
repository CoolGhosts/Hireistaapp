import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ScrollView, // Re-add this
  Modal, 
  Alert,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ActivityIndicator,
  ColorValue,
  RefreshControl
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { FontAwesome5 } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import { Job } from '@/context/AppContext';
import TabHeader from '@/components/TabHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number; // 1-5 rating
  comment: string;
  date: string;
}

interface QuickJob {
  id: string;
  title: string;
  poster: string;
  posterAvatar: string;
  posterRating: number; // 1-5 rating
  posterReviewCount: number;
  posterVerified?: boolean;
  location: string;
  pay: string;
  description: string;
  timePosted: string;
  urgency: 'low' | 'medium' | 'high';
  category: string;
  status: 'open' | 'in-progress' | 'completed';
  distance?: string;
  reviews?: Review[];
  applicants?: {
    id: string;
    name: string;
    avatar: string;
    rating: number; // 1-5 rating
    reviewCount: number;
    verified?: boolean;
  }[];
}

interface Category {
  id: string;
  name: string;
  icon: string;
  iconType: 'fontAwesome' | 'fontAwesome5' | 'material' | 'materialCommunity' | 'ionicons';
  color: string;
  gradient?: string[];
}

interface ScrollableCategoriesProps {
  categories: Category[];
  activeFilter: string;
  setActiveFilter: (category: string) => void;
  colorScheme: 'light' | 'dark' | null | undefined;
  themeColors: any;
  renderCategoryIcon: (category: Category, size: number) => React.ReactNode;
}

interface ReviewSectionProps {
  reviews: Review[];
  themeColors: any;
  onAddReview: () => void;
}

interface UserProfileProps {
  user: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    reviewCount: number;
    verified?: boolean;
    bio?: string;
    skills?: string[];
    completedJobs?: number;
    memberSince?: string;
  };
  themeColors: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  pay: string;
  postedBy: string;
  claimedBy: string | null;
  status: 'open' | 'claimed' | 'completed';
  createdAt: string;
}

function RightNowScreen() {
  const colorScheme = useColorScheme();
  const { theme, addApplication } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<QuickJob | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showAppliedNotification, setShowAppliedNotification] = useState(false);
  const [quickJobsList, setQuickJobsList] = useState<QuickJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
  });
  const [newJob, setNewJob] = useState({
    title: '',
    location: '',
    pay: '',
    description: '',
    category: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    pay: '',
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Week days and selection - improved with full day names
  const [weekDays] = useState(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    return dayNames.map((day, index) => {
      const date = new Date();
      date.setDate(today.getDate() - currentDay + index);
      return {
        day,
        date: date.getDate(),
        isToday: index === currentDay,
        fullDate: date
      };
    });
  });
  const [selectedDay, setSelectedDay] = useState(weekDays.findIndex(day => day.isToday));
  
  // Stats for today's gigs 
  const [gigsStats, setGigsStats] = useState({
    available: 0,
    applied: 0,
    completed: 0
  });
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [200, 60], // Reduced header height for more content space
    extrapolate: 'clamp',
  });

  const insets = useSafeAreaInsets();

  // Load gigs data
  const loadGigsData = useCallback(() => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const jobs: QuickJob[] = [
        {
          id: '1',
          title: 'Help Moving Furniture',
          poster: 'Sarah Johnson',
          posterAvatar: 'https://i.pravatar.cc/150?img=1',
          posterRating: 4.8,
          posterReviewCount: 42,
          posterVerified: true,
          location: 'Downtown Area',
          distance: '0.8 miles',
          pay: '$25/hr',
          description: 'Need help moving furniture from a first-floor apartment to a moving truck. Will take approximately 2 hours.',
          timePosted: '2 hours ago',
          urgency: 'high' as const,
          category: 'Moving',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '2',
          title: 'Dog Walker Needed',
          poster: 'Emma Johnson',
          posterAvatar: 'https://i.pravatar.cc/150?img=2',
          posterRating: 4.9,
          posterReviewCount: 32,
          posterVerified: true,
          location: 'Mission District',
          distance: '1.2 miles',
          pay: '$20',
          description: 'Looking for someone to walk my golden retriever for 30 minutes this evening between 5-7 PM. My dog is friendly and well-behaved. This could become a regular gig if it works out well.',
          timePosted: '1 hour ago',
          urgency: 'medium' as const,
          category: 'Pet Care',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '3',
          title: 'Lawn Mowing',
          poster: 'David Wilson',
          posterAvatar: 'https://i.pravatar.cc/150?img=3',
          posterRating: 4.2,
          posterReviewCount: 7,
          location: 'Sunset District',
          distance: '2.5 miles',
          pay: '$40',
          description: 'Need someone to mow my lawn today. I have a lawn mower you can use. The yard is approximately 500 square feet. Should take about an hour to complete.',
          timePosted: '2 hours ago',
          urgency: 'medium' as const,
          category: 'Yard Work',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '4',
          title: 'Computer Setup Help',
          poster: 'Linda Moore',
          posterAvatar: 'https://i.pravatar.cc/150?img=4',
          posterRating: 4.9,
          posterReviewCount: 24,
          posterVerified: true,
          location: 'Nob Hill',
          distance: '1.7 miles',
          pay: '$35',
          description: 'Need help setting up my new laptop and transferring files from my old computer. I have both computers ready. Looking for someone with technical knowledge who can help me set up my email, transfer photos, and install basic software.',
          timePosted: '3 hours ago',
          urgency: 'low' as const,
          category: 'Tech Support',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '5',
          title: 'Grocery Shopping',
          poster: 'Robert Garcia',
          posterAvatar: 'https://i.pravatar.cc/150?img=5',
          posterRating: 4.6,
          posterReviewCount: 15,
          location: 'Richmond District',
          distance: '3.1 miles',
          pay: '$25',
          description: 'Looking for someone to pick up groceries for me from Trader Joe\'s and deliver to my apartment. I have a list of about 15 items. I\'ll pay for the groceries plus $25 for your time and delivery.',
          timePosted: '4 hours ago',
          urgency: 'medium' as const,
          category: 'Errands',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '6',
          title: 'Handyman for Small Repairs',
          poster: 'Jennifer Adams',
          posterAvatar: 'https://i.pravatar.cc/150?img=6',
          posterRating: 4.7,
          posterReviewCount: 9,
          posterVerified: true,
          location: 'Marina District',
          distance: '1.9 miles',
          pay: '$75',
          description: 'Need a handyman to fix a leaky faucet, hang some shelves, and repair a loose cabinet door. Should take about 2-3 hours total. Must have own tools.',
          timePosted: '5 hours ago',
          urgency: 'medium' as const,
          category: 'Home Repair',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '7',
          title: 'Social Media Content Creation',
          poster: 'Alex Thompson',
          posterAvatar: 'https://i.pravatar.cc/150?img=7',
          posterRating: 4.4,
          posterReviewCount: 11,
          location: 'SoMa',
          distance: '0.5 miles',
          pay: '$60',
          description: 'Looking for someone to help create social media content for my small business. Need about 10 posts with captions for Instagram. I\'ll provide the products for photography.',
          timePosted: '6 hours ago',
          urgency: 'low' as const,
          category: 'Creative',
          status: 'open' as const,
          reviews: []
        },
        {
          id: '8',
          title: 'Website Bug Fixes',
          poster: 'Michael Chen',
          posterAvatar: 'https://i.pravatar.cc/150?img=8',
          posterRating: 4.7,
          posterReviewCount: 18,
          posterVerified: true,
          location: 'Financial District',
          distance: '1.1 miles',
          pay: '$120',
          description: 'Looking for a web developer to fix some bugs on my small business website. Issues include mobile responsiveness and contact form not working properly. Should take 2-3 hours for someone experienced.',
          timePosted: '3 hours ago',
          urgency: 'medium' as const,
          category: 'Tech Support',
          status: 'open' as const,
          reviews: []
        },
      ];
      
      setQuickJobsList(jobs);
      
      // Update gigs stats based on the jobs
      setGigsStats({
        available: jobs.filter(job => job.status === 'open').length,
        applied: Math.floor(Math.random() * 3) + 1, // Random 1-3 for demo
        completed: Math.floor(Math.random() * 2) + 1 // Random 1-2 for demo
      });
      
      setIsLoading(false);
      setRefreshing(false);
    }, 800);
  }, []);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGigsData();
  }, [loadGigsData]);
  
  // Initialize with mock data for quick jobs
  useEffect(() => {
    loadGigsData();
  }, [loadGigsData]);

  // Filter categories with modern icons
  const categories: Category[] = [
    { 
      id: '1', 
      name: 'All', 
      icon: 'grid', 
      iconType: 'ionicons',
      color: '#5856D6',
      gradient: ['#6a11cb', '#2575fc'] 
    },
    { 
      id: '2', 
      name: 'Moving', 
      icon: 'truck-moving', 
      iconType: 'fontAwesome5',
      color: '#4CAF50',
      gradient: ['#11998e', '#38ef7d'] 
    },
    { 
      id: '3', 
      name: 'Pet Care', 
      icon: 'paw', 
      iconType: 'fontAwesome5',
      color: '#F57C00',
      gradient: ['#f46b45', '#eea849'] 
    },
    { 
      id: '4', 
      name: 'Yard Work', 
      icon: 'leaf', 
      iconType: 'fontAwesome5',
      color: '#388E3C',
      gradient: ['#56ab2f', '#a8e063'] 
    },
    { 
      id: '5', 
      name: 'Tech Support', 
      icon: 'laptop-code', 
      iconType: 'fontAwesome5',
      color: '#2196F3',
      gradient: ['#2193b0', '#6dd5ed'] 
    },
    { 
      id: '6', 
      name: 'Errands', 
      icon: 'shopping-bag', 
      iconType: 'fontAwesome5',
      color: '#FF9800',
      gradient: ['#ff9966', '#ff5e62'] 
    },
    { 
      id: '7', 
      name: 'Cleaning', 
      icon: 'spray-bottle', 
      iconType: 'materialCommunity',
      color: '#9C27B0',
      gradient: ['#834d9b', '#d04ed6'] 
    },
    { 
      id: '8', 
      name: 'Home Repair', 
      icon: 'tools', 
      iconType: 'fontAwesome5',
      color: '#795548',
      gradient: ['#b79891', '#94716b'] 
    },
    { 
      id: '9', 
      name: 'Creative', 
      icon: 'brush', 
      iconType: 'ionicons',
      color: '#E91E63',
      gradient: ['#ff758c', '#ff7eb3'] 
    },
    { 
      id: '10', 
      name: 'Education', 
      icon: 'school', 
      iconType: 'ionicons',
      color: '#3F51B5',
      gradient: ['#396afc', '#2948ff'] 
    },
  ];

  // Helper: Tasks Header Component
  const TasksFeedHeader = () => (
    tasks.length > 0 ? (
      <View style={{ marginBottom: 32 }}>
        <Text style={[styles.sectionTitle, { color: themeColors.text, marginBottom: 12 }]}>Open Tasks</Text>
        {tasks.filter(t => t.status === 'open').map(task => (
          <TouchableOpacity
            key={task.id}
            style={styles.jobCard}
            onPress={() => setSelectedTask(task)}
            activeOpacity={0.9}
          >
            <View style={styles.cardTopRow}>
              <Text style={[styles.categoryText, { color: '#4CAF50', fontWeight: '700' }]}>{task.category}</Text>
              <Text style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>Open</Text>
            </View>
            <Text style={styles.jobTitle}>{task.title}</Text>
            <Text style={styles.jobDescription} numberOfLines={2}>{task.description}</Text>
            <View style={styles.cardBottomRow}>
              <Text style={styles.locationText}>{task.location}</Text>
              <Text style={styles.payAmount}>{task.pay}</Text>
            </View>
            <TouchableOpacity
              style={[styles.applyButtonContainer, { marginTop: 16 }]}
              onPress={() => handlePickUpTask(task.id)}
            >
              <LinearGradient
                colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Pick Up Task</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {/* Claimed tasks (optional): visually distinct, not pickable */}
        {tasks.filter(t => t.status === 'claimed').map(task => (
          <View key={task.id} style={[styles.jobCard, { opacity: 0.6 }]}> 
            <View style={styles.cardTopRow}>
              <Text style={[styles.categoryText, { color: '#4CAF50', fontWeight: '700' }]}>{task.category}</Text>
              <Text style={[styles.statusBadge, { backgroundColor: '#FFECB3' }]}>Claimed</Text>
            </View>
            <Text style={styles.jobTitle}>{task.title}</Text>
            <Text style={styles.jobDescription} numberOfLines={2}>{task.description}</Text>
            <View style={styles.cardBottomRow}>
              <Text style={styles.locationText}>{task.location}</Text>
              <Text style={styles.payAmount}>{task.pay}</Text>
            </View>
            <View style={[styles.applyButtonContainer, { marginTop: 16, backgroundColor: '#eee' }]}> 
              <Text style={[styles.applyButtonText, { color: '#888' }]}>Already Picked Up</Text>
            </View>
          </View>
        ))}
      </View>
    ) : null
  );

  // Handle adding a review
  const handleAddReview = () => {
    if (!newReview.comment) {
      Alert.alert('Missing Information', 'Please add a comment to your review');
      return;
    }
    
    if (selectedJob && newReview.rating > 0) {
      // Simulate loading
      setIsLoading(true);
      
      setTimeout(() => {
        if (selectedJob) {
          const review: Review = {
            id: Date.now().toString(),
            reviewerId: 'current-user',
            reviewerName: 'You',
            reviewerAvatar: 'https://i.pravatar.cc/150?img=1',
            rating: newReview.rating,
            comment: newReview.comment,
            date: 'Just now'
          };
          
          // Add review to the job
          const updatedJobs = quickJobsList.map(job => {
            if (job.id === selectedJob.id) {
              const reviews = job.reviews ? [...job.reviews, review] : [review];
              return { ...job, reviews };
            }
            return job;
          });
          
          setQuickJobsList(updatedJobs);
          setShowReviewModal(false);
          setNewReview({ rating: 5, comment: '' });
          
          // Update selected job
          const updatedJob = updatedJobs.find(job => job.id === selectedJob.id);
          if (updatedJob) {
            setSelectedJob(updatedJob);
          }
        }
        
        setIsLoading(false);
        Alert.alert('Success', 'Your review has been submitted!');
      }, 800);
    } else {
      Alert.alert('Error', 'Please provide a rating');
    }
  };
  
  // Handle viewing a user profile
  const handleViewUserProfile = (user: any) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
  };
  
  // Filter and search jobs
  const filteredJobs = quickJobsList.filter(job => {
    const matchesCategory = activeFilter === 'All' || job.category === activeFilter;
    const matchesSearch = searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get urgency color
  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high') => {
    switch (urgency) {
      case 'high': return '#E53935';
      case 'medium': return '#FB8C00';
      case 'low': return '#43A047';
      default: return '#FB8C00';
    }
  };
  
  // Get status color
  const getStatusColor = (status: 'open' | 'in-progress' | 'completed') => {
    switch (status) {
      case 'open': return '#4CAF50';
      case 'in-progress': return '#2196F3';
      case 'completed': return '#9E9E9E';
      default: return '#4CAF50';
    }
  };
  
  // Get status label
  const getStatusLabel = (status: 'open' | 'in-progress' | 'completed') => {
    switch (status) {
      case 'open': return 'Open';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Open';
    }
  };

  // Render star rating with modern styling
  const renderStarRating = (rating: number, size: number = 14, showText: boolean = true) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
      <View style={styles.ratingContainer}>
        {[...Array(fullStars)].map((_, i) => (
          <FontAwesome key={`full-${i}`} name="star" size={size} color="#FFD700" style={styles.starIcon} />
        ))}
        {halfStar && (
          <FontAwesome key="half" name="star-half-o" size={size} color="#FFD700" style={styles.starIcon} />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <FontAwesome key={`empty-${i}`} name="star-o" size={size} color="#FFD700" style={styles.starIcon} />
        ))}
        {showText && <Text style={[styles.ratingText, { fontSize: size * 0.9 }]}>{rating.toFixed(1)}</Text>}
      </View>
    );
  };
  
  // This function was removed to avoid duplication with renderCategoryIcon

  // Handle job submission
  const handleSubmitJob = () => {
    if (!newJob.title || !newJob.location || !newJob.pay || !newJob.description || !newJob.category) {
      Alert.alert('Missing Information', 'Please fill in all fields');
      return;
    }

    // Simulate loading
    setIsLoading(true);
    
    setTimeout(() => {
      // Create a new job with the form data
      const submittedJob: QuickJob = {
        id: Date.now().toString(),
        title: newJob.title,
        poster: 'Alex Johnson', // Current user
        posterAvatar: 'https://i.pravatar.cc/150?img=1',
        posterRating: 4.7,
        posterReviewCount: 8,
        posterVerified: true,
        location: newJob.location,
        distance: 'Near you',
        pay: newJob.pay,
        description: newJob.description,
        timePosted: 'Just now',
        urgency: newJob.urgency,
        category: newJob.category,
        status: 'open',
        reviews: [],
      };

      // Add the new job to the list
      setQuickJobsList(prev => [submittedJob, ...prev]);

      // Close the modal and reset form
      setShowAddJobModal(false);
      setNewJob({
        title: '',
        location: '',
        pay: '',
        description: '',
        category: '',
        urgency: 'medium',
      });

      setIsLoading(false);

      // Show success message
      Alert.alert('Success', 'Your job has been posted!');
    }, 800);
  };

  // Handle job application
  const handleApplyForJob = (job: QuickJob) => {
    // Simulate loading
    setIsLoading(true);
    
    setTimeout(() => {
      // Convert QuickJob to Job format for the application context
      const jobForApplication: Job = {
        id: job.id,
        title: job.title,
        company: job.poster,
        location: job.location,
        pay: job.pay,
        image: job.posterAvatar,
        distance: job.distance || '',
        tags: [job.category],
        description: job.description,
        qualifications: [],
        requirements: [],
      };

      // Add to applications
      addApplication(jobForApplication);

      // Show notification
      setShowAppliedNotification(true);

      // Hide notification after 3 seconds
      setTimeout(() => {
        setShowAppliedNotification(false);
      }, 3000);

      // Close details modal if open
      setShowJobDetailsModal(false);
      setIsLoading(false);
    }, 600);
  };

  // Open job details
  const openJobDetails = (job: QuickJob) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);
  };
  
  // This function was removed to avoid duplication with handleViewUserProfile

  const renderQuickJobItem = ({ item }: { item: QuickJob }) => {
    // Find the category object
    const categoryObj = categories.find(cat => cat.name === item.category) || categories[0];
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.jobCard, 
          { 
            backgroundColor: colorScheme === 'dark' ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.96 : 1,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5,
            borderWidth: colorScheme === 'dark' ? 1 : 0,
            borderColor: colorScheme === 'dark' ? 'rgba(60, 60, 60, 0.5)' : 'transparent',
          }
        ]}
        onPress={() => openJobDetails(item)}
      >
        {/* Status Badge - Positioned at top right with modern styling */}
        <View style={[styles.statusBadge, { 
          backgroundColor: getStatusColor(item.status),
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }]}>
          <Text style={[styles.statusText, { fontSize: 12, fontWeight: '600' }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
        
        {/* Category Badge - New position at top left */}
        <View style={[styles.categoryBadgeTop, { 
          backgroundColor: categoryObj.color + '20',
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          position: 'absolute',
          top: 12,
          left: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }]}>
          {renderCategoryIcon(categoryObj, 14)}
          <Text style={[styles.categoryText, { 
            color: categoryObj.color,
            fontWeight: '600',
            marginLeft: 6,
            fontSize: 12,
          }]}>
            {item.category}
          </Text>
        </View>
        
        {/* Job Title - Moved up for better hierarchy */}
        <Text style={[styles.jobTitle, { 
          color: themeColors.text,
          fontSize: 20,
          fontWeight: '700',
          marginTop: 40, // Space for the badges
          marginBottom: 12,
        }]}>
          {item.title}
        </Text>

        {/* Location with Distance - Modernized with icon */}
        <View style={styles.locationContainer}>
          <View style={[styles.locationIconContainer, { 
            backgroundColor: 'rgba(33, 150, 243, 0.15)',
            borderRadius: 8,
            padding: 6,
          }]}>
            <Ionicons name="location-outline" size={14} color="#2196F3" />
          </View>
          <Text style={[styles.locationText, { color: themeColors.textSecondary }]}>
            {item.location}
          </Text>
          {item.distance && (
            <View style={styles.distanceContainer}>
              <View style={styles.distanceDot} />
              <Text style={[styles.distanceText, { color: themeColors.textSecondary }]}>
                {item.distance}
              </Text>
            </View>
          )}
        </View>

        {/* Description - Cleaner styling */}
        <Text 
          style={[styles.jobDescription, { 
            color: themeColors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
            marginTop: 12,
            marginBottom: 16,
          }]} 
          numberOfLines={2}
        >
          {item.description}
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colorScheme === 'dark' ? 'rgba(80, 80, 80, 0.3)' : 'rgba(0, 0, 0, 0.06)' }]} />

        {/* Bottom Row with User Info and Pay */}
        <View style={styles.cardBottomRow}>
          {/* User Info - Compact version */}
          <TouchableOpacity 
            style={styles.posterInfoCompact}
            onPress={() => handleViewUserProfile({
              id: item.id,
              name: item.poster,
              avatar: item.posterAvatar,
              rating: item.posterRating,
              reviewCount: item.posterReviewCount,
              verified: item.posterVerified,
              bio: "I'm a local resident looking for help with various tasks.",
              skills: ["Communication", "Organization", "Reliability"],
              completedJobs: 15,
              memberSince: "January 2023"
            })}
          >
            <View style={styles.posterAvatarRow}>
              <Image 
                source={{ uri: item.posterAvatar }} 
                style={styles.posterAvatarSmall} 
              />
              {item.posterVerified && (
                <View style={styles.verifiedBadgeSmall}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
              <View style={styles.posterNameCompact}>
                <Text style={[styles.posterNameText, { color: themeColors.text }]} numberOfLines={1}>
                  {item.poster}
                </Text>
                <View style={styles.ratingRow}>
                  <FontAwesome name="star" size={12} color="#FFD700" />
                  <Text style={styles.ratingText}>{item.posterRating.toFixed(1)}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Pay with modern styling */}
          <View style={[styles.payBadge, {
            backgroundColor: colorScheme === 'dark' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.1)',
            borderRadius: 12,
          }]}>
            <Text style={styles.payAmount}>
              {item.pay}
            </Text>
          </View>
        </View>

        {/* Apply Button - Modern gradient button */}
        <TouchableOpacity
          style={styles.applyButtonContainer}
          onPress={() => handleApplyForJob(item)}
        >
          <LinearGradient
            colors={['#4CAF50', '#2E7D32']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyButtonGradient}
          >
            <Text style={styles.applyButtonText}>
              Apply Now
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Time and Urgency - Moved to bottom for cleaner layout */}
        <View style={styles.timeUrgencyRow}>
          <Text style={[styles.timePosted, { color: themeColors.textSecondary }]}>
            {item.timePosted}
          </Text>
          <View style={[styles.urgencyBadge, { 
            backgroundColor: getUrgencyColor(item.urgency) + '20',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }]}>
            <Ionicons 
              name={
                item.urgency === 'high' ? 'flash-outline' : 
                (item.urgency === 'medium' ? 'time-outline' : 'calendar-outline')
              } 
              size={12} 
              color={getUrgencyColor(item.urgency)} 
              style={{marginRight: 4}} 
            />
            <Text style={[styles.urgencyText, { 
              color: getUrgencyColor(item.urgency),
              fontSize: 12,
              fontWeight: '600',
            }]}>
              {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  // Render job details modal
  const renderJobDetailsModal = () => {
    if (!selectedJob) return null;
    
    // Find the category object
    const categoryObj = categories.find(cat => cat.name === selectedJob.category) || categories[0];
    
    return (
      <View style={styles.modalOverlay}>
        <View style={[styles.jobDetailsModal, { backgroundColor: themeColors.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowJobDetailsModal(false)}
            >
              <FontAwesome5 name="arrow-left" size={18} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Job Details</Text>
            <TouchableOpacity
              style={styles.shareButton}
            >
              <FontAwesome5 name="share-alt" size={18} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.jobDetailsScrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Job Title and Status */}
            <View style={styles.jobTitleContainer}>
              <Text style={[styles.jobTitleLarge, { color: themeColors.text }]}> {selectedJob.title}</Text>
              <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedJob.status) }]}>
                <Text style={styles.statusTextLarge}>{getStatusLabel(selectedJob.status)}</Text>
              </View>
            </View>
            
            {/* Poster Info with Badge */}
            <TouchableOpacity 
              style={styles.posterInfoLarge}
              onPress={() => {
                setShowJobDetailsModal(false);
                setTimeout(() => {
                  handleViewUserProfile({
                    id: selectedJob.id,
                    name: selectedJob.poster,
                    avatar: selectedJob.posterAvatar,
                    rating: selectedJob.posterRating,
                    reviewCount: selectedJob.posterReviewCount,
                    verified: selectedJob.posterVerified,
                    bio: "I'm a local resident looking for help with various tasks.",
                    skills: ["Communication", "Organization", "Reliability"],
                    completedJobs: 15,
                    memberSince: "January 2023"
                  });
                }, 300);
              }}
            >
              <View style={styles.posterAvatarContainer}>
                <Image source={{ uri: selectedJob.posterAvatar }} style={styles.posterAvatarLarge} />
                {selectedJob.posterVerified && (
                  <View style={styles.verifiedBadgeLarge}>
                    <FontAwesome name="check" size={10} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.posterDetailsLarge}>
                <Text style={[styles.posterNameLarge, { color: themeColors.text }]}>{selectedJob.poster}</Text>
                <View style={styles.posterRatingRowLarge}>
                  {renderStarRating(selectedJob.posterRating, 14)}
                  <Text style={styles.reviewCountLarge}>({selectedJob.posterReviewCount} reviews)</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => handleViewUserProfile({
                  id: selectedJob.id,
                  name: selectedJob.poster,
                  avatar: selectedJob.posterAvatar,
                  rating: selectedJob.posterRating,
                  reviewCount: selectedJob.posterReviewCount,
                  verified: selectedJob.posterVerified,
                  completedJobs: 15,
                  memberSince: '2023',
                  bio: 'Experienced professional with a passion for quality work.',
                  skills: ['Communication', 'Reliability', 'Problem Solving']
                })}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
                <FontAwesome5 name="chevron-right" size={12} color={themeColors.tint} />
              </TouchableOpacity>
            </TouchableOpacity>

            {/* Key Details Card */}
            <View style={[styles.detailsCard, { backgroundColor: themeColors.background }]}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIconContainer, { backgroundColor: '#4CAF5020' }]}>
                  <FontAwesome5 name="map-marker-alt" size={16} color="#4CAF50" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Location</Text>
                  <Text style={[styles.detailText, { color: themeColors.text }]}>{selectedJob.location}</Text>
                  {selectedJob.distance && (
                    <Text style={styles.distanceTextDetail}>{selectedJob.distance}</Text>
                  )}
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIconContainer, { backgroundColor: '#2196F320' }]}>
                  <FontAwesome5 name="money-bill-wave" size={16} color="#2196F3" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Payment</Text>
                  <Text style={[styles.detailText, { color: themeColors.text }]}>{selectedJob.pay}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIconContainer, { backgroundColor: '#FF980020' }]}>
                  <FontAwesome5 name="clock" size={16} color="#FF9800" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Posted</Text>
                  <Text style={[styles.detailText, { color: themeColors.text }]}>{selectedJob.timePosted}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIconContainer, { backgroundColor: categoryObj.color + '20' }]}>
                  {renderCategoryIcon(categoryObj, 16)}
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Category</Text>
                  <Text style={[styles.detailText, { color: themeColors.text }]}>{selectedJob.category}</Text>
                </View>
              </View>
              
              <View style={styles.detailRow}>
                <View style={[styles.detailIconContainer, { backgroundColor: getUrgencyColor(selectedJob.urgency) + '20' }]}>
                  <FontAwesome5 
                    name={
                      selectedJob.urgency === 'high' ? 'bolt' : 
                      (selectedJob.urgency === 'medium' ? 'clock' : 'calendar')
                    } 
                    size={16} 
                    color={getUrgencyColor(selectedJob.urgency)} 
                  />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Urgency</Text>
                  <Text style={[styles.detailText, { color: getUrgencyColor(selectedJob.urgency) }]}>
                    {selectedJob.urgency.charAt(0).toUpperCase() + selectedJob.urgency.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Description</Text>
              <Text style={[styles.descriptionText, { color: themeColors.textSecondary }]}>
                {selectedJob.description}
              </Text>
            </View>
            
            {/* Reviews Section */}
            <View style={styles.reviewsSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Reviews</Text>
              
              {/* This would be populated with actual reviews in a real implementation */}
              <View style={styles.noReviewsContainer}>
                <FontAwesome5 name="comment-alt" size={24} color={themeColors.textSecondary} style={styles.noReviewsIcon} />
                <Text style={[styles.noReviewsText, { color: themeColors.textSecondary }]}>No reviews yet</Text>
              </View>
            </View>
          </ScrollView>
          
          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.messageButton, { borderColor: themeColors.border }]}
              onPress={() => {
                // Message functionality would go here
                Alert.alert('Message', 'Messaging functionality will be implemented soon!');
              }}
            >
              <FontAwesome5 name="comment" size={16} color={themeColors.text} style={{ marginRight: 8 }} />
              <Text style={[styles.messageButtonText, { color: themeColors.text }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButtonLarge, { backgroundColor: '#2196F3' }]}
              onPress={() => handleApplyForJob(selectedJob)}
            >
              <FontAwesome5 name="check" size={16} color="#fff" style={{marginRight: 8}} />
              <Text style={[styles.applyButtonText, { color: '#fff' }]}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Render user profile modal
  const renderUserProfileModal = () => {
    if (!selectedUser) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={[styles.userProfileModal, { backgroundColor: themeColors.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowUserProfileModal(false)}
            >
              <FontAwesome5 name="arrow-left" size={18} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>User Profile</Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView 
            style={styles.userProfileScrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* User Header */}
            <View style={styles.userProfileHeader}>
              <View style={styles.userAvatarContainer}>
                <Image source={{ uri: selectedUser.avatar }} style={styles.userAvatar} />
                {selectedUser.verified && (
                  <View style={styles.userVerifiedBadge}>
                    <FontAwesome name="check" size={12} color="#fff" />
                  </View>
                )}
              </View>
              
              <Text style={[styles.userName, { color: themeColors.text }]}>{selectedUser.name}</Text>
              
              <View style={styles.userRatingContainer}>
                {renderStarRating(selectedUser.rating, 16)}
                <Text style={styles.userReviewCount}>({selectedUser.reviewCount} reviews)</Text>
              </View>
              
              <View style={styles.userStatsContainer}>
                <View style={styles.userStatItem}>
                  <Text style={styles.userStatValue}>{selectedUser.completedJobs || 0}</Text>
                  <Text style={styles.userStatLabel}>Jobs Completed</Text>
                </View>
                <View style={[styles.userStatDivider, { backgroundColor: themeColors.border }]} />
                <View style={styles.userStatItem}>
                  <Text style={styles.userStatValue}>{selectedUser.memberSince || 'New'}</Text>
                  <Text style={styles.userStatLabel}>Member Since</Text>
                </View>
              </View>
            </View>
            
            {/* Bio Section */}
            {selectedUser.bio && (
              <View style={styles.userBioSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>About</Text>
                <Text style={[styles.userBioText, { color: themeColors.textSecondary }]}>
                  {selectedUser.bio}
                </Text>
              </View>
            )}
            
            {/* Skills Section */}
            {selectedUser.skills && selectedUser.skills.length > 0 && (
              <View style={styles.userSkillsSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Skills</Text>
                <View style={styles.skillsContainer}>
                  {selectedUser.skills.map((skill: string, index: number) => (
                    <View key={index} style={[styles.skillBadge, { backgroundColor: themeColors.background }]}>
                      <Text style={[styles.skillText, { color: themeColors.text }]}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Reviews Section */}
            <View style={styles.userReviewsSection}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Reviews</Text>
              
              {/* This would be populated with actual reviews in a real implementation */}
              <View style={styles.noReviewsContainer}>
                <FontAwesome5 name="comment-alt" size={24} color={themeColors.textSecondary} style={styles.noReviewsIcon} />
                <Text style={[styles.noReviewsText, { color: themeColors.textSecondary }]}>No reviews yet</Text>
              </View>
            </View>
          </ScrollView>
          
          {/* Footer Button */}
          <View style={styles.userProfileFooter}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => {
                Alert.alert('Contact', 'Contact functionality will be implemented soon!');
              }}
            >
              <LinearGradient
                colors={['#2196F3', '#1976D2'] as readonly [ColorValue, ColorValue]}
                style={styles.contactButtonGradient}
              >
                <FontAwesome5 name="envelope" size={16} color="#fff" />
                <Text style={styles.contactButtonText}>Contact {selectedUser.name}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };
  
  // Render review modal
  const renderReviewModal = () => {
    if (!selectedJob) return null;
    
    return (
      <View style={styles.modalOverlay}>
        <View style={[styles.reviewModal, { backgroundColor: themeColors.card }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowReviewModal(false)}
            >
              <FontAwesome5 name="arrow-left" size={18} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Write a Review</Text>
            <View style={{width: 40}} />
          </View>
          
          <ScrollView 
            style={styles.reviewModalScrollView}
            contentContainerStyle={styles.reviewModalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Job Info */}
            <View style={styles.reviewJobInfo}>
              <Text style={[styles.reviewJobTitle, { color: themeColors.text }]}>
                Review for: {selectedJob.title}
              </Text>
              <View style={styles.reviewJobPoster}>
                <Image source={{ uri: selectedJob.posterAvatar }} style={styles.reviewJobPosterAvatar} />
                <Text style={[styles.reviewJobPosterName, { color: themeColors.textSecondary }]}>
                  Posted by {selectedJob.poster}
                </Text>
              </View>
            </View>
            
            {/* Rating Selection */}
            <View style={styles.ratingSelectionContainer}>
              <Text style={[styles.ratingSelectionTitle, { color: themeColors.text }]}>Your Rating</Text>
              <View style={styles.ratingStarsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => setNewReview({...newReview, rating: star})}
                    style={styles.ratingStarButton}
                  >
                    <FontAwesome 
                      name={star <= newReview.rating ? "star" : "star-o"} 
                      size={36} 
                      color="#FFD700" 
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingDescription}>
                {newReview.rating === 5 ? 'Excellent!' : 
                 newReview.rating === 4 ? 'Very Good' : 
                 newReview.rating === 3 ? 'Good' : 
                 newReview.rating === 2 ? 'Fair' : 'Poor'}
              </Text>
            </View>
            
            {/* Review Comment */}
            <View style={styles.reviewCommentContainer}>
              <Text style={[styles.reviewCommentTitle, { color: themeColors.text }]}>Your Review</Text>
              <TextInput
                style={[styles.reviewCommentInput, { 
                  backgroundColor: themeColors.background, 
                  color: themeColors.text,
                  borderColor: themeColors.border
                }]}
                placeholder="Share your experience working with this person..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={newReview.comment}
                onChangeText={(text) => setNewReview({...newReview, comment: text})}
              />
            </View>
          </ScrollView>
          
          {/* Submit Button */}
          <View style={styles.reviewModalFooter}>
            <TouchableOpacity
              style={[styles.cancelReviewButton, { borderColor: themeColors.border }]}
              onPress={() => setShowReviewModal(false)}
            >
              <Text style={[styles.cancelReviewButtonText, { color: themeColors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitReviewButton}
              onPress={handleAddReview}
            >
              <LinearGradient
                colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
                style={styles.submitReviewButtonGradient}
              >
                <Text style={styles.submitReviewButtonText}>Submit Review</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Get category icon
  const getCategoryIcon = (categoryName: string): keyof typeof FontAwesome.glyphMap => {
    const category = categories.find(cat => cat.name === categoryName);
    return (category ? category.icon : 'tag') as keyof typeof FontAwesome.glyphMap;
  };

  // Get category color
  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.color : '#666';
  };
  
  // Render category icon with appropriate icon set
  const renderCategoryIcon = (category: Category, size: number = 16) => {
    const color = category.name === activeFilter ? '#fff' : 
                 (colorScheme === 'dark' ? themeColors.text : '#000');
    
    switch (category.iconType) {
      case 'fontAwesome':
        return <FontAwesome name={category.icon as any} size={size} color={color} />;
      case 'fontAwesome5':
        return <FontAwesome5 name={category.icon} size={size} color={color} />;
      case 'material':
        return <MaterialIcons name={category.icon as any} size={size} color={color} />;
      case 'materialCommunity':
        return <MaterialCommunityIcons name={category.icon as any} size={size} color={color} />;
      case 'ionicons':
        return <Ionicons name={category.icon as any} size={size} color={color} />;
      default:
        return <FontAwesome name={category.icon as any} size={size} color={color} />;
    }
  };

  // Add Task handler
  const handleAddTask = () => {
    if (!newTask.title || !newTask.description) return;
    const task: Task = {
      ...newTask,
      id: Date.now().toString(),
      postedBy: 'currentUser', // Replace with real user
      claimedBy: null,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    setTasks([task, ...tasks]);
    setShowAddTaskModal(false);
    setNewTask({ title: '', description: '', category: '', location: '', pay: '' });
  };

  // Pick Up Task handler
  const handlePickUpTask = (taskId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, claimedBy: 'currentUser', status: 'claimed' } : t));
    setSelectedTask(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Modern Header with Blur Effect */}
      <Animated.View style={[
        styles.header,
        { 
          height: headerHeight,
          overflow: 'hidden',
        }
      ]}>
        <BlurView 
          intensity={colorScheme === 'dark' ? 40 : 60} 
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          style={styles.blurContainer}
        >
          <View style={styles.headerContent}>
            {/* Title and View Toggle */}
            <View style={styles.headerTopRow}>
              <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                  Discover <Text style={{ fontWeight: '800', color: themeColors.tint }}>Gigs</Text>
                </Text>
              </View>
              
              {/* View Toggle */}
              <View style={[styles.viewToggleContainer, { backgroundColor: colorScheme === 'dark' ? '#222' : '#f0f0f0' }]}>
                <TouchableOpacity 
                  style={[
                    styles.viewToggleButton, 
                    viewMode === 'list' && { 
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }
                  ]}
                  onPress={() => setViewMode('list')}
                >
                  <Ionicons 
                    name="list" 
                    size={18} 
                    color={viewMode === 'list' ? themeColors.tint : themeColors.textSecondary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.viewToggleButton, 
                    viewMode === 'map' && { 
                      backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 3,
                      elevation: 2,
                    }
                  ]}
                  onPress={() => setViewMode('map')}
                >
                  <Ionicons 
                    name="map" 
                    size={18} 
                    color={viewMode === 'map' ? themeColors.tint : themeColors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Search Bar - Simplified and Modern */}
            <View style={[styles.searchContainer, { 
              backgroundColor: themeColors.backgroundSecondary,
              borderColor: themeColors.border,
            }]}>
              <Ionicons name="search-outline" size={20} color={themeColors.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: themeColors.text }]}
                placeholder="Search gigs or locations"
                placeholderTextColor={themeColors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Ionicons name="close-circle" size={18} color={themeColors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Filter Categories - Horizontal Scrollable Pills */}
            <ScrollableCategories
              categories={categories}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              colorScheme={colorScheme}
              themeColors={themeColors}
              renderCategoryIcon={renderCategoryIcon}
            />
            
            {/* Gigs Stats - Modern Cards with Gradient Accents */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScrollContainer}
            >
              <View style={[
                styles.gigStatCard, 
                { backgroundColor: themeColors.card }
              ]}>
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statIconGradient}
                >
                  <Ionicons name="briefcase-outline" size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.gigStatContent}>
                  <Text style={[styles.gigStatValue, { color: themeColors.text }]}>{gigsStats.available}</Text>
                  <Text style={[styles.gigStatLabel, { color: themeColors.textSecondary }]}>Available</Text>
                </View>
              </View>
              
              <View style={[
                styles.gigStatCard, 
                { backgroundColor: themeColors.card }
              ]}>
                <LinearGradient
                  colors={['#2196F3', '#1565C0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statIconGradient}
                >
                  <Ionicons name="paper-plane-outline" size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.gigStatContent}>
                  <Text style={[styles.gigStatValue, { color: themeColors.text }]}>{gigsStats.applied}</Text>
                  <Text style={[styles.gigStatLabel, { color: themeColors.textSecondary }]}>Applied</Text>
                </View>
              </View>
              
              <View style={[
                styles.gigStatCard, 
                { backgroundColor: themeColors.card }
              ]}>
                <LinearGradient
                  colors={['#FF9800', '#E65100']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statIconGradient}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                </LinearGradient>
                <View style={styles.gigStatContent}>
                  <Text style={[styles.gigStatValue, { color: themeColors.text }]}>{gigsStats.completed}</Text>
                  <Text style={[styles.gigStatLabel, { color: themeColors.textSecondary }]}>Completed</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </Animated.View>

      {viewMode === 'list' ? (
        <FlatList
          data={filteredJobs}
          renderItem={renderQuickJobItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100, paddingTop: 8 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={themeColors.tint}
              colors={[themeColors.tint]}
            />
          }
          ListHeaderComponent={<TasksFeedHeader />}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={themeColors.tint} />
                <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading gigs...</Text>
              </View>
            ) : (
              <View style={styles.noJobsContainer}>
                <Ionicons name="briefcase-outline" size={60} color={themeColors.textSecondary} />
                <Text style={[styles.noJobsText, { color: themeColors.text }]}>No gigs available</Text>
                <Text style={[styles.noJobsSubText, { color: themeColors.textSecondary }]}>
                  Try changing your filters or check back later
                </Text>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.mapPlaceholder}>
          <LinearGradient
            colors={['rgba(33, 150, 243, 0.1)', 'rgba(33, 150, 243, 0.05)']}
            style={styles.mapPlaceholderGradient}
          >
            <FontAwesome5 name="map-marked-alt" size={60} color={themeColors.tint} />
            <Text style={[styles.mapPlaceholderText, { color: themeColors.text }]}>Map View Coming Soon</Text>
            <Text style={[styles.mapPlaceholderSubtext, { color: themeColors.textSecondary }]}>
              You’ll soon be able to see gigs near you on a map
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Create Job Button */}
      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => setShowAddJobModal(true)}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
          style={styles.fabGradient}
        >
          <FontAwesome5 name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Job Details Modal */}
      <Modal
        visible={showJobDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowJobDetailsModal(false)}
      >
        {renderJobDetailsModal()}
      </Modal>
      
      {/* User Profile Modal */}
      <Modal
        visible={showUserProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserProfileModal(false)}
      >
        {renderUserProfileModal()}
      </Modal>
      
      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        {renderReviewModal()}
      </Modal>

      {/* Add Job Modal */}
      <Modal
        visible={showAddJobModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddJobModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowAddJobModal(false)}
              >
                <FontAwesome5 name="arrow-left" size={18} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Post a Gig</Text>
              <View style={{width: 40}} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Job Title</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="Enter job title"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newJob.title}
                  onChangeText={(text) => setNewJob({...newJob, title: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Location</Text>
                <View style={styles.locationInputContainer}>
                  <TextInput
                    style={[styles.formInput, { 
                      backgroundColor: themeColors.background, 
                      color: themeColors.text,
                      borderColor: themeColors.border,
                      flex: 1
                    }]}
                    placeholder="Enter location"
                    placeholderTextColor={themeColors.textSecondary}
                    value={newJob.location}
                    onChangeText={(text) => setNewJob({...newJob, location: text})}
                  />
                  <TouchableOpacity 
                    style={[styles.locationButton, { backgroundColor: themeColors.tint }]}
                    onPress={() => {
                      // This would use geolocation in a real implementation
                      setNewJob({...newJob, location: 'Current Location'});
                    }}
                  >
                    <FontAwesome5 name="map-marker-alt" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Payment Offered</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="e.g. $50, $25/hr"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newJob.pay}
                  onChangeText={(text) => setNewJob({...newJob, pay: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Description</Text>
                <TextInput
                  style={[styles.formTextarea, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="Describe what you need help with"
                  placeholderTextColor={themeColors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={newJob.description}
                  onChangeText={(text) => setNewJob({...newJob, description: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.filter(cat => cat.name !== 'All').map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryGridItem,
                        newJob.category === category.name && { 
                          borderColor: category.color,
                          backgroundColor: category.color + '10'
                        }
                      ]}
                      onPress={() => setNewJob({...newJob, category: category.name})}
                    >
                      <View style={[
                        styles.categoryIconContainer, 
                        { backgroundColor: category.color + '20' }
                      ]}>
                        {renderCategoryIcon(category, 20)}
                      </View>
                      <Text 
                        style={[
                          styles.categoryGridText, 
                          { color: newJob.category === category.name ? category.color : themeColors.text }
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Urgency Level</Text>
                <View style={styles.urgencySelector}>
                  {['low', 'medium', 'high'].map((urgency) => (
                    <TouchableOpacity
                      key={urgency}
                      style={[
                        styles.urgencySelectorItem,
                        { borderColor: getUrgencyColor(urgency as 'low' | 'medium' | 'high') },
                        newJob.urgency === urgency && {
                          backgroundColor: getUrgencyColor(urgency as 'low' | 'medium' | 'high') + '20'
                        }
                      ]}
                      onPress={() => setNewJob({...newJob, urgency: urgency as 'low' | 'medium' | 'high'})}
                    >
                      <FontAwesome5 
                        name={
                          urgency === 'high' ? 'bolt' : 
                          (urgency === 'medium' ? 'clock' : 'calendar')
                        } 
                        size={14} 
                        color={getUrgencyColor(urgency as 'low' | 'medium' | 'high')} 
                        style={{marginRight: 8}}
                      />
                      <Text
                        style={[
                          styles.urgencySelectorText,
                          { color: getUrgencyColor(urgency as 'low' | 'medium' | 'high') }
                        ]}
                      >
                        {urgency === 'high' ? 'Urgent (Today)' : 
                         urgency === 'medium' ? 'Soon (This Week)' : 
                         'Flexible (Anytime)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: themeColors.border }]}
                onPress={() => setShowAddJobModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitJob}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Post Gig</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Applied Notification */}
      {showAppliedNotification && (
        <View style={styles.appliedNotification}>
          <LinearGradient
            colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
            style={styles.appliedNotificationGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.appliedNotificationText}>Application Sent Successfully!</Text>
          </LinearGradient>
        </View>
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={themeColors.tint} />
        </View>
      )}
      
      {/* Add Task Button */}
      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => setShowAddTaskModal(true)}
      >
        <LinearGradient
          colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
          style={styles.fabGradient}
        >
          <FontAwesome5 name="plus" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTaskModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddTaskModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setShowAddTaskModal(false)}
              >
                <FontAwesome5 name="arrow-left" size={18} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Add Task</Text>
              <View style={{width: 40}} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Task Title</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="Enter task title"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newTask.title}
                  onChangeText={(text) => setNewTask({...newTask, title: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Task Description</Text>
                <TextInput
                  style={[styles.formTextarea, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="Describe the task"
                  placeholderTextColor={themeColors.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={newTask.description}
                  onChangeText={(text) => setNewTask({...newTask, description: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.filter(cat => cat.name !== 'All').map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryGridItem,
                        newTask.category === category.name && { 
                          borderColor: category.color,
                          backgroundColor: category.color + '10'
                        }
                      ]}
                      onPress={() => setNewTask({...newTask, category: category.name})}
                    >
                      <View style={[
                        styles.categoryIconContainer, 
                        { backgroundColor: category.color + '20' }
                      ]}>
                        {renderCategoryIcon(category, 20)}
                      </View>
                      <Text 
                        style={[
                          styles.categoryGridText, 
                          { color: newTask.category === category.name ? category.color : themeColors.text }
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Location</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="Enter location"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newTask.location}
                  onChangeText={(text) => setNewTask({...newTask, location: text})}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: themeColors.text }]}>Pay</Text>
                <TextInput
                  style={[styles.formInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border
                  }]}
                  placeholder="Enter pay"
                  placeholderTextColor={themeColors.textSecondary}
                  value={newTask.pay}
                  onChangeText={(text) => setNewTask({...newTask, pay: text})}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: themeColors.border }]}
                onPress={() => setShowAddTaskModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddTask}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>Add Task</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}> 
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => setSelectedTask(null)}>
                <FontAwesome5 name="arrow-left" size={18} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Task Details</Text>
              <View style={{ width: 40 }} />
            </View>
            {selectedTask && (
              <ScrollView contentContainerStyle={styles.modalScrollContent}>
                <Text style={[styles.jobTitle, { marginTop: 0 }]}>{selectedTask.title}</Text>
                <Text style={styles.jobDescription}>{selectedTask.description}</Text>
                <View style={styles.cardBottomRow}>
                  <Text style={styles.locationText}>{selectedTask.location}</Text>
                  <Text style={styles.payAmount}>{selectedTask.pay}</Text>
                </View>
                <Text style={[styles.categoryText, { marginTop: 10, color: '#4CAF50' }]}>{selectedTask.category}</Text>
                <Text style={{ color: '#888', marginTop: 8 }}>Posted: {new Date(selectedTask.createdAt).toLocaleString()}</Text>
                {selectedTask.status === 'open' ? (
                  <TouchableOpacity
                    style={[styles.applyButtonContainer, { marginTop: 24 }]}
                    onPress={() => handlePickUpTask(selectedTask.id)}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#2E7D32'] as readonly [ColorValue, ColorValue]}
                      style={styles.applyButtonGradient}
                    >
                      <Text style={styles.applyButtonText}>Pick Up Task</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.applyButtonContainer, { marginTop: 24, backgroundColor: '#eee' }]}> 
                    <Text style={[styles.applyButtonText, { color: '#888' }]}>Already Picked Up</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ScrollableCategories = ({
  categories,
  activeFilter,
  setActiveFilter,
  colorScheme,
  themeColors,
  renderCategoryIcon
}: ScrollableCategoriesProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoriesScrollContent}
    >
      {/* All category */}
      <TouchableOpacity
        style={[
          styles.categoryButton,
          activeFilter === 'All' && styles.activeCategoryButton,
          activeFilter === 'All' && { backgroundColor: '#5856D6' }
        ]}
        onPress={() => setActiveFilter('All')}
      >
        <View style={styles.categoryIcon}>
          <Ionicons name="grid" size={16} color={activeFilter === 'All' ? '#fff' : themeColors.text} />
        </View>
        <Text
          style={[
            styles.categoryLabel,
            { color: activeFilter === 'All' ? '#fff' : themeColors.text }
          ]}
        >
          All
        </Text>
      </TouchableOpacity>

      {categories.map((category) => {
        const isActive = activeFilter === category.name;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              isActive && styles.activeCategoryButton,
              isActive && { backgroundColor: category.color }
            ]}
            onPress={() => setActiveFilter(category.name)}
          >
            <LinearGradient
              colors={isActive ? 
                [category.color + '80', category.color] as readonly [ColorValue, ColorValue] : 
                [(themeColors.card + '80'), themeColors.card] as readonly [ColorValue, ColorValue]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.categoryButtonGradient,
                isActive && { backgroundColor: category.color }
              ]}
            >
              <View style={styles.categoryIcon}>
                {renderCategoryIcon(category, 16)}
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  { color: isActive ? '#fff' : themeColors.text }
                ]}
              >
                {category.name}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    overflow: 'hidden',
    zIndex: 1,
  },
  blurContainer: {
    width: '100%',
    height: '100%',
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGigButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clearSearchButton: {
    padding: 4,
  },
  todayIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  headerSearchContainer: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonActive: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  filterButtonTextActive: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  jobCard: {
    borderRadius: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.97)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    padding: 20,
    overflow: 'visible',
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 2,
    backgroundColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusText: {
    color: '#222',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  posterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterInfoLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  posterInfoCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    position: 'relative',
  },
  posterAvatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    position: 'relative',
  },
  posterAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  posterAvatarLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  posterAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  posterAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedBadgeSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedBadgeLarge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2196F3',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  posterNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  posterNameText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  posterNameCompact: {
    flexDirection: 'column',
    marginLeft: 8,
  },
  posterDetailsLarge: {
    flex: 1,
  },
  posterNameLarge: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  posterRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posterRatingRowLarge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 1,
  },
  reviewCount: {
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.7,
  },
  reviewCountLarge: {
    fontSize: 14,
    marginLeft: 4,
    opacity: 0.7,
  },
  timeAndUrgency: {
    alignItems: 'flex-end',
  },
  timePosted: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '500',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  distanceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginRight: 4,
  },
  distanceText: {
    fontSize: 14,
    opacity: 0.7,
    marginLeft: 4,
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  payContainer: {
    flexDirection: 'column',
  },
  payLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  payAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  applyButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  applyButtonContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  timeUrgencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewItem: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  reviewText: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 4,
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ratingStarButton: {
    padding: 8,
  },
  ratingDescription: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  profileSection: {
    marginBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  largePosterAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  profileStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileStatLabel: {
    fontSize: 14,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapCallout: {
    width: 200,
    padding: 8,
    borderRadius: 8,
  },
  mapCalloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  mapCalloutInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  mapCalloutPay: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  addJobButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formSelect: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appliedNotification: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  appliedNotificationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  emptyStateContainer: { 
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  emptyStateIcon: { 
    opacity: 0.5,
    marginBottom: 16
  },
  emptyStateText: { 
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8
  },
  emptyStateSubtext: { 
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 20
  },
  categoryButtonContent: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8
  },
  categoryButtonTextActive: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8
  },
  // Job Details Modal styles
  jobDetailsModal: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 12,
  },
  jobDetailsScrollView: {
    padding: 16,
  },
  jobTitleContainer: {
    marginBottom: 16,
  },
  jobTitleLarge: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  statusBadgeLarge: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
    marginBottom: 10,
    backgroundColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 5,
    elevation: 2,
  },
  statusTextLarge: {
    color: '#222',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
  },
  viewProfileText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  detailsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  detailText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalFooterBlur: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  // Weekly day selector styles
  weekDaySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    marginBottom: 16,
  },
  dayButton: {
    alignItems: 'center',
    width: 40,
  },
  dayNameText: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Gig stats display
  gigsStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  gigStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  gigStatIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gigStatNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  gigStatLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  shareButton: {
    padding: 8,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  descriptionSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  descriptionText: {
    lineHeight: 22,
    fontSize: 15,
  },
  reviewsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
  },
  addReviewText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewsList: {
    marginTop: 8,
  },
  reviewItemBorder: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 12,
  },
  reviewComment: {
    marginTop: 4,
    lineHeight: 20,
  },
  noReviewsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noReviewsIcon: {
    marginBottom: 16,
  },
  noReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  noReviewsSubtext: {
    textAlign: 'center',
    opacity: 0.7,
    maxWidth: 250,
  },
  // User profile styles
  userProfileModal: {
    flex: 1,
    marginTop: 0,
  },
  userProfileScrollView: {
    flex: 1,
  },
  userProfileHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  userAvatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  userVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#5856D6',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  userRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  userReviewCount: {
    marginLeft: 4,
  },
  userStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  userStatItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  userStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  userStatLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  userStatDivider: {
    width: 1,
    height: 30,
  },
  userBioSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  userBioText: {
    lineHeight: 21,
  },
  userSkillsSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  userReviewsSection: {
    padding: 16,
  },
  userProfileFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  contactButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  contactButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Review modal styles
  reviewModal: {
    flex: 1,
    marginTop: 0,
  },
  reviewModalScrollView: {
    flex: 1,
  },
  reviewModalContent: {
    padding: 16,
  },
  reviewJobInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  reviewJobTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  reviewJobPoster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewJobPosterAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  reviewJobPosterName: {
    fontSize: 14,
  },
  ratingSelectionContainer: {
    marginBottom: 24,
  },
  ratingSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewCommentContainer: {
    marginBottom: 24,
  },
  reviewCommentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reviewCommentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
  },
  reviewModalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  cancelReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
  },
  cancelReviewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitReviewButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitReviewButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Header components
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Calendar day selection
  weekDayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  selectedDayButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Gig stat content
  gigStatContent: {
    alignItems: 'center',
  },
  gigStatValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  // List content
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  // Filter categories
  filterCategoriesWrapper: {
    paddingVertical: 16,
  },
  // No jobs state
  noJobsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  noJobsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noJobsSubText: {
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 250,
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  // Map placeholder
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  mapPlaceholderSubtext: {
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 300,
  },
  // Floating action button
  floatingActionButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
  modalScrollContent: {
    paddingHorizontal: 16,
  },
  // Location input
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  // Textarea
  formTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryGridItem: {
    width: '33.333%',
    padding: 4,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryGridText: {
    fontSize: 12,
    textAlign: 'center',
  },
  // Urgency selector
  urgencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  urgencySelectorItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  urgencySelectorText: {
    fontWeight: '600',
  },
  // Applied notification
  appliedNotificationGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  // Categories scroll content
  categoriesScrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  categoryButton: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
  },
  activeCategoryButton: {
    alignItems: 'center',
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 8,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryButtonGradient: {
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statsScrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  gigStatCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  statIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapPlaceholderGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceTextDetail: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default RightNowScreen;
