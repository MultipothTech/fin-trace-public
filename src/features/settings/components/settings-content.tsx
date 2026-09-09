"use client";

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Globe, Moon, Sun, Monitor, Bell, BellOff, Download, Smartphone, FolderKanban, ChevronRight, Share, MoreVertical, Laptop, CheckCircle2, AlertCircle, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { useApp } from '@/providers/app-store';
import { useAuth, type AppUser } from '@/providers/auth-provider';
import { TRANSLATIONS } from '@/config/constants';
import { requestNotificationPermission } from '@/features/notifications/services/notification-service';
import { CategoryManagerModal } from '@/features/subscriptions/components/category-manager-modal';
import { TagManagerModal } from '@/features/tags/components/tag-manager-modal';
import { ProjectManagerModal } from '@/features/projects/components/project-manager-modal';

export interface SettingsContentProps {
    user?: AppUser | {
        id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
    } | null;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({ user }) => {
    const { language, setLanguage, categories, tags, projects, settings, updateSettings } = useApp();
    const { signOut } = useAuth();
    const { setTheme, theme } = useTheme();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;

    const [notificationPerm, setNotificationPerm] = useState<string>('default');
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [projectModalOpen, setProjectModalOpen] = useState(false);
    const [pwaModalOpen, setPwaModalOpen] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    const isNotificationOn = settings?.notificationEnabled !== false;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if ('Notification' in window) {
                setNotificationPerm(Notification.permission);
            }
            if (window.matchMedia('(display-mode: standalone)').matches) {
                setIsStandalone(true);
            }
        }
    }, []);

    const handleToggleNotification = async (enabled: boolean) => {
        if (enabled) {
            const perm = await requestNotificationPermission();
            setNotificationPerm(perm);
            await updateSettings({ notificationEnabled: true });
        } else {
            await updateSettings({ notificationEnabled: false });
        }
    };

    const handleEnableNotification = async () => {
        const perm = await requestNotificationPermission();
        setNotificationPerm(perm);
        await updateSettings({ notificationEnabled: true });
    };

    const avatarUrl =
        user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}`;
    const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'FT';

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-12">
            <h2 className="text-2xl font-bold tracking-tight">{t.settings.title}</h2>

            {/* Profile Section (Read-only Account Information) */}
            <section className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.settings.profile}
                </h3>

                <Card className="p-4 bg-card border-border flex items-center gap-4">
                    <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={avatarUrl} alt="Profile" className="object-cover" />
                        <AvatarFallback className="text-base font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5 min-w-0">
                        <h4 className="font-semibold text-foreground text-base truncate">
                            {user?.name || 'User'}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                            {user?.email || ''}
                        </p>
                    </div>
                </Card>
            </section>

            {/* Notification & 3-Day Alert Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.settings.notifications}
                </h3>

                <Card className="p-4 bg-card border-border space-y-4">
                    <div className="flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                                isNotificationOn
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-muted text-muted-foreground'
                            }`}>
                                {isNotificationOn ? (
                                    <Bell className="w-5 h-5" />
                                ) : (
                                    <BellOff className="w-5 h-5" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">
                                        {t.settings.enable3DayAlert}
                                    </p>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] py-0 px-2 font-medium ${
                                            isNotificationOn
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                                : 'bg-muted text-muted-foreground border-border'
                                        }`}
                                    >
                                        {isNotificationOn
                                            ? (language === 'th' ? 'เปิดใช้งาน' : 'Enabled')
                                            : (language === 'th' ? 'ปิดการใช้งาน' : 'Disabled')}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {t.settings.enable3DayAlertDesc}
                                </p>
                            </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                            <Switch
                                id="notification-switch"
                                checked={isNotificationOn}
                                onCheckedChange={handleToggleNotification}
                                aria-label="Toggle notifications"
                            />
                        </div>
                    </div>

                    {/* Notification Permission Warning if denied */}
                    {notificationPerm === 'denied' && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{t.settings.permissionDenied}</span>
                        </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                            {notificationPerm !== 'granted' && isNotificationOn && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={handleEnableNotification}
                                    className="text-xs"
                                >
                                    {language === 'th' ? 'ขอสิทธิ์แจ้งเตือนบนเบราว์เซอร์' : 'Grant Browser Permission'}
                                </Button>
                            )}
                        </div>

                        <span className="text-[11px] text-muted-foreground">
                            {notificationPerm === 'granted'
                                ? (language === 'th' ? '✓ ได้รับสิทธิ์บนเบราว์เซอร์แล้ว' : '✓ Browser permission granted')
                                : (language === 'th' ? 'รอสิทธิ์แจ้งเตือนบนเบราว์เซอร์' : 'Browser permission required')}
                        </span>
                    </div>
                </Card>
            </section>

            {/* PWA App Installation Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.settings.pwaTitle}
                </h3>

                <Card className="p-4 bg-card border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">PWA Mobile & Desktop App</p>
                            <p className="text-xs text-muted-foreground">{t.settings.pwaDesc}</p>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPwaModalOpen(true)}
                        className="text-xs gap-1.5 shrink-0"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {t.settings.pwaInstall}
                    </Button>
                </Card>
            </section>

            {/* Categories Management Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {language === 'th' ? 'หมวดหมู่บริการ' : 'Subscription Categories'}
                </h3>

                <Card className="p-4 bg-card border-border flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg shrink-0">
                            <FolderKanban className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {language === 'th' ? 'จัดการหมวดหมู่บริการ' : 'Manage Categories'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {language === 'th'
                                    ? `มีทั้งหมด ${categories.length} หมวดหมู่ (เพิ่ม/แก้ไข/ลบหมวดหมู่ของตนเอง)`
                                    : `${categories.length} categories available (Create/Edit/Delete custom)`}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCategoryModalOpen(true)}
                        className="text-xs gap-1.5 shrink-0"
                    >
                        {language === 'th' ? 'จัดการ' : 'Manage'}
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </Card>
            </section>

            {/* Tags Management Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {language === 'th' ? 'แท็ก' : 'Tags'}
                </h3>

                <Card className="p-4 bg-card border-border flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg shrink-0">
                            <Tags className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {language === 'th' ? 'จัดการแท็ก' : 'Manage Tags'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {language === 'th'
                                    ? `มีทั้งหมด ${tags.length} แท็ก (ใช้กับแพ็กเกจและประวัติชำระ)`
                                    : `${tags.length} tags (for subscriptions & payment history)`}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTagModalOpen(true)}
                        className="text-xs gap-1.5 shrink-0"
                    >
                        {language === 'th' ? 'จัดการ' : 'Manage'}
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </Card>
            </section>

            {/* Projects Management Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {language === 'th' ? 'โปรเจค' : 'Projects'}
                </h3>

                <Card className="p-4 bg-card border-border flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg shrink-0">
                            <FolderKanban className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                                {language === 'th' ? 'จัดการโปรเจค' : 'Manage Projects'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                                {language === 'th'
                                    ? `มีทั้งหมด ${projects.length} โปรเจค (ใช้กับแพ็กเกจและประวัติชำระ)`
                                    : `${projects.length} projects (for subscriptions & payment history)`}
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setProjectModalOpen(true)}
                        className="text-xs gap-1.5 shrink-0"
                    >
                        {language === 'th' ? 'จัดการ' : 'Manage'}
                        <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                </Card>
            </section>

            {/* Appearance & Language Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.settings.appearance}
                </h3>

                {/* Language Switch */}
                <Card className="flex flex-row items-center justify-between p-4 bg-card border-border gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-secondary rounded-lg shrink-0">
                            <Globe className="w-4 h-4 text-secondary-foreground" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{t.settings.language}</p>
                            <p className="text-xs text-muted-foreground truncate">{t.settings.languageDesc}</p>
                        </div>
                    </div>
                    <div className="flex bg-muted border border-border rounded-lg p-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                language === 'en'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('th')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                                language === 'th'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            TH
                        </button>
                    </div>
                </Card>

                {/* Theme Switch */}
                <Card className="flex flex-row items-center justify-between p-4 bg-card border-border gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-secondary rounded-lg shrink-0">
                            <Moon className="w-4 h-4 text-secondary-foreground" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">Theme</p>
                            <p className="text-xs text-muted-foreground truncate">Change appearance mode</p>
                        </div>
                    </div>
                    <div className="flex bg-muted border border-border rounded-lg p-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => setTheme("light")}
                            className={`p-2 rounded-md transition-colors ${
                                theme === 'light'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-label="Light mode"
                        >
                            <Sun className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setTheme("dark")}
                            className={`p-2 rounded-md transition-colors ${
                                theme === 'dark'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-label="Dark mode"
                        >
                            <Moon className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setTheme("system")}
                            className={`p-2 rounded-md transition-colors ${
                                theme === 'system'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-label="System mode"
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                    </div>
                </Card>
            </section>

            {/* Logout Section */}
            <section className="space-y-4 pt-6 border-t border-border">
                <Button
                    variant="destructive"
                    className="w-full md:w-auto"
                    onClick={() => signOut()}
                >
                    {t.nav.logout}
                </Button>
            </section>

            {/* Category Manager Modal */}
            <CategoryManagerModal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                language={language}
            />

            {/* Tag Manager Modal */}
            <TagManagerModal
                isOpen={tagModalOpen}
                onClose={() => setTagModalOpen(false)}
                language={language}
            />
            <ProjectManagerModal
                isOpen={projectModalOpen}
                onClose={() => setProjectModalOpen(false)}
                language={language}
            />

            {/* PWA Installation Guide Dialog */}
            <Dialog open={pwaModalOpen} onOpenChange={setPwaModalOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <Smartphone className="w-5 h-5 text-primary" />
                            {language === 'th' ? 'วิธีติดตั้งแอป FinTrace (PWA)' : 'How to Install FinTrace App'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {language === 'th'
                                ? 'ติดตั้งลงบนอุปกรณ์เพื่อเปิดใช้งานได้เร็วและรับการแจ้งเตือนบิลล่วงหน้า 3 วัน'
                                : 'Install on your device for quick access and offline background bill alerts'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        {isStandalone ? (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                                <span>{language === 'th' ? 'แอปพลิเคชันได้รับการติดตั้งและเปิดในโหมด App เรียบร้อยแล้ว' : 'FinTrace is currently running in installed standalone app mode'}</span>
                            </div>
                        ) : null}

                        {/* iOS Safari */}
                        <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <Share className="w-4 h-4 text-blue-400" />
                                <span>iOS (iPhone / iPad - Safari)</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1 leading-relaxed">
                                <li>{language === 'th' ? 'กดปุ่มแชร์' : 'Tap the Share button'} <strong className="text-foreground">(Share Icon)</strong> {language === 'th' ? 'ที่แถบด้านล่างของ Safari' : 'at the bottom bar'}</li>
                                <li>{language === 'th' ? 'เลื่อนลงแล้วเลือก' : 'Scroll down and select'} <strong className="text-foreground">&quot;เพิ่มไปยังหน้าจอโฮม&quot; (Add to Home Screen)</strong></li>
                                <li>{language === 'th' ? 'กดปุ่ม' : 'Tap'} <strong className="text-foreground">&quot;เพิ่ม&quot; (Add)</strong> {language === 'th' ? 'ที่มุมขวาบน' : 'at top right'}</li>
                            </ol>
                        </div>

                        {/* Android Chrome */}
                        <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <MoreVertical className="w-4 h-4 text-emerald-400" />
                                <span>Android (Chrome)</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1 leading-relaxed">
                                <li>{language === 'th' ? 'กดปุ่มจุดสามจุด' : 'Tap the three dots menu'} <strong className="text-foreground">(⋮)</strong> {language === 'th' ? 'ที่มุมขวาบนของ Chrome' : 'at top right'}</li>
                                <li>{language === 'th' ? 'เลือก' : 'Select'} <strong className="text-foreground">&quot;ติดตั้งแอป&quot; (Install App)</strong> {language === 'th' ? 'หรือ &quot;เพิ่มลงในหน้าจอหลัก&quot;' : 'or "Add to Home Screen"'}</li>
                                <li>{language === 'th' ? 'กดยืนยันการติดตั้ง' : 'Confirm install'}</li>
                            </ol>
                        </div>

                        {/* Desktop Chrome / Edge */}
                        <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-1.5">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                                <Laptop className="w-4 h-4 text-purple-400" />
                                <span>Desktop (Chrome / Edge / Safari Mac)</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1 leading-relaxed">
                                <li>{language === 'th' ? 'กดไอคอนคอมพิวเตอร์หรือลูกศรดาวน์โหลด' : 'Click the install icon'} <strong className="text-foreground">({language === 'th' ? 'ไอคอนติดตั้ง' : 'Install Icon'})</strong> {language === 'th' ? 'ที่แถบ Address bar ด้านบน' : 'in the browser URL bar'}</li>
                                <li>{language === 'th' ? 'กดปุ่ม' : 'Click'} <strong className="text-foreground">&quot;ติดตั้ง&quot; (Install)</strong></li>
                            </ol>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setPwaModalOpen(false)} className="w-full text-xs">
                            {language === 'th' ? 'เข้าใจแล้ว / ปิด' : 'Got it / Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
