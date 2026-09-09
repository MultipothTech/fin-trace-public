/**
 * Thai Date Utilities
 * จัดการแปลงและจัดรูปแบบวันที่เป็นภาษาไทยและปีพุทธศักราช (พ.ศ.)
 */

export const THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/**
 * แปลง ISO date string (YYYY-MM-DD) เป็นวันที่ภาษาไทย (พ.ศ.)
 * @param isoDateStr วันที่ในรูปแบบ YYYY-MM-DD
 * @param format 'short' (09/09/2569), 'medium' (9 ก.ย. 2569), 'full' (วันพุธที่ 9 กันยายน พ.ศ. 2569)
 */
export function formatToThaiDate(
    isoDateStr: string | null | undefined,
    format: 'short' | 'medium' | 'full' = 'medium'
): string {
    if (!isoDateStr || typeof isoDateStr !== 'string') return '';
    const parts = isoDateStr.trim().split('-');
    if (parts.length < 3) return isoDateStr;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 0 || month > 11) {
        return isoDateStr;
    }

    const thaiYear = year + 543;

    if (format === 'short') {
        return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${thaiYear}`;
    }

    if (format === 'full') {
        const d = new Date(year, month, day);
        const dayName = THAI_DAYS[d.getDay()] || '';
        return `วัน${dayName}ที่ ${day} ${THAI_MONTHS_FULL[month]} พ.ศ. ${thaiYear}`;
    }

    // default 'medium': 9 ก.ย. 2569
    return `${day} ${THAI_MONTHS_SHORT[month]} ${thaiYear}`;
}

/**
 * ฟังก์ชันจัดรูปแบบวันที่ตามภาษาที่เลือก (th = พ.ศ. / en = ค.ศ.)
 */
export function formatLocalizedDate(
    isoDateStr: string | null | undefined,
    language: 'th' | 'en' = 'th',
    format: 'short' | 'medium' | 'full' = 'medium'
): string {
    if (!isoDateStr) return '';
    if (language === 'th') {
        return formatToThaiDate(isoDateStr, format);
    }

    const parts = isoDateStr.trim().split('-');
    if (parts.length < 3) return isoDateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return isoDateStr;

    const d = new Date(year, month, day);
    if (format === 'short') {
        return `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
    }
    if (format === 'full') {
        return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * จัดรูปแบบเดือน (YYYY-MM) ตามภาษา
 * th: ก.ย. 2569 / en: Sep 2026
 */
export function formatLocalizedMonth(
    yearMonth: string | null | undefined,
    language: 'th' | 'en' = 'th'
): string {
    if (!yearMonth || typeof yearMonth !== 'string') return '';
    const parts = yearMonth.trim().split('-');
    if (parts.length < 2) return yearMonth;

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return yearMonth;

    if (language === 'th') {
        return `${THAI_MONTHS_SHORT[month]} ${year + 543}`;
    }
    const d = new Date(year, month, 1);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * แปลงวันที่ในข้อความ description เช่น (รอบ 2026-10-06) ให้เป็นรูปแบบท้องถิ่น
 */
export function localizeDatesInText(
    text: string | null | undefined,
    language: 'th' | 'en' = 'th'
): string {
    if (!text) return '';
    return text.replace(
        /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g,
        (_match, y, m, d) => {
            const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            return formatLocalizedDate(iso, language, 'medium') || _match;
        }
    );
}
