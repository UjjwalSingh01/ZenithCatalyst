import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTokens } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// Lands here after the backend Google OAuth callback redirects with tokens in
// the URL hash (#accessToken=…&refreshToken=…). Persists them, hydrates the
// user, then forwards into the app.
export default function GoogleCallback() {
    const navigate = useNavigate();
    const { refreshUser } = useAuth();
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;

        const params = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = params.get('accessToken');
        const refreshToken = params.get('refreshToken');

        if (!accessToken || !refreshToken) {
            navigate('/login?error=google', { replace: true });
            return;
        }

        setTokens(accessToken, refreshToken);
        // Clear the tokens out of the URL before continuing.
        window.history.replaceState(null, '', window.location.pathname);
        refreshUser().finally(() => navigate('/app/home', { replace: true }));
    }, [navigate, refreshUser]);

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '0.75rem' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Signing you in…</span>
        </div>
    );
}
