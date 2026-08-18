'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AdminThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'admin-theme';

type AdminThemeContextValue = {
    theme: AdminThemeMode;
    resolvedTheme: 'light' | 'dark';
    setTheme: (mode: AdminThemeMode) => void;
};

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

function resolveTheme(mode: AdminThemeMode): 'light' | 'dark' {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<AdminThemeMode>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY) as AdminThemeMode | null;
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            setThemeState(stored);
        }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;

        const apply = () => {
            const resolved = resolveTheme(theme);
            setResolvedTheme(resolved);
            localStorage.setItem(STORAGE_KEY, theme);
        };

        apply();

        if (theme !== 'system') return;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => apply();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [theme, hydrated]);

    /* Đồng bộ nền html/body — tránh vệt trắng khi overscroll */
    useEffect(() => {
        if (!hydrated) return;
        const isDark = resolvedTheme === 'dark';
        const root = document.documentElement;
        const bg = isDark ? '#0d0d0d' : '#f7f7f7';

        // Ensure dark variants also work for React portals mounted to <body>.
        root.classList.toggle('dark', isDark);
        root.style.colorScheme = isDark ? 'dark' : 'light';
        root.style.backgroundColor = bg;
        document.body.style.backgroundColor = bg;

        return () => {
            root.classList.remove('dark');
            root.style.colorScheme = '';
            root.style.backgroundColor = '';
            document.body.style.backgroundColor = '';
        };
    }, [resolvedTheme, hydrated]);

    const setTheme = useCallback((mode: AdminThemeMode) => {
        setThemeState(mode);
    }, []);

    const value = useMemo(
        () => ({ theme, resolvedTheme, setTheme }),
        [theme, resolvedTheme, setTheme]
    );

    return (
        <AdminThemeContext.Provider value={value}>
            <div className={resolvedTheme === 'dark' ? 'dark' : ''}>{children}</div>
        </AdminThemeContext.Provider>
    );
}

export function useAdminTheme() {
    const ctx = useContext(AdminThemeContext);
    if (!ctx) {
        throw new Error('useAdminTheme must be used within AdminThemeProvider');
    }
    return ctx;
}
