import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Animated,
  RefreshControl,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAppContext, AppliedJob } from '@/context/AppContext';
import { LightTheme, DarkTheme } from '@/constants/Theme';
import { useAuthCheck } from '@/utils/authCheck';
import { SmartLogo } from '@/components/SmartLogo';
import { CoverLetterStatusIndicator } from '@/components/CoverLetterStatusIndicator';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

const InboxScreen = () => {
  useAuthCheck();
  
  const { theme, applications, user } = useAppContext();
  const themeColors = theme === 'light' ? LightTheme : DarkTheme;
  const insets = useSafeAreaInsets();
  
  const [activeInboxTab, setActiveInboxTab] = useState<'applications' | 'messages'>('applications');
  const [localApplications, setLocalApplications] = useState<AppliedJob[]>([]);
  const [coverLetterStatusMap, setCoverLetterStatusMap] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Animation values using useRef to avoid re-creation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;
  
  // Initialize applications from context and animations
  useEffect(() => {
    setLocalApplications(applications);
    
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [applications]);
  
  // Tab change animation
  useEffect(() => {
    Animated.spring(tabIndicatorAnim, {
      toValue: activeInboxTab === 'applications' ? 0 : screenWidth / 2,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [activeInboxTab]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };
  
  const openJobDetails = (job: any) => {
    // Navigate to job details with animation
    router.push({
      pathname: '/(modals)/job-details',
      params: { jobId: job.id }
    });
  };
  
  const openCoverLetterModal = (job: any) => {
    // Open cover letter modal
    router.push({
      pathname: '/(modals)/cover-letter',
      params: { jobId: job.id }
    });
  };
  
  const filteredApplications = localApplications.filter(app => 
    app.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getApplicationStatus = (application: AppliedJob) => {
    const daysSinceApplied = Math.floor(
      (new Date().getTime() - new Date(application.appliedAt).getTime()) / (1000 * 3600 * 24)
    );
    
    if (daysSinceApplied <= 1) return { status: 'Recent', color: themeColors.success };
    if (daysSinceApplied <= 7) return { status: 'This Week', color: themeColors.info };
    if (daysSinceApplied <= 30) return { status: 'This Month', color: themeColors.warning };
    return { status: 'Older', color: themeColors.textSecondary };
  };
  
  const renderApplicationItem = ({ item, index }: { item: AppliedJob; index: number }) => {
    const statusInfo = getApplicationStatus(item);
    
    return (
      <Animated.View
        style={[
          styles.modernApplicationContainer,
          {
            opacity: fadeAnim,
            transform: [{
              translateY: slideAnim
            }]
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.modernApplicationCard, { backgroundColor: themeColors.card }]}
          onPress={() => openJobDetails(item.job)}
          activeOpacity={0.95}
        >
          <View style={styles.modernCardContent}>
            {/* Header Section */}
            <View style={styles.modernApplicationHeader}>
              <View style={styles.logoAndDetails}>
                <View style={[styles.modernLogoContainer, { backgroundColor: themeColors.background }]}>
                  <SmartLogo
                    companyName={item.job.company}
                    size={48}
                    style={styles.modernApplicationLogo}
                  />
                </View>
                <View style={styles.modernApplicationDetails}>
                  <Text style={[styles.modernJobTitle, { color: themeColors.text }]} numberOfLines={2}>
                    {item.job.title}
                  </Text>
                  <View style={styles.companyRow}>
                    <MaterialIcons name="business" size={16} color={themeColors.textSecondary} />
                    <Text style={[styles.modernCompanyName, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {item.job.company}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.modernStatusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                <Text style={[styles.modernStatusText, { color: statusInfo.color }]}>
                  {statusInfo.status}
                </Text>
              </View>
            </View>
            
            {/* Meta Information */}
            <View style={styles.modernMetaSection}>
              <View style={styles.metaItem}>
                <MaterialIcons name="schedule" size={14} color={themeColors.textSecondary} />
                <Text style={[styles.metaText, { color: themeColors.textSecondary }]}>
                  Applied {new Date(item.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              {item.job.location && (
                <View style={styles.metaItem}>
                  <MaterialIcons name="location-on" size={14} color={themeColors.textSecondary} />
                  <Text style={[styles.metaText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {item.job.location}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Action Buttons */}
            <View style={styles.modernActionSection}>
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: themeColors.tint + '10' }]}
                onPress={() => openCoverLetterModal(item.job)}
              >
                <MaterialIcons name="description" size={18} color={themeColors.tint} />
                <Text style={[styles.modernActionText, { color: themeColors.tint }]}>Cover Letter</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: themeColors.success + '10' }]}
                onPress={() => openJobDetails(item.job)}
              >
                <MaterialIcons name="visibility" size={18} color={themeColors.success} />
                <Text style={[styles.modernActionText, { color: themeColors.success }]}>View Details</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modernActionButton, { backgroundColor: themeColors.info + '10' }]}
                onPress={() => {}}
              >
                <MaterialIcons name="more-horiz" size={18} color={themeColors.info} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Modern Header */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            backgroundColor: themeColors.background,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <View style={[styles.headerIconContainer, { backgroundColor: themeColors.tint + '10' }]}>
                <MaterialIcons name="inbox" size={24} color={themeColors.tint} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>Inbox</Text>
                <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Track your applications</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.modernActionButton, { backgroundColor: themeColors.card }]}
                onPress={() => router.push('/(modals)/search')}
              >
                <Ionicons name="search" size={18} color={themeColors.tint} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modernActionButton, { backgroundColor: themeColors.card }]}
                onPress={() => router.push('/(modals)/filters')}
              >
                <Ionicons name="options" size={18} color={themeColors.tint} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Modern Stats Cards */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContainer}
            style={styles.statsContainer}
          >
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: themeColors.tint + '15' }]}>
                <MaterialIcons name="work" size={20} color={themeColors.tint} />
              </View>
              <Text style={[styles.modernStatNumber, { color: themeColors.text }]}>{localApplications.length}</Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textSecondary }]}>Total Applications</Text>
            </View>
            
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: themeColors.success + '15' }]}>
                <MaterialIcons name="trending-up" size={20} color={themeColors.success} />
              </View>
              <Text style={[styles.modernStatNumber, { color: themeColors.success }]}>
                {localApplications.filter(app => getApplicationStatus(app).status === 'Recent').length}
              </Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textSecondary }]}>Recent</Text>
            </View>
            
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: themeColors.info + '15' }]}>
                <MaterialIcons name="schedule" size={20} color={themeColors.info} />
              </View>
              <Text style={[styles.modernStatNumber, { color: themeColors.info }]}>
                {localApplications.filter(app => getApplicationStatus(app).status === 'This Week').length}
              </Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textSecondary }]}>This Week</Text>
            </View>
            
            <View style={[styles.modernStatCard, { backgroundColor: themeColors.card }]}>
              <View style={[styles.statIconContainer, { backgroundColor: themeColors.warning + '15' }]}>
                <MaterialIcons name="hourglass-empty" size={20} color={themeColors.warning} />
              </View>
              <Text style={[styles.modernStatNumber, { color: themeColors.warning }]}>3</Text>
              <Text style={[styles.modernStatLabel, { color: themeColors.textSecondary }]}>Pending</Text>
            </View>
          </ScrollView>
        </View>
      </Animated.View>
      
      {/* Modern Tab Selector */}
      <View style={[styles.modernTabSelector, { backgroundColor: themeColors.background }]}>
        <View style={[styles.tabContainer, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={[
              styles.modernTabButton,
              activeInboxTab === 'applications' && {
                backgroundColor: themeColors.tint,
                shadowColor: themeColors.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            ]}
            onPress={() => setActiveInboxTab('applications')}
          >
            <MaterialIcons 
              name="work" 
              size={20} 
              color={activeInboxTab === 'applications' ? '#FFFFFF' : themeColors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeInboxTab === 'applications' ? '#FFFFFF' : themeColors.textSecondary },
                activeInboxTab === 'applications' && { fontWeight: '600' }
              ]}
            >
              Applications
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.modernTabButton,
              activeInboxTab === 'messages' && {
                backgroundColor: themeColors.tint,
                shadowColor: themeColors.tint,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }
            ]}
            onPress={() => setActiveInboxTab('messages')}
          >
            <MaterialIcons 
              name="chat" 
              size={20} 
              color={activeInboxTab === 'messages' ? '#FFFFFF' : themeColors.textSecondary} 
            />
            <Text
              style={[
                styles.modernTabText,
                { color: activeInboxTab === 'messages' ? '#FFFFFF' : themeColors.textSecondary },
                activeInboxTab === 'messages' && { fontWeight: '600' }
              ]}
            >
              Messages
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Enhanced Content */}
      {activeInboxTab === 'applications' && (
        filteredApplications.length > 0 ? (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={filteredApplications}
              keyExtractor={(item) => item.job.id}
              renderItem={renderApplicationItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={themeColors.tint}
                  colors={[themeColors.tint]}
                />
              }
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListHeaderComponent={() => (
                <View style={styles.listHeader}>
                  <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                    Your Applications ({filteredApplications.length})
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: themeColors.textSecondary }]}>
                    Track your job application progress
                  </Text>
                </View>
              )}
              onEndReachedThreshold={0.1}
              removeClippedSubviews={Platform.OS === 'android'}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={[themeColors.background, themeColors.card + '30']}
              style={styles.emptyStateGradient}
            >
              <View style={[styles.emptyStateIcon, { backgroundColor: themeColors.tint + '15' }]}>
                <Ionicons name="briefcase-outline" size={48} color={themeColors.tint} />
              </View>
              <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>No Applications Yet</Text>
              <Text style={[styles.emptyStateSubtitle, { color: themeColors.textSecondary }]}>
                Start browsing and swipe right on jobs you're interested in to add them to your inbox.
              </Text>
              <TouchableOpacity 
                style={[styles.emptyStateButton, { backgroundColor: themeColors.tint }]}
                onPress={() => router.push('/(tabs)/browse')}
              >
                <Ionicons name="search" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.emptyStateButtonText}>Browse Jobs</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )
      )}
      
      {activeInboxTab === 'messages' && (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={[themeColors.background, themeColors.card + '30']}
            style={styles.emptyStateGradient}
          >
            <View style={[styles.emptyStateIcon, { backgroundColor: themeColors.info + '15' }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={themeColors.info} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: themeColors.text }]}>No Messages Yet</Text>
            <Text style={[styles.emptyStateSubtitle, { color: themeColors.textSecondary }]}>
              Messages from employers will appear here when they respond to your applications.
            </Text>
            <TouchableOpacity 
              style={[styles.emptyStateButton, { backgroundColor: themeColors.info }]}
              onPress={() => router.push('/(modals)/ai-chat')}
            >
              <Ionicons name="chatbubble" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.emptyStateButtonText}>Chat with AI</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerContent: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modernActionButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    marginTop: 8,
  },
  statsScrollContainer: {
    paddingRight: 20,
    gap: 16,
  },
  modernStatCard: {
    width: 140,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modernStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  modernStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  modernTabSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  modernTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 20,
  },
  listHeader: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  modernApplicationContainer: {
    paddingHorizontal: 20,
  },
  modernApplicationCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  modernCardContent: {
    padding: 20,
  },
  modernApplicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logoAndDetails: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  modernLogoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    padding: 4,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernApplicationLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  modernApplicationDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  modernJobTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 6,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modernCompanyName: {
    fontSize: 15,
    fontWeight: '500',
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modernStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modernMetaSection: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modernActionSection: {
    flexDirection: 'row',
    gap: 8,
  },
  modernActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 6,
  },
  modernActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 24,
    width: '100%',
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InboxScreen;