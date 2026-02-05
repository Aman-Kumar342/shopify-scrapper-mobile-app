import { useState } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: 1,
    title: 'Extract any Shopify',
    titleHighlight: 'Store Data',
    description: 'Get products, variants, and pricing in seconds. Turn competitor data into your unfair advantage.',
  },
  {
    id: 2,
    title: 'Fast. Clean.',
    titleHighlight: 'No Headaches.',
    description: 'Get market-ready data in seconds. Paste a Shopify URL and watch the magic happen.',
  },
];

const colors = {
  background: '#0F172A',
  primary: '#38BDF8',
  white: '#FFFFFF',
  muted: '#94A3B8',
  card: '#1E293B',
  dotInactive: '#64748B',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/login');
  };

  const slide = slides[currentSlide];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>D</Text>
          </View>
          <Text style={styles.logoText}>DataFlow</Text>
        </View>
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationOuter}>
            <View style={styles.illustrationInner}>
              <Text style={styles.illustrationEmoji}>{slide.id === 1 ? '🔍' : '📄'}</Text>
            </View>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>
            {slide.title}{' '}
            <Text style={styles.titleHighlight}>{slide.titleHighlight}</Text>
          </Text>
          <Text style={styles.description}>
            {slide.description}
          </Text>
        </View>

        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive,
                { width: index === currentSlide ? 32 : 8 },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        <Pressable onPress={handleNext} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue →'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(auth)/login')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            Already have an account? <Text style={styles.secondaryButtonHighlight}>Log In</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIconText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  skipText: {
    color: colors.muted,
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  illustrationOuter: {
    width: 200,
    height: 200,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 100,
    height: 100,
    backgroundColor: colors.primary,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationEmoji: {
    color: colors.white,
    fontSize: 40,
  },
  textContent: {
    alignItems: 'center',
  },
  title: {
    color: colors.white,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  titleHighlight: {
    color: colors.primary,
  },
  description: {
    color: colors.muted,
    textAlign: 'center',
    fontSize: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    lineHeight: 24,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: colors.dotInactive,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  bottomSection: {
    marginTop: 'auto',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.muted,
    fontSize: 16,
  },
  secondaryButtonHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
});
