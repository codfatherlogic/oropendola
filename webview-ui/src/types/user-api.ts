// User API Types for Oropendola Extension
// Matches the User API endpoints from backend

export interface DailyQuota {
    limit: number;
    remaining: number;
}

export interface MonthlyBudget {
    limit: number;
    used: number;
    remaining: number;
}

export interface Subscription {
    id: string;
    plan_id: string;
    plan_title: string;
    status: string;
    start_date: string;
    end_date: string | null;
    daily_quota: DailyQuota;
    monthly_budget: MonthlyBudget;
}

export interface APIKeyData {
    success: boolean;
    api_key: string | null; // null if already retrieved
    api_key_prefix: string;
    subscription_id: string;
    plan: string;
    status: string;
    warning?: string;
    message?: string;
}

export interface SubscriptionData {
    success: boolean;
    subscription: Subscription;
}

export interface UserProfile {
    success: boolean;
    subscription?: Subscription;
    apiKey?: {
        available: boolean;
        prefix: string;
        fullKey: string | null;
        message?: string;
        warning?: string;
    };
    error?: string;
}

// WebView Message Types for User API
export type UserAPIMessage =
    | { type: 'getMyAPIKey' }
    | { type: 'getMySubscription' }
    | { type: 'regenerateAPIKey' }
    | { type: 'getUserProfile' }
    | { type: 'apiKeyData'; data: APIKeyData }
    | { type: 'subscriptionData'; data: SubscriptionData }
    | { type: 'apiKeyRegenerated'; data: APIKeyData }
    | { type: 'userProfile'; data: UserProfile };
