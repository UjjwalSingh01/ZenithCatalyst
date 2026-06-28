import { AxiosError } from 'axios';

// Extracts a human-readable message from an API error, falling back to a default.
export function errMsg(err: unknown, fallback: string): string {
    const ax = err as AxiosError<{ message?: string }>;
    return ax?.response?.data?.message || fallback;
}
