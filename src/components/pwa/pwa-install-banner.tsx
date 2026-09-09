"use client";

import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
            setIsVisible(false);
            setDeferredPrompt(null);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                    <Download className="w-4 h-4" />
                </div>
                <div>
                    <p className="font-semibold text-foreground">Install FinTrace App</p>
                    <p className="text-xs text-muted-foreground">Add to Home Screen for instant bill alerts</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleInstall} className="h-8 text-xs font-semibold">
                    Install
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsVisible(false)}
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
