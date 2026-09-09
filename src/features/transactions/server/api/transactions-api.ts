import { apiFetch } from '@/lib/http/axios-client';
import type { Transaction, TransactionInput } from '@/features/transactions/types/transaction.types';

/**
 * ดึงรายการธุรกรรม / ประวัติการชำระเงินทั้งหมด
 */
export async function getTransactions(): Promise<Transaction[]> {
    return apiFetch<Transaction[]>('/transactions');
}

/**
 * บันทึกรายการธุรกรรม Snapshot ใหม่
 */
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
    return apiFetch<Transaction>('/transactions', {
        method: 'POST',
        data: input,
    });
}

/**
 * ลบรายการธุรกรรม
 */
export async function deleteTransaction(id: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/transactions/${id}`, {
        method: 'DELETE',
    });
}
