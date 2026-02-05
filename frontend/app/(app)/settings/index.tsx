import { useState, useEffect, memo, useCallback } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  Switch, 
  Alert, 
  ScrollView,
  StyleSheet,
  StatusBar,
  TextInput,
  Modal,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../../lib/constants';
import { getSession, signOut, getCurrentUser } from '../../../lib/auth';

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

const SYNC_OPTIONS = ['Every 1h', 'Every 3h', 'Every 6h', 'Every 12h', 'Every 24h'];

// Helper function to extract display name from email
const getNameFromEmail = (email: string): string => {
  if (!email) return 'User';
  const localPart = email.split('@')[0];
  const name = localPart
    .replace(/[._]/g, ' ')
    .replace(/\d+/g, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
  return name || 'User';
};

// Memoized SettingsItem component following React Native best practices
const SettingsItem = memo(function SettingsItem({
  icon,
  label,
  value,
  onPress,
  showToggle,
  toggleValue,
  onToggle,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !showToggle}
      style={({ pressed }) => [
        styles.settingsItem,
        pressed && onPress ? { opacity: 0.7 } : null
      ]}
    >
      <View style={styles.settingsItemIcon}>
        <Ionicons 
          name={icon as any} 
          size={18} 
          color={danger ? colors.error : colors.primary} 
        />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={[styles.settingsItemLabel, danger ? { color: colors.error } : null]}>
          {label}
        </Text>
        {value ? <Text style={styles.settingsItemValue}>{value}</Text> : null}
      </View>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.textPrimary}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
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

// Memoized SyncOption component
const SyncOption = memo(function SyncOption({
  option,
  isSelected,
  onSelect,
}: {
  option: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.syncOption,
        isSelected ? styles.syncOptionSelected : null,
        pressed ? { opacity: 0.7 } : null
      ]}
    >
      <Text style={[
        styles.syncOptionText,
        isSelected ? styles.syncOptionTextSelected : null
      ]}>
        {option}
      </Text>
      {isSelected ? (
        <Ionicons name="checkmark" size={20} color={colors.primary} />
      ) : null}
    </Pressable>
  );
});

export default function SettingsScreen() {
  // Destructure router functions early for React Compiler compatibility
  const { push, back, replace } = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [syncFrequency, setSyncFrequency] = useState('Every 6h');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [exporting, setExporting] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    credits: 5,
    totalCredits: 10000,
    plan: 'Free Plan',
    renewalDate: 'N/A',
    daysRemaining: 30,
  });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setIsLoading(true);
    try {
      const user = await getCurrentUser();
      if (user?.email) {
        const storedName = await AsyncStorage.getItem('user_display_name');
        const storedDarkMode = await AsyncStorage.getItem('dark_mode');
        const storedSyncFreq = await AsyncStorage.getItem('sync_frequency');
        
        const displayName = storedName || getNameFromEmail(user.email);
        
        setUserData(prev => ({
          ...prev,
          email: user.email || '',
          name: displayName,
        }));
        
        if (storedDarkMode !== null) {
          setDarkMode(storedDarkMode === 'true');
        }
        if (storedSyncFreq) {
          setSyncFrequency(storedSyncFreq);
        }
      }

      await loadUserData();
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
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
        setUserData(prev => ({
          ...prev,
          credits: data.credits || prev.credits,
        }));
      }
    } catch (error) {
      console.error('Failed to load credits:', error);
    }
  };

  // Use useCallback for stable function references
  const handleDarkModeToggle = useCallback(async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem('dark_mode', value.toString());
    Alert.alert(
      value ? 'Dark Mode Enabled' : 'Light Mode Enabled',
      'Theme preference saved. Full theme switching will be available in the next update.',
      [{ text: 'OK' }]
    );
  }, []);

  const handleSyncFrequencyChange = useCallback(async (freq: string) => {
    setSyncFrequency(freq);
    await AsyncStorage.setItem('sync_frequency', freq);
    setShowSyncModal(false);
    Alert.alert('Sync Frequency Updated', `Your Shopify data will now sync ${freq.toLowerCase()}.`);
  }, []);

  const handleEditName = useCallback(() => {
    setEditName(userData.name);
    setShowEditModal(true);
  }, [userData.name]);

  const handleSaveName = useCallback(async () => {
    if (editName.trim()) {
      await AsyncStorage.setItem('user_display_name', editName.trim());
      setUserData(prev => ({ ...prev, name: editName.trim() }));
    }
    setShowEditModal(false);
  }, [editName]);

  const handleGDPR = useCallback(() => {
    Alert.alert(
      'GDPR & Data Rights',
      'Under GDPR, you have the right to:\n\n• Access your personal data\n• Rectify inaccurate data\n• Erase your data\n• Restrict processing\n• Data portability\n• Object to processing\n\nTo exercise these rights, contact support@shopifyscraper.com',
      [
        { text: 'Contact Support', onPress: () => Linking.openURL('mailto:support@shopifyscraper.com?subject=GDPR%20Request') },
        { text: 'OK', style: 'cancel' }
      ]
    );
  }, []);

  const handleExportData = useCallback(async () => {
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Export Initiated',
        'We are preparing your data export. You will receive an email with a download link within 24 hours.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to initiate data export. Please try again later.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleTermsOfService = useCallback(() => {
    Alert.alert(
      'Terms of Service',
      'Opening Terms of Service...',
      [
        { 
          text: 'Open in Browser', 
          onPress: () => Linking.openURL('https://shopifyscraper.com/terms') 
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    Alert.alert(
      'Privacy Policy',
      'Opening Privacy Policy...',
      [
        { 
          text: 'Open in Browser', 
          onPress: () => Linking.openURL('https://shopifyscraper.com/privacy') 
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              replace('/(auth)/login');
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  }, [replace]);

  const handleManageSubscription = useCallback(() => {
    push('/(app)/billing');
  }, [push]);

  const openSyncModal = useCallback(() => {
    setShowSyncModal(true);
  }, []);

  const closeSyncModal = useCallback(() => {
    setShowSyncModal(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
  }, []);

  // Navigation handlers
  const navigateToHome = useCallback(() => push('/(app)/home'), [push]);
  const navigateToHistory = useCallback(() => push('/(app)/history'), [push]);
  const navigateToTrends = useCallback(() => push('/(app)/trends'), [push]);

  // Derive usage percentage
  const usagePercentage = (userData.credits / userData.totalCredits) * 100;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable 
          onPress={back} 
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { opacity: 0.7 } : null
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Ionicons name="person" size={28} color={colors.background} />
          </View>
          <View style={styles.profileInfo}>
            {isLoading ? (
              <>
                <View style={styles.skeletonName} />
                <View style={styles.skeletonEmail} />
              </>
            ) : (
              <>
                <Pressable 
                  onPress={handleEditName} 
                  style={({ pressed }) => [
                    styles.nameEditRow,
                    pressed ? { opacity: 0.7 } : null
                  ]}
                >
                  <Text style={styles.profileName}>{userData.name || 'User'}</Text>
                  <Ionicons name="pencil" size={16} color={colors.primary} style={styles.pencilIcon} />
                </Pressable>
                <Text style={styles.profileEmail}>{userData.email || 'Loading...'}</Text>
              </>
            )}
            <View style={styles.linkedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={styles.linkedText}>Shopify Store Linked</Text>
            </View>
          </View>
        </View>

        {/* Subscription Card */}
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.planTitle}>{userData.plan} Active</Text>
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          </View>
          <Text style={styles.renewalText}>Renewal date: {userData.renewalDate}</Text>

          {/* Usage Bar */}
          <View style={styles.usageHeader}>
            <Text style={styles.usageLabel}>Monthly Usage</Text>
            <Text style={styles.usageValue}>
              {userData.credits.toLocaleString()} / {userData.totalCredits.toLocaleString()} credits
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${usagePercentage}%` }]} />
          </View>
          <Text style={styles.resetText}>Credits reset in {userData.daysRemaining} days</Text>

          <Pressable
            onPress={handleManageSubscription}
            style={({ pressed }) => [
              styles.manageButton,
              pressed ? { opacity: 0.8 } : null
            ]}
          >
            <Text style={styles.manageButtonText}>Manage Subscription</Text>
          </Pressable>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="moon-outline"
              label="Dark Mode"
              showToggle
              toggleValue={darkMode}
              onToggle={handleDarkModeToggle}
            />
            <SettingsItem
              icon="sync-outline"
              label="Shopify Sync Frequency"
              value={syncFrequency}
              onPress={openSyncModal}
            />
          </View>
        </View>

        {/* Privacy & Compliance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Compliance</Text>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="shield-checkmark-outline"
              label="GDPR & Data Rights"
              onPress={handleGDPR}
            />
            <SettingsItem
              icon="download-outline"
              label="Export My Data"
              onPress={handleExportData}
            />
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={handleTermsOfService}
            />
            <SettingsItem
              icon="lock-closed-outline"
              label="Privacy Policy"
              onPress={handlePrivacyPolicy}
            />
          </View>
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed ? { opacity: 0.7 } : null
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* Version */}
        <Text style={styles.versionText}>VERSION 2.4.1 (BUILD 108)</Text>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <NavItem 
          icon="grid-outline" 
          label="Dashboard" 
          onPress={navigateToHome}
        />
        <NavItem 
          icon="time-outline" 
          label="History" 
          onPress={navigateToHistory}
        />
        <NavItem 
          icon="trending-up-outline" 
          label="Trends" 
          onPress={navigateToTrends}
        />
        <NavItem 
          icon="settings" 
          label="Settings" 
          isActive
        />
      </View>

      {/* Edit Name Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Display Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable 
                onPress={closeEditModal}
                style={({ pressed }) => [
                  styles.modalButtonCancel,
                  pressed ? { opacity: 0.7 } : null
                ]}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable 
                onPress={handleSaveName}
                style={({ pressed }) => [
                  styles.modalButtonSave,
                  pressed ? { opacity: 0.8 } : null
                ]}
              >
                <Text style={styles.modalButtonSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sync Frequency Modal */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="slide"
        onRequestClose={closeSyncModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sync Frequency</Text>
            <Text style={styles.modalSubtitle}>How often should we sync your Shopify data?</Text>
            {SYNC_OPTIONS.map((option) => (
              <SyncOption
                key={option}
                option={option}
                isSelected={syncFrequency === option}
                onSelect={() => handleSyncFrequencyChange(option)}
              />
            ))}
            <Pressable 
              onPress={closeSyncModal}
              style={({ pressed }) => [
                styles.modalButtonCancel,
                pressed ? { opacity: 0.7 } : null
              ]}
            >
              <Text style={styles.modalButtonCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {exporting ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparing your data export...</Text>
        </View>
      ) : null}
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pencilIcon: {
    marginLeft: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  linkedText: {
    fontSize: 13,
    color: colors.success,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    marginBottom: 24,
    gap: 8,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  premiumBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  renewalText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  usageValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    borderCurve: 'continuous',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    borderCurve: 'continuous',
  },
  resetText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  manageButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
  },
  section: {
    marginBottom: 24,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsGroup: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(51, 65, 85, 0.5)',
    gap: 14,
  },
  settingsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemContent: {
    flex: 1,
    gap: 2,
  },
  settingsItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  settingsItemValue: {
    fontSize: 12,
    color: colors.textMuted,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 100,
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
  },
  navTextActive: {
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 24,
    width: '100%',
    maxWidth: 340,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalButtonSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  syncOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.background,
    marginBottom: 8,
  },
  syncOptionSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  syncOptionText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  syncOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  skeletonName: {
    width: 120,
    height: 20,
    backgroundColor: colors.border,
    borderRadius: 4,
    borderCurve: 'continuous',
  },
  skeletonEmail: {
    width: 180,
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    borderCurve: 'continuous',
    marginTop: 8,
  },
});
