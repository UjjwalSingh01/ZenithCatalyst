import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/AppLayout';
import { FullPageSpinner } from './components/Spinner';
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
    if (isLoading) return <FullPageSpinner label="Stoking the fire…" />;
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
        </BrowserRouter>
    );
}
