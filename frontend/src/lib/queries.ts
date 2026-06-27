import api, { setTokens, clearTokens, BASE_URL } from './api';

export interface User {
    id: string;
    firstName: string;
    lastName?: string;
    email: string;
    experiencePoints: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    createdAt: string;
    avatarUpdatedAt?: string | null;
    badges: Array<{ id: string; earnedAt: string; badge: { name: string; icon: string; description: string } }>;
    quests: Array<{ id: string; title: string; description: string; xpReward: number; isCompleted: boolean }>;
}

// ─── Auth ──────────────────────────────────────────────────────────

export async function register(data: { firstName: string; lastName?: string; email: string; password: string }) {
    const res = await api.post('/auth/register', data);
    const { user, accessToken, refreshToken } = res.data.data;
    setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
}

export async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = res.data.data;
    setTokens(accessToken, refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return user;
}

export async function logout() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => { });
    clearTokens();
}

export async function logoutAllDevices() {
    await api.post('/auth/logout-all');
}

// ─── Profile ───────────────────────────────────────────────────────

export async function fetchProfile(): Promise<User> {
    const res = await api.get('/profile/me');
    return res.data.data;
}

export async function updateProfile(data: { firstName?: string; lastName?: string | null; email?: string }) {
    const res = await api.patch('/profile', data);
    return res.data.data;
}

export async function changePassword(data: { currentPassword: string; newPassword: string }) {
    const res = await api.patch('/profile/password', data);
    return res.data;
}

export async function deleteAccount() {
    await api.delete('/profile');
}

export async function uploadAvatar(file: File) {
    const fd = new FormData();
    fd.append('avatar', file);
    const res = await api.post('/profile/avatar', fd);
    return res.data.data;
}

// Public avatar URL for use in <img src>. `v` (avatarUpdatedAt) busts the cache.
export function avatarUrl(userId: string, v?: string | null): string {
    return `${BASE_URL}/profile/avatar/${userId}${v ? `?v=${encodeURIComponent(v)}` : ''}`;
}

// ─── Habits ────────────────────────────────────────────────────────

export async function fetchHabits(includeArchived = false) {
    const res = await api.get('/habits', { params: { includeArchived } });
    return res.data.data;
}

export async function fetchHabitsForDate(date: string) {
    const res = await api.get(`/habits/day/${date}`);
    return res.data.data;
}

export async function fetchHabit(id: string) {
    const res = await api.get(`/habits/${id}`);
    return res.data.data;
}

export async function createHabit(data: any) {
    const res = await api.post('/habits', data);
    return res.data.data;
}

export async function updateHabit(id: string, data: any) {
    const res = await api.put(`/habits/${id}`, data);
    return res.data.data;
}

export async function deleteHabit(id: string) {
    await api.delete(`/habits/${id}`);
}

export async function toggleHabit(habitId: string, date: string, completed: boolean) {
    const res = await api.post(`/habits/${habitId}/toggle`, { date, completed });
    return res.data.data;
}

export async function toggleSubHabit(subHabitId: string, date: string, completed: boolean) {
    const res = await api.post(`/habits/sub/${subHabitId}/toggle`, { date, completed });
    return res.data.data;
}

// ─── Analytics ─────────────────────────────────────────────────────

export async function fetchAnalytics(range: string) {
    const res = await api.get('/analytics', { params: { range } });
    return res.data.data;
}

export async function fetchMoodCorrelation() {
    const res = await api.get('/analytics/mood-correlation');
    return res.data.data;
}

export async function upsertMood(data: { date: string; mood: number; energy: number; note?: string }) {
    const res = await api.post('/analytics/mood', data);
    return res.data.data;
}

// ─── AI ────────────────────────────────────────────────────────────

export async function fetchAISummary(range = 'month') {
    const res = await api.get('/ai/summary', { params: { range } });
    return res.data.data;
}

export async function fetchAIInsights(range = 'month') {
    const res = await api.get('/ai/insights', { params: { range } });
    return res.data.data;
}

export async function fetchAISuggestions() {
    const res = await api.get('/ai/suggestions');
    return res.data.data;
}

export async function fetchAIForecast() {
    const res = await api.get('/ai/forecast');
    return res.data.data;
}

export async function fetchMotivationalQuote() {
    const res = await api.get('/ai/quote');
    return res.data.data;
}

export async function sendChatMessage(message: string) {
    const res = await api.post('/ai/chat', { message });
    return res.data.data;
}

export async function parseHabitFromText(text: string) {
    const res = await api.post('/ai/parse-habit', { text });
    return res.data.data;
}

export async function fetchChatHistory() {
    const res = await api.get('/profile/chat-history');
    return res.data.data;
}

export async function generateAIQuests() {
    const res = await api.get('/ai/quests/generate');
    return res.data.data;
}

export async function saveQuests(quests: any[]) {
    const res = await api.post('/profile/quests', { quests });
    return res.data.data;
}
