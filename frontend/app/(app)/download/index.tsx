import { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  Switch, 
  ActivityIndicator, 
  Alert,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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

export default function DownloadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { jobId, storeUrl, storeName, productCount } = params;

  const [downloading, setDownloading] = useState(false);
  const [cleanData, setCleanData] = useState(true);
  const [detectDuplicates, setDetectDuplicates] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [downloadedFileName, setDownloadedFileName] = useState('');

  const handleDownloadCSV = useCallback(async () => {
    if (!jobId) {
      Alert.alert('Error', 'No job ID provided');
      return;
    }

    setDownloading(true);
    try {
      const session = await getSession();
      if (!session) {
        router.push('/(auth)/login');
        return;
      }

      const fileName = `${storeName || 'products'}_${Date.now()}.csv`;
      setDownloadedFileName(fileName);

      // Download CSV from backend
      const downloadUrl = `${API_BASE_URL}/scrape/download/${jobId}`;
      
      if (Platform.OS === 'web') {
        // Web download - open in new tab or trigger download
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Download failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setShowSuccessModal(true);
      } else {
        // Native download
        const fileUri = FileSystem.documentDirectory + fileName;
        
        const downloadResult = await FileSystem.downloadAsync(
          downloadUrl,
          fileUri,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (downloadResult.status === 200) {
          // Share the file
          const canShare = await Sharing.isAvailableAsync();
          
          if (canShare) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'text/csv',
              dialogTitle: 'Save CSV File',
            });
          }
          
          setShowSuccessModal(true);
        } else {
          throw new Error('Download failed');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Download Failed',
        'Unable to download the CSV file. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  }, [jobId, storeName, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const navigateToHome = useCallback(() => {
    setShowSuccessModal(false);
    router.push('/(app)/home');
  }, [router]);

  const navigateToHistory = useCallback(() => {
    setShowSuccessModal(false);
    router.push('/(app)/history');
  }, [router]);

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
        <Text style={styles.headerTitle}>Download & Export</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Success Icon */}
        <View style={styles.successSection}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={colors.textPrimary} />
          </View>
          <Text style={styles.successTitle}>Extraction Complete!</Text>
          <Text style={styles.successSubtitle}>
            Your Shopify market research data is ready.{' '}
            <Text style={styles.highlightText}>{productCount || 0} products</Text> found.
          </Text>
        </View>

        {/* Product Thumbnails */}
        <View style={styles.thumbnailsRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.thumbnail}>
              <Ionicons name="image-outline" size={24} color={colors.textMuted} />
            </View>
          ))}
          <View style={[styles.thumbnail, styles.thumbnailMore]}>
            <Text style={styles.thumbnailMoreText}>+{Math.max(0, Number(productCount) - 3)}</Text>
          </View>
        </View>

        {/* Smart Processing Options */}
        <View style={styles.processingSection}>
          <Text style={styles.sectionLabel}>Smart Processing</Text>

          {/* Clean Data Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleIcon}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Clean data with AI</Text>
                <Text style={styles.toggleSubtitle}>Remove HTML and formatting</Text>
              </View>
            </View>
            <Switch
              value={cleanData}
              onValueChange={setCleanData}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>

          {/* Detect Duplicates Toggle */}
          <View style={styles.toggleCard}>
            <View style={styles.toggleLeft}>
              <View style={styles.toggleIcon}>
                <Ionicons name="copy-outline" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Detect Duplicates</Text>
                <Text style={styles.toggleSubtitle}>Unique product entries only</Text>
              </View>
            </View>
            <Switch
              value={detectDuplicates}
              onValueChange={setDetectDuplicates}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.textPrimary}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Download CSV */}
          <Pressable
            onPress={handleDownloadCSV}
            disabled={downloading}
            style={({ pressed }) => [
              styles.primaryButton,
              downloading && styles.primaryButtonDisabled,
              pressed && !downloading ? { opacity: 0.8 } : null
            ]}
          >
            {downloading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Ionicons name="download" size={20} color={colors.background} />
                <Text style={styles.primaryButtonText}>Download CSV</Text>
              </>
            )}
          </Pressable>

          {/* Back to Dashboard */}
          <Pressable
            onPress={navigateToHome}
            style={({ pressed }) => [
              styles.linkButton,
              pressed ? { opacity: 0.7 } : null
            ]}
          >
            <Text style={styles.linkButtonText}>Back to Dashboard</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Download Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            {/* Success Animation */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <Ionicons name="checkmark" size={48} color={colors.textPrimary} />
                </View>
              </View>
            </View>

            <Text style={styles.modalSuccessTitle}>Download Complete!</Text>
            <Text style={styles.modalSuccessSubtitle}>
              Your data has been exported successfully
            </Text>

            {/* File Info */}
            <View style={styles.fileInfoCard}>
              <View style={styles.fileIconContainer}>
                <Ionicons name="document-text" size={32} color={colors.primary} />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {downloadedFileName || 'products.csv'}
                </Text>
                <Text style={styles.fileSize}>
                  {productCount || 0} products exported
                </Text>
              </View>
              <View style={styles.fileCheckmark}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{productCount || 0}</Text>
                <Text style={styles.statLabel}>Products</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{cleanData ? 'Yes' : 'No'}</Text>
                <Text style={styles.statLabel}>AI Cleaned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>CSV</Text>
                <Text style={styles.statLabel}>Format</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <Pressable
              onPress={navigateToHome}
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                pressed ? { opacity: 0.8 } : null
              ]}
            >
              <Ionicons name="home" size={20} color={colors.background} />
              <Text style={styles.modalPrimaryButtonText}>Back to Dashboard</Text>
            </Pressable>

            <Pressable
              onPress={navigateToHistory}
              style={({ pressed }) => [
                styles.modalSecondaryButton,
                pressed ? { opacity: 0.8 } : null
              ]}
            >
              <Text style={styles.modalSecondaryButtonText}>View History</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  successSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderCurve: 'continuous',
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '600',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailMore: {
    backgroundColor: colors.border,
    borderWidth: 0,
  },
  thumbnailMoreText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  processingSection: {
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    marginBottom: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionsSection: {
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
    marginBottom: 12,
    gap: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  linkButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 32,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderCurve: 'continuous',
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSuccessTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSuccessSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileDetails: {
    flex: 1,
    marginLeft: 14,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fileCheckmark: {
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  modalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  modalSecondaryButton: {
    paddingVertical: 12,
  },
  modalSecondaryButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
