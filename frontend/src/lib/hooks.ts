import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchHabits,
    fetchHabitsForDate,
    createHabit,
    deleteHabit,
    toggleHabit,
    toggleSubHabit,
    fetchAnalytics,
    fetchAISummary,
    fetchAIInsights,
    fetchAISuggestions,
    parseHabitFromText,
    fetchAIForecast,
    fetchMotivationalQuote,
    sendChatMessage,
} from './queries';

// ── Query Keys ──────────────────────────────────────────────
export const queryKeys = {
    habits: ['habits'] as const,
    habitsByDate: (date: string) => ['habits', 'date', date] as const,
    calendar: (month: number, year: number) => ['calendar', month, year] as const,
    stats: (range: string) => ['stats', range] as const,
    aiSummary: (range: string) => ['ai', 'summary', range] as const,
    aiInsights: (range: string) => ['ai', 'insights', range] as const,
    aiSuggestions: ['ai', 'suggestions'] as const,
    aiCategorize: ['ai', 'categorize'] as const,
    aiForecast: ['ai', 'forecast'] as const,
    aiQuote: ['ai', 'quote'] as const,
};

// ── Queries ─────────────────────────────────────────────────
export function useHabits() {
    return useQuery({
        queryKey: queryKeys.habits,
        queryFn: () => fetchHabits(),
    });
}

export function useHabitsByDate(date: string) {
    return useQuery({
        queryKey: queryKeys.habitsByDate(date),
        queryFn: async () => (await fetchHabitsForDate(date)),
        enabled: !!date,
    });
}

export function useStats(range: string) {
    return useQuery({
        queryKey: queryKeys.stats(range),
        queryFn: async () => (await fetchAnalytics(range)),
    });
}

// ── Mutations ───────────────────────────────────────────────
export function useCreateHabit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => createHabit(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            qc.invalidateQueries({ queryKey: ['calendar'] });
        },
    });
}

export function useDeleteHabit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteHabit(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            qc.invalidateQueries({ queryKey: ['calendar'] });
        },
    });
}

export function useToggleHabit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, date, completed }: { id: string; date: string; completed: boolean }) => toggleHabit(id, date, completed),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            qc.invalidateQueries({ queryKey: ['calendar'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
        },
    });
}

export function useToggleSubHabit() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, date, completed }: { id: string; date: string; completed: boolean }) => toggleSubHabit(id, date, completed),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['habits'] });
            qc.invalidateQueries({ queryKey: ['calendar'] });
            qc.invalidateQueries({ queryKey: ['stats'] });
        },
    });
}

// ── AI Coaching Queries ─────────────────────────────────────
const AI_STALE_TIME = 60 * 60 * 1000; // 1 hour

export function useAISummary(range: string) {
    return useQuery({
        queryKey: queryKeys.aiSummary(range),
        queryFn: () => fetchAISummary(range),
        staleTime: AI_STALE_TIME,
        retry: 1,
    });
}

export function useAIInsights(range: string) {
    return useQuery({
        queryKey: queryKeys.aiInsights(range),
        queryFn: () => fetchAIInsights(range),
        staleTime: AI_STALE_TIME,
        retry: 1,
    });
}

export function useAISuggestions() {
    return useQuery({
        queryKey: queryKeys.aiSuggestions,
        queryFn: async () => (await fetchAISuggestions()),
        staleTime: AI_STALE_TIME,
        retry: 1,
    });
}

export function useAIForecast() {
    return useQuery({
        queryKey: queryKeys.aiForecast,
        queryFn: async () => (await fetchAIForecast()),
        staleTime: AI_STALE_TIME,
        retry: 1,
    });
}

export function useMotivationalQuote() {
    return useQuery({
        queryKey: queryKeys.aiQuote,
        queryFn: async () => (await fetchMotivationalQuote()),
        staleTime: AI_STALE_TIME,
        retry: 1,
    });
}

// ── AI Mutations ────────────────────────────────────────────
export function useParseHabitNLP() {
    return useMutation({
        mutationFn: async (text: string) => (await parseHabitFromText(text)),
    });
}

export function useAIChat() {
    return useMutation({
        mutationFn: async (message: string) => (await sendChatMessage(message)),
    });
}
