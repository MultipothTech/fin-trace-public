"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AppUser {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    rawUser: SupabaseUser;
}

interface AuthContextType {
    user: AppUser | null;
    session: Session | null;
    isLoading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signInWithGoogle: async () => {},
    signOut: async () => {},
});

function formatUser(supabaseUser: SupabaseUser | null): AppUser | null {
    if (!supabaseUser) return null;

    const metadata = supabaseUser.user_metadata || {};
    const name = metadata.full_name || metadata.name || supabaseUser.email?.split('@')[0] || 'User';
    const image = metadata.avatar_url || metadata.picture || null;

    return {
        id: supabaseUser.id,
        email: supabaseUser.email || null,
        name,
        image,
        rawUser: supabaseUser,
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<AppUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        // ดึง session ปัจจุบัน
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (isMounted) {
                setSession(session);
                setUser(formatUser(session?.user ?? null));
                setIsLoading(false);
            }
        });

        // ติดตามการเปลี่ยนแปลงสถานะ Authentication (Login / Logout / Token Refresh)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            if (isMounted) {
                setSession(session);
                setUser(formatUser(session?.user ?? null));
                setIsLoading(false);
            }
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = useCallback(async () => {
        const redirectTo = `${window.location.origin}/auth/callback`;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) {
            console.error('Sign-in error:', error.message);
            throw error;
        }
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        window.location.href = '/';
    }, []);

    const value = useMemo(
        () => ({
            user,
            session,
            isLoading,
            signInWithGoogle,
            signOut,
        }),
        [user, session, isLoading, signInWithGoogle, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
