import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';

const colors = {
  primary: '#38BDF8',
  background: '#0F172A',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  error: '#EF4444',
};

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the full URL hash (contains access_token, refresh_token, etc.)
      if (typeof window !== 'undefined') {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          // Set the session
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError(sessionError.message);
            return;
          }

          if (data.session) {
            // Ensure user exists in our users table
            const user = data.session.user;
            if (user) {
              await ensureUserExists(user.id, user.email || '');
            }

            console.log('Login successful, redirecting...');
            // Redirect to home
            router.replace('/(app)/home');
            return;
          }
        }

        // Check query params as fallback
        const queryAccessToken = params.access_token as string;
        if (queryAccessToken) {
          const queryRefreshToken = params.refresh_token as string;
          
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: queryAccessToken,
            refresh_token: queryRefreshToken || '',
          });

          if (sessionError) {
            setError(sessionError.message);
            return;
          }

          if (data.session) {
            const user = data.session.user;
            if (user) {
              await ensureUserExists(user.id, user.email || '');
            }
            router.replace('/(app)/home');
            return;
          }
        }

        setError('No authentication token found');
      }
    } catch (err: any) {
      console.error('Callback error:', err);
      setError(err.message || 'Authentication failed');
    }
  };

  // Helper function to ensure user exists in users table
  const ensureUserExists = async (userId: string, email: string) => {
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking user:', fetchError);
      }

      if (!existingUser) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email: email,
            credits: 5,
          });

        if (insertError && !insertError.message.includes('duplicate')) {
          console.error('Error creating user:', insertError);
        }
      }
    } catch (err) {
      console.error('Error in ensureUserExists:', err);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Authentication Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text 
          style={styles.link}
          onPress={() => router.replace('/(auth)/login')}
        >
          Go back to login
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  link: {
    color: colors.primary,
    fontSize: 16,
  },
});
