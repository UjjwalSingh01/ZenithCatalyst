import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { login as loginApi, register as registerApi, logout as logoutApi, fetchProfile, User } from '../lib/queries';

interface AuthCtx {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: { firstName: string; lastName?: string; email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) { setUser(null); setIsLoading(false); return; }
        try {
            const profile = await fetchProfile();
            setUser(profile);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { refreshUser(); }, [refreshUser]);

    const login = async (email: string, password: string) => {
        await loginApi(email, password);
        await refreshUser();
    };

    const register = async (data: { firstName: string; lastName?: string; email: string; password: string }) => {
        await registerApi(data);
        await refreshUser();
    };

    const logout = async () => {
        await logoutApi();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
