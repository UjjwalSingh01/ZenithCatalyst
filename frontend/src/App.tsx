import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import GoogleCallback from './pages/GoogleCallback';
import Homepage from './pages/Homepage';
import Habits from './pages/Habits';
import Analytics from './pages/Analytics';
import Coaching from './pages/Coaching';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    if (isLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '0.75rem' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>
        </div>
    );
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />
                <Route
                    path="/app"
                    element={
                        <ProtectedRoute>
                        <AppLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<Homepage />} />
                    <Route path="habits" element={<Habits />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="coaching" element={<Coaching />} />
                    <Route path="reminders" element={<Reminders />} />
                    <Route path="profile" element={<Profile />} />
                </Route>
                <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
        </BrowserRouter >
    );
}
