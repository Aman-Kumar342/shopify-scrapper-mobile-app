import { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
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

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  credits: number;
  popular?: boolean;
  bestValue?: boolean;
  features: string[];
}

// Memoized PlanCard component
const PlanCard = memo(function PlanCard({
  plan,
  isLoading,
  isSelected,
  onPurchase,
}: {
  plan: Plan;
  isLoading: boolean;
  isSelected: boolean;
  onPurchase: () => void;
}) {
  return (
    <View
      style={[
        styles.planCard,
        plan.popular ? styles.planCardPopular : null
      ]}
    >
      {plan.popular ? (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      ) : null}
      
      {plan.bestValue ? (
        <View style={[styles.popularBadge, { backgroundColor: colors.success }]}>
          <Text style={styles.popularBadgeText}>BEST VALUE</Text>
        </View>
      ) : null}

      <Text style={styles.planName}>{plan.name}</Text>
      <Text style={styles.planDescription}>{plan.description}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.priceValue}>₹{plan.price}</Text>
        <Text style={styles.priceCredits}>{plan.credits} Scrapes</Text>
        {plan.originalPrice ? (
          <Text style={styles.priceOriginal}>₹{plan.originalPrice}</Text>
        ) : null}
      </View>

      <Pressable
        onPress={onPurchase}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.buyButton,
          plan.popular ? styles.buyButtonPrimary : styles.buyButtonSecondary,
          pressed && !isLoading ? { opacity: 0.8 } : null
        ]}
      >
        {isLoading && isSelected ? (
          <ActivityIndicator color={plan.popular ? colors.background : colors.primary} />
        ) : (
          <Text style={[
            styles.buyButtonText,
            plan.popular ? styles.buyButtonTextPrimary : styles.buyButtonTextSecondary
          ]}>
            Buy Now
          </Text>
        )}
      </Pressable>

      {plan.features.map((feature, index) => (
        <View key={index} style={styles.featureRow}>
          <Ionicons name="checkmark" size={16} color={colors.primary} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}
    </View>
  );
});

// Memoized PaymentMethod component
const PaymentMethod = memo(function PaymentMethod({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <View style={styles.paymentMethod}>
      <View style={styles.paymentIcon}>
        <Ionicons name={icon as any} size={20} color={colors.textPrimary} />
      </View>
      <Text style={styles.paymentLabel}>{label}</Text>
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

// Static plans data - outside component to avoid recreation
const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    description: 'Perfect for occasional market research',
    price: 499,
    credits: 10,
    features: ['Instant activation', 'No expiry'],
  },
  {
    id: 'growth',
    name: 'Growth Bundle',
    description: 'For active Shopify store monitoring',
    price: 1999,
    originalPrice: 2499,
    credits: 50,
    popular: true,
    features: ['20% bundle discount applied', 'Priority processing speed'],
  },
  {
    id: 'pro',
    name: 'Scale Pro',
    description: 'Unlimited market research potential',
    price: 6999,
    credits: 200,
    bestValue: true,
    features: ['Dedicated account manager support'],
  },
];

export default function BillingScreen() {
  const { push, back } = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [purchasedCredits, setPurchasedCredits] = useState(0);
  const [purchasedPlanName, setPurchasedPlanName] = useState('');

  useEffect(() => {
    loadCredits();
  }, []);

  // Handle deep link for payment callback
  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  const handleDeepLink = async (event: { url: string }) => {
    const { url } = event;
    
    // Handle payment success
    if (url.includes('payment/success')) {
      const params = new URL(url).searchParams;
      const txnId = params.get('txn');
      if (txnId) {
        await verifyPayment(txnId);
      }
    }
    
    // Handle payment cancel
    if (url.includes('payment/cancel')) {
      Alert.alert('Payment Cancelled', 'Your payment was cancelled.');
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const loadCredits = async () => {
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
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Failed to load credits:', error);
    }
  };

  const verifyPayment = async (transactionId: string) => {
    try {
      const session = await getSession();
      if (!session) return;

      // Get transaction details to find payment ID
      const response = await fetch(`${API_BASE_URL}/payment/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          paymentId: transactionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCredits(data.total_credits);
          setPurchasedCredits(data.credits_added);
          setPurchasedPlanName(plans.find(p => p.id === selectedPlan)?.name || '');
          setShowSuccessModal(true);
        }
      }
    } catch (error) {
      console.error('Verify payment error:', error);
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  const handlePurchase = useCallback(async (plan: Plan) => {
    setLoading(true);
    setSelectedPlan(plan.id);

    try {
      const session = await getSession();
      if (!session) {
        push('/(auth)/login');
        return;
      }

      // Create payment with Dodo
      const response = await fetch(`${API_BASE_URL}/payment/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment');
      }

      const data = await response.json();

      if (data.paymentLink) {
        // Open payment link in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.paymentLink,
          'dataflow://payment'
        );

        // If user comes back without completing, reset
        if (result.type === 'cancel' || result.type === 'dismiss') {
          setLoading(false);
          setSelectedPlan(null);
        }
      } else {
        throw new Error('No payment link received');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'Failed to initiate payment. Please try again.');
      setLoading(false);
      setSelectedPlan(null);
    }
  }, [push]);

  // Navigation handlers with stable references
  const handleBack = useCallback(() => back(), [back]);
  const navigateToHome = useCallback(() => push('/(app)/home'), [push]);
  const navigateToSettings = useCallback(() => push('/(app)/settings'), [push]);
  
  const handleCloseModalAndNavigate = useCallback(() => {
    setShowSuccessModal(false);
    push('/(app)/home');
  }, [push]);

  const handleCloseModal = useCallback(() => {
    setShowSuccessModal(false);
  }, []);

  // Create stable purchase handlers for each plan
  const handlePurchaseStarter = useCallback(() => handlePurchase(plans[0]), [handlePurchase]);
  const handlePurchaseGrowth = useCallback(() => handlePurchase(plans[1]), [handlePurchase]);
  const handlePurchasePro = useCallback(() => handlePurchase(plans[2]), [handlePurchase]);

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
        <Text style={styles.headerTitle}>Credits & Billing</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Current Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="analytics" size={18} color={colors.primary} />
            <Text style={styles.balanceLabel}>Current Credit Balance</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceValue}>{credits.toLocaleString()}</Text>
            <Text style={styles.balanceUnit}>Scrapes</Text>
          </View>
          <Text style={styles.balanceUpdated}>Last updated: Just now</Text>
        </View>

        {/* Plans Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Up Credits</Text>
          <Text style={styles.sectionBadge}>Most Popular</Text>
        </View>

        {/* Pricing Cards */}
        <PlanCard 
          plan={plans[0]} 
          isLoading={loading} 
          isSelected={selectedPlan === plans[0].id}
          onPurchase={handlePurchaseStarter}
        />
        <PlanCard 
          plan={plans[1]} 
          isLoading={loading} 
          isSelected={selectedPlan === plans[1].id}
          onPurchase={handlePurchaseGrowth}
        />
        <PlanCard 
          plan={plans[2]} 
          isLoading={loading} 
          isSelected={selectedPlan === plans[2].id}
          onPurchase={handlePurchasePro}
        />

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Secure Payment Methods</Text>
          <View style={styles.paymentMethods}>
            <PaymentMethod icon="card" label="UPI" />
            <PaymentMethod icon="card-outline" label="Cards" />
            <PaymentMethod icon="wallet" label="Net Banking" />
          </View>
        </View>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.securityText}>
            Secure encrypted payments powered by Dodo Payments.
          </Text>
        </View>

        {/* View History Link */}
        <Pressable 
          style={({ pressed }) => [
            styles.historyLink,
            pressed ? { opacity: 0.7 } : null
          ]}
        >
          <Text style={styles.historyLinkText}>View Transaction History</Text>
        </Pressable>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <NavItem icon="grid-outline" label="Dashboard" onPress={navigateToHome} />
        <NavItem icon="search-outline" label="Research" />
        <NavItem icon="card" label="Billing" isActive />
        <NavItem icon="settings-outline" label="Settings" onPress={navigateToSettings} />
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModal}>
            {/* Success Icon */}
            <View style={styles.successIconContainer}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconInner}>
                  <Ionicons name="checkmark" size={40} color={colors.textPrimary} />
                </View>
              </View>
            </View>

            {/* Success Text */}
            <Text style={styles.successTitle}>Payment Successful!</Text>
            <Text style={styles.successSubtitle}>
              Your {purchasedPlanName} has been activated
            </Text>

            {/* Credits Added */}
            <View style={styles.creditsAddedCard}>
              <View style={styles.creditsAddedRow}>
                <Text style={styles.creditsAddedLabel}>Credits Added</Text>
                <Text style={styles.creditsAddedValue}>+{purchasedCredits}</Text>
              </View>
              <View style={styles.creditsDivider} />
              <View style={styles.creditsAddedRow}>
                <Text style={styles.creditsAddedLabel}>New Balance</Text>
                <Text style={styles.creditsTotalValue}>{credits.toLocaleString()}</Text>
              </View>
            </View>

            {/* Transaction Info */}
            <View style={styles.transactionInfo}>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Transaction ID</Text>
                <Text style={styles.transactionValue}>TXN{Date.now().toString().slice(-8)}</Text>
              </View>
              <View style={styles.transactionRow}>
                <Text style={styles.transactionLabel}>Date</Text>
                <Text style={styles.transactionValue}>{new Date().toLocaleDateString()}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <Pressable
              onPress={handleCloseModalAndNavigate}
              style={({ pressed }) => [
                styles.successPrimaryButton,
                pressed ? { opacity: 0.8 } : null
              ]}
            >
              <Ionicons name="rocket" size={20} color={colors.background} />
              <Text style={styles.successPrimaryButtonText}>Start Scraping</Text>
            </Pressable>

            <Pressable
              onPress={handleCloseModal}
              style={({ pressed }) => [
                styles.successSecondaryButton,
                pressed ? { opacity: 0.7 } : null
              ]}
            >
              <Text style={styles.successSecondaryButtonText}>View More Plans</Text>
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
  balanceCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    gap: 4,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  balanceUnit: {
    fontSize: 18,
    color: colors.primary,
  },
  balanceUpdated: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
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
  sectionBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderCurve: 'continuous',
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  planCardPopular: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    marginTop: 8,
  },
  planDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
    gap: 8,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  priceCredits: {
    fontSize: 16,
    color: colors.primary,
  },
  priceOriginal: {
    fontSize: 16,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  buyButton: {
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buyButtonPrimary: {
    backgroundColor: colors.primary,
  },
  buyButtonSecondary: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  buyButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buyButtonTextPrimary: {
    color: colors.background,
  },
  buyButtonTextSecondary: {
    color: colors.primary,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  paymentSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    gap: 16,
  },
  paymentTitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 24,
  },
  paymentMethod: {
    alignItems: 'center',
    gap: 6,
  },
  paymentIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.border,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  securityText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  historyLink: {
    alignItems: 'center',
    marginBottom: 100,
  },
  historyLinkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
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
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  creditsAddedCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  creditsAddedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsAddedLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  creditsAddedValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
  },
  creditsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  creditsTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  transactionInfo: {
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  transactionLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  transactionValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  successPrimaryButton: {
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
  successPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
  },
  successSecondaryButton: {
    paddingVertical: 12,
  },
  successSecondaryButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
