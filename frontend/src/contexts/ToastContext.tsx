import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { springs, toastIn } from '../lib/motion';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: number;
    type: ToastType;
    message: string;
}

interface ToastCtx {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

const DURATION = 3500;

// Success is a flame, not a green tick — the app only has one vocabulary.
const ICONS: Record<ToastType, React.ReactNode> = {
    success: <Flame size={17} color="var(--gold)" />,
    error: <XCircle size={17} color="var(--cinder)" />,
    info: <Info size={17} color="var(--cyan)" />,
    warning: <AlertTriangle size={17} color="var(--copper-lit)" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const nextId = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) { clearTimeout(timer); timers.current.delete(id); }
    }, []);

    const push = useCallback((type: ToastType, message: string) => {
        const id = nextId.current++;
        setToasts((prev) => [...prev, { id, type, message }]);
        timers.current.set(id, setTimeout(() => dismiss(id), DURATION));
    }, [dismiss]);

    useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);

    const api = useRef<ToastCtx>({
        success: (m: string) => push('success', m),
        error: (m: string) => push('error', m),
        info: (m: string) => push('info', m),
        warning: (m: string) => push('warning', m),
    });

    return (
        <ToastContext.Provider value={api.current}>
            {children}
            <div className="toast-container">
                {/* `popLayout` + `layout` is what makes the survivors slide up to
                    close the gap when one is dismissed from the middle. */}
                <AnimatePresence mode="popLayout">
                    {toasts.map((t) => (
                        <motion.div
                            key={t.id}
                            layout
                            variants={toastIn}
                            initial="hidden"
                            animate="show"
                            exit="exit"
                            transition={springs.settle}
                            className={`toast toast--${t.type}`}
                            role="status"
                        >
                            <span style={{ flexShrink: 0, display: 'flex' }}>{ICONS[t.type]}</span>
                            <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
                            <button
                                onClick={() => dismiss(t.id)}
                                aria-label="Dismiss"
                                className="btn btn--ghost btn--icon btn--sm"
                                style={{ padding: 2, minWidth: 0 }}
                            >
                                <X size={15} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
