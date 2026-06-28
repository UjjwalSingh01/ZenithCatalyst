import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

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

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 size={18} color="var(--success)" />,
    error: <XCircle size={18} color="var(--error)" />,
    info: <Info size={18} color="var(--info)" />,
    warning: <AlertTriangle size={18} color="var(--warning)" />,
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
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast--${t.type}`} role="status">
                        <span style={{ flexShrink: 0, display: 'flex' }}>{ICONS[t.type]}</span>
                        <span style={{ flex: 1, fontSize: '0.875rem', lineHeight: 1.4 }}>{t.message}</span>
                        <button
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0, flexShrink: 0 }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
