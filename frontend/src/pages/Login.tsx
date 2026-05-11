import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await login(email, password);
            navigate('/app/home');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.4s ease' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
                    <h1 style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>Zenith Catalyst</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your AI-powered catalyst for peak performance and lasting habits.</p>
                </div>

                {/* Card */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '0.25rem' }}>Welcome back</h2>
                    <p style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>Sign in to continue your journey</p>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--error)', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label className="label">Email</label>
                            <input className="input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                            {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Signing in...</> : 'Sign In'}
                        </button>
                    </form>
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    No account? <Link to="/register" style={{ color: 'var(--brand-400)', fontWeight: 600, textDecoration: 'none' }}>Get started free →</Link>
                </p>
            </div>
        </div>
    );
}
