import { z } from 'zod';

// ─── Auth ──────────────────────────────────────────────────────────

export const registerSchema = z.object({
    firstName: z.string().min(1).max(50),
    lastName: z.string().max(50).optional(),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const refreshSchema = z.object({
    refreshToken: z.string().min(1),
});

// ─── Profile ───────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().max(50).optional().nullable(),
    email: z.string().email().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── Reminder Config (shared by habit schemas) ─────────────────────

export const reminderConfigSchema = z.object({
    enabled: z.boolean(),
    frequency: z.enum(['daily', 'weekdays', 'weekly', 'custom', 'once']),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
    days: z.array(z.number().int().min(0).max(6)).optional(),
    duration: z.enum(['forever', '1week', '2weeks', '1month', '3months', 'until_end']).optional(),
    message: z.string().max(500).optional(),
}).optional();

// ─── Habits ────────────────────────────────────────────────────────

export const createHabitSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    priority: z.number().int().min(1).max(3).default(2),
    category: z.enum(['Health', 'Work', 'Learning', 'Mindfulness', 'Lifestyle', 'Other']).optional(),
    tags: z.array(z.string()).default([]),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    subHabits: z.array(z.string().min(1).max(200)).default([]),
    aiGenerated: z.boolean().default(false),
    isChallenge: z.boolean().default(false),
    reminder: reminderConfigSchema,
}).refine((d) => !d.isChallenge || !!d.endDate, {
    // A challenge is a commitment to a stretch of days. Without an end it is
    // just a habit, and the ledger would have nothing to measure against.
    message: 'A challenge needs an end date',
    path: ['endDate'],
}).refine((d) => !d.endDate || d.endDate >= d.startDate, {
    // The form already refuses this, but the form is not the only way in.
    message: 'A habit cannot end before it starts',
    path: ['endDate'],
});

export const updateHabitSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    priority: z.number().int().min(1).max(3).optional(),
    category: z.enum(['Health', 'Work', 'Learning', 'Mindfulness', 'Lifestyle', 'Other']).optional(),
    tags: z.array(z.string()).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    // Was missing, which is not the same as being rejected: Zod strips keys it
    // does not declare, and the middleware assigns the parsed result back over
    // req.body. So an edited start date was quietly dropped on the way in and
    // the write succeeded without it. Ordering against the stored end date is
    // enforced in `updateHabit`, which can see the row.
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    isArchived: z.boolean().optional(),
    // The end-date rule can't be checked here — the habit may already have one
    // on the row. `updateHabit` enforces it against the stored value.
    isChallenge: z.boolean().optional(),
    reminder: reminderConfigSchema,
});

export const reorderHabitsSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
});

export const toggleHabitDateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completed: z.boolean(),
});

export const toggleSubHabitDateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completed: z.boolean(),
});

// An empty string is how the client clears a note, so it is accepted here and
// stored as NULL by the service rather than rejected as a missing value.
export const habitDateNoteSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().max(2000, 'A day note cannot be longer than 2000 characters'),
});

// ─── Mood ──────────────────────────────────────────────────────────

export const moodLogSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mood: z.number().int().min(1).max(5),
    energy: z.number().int().min(1).max(5),
    note: z.string().max(500).optional(),
});

// ─── AI ────────────────────────────────────────────────────────────

export const chatSchema = z.object({
    message: z.string().min(1).max(2000),
});

export const parseHabitSchema = z.object({
    text: z.string().min(1).max(500),
});

// ─── Quests ────────────────────────────────────────────────────────

export const saveQuestsSchema = z.object({
    quests: z.array(z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(1000),
        xpReward: z.number().int().min(1).max(500).default(50),
        condition: z.record(z.unknown()).default({}),
        durationDays: z.number().int().min(1).max(365).optional(),
    })).min(1).max(10),
});
