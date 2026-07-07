import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSize } from '@/lib/constants';
import { Feather } from '@expo/vector-icons';

export default function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode: string }>();
  const { signIn, signUp } = useAuth();

  const [isSignUp, setIsSignUp] = useState(params.mode !== 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(null);
    setLoading(true);

    const result = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    setLoading(false);
    if (result.error) { setError(result.error); return; }

    if (isSignUp) {
      router.replace('/onboarding');
    } else {
      router.replace('/');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Colors.text} />
        </Pressable>

        <Text style={styles.title}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Start your self-improvement journey' : 'Continue your growth journey'}
        </Text>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={14} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Pressable
            style={[styles.submitButton, loading && styles.disabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable style={styles.switchMode} onPress={() => { setIsSignUp(!isSignUp); setError(null); }}>
            <Text style={styles.switchModeText}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  scrollContent: { flexGrow: 1, paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surfaceElevated, justifyContent: 'center',
    alignItems: 'center', marginBottom: Spacing.xl,
  },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSize.xxl, color: Colors.text, marginBottom: Spacing.xs },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  form: { gap: Spacing.md },
  errorContainer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: '#FFF0EE', padding: Spacing.md, borderRadius: BorderRadius.sm,
  },
  errorText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.error, flex: 1 },
  inputGroup: { gap: 6 },
  label: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.text },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontFamily: 'Inter-Regular', fontSize: FontSize.md, color: Colors.text,
  },
  submitButton: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xs,
  },
  disabled: { opacity: 0.5 },
  submitButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSize.md, color: Colors.textInverse },
  switchMode: { paddingVertical: Spacing.sm, alignItems: 'center' },
  switchModeText: { fontFamily: 'Inter-Medium', fontSize: FontSize.sm, color: Colors.textSecondary },
});
