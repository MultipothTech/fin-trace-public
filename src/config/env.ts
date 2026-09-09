/**
 * Configuration Environment Variables
 * จัดการตัวแปรสภาพแวดล้อมส่วนกลาง
 */

export const env = {
    // ใช้ internal Next.js API route เป็นค่าเริ่มต้น
    API_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    // Supabase Credentials
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aukjmxxkebltaueepaty.supabase.co',
    SUPABASE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        '',
} as const;
