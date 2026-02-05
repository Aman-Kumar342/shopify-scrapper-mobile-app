import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  warning: '#F59E0B',
};

// Mock trending data
const trendingCategories = [
  { name: 'Electronics', growth: '+24%', stores: 1245, trending: 'up' },
  { name: 'Fashion', growth: '+18%', stores: 892, trending: 'up' },
  { name: 'Home & Garden', growth: '+15%', stores: 756, trending: 'up' },
  { name: 'Beauty', growth: '+12%', stores: 634, trending: 'up' },
  { name: 'Sports', growth: '-3%', stores: 421, trending: 'down' },
];

const topProducts = [
  { name: 'Wireless Earbuds Pro', price: '$79.99', sales: '12.4K', change: '+156%' },
  { name: 'Smart Watch Series X', price: '$199.99', sales: '8.2K', change: '+89%' },
  { name: 'Organic Skincare Set', price: '$45.00', sales: '6.8K', change: '+67%' },
  { name: 'Yoga Mat Premium', price: '$35.00', sales: '5.1K', change: '+45%' },
  { name: 'LED Desk Lamp', price: '$29.99', sales: '4.7K', change: '+38%' },
];

const marketInsights = [
  {
    title: 'Q4 Holiday Season',
    description: 'Electronics and gift items are expected to surge 40% in the next 2 months.',
    icon: 'gift-outline',
    color: colors.primary,
  },
  {
    title: 'Sustainable Products',
    description: 'Eco-friendly products are seeing 3x higher engagement rates.',
    icon: 'leaf-outline',
    color: colors.success,
  },
  {
    title: 'Mobile Shopping',
    description: '68% of Shopify purchases now happen on mobile devices.',
    icon: 'phone-portrait-outline',
    color: colors.warning,
  },
];

export default function TrendsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading market trends...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Market Trends</Text>
        <Pressable 
          style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="filter-outline" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Market Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Ionicons name="trending-up" size={24} color={colors.success} />
            <Text style={styles.overviewTitle}>Market Overview</Text>
          </View>
          <Text style={styles.overviewStat}>+18.5%</Text>
          <Text style={styles.overviewLabel}>Overall E-commerce Growth This Month</Text>
          <View style={styles.overviewStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2.4M</Text>
              <Text style={styles.statLabel}>Active Stores</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>$8.2B</Text>
              <Text style={styles.statLabel}>Monthly Sales</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156K</Text>
              <Text style={styles.statLabel}>New Products</Text>
            </View>
          </View>
        </View>

        {/* Trending Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Categories</Text>
          {trendingCategories.map((category, index) => (
            <View key={index} style={styles.categoryCard}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryStores}>{category.stores} stores</Text>
              </View>
              <View style={styles.categoryGrowth}>
                <Ionicons 
                  name={category.trending === 'up' ? 'arrow-up' : 'arrow-down'} 
                  size={16} 
                  color={category.trending === 'up' ? colors.success : colors.error} 
                />
                <Text style={[
                  styles.growthText,
                  { color: category.trending === 'up' ? colors.success : colors.error }
                ]}>
                  {category.growth}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Top Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Products</Text>
          {topProducts.map((product, index) => (
            <View key={index} style={styles.productCard}>
              <View style={styles.productRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productPrice}>{product.price}</Text>
              </View>
              <View style={styles.productStats}>
                <Text style={styles.salesText}>{product.sales} sales</Text>
                <Text style={styles.changeText}>{product.change}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Market Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Insights</Text>
          {marketInsights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={[styles.insightIcon, { backgroundColor: `${insight.color}20` }]}>
                <Ionicons name={insight.icon as any} size={24} color={insight.color} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable 
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(app)/home')}
        >
          <Ionicons name="grid-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navText}>Dashboard</Text>
        </Pressable>
        <Pressable 
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(app)/history')}
        >
          <Ionicons name="search-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navText}>Research</Text>
        </Pressable>
        <Pressable 
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="trending-up" size={24} color={colors.primary} />
          <Text style={[styles.navText, styles.navTextActive]}>Trends</Text>
        </Pressable>
        <Pressable 
          style={({ pressed }) => [styles.navItem, pressed && { opacity: 0.8 }]}
          onPress={() => router.push('/(app)/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
          <Text style={styles.navText}>Settings</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
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
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    marginBottom: 24,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  overviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overviewStat: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 8,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryStores: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  categoryGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  growthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  productPrice: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  productStats: {
    alignItems: 'flex-end',
  },
  salesText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  changeText: {
    fontSize: 12,
    color: colors.success,
    marginTop: 2,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
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
  },
  navText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  navTextActive: {
    color: colors.primary,
  },
});
