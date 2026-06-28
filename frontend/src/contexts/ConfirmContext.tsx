import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm extends ConfirmOptions {
    resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback<ConfirmFn>((options) => {
        return new Promise<boolean>((resolve) => setPending({ ...options, resolve }));
    }, []);

    const close = useCallback((value: boolean) => {
        setPending((prev) => { prev?.resolve(value); return null; });
    }, []);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {pending && (
                <div className="modal-overlay" onClick={() => close(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: pending.danger ? 'var(--error)' : undefined }}>
                            {pending.danger && <AlertTriangle size={18} />}
                            {pending.title ?? 'Are you sure?'}
                        </h3>
                        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>{pending.message}</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => close(false)}>
                                {pending.cancelText ?? 'Cancel'}
                            </button>
                            <button className={`btn ${pending.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
                                {pending.confirmText ?? 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
}
