import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/providers";
import { PwaRegister } from "@/components/pwa/pwa-register";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "FinTrace - Subscription & Bill Alert",
    description: "Never miss a bill payment. Smart subscription manager with 3-day advance alerts.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "FinTrace",
    },
};

export const viewport: Viewport = {
    themeColor: "#09090b",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-primary/20`}
            >
                <Providers>
                    <PwaRegister />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
