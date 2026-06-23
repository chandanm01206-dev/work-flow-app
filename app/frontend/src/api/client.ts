/**
 * Thin fetch wrapper for the Freelance OS API.
 * All routes are prefixed with `/api`.
 */
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

let currentToken: string | null = null;

export const setApiToken = (token: string | null) => {
    currentToken = token;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init?.headers as any || {}),
    };

    if (currentToken) {
        headers["Authorization"] = `Bearer ${currentToken}`;
    }

    const res = await fetch(`${BASE}/api${path}`, {
        ...init,
        headers,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

export const api = {
    get: <T>(p: string) => req<T>(p),
    post: <T>(p: string, body?: unknown) =>
        req<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
    patch: <T>(p: string, body?: unknown) =>
        req<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
    put: <T>(p: string, body?: unknown) =>
        req<T>(p, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
    del: <T>(p: string) => req<T>(p, { method: "DELETE" }),
};

export const BACKEND_URL = BASE;