import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAppContext } from '../../context/AppContext';
import TimeBasedGreeting from '@/components/TimeBasedGreeting';
import QuickActions from '@/components/QuickActions';
import { StatsRow } from '@/components/StatsRow';
import ProgressDashboard from '@/components/ProgressDashboard';
import { LightTheme, DarkTheme } from '@/constants/Theme';

interface TodoItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface JobStats {
  applied: number;
  pending: number;
  interviews: number;
}

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user, theme: appTheme } = useAppContext();
  const [jobStats, setJobStats] = useState<JobStats>({ applied: 0, pending: 0, interviews: 0 });
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isDark = appTheme === 'dark';
  const themeColors = isDark ? DarkTheme : LightTheme;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      await Promise.all([loadJobStats(), loadTodos()]);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => loadData(true);

  const loadJobStats = async () => {
    try {
      const { data: applications, error } = await supabase
        .from('job_applications')
        .select('status')
        .eq('user_id', user?.id);

      if (error) throw error;

      const stats = {
        applied: applications?.length || 0,
        pending: applications?.filter((app) => app.status === 'pending').length || 0,
        interviews: applications?.filter((app) => app.status === 'interview').length || 0,
      };
      setJobStats(stats);
    } catch (error) {
      console.error('Error loading job stats:', error);
    }
  };

  const loadTodos = async () => {
    try {
      const { data: t, error } = await supabase
        .from('user_todos')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTodos(t || []);

      if (!t || t.length === 0) await createDefaultTodos();
    } catch (error) {
      console.error('Error loading todos:', error);
      setTodos([]);
    }
  };

  const toggleTodo = async (todoId: string) => {
    try {
      const todo = todos.find((ti) => ti.id === todoId);
      if (!todo) return;
      const { error } = await supabase
        .from('user_todos')
        .update({ completed: !todo.completed })
        .eq('id', todoId)
        .eq('user_id', user?.id);
      if (error) throw error;
      setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t)));
    } catch (error) {
      console.error('Error updating todo:', error);
      setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t)));
    }
  };

  const createDefaultTodos = async () => {
    if (!user?.id) return;
    try {
      const defaultTodos = [
        {
          user_id: user.id,
          title: 'Update your resume',
          description: 'Make sure it reflects your latest experience',
          priority: 'high' as const,
        },
        {
          user_id: user.id,
          title: 'Apply to 3 jobs',
          description: 'Aim to apply to 3 jobs this week',
          priority: 'medium' as const,
        },
        {
          user_id: user.id,
          title: 'Follow up on applications',
          description: 'Check last week’s submissions',
          priority: 'medium' as const,
        },
      ];
      const { error } = await supabase.from('user_todos').insert(defaultTodos);
      if (error) throw error;
      loadTodos();
    } catch (error) {
      console.error('Error creating default todos:', error);
    }
  };

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) => (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.28 : 0.08,
        },
      ]}
    >
      <LinearGradient colors={[color + '20', color + '10']} style={styles.statIconGradient}>
        <FontAwesome name={icon as any} size={28} color={color} />
      </LinearGradient>
      <Text style={[styles.statValue, { color: themeColors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: themeColors.textSecondary }]}>{title}</Text>
    </View>
  );

  const TodoItem = ({ todo }: { todo: TodoItem }) => (
    <TouchableOpacity
      style={[
        styles.todoItem,
        { backgroundColor: themeColors.card, borderColor: themeColors.border, shadowColor: '#000', shadowOpacity: isDark ? 0.2 : 0.05 },
      ]}
      onPress={() => toggleTodo(todo.id)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.todoCheckbox,
          { borderColor: todo.completed ? '#10B981' : themeColors.border, backgroundColor: todo.completed ? '#10B981' : 'transparent' },
        ]}
      >
        {todo.completed && <FontAwesome name="check" size={14} color="#FFFFFF" />}
      </View>
      <Text
        style={[
          styles.todoText,
          { color: themeColors.text },
          todo.completed && { textDecorationLine: 'line-through', color: themeColors.textSecondary },
        ]}
      >
        {todo.title}
      </Text>
      <View style={styles.todoArrow}>
        <FontAwesome name="chevron-right" size={12} color={themeColors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.textSecondary} colors={['#3B82F6']} />}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={isDark ? ['#0B0B0B', '#000000'] : ['#FFFDE7', '#FFF9C4']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TimeBasedGreeting name={user?.name ? user.name.split(' ')[0] : undefined} style={{ color: themeColors.text }} />
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            {user?.name ? 'Here’s your job search overview' : 'Let’s get your job search moving'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <StatCard title="Applied" value={jobStats.applied} icon="briefcase" color="#3B82F6" />
        <StatCard title="Pending" value={jobStats.pending} icon="clock-o" color="#F59E0B" />
        <StatCard title="Interviews" value={jobStats.interviews} icon="calendar" color="#10B981" />
      </View>

      <View style={{ marginHorizontal: 20, marginBottom: 8 }}>
        <ProgressDashboard
          stages={[
            { label: 'Applied', count: jobStats.applied, color: '#3B82F6' },
            { label: 'Pending', count: jobStats.pending, color: '#F59E0B' },
            { label: 'Interviews', count: jobStats.interviews, color: '#10B981' },
          ]}
          totalGoal={10}
          themeColors={themeColors}
          progressAnim={progressAnim}
        />
      </View>

      <View style={{ marginHorizontal: 20 }}>
        <QuickActions
          themeColors={themeColors}
          actions={[
            { id: 'browse', label: 'Browse Jobs', icon: 'search', color: '#3B82F6', onPress: () => router.push('/(tabs)') },
            { id: 'ai', label: 'AI Assistant', icon: 'magic', color: '#8B5CF6', onPress: () => router.push('/(tabs)/ai') },
            { id: 'inbox', label: 'Messages', icon: 'envelope', color: '#06B6D4', onPress: () => router.push('/(tabs)/inbox') },
            { id: 'profile', label: 'Profile', icon: 'user', color: '#10B981', onPress: () => router.push('/(tabs)/profile') },
          ]}
        />
      </View>

      <View style={{ marginHorizontal: 20 }}>
        <StatsRow stats={[{ label: 'Applied', value: jobStats.applied }, { label: 'Pending', value: jobStats.pending }, { label: 'Interviews', value: jobStats.interviews }]} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <FontAwesome name="list-ul" size={22} color={isDark ? '#3B82F6' : '#2563EB'} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Quick Tasks</Text>
          </View>
          <View style={[styles.taskCounter, { backgroundColor: themeColors.backgroundSecondary }]}>
            <Text style={[styles.taskCounterText, { color: themeColors.textSecondary }]}>
              {todos.filter((t) => !t.completed).length}/{todos.length}
            </Text>
          </View>
        </View>

        <View style={styles.todoList}>
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </View>
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  statIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statTitle: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  taskCounter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  taskCounterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  todoList: {
    gap: 12,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  todoCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  todoArrow: {
    marginLeft: 12,
    opacity: 0.6,
  },
  bottomSpacing: {
    height: 100,
  },
});

