import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            await register(form);
            navigate('/app/home');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div style={{ width: '100%', maxWidth: 440, animation: 'fadeIn 0.4s ease' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚡</div>
                    <h1 style={{ background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.25rem' }}>Zenith Catalyst</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Your AI-powered catalyst for peak performance and lasting habits.</p>
                </div>

                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '0.25rem' }}>Create account</h2>
                    <p style={{ marginBottom: '1.75rem', fontSize: '0.875rem' }}>Join thousands building better habits with AI</p>

                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--error)', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label className="label">First Name</label>
                                <input className="input" placeholder="Alex" value={form.firstName} onChange={set('firstName')} required />
                            </div>
                            <div>
                                <label className="label">Last Name</label>
                                <input className="input" placeholder="Smith" value={form.lastName} onChange={set('lastName')} />
                            </div>
                        </div>
                        <div>
                            <label className="label">Email</label>
                            <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                        </div>
                        <div>
                            <label className="label">Password</label>
                            <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} minLength={8} required />
                        </div>
                        <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}>
                            {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Creating account...</> : 'Create Account →'}
                        </button>
                    </form>

                    <GoogleButton label="Sign up with Google" />
                </div>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--brand-400)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
