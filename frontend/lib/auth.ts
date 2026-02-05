import { supabase } from './supabase';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

export async function sendLoginCode(email: string) {
  console.log('Sending OTP to:', email);
  
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error('Send OTP error:', error);
    // Provide user-friendly error messages
    if (error.message.includes('Database error')) {
      throw new Error('Unable to create account. Please try again or contact support.');
    }
    if (error.message.includes('rate limit')) {
      throw new Error('Too many attempts. Please wait a few minutes and try again.');
    }
    throw error;
  }

  console.log('OTP sent successfully');
  return { success: true };
}

export async function verifyLoginCode(email: string, token: string) {
  console.log('Verifying OTP for:', email);
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) {
    console.error('Verify OTP error:', error);
    throw error;
  }

  // Ensure user exists in our users table
  if (data.user) {
    await ensureUserExists(data.user.id, data.user.email || email);
  }

  console.log('OTP verified successfully');
  return { success: true, session: data.session, user: data.user };
}

// Helper function to ensure user exists in users table
async function ensureUserExists(userId: string, email: string) {
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is okay
      console.error('Error checking user:', fetchError);
    }

    // If user doesn't exist, create them
    if (!existingUser) {
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: email,
          credits: 5, // Free credits on signup
        });

      if (insertError) {
        // Ignore duplicate key errors (user already exists)
        if (!insertError.message.includes('duplicate')) {
          console.error('Error creating user:', insertError);
        }
      } else {
        console.log('Created new user with 5 free credits');
      }
    }
  } catch (err) {
    console.error('Error in ensureUserExists:', err);
    // Don't throw - user can still proceed with auth
  }
}

export async function signInWithGoogle() {
  try {
    const redirectUrl = makeRedirectUri({
      scheme: 'dataflow',
      path: 'auth/callback',
    });
    
    console.log('Google sign in redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      // Check if it's a provider not enabled error
      if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
        throw new Error('Google login is not configured yet. Please use email login.');
      }
      throw error;
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        // Extract tokens from URL
        const url = new URL(result.url);
        const access_token = url.searchParams.get('access_token') || url.hash?.split('access_token=')[1]?.split('&')[0];
        const refresh_token = url.searchParams.get('refresh_token') || url.hash?.split('refresh_token=')[1]?.split('&')[0];

        if (access_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          });

          if (sessionError) throw sessionError;
          
          // Ensure user exists in our users table
          if (sessionData.user) {
            await ensureUserExists(sessionData.user.id, sessionData.user.email || '');
          }
          
          return { success: true, session: sessionData.session };
        }
      }
    }

    throw new Error('Google sign in was cancelled');
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
}

export async function signInWithApple() {
  try {
    const redirectUrl = makeRedirectUri({
      scheme: 'dataflow',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error('Apple OAuth error:', error);
      // Check if it's a provider not enabled error
      if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
        throw new Error('Apple login is not configured yet. Please use email login.');
      }
      throw error;
    }

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const access_token = url.searchParams.get('access_token') || url.hash?.split('access_token=')[1]?.split('&')[0];
        const refresh_token = url.searchParams.get('refresh_token') || url.hash?.split('refresh_token=')[1]?.split('&')[0];

        if (access_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token: refresh_token || '',
          });

          if (sessionError) throw sessionError;
          
          // Ensure user exists in our users table
          if (sessionData.user) {
            await ensureUserExists(sessionData.user.id, sessionData.user.email || '');
          }
          
          return { success: true, session: sessionData.session };
        }
      }
    }

    throw new Error('Apple sign in was cancelled');
  } catch (error) {
    console.error('Apple sign in error:', error);
    throw error;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  return { success: true };
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
