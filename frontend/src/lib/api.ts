import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// ─── Auth helpers ─────────────────────────────────────────────────
function getToken() { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }
function setTokens(access: string, refresh: string) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
}
function clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
}

// ─── Interceptors ─────────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
    failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
    failedQueue = [];
}

api.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        if (error.response?.status === 401 && !original._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    original.headers.Authorization = `Bearer ${token}`;
                    return api(original);
                });
            }
            original._retry = true;
            isRefreshing = true;
            const refreshToken = getRefreshToken();
            if (!refreshToken) { clearTokens(); window.location.href = '/'; return Promise.reject(error); }
            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
                setTokens(data.data.accessToken, data.data.refreshToken);
                processQueue(null, data.data.accessToken);
                original.headers.Authorization = `Bearer ${data.data.accessToken}`;
                return api(original);
            } catch (refreshError) {
                processQueue(refreshError, null);
                clearTokens();
                window.location.href = '/';
                return Promise.reject(refreshError);
            } finally { isRefreshing = false; }
        }
        return Promise.reject(error);
    }
);

export { setTokens, clearTokens, BASE_URL };
export default api;
