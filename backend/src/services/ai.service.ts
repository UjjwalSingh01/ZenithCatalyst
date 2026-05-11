import { GoogleGenAI } from '@google/genai';
import { env } from '../utils/env';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';
import { getRedis } from '../utils/redis';

// ─── Gemini Client ────────────────────────────────────────────────

const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ─── Redis Cache ──────────────────────────────────────────────────

const CACHE_TTL = 60 * 60; // 1 hour (in seconds for Redis)
const CACHE_PREFIX = 'ai_cache:';

async function getCached<T>(key: string): Promise<T | null> {
    try {
        const raw = await getRedis().get(CACHE_PREFIX + key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch (err) {
        logger.warn({ err, key }, 'Redis cache read failed, proceeding without cache');
        return null;
    }
}

async function setCache(key: string, data: unknown, ttlSeconds = CACHE_TTL): Promise<void> {
    try {
        await getRedis().setex(CACHE_PREFIX + key, ttlSeconds, JSON.stringify(data));
    } catch (err) {
        logger.warn({ err, key }, 'Redis cache write failed');
    }
}

// ─── Core AI Helper ───────────────────────────────────────────────

async function callGemini(systemPrompt: string, userPrompt: string, temperature = 0.7): Promise<string> {
    const model = genai.models;
    const response = await model.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }] }],
        config: { temperature, maxOutputTokens: 2048 },
    });
    return response.text ?? '';
}

function parseJsonResponse(raw: string): unknown {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
}

// ─── Habit Context Builder ─────────────────────────────────────────

export async function buildHabitContext(userId: string, rangeDays: number) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - rangeDays);
    const fromStr = from.toISOString().split('T')[0];
    const toStr = now.toISOString().split('T')[0];

    const habits = await prisma.habit.findMany({
        where: {
            userId, isArchived: false,
            startDate: { lte: toStr },
            OR: [{ endDate: null }, { endDate: { gte: fromStr } }],
        },
        include: {
            subHabits: { include: { dates: { where: { date: { gte: fromStr, lte: toStr } } } } },
            dates: { where: { date: { gte: fromStr, lte: toStr } } },
        },
    });

    const habitStats = habits.map((h) => {
        let completedDays = 0, tempStreak = 0, bestStreak = 0;
        for (let d = 0; d < rangeDays; d++) {
            const dt = new Date(from); dt.setDate(dt.getDate() + d);
            const dStr = dt.toISOString().split('T')[0];
            if (h.startDate > dStr) continue;
            if (h.endDate && h.endDate < dStr) continue;

            let done = false;
            if (h.subHabits.length > 0) {
                done = h.subHabits.every((sh) => sh.dates.some((sd) => sd.date === dStr && sd.completed));
            } else {
                done = h.dates.some((hd) => hd.date === dStr && hd.completed);
            }

            if (done) { completedDays++; tempStreak++; if (tempStreak > bestStreak) bestStreak = tempStreak; }
            else tempStreak = 0;
        }
        const activeDays = Math.max(1, Math.ceil((now.getTime() - new Date(h.startDate).getTime()) / 86400000));
        return {
            name: h.title, description: h.description ?? '', priority: h.priority, category: h.category,
            subHabits: h.subHabits.map((s) => s.content),
            completionRate: Math.round((completedDays / Math.min(rangeDays, activeDays)) * 100),
            completedDays, activeDays, currentStreak: tempStreak, bestStreak,
        };
    });

    return { from: fromStr, to: toStr, totalHabits: habits.length, habits: habitStats };
}

// ─── AI Endpoints ─────────────────────────────────────────────────

export async function getPerformanceSummary(userId: string, range: string) {
    const rangeDays = rangeTodays(range);
    const cacheKey = `summary:${userId}:${range}`;
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return cached;

    const ctx = await buildHabitContext(userId, rangeDays);
    if (ctx.totalHabits === 0) return { summary: 'No habits tracked yet. Start by creating some habits to get personalised insights!' };

    const raw = await callGemini(
        'You are a friendly, encouraging habit coach. Generate a markdown performance summary. Include overall completion rates, best streaks, most consistent habit, biggest improvement area, and an encouraging call to action. Return ONLY a JSON object: {"summary": "...markdown text..."}',
        `Habit data for ${ctx.from} to ${ctx.to}:\n${JSON.stringify(ctx.habits, null, 2)}`
    );
    const data = parseJsonResponse(raw);
    await setCache(cacheKey, data);
    return data;
}

export async function getInsights(userId: string, range: string) {
    const cacheKey = `insights:${userId}:${range}`;
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return cached;

    const ctx = await buildHabitContext(userId, rangeTodays(range));
    if (ctx.totalHabits === 0) return { shortcomings: [], advancements: [] };

    const raw = await callGemini(
        `You are a habit analysis expert. Return ONLY valid JSON:
{"shortcomings": [{"habit":"name","issue":"problem","suggestion":"tip"}], "advancements": [{"habit":"name","achievement":"what went well","encouragement":"positive remark"}]}
Max 5 items each. Be specific and reference actual data.`,
        `Data for ${ctx.from} to ${ctx.to}:\n${JSON.stringify(ctx.habits, null, 2)}`
    );
    const data = parseJsonResponse(raw);
    await setCache(cacheKey, data);
    return data;
}

export async function getSuggestions(userId: string) {
    const cacheKey = `suggestions:${userId}`;
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return cached;

    const ctx = await buildHabitContext(userId, 30);
    const raw = await callGemini(
        `You are a habit coach. Based on existing habits and performance, suggest improvements. Return ONLY valid JSON:
{"suggestions": [{"type":"new_habit"|"modification"|"schedule","title":"short title","description":"detailed suggestion","habitData":{"title":"name","description":"desc","subHabits":["opt1","opt2"]}}]}
Provide 3-5 diverse suggestions.`,
        `Habits:\n${JSON.stringify(ctx.habits, null, 2)}`
    );
    const data = parseJsonResponse(raw);
    await setCache(cacheKey, data, 2 * 60 * 60); // 2 hours
    return data;
}

export async function getCategorization(userId: string) {
    const cacheKey = `categorize:${userId}`;
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return cached;

    const ctx = await buildHabitContext(userId, 30);
    if (ctx.totalHabits === 0) return { categories: {}, prioritySort: [] };

    const raw = await callGemini(
        `You are a habit organiser. Return ONLY valid JSON:
{"categories":{"Health":[],"Work":[],"Learning":[],"Mindfulness":[],"Lifestyle":[],"Other":[]},"prioritySort":[{"habit":"name","rank":1,"reason":"why"}]}
Only include categories with at least one habit. Rank by importance.`,
        `Habits:\n${JSON.stringify(ctx.habits.map((h) => ({ name: h.name, desc: h.description, rate: h.completionRate })), null, 2)}`
    );
    const data = parseJsonResponse(raw);
    await setCache(cacheKey, data);
    return data;
}

export async function parseNaturalLanguageHabit(text: string) {
    const today = new Date().toISOString().split('T')[0];
    const raw = await callGemini(
        `You are a habit parser. Parse natural language into a structured habit. Return ONLY valid JSON:
{"title":"habit name","description":"optional","subHabits":["step 1","step 2"],"startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD or null","priority":1,"category":"Health|Work|Learning|Mindfulness|Lifestyle|Other","color":"#hex"}
Today is ${today}. Set endDate null if ongoing. Choose a vibrant color hex. Infer sub-habits only if implied.`,
        text,
        0.3
    );
    return parseJsonResponse(raw);
}

export async function getForecast(userId: string) {
    const cacheKey = `forecast:${userId}`;
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return cached;

    const ctx = await buildHabitContext(userId, 30);
    if (ctx.totalHabits === 0) return { forecast: [], atRisk: [], overallPrediction: 0 };

    const raw = await callGemini(
        `You are a predictive habit analyst. Forecast next 7 days and identify at-risk habits. Return ONLY valid JSON:
{"forecast":[{"day":"Mon","predicted":75},...],"overallPrediction":72,"atRisk":[{"habit":"name","currentRate":40,"predictedRate":25,"warning":"text","tip":"advice"}]}
Be realistic based on trends. Only flag habits with predicted drop > 15%.`,
        `30-day habit data:\n${JSON.stringify(ctx.habits, null, 2)}`
    );
    const data = parseJsonResponse(raw);
    await setCache(cacheKey, data, 6 * 60 * 60); // 6 hours
    return data;
}

export async function getMotivationalQuote(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `quote:${userId}:${today}`;
    const cached = await getCached<unknown>(cacheKey);
    if (cached) return cached;

    const ctx = await buildHabitContext(userId, 7);
    const raw = await callGemini(
        `You are a motivational coach. Return ONLY valid JSON: {"quote":"text","author":"Attribution or 'AI Coach'","context":"why relevant"}
Make it personal and relevant. Keep quote under 30 words.`,
        `7-day performance:\n${JSON.stringify(ctx.habits.map((h) => ({ name: h.name, rate: h.completionRate, streak: h.currentStreak })), null, 2)}`,
        0.9
    );
    const data = parseJsonResponse(raw);
    await setCache(cacheKey, data, 24 * 60 * 60); // 24 hours
    return data;
}

export async function chat(userId: string, message: string) {
    // Retrieve last 10 messages for context
    const history = await prisma.chatMessage.findMany({
        where: { userId }, orderBy: { createdAt: 'desc' }, take: 10,
    });
    history.reverse();

    const ctx = await buildHabitContext(userId, 30);

    const contextStr = `User habit data (last 30 days):
${JSON.stringify(ctx.habits, null, 2)}

Conversation history:
${history.map((m) => `${m.role}: ${m.content}`).join('\n')}`;

    const reply = await callGemini(
        `You are an empathetic AI habit coach with access to the user's real habit data. Answer questions helpfully using their data. Be concise, warm, and actionable. Use markdown where helpful.
${contextStr}`,
        message
    );

    // Persist messages
    await prisma.chatMessage.createMany({
        data: [
            { userId, role: 'user', content: message },
            { userId, role: 'assistant', content: reply },
        ],
    });

    return { reply };
}

export async function generateQuests(userId: string) {
    const ctx = await buildHabitContext(userId, 30);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const raw = await callGemini(
        `You are a gamification designer. Based on the user's habits, generate 3 personalized quests. Return ONLY valid JSON:
{"quests":[{"title":"Quest title","description":"description","xpReward":50,"condition":{"type":"streak|completion|habit_count","target":5,"period":"optional YYYY-MM"},"durationDays":7}]}
Make quests achievable but challenging. Vary types.`,
        `User level: ${user?.level}, XP: ${user?.experiencePoints}, current streak: ${user?.currentStreak}
Habits: ${JSON.stringify(ctx.habits.map((h) => ({ name: h.name, rate: h.completionRate })), null, 2)}`,
        0.8
    );
    return parseJsonResponse(raw);
}

// ─── Reminder Motivational Message ────────────────────────────────

/**
 * Generate a short, personalised motivational message for a habit reminder email.
 * Falls back to a static message if the AI call fails.
 */
export async function generateReminderMessage(habitName: string, completionRate?: number): Promise<string> {
    const fallback = `Time for "${habitName}"! Every small step moves you closer to your goals. Let's keep the momentum going!`;
    try {
        const context = completionRate !== undefined
            ? `The user's recent completion rate for this habit is ${completionRate}%.`
            : 'No recent performance data available.';

        const raw = await callGemini(
            `You are a motivational habit coach. Generate a single short motivational message (max 2 sentences, under 40 words) for a reminder email about a specific habit. Be warm, encouraging, and specific to the habit. Do NOT use markdown. Return ONLY the message text, no JSON.`,
            `Habit: "${habitName}". ${context}`,
            0.9,
        );
        const cleaned = raw.trim().replace(/^["']|["']$/g, '');
        return cleaned || fallback;
    } catch {
        return fallback;
    }
}

// ─── Range Helper ─────────────────────────────────────────────────

function rangeTodays(range: string): number {
    switch (range) {
        case 'day': return 1;
        case 'week': return 7;
        case 'month': return 30;
        case 'year': return 365;
        default: return 30;
    }
}

