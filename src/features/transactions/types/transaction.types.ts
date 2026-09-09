export interface Transaction {
    id: string;
    userId: string;
    userEmail: string;
    subscriptionId?: string | null;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    transactionDate: string; // YYYY-MM-DD
    description: string;
    paymentChannel: string;
    billingCycleDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface TransactionInput {
    subscriptionId?: string | null;
    amount: number;
    type?: 'income' | 'expense';
    category?: string;
    transactionDate?: string;
    description?: string;
    paymentChannel?: string;
    billingCycleDate?: string;
}
