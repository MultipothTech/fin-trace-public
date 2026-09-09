/**
 * Notification Service
 * จัดการการคำนวณวันแจ้งเตือนล่วงหน้า 3 วัน และการส่ง Web Notification ผ่าน PWA
 */

export interface SubscriptionAlertItem {
    id: string;
    name: string;
    price: number;
    currency: string;
    nextBillingDate: string; // YYYY-MM-DD
    category: string;
    daysRemaining: number;
    isUrgent: boolean; // <= 3 days
}

/**
 * คำนวณจำนวนวันที่เหลือก่อนถึงวันตัดรอบบิล
 */
export function calculateDaysRemaining(billingDateStr: string): number {
    if (!billingDateStr || typeof billingDateStr !== 'string') return 999;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = billingDateStr.split("-").map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return 999;

    const [year, month, day] = parts;
    const targetDate = new Date(year, month - 1, day);
    if (isNaN(targetDate.getTime())) return 999;
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * ขอสิทธิ์ส่ง Browser / PWA Notification
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
        return "denied";
    }

    if (Notification.permission === "granted") {
        return "granted";
    }

    return await Notification.requestPermission();
}

/**
 * ส่งการแจ้งเตือนบิลที่ใกล้ถึงกำหนดชำระ (3 วันล่วงหน้า)
 */
export async function sendSubscriptionNotification(
    title: string,
    body: string,
    icon = "/favicon.ico"
) {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;
    }

    try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.ready) {
            const reg = await navigator.serviceWorker.ready;
            await (reg as unknown as { showNotification: (title: string, opt: Record<string, unknown>) => Promise<void> }).showNotification(title, {
                body,
                icon,
                badge: icon,
                vibrate: [200, 100, 200],
            });
            return;
        }

        new Notification(title, { body, icon });
    } catch (err) {
        console.error("Failed to show notification:", err);
    }
}

/**
 * ตรวจสอบและส่งการแจ้งเตือนอัตโนมัติสำหรับ Subscription ที่จะตัดบิลใน 3 วัน
 */
export async function checkAndTrigger3DayAlerts(
    subscriptions: Array<{
        name: string;
        price: number;
        currency?: string;
        next_billing_date?: string;
        nextBillingDate?: string;
        status?: string;
    }>,
    language: "th" | "en" = "th"
) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const urgentItems = subscriptions.filter((sub) => {
        if (sub.status && sub.status !== "active") return false;
        const date = sub.nextBillingDate || sub.next_billing_date;
        if (!date) return false;
        const days = calculateDaysRemaining(date);
        return days >= 0 && days <= 3;
    });

    if (urgentItems.length === 0) return;

    urgentItems.forEach((sub) => {
        const date = sub.nextBillingDate || sub.next_billing_date || "";
        const days = calculateDaysRemaining(date);
        const curr = sub.currency || "฿";

        let title = "";
        let body = "";

        if (language === "th") {
            if (days === 0) {
                title = `แจ้งเตือนบิล ${sub.name} ถึงกำหนดชำระวันนี้!`;
                body = `ยอดชำระ ${curr}${sub.price.toLocaleString()} จะตัดเงินวันนี้ กรุณาตรวจสอบยอดเงินในบัญชี`;
            } else {
                title = `แจ้งเตือนบิล ${sub.name} (อีก ${days} วัน)`;
                body = `บิล ${sub.name} จำนวน ${curr}${sub.price.toLocaleString()} จะถึงกำหนดตัดเงินในวันที่ ${date}`;
            }
        } else {
            if (days === 0) {
                title = `${sub.name} Bill Due Today!`;
                body = `Payment of ${curr}${sub.price.toLocaleString()} will be charged today. Please ensure sufficient balance.`;
            } else {
                title = `${sub.name} Renews in ${days} Days`;
                body = `Your ${sub.name} subscription (${curr}${sub.price.toLocaleString()}) is scheduled for renewal on ${date}.`;
            }
        }

        sendSubscriptionNotification(title, body);
    });
}
