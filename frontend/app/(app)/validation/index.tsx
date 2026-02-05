import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
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

interface ValidationData {
  isValid: boolean;
  url: string;
  storeName: string;
  productCount?: number;
}

export default function ValidationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { url } = params;

  const [validating, setValidating] = useState(true);
  const [validationData, setValidationData] = useState<ValidationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingScrape, setStartingScrape] = useState(false);

  console.log('[Validation] URL param:', url);
  console.log('[Validation] API_BASE_URL:', API_BASE_URL);

  // Validate store on mount
  useEffect(() => {
    validateStore();
  }, []);

  const validateStore = async () => {
    if (!url) {
      setError('No store URL provided');
      setValidating(false);
      return;
    }

    try {
      const session = await getSession();
      console.log('[Validation] Session:', session ? 'Found' : 'Not found');
      
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      console.log('[Validation] Calling API:', `${API_BASE_URL}/scrape/validate-store`);
      
      const response = await fetch(`${API_BASE_URL}/scrape/validate-store`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      console.log('[Validation] Response:', data);

      if (!response.ok) {
        setError(data.message || 'Failed to validate store');
        setValidating(false);
        return;
      }

      if (!data.isValid) {
        setError(data.message || 'Invalid Shopify store');
        setValidating(false);
        return;
      }

      setValidationData(data);
      setValidating(false);
    } catch (err) {
      console.error('[Validation] Error:', err);
      setError('Network error. Please check your connection and try again.');
      setValidating(false);
    }
  };

  const handlePreviewData = useCallback(async () => {
    console.log('[Start Scrape] Button pressed');
    console.log('[Start Scrape] validationData:', validationData);
    
    if (!validationData) {
      console.log('[Start Scrape] No validation data');
      Alert.alert('Error', 'Validation data not found');
      return;
    }

    setStartingScrape(true);
    try {
      const session = await getSession();
      console.log('[Start Scrape] Session:', session ? 'Found' : 'Not found');
      
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      console.log('[Start Scrape] Calling API:', `${API_BASE_URL}/scrape/start`);
      
      // Start the scrape job
      const response = await fetch(`${API_BASE_URL}/scrape/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ url: validationData.url }),
      });

      const data = await response.json();
      console.log('[Start Scrape] Response:', data);

      if (!response.ok) {
        if (data.error === 'Insufficient credits') {
          Alert.alert(
            'Insufficient Credits',
            'You need 5 credits to scrape a store. Would you like to purchase more?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setStartingScrape(false) },
              { 
                text: 'Buy Credits', 
                onPress: () => {
                  setStartingScrape(false);
                  router.push('/(app)/billing');
                }
              },
            ]
          );
        } else {
          Alert.alert('Error', data.error || 'Failed to start scrape');
          setStartingScrape(false);
        }
        return;
      }

      console.log('[Start Scrape] Navigating to results with jobId:', data.jobId);
      
      // Navigate to results screen with job ID
      router.push({
        pathname: '/(app)/results',
        params: {
          jobId: data.jobId,
          storeUrl: validationData.url,
          storeName: validationData.storeName,
        },
      });
    } catch (err) {
      console.error('[Start Scrape] Error:', err);
      Alert.alert('Error', 'Failed to start scraping. Please check your connection and try again.');
      setStartingScrape(false);
    }
  }, [validationData, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (validating) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Validating store...</Text>
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
          <Text style={styles.headerTitle}>Store Validation</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="close-circle" size={64} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Validation Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable 
            onPress={handleBack}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? { opacity: 0.8 } : null
            ]}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
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
        <Text style={styles.headerTitle}>Store Validation</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Validation Badge */}
      <View style={styles.badgeContainer}>
        <View style={styles.successBadge}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.successBadgeText}>VALIDATION COMPLETE</Text>
        </View>
      </View>

      {/* Store Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.storeLogo}>
          <View style={styles.storeLogoInner}>
            <Ionicons name="storefront" size={48} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Store Info */}
      <View style={styles.storeInfoContainer}>
        <Text style={styles.storeName}>
          {validationData?.storeName}
        </Text>
        <View style={styles.urlContainer}>
          <Ionicons name="link" size={14} color={colors.textMuted} />
          <Text style={styles.storeUrl}>
            {validationData?.url}
          </Text>
        </View>
        <View style={styles.connectedBadge}>
          <Ionicons name="checkmark" size={12} color={colors.success} />
          <Text style={styles.connectedText}>Connected via Shopify API</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View>
            <Text style={styles.statLabel}>Store Status</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>Online</Text>
              <Text style={styles.statUnit}>Accessible</Text>
            </View>
          </View>
          <View style={styles.statIconContainer}>
            <Ionicons name="cloud-done-outline" size={24} color={colors.success} />
          </View>
        </View>
        
        <View style={styles.statCard}>
          <View>
            <Text style={styles.statLabel}>Data Access</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statValue}>Full</Text>
              <Text style={styles.statUnit}>Products.json</Text>
            </View>
          </View>
          <View style={styles.statIconContainer}>
            <Ionicons name="cube-outline" size={24} color={colors.primary} />
          </View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            startingScrape && styles.primaryButtonDisabled,
            pressed && !startingScrape ? { opacity: 0.8 } : null
          ]}
          onPress={handlePreviewData}
          disabled={startingScrape}
        >
          {startingScrape ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Start Scraping</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background} />
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.linkButton,
            pressed ? { opacity: 0.7 } : null
          ]}
          onPress={handleBack}
        >
          <Text style={styles.linkText}>Not the right store? </Text>
          <Text style={styles.linkTextBold}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  badgeContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderCurve: 'continuous',
    gap: 8,
  },
  successBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeLogo: {
    width: 120,
    height: 120,
    borderRadius: 32,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  storeLogoInner: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  storeName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  urlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  storeUrl: {
    fontSize: 14,
    color: colors.textMuted,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderCurve: 'continuous',
    gap: 6,
  },
  connectedText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '500',
  },
  statsContainer: {
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statUnit: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkTextBold: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorIcon: {
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 12,
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
