import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setTokens } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FullPageSpinner } from '../components/Spinner';

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

    return <FullPageSpinner label="Signing you in…" />;
}
