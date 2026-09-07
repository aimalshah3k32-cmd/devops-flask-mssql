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
  ScrollView,
  Alert
} from 'react-native';

const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [notification, setNotification] = useState('');
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    checkHealth();
    fetchTasks();
  }, [apiUrl]);

  const showMsg = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 4000);
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setHealthStatus({
          status: 'degraded',
          database_status: data.database_status || 'disconnected',
          error: data.error || `HTTP ${res.status}`
        });
      }
    } catch (err) {
      setHealthStatus({
        status: 'offline',
        database_status: 'disconnected',
        error: err.message || 'Cannot reach backend'
      });
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Could not fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!title.trim()) {
      showMsg('⚠️ Please enter a Task Title');
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          status: 'Pending'
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTitle('');
        setDescription('');
        showMsg('✅ Task created successfully in SQL Server!');
        fetchTasks();
        checkHealth();
      } else {
        showMsg(`❌ ${data.error || 'Failed to create task'}`);
      }
    } catch (err) {
      showMsg(`❌ Network Error: ${err.message}`);
    }
  };

  const handleToggleStatus = async (task) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: nextStatus
        }),
      });

      if (res.ok) {
        showMsg(`✅ Task marked as ${nextStatus}`);
        fetchTasks();
      } else {
        showMsg('❌ Failed to update task');
      }
    } catch (err) {
      showMsg(`❌ Network Error: ${err.message}`);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`${apiUrl}/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        showMsg(`🗑️ Task #${taskId} deleted`);
        fetchTasks();
      } else {
        showMsg('❌ Failed to delete task');
      }
    } catch (err) {
      showMsg(`❌ Network Error: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'All') return true;
    return t.status === filter;
  });

  const isHealthy = healthStatus?.status === 'healthy';
  const isDbConnected = healthStatus?.database_status === 'connected';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DevOps Task Hub</Text>
        <Text style={styles.headerSubtitle}>React Native ↔ Flask API ↔ MSSQL 2022</Text>
        <Text style={styles.apiEndpointBadge}>{apiUrl}</Text>
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
            <View style={[styles.badge, isHealthy ? styles.badgeSuccess : styles.badgeDanger]}>
              <Text style={styles.badgeText}>{healthStatus?.status || 'checking...'}</Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>SQL Server</Text>
            <View style={[styles.badge, isDbConnected ? styles.badgeSuccess : styles.badgeDanger]}>
              <Text style={styles.badgeText}>{healthStatus?.database_status || 'checking...'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => { checkHealth(); fetchTasks(); }}
          >
            <Text style={styles.buttonText}>🔄 Refresh Status & Tasks</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>➕ Create New Task</Text>
        <TextInput
          style={styles.input}
          placeholder="Task Title (e.g. Setup CI/CD Pipeline)"
          placeholderTextColor="#64748b"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { height: 60 }]}
          placeholder="Description (optional)"
          placeholderTextColor="#64748b"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TouchableOpacity style={styles.submitButton} onPress={handleAddTask}>
          <Text style={styles.submitButtonText}>+ Save Task to Database</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {['All', 'Pending', 'Completed'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f} ({f === 'All' ? tasks.length : tasks.filter(t => t.status === f).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks List */}
      <View style={styles.listContainer}>
        <Text style={styles.cardTitle}>📋 Task List ({filteredTasks.length})</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 20 }} />
        ) : filteredTasks.length === 0 ? (
          <Text style={styles.emptyText}>
            {tasks.length === 0
              ? 'No tasks found. Create one above!'
              : `No tasks with status "${filter}".`}
          </Text>
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => (item.id || Math.random()).toString()}
            renderItem={({ item }) => (
              <View style={styles.taskItem}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    item.status === 'Completed' && styles.checkboxCompleted
                  ]}
                  onPress={() => handleToggleStatus(item)}
                >
                  <Text style={styles.checkboxText}>
                    {item.status === 'Completed' ? '✓' : ''}
                  </Text>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.taskTitle,
                      item.status === 'Completed' && styles.taskTitleCompleted
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={styles.taskDescription}>{item.description}</Text>
                  ) : null}
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.taskIdBadge}>#{item.id}</Text>
                    <Text
                      style={[
                        styles.taskStatusBadge,
                        item.status === 'Completed'
                          ? styles.statusCompletedBadge
                          : styles.statusPendingBadge
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTask(item.id)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
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
    backgroundColor: '#0b1120',
    padding: 16,
  },
  header: {
    marginBottom: 12,
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
    marginTop: 2,
  },
  apiEndpointBadge: {
    marginTop: 4,
    fontSize: 11,
    color: '#38bdf8',
    backgroundColor: '#0369a130',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  notificationBanner: {
    backgroundColor: '#1e293b',
    borderColor: '#38bdf8',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '600',
  },
  badge: {
    paddingVertical: 3,
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
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#334155',
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
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
  },
  taskItem: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  taskTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskDescription: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  taskIdBadge: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#0369a120',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  taskStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusPendingBadge: {
    backgroundColor: '#eab30820',
    color: '#eab308',
  },
  statusCompletedBadge: {
    backgroundColor: '#05966920',
    color: '#34d399',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
