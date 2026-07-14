import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import GoogleButton from '../components/GoogleButton';
import AuthShell from '../components/AuthShell';
import Spinner from '../components/Spinner';

export default function Register() {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(form);
            navigate('/app/home');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'That did not go through. Check the details and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            width={440}
            title="Light the first one"
            subtitle="One habit, kept daily, is where all of this starts."
            footer={<>Already keeping fires? <Link to="/login">Sign in</Link></>}
        >
            {error && (
                <div className="banner banner--error" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={submit} className="stack stack--lg">
                <div className="grid-2" style={{ gap: '0.75rem' }}>
                    <div>
                        <label className="label" htmlFor="firstName">First name</label>
                        <input id="firstName" className="input" autoComplete="given-name" placeholder="Alex" value={form.firstName} onChange={set('firstName')} required />
                    </div>
                    <div>
                        <label className="label" htmlFor="lastName">Last name</label>
                        <input id="lastName" className="input" autoComplete="family-name" placeholder="Smith" value={form.lastName} onChange={set('lastName')} />
                    </div>
                </div>
                <div>
                    <label className="label" htmlFor="email">Email</label>
                    <input id="email" className="input" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
                </div>
                <div>
                    <label className="label" htmlFor="password">Password</label>
                    <input
                        id="password"
                        className="input"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={form.password}
                        onChange={set('password')}
                        minLength={8}
                        required
                    />
                </div>
                <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
                    {loading ? <><Spinner /> Creating account…</> : 'Create account'}
                </button>
            </form>

            <GoogleButton label="Sign up with Google" />
        </AuthShell>
    );
}
