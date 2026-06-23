import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Category {
  id: string;
  name: string;
  growth_description: string | null;
}

interface StreakSettings {
  streak_goal: number;
  freeze_uses_remaining: number;
  freeze_month: string | null;
  current_streak: number;
  longest_streak: number;
}

const STREAK_GOALS = [3, 7, 14, 30];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [streakSettings, setStreakSettings] = useState<StreakSettings | null>(null);
  const [applyingFreeze, setApplyingFreeze] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const [catsRes, streakRes] = await Promise.all([
      supabase.from('categories').select('*').order('created_at'),
      supabase.from('streaks').select('*').maybeSingle(),
    ]);
    setCategories(catsRes.data || []);
    if (streakRes.data) setStreakSettings(streakRes.data);
  }, [user]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  async function addCategory() {
    if (!newCategory.trim()) return;
    const { data } = await supabase
      .from('categories').insert({ name: newCategory.trim() }).select().maybeSingle();
    if (data) { setCategories((prev) => [...prev, data]); setNewCategory(''); }
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await supabase.from('categories').update({ name: editName.trim() }).eq('id', id);
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c)));
    setEditingId(null);
    setEditName('');
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
      router.replace('/');
    }
  }

  async function updateStreakGoal(goal: number) {
    if (!user || !streakSettings) return;
    await supabase.from('streaks').update({ streak_goal: goal }).eq('user_id', user.id);
    setStreakSettings((prev) => prev ? { ...prev, streak_goal: goal } : prev);
  }

  async function useStreakFreeze() {
    if (!user || !streakSettings) return;
    if (streakSettings.freeze_uses_remaining <= 0) return;

    setApplyingFreeze(true);

    // Reset freeze uses if new month
    const newFreezeRemaining = streakSettings.freeze_month !== thisMonth
      ? 2  // new month, used 1
      : streakSettings.freeze_uses_remaining - 1;

    await supabase.from('streaks').update({
      freeze_uses_remaining: newFreezeRemaining,
      freeze_month: thisMonth,
      last_active_date: today,
    }).eq('user_id', user.id);

    setStreakSettings((prev) => prev ? {
      ...prev,
      freeze_uses_remaining: newFreezeRemaining,
      freeze_month: thisMonth,
    } : prev);

    setApplyingFreeze(false);
  }

  const subscriptionLabel: Record<string, string> = {
    free: 'Free',
    trial: 'Trial',
    active: 'Premium',
    expired: 'Expired',
  };

  const status = profile?.subscription_status || 'free';
  const streakGoal = streakSettings?.streak_goal || 7;
  const currentStreak = streakSettings?.current_streak || 0;
  const freezesLeft = streakSettings?.freeze_uses_remaining ?? 3;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarChar}>{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          <View style={[styles.statusBadge, (status === 'active' || status === 'trial') ? styles.statusBadgePremium : null]}>
            <Text style={[styles.statusText, (status === 'active' || status === 'trial') ? styles.statusTextPremium : null]}>
              {subscriptionLabel[status] || 'Free'}
              {status === 'trial' ? ` · ${profile?.trial_start_date ? Math.max(0, 7 - Math.floor((Date.now() - new Date(profile.trial_start_date).getTime()) / 86400000)) : 7}d left` : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Streak Settings */}
      {streakSettings && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streak Goal</Text>
          <Text style={styles.sectionSubtitle}>You're building a habit. Choose your pace.</Text>

          <View style={styles.goalSelector}>
            {STREAK_GOALS.map((g) => (
              <Pressable
                key={g}
                style={[styles.goalOption, streakGoal === g && styles.goalOptionSelected]}
                onPress={() => updateStreakGoal(g)}
              >
                <Text style={[styles.goalOptionNum, streakGoal === g && styles.goalOptionNumSelected]}>
                  {g}
                </Text>
                <Text style={[styles.goalOptionLabel, streakGoal === g && styles.goalOptionLabelSelected]}>
                  days
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.streakStatus}>
            <View style={styles.streakStatusRow}>
              <Text style={styles.streakStatusLabel}>Current streak</Text>
              <Text style={styles.streakStatusValue}>{currentStreak}/{streakGoal} days</Text>
            </View>
            <View style={styles.streakBar}>
              <View style={[styles.streakBarFill, { width: `${Math.min(100, (currentStreak / streakGoal) * 100)}%` as any }]} />
            </View>
          </View>

          <View style={styles.freezeRow}>
            <View style={styles.freezeInfo}>
              <Text style={styles.freezeTitle}>Streak Freeze</Text>
              <Text style={styles.freezeDesc}>Pause 1 day without breaking your streak</Text>
            </View>
            <View style={styles.freezeRight}>
              <Text style={styles.freezeCount}>{freezesLeft}/3</Text>
              <Text style={styles.freezeCountLabel}>left</Text>
            </View>
            <Pressable
              style={[styles.freezeButton, (freezesLeft <= 0 || applyingFreeze) && styles.disabled]}
              onPress={useStreakFreeze}
              disabled={freezesLeft <= 0 || applyingFreeze}
            >
              <Text style={styles.freezeButtonText}>Use</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Growth Categories</Text>
          <Text style={styles.sectionCount}>{categories.length}/5</Text>
        </View>

        <View style={styles.categoriesList}>
          {categories.map((cat) => (
            <View key={cat.id} style={styles.categoryItem}>
              {editingId === cat.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={styles.editInput} value={editName}
                    onChangeText={setEditName} autoFocus
                    onSubmitEditing={() => saveEdit(cat.id)}
                  />
                  <Pressable hitSlop={8} onPress={() => saveEdit(cat.id)}>
                    <Feather name="check" size={16} color={Colors.success} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => setEditingId(null)}>
                    <Feather name="x" size={16} color={Colors.textTertiary} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  <View style={styles.categoryActions}>
                    <Pressable hitSlop={8} onPress={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                      <Feather name="edit-2" size={14} color={Colors.textTertiary} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => deleteCategory(cat.id)}>
                      <Feather name="trash-2" size={14} color={Colors.error} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}

          {categories.length < 5 && (
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Add a category..."
                placeholderTextColor={Colors.textTertiary}
                value={newCategory}
                onChangeText={setNewCategory}
                onSubmitEditing={addCategory}
              />
              <Pressable
                style={[styles.addButton, !newCategory.trim() && styles.disabled]}
                onPress={addCategory} disabled={!newCategory.trim()}
              >
                <Feather name="plus" size={16} color={Colors.textInverse} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingsList}>
          {[
            { icon: 'heart', label: 'Coaching Style', value: profile?.coaching_style },
            { icon: 'clock', label: 'Daily Time', value: profile?.daily_time_commitment },
          ].map((s, i) => (
            <View key={i} style={[styles.settingRow, i < 1 && styles.settingRowBorder]}>
              <View style={styles.settingLeft}>
                <Feather name={s.icon as any} size={15} color={Colors.textSecondary} />
                <Text style={styles.settingLabel}>{s.label}</Text>
              </View>
              <Text style={styles.settingValue}>{s.value || 'Not set'}</Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable
        style={[styles.signOutButton, signingOut && styles.disabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <Feather name="log-out" size={16} color={Colors.error} />
        <Text style={styles.signOutText}>{signingOut ? 'Signing out...' : 'Sign Out'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text, marginBottom: Spacing.lg },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarChar: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg, color: Colors.textInverse },
  profileInfo: { flex: 1 },
  email: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.text },
  statusBadge: {
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: 4,
  },
  statusBadgePremium: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusText: { fontFamily: 'Inter-Medium', fontSize: 10, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusTextPremium: { color: Colors.textInverse },

  section: { marginBottom: Spacing.xl },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary, marginBottom: Spacing.md },
  sectionCount: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textTertiary },

  goalSelector: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  goalOption: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.md,
  },
  goalOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  goalOptionNum: { fontFamily: 'Inter-Bold', fontSize: FontSize.md, color: Colors.text },
  goalOptionNumSelected: { color: Colors.textInverse },
  goalOptionLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary },
  goalOptionLabelSelected: { color: 'rgba(255,255,255,0.6)' },

  streakStatus: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  streakStatusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  streakStatusLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textSecondary },
  streakStatusValue: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, color: Colors.text },
  streakBar: {
    height: 4, backgroundColor: Colors.borderLight,
    borderRadius: BorderRadius.full, overflow: 'hidden',
  },
  streakBarFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: BorderRadius.full },

  freezeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  freezeInfo: { flex: 1 },
  freezeTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.sm, color: Colors.text },
  freezeDesc: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  freezeRight: { alignItems: 'center', minWidth: 28 },
  freezeCount: { fontFamily: 'Inter-Bold', fontSize: FontSize.md, color: Colors.text },
  freezeCountLabel: { fontFamily: 'Inter-Regular', fontSize: 9, color: Colors.textTertiary },
  freezeButton: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
  },
  freezeButtonText: { fontFamily: 'Inter-Medium', fontSize: FontSize.xs, color: Colors.textInverse },

  categoriesList: { gap: Spacing.sm },
  categoryItem: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryName: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.text, textTransform: 'capitalize' },
  categoryActions: { flexDirection: 'row', gap: Spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  editInput: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text,
    borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 2,
  },
  addRow: { flexDirection: 'row', gap: Spacing.sm },
  addInput: {
    flex: 1, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text,
  },
  addButton: {
    width: 38, height: 38, borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  disabled: { opacity: 0.4 },

  settingsList: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight,
    borderRadius: BorderRadius.lg, overflow: 'hidden',
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  settingLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.text },
  settingValue: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, color: Colors.textSecondary, textTransform: 'capitalize' },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: 14, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: `${Colors.error}30`,
  },
  signOutText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, color: Colors.error },
});
