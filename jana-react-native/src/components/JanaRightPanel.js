import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function JanaRightPanel({ contextEvents = [] }) {
  const scrollViewRef = useRef();

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [contextEvents]);

  const renderEvent = (event, index, isLatest) => {
    const eventType = event.event_type || 'GENERIC_EVENT';
    const payload = event.payload || {};
    const timestampStr = payload.timestamp || new Date().toISOString();
    const time = new Date(timestampStr);
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    let title = 'Update';
    let details = payload.message || 'Action processed.';
    let icon = 'notifications-outline';
    let color = '#008080';

    switch (eventType) {
      case 'MEMBER_VERIFIED':
        title = 'Patient Verified'; icon = 'checkmark-circle-outline'; color = '#2196F3'; break;
      case 'CASE_CREATED':
        title = 'Case Created'; icon = 'folder-open-outline'; color = '#3F51B5'; break;
      case 'APPOINTMENT_BOOKED':
        title = 'Booking Done'; icon = 'calendar-outline'; color = '#673AB7'; break;
      case 'DOCTOR_OUTCOME_GENERATED':
        title = 'Outcome Ready'; icon = 'document-text-outline'; color = '#009688'; break;
      case 'LAB_TEST_SCHEDULED':
        title = 'Tests Booked'; icon = 'flask-outline'; color = '#00BCD4'; break;
      case 'TEST_COMPLETED':
        title = 'Report Ready'; icon = 'document-outline'; color = '#FF5252'; break;
      case 'MEDICINE_DELIVERY_BOOKED':
        title = 'Dispatch Ready'; icon = 'bus-outline'; color = '#FF9800'; break;
      case 'STEP_COMPLETED':
        title = payload.title || 'Step Complete';
        details = payload.message || 'Successfully completed.';
        icon = 'checkmark-circle-outline'; color = '#4CAF50'; break;
      case 'HANDOFF':
        title = payload.title || 'Associate Joined';
        icon = 'headset-outline'; color = '#FF9800'; break;
    }

    return (
      <View key={event.event_id || index} style={[
        styles.eventCard, 
        isLatest && { backgroundColor: color + '15', borderColor: color + '80', borderWidth: 2 }
      ]}>
        <View style={[styles.iconCircle, { backgroundColor: isLatest ? color : color + '20' }]}>
          <Ionicons name={icon} size={isLatest ? 20 : 16} color={isLatest ? '#fff' : color} />
        </View>
        <View style={styles.eventTextContainer}>
          <View style={styles.eventHeader}>
            <Text style={[styles.eventTitle, isLatest && { fontSize: 15 }]}>{title}</Text>
            <Text style={styles.eventTime}>{formattedTime}</Text>
          </View>
          <Text style={[styles.eventDetails, isLatest && { fontSize: 13, color: '#333' }]}>{details}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinical Assistant</Text>
        <Text style={styles.headerSub}>Real-time clinical updates</Text>
      </View>
      <View style={styles.divider} />
      
      {contextEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-outline" size={48} color="#e0e0e0" />
          <Text style={styles.emptyText}>Waiting for updates...</Text>
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.list} 
          contentContainerStyle={styles.listContent}
        >
          {contextEvents.map((ev, i) => renderEvent(ev, i, i === contextEvents.length - 1))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSub: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#95a5a6',
    fontSize: 14,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventTextContainer: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTitle: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#2c3e50',
  },
  eventTime: {
    fontSize: 10,
    color: '#95a5a6',
  },
  eventDetails: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 18,
  }
});
