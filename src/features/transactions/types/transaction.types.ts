export interface Transaction {
    id: string;
    userId: string;
    subscriptionId?: string | null;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    categoryId?: string | null;
    tagId?: string | null;
    tagIds?: string[];
    projectIds?: string[];
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
    categoryId?: string | null;
    tagId?: string | null;
    tagIds?: string[];
    projectIds?: string[];
    transactionDate?: string;
    description?: string;
    paymentChannel?: string;
    billingCycleDate?: string;
}
