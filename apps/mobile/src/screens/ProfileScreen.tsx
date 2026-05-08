import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { useAuthStore } from '../store/auth-store';
import { registerForPushNotifications } from '../services/notifications';
import type { UserProfile } from '../types';

export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<UserProfile>('/user/profile');
        setProfile(data);
      } catch {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleEnableNotifications = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      Alert.alert('Success', 'Push notifications enabled');
    } else {
      Alert.alert(
        'Info',
        'Could not enable notifications. Make sure you are on a physical device.',
      );
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || profile?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'StoxPulse User'}</Text>
        <Text style={styles.email}>{profile?.email}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{profile?.watchlistCount ?? 0}</Text>
            <Text style={styles.statLabel}>Stocks Watched</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.actionBtn} onPress={handleEnableNotifications}>
          <View style={[styles.actionIcon, { backgroundColor: '#3b82f620' }]}>
            <Ionicons name="notifications-outline" size={20} color="#3b82f6" />
          </View>
          <Text style={styles.actionText}>Enable Push Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleLogout}>
          <View style={[styles.actionIcon, { backgroundColor: '#ef444420' }]}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </View>
          <Text style={[styles.actionText, { color: '#ef4444' }]}>Log Out</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </Pressable>
      </View>

      <Text style={styles.version}>StoxPulse v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  name: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 16,
  },
  statBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    color: '#3b82f6',
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginHorizontal: 16,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  version: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 24,
  },
});
