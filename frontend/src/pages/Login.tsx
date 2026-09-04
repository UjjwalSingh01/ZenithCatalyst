import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { errMsg, fieldErrors } from '../lib/errors';
import GoogleButton from '../components/GoogleButton';
import AuthShell from '../components/AuthShell';
import { FormField, PasswordField } from '../components/FormField';
import Spinner from '../components/Spinner';

const ERRORS: Record<string, string> = {
    google: 'Google sign-in did not complete. Try again.',
    google_unavailable: 'Google sign-in is not set up on this server.',
};

/* Deliberately permissive. The server is the authority on what it will
   accept; this only catches the mistakes worth catching before a round
   trip, and never rejects an address the server would have taken. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [banner, setBanner] = useState('');
    const [loading, setLoading] = useState(false);

    const emailRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);

    const { login } = useAuth();
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();

    /* Read the OAuth failure, then strip it from the URL. Left in place
       it survives a refresh, so the page keeps reporting a failure that
       already happened. */
    useEffect(() => {
        const code = params.get('error');
        if (!code) return;
        setBanner(ERRORS[code] || 'Sign-in did not complete. Try again.');
        const next = new URLSearchParams(params);
        next.delete('error');
        setParams(next, { replace: true });
    }, [params, setParams]);

    const clear = (field: string) =>
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const { [field]: _removed, ...rest } = prev;
            return rest;
        });

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        const found: Record<string, string> = {};
        if (!email.trim()) found.email = 'Enter your email address.';
        else if (!EMAIL.test(email.trim())) found.email = 'That does not look like an email address.';
        if (!password) found.password = 'Enter your password.';

        if (Object.keys(found).length > 0) {
            setErrors(found);
            setBanner('');
            (found.email ? emailRef : passwordRef).current?.focus();
            return;
        }

        setErrors({});
        setBanner('');
        setLoading(true);
        try {
            await login(email.trim(), password);
            navigate('/app/home');
        } catch (err: unknown) {
            /* A 422 carries per-field reasons. Showing its envelope
               message instead would put "Validation failed" on screen
               and leave the person to guess which field. */
            const perField = fieldErrors(err);
            if (Object.keys(perField).length > 0) {
                setErrors(perField);
                (perField.email ? emailRef : passwordRef).current?.focus();
            } else {
                setBanner(errMsg(err, 'That email and password do not match an account.'));
            }
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
            {banner && (
                <div className="banner banner--error" role="alert" style={{ marginBottom: '1.15rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{banner}</span>
                </div>
            )}

            {/* noValidate: the browser's own bubbles say different things in
                different browsers and would compete with the messages below
                each field. One voice for errors, ours. */}
            <form onSubmit={submit} noValidate>
                <fieldset disabled={loading} className="fieldset">
                    <FormField
                        ref={emailRef}
                        label="Email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoFocus
                        placeholder="you@example.com"
                        value={email}
                        error={errors.email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            clear('email');
                        }}
                    />

                    <PasswordField
                        ref={passwordRef}
                        label="Password"
                        autoComplete="current-password"
                        placeholder="Your password"
                        value={password}
                        error={errors.password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            clear('password');
                        }}
                    />

                    <button className="btn btn--primary btn--lg auth-submit" type="submit">
                        {loading ? <><Spinner /> Signing in…</> : 'Sign in'}
                    </button>
                </fieldset>
            </form>

            <GoogleButton disabled={loading} />
        </AuthShell>
    );
}
