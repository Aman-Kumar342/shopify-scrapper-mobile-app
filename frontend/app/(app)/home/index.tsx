import { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  RefreshControl,
  StyleSheet,
  StatusBar,
  Alert
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { API_BASE_URL } from '../../../lib/constants';
import { getSession, getCurrentUser } from '../../../lib/auth';

// Colors
const colors = {
  primary: '#38BDF8',
  background: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  inputBorder: '#334155',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  purple: '#A855F7',
  orange: '#F97316',
  pink: '#EC4899',
};

interface ScrapeJob {
  id: string;
  store_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  products_count: number;
  created_at: string;
}

const mockRecentScrapes: ScrapeJob[] = [
  {
    id: '1',
    store_url: 'nomadgoods.com',
    status: 'completed',
    products_count: 1240,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    store_url: 'huel.com',
    status: 'completed',
    products_count: 850,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    store_url: 'gymshark.com',
    status: 'running',
    products_count: 0,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
];

const avatarColors = [colors.purple, colors.orange, colors.success, colors.primary, colors.pink];

// Helper functions hoisted outside component
const getInitials = (url: string) => url.charAt(0).toUpperCase();

const getAvatarColor = (url: string) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getStoreName = (url: string) => {
  return url.replace('.com', '').replace('.myshopify.com', '').replace('https://', '').replace('http://', '');
};

// Memoized ScrapeItem component - pass primitives for effective memoization
const ScrapeItem = memo(function ScrapeItem({
  id,
  storeUrl,
  status,
  createdAt,
  onPress,
}: {
  id: string;
  storeUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  onPress: () => void;
}) {
  const avatarColor = getAvatarColor(storeUrl);
  const initial = getInitials(storeUrl);
  const storeName = getStoreName(storeUrl);
  const timeAgo = formatTimeAgo(createdAt);

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.scrapeItem,
        pressed ? { opacity: 0.7 } : null
      ]}
      onPress={onPress}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <View style={styles.scrapeInfo}>
        <Text style={styles.storeName}>{storeName}</Text>
        <Text style={styles.storeUrl}>{storeUrl} • {timeAgo}</Text>
      </View>
      <View style={styles.statusContainer}>
        {status === 'completed' ? (
          <View style={[styles.statusBadge, styles.successBadge]}>
            <Text style={[styles.statusText, { color: colors.success }]}>SUCCESS</Text>
          </View>
        ) : status === 'running' ? (
          <View style={[styles.statusBadge, styles.syncingBadge]}>
            <Text style={[styles.statusText, { color: colors.primary }]}>SYNCING</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, styles.failedBadge]}>
            <Text style={[styles.statusText, { color: colors.error }]}>FAILED</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Pressable>
  );
});

// Memoized NavItem component
const NavItem = memo(function NavItem({
  icon,
  label,
  isActive,
  onPress,
}: {
  icon: string;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable 
      style={styles.navItem}
      onPress={onPress}
    >
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={isActive ? colors.primary : colors.textMuted} 
      />
      <Text style={[styles.navText, isActive ? styles.navTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
});

export default function HomeScreen() {
  // Destructure router functions early for React Compiler compatibility
  const { push } = useRouter();
  
  const [storeUrl, setStoreUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recentScrapes, setRecentScrapes] = useState<ScrapeJob[]>(mockRecentScrapes);
  const [userName, setUserName] = useState('Researcher');
  const [userCredits, setUserCredits] = useState(5);

  useEffect(() => {
    loadUserData();
    loadRecentScrapes();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (user?.email) {
        const name = user.email.split('@')[0];
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadRecentScrapes = async () => {
    try {
      const session = await getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/scrape/history?limit=5`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobs && data.jobs.length > 0) {
          setRecentScrapes(data.jobs);
        }
      }
    } catch (error) {
      console.error('Failed to load scrapes:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecentScrapes();
    setRefreshing(false);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setStoreUrl(text);
      }
    } catch (error) {
      console.error('Paste error:', error);
    }
  }, []);

  const handleFetchStore = useCallback(async () => {
    if (!storeUrl.trim()) return;

    setLoading(true);
    try {
      const session = await getSession();
      if (!session) {
        push('/(auth)/login');
        return;
      }

      push({
        pathname: '/(app)/validation',
        params: { 
          url: storeUrl,
          storeName: storeUrl.replace('https://', '').replace('http://', '').split('.')[0],
        },
      });
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'Failed to validate store');
    } finally {
      setLoading(false);
    }
  }, [storeUrl, push]);

  // Stable callback for scrape item press
  const handleScrapeItemPress = useCallback(() => {
    push('/(app)/results');
  }, [push]);

  // Navigation handlers with stable references
  const navigateToHistory = useCallback(() => push('/(app)/history'), [push]);
  const navigateToTrends = useCallback(() => push('/(app)/trends'), [push]);
  const navigateToSettings = useCallback(() => push('/(app)/settings'), [push]);

  // Render item with primitives passed to memoized component
  const renderScrapeItem = useCallback(({ item }: { item: ScrapeJob }) => (
    <ScrapeItem
      id={item.id}
      storeUrl={item.store_url}
      status={item.status}
      createdAt={item.created_at}
      onPress={handleScrapeItemPress}
    />
  ), [handleScrapeItemPress]);

  const keyExtractor = useCallback((item: ScrapeJob) => item.id, []);

  // Derive button disabled state
  const isButtonDisabled = loading || !storeUrl.trim();

  const ListHeader = (
    <View style={styles.listHeaderContainer}>
      {/* Credits Badge */}
      <View style={styles.creditsBadge}>
        <Ionicons name="flash" size={14} color={colors.primary} />
        <Text style={styles.creditsText}>{userCredits} Credits Remaining</Text>
      </View>

      {/* Title */}
      <Text style={styles.pageTitle}>Analyze Store</Text>
      <Text style={styles.pageSubtitle}>
        Enter any Shopify URL to extract competitive intelligence.
      </Text>

      {/* URL Input */}
      <View style={styles.inputSection}>
        <View style={styles.inputLabelRow}>
          <Text style={styles.inputLabel}>Shopify Store URL</Text>
          <Pressable 
            onPress={handlePaste} 
            style={({ pressed }) => [
              styles.pasteBtn,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Ionicons name="clipboard-outline" size={14} color={colors.primary} />
            <Text style={styles.pasteText}>Paste</Text>
          </Pressable>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            value={storeUrl}
            onChangeText={setStoreUrl}
            placeholder="https://examplestore.myshopify.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="url"
            style={styles.textInput}
          />
        </View>
      </View>

      {/* Fetch Button */}
      <Pressable
        onPress={handleFetchStore}
        disabled={isButtonDisabled}
        style={({ pressed }) => [
          styles.fetchButton,
          isButtonDisabled ? styles.fetchButtonDisabled : null,
          pressed && !isButtonDisabled ? { opacity: 0.8 } : null
        ]}
      >
        <View style={styles.fetchButtonContent}>
          <Ionicons name="analytics" size={20} color={colors.background} />
          <Text style={styles.fetchButtonText}>
            {loading ? 'Validating...' : 'Fetch Store Data'}
          </Text>
        </View>
      </Pressable>

      {/* Recent Scrapes Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Scrapes</Text>
        <Pressable 
          onPress={navigateToHistory}
          style={({ pressed }) => pressed ? { opacity: 0.7 } : null}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </Pressable>
      </View>
    </View>
  );

  const ListFooter = (
    <View style={styles.listFooterContainer}>
      {/* Market Trends Card */}
      <View style={styles.marketCard}>
        <Text style={styles.marketTitle}>Market Trends</Text>
        <Text style={styles.marketSubtitle}>
          Discover what's trending across Shopify stores today.
        </Text>
        <Pressable 
          style={({ pressed }) => [
            styles.exploreBtn,
            pressed ? { opacity: 0.7 } : null
          ]}
          onPress={navigateToTrends}
        >
          <Text style={styles.exploreBtnText}>EXPLORE NICHES</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={20} color={colors.background} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.userName}>{userName}</Text>
          </View>
        </View>
        <Pressable 
          style={({ pressed }) => [
            styles.notificationBtn,
            pressed ? { opacity: 0.7 } : null
          ]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <FlashList
        data={recentScrapes}
        keyExtractor={keyExtractor}
        renderItem={renderScrapeItem}
        estimatedItemSize={80}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <NavItem icon="home" label="Home" isActive />
        <NavItem icon="time-outline" label="History" onPress={navigateToHistory} />
        <NavItem icon="trending-up-outline" label="Trends" onPress={navigateToTrends} />
        <NavItem icon="settings-outline" label="Settings" onPress={navigateToSettings} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    gap: 2,
  },
  welcomeText: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderContainer: {
    paddingHorizontal: 24,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderCurve: 'continuous',
    marginTop: 8,
    marginBottom: 16,
    gap: 6,
  },
  creditsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  inputSection: {
    marginBottom: 20,
    gap: 10,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pasteText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textInput: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  fetchButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  fetchButtonDisabled: {
    opacity: 0.6,
  },
  fetchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fetchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  scrapeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    marginHorizontal: 24,
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrapeInfo: {
    flex: 1,
    gap: 2,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  storeUrl: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  successBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  syncingBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  failedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listFooterContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  marketCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    marginTop: 12,
    gap: 6,
  },
  marketTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  marketSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },
  exploreBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  exploreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 100,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingBottom: 28,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  navTextActive: {
    color: colors.primary,
  },
});
