import type { BillingCycle } from '@/features/subscriptions/types/subscription.types';

/**
 * แปลง Date object ให้อยู่ในรูป YYYY-MM-DD (ISO date format)
 * พร้อมระบบ fallback หาก Date ไม่ถูกต้อง (Invalid Date)
 */
function formatDateToISO(date: Date): string {
    if (!date || isNaN(date.getTime())) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * เลื่อนวันที่ไปข้างหน้า 1 รอบการชำระ
 */
function advanceByCycle(date: Date, cycle: BillingCycle, customIntervalDays = 1): void {
    const intervalDays = Math.max(1, Number(customIntervalDays) || 1);
    switch (cycle) {
        case 'daily':
            date.setDate(date.getDate() + intervalDays);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'quarterly':
            date.setMonth(date.getMonth() + 3);
            break;
        case 'half_yearly':
            date.setMonth(date.getMonth() + 6);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            date.setMonth(date.getMonth() + 1);
            break;
    }
}

/**
 * คำนวณวันตัดรอบบิลถัดไปอัตโนมัติจาก วันที่เริ่มสมัคร และ รอบการชำระเงิน
 * - บวกอย่างน้อย 1 รอบจากวันเริ่ม (เช่น เริ่ม 20 ก.ย. รายเดือน → 20 ต.ค.)
 * - ถ้ายังไม่ถึงอนาคต ให้ทบรอบต่อจนเกินวันนี้
 */
export function calculateNextBillingDate(
    startDateStr: string,
    cycle: BillingCycle,
    baseDate = new Date(),
    customIntervalDays = 1
): string {
    if (!startDateStr || typeof startDateStr !== 'string') {
        return formatDateToISO(new Date());
    }

    const parts = startDateStr.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) {
        return formatDateToISO(new Date());
    }

    const [year, month, day] = parts;
    const start = new Date(year, month - 1, day);
    if (isNaN(start.getTime())) {
        return formatDateToISO(new Date());
    }
    start.setHours(0, 0, 0, 0);

    const today = new Date(baseDate);
    if (isNaN(today.getTime())) {
        today.setTime(Date.now());
    }
    today.setHours(0, 0, 0, 0);

    const current = new Date(start);
    const MAX_ITERATIONS = 1000;
    let iterations = 0;

    // รอบแรก: วันตัดรอบถัดไป = วันเริ่ม + 1 รอบเสมอ
    advanceByCycle(current, cycle, customIntervalDays);
    iterations++;

    // ถ้ายังไม่พ้นวันนี้ ให้ทบต่อ (กรณีเริ่มสมัครในอดีต)
    while (current <= today && iterations < MAX_ITERATIONS) {
        advanceByCycle(current, cycle, customIntervalDays);
        iterations++;
    }

    return formatDateToISO(current);
}

/**
 * เลื่อนวันตัดรอบบิลถัดไปไปข้างหน้า 1 รอบการชำระเงิน (เมื่อผู้ใช้กดชำระแล้ว)
 */
export function advanceNextBillingDate(
    currentNextBillingDateStr: string,
    cycle: BillingCycle,
    customIntervalDays = 1
): string {
    if (!currentNextBillingDateStr || typeof currentNextBillingDateStr !== 'string') {
        return calculateNextBillingDate(formatDateToISO(new Date()), cycle, new Date(), customIntervalDays);
    }

    const parts = currentNextBillingDateStr.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) {
        return calculateNextBillingDate(formatDateToISO(new Date()), cycle, new Date(), customIntervalDays);
    }

    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
        return calculateNextBillingDate(formatDateToISO(new Date()), cycle, new Date(), customIntervalDays);
    }

    advanceByCycle(date, cycle, customIntervalDays);
    return formatDateToISO(date);
}

/**
 * ตรวจสอบว่า Subscription นี้ได้ถูกบันทึกว่าชำระแล้วในรอบปัจจุบัน/เดือนปัจจุบันหรือไม่
 * อ้างอิงจากรายการ Snapshot ในตาราง transactions ของบริการนี้
 * หากผู้ใช้ไปลบรายการในหน้าประวัติการชำระเงิน ฟังก์ชันนี้จะคืนค่า false ทำให้สามารถกลับมาติ๊กชำระใหม่ได้
 */
export function isSubscriptionPaidForCurrentCycle(
    subscription: {
        id: string;
        billingCycle?: BillingCycle;
        customIntervalDays?: number;
        nextBillingDate?: string;
    },
    transactions: Array<{
        subscriptionId?: string | null;
        transactionDate?: string;
        billingCycleDate?: string;
        description?: string;
    }> = []
): boolean {
    if (!subscription || !subscription.id || !transactions || transactions.length === 0) {
        return false;
    }

    const subTxs = transactions.filter((tx) => tx.subscriptionId === subscription.id);
    if (subTxs.length === 0) {
        return false;
    }

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentYear = `${now.getFullYear()}`;
    const todayStr = formatDateToISO(now);
    const cycle = subscription.billingCycle || 'monthly';

    return subTxs.some((tx) => {
        const txDate = tx.transactionDate || '';
        const cycleDate = tx.billingCycleDate || '';
        const desc = tx.description || '';

        // แยกวันที่รอบบิลจากคำอธิบาย
        let extractedCycle = cycleDate;
        if (!extractedCycle && desc) {
            const match = desc.match(/(?:รอบ|Cycle|cycle)\s*[:：]?\s*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2})/i);
            if (match && match[1]) extractedCycle = match[1];
        }

        switch (cycle) {
            case 'monthly': {
                // หากมีการบันทึกจ่ายในเดือนปัจจุบัน หรือรอบบิลที่จ่ายตรงกับเดือนปัจจุบัน
                return txDate.startsWith(currentYearMonth) || extractedCycle.startsWith(currentYearMonth);
            }
            case 'yearly': {
                // หากมีการบันทึกจ่ายในปีปัจจุบัน หรือรอบบิลที่จ่ายตรงกับปีปัจจุบัน
                return txDate.startsWith(currentYear) || extractedCycle.startsWith(currentYear);
            }
            case 'daily': {
                const interval = Math.max(1, Number(subscription.customIntervalDays) || 1);
                if (txDate === todayStr || extractedCycle === todayStr) return true;
                const parts = txDate.split('-').map(Number);
                if (parts.length < 3 || parts.some(isNaN)) return false;
                const tDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays < interval;
            }
            case 'weekly': {
                if (txDate === todayStr || extractedCycle === todayStr) return true;
                const parts = txDate.split('-').map(Number);
                if (parts.length < 3 || parts.some(isNaN)) return false;
                const tDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays < 7;
            }
            case 'quarterly': {
                const parts = txDate.split('-').map(Number);
                if (parts.length < 3 || parts.some(isNaN)) return false;
                const tDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays < 90;
            }
            case 'half_yearly': {
                const parts = txDate.split('-').map(Number);
                if (parts.length < 3 || parts.some(isNaN)) return false;
                const tDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const diffDays = Math.floor((now.getTime() - tDate.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays >= 0 && diffDays < 180;
            }
            default:
                return txDate.startsWith(currentYearMonth) || extractedCycle.startsWith(currentYearMonth);
        }
    });
}
