import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Loader2, Check, X } from 'lucide-react';
import { useParseHabitNLP } from '../lib/hooks';

interface ParsedHabit {
    title: string;
    description: string;
    subHabits: string[];
    startDate: string;
    endDate: string | null;
    priority: number;
}

interface Props {
    onParsed: (data: {
        title: string;
        description: string;
        priority: number;
        startDate: string;
        endDate: string;
        subHabits: { content: string }[];
    }) => void;
}

export default function NLPHabitInput({ onParsed }: Props) {
    const [text, setText] = useState('');
    const [parsed, setParsed] = useState<ParsedHabit | null>(null);
    const parser = useParseHabitNLP();

    async function handleParse() {
        if (!text.trim()) return;
        try {
            const result = await parser.mutateAsync(text);
            setParsed(result);
        } catch {
            // error handled via isPending / isError
        }
    }

    function handleAccept() {
        if (!parsed) return;
        onParsed({
            title: parsed.title,
            description: parsed.description || '',
            priority: parsed.priority || 2,
            startDate: parsed.startDate || new Date().toISOString().split('T')[0],
            endDate: parsed.endDate || '',
            subHabits: (parsed.subHabits || []).map((content) => ({ content })),
        });
        setParsed(null);
        setText('');
    }

    function handleDismiss() {
        setParsed(null);
    }

    return (
        <div className="mb-5">
            <label className="block text-sm font-medium text-dark-200 mb-2 flex items-center gap-1.5">
                <Wand2 size={14} className="text-accent-violet" /> Quick Add with AI
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleParse())}
                    placeholder='e.g. "Read for 20 minutes before bed every night"'
                    className="input-field flex-1 !py-2.5 text-sm"
                />
                <button
                    type="button"
                    onClick={handleParse}
                    disabled={!text.trim() || parser.isPending}
                    className="px-4 rounded-xl bg-accent-violet/15 text-accent-violet hover:bg-accent-violet/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm font-medium shrink-0"
                >
                    {parser.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                    Parse
                </button>
            </div>

            {parser.isError && (
                <p className="text-xs text-rose-400 mt-2">Failed to parse. Ensure AI is configured, then try again.</p>
            )}

            <AnimatePresence>
                {parsed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 p-3 rounded-xl bg-accent-violet/5 border border-accent-violet/20">
                            <p className="text-xs text-dark-300 mb-2">AI parsed your input:</p>
                            <div className="space-y-1 text-sm">
                                <p className="text-white"><span className="text-dark-400">Title:</span> {parsed.title}</p>
                                {parsed.description && <p className="text-dark-200"><span className="text-dark-400">Description:</span> {parsed.description}</p>}
                                {parsed.subHabits?.length > 0 && (
                                    <p className="text-dark-200"><span className="text-dark-400">Sub-habits:</span> {parsed.subHabits.join(', ')}</p>
                                )}
                                <p className="text-dark-200"><span className="text-dark-400">Start:</span> {parsed.startDate} {parsed.endDate ? `→ ${parsed.endDate}` : '(ongoing)'}</p>
                            </div>
                            <div className="flex gap-2 mt-3">
                                <button type="button" onClick={handleAccept}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-xs font-medium transition-all">
                                    <Check size={12} /> Use This
                                </button>
                                <button type="button" onClick={handleDismiss}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-white/5 text-dark-400 hover:text-white hover:bg-white/10 text-xs font-medium transition-all">
                                    <X size={12} /> Dismiss
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
