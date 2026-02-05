import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  TextInput, 
  RefreshControl,
  StyleSheet,
  StatusBar
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../lib/constants';
import { getSession } from '../../../lib/auth';

const colors = {
  primary: '#38BDF8',
  background: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#22C55E',
  error: '#EF4444',
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

const mockHistory: ScrapeJob[] = [
  {
    id: '1',
    store_url: 'brand-name.myshopify.com',
    status: 'completed',
    products_count: 1240,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    store_url: 'vintage-finds.com',
    status: 'completed',
    products_count: 850,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    store_url: 'tech-gadgets-pro.myshopify.com',
    status: 'running',
    products_count: 0,
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    store_url: 'urban-minimalist.store',
    status: 'completed',
    products_count: 412,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    store_url: 'glow-beauty.myshopify.com',
    status: 'completed',
    products_count: 2900,
    created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const avatarColors = [colors.purple, colors.orange, colors.success, colors.primary, colors.pink];

// Helper functions hoisted outside component
const getInitials = (url: string) => {
  const clean = url.replace('.myshopify.com', '').replace('.com', '');
  return clean.charAt(0).toUpperCase();
};

const getAvatarColor = (url: string) => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = url.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getStoreName = (url: string) => {
  return url.replace('.myshopify.com', '').replace('.com', '').replace('https://', '').replace('http://', '');
};

// Memoized HistoryItem component with primitives
const HistoryItem = memo(function HistoryItem({
  id,
  storeUrl,
  status,
  productsCount,
  createdAt,
  onExport,
}: {
  id: string;
  storeUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  productsCount: number;
  createdAt: string;
  onExport: () => void;
}) {
  const avatarColor = getAvatarColor(storeUrl);
  const initial = getInitials(storeUrl);
  const storeName = getStoreName(storeUrl);
  const dateFormatted = formatDate(createdAt);

  return (
    <View style={styles.historyItem}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      {/* Info */}
      <View style={styles.itemInfo}>
        <Text style={styles.storeName}>{storeName}</Text>
        <View style={styles.statusRow}>
          {status === 'completed' ? (
            <>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>COMPLETED</Text>
            </>
          ) : status === 'running' ? (
            <>
              <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.primary }]}>PROCESSING...</Text>
            </>
          ) : (
            <>
              <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.statusText, { color: colors.error }]}>FAILED</Text>
            </>
          )}
        </View>
        <Text style={styles.itemMeta}>
          {dateFormatted} • {productsCount.toLocaleString()} Products
        </Text>
      </View>

      {/* Export Button */}
      {status === 'completed' ? (
        <Pressable
          onPress={onExport}
          style={({ pressed }) => [
            styles.exportButton,
            pressed ? { opacity: 0.7 } : null
          ]}
        >
          <Ionicons name="download-outline" size={16} color={colors.primary} />
          <Text style={styles.exportText}>Export</Text>
        </Pressable>
      ) : status === 'running' ? (
        <View style={styles.statusIcon}>
          <Ionicons name="hourglass-outline" size={20} color={colors.textMuted} />
        </View>
      ) : (
        <View style={[styles.statusIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
        </View>
      )}
    </View>
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

export default function HistoryScreen() {
  // Destructure router functions early for React Compiler compatibility
  const { push, back } = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<ScrapeJob[]>(mockHistory);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const session = await getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/scrape/history?limit=50`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.jobs && data.jobs.length > 0) {
          setHistory(data.jobs);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, []);

  // Memoize filtered history to avoid recalculation
  const filteredHistory = useMemo(() => 
    history.filter(job =>
      job.store_url.toLowerCase().includes(searchQuery.toLowerCase())
    ), [history, searchQuery]);

  // Stable export handler factory with useCallback
  const createExportHandler = useCallback((jobId: string, productCount: number) => () => {
    push({
      pathname: '/(app)/download',
      params: {
        jobId,
        productCount,
      },
    });
  }, [push]);

  // Navigation handlers with stable references
  const handleBack = useCallback(() => back(), [back]);
  const navigateToHome = useCallback(() => push('/(app)/home'), [push]);
  const navigateToTrends = useCallback(() => push('/(app)/trends'), [push]);
  const navigateToSettings = useCallback(() => push('/(app)/settings'), [push]);

  // Render item with primitives passed to memoized component
  const renderItem = useCallback(({ item }: { item: ScrapeJob }) => (
    <HistoryItem
      id={item.id}
      storeUrl={item.store_url}
      status={item.status}
      productsCount={item.products_count}
      createdAt={item.created_at}
      onExport={createExportHandler(item.id, item.products_count)}
    />
  ), [createExportHandler]);

  const keyExtractor = useCallback((item: ScrapeJob) => item.id, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable 
            onPress={handleBack} 
            style={({ pressed }) => [
              styles.backButton,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Scrape History</Text>
          <Pressable 
            style={({ pressed }) => [
              styles.settingsButton,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Ionicons name="options-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search store URL..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Recent Tasks Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Recent Tasks</Text>
        <Text style={styles.totalCount}>{history.length} Total</Text>
      </View>

      {/* History List */}
      <FlashList
        data={filteredHistory}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={100}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <NavItem icon="grid-outline" label="Overview" onPress={navigateToHome} />
        <NavItem icon="time" label="History" isActive />
        <NavItem icon="trending-up-outline" label="Market" onPress={navigateToTrends} />
        <NavItem icon="person-outline" label="Profile" onPress={navigateToSettings} />
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
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalCount: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 6,
  },
  exportText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navTextActive: {
    color: colors.primary,
  },
});
