import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchAISummary, fetchAIInsights, fetchAISuggestions, fetchAIForecast,
    sendChatMessage, fetchChatHistory, generateAIQuests, saveQuests,
    fetchProfile, createHabit
} from '../lib/queries';
import { useToast } from '../contexts/ToastContext';
import { errMsg } from '../lib/errors';
import ReactMarkdown from 'react-markdown';

const TABS = [
    { id: 'chat', label: '💬 Chat', icon: '💬' },
    { id: 'summary', label: '📊 Summary', icon: '📊' },
    { id: 'insights', label: '🔍 Insights', icon: '🔍' },
    { id: 'forecast', label: '🔮 Forecast', icon: '🔮' },
    { id: 'quests', label: '⚔️ Quests', icon: '⚔️' },
];

const RANGES = ['week', 'month', 'year'];

function TypingDots() {
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0.5rem' }}>
            {[0, 1, 2].map((i) => (
                <div key={i} style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--brand-400)',
                    animation: 'pulse 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`,
                }} />
            ))}
        </div>
    );
}

export default function Coaching() {
    const [activeTab, setActiveTab] = useState('chat');
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Array<{ role: string; content: string; pending?: boolean }>>([]);
    const [range, setRange] = useState('month');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const qc = useQueryClient();
    const toast = useToast();

    const { data: chatHistory = [] } = useQuery({
        queryKey: ['chat-history'],
        queryFn: fetchChatHistory,
        enabled: activeTab === 'chat',
        staleTime: Infinity,
    });

    useEffect(() => {
        if (chatHistory.length > 0 && messages.length === 0) {
            setMessages(chatHistory.map((m: any) => ({ role: m.role, content: m.content })));
        }
    }, [chatHistory]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['ai-summary', range], queryFn: () => fetchAISummary(range), enabled: activeTab === 'summary', staleTime: 60 * 60_000,
    });
    const { data: insights, isLoading: insightsLoading } = useQuery({
        queryKey: ['ai-insights', range], queryFn: () => fetchAIInsights(range), enabled: activeTab === 'insights', staleTime: 60 * 60_000,
    });
    const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
        queryKey: ['ai-suggestions'], queryFn: fetchAISuggestions, enabled: activeTab === 'insights', staleTime: 2 * 60 * 60_000,
    });
    const { data: forecast, isLoading: forecastLoading } = useQuery({
        queryKey: ['ai-forecast'], queryFn: fetchAIForecast, enabled: activeTab === 'forecast', staleTime: 6 * 60 * 60_000,
    });
    const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile, staleTime: 60_000 });

    const chatMut = useMutation({
        mutationFn: sendChatMessage,
        onMutate: (msg) => {
            setMessages((prev) => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '', pending: true }]);
        },
        onSuccess: (data) => {
            setMessages((prev) => {
                const updated = [...prev];
                const idx = updated.findLastIndex((m) => m.pending);
                if (idx !== -1) updated[idx] = { role: 'assistant', content: data.reply };
                return updated;
            });
        },
        onError: (err) => {
            setMessages((prev) => prev.filter((m) => !m.pending));
            toast.error(errMsg(err, "Couldn't reach the AI coach"));
        },
    });

    const generateQuestsMut = useMutation({
        mutationFn: generateAIQuests,
        onSuccess: async (data) => {
            if (data?.quests) { await saveQuests(data.quests); qc.invalidateQueries({ queryKey: ['profile'] }); toast.success('New quests generated'); }
        },
        onError: (err) => toast.error(errMsg(err, 'Failed to generate quests')),
    });

    const addHabitMut = useMutation({
        mutationFn: (sug: any) => createHabit({ ...sug.habitData, aiGenerated: true, startDate: new Date().toISOString().split('T')[0], priority: 2, category: 'Health' }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Added to your habits'); },
        onError: (err) => toast.error(errMsg(err, 'Failed to add habit')),
    });

    const sendChat = () => {
        const msg = chatInput.trim();
        if (!msg || chatMut.isPending) return;
        setChatInput('');
        chatMut.mutate(msg);
    };

    const AI_STARTERS = [
        "What's my worst performing habit?",
        "Give me a weekly habit plan",
        "How can I improve my streak?",
        "Suggest a new morning routine",
    ];

    return (
        <div style={{ animation: 'fadeIn 0.35s ease', maxWidth: 1000, margin: '0 auto', height: 'calc(100vh - 4rem)', display: 'flex', flexDirection: 'column' }}>
            {/* Header + Profile */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>AI Coach</h1>
                    <p className="text-secondary">Personalised guidance powered by Gemini</p>
                </div>
                {profile && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {[
                            { icon: '⭐', label: `${profile.experiencePoints} XP`, color: 'var(--xp-gold)' },
                            { icon: '🔥', label: `${profile.currentStreak} day streak`, color: 'var(--warning)' },
                            { icon: '🏆', label: `Level ${profile.level}`, color: 'var(--brand-400)' },
                        ].map(({ icon, label, color }) => (
                            <div key={label} style={{ padding: '0.4rem 0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: '0.8rem', fontWeight: 600, color }}>
                                {icon} {label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
                {TABS.map(({ id, label }) => (
                    <button key={id} onClick={() => setActiveTab(id)} className={`btn btn-sm ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}>
                        {label}
                    </button>
                ))}
                {activeTab !== 'chat' && activeTab !== 'quests' && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
                        {RANGES.map((r) => (
                            <button key={r} className={`btn btn-sm ${range === r ? 'btn-secondary' : 'btn-ghost'}`} onClick={() => setRange(r)}>
                                {r === 'week' ? '7d' : r === 'month' ? '30d' : '1y'}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Chat Tab ──────────────────────────────────────────── */}
            {activeTab === 'chat' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '0.5rem' }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
                                <h3 style={{ fontFamily: 'Outfit', marginBottom: '0.5rem' }}>Hello! I'm your AI habit coach.</h3>
                                <p style={{ marginBottom: '2rem' }}>Ask me anything about your habits, progress, or goals.</p>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {AI_STARTERS.map((s) => (
                                        <button key={s} className="btn btn-secondary btn-sm" onClick={() => { setChatInput(s); }}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                {msg.role === 'assistant' && (
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0, marginRight: '0.5rem', marginTop: 4 }}>🤖</div>
                                )}
                                <div style={{
                                    maxWidth: '75%', padding: '0.75rem 1rem', borderRadius: 14,
                                    background: msg.role === 'user' ? 'var(--brand-600)' : 'var(--bg-card)',
                                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                                    fontSize: '0.875rem',
                                }}>
                                    {msg.pending ? <TypingDots /> : (
                                        msg.role === 'assistant'
                                            ? <div className="markdown-body" style={{ color: 'var(--text-primary)' }}>{msg.content}</div>
                                            : msg.content
                                    )}
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                        <input className="input" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChat()}
                            placeholder="Ask your AI coach anything..." style={{ flex: 1 }} />
                        <button className="btn btn-primary" onClick={sendChat} disabled={chatMut.isPending || !chatInput.trim()}>
                            Send →
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Summary Tab ──────────────────────────────────────── */}
            {activeTab === 'summary' && (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {summaryLoading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Generating AI summary...</p>
                        </div>
                    ) : summary?.summary ? (
                        <div className="card card-glass">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📊</div>
                                <h3>Performance Report — {range === 'week' ? 'Last 7 days' : range === 'month' ? 'Last 30 days' : 'Last year'}</h3>
                            </div>
                            <div style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{summary.summary}</div>
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p>No summary available. Add some habits and complete them first!</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Insights Tab ─────────────────────────────────────── */}
            {activeTab === 'insights' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {insightsLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)
                    ) : (
                        <>
                            {insights?.advancements?.length > 0 && (
                                <div>
                                    <h3 style={{ marginBottom: '0.75rem', color: 'var(--success)' }}>🌟 Advancements</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {insights.advancements.map((a: any, i: number) => (
                                            <div key={i} className="card card-sm" style={{ borderColor: 'rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)' }}>
                                                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>✅ {a.habit}</div>
                                                <p style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>{a.achievement}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--success)' }}>{a.encouragement}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {insights?.shortcomings?.length > 0 && (
                                <div>
                                    <h3 style={{ marginBottom: '0.75rem', color: 'var(--warning)' }}>⚠️ Areas to Improve</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {insights.shortcomings.map((s: any, i: number) => (
                                            <div key={i} className="card card-sm" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.05)' }}>
                                                <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>⚠️ {s.habit}</div>
                                                <p style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>{s.issue}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>💡 {s.suggestion}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {suggestions?.suggestions?.length > 0 && (
                                <div>
                                    <h3 style={{ marginBottom: '0.75rem' }}>💡 AI Suggestions</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {suggestions.suggestions.map((s: any, i: number) => (
                                            <div key={i} className="card card-sm" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                                                            {s.type === 'new_habit' ? '🆕' : s.type === 'modification' ? '🔄' : '⏰'} {s.title}
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem' }}>{s.description}</p>
                                                    </div>
                                                    {s.type === 'new_habit' && s.habitData && (
                                                        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => addHabitMut.mutate(s)}>
                                                            + Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── Forecast Tab ─────────────────────────────────────── */}
            {activeTab === 'forecast' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {forecastLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)
                    ) : (
                        <>
                            {/* 7-day bar forecast */}
                            {forecast?.forecast?.length > 0 && (
                                <div className="card">
                                    <h3 style={{ marginBottom: '1rem' }}>📅 7-Day Outlook</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-around', alignItems: 'flex-end', height: 140 }}>
                                        {forecast.forecast.map((d: any) => (
                                            <div key={d.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{d.predicted}%</span>
                                                <div style={{
                                                    width: '100%', maxWidth: 32, borderRadius: '4px 4px 0 0',
                                                    background: d.predicted >= 70 ? '#22c55e' : d.predicted >= 40 ? '#f59e0b' : '#ef4444',
                                                    height: `${d.predicted}%`,
                                                    transition: 'height 0.5s ease',
                                                    opacity: 0.85,
                                                }} />
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{d.day}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--brand-400)' }}>
                                            Overall prediction: {forecast.overallPrediction}%
                                        </span>
                                    </div>
                                </div>
                            )}
                            {/* At-risk habits */}
                            {forecast?.atRisk?.length > 0 && (
                                <div>
                                    <h3 style={{ marginBottom: '0.75rem', color: 'var(--error)' }}>🚨 At-Risk Habits</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        {forecast.atRisk.map((h: any, i: number) => (
                                            <div key={i} className="card card-sm" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontWeight: 700 }}>⚠️ {h.habit}</div>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <span className="badge badge-warning">{h.currentRate}% → {h.predictedRate}%</span>
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{h.warning}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--brand-400)', marginTop: '0.2rem' }}>💡 {h.tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!forecast?.atRisk?.length && !forecast?.forecast?.length && (
                                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                                    <p>Complete more habits to unlock predictive forecasting!</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ─── Quests Tab ───────────────────────────────────────── */}
            {activeTab === 'quests' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Badges */}
                    {profile?.badges?.length > 0 && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem' }}>🏅 Earned Badges</h3>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {profile.badges.map((ub: any) => (
                                    <div key={ub.id} className="tooltip-wrap" style={{ textAlign: 'center' }}>
                                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', cursor: 'default', boxShadow: '0 0 12px rgba(99,102,241,0.3)' }}>
                                            {ub.badge.icon}
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem', maxWidth: 60 }}>{ub.badge.name}</div>
                                        <div className="tooltip">{ub.badge.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quests */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <h3>⚔️ Active Quests</h3>
                            <button className="btn btn-primary btn-sm" onClick={() => generateQuestsMut.mutate()} disabled={generateQuestsMut.isPending}>
                                {generateQuestsMut.isPending ? '✨ Generating...' : '✨ Generate New Quests'}
                            </button>
                        </div>
                        {profile?.quests?.length === 0 && (
                            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚔️</div>
                                <p style={{ marginBottom: '1rem' }}>No active quests. Let AI generate personalised challenges for you!</p>
                            </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {profile?.quests?.map((q: any) => (
                                <div key={q.id} className="card card-sm card-glass">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>⚔️ {q.title}</div>
                                            <p style={{ fontSize: '0.85rem' }}>{q.description}</p>
                                        </div>
                                        <div className="badge badge-gold" style={{ flexShrink: 0 }}>+{q.xpReward} XP</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
