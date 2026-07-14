import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';

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
            <Modal
                open={!!pending}
                onClose={() => close(false)}
                width={420}
                danger={pending?.danger}
                title={
                    <>
                        {pending?.danger && <AlertTriangle size={17} />}
                        {pending?.title ?? 'Are you sure?'}
                    </>
                }
            >
                <p className="t-dim">{pending?.message}</p>
                <div className="modal-actions">
                    <button className="btn btn--secondary" onClick={() => close(false)}>
                        {pending?.cancelText ?? 'Cancel'}
                    </button>
                    <button
                        className={`btn ${pending?.danger ? 'btn--danger' : 'btn--primary'}`}
                        onClick={() => close(true)}
                        autoFocus
                    >
                        {pending?.confirmText ?? 'Confirm'}
                    </button>
                </div>
            </Modal>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx;
}
