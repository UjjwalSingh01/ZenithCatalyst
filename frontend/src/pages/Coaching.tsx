import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import {
    MessageSquare, FileText, Search, TrendingUp, Swords,
    Bot, Send, Sparkles, Flame, Star, Plus, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import {
    fetchAISummary, fetchAIInsights, fetchAISuggestions, fetchAIForecast,
    sendChatMessage, fetchChatHistory, generateAIQuests, saveQuests,
    fetchProfile, createHabit,
} from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import { TextLinesSkeleton, CardListSkeleton } from '../components/Skeleton';
import { fadeRise, staggerList, springs, heatOf, HEAT_HEX, useMotionOK } from '../lib/motion';
import Counter from '../components/Counter';
import { CoachOrb, BlankLedger, QuestPennant } from '../components/Art';

const TABS = [
    { id: 'chat', label: 'Chat', Icon: MessageSquare },
    { id: 'summary', label: 'Summary', Icon: FileText },
    { id: 'insights', label: 'Insights', Icon: Search },
    { id: 'forecast', label: 'Forecast', Icon: TrendingUp },
    { id: 'quests', label: 'Quests', Icon: Swords },
];

const RANGES = [
    { id: 'week', label: '7d' },
    { id: 'month', label: '30d' },
    { id: 'year', label: '1y' },
];

const STARTERS = [
    'Which habit am I dropping?',
    'Plan my week',
    'How do I protect my streak?',
    'Suggest a morning routine',
];

function TypingDots() {
    const motionOK = useMotionOK();
    return (
        <div className="row" style={{ gap: 4, padding: '0.35rem 0.15rem' }}>
            {[0, 1, 2].map((i) => (
                <motion.span
                    key={i}
                    style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)' }}
                    animate={motionOK ? { opacity: [0.25, 1, 0.25], y: [0, -2, 0] } : { opacity: 0.7 }}
                    transition={motionOK ? { duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' } : undefined}
                />
            ))}
        </div>
    );
}

/** The AI's face. Cyan, always — it is the one cold thing in a warm room. */
function CoachMark({ size = 28 }: { size?: number }) {
    return (
        <span
            style={{
                width: size, height: size, borderRadius: '50%',
                background: 'var(--cyan-dim)',
                border: '1px solid rgba(79,195,217,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cyan)', flexShrink: 0,
            }}
        >
            <Bot size={size * 0.55} />
        </span>
    );
}

export default function Coaching() {
    const [tab, setTab] = useState('chat');
    const [range, setRange] = useState('month');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Array<{ role: string; content: string; pending?: boolean }>>([]);
    const endRef = useRef<HTMLDivElement>(null);
    const motionOK = useMotionOK();
    const qc = useQueryClient();
    const toast = useToast();

    const { data: history = [] } = useQuery({
        queryKey: ['chat-history'], queryFn: fetchChatHistory, enabled: tab === 'chat', staleTime: Infinity,
    });

    useEffect(() => {
        if (history.length > 0 && messages.length === 0) {
            setMessages(history.map((m: any) => ({ role: m.role, content: m.content })));
        }
    }, [history]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['ai-summary', range], queryFn: () => fetchAISummary(range), enabled: tab === 'summary', staleTime: 60 * 60_000,
    });
    const { data: insights, isLoading: insightsLoading } = useQuery({
        queryKey: ['ai-insights', range], queryFn: () => fetchAIInsights(range), enabled: tab === 'insights', staleTime: 60 * 60_000,
    });
    const { data: suggestions } = useQuery({
        queryKey: ['ai-suggestions'], queryFn: fetchAISuggestions, enabled: tab === 'insights', staleTime: 2 * 60 * 60_000,
    });
    const { data: forecast, isLoading: forecastLoading } = useQuery({
        queryKey: ['ai-forecast'], queryFn: fetchAIForecast, enabled: tab === 'forecast', staleTime: 6 * 60 * 60_000,
    });
    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile, staleTime: 60_000 });

    const chatMut = useMutation({
        mutationFn: sendChatMessage,
        onMutate: (msg: string) => {
            setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '', pending: true }]);
        },
        onSuccess: (data) => {
            setMessages((prev) => {
                const next = [...prev];
                const i = next.findLastIndex((m) => m.pending);
                if (i !== -1) next[i] = { role: 'assistant', content: data.reply };
                return next;
            });
        },
        onError: (err) => {
            setMessages((prev) => prev.filter((m) => !m.pending));
            toast.error(errMsg(err, 'The coach did not answer. Try again.'));
        },
    });

    const questsMut = useMutation({
        mutationFn: generateAIQuests,
        onSuccess: async (data) => {
            if (data?.quests) {
                await saveQuests(data.quests);
                qc.invalidateQueries({ queryKey: ['profile'] });
                toast.success('New quests ready');
            }
        },
        onError: (err) => toast.error(errMsg(err, 'Could not generate quests')),
    });

    const addHabitMut = useMutation({
        mutationFn: (s: any) => createHabit({
            ...s.habitData, aiGenerated: true,
            startDate: new Date().toISOString().split('T')[0], priority: 2, category: 'Health',
        }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Added to your habits'); },
        onError: (err) => toast.error(errMsg(err, 'Could not add the habit')),
    });

    const send = () => {
        const msg = input.trim();
        if (!msg || chatMut.isPending) return;
        setInput('');
        chatMut.mutate(msg);
    };

    const showRange = tab === 'summary' || tab === 'insights';

    return (
        <div className="page page--narrow" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 4rem)' }}>
            <div className="page-head" style={{ marginBottom: '1.25rem' }}>
                <div>
                    <div className="eyebrow t-cyan">Gemini</div>
                    <h1>Coach</h1>
                </div>
                {profile && (
                    <div className="row" style={{ gap: '0.5rem' }}>
                        <span className="badge badge--lit"><Star size={11} /> <Counter value={profile.experiencePoints} className="mono" /> XP</span>
                        <span className="badge badge--burning"><Flame size={11} /> <Counter value={profile.currentStreak} className="mono" /> day streak</span>
                        <span className="badge badge--neutral">LV {profile.level}</span>
                    </div>
                )}
            </div>

            <div className="row row--between row--wrap" style={{ marginBottom: '1.25rem', gap: '0.75rem' }}>
                <div className="seg" role="tablist">
                    {TABS.map(({ id, label, Icon }) => (
                        <button key={id} role="tab" aria-selected={tab === id} className="seg-item" onClick={() => setTab(id)}>
                            {tab === id && (
                                <motion.span className="seg-marker" layoutId={motionOK ? 'coach-tab' : undefined} transition={springs.settle} />
                            )}
                            <span className="row" style={{ gap: '0.35rem' }}><Icon size={13} /> {label}</span>
                        </button>
                    ))}
                </div>
                {showRange && (
                    <div className="seg" role="tablist">
                        {RANGES.map((r) => (
                            <button key={r.id} role="tab" aria-selected={range === r.id} className="seg-item" onClick={() => setRange(r.id)}>
                                {range === r.id && (
                                    <motion.span className="seg-marker" layoutId={motionOK ? 'coach-range' : undefined} transition={springs.settle} />
                                )}
                                {r.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={tab}
                    variants={motionOK ? fadeRise : undefined}
                    initial={motionOK ? 'hidden' : false}
                    animate="show"
                    exit="exit"
                    style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                >
                    {/* ── Chat ──────────────────────────────────────────── */}
                    {tab === 'chat' && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                            <div className="stack stack--lg" style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
                                {messages.length === 0 && (
                                    <div className="empty" style={{ margin: 'auto 0' }}>
                                        <span className="empty-art"><CoachOrb /></span>
                                        <h3>Ask about your habits</h3>
                                        <p>The coach can see your history, streaks, and what you have been dropping.</p>
                                        <div className="row row--wrap" style={{ gap: '0.5rem', justifyContent: 'center' }}>
                                            {STARTERS.map((s) => (
                                                <button key={s} className="btn btn--secondary btn--sm" onClick={() => setInput(s)}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={i}
                                        initial={motionOK ? { opacity: 0, y: 10 } : false}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={springs.settle}
                                        className="row row--top"
                                        style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '0.5rem' }}
                                    >
                                        {msg.role === 'assistant' && <CoachMark />}
                                        <div className={`bubble bubble--${msg.role === 'user' ? 'user' : 'ai'}`}>
                                            {msg.pending ? (
                                                <TypingDots />
                                            ) : msg.role === 'assistant' ? (
                                                /* This used to render raw markdown source — users saw
                                                   literal **asterisks** in every coach reply. */
                                                <div className="markdown">
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                <div ref={endRef} />
                            </div>

                            <div className="row" style={{ gap: '0.6rem', paddingTop: '1rem', marginTop: '0.5rem', borderTop: '1px solid var(--line)' }}>
                                <input
                                    className="input"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
                                    placeholder="Ask the coach anything"
                                />
                                <button className="btn btn--ai" onClick={send} disabled={chatMut.isPending || !input.trim()}>
                                    <Send size={15} /> Send
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Summary ───────────────────────────────────────── */}
                    {tab === 'summary' && (
                        summaryLoading ? (
                            <div className="stack stack--lg">
                                <TextLinesSkeleton lines={3} />
                                <TextLinesSkeleton lines={4} />
                            </div>
                        ) : summary?.summary ? (
                            <div className="card card--ai card--static">
                                <div className="row" style={{ marginBottom: '1rem' }}>
                                    <CoachMark size={34} />
                                    <h3>
                                        Performance report — {range === 'week' ? 'last 7 days' : range === 'month' ? 'last 30 days' : 'last year'}
                                    </h3>
                                </div>
                                <div className="markdown">
                                    <ReactMarkdown>{summary.summary}</ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="card empty card--static">
                                <span className="empty-art"><BlankLedger /></span>
                                <h3>Nothing to report yet</h3>
                                <p>Add habits and complete a few, then the coach can write you a report.</p>
                            </div>
                        )
                    )}

                    {/* ── Insights ──────────────────────────────────────── */}
                    {tab === 'insights' && (
                        insightsLoading ? (
                            <CardListSkeleton count={4} />
                        ) : (
                            <motion.div
                                className="stack stack--lg"
                                variants={motionOK ? staggerList : undefined}
                                initial={motionOK ? 'hidden' : false}
                                animate="show"
                            >
                                {insights?.advancements?.length > 0 && (
                                    <section>
                                        <h3 className="card-title t-gold"><Flame size={16} /> Burning well</h3>
                                        <div className="stack">
                                            {insights.advancements.map((a: any, i: number) => (
                                                <motion.div key={i} variants={motionOK ? fadeRise : undefined} className="card card--sm card--lit">
                                                    <div className="t-bold">{a.habit}</div>
                                                    <p className="t-sm">{a.achievement}</p>
                                                    <p className="t-sm t-gold" style={{ marginTop: '0.2rem' }}>{a.encouragement}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {insights?.shortcomings?.length > 0 && (
                                    <section>
                                        <h3 className="card-title t-cold">Going out</h3>
                                        <div className="stack">
                                            {insights.shortcomings.map((s: any, i: number) => (
                                                <motion.div key={i} variants={motionOK ? fadeRise : undefined} className="card card--sm card--cold">
                                                    <div className="t-bold">{s.habit}</div>
                                                    <p className="t-sm">{s.issue}</p>
                                                    <p className="t-sm t-copper" style={{ marginTop: '0.2rem' }}>{s.suggestion}</p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {suggestions?.suggestions?.length > 0 && (
                                    <section>
                                        <h3 className="card-title t-cyan"><Sparkles size={16} /> Suggestions</h3>
                                        <div className="stack">
                                            {suggestions.suggestions.map((s: any, i: number) => (
                                                <motion.div key={i} variants={motionOK ? fadeRise : undefined} className="card card--sm card--ai">
                                                    <div className="row row--top row--between">
                                                        <div style={{ flex: 1 }}>
                                                            <div className="t-bold">{s.title}</div>
                                                            <p className="t-sm">{s.description}</p>
                                                        </div>
                                                        {s.type === 'new_habit' && s.habitData && (
                                                            <button
                                                                className="btn btn--ai btn--sm"
                                                                style={{ flexShrink: 0 }}
                                                                onClick={() => addHabitMut.mutate(s)}
                                                                disabled={addHabitMut.isPending}
                                                            >
                                                                <Plus size={14} /> Add
                                                            </button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {!insights?.advancements?.length && !insights?.shortcomings?.length && !suggestions?.suggestions?.length && (
                                    <div className="card empty card--static">
                                        <span className="empty-art"><BlankLedger /></span>
                                        <h3>Not enough history</h3>
                                        <p>Keep a few habits for a week and the coach will have something to read.</p>
                                    </div>
                                )}
                            </motion.div>
                        )
                    )}

                    {/* ── Forecast ──────────────────────────────────────── */}
                    {tab === 'forecast' && (
                        forecastLoading ? (
                            <CardListSkeleton count={3} />
                        ) : forecast?.forecast?.length || forecast?.atRisk?.length ? (
                            <div className="stack stack--lg">
                                {forecast?.forecast?.length > 0 && (
                                    <div className="card card--static">
                                        <h3 className="card-title">The week ahead</h3>
                                        <div className="row" style={{ alignItems: 'flex-end', height: 150, gap: '0.5rem' }}>
                                            {forecast.forecast.map((d: any, i: number) => {
                                                const hex = HEAT_HEX[heatOf(d.predicted)];
                                                return (
                                                    <div key={d.day} className="stack" style={{ flex: 1, gap: '0.3rem', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                                        <span className="mono t-ash" style={{ fontSize: '0.65rem' }}>{d.predicted}%</span>
                                                        <motion.div
                                                            initial={motionOK ? { height: 0 } : false}
                                                            animate={{ height: `${Math.max(d.predicted, 2)}%` }}
                                                            transition={motionOK ? { ...springs.ember, delay: i * 0.05 } : { duration: 0 }}
                                                            style={{
                                                                width: '100%', maxWidth: 30,
                                                                borderRadius: '4px 4px 0 0',
                                                                background: hex,
                                                                boxShadow: d.predicted >= 80 ? `0 0 12px ${hex}88` : 'none',
                                                            }}
                                                        />
                                                        <span className="mono t-dim" style={{ fontSize: '0.62rem' }}>{d.day}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <p className="t-center t-sm" style={{ marginTop: '1rem' }}>
                                            Predicted overall: <span className="t-gold t-bold">{forecast.overallPrediction}%</span>
                                        </p>
                                    </div>
                                )}

                                {forecast?.atRisk?.length > 0 && (
                                    <section>
                                        <h3 className="card-title t-cold"><AlertTriangle size={16} /> About to go out</h3>
                                        <div className="stack">
                                            {forecast.atRisk.map((h: any, i: number) => (
                                                <div key={i} className="card card--sm card--cold">
                                                    <div className="row row--between row--top">
                                                        <div className="t-bold">{h.habit}</div>
                                                        <span className="badge badge--cold">
                                                            {h.currentRate}% <ArrowUpRight size={10} style={{ transform: 'rotate(45deg)' }} /> {h.predictedRate}%
                                                        </span>
                                                    </div>
                                                    <p className="t-sm" style={{ marginTop: '0.3rem' }}>{h.warning}</p>
                                                    <p className="t-sm t-copper" style={{ marginTop: '0.2rem' }}>{h.tip}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        ) : (
                            <div className="card empty card--static">
                                <span className="empty-art"><BlankLedger /></span>
                                <h3>Not enough to predict from</h3>
                                <p>Complete habits for a week or two and the coach can forecast the next one.</p>
                            </div>
                        )
                    )}

                    {/* ── Quests ────────────────────────────────────────── */}
                    {tab === 'quests' && (
                        <div className="stack stack--lg">
                            {profile?.badges?.length > 0 && (
                                <div className="card card--static">
                                    <h3 className="card-title">Badges</h3>
                                    <div className="row row--wrap" style={{ gap: '0.85rem' }}>
                                        {profile.badges.map((ub: any) => (
                                            <div key={ub.id} className="tooltip-wrap t-center">
                                                <div
                                                    style={{
                                                        width: 48, height: 48, borderRadius: '50%',
                                                        background: 'rgba(242,181,68,0.12)',
                                                        border: '1px solid rgba(242,181,68,0.35)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '1.35rem',
                                                    }}
                                                >
                                                    {ub.badge.icon}
                                                </div>
                                                <div className="mono t-ash" style={{ fontSize: '0.6rem', marginTop: '0.3rem', maxWidth: 62 }}>
                                                    {ub.badge.name}
                                                </div>
                                                <span className="tooltip">{ub.badge.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <section>
                                <div className="row row--between row--wrap" style={{ marginBottom: '0.75rem' }}>
                                    <h3>Active quests</h3>
                                    <button className="btn btn--ai btn--sm" onClick={() => questsMut.mutate()} disabled={questsMut.isPending}>
                                        <Sparkles size={14} /> {questsMut.isPending ? 'Writing…' : 'Generate quests'}
                                    </button>
                                </div>

                                {!profile?.quests?.length ? (
                                    <div className="card empty card--static">
                                        <span className="empty-art"><QuestPennant /></span>
                                        <h3>No quests running</h3>
                                        <p>Have the coach set you a few challenges worth XP.</p>
                                    </div>
                                ) : (
                                    <div className="stack">
                                        {profile.quests.map((q: any) => (
                                            <div key={q.id} className="card card--sm card--ai">
                                                <div className="row row--between row--top">
                                                    <div style={{ flex: 1 }}>
                                                        <div className="t-bold">{q.title}</div>
                                                        <p className="t-sm">{q.description}</p>
                                                    </div>
                                                    <span className="badge badge--lit" style={{ flexShrink: 0 }}>+{q.xpReward} XP</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
