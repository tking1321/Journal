import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isPermanentAccessEmail } from '@/lib/allowlist';
import type { Session, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  display_name: string | null;
  coaching_style: string | null;
  journaling_style: string | null;
  daily_time_commitment: string | null;
  biggest_obstacle: string | null;
  success_vision: string | null;
  reminder_time: string | null;
  subscription_status: string;
  trial_start_date: string | null;
  trial_end_date: string | null;
  has_used_free_trial: boolean;
  subscription_plan: string | null;
  onboarding_completed: boolean;
  user_level: number;
  current_xp: number;
  total_xp_earned: number;
  daily_goal_limit: number;
  last_goal_generation_date: string | null;
  last_ai_request_type: string | null;
  last_ai_request_date: string | null;
  last_ai_response_json: Record<string, unknown> | null;
  last_goal_refresh_date: string | null;
  last_coaching_generation_date: string | null;
  last_coaching_note: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function applyAccessRules(
  profile: Profile,
  userEmail: string | undefined,
  userId: string
): Promise<Profile> {
  const now = new Date();

  // Permanent allowlist — grant lifetime access
  if (isPermanentAccessEmail(userEmail) && profile.subscription_status !== 'lifetime') {
    await supabase.from('profiles')
      .update({ subscription_status: 'lifetime' })
      .eq('id', userId);
    return { ...profile, subscription_status: 'lifetime' };
  }

  // Trial expiry — mark expired if trial_end_date has passed
  if (
    profile.subscription_status === 'trial' &&
    profile.trial_end_date &&
    new Date(profile.trial_end_date) < now
  ) {
    await supabase.from('profiles')
      .update({ subscription_status: 'expired' })
      .eq('id', userId);
    return { ...profile, subscription_status: 'expired' };
  }

  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id, session.user.email);
        })();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, userEmail?: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    let finalProfile: Profile | null = null;

    if (data) {
      finalProfile = await applyAccessRules(data as Profile, userEmail, userId);
    } else if (!error) {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .maybeSingle();
      if (newProfile) {
        finalProfile = await applyAccessRules(newProfile as Profile, userEmail, userId);
      }
    }

    setProfile(finalProfile);
    setLoading(false);
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .maybeSingle();
    if (data) setProfile(data as Profile);
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
