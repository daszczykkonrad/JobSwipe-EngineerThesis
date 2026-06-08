// frontend/src/components/ApplyModal.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { generateAIMessage, submitApplication } from '../services/api';

export default function ApplyModal({ visible, listing, onClose }) {
  const [message, setMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  async function handleGenerateAI() {
    if (!listing) return;
    setAiLoading(true);
    try {
      const generated = await generateAIMessage(listing);
      setMessage(generated);
      setAiUsed(true);
    } catch (err) {
      Alert.alert('Error', 'Could not generate message. Please write one manually.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    if (!message.trim()) {
      Alert.alert('Missing message', 'Please write or generate an application message.');
      return;
    }
    setSubmitting(true);
    try {
      await submitApplication(listing.id, message, aiUsed);
      Alert.alert('Applied!', 'Your application has been sent successfully.');
      setMessage('');
      setAiUsed(false);
      onClose();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not submit application.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setMessage('');
    setAiUsed(false);
    onClose();
  }

  if (!listing) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Apply for this job</Text>
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Listing summary */}
            <View style={styles.listingSummary}>
              <Text style={styles.listingTitle}>{listing.title}</Text>
              <Text style={styles.listingEmployer}>{listing.employer_name}</Text>
            </View>

            {/* AI button */}
            <TouchableOpacity
              style={styles.aiButton}
              onPress={handleGenerateAI}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.aiButtonText}>✨  Generate message with AI</Text>
              )}
            </TouchableOpacity>

            {aiUsed && (
              <Text style={styles.aiNote}>
                AI-generated — feel free to edit before sending
              </Text>
            )}

            <Text style={styles.label}>Your application message</Text>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={8}
              placeholder="Write why you're a good fit for this job..."
              value={message}
              onChangeText={text => { setMessage(text); setAiUsed(false); }}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Send Application</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  closeBtn: { fontSize: 20, color: '#6B7280', padding: 4 },
  listingSummary: {
    backgroundColor: '#F9FAFB', borderRadius: 12,
    padding: 14, marginBottom: 20,
  },
  listingTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 4 },
  listingEmployer: { fontSize: 13, color: '#6B7280' },
  aiButton: {
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: 8,
  },
  aiButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  aiNote: { fontSize: 12, color: '#7C3AED', marginBottom: 12, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 14, fontSize: 15, color: '#111', minHeight: 160,
    marginBottom: 20, backgroundColor: '#FAFAFA',
  },
  submitButton: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 8,
  },
  submitDisabled: { backgroundColor: '#A5B4FC' },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
