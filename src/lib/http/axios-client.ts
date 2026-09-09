import axios, { type AxiosRequestConfig, type AxiosRequestHeaders } from 'axios';
import { supabase } from '@/lib/supabase/client';
import { env } from '@/config/env';

export interface ApiFetchOptions extends RequestInit {
    baseUrl?: string;
    token?: string;
    data?: unknown;
}

/**
 * ฟังก์ชันกลางสำหรับเรียกใช้งาน API ผ่าน HTTP Client (Axios)
 * มีการแนบ Supabase Bearer token อัตโนมัติ และตรวจจับ Session Expired
 */
export async function apiFetch<T>(path: string, init?: ApiFetchOptions): Promise<T> {
    const baseUrl = init?.baseUrl || env.API_URL;
    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (baseUrl.endsWith('/api') && normalizedPath.startsWith('/api/')) {
        normalizedPath = normalizedPath.substring(4);
    }
    const url = `${baseUrl}${normalizedPath}`;

    const extraHeaders: AxiosRequestHeaders = (init?.headers as AxiosRequestHeaders) || {};

    // ดึง token จาก Supabase session ปัจจุบัน
    let accessToken = init?.token;
    if (!accessToken && typeof window !== 'undefined') {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token;
    }

    const authHeader: Record<string, string> = {};
    if (accessToken) {
        authHeader['Authorization'] = `Bearer ${accessToken}`;
    }

    let requestData = init?.data;
    if (requestData === undefined && init?.body) {
        try {
            requestData = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
        } catch {
            requestData = init.body;
        }
    }

    const axiosConfig: AxiosRequestConfig = {
        url,
        method: (init?.method as AxiosRequestConfig['method']) || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...authHeader,
            ...extraHeaders,
        },
        data: requestData,
    };

    try {
        const response = await axios.request<T>(axiosConfig);
        return response.data;
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response) {
            const data = error.response.data;

            // ตรวจสอบ Token หมดอายุ และทำการ logout อัตโนมัติ
            if (error.response.status === 401) {
                if (typeof window !== 'undefined') {
                    await supabase.auth.signOut();
                    window.location.href = '/';
                }
                throw new Error('Session expired. Please login again.');
            }

            const message = typeof data === 'string'
                ? data
                : data?.detail || data?.message || data?.error || '';
            throw new Error(message || `Request failed with status ${error.response.status}`);
        }

        if (error instanceof Error) {
            throw error;
        }

        throw new Error('Network error or unexpected error occurred.');
    }
}
