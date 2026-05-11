import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Calendar } from 'lucide-react';
import { useCreateHabit } from '../lib/hooks';
import NLPHabitInput from './NLPHabitInput';

interface Props {
    onClose: () => void;
    prefill?: {
        title?: string;
        description?: string;
        priority?: number;
        startDate?: string;
        endDate?: string;
        subHabits?: { content: string }[];
    } | null;
}

export default function AddHabitModal({ onClose, prefill }: Props) {
    const [title, setTitle] = useState(prefill?.title || '');
    const [description, setDescription] = useState(prefill?.description || '');
    const [priority, setPriority] = useState(prefill?.priority || 1);
    const [startDate, setStartDate] = useState(prefill?.startDate || new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(prefill?.endDate || '');
    const [subHabits, setSubHabits] = useState<{ content: string }[]>(prefill?.subHabits || []);
    const createHabit = useCreateHabit();

    // If prefill changes, update state
    useEffect(() => {
        if (prefill) {
            if (prefill.title) setTitle(prefill.title);
            if (prefill.description) setDescription(prefill.description);
            if (prefill.priority) setPriority(prefill.priority);
            if (prefill.startDate) setStartDate(prefill.startDate);
            if (prefill.endDate) setEndDate(prefill.endDate);
            if (prefill.subHabits) setSubHabits(prefill.subHabits);
        }
    }, [prefill]);

    function applyNLPResult(data: any) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPriority(data.priority || 2);
        setStartDate(data.startDate || new Date().toISOString().split('T')[0]);
        setEndDate(data.endDate || '');
        setSubHabits(data.subHabits || []);
    }

    function addSubHabit() { setSubHabits([...subHabits, { content: '' }]); }
    function removeSubHabit(i: number) { setSubHabits(subHabits.filter((_, idx) => idx !== i)); }
    function updateSubHabit(i: number, val: string) {
        const copy = [...subHabits];
        copy[i].content = val;
        setSubHabits(copy);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const filtered = subHabits.filter((sh) => sh.content.trim());
        await createHabit.mutateAsync({
            title,
            description: description || undefined,
            priority,
            startDate,
            endDate: endDate || undefined,
            subHabits: filtered.length > 0 ? filtered : undefined,
        });
        onClose();
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg card max-h-[85vh] overflow-y-auto"
            >
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-semibold text-white">Create New Habit</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-dark-400 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* NLP Quick Add */}
                    <NLPHabitInput onParsed={applyNLPResult} />

                    <div className="border-t border-white/5 pt-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-dark-200 mb-2">Habit Title *</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="e.g. Morning Exercise" required />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-dark-200 mb-2">Description</label>
                            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px] resize-none" placeholder="Optional description..." />
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-dark-200 mb-2">Priority</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 1, label: 'High', cls: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
                                    { value: 2, label: 'Medium', cls: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
                                    { value: 3, label: 'Low', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
                                ].map((p) => (
                                    <button key={p.value} type="button" onClick={() => setPriority(p.value)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${priority === p.value ? p.cls : 'border-white/10 text-dark-400 hover:border-white/20'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-dark-200 mb-2">
                                    <Calendar size={14} className="inline mr-1" />Start Date *
                                </label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-200 mb-2">
                                    <Calendar size={14} className="inline mr-1" />End Date
                                </label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field" min={startDate} />
                            </div>
                        </div>

                        {/* Sub-habits */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-dark-200">Sub-habits</label>
                                <button type="button" onClick={addSubHabit} className="flex items-center gap-1 text-xs text-accent-violet hover:text-accent-purple transition-colors">
                                    <Plus size={14} /> Add Sub-habit
                                </button>
                            </div>
                            {subHabits.length > 0 && (
                                <div className="space-y-2">
                                    {subHabits.map((sh, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-accent-violet/50 shrink-0" />
                                            <input type="text" value={sh.content} onChange={(e) => updateSubHabit(i, e.target.value)}
                                                className="input-field flex-1 !py-2 text-sm" placeholder={`Sub-habit ${i + 1}`} />
                                            <button type="button" onClick={() => removeSubHabit(i)}
                                                className="p-1.5 rounded-lg text-dark-400 hover:text-danger hover:bg-danger/10 transition-all">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                        <button type="submit" disabled={createHabit.isPending} className="btn-primary flex-1 flex items-center justify-center">
                            {createHabit.isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Habit'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
}
