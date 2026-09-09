"use client";

import React, { useState } from 'react';
import { BellRing, ArrowUpRight, Loader2, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';

/**
 * Landing Page สำหรับ Subscription Alert PWA App
 */
export const LandingContent: React.FC = () => {
    const { signInWithGoogle } = useAuth();
    const [signingIn, setSigningIn] = useState(false);

    const handleSignIn = async () => {
        try {
            setSigningIn(true);
            await signInWithGoogle();
        } catch {
            setSigningIn(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background text-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.03),transparent_70%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />

            {/* Glowing App Icon */}
            <div className="w-24 h-24 mb-8 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-zinc-100 to-zinc-50 border border-amber-500/30 text-amber-600 dark:from-amber-500/20 dark:via-zinc-800 dark:to-zinc-950 dark:border-zinc-800 dark:text-amber-400 flex items-center justify-center shadow-2xl relative">
                <div className="absolute inset-0 bg-amber-500/10 blur-xl rounded-full" />
                <BellRing className="w-10 h-10 text-amber-600 dark:text-amber-400 relative z-10 animate-pulse" />
            </div>

            {/* Title & Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" /> 3-Day Advance Bill Alerts PWA
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 max-w-md">
                Never Miss a Bill Again.
            </h1>

            <p className="text-muted-foreground max-w-sm mb-8 text-sm md:text-base leading-relaxed">
                Track all your subscriptions in one place. Receive smart notifications 3 days before renewal dates on mobile and desktop.
            </p>

            <Button
                onClick={handleSignIn}
                disabled={signingIn}
                size="lg"
                className="w-full max-w-xs gap-3 font-semibold group relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl"
            >
                {signingIn ? (
                    <span className="relative z-10 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                    </span>
                ) : (
                    <span className="relative z-10 flex items-center gap-2">
                        Get Started with Google{' '}
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                )}
            </Button>

            {/* Features Highlight */}
            <div className="grid grid-cols-3 gap-4 mt-12 max-w-xs text-xs text-muted-foreground">
                <div className="flex flex-col items-center gap-1">
                    <BellRing className="w-4 h-4 text-foreground/70" />
                    <span>3-Day Alert</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <Calendar className="w-4 h-4 text-foreground/70" />
                    <span>Bill Calendar</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-foreground/70" />
                    <span>PWA Install</span>
                </div>
            </div>
        </div>
    );
};
