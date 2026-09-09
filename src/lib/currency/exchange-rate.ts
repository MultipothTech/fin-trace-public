/**
 * Currency Exchange Rate Service (USD to THB)
 * รองรับการดึงอัตราแลกเปลี่ยนแบบ Real-time พร้อม Multi-tier API Fallback และ Caching
 */

export const DEFAULT_USD_THB_RATE = 35.0;
const CACHE_KEY = 'fintrace_usd_thb_rate';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 ชั่วโมง

interface CachedRate {
    rate: number;
    timestamp: number;
}

let memoryRateCache: CachedRate | null = null;

/**
 * ดึงอัตราแลกเปลี่ยน 1 USD เป็น THB
 * 1. ตรวจสอบ In-memory & localStorage Cache
 * 2. Primary API: open.er-api.com
 * 3. Secondary Fallback API: api.exchangerate-api.com
 * 4. Default Static Fallback: 35.00
 */
export async function getUsdToThbRate(): Promise<{ rate: number; isFallback: boolean; updatedAt: Date }> {
    const now = Date.now();

    // 1. ตรวจสอบ Memory Cache
    if (memoryRateCache && now - memoryRateCache.timestamp < CACHE_DURATION_MS) {
        return { rate: memoryRateCache.rate, isFallback: false, updatedAt: new Date(memoryRateCache.timestamp) };
    }

    // 2. ตรวจสอบ localStorage Cache (ฝั่ง Client)
    if (typeof window !== 'undefined') {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed: CachedRate = JSON.parse(raw);
                if (now - parsed.timestamp < CACHE_DURATION_MS && parsed.rate > 0) {
                    memoryRateCache = parsed;
                    return { rate: parsed.rate, isFallback: false, updatedAt: new Date(parsed.timestamp) };
                }
            }
        } catch {
            // ignore localStorage error
        }
    }

    // 3. Primary API: open.er-api.com
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('https://open.er-api.com/v6/latest/USD', {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const thb = Number(data?.rates?.THB);
            if (thb && thb > 10 && thb < 100) {
                const resultRate = parseFloat(thb.toFixed(4));
                const cacheData: CachedRate = { rate: resultRate, timestamp: now };
                memoryRateCache = cacheData;
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                    } catch {
                        // ignore
                    }
                }
                return { rate: resultRate, isFallback: false, updatedAt: new Date(now) };
            }
        }
    } catch {
        // Continue to secondary API
    }

    // 4. Secondary Fallback API: api.exchangerate-api.com
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            const thb = Number(data?.rates?.THB);
            if (thb && thb > 10 && thb < 100) {
                const resultRate = parseFloat(thb.toFixed(4));
                const cacheData: CachedRate = { rate: resultRate, timestamp: now };
                memoryRateCache = cacheData;
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                    } catch {
                        // ignore
                    }
                }
                return { rate: resultRate, isFallback: false, updatedAt: new Date(now) };
            }
        }
    } catch {
        // Fallback to static or previous cached rate
    }

    // 5. Fallback
    const fallbackRate = memoryRateCache?.rate || DEFAULT_USD_THB_RATE;
    return {
        rate: fallbackRate,
        isFallback: true,
        updatedAt: new Date(now),
    };
}

/**
 * แปลงค่าเงินจาก USD เป็น THB ตามอัตราแลกเปลี่ยนที่กำหนด
 */
export function convertUsdToThb(usdAmount: number, rate: number): number {
    if (!usdAmount || isNaN(usdAmount) || usdAmount <= 0) return 0;
    return parseFloat((usdAmount * rate).toFixed(2));
}
