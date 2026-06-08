// frontend/src/screens/SwipeScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  ActivityIndicator, TouchableOpacity, Dimensions, Alert
} from 'react-native';
import { getListingsFeed, recordSwipe } from '../services/api';
import ApplyModal from '../components/ApplyModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export default function SwipeScreen() {
  const [listings, setListings] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    try {
      setLoading(true);
      const data = await getListingsFeed();
      setListings(data);
    } catch (err) {
      Alert.alert('Error', 'Could not load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        swipeRight();
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        swipeLeft();
      } else {
        resetPosition();
      }
    },
  });

  function resetPosition() {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  }

  function swipeRight() {
    Animated.timing(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      handleSwipe('right');
    });
  }

  function swipeLeft() {
    Animated.timing(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      handleSwipe('left');
    });
  }

  async function handleSwipe(direction) {
    const listing = listings[currentIndex];
    if (!listing) return;

    try {
      await recordSwipe(listing.id, direction);
    } catch (err) {
      console.error('Swipe record error:', err);
    }

    if (direction === 'right') {
      setSelectedListing(listing);
      setApplyModalVisible(true);
    }

    position.setValue({ x: 0, y: 0 });
    setCurrentIndex(prev => prev + 1);
  }

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardStyle = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const currentListing = listings[currentIndex];

  if (!currentListing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No more listings right now</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchFeed}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const categoryColors = {
    garden: '#16A34A', cleaning: '#2563EB', moving: '#D97706',
    delivery: '#7C3AED', repairs: '#DC2626', tutoring: '#0891B2',
    it: '#4F46E5', design: '#DB2777', other: '#6B7280',
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>JobSwipe</Text>

      <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
        {/* LIKE / NOPE overlays */}
        <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
          <Text style={styles.stampText}>APPLY</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
          <Text style={styles.stampText}>SKIP</Text>
        </Animated.View>

        {/* Category badge */}
        <View style={[styles.badge, { backgroundColor: categoryColors[currentListing.category] || '#6B7280' }]}>
          <Text style={styles.badgeText}>{currentListing.category.toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>{currentListing.title}</Text>
        <Text style={styles.employer}>Posted by {currentListing.employer_name}</Text>

        {currentListing.location ? (
          <Text style={styles.location}>📍 {currentListing.location}</Text>
        ) : null}

        {currentListing.is_remote ? (
          <Text style={styles.remote}>🌐 Remote</Text>
        ) : null}

        <Text style={styles.description} numberOfLines={6}>
          {currentListing.description}
        </Text>

        {currentListing.pay_amount ? (
          <View style={styles.pay}>
            <Text style={styles.payText}>
              💰 {currentListing.pay_amount} PLN
              {currentListing.pay_type === 'hourly' ? '/hr' : currentListing.pay_type === 'fixed' ? ' fixed' : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.pay}>
            <Text style={styles.payText}>💰 Negotiable</Text>
          </View>
        )}
      </Animated.View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, styles.skipButton]} onPress={swipeLeft}>
          <Text style={styles.skipIcon}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.applyButton]} onPress={swipeRight}>
          <Text style={styles.applyIcon}>✓</Text>
        </TouchableOpacity>
      </View>

      <ApplyModal
        visible={applyModalVisible}
        listing={selectedListing}
        onClose={() => setApplyModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: '700', color: '#4F46E5', marginTop: 50, marginBottom: 20 },
  card: {
    width: SCREEN_WIDTH - 40, backgroundColor: '#fff',
    borderRadius: 16, padding: 24, minHeight: 420,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 6,
    marginBottom: 24,
  },
  stamp: {
    position: 'absolute', top: 24, borderWidth: 4,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, zIndex: 10,
  },
  likeStamp: { right: 24, borderColor: '#16A34A' },
  nopeStamp: { left: 24, borderColor: '#DC2626' },
  stampText: { fontSize: 22, fontWeight: '900', color: 'inherit' },
  badge: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 6 },
  employer: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  location: { fontSize: 14, color: '#4B5563', marginBottom: 4 },
  remote: { fontSize: 14, color: '#2563EB', marginBottom: 8 },
  description: { fontSize: 15, color: '#374151', lineHeight: 22, marginTop: 8, marginBottom: 16 },
  pay: {
    backgroundColor: '#F0FDF4', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start',
  },
  payText: { fontSize: 15, fontWeight: '600', color: '#15803D' },
  buttons: { flexDirection: 'row', gap: 40 },
  button: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  skipButton: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#DC2626' },
  applyButton: { backgroundColor: '#4F46E5' },
  skipIcon: { fontSize: 26, color: '#DC2626', fontWeight: '700' },
  applyIcon: { fontSize: 26, color: '#fff', fontWeight: '700' },
  emptyText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  refreshButton: { backgroundColor: '#4F46E5', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  refreshText: { color: '#fff', fontWeight: '600' },
});
