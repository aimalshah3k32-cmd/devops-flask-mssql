import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView
} from 'react-native';

const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [notification, setNotification] = useState('');

  useEffect(() => {
    checkHealth();
    fetchUsers();
  }, [apiUrl]);

  const showMsg = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/health`);
      const data = await res.json();
      setHealthStatus(data);
    } catch (err) {
      setHealthStatus({ status: 'offline', database_status: 'disconnected', error: err.message });
    }
  };

  const handleInitDb = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/init-db`);
      const data = await res.json();
      if (res.ok) {
        showMsg('✅ Users table initialized in SQL Server!');
        fetchUsers();
      } else {
        showMsg(`❌ ${data.error || 'Failed to initialize DB'}`);
      }
    } catch (err) {
      showMsg(`❌ Network Error: ${err.message}`);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.warn('Could not fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!name.trim() || !email.trim()) {
      showMsg('⚠️ Please enter both Name and Email');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setName('');
        setEmail('');
        showMsg('✅ User saved to SQL Server!');
        fetchUsers();
      } else {
        showMsg(`❌ ${data.error || 'Failed to save user'}`);
      }
    } catch (err) {
      showMsg(`❌ Network Error: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DevOps App</Text>
        <Text style={styles.headerSubtitle}>Flask Container ↔ Windows Host SQL Server</Text>
      </View>

      {/* Notification Banner */}
      {notification ? (
        <View style={styles.notificationBanner}>
          <Text style={styles.notificationText}>{notification}</Text>
        </View>
      ) : null}

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Backend API</Text>
            <View style={[styles.badge, healthStatus?.status === 'healthy' ? styles.badgeSuccess : styles.badgeDanger]}>
              <Text style={styles.badgeText}>{healthStatus?.status || 'checking...'}</Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Host SQL Server</Text>
            <View style={[styles.badge, healthStatus?.database_status === 'connected' ? styles.badgeSuccess : styles.badgeDanger]}>
              <Text style={styles.badgeText}>{healthStatus?.database_status || 'checking...'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.refreshButton} onPress={() => { checkHealth(); fetchUsers(); }}>
            <Text style={styles.buttonText}>🔄 Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.initDbButton} onPress={handleInitDb}>
            <Text style={styles.buttonText}>⚡ Init Table</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>Add User to SQL Server</Text>
        <TextInput
          style={styles.input}
          placeholder="User Name (e.g. John Doe)"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Address (e.g. john@example.com)"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleAddUser}>
          <Text style={styles.submitButtonText}>+ Save User</Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <View style={styles.listContainer}>
        <Text style={styles.cardTitle}>Users in SQL Server ({users.length})</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
        ) : users.length === 0 ? (
          <Text style={styles.emptyText}>No users found. Click 'Init Table' or add one above!</Text>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            renderItem={({ item }) => (
              <View style={styles.userItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.name || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                {item.id ? <Text style={styles.userIdBadge}>#{item.id}</Text> : null}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    marginBottom: 14,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  notificationBanner: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  notificationText: {
    color: '#f8fafc',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '600',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: '#059669',
  },
  badgeDanger: {
    backgroundColor: '#dc2626',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  initDbButton: {
    flex: 1,
    backgroundColor: '#0369a1',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
  },
  userItem: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  userName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  userIdBadge: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: '#0369a120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
