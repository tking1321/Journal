import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Switch, Platform, Linking } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { usePurchases } from '@/contexts/PurchasesContext';
import { supabase } from '@/lib/supabase';
import { Spacing, BorderRadius, FontSize, getLevelIcon, LEGAL_URLS } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

interface Category {
  id: string;
  name: string;
  growth_description: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { isProActive, presentPaywall, presentCustomerCenter, restorePurchases } = usePurchases();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  const loadCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('categories').select('*').order('created_at');
    setCategories(data || []);
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
      router.replace('/auth');
    }
  }

  async function handleRestorePurchases() {
    if (!isNative || restoringPurchases) return;
    setRestoringPurchases(true);
    try {
      await restorePurchases();
    } finally {
      setRestoringPurchases(false);
    }
  }

  const rcActive = isNative && isProActive;
  const dbStatus = profile?.subscription_status || 'free';
  const isPremium = rcActive || dbStatus === 'active' || dbStatus === 'trial' || dbStatus === 'lifetime';
  const userLevel = profile?.user_level ?? 1;
  const levelIcon = getLevelIcon(userLevel);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

      <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={[styles.avatarChar, { color: colors.textInverse }]}>{user?.email?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.email, { color: colors.text }]} numberOfLines={1}>{user?.email}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
            isPremium && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}>
            <Text style={[
              styles.statusText,
              { color: colors.textSecondary },
              isPremium && { color: colors.textInverse },
            ]}>
              {rcActive ? 'Diverge Pro' : (isPremium ? 'Premium' : 'Free')}
              {dbStatus === 'trial' && !rcActive ? ` · ${profile?.trial_start_date ? Math.max(0, 7 - Math.floor((Date.now() - new Date(profile.trial_start_date).getTime()) / 86400000)) : 7}d left` : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: levelIcon.color + '18', borderColor: levelIcon.color + '40' }]}>
          <Feather name={levelIcon.icon as any} size={13} color={levelIcon.color} />
          <Text style={[styles.levelBadgeText, { color: levelIcon.color }]}>{userLevel >= 100 ? 'Max Level' : `Lv ${userLevel}`}</Text>
        </View>
      </View>

      {/* Subscription Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription</Text>
        <View style={[styles.settingsList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {isPremium ? (
            isNative ? (
              <Pressable
                style={styles.settingRow}
                onPress={presentCustomerCenter}
              >
                <View style={styles.settingLeft}>
                  <Feather name="credit-card" size={15} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Manage Subscription</Text>
                </View>
                <Feather name="chevron-right" size={15} color={colors.textTertiary} />
              </Pressable>
            ) : (
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Feather name="credit-card" size={15} color={colors.textSecondary} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Subscription Active</Text>
                </View>
                <Text style={[styles.settingValue, { color: colors.textSecondary }]}>Premium</Text>
              </View>
            )
          ) : (
            <Pressable
              style={styles.settingRow}
              onPress={isNative ? () => presentPaywall() : () => router.push('/paywall')}
            >
              <View style={styles.settingLeft}>
                <Feather name="star" size={15} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>Upgrade to Pro</Text>
              </View>
              <Feather name="chevron-right" size={15} color={colors.textTertiary} />
            </Pressable>
          )}
          {isNative && (
            <Pressable
              style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
              onPress={handleRestorePurchases}
              disabled={restoringPurchases}
            >
              <View style={styles.settingLeft}>
                <Feather name="refresh-cw" size={15} color={colors.textSecondary} />
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {restoringPurchases ? 'Restoring...' : 'Restore Purchases'}
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Growth Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Growth Categories</Text>
          <Text style={[styles.sectionCount, { color: colors.textTertiary }]}>{categories.length}/5</Text>
        </View>

        <View style={styles.categoriesList}>
          {categories.map((cat) => (
            <View key={cat.id} style={[styles.categoryItem, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              {editingId === cat.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, borderBottomColor: colors.primary }]}
                    value={editName}
                    onChangeText={setEditName}
                    autoFocus
                    onSubmitEditing={() => saveEdit(cat.id)}
                  />
                  <Pressable hitSlop={8} onPress={() => saveEdit(cat.id)}>
                    <Feather name="check" size={16} color={colors.success} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => setEditingId(null)}>
                    <Feather name="x" size={16} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.categoryRow}>
                  <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
                  <View style={styles.categoryActions}>
                    <Pressable hitSlop={8} onPress={() => { setEditingId(cat.id); setEditName(cat.name); }}>
                      <Feather name="edit-2" size={14} color={colors.textTertiary} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => deleteCategory(cat.id)}>
                      <Feather name="trash-2" size={14} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ))}

          {categories.length < 5 && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Add a category..."
                placeholderTextColor={colors.textTertiary}
                value={newCategory}
                onChangeText={setNewCategory}
                onSubmitEditing={addCategory}
              />
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }, !newCategory.trim() && styles.disabled]}
                onPress={addCategory}
                disabled={!newCategory.trim()}
              >
                <Feather name="plus" size={16} color={colors.textInverse} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Preferences</Text>
        <View style={[styles.settingsList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Pressable style={styles.settingRow} onPress={() => router.push('/preferences')}>
            <View style={styles.settingLeft}>
              <Feather name="sliders" size={15} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Edit Preferences</Text>
            </View>
            <Feather name="chevron-right" size={15} color={colors.textTertiary} />
          </Pressable>
          <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
            <View style={styles.settingLeft}>
              <Feather name="moon" size={15} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.borderLight, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
      </View>

      {/* Legal */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Legal</Text>
        <View style={[styles.settingsList, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Pressable style={styles.settingRow} onPress={() => Linking.openURL(LEGAL_URLS.privacyPolicy)}>
            <View style={styles.settingLeft}>
              <Feather name="shield" size={15} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Privacy Policy</Text>
            </View>
            <Feather name="external-link" size={14} color={colors.textTertiary} />
          </Pressable>
          <Pressable
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
            onPress={() => Linking.openURL(LEGAL_URLS.termsOfService)}
          >
            <View style={styles.settingLeft}>
              <Feather name="file-text" size={15} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Terms of Service</Text>
            </View>
            <Feather name="external-link" size={14} color={colors.textTertiary} />
          </Pressable>
          <Pressable
            style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.borderLight }]}
            onPress={() => Linking.openURL(LEGAL_URLS.subscriptionTerms)}
          >
            <View style={styles.settingLeft}>
              <Feather name="info" size={15} color={colors.textSecondary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>Subscription Terms</Text>
            </View>
            <Feather name="external-link" size={14} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={[styles.signOutButton, { borderColor: colors.error + '30' }, signingOut && styles.disabled]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        <Feather name="log-out" size={16} color={colors.error} />
        <Text style={[styles.signOutText, { color: colors.error }]}>{signingOut ? 'Signing out...' : 'Sign Out'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: 64, paddingBottom: 100 },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, marginBottom: Spacing.lg },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    borderWidth: 1, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarChar: { fontFamily: 'Inter-Bold', fontSize: FontSize.lg },
  profileInfo: { flex: 1 },
  email: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  statusBadge: {
    borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: 4,
  },
  statusText: { fontFamily: 'Inter-Medium', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  levelBadge: {
    borderWidth: 1, borderRadius: BorderRadius.sm, paddingHorizontal: 7, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  levelBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10 },

  section: { marginBottom: Spacing.xl },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, marginBottom: 4 },
  sectionCount: { fontFamily: 'Inter-Regular', fontSize: FontSize.xs },

  categoriesList: { gap: Spacing.sm },
  categoryItem: {
    borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
  },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryName: { fontFamily: 'Inter-Medium', fontSize: FontSize.md, textTransform: 'capitalize' },
  categoryActions: { flexDirection: 'row', gap: Spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  editInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: FontSize.md, borderBottomWidth: 1, paddingVertical: 2 },
  addRow: { flexDirection: 'row', gap: Spacing.sm },
  addInput: {
    flex: 1, borderWidth: 1, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md,
  },
  addButton: { width: 38, height: 38, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },

  settingsList: { borderWidth: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  settingLabel: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm },
  settingValue: { fontFamily: 'Inter-Regular', fontSize: FontSize.sm, textTransform: 'capitalize' },

  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1,
  },
  signOutText: { fontFamily: 'Inter-Medium', fontSize: FontSize.md },
});
