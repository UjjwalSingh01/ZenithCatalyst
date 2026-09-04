import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { errMsg, fieldErrors } from '../lib/errors';
import GoogleButton from '../components/GoogleButton';
import AuthShell from '../components/AuthShell';
import { FormField, PasswordField } from '../components/FormField';
import Spinner from '../components/Spinner';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* The server's rule, not a stricter one invented here. registerSchema
   is `z.string().min(8)`, so this is the whole requirement: stating any
   more would promise a policy the API does not enforce. */
const MIN_PASSWORD = 8;

export default function Register() {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [banner, setBanner] = useState('');
    const [loading, setLoading] = useState(false);

    const refs = {
        firstName: useRef<HTMLInputElement>(null),
        email: useRef<HTMLInputElement>(null),
        password: useRef<HTMLInputElement>(null),
    };

    const { register } = useAuth();
    const navigate = useNavigate();

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
        setErrors((prev) => {
            if (!prev[key]) return prev;
            const { [key]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        const found: Record<string, string> = {};
        if (!form.firstName.trim()) found.firstName = 'Enter your first name.';
        if (!form.email.trim()) found.email = 'Enter your email address.';
        else if (!EMAIL.test(form.email.trim())) found.email = 'That does not look like an email address.';
        if (!form.password) found.password = 'Choose a password.';
        else if (form.password.length < MIN_PASSWORD) {
            found.password = `That is ${form.password.length} characters. It needs at least ${MIN_PASSWORD}.`;
        }

        if (Object.keys(found).length > 0) {
            setErrors(found);
            setBanner('');
            const first = (['firstName', 'email', 'password'] as const).find((k) => found[k]);
            if (first) refs[first].current?.focus();
            return;
        }

        setErrors({});
        setBanner('');
        setLoading(true);
        try {
            await register({
                ...form,
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
            });
            navigate('/app/home');
        } catch (err: unknown) {
            const perField = fieldErrors(err);
            if (Object.keys(perField).length > 0) {
                setErrors(perField);
                const first = (['firstName', 'email', 'password'] as const).find((k) => perField[k]);
                if (first) refs[first].current?.focus();
            } else {
                setBanner(errMsg(err, 'That did not go through. Check the details and try again.'));
            }
        } finally {
            setLoading(false);
        }
    };

    const longEnough = form.password.length >= MIN_PASSWORD;

    return (
        <AuthShell
            width={440}
            title="Light the first one"
            subtitle="One habit, kept daily, is where all of this starts."
            panelHeading="The month remembers what you kept."
            panelBody="No streak to protect and no score to defend. Only today's fire, and whether you fed it."
            footer={<>Already keeping fires? <Link to="/login">Sign in</Link></>}
        >
            {banner && (
                <div className="banner banner--error" role="alert" style={{ marginBottom: '1.15rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{banner}</span>
                </div>
            )}

            <form onSubmit={submit} noValidate>
                <fieldset disabled={loading} className="fieldset">
                    <div className="field-row">
                        <FormField
                            ref={refs.firstName}
                            label="First name"
                            autoComplete="given-name"
                            autoFocus
                            placeholder="Alex"
                            value={form.firstName}
                            error={errors.firstName}
                            onChange={set('firstName')}
                        />
                        {/* registerSchema marks this `.optional()`, so it says
                            so. An unmarked field reads as required. */}
                        <FormField
                            label="Last name"
                            optional
                            autoComplete="family-name"
                            placeholder="Rivera"
                            value={form.lastName}
                            error={errors.lastName}
                            onChange={set('lastName')}
                        />
                    </div>

                    <FormField
                        ref={refs.email}
                        label="Email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder="you@example.com"
                        value={form.email}
                        error={errors.email}
                        onChange={set('email')}
                    />

                    {/* The requirement lives under the field, not in the
                        placeholder. A placeholder disappears the moment you
                        start typing, which is exactly when you need it. */}
                    <PasswordField
                        ref={refs.password}
                        label="Password"
                        autoComplete="new-password"
                        placeholder="Choose a password"
                        value={form.password}
                        error={errors.password}
                        hint={longEnough ? 'Long enough.' : `At least ${MIN_PASSWORD} characters.`}
                        hintMet={longEnough}
                        onChange={set('password')}
                    />

                    <button className="btn btn--primary btn--lg auth-submit" type="submit">
                        {loading ? <><Spinner /> Creating account…</> : 'Create account'}
                    </button>
                </fieldset>
            </form>

            <GoogleButton label="Sign up with Google" disabled={loading} />
        </AuthShell>
    );
}
