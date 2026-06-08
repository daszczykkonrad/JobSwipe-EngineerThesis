// frontend/src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:8000/api'; // change to your server IP when testing on device

async function getToken() {
  return await AsyncStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function register(payload) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await AsyncStorage.setItem('token', data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function logout() {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

// ─── LISTINGS ─────────────────────────────────────────────────────────────────

export async function getListingsFeed(filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/listings/feed${params ? '?' + params : ''}`);
}

export async function createListing(payload) {
  return request('/listings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── SWIPES ───────────────────────────────────────────────────────────────────

export async function recordSwipe(listingId, direction) {
  return request('/swipes', {
    method: 'POST',
    body: JSON.stringify({ listing_id: listingId, direction }),
  });
}

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

export async function submitApplication(listingId, message, aiGenerated = false) {
  return request('/applications', {
    method: 'POST',
    body: JSON.stringify({
      listing_id: listingId,
      message,
      ai_generated: aiGenerated,
    }),
  });
}

export async function getMyApplications() {
  return request('/applications/mine');
}

export async function getListingApplications(listingId) {
  return request(`/applications/listing/${listingId}`);
}

export async function updateApplicationStatus(applicationId, status) {
  return request(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── AI MESSAGE GENERATOR ─────────────────────────────────────────────────────
// This calls your own backend AI endpoint (see backend/routes/ai.js)

export async function generateAIMessage(listing) {
  const data = await request('/ai/generate-message', {
    method: 'POST',
    body: JSON.stringify({ listing }),
  });
  return data.message;
}
