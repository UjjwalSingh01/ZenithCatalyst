import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GoogleButton from '../components/GoogleButton';
import AuthShell from '../components/AuthShell';
import Spinner from '../components/Spinner';

const ERRORS: Record<string, string> = {
    google: 'Google sign-in did not complete. Try again.',
    google_unavailable: 'Google sign-in is not set up on this server.',
};

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();

    useEffect(() => {
        const e = params.get('error');
        if (e) setError(ERRORS[e] || 'Sign-in did not complete. Try again.');
    }, [params]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/app/home');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'That email and password do not match an account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Pick up where you left off."
            footer={<>No account yet? <Link to="/register">Start keeping one</Link></>}
        >
            {error && (
                <div className="banner banner--error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={submit} className="stack stack--lg">
                <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input
                        id="email"
                        className="input"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        className="input"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
                    {loading ? <><Spinner /> Signing in…</> : 'Sign in'}
                </button>
            </form>

            <GoogleButton />
        </AuthShell>
    );
}
