import { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
};

interface Product {
  id: number;
  title: string;
  handle: string;
  vendor?: string;
  product_type?: string;
  variants: {
    id: number;
    title: string;
    price: string;
    sku?: string;
    inventory_quantity?: number;
  }[];
}

interface ScrapeStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  products_count: number;
  store_url: string;
  store_name?: string;
  error_message?: string;
}

// Memoized ProductRow component with primitives
const ProductRow = memo(function ProductRow({
  title,
  vendor,
  variantCount,
  price,
}: {
  title: string;
  vendor?: string;
  variantCount: number;
  price?: string;
}) {
  const formattedTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
  
  return (
    <View style={styles.tableRow}>
      <View style={styles.productInfo}>
        <Text style={styles.productTitle}>{formattedTitle}</Text>
        <Text style={styles.productVendor}>{vendor || 'No vendor'}</Text>
      </View>
      <View style={styles.productMeta}>
        <Text style={styles.productPrice}>{price || '-'}</Text>
        <Text style={styles.productVariants}>{variantCount} variant{variantCount !== 1 ? 's' : ''}</Text>
      </View>
    </View>
  );
});

// Memoized StatCard component
const StatCard = memo(function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={16} color={colors.textMuted} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
});

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { jobId, storeUrl, storeName } = params;

  const [loading, setLoading] = useState(true);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState(0);

  // Poll for job status
  useEffect(() => {
    if (!jobId) {
      setError('No job ID provided');
      setLoading(false);
      return;
    }

    let isActive = true;
    const pollInterval = 3000; // Poll every 3 seconds

    const pollStatus = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/(auth)/login');
          return;
        }

        const response = await fetch(`${API_BASE_URL}/scrape/status/${jobId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data = await response.json();

        if (!isActive) return;

        setScrapeStatus(data);

        if (data.status === 'completed') {
          // Fetch preview data
          await fetchPreviewData(session.access_token);
          setLoading(false);
        } else if (data.status === 'failed') {
          setError(data.error_message || 'Scraping failed');
          setLoading(false);
        }
        // If pending or running, continue polling
      } catch (err) {
        console.error('Poll error:', err);
        // Don't set error here, just keep polling
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval for polling
    const interval = setInterval(() => {
      if (scrapeStatus?.status === 'completed' || scrapeStatus?.status === 'failed') {
        clearInterval(interval);
      } else {
        pollStatus();
      }
    }, pollInterval);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [jobId]);

  const fetchPreviewData = async (accessToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/scrape/preview/${jobId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error('Fetch preview error:', err);
    }
  };

  const checkCredits = async () => {
    try {
      const session = await getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/payment/credits`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const handleUnlock = useCallback(async () => {
    if (!jobId) return;

    await checkCredits();

    if (userCredits < 5 && scrapeStatus?.status !== 'completed') {
      Alert.alert(
        'Insufficient Credits',
        'You need 5 credits to download. Would you like to purchase more?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Buy Credits', 
            onPress: () => router.push('/(app)/billing')
          },
        ]
      );
    } else {
      router.push({
        pathname: '/(app)/download',
        params: {
          jobId: jobId as string,
          storeUrl: storeUrl as string,
          storeName: storeName as string,
          productCount: scrapeStatus?.products_count?.toString() || products.length.toString(),
        },
      });
    }
  }, [jobId, userCredits, scrapeStatus, storeUrl, storeName, products.length, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Render item with primitives passed to memoized component
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <ProductRow
      title={item.title}
      vendor={item.vendor}
      variantCount={item.variants?.length || 0}
      price={item.variants?.[0]?.price}
    />
  ), []);

  const keyExtractor = useCallback((item: Product) => item.id.toString(), []);

  // Derive values
  const productCount = scrapeStatus?.products_count || products.length;
  const variantCount = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {scrapeStatus?.status === 'running' ? 'Scraping store data...' : 'Loading results...'}
        </Text>
        {scrapeStatus?.status === 'running' && (
          <Text style={styles.loadingSubtext}>
            This may take a few moments. Found {productCount} products so far.
          </Text>
        )}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={handleBack} 
            style={({ pressed }) => [
              styles.backButton,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Scrape Results</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Scraping Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable 
            onPress={handleBack}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? { opacity: 0.8 } : null
            ]}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={handleBack} 
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { opacity: 0.7 } : null
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Scrape Results</Text>
        <View style={styles.creditsBadge}>
          <Text style={styles.creditsText}>{userCredits} CREDITS</Text>
        </View>
      </View>

      {/* Products List */}
      <FlashList
        data={products}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        estimatedItemSize={65}
        ListHeaderComponent={(
          <View>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <StatCard 
                icon="cube-outline" 
                label="Products" 
                value={productCount.toLocaleString()} 
              />
              <StatCard 
                icon="layers-outline" 
                label="Variants" 
                value={variantCount.toLocaleString()} 
              />
            </View>

            {/* Data Preview Section */}
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Data Preview</Text>
              <Text style={styles.previewSubtitle}>
                Showing {Math.min(products.length, 50)} of {productCount} products
              </Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Product Title</Text>
              <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>Price</Text>
            </View>
          </View>
        )}
        ListFooterComponent={(
          <View style={styles.unlockCard}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="lock-closed" size={24} color={colors.primary} />
            </View>
            <Text style={styles.unlockTitle}>Unlock Full Data</Text>
            <Text style={styles.unlockSubtitle}>
              Access all {productCount} rows including SKUs, Inventory, and Vendor data.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <Pressable
          onPress={handleUnlock}
          style={({ pressed }) => [
            styles.unlockButton,
            pressed ? { opacity: 0.8 } : null
          ]}
        >
          <Ionicons name="download" size={20} color={colors.background} />
          <Text style={styles.unlockButtonText}>Download CSV</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  loadingSubtext: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
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
  headerSpacer: {
    width: 40,
  },
  creditsBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  creditsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 8,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  previewHeader: {
    marginBottom: 16,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  previewSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  productVendor: {
    color: colors.textMuted,
    fontSize: 11,
  },
  productMeta: {
    width: 80,
    alignItems: 'flex-end',
  },
  productPrice: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  productVariants: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  unlockCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  lockIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  unlockTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  unlockSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    backgroundColor: colors.background,
  },
  unlockButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  unlockButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
