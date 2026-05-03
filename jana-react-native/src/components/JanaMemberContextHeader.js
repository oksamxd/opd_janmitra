import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import axios from 'axios';
import { getBaseUrl } from '../hooks/useJanaChat';

export default function JanaMemberContextHeader({ sessionId, memberId, t }) {
  const [contextData, setContextData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const baseUrl = getBaseUrl();
  const pollTimerRef = useRef(null);

  const translate = (key) => t ? t(key) : key;

  useEffect(() => {
    fetchContext();
    pollTimerRef.current = setInterval(fetchContext, 3000);
    return () => clearInterval(pollTimerRef.current);
  }, [sessionId]);

  const fetchContext = async () => {
    if (!sessionId) return;
    try {
      const res = await axios.get(`${baseUrl}/api/context/session/${sessionId}`);
      if (res.status === 200) setContextData(res.data);
    } catch (e) {}
  };

  if (!contextData && !sessionId) return <View style={styles.skeletonContainer}><Text style={{color:'rgba(255,255,255,0.3)'}}>{translate('loading_session')}</Text></View>;
  if (!contextData) return <View style={styles.skeletonContainer}><Text style={{color:'rgba(255,255,255,0.3)'}}>{translate('loading_profile')}</Text></View>;

  const member = contextData.member || {};
  const risk = contextData.riskIndicators || {};
  const caseSnap = contextData.caseSnapshot || null;
  const medSummary = contextData.medicalSummary || {};
  const sessionCtx = contextData.session || {};
  const isHumanControlled = sessionCtx.controlledBy === 'HUMAN';

  const riskLevel = risk.level || 'UNKNOWN';
  let riskColor = '#90A4AE';
  if (riskLevel === 'HIGH') riskColor = '#FF5252';
  if (riskLevel === 'MEDIUM') riskColor = '#FF9800';
  if (riskLevel === 'LOW') riskColor = '#4CAF50';

  const name = member.fullName || translate('identifying_member');
  const initials = member.fullName ? member.fullName.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase() : '?';

  return (
    <View style={[styles.container, isHumanControlled ? {borderBottomColor: '#FF9800', borderBottomWidth: 2} : {}]}>
      {isHumanControlled && (
        <View style={styles.janmitraBanner}>
          <Text style={{color: '#FF9800', fontSize: 12, fontWeight: 'bold'}}>👨‍💼 {translate('janmitra_managing')}</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={[styles.avatar, { shadowColor: '#008080' }]}>
          <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>{initials}</Text>
          <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.nameText}>{name}</Text>
          <View style={{flexDirection: 'row', marginTop: 2, flexWrap: 'wrap'}}>
            {member.memberId && <Tag text={`${translate('id')}: ...${member.memberId.slice(-6)}`} color="#37D2E0" />}
            {member.age && <Tag text={`${member.age} ${translate('age')}`} color="#7C83FD" />}
            {member.gender && <Tag text={member.gender} color="#7C83FD" />}
            <Tag text={(sessionCtx.state || 'NEW').replace(/_/g, ' ')} color="#4CAF50" />
          </View>
          {risk.flags && risk.flags.length > 0 && (
            <Text style={{color: '#FF7043', fontSize: 10, marginTop: 4, fontWeight: 'bold'}}>
              {risk.flags.slice(0,2).join(' • ')}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{padding: 8}}>
          <Text style={{color: '#008080', fontWeight: 'bold'}}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.expandedDetails}>
          <View style={{flex: 1, paddingRight: 10}}>
            <Text style={styles.sectionTitle}>📋 {translate('medical_summary')}</Text>
            <SummaryRow label={`🤧 ${translate('allergies')}`} value={medSummary.allergies || 'None recorded'} />
            <SummaryRow label={`💊 ${translate('medications')}`} value={medSummary.currentMedications || 'None'} />
            <SummaryRow label={`⚠️ ${translate('risk')}`} value={riskLevel} />
          </View>
          <View style={{flex: 1, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', paddingLeft: 10}}>
            <Text style={styles.sectionTitle}>📌 {translate('case_snapshot')}</Text>
            {!caseSnap ? (
              <SummaryRow label={translate('status')} value={translate('no_active_case')} />
            ) : (
              <>
                <SummaryRow label={translate('case')} value={`...${caseSnap.caseId.slice(-8)}`} />
                <SummaryRow label={translate('status')} value={caseSnap.status || 'Active'} />
                {caseSnap.assignedDoctor && <SummaryRow label={`👨‍⚕️ ${translate('doctor')}`} value={caseSnap.assignedDoctor.name} />}
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const Tag = ({text, color}) => (
  <View style={{backgroundColor: color+'22', borderColor: color+'66', borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginRight: 4, marginBottom: 2}}>
    <Text style={{color: color, fontSize: 9, fontWeight: 'bold'}}>{text}</Text>
  </View>
);

const SummaryRow = ({label, value}) => (
  <View style={{flexDirection: 'row', marginBottom: 4}}>
    <Text style={{color: '#90A4AE', fontSize: 10, fontWeight: 'bold'}}>{label}: </Text>
    <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 10, flex: 1}}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  skeletonContainer: {
    height: 64, backgroundColor: '#0E1A2B', justifyContent: 'center', paddingHorizontal: 16
  },
  container: {
    backgroundColor: '#0E1A2B', // Dark theme matching flutter
    borderBottomWidth: 1,
    borderBottomColor: '#008080'
  },
  janmitraBanner: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#008080', alignItems: 'center', justifyContent: 'center',
  },
  riskDot: {
    width: 12, height: 12, borderRadius: 6, position: 'absolute', bottom: 0, right: 0, borderWidth: 2, borderColor: '#0E1A2B'
  },
  infoCol: {
    flex: 1, marginLeft: 12,
  },
  nameText: {
    color: '#fff', fontWeight: 'bold', fontSize: 14,
  },
  expandedDetails: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    color: '#37D2E0', fontSize: 11, fontWeight: 'bold', marginBottom: 8
  }
});
