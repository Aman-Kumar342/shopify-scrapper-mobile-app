import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendLoginCode, verifyLoginCode, signInWithGoogle, signInWithApple } from '../../../lib/auth';

// Colors
const colors = {
  primary: '#38BDF8',
  background: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  error: '#EF4444',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendLoginCode(email);
      setStep('otp');
      Alert.alert('Success', 'Check your email for the login code!');
    } catch (err: any) {
      console.error('Send code error:', err);
      setError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyLoginCode(email, otp);
      router.replace('/(app)/home');
    } catch (err: any) {
      console.error('Verify code error:', err);
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    setError('');

    try {
      await signInWithGoogle();
      router.replace('/(app)/home');
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    setError('');

    try {
      await signInWithApple();
      router.replace('/(app)/home');
    } catch (err: any) {
      console.error('Apple login error:', err);
      setError(err.message || 'Apple login failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.content}>
          {/* Header Icon */}
          <View style={styles.headerContainer}>
            <View style={styles.headerIcon}>
              <Ionicons name="flash" size={24} color={colors.primary} />
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.mainIcon}>
              <Ionicons name="flash" size={44} color={colors.primary} />
            </View>
            <Text style={styles.title}>Frictionless Login</Text>
            <Text style={styles.subtitle}>
              No passwords, no friction. Access your Shopify insights instantly.
            </Text>
          </View>

          {/* Email Step */}
          {step === 'email' && (
            <View style={styles.formContainer}>
              {/* Google Button */}
              <Pressable
                onPress={handleGoogleLogin}
                disabled={socialLoading !== null}
                style={({ pressed }) => [
                  styles.socialButton,
                  pressed && { opacity: 0.8 }
                ]}
              >
                {socialLoading === 'google' ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                    <Text style={styles.socialButtonText}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              {/* Apple Button */}
              <Pressable
                onPress={handleAppleLogin}
                disabled={socialLoading !== null}
                style={({ pressed }) => [
                  styles.socialButton,
                  { marginBottom: 32 },
                  pressed && { opacity: 0.8 }
                ]}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator color={colors.textPrimary} size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={22} color={colors.textPrimary} />
                    <Text style={styles.socialButtonText}>Continue with Apple</Text>
                  </>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Or use Email</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@company.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              {/* Error Message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Send Code Button */}
              <Pressable
                onPress={handleSendCode}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.8 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.primaryButtonText}>Send Login Code</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.background} />
                  </View>
                )}
              </Pressable>
            </View>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <View style={styles.formContainer}>
              <Text style={styles.otpDescription}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.otpEmail}>{email}</Text>
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={[styles.input, styles.otpInput]}
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                onPress={handleVerifyCode}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.8 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => setStep('email')}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>
                  Didn't receive it?{' '}
                  <Text style={styles.retryLink}>Try again</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainIcon: {
    width: 88,
    height: 88,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 28,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  formContainer: {
    flex: 1,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  socialButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 14,
    marginHorizontal: 16,
  },
  inputContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  otpDescription: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  otpEmail: {
    color: colors.textPrimary,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  retryText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  retryLink: {
    color: colors.primary,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerLink: {
    color: colors.primary,
  },
});
