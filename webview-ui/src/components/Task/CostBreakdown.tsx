/**
 * CostBreakdown Component
 * 
 * Displays detailed cost breakdown for task API usage.
 * Shows input/output tokens, cache metrics, and total cost.
 * 
 * Features:
 * - Real-time cost calculation
 * - Token breakdown by type
 * - Cache hit/miss rates
 * - Cost trend visualization
 */

import React from 'react';
import './CostBreakdown.css';

export interface CostBreakdownProps {
    inputTokens: number;
    outputTokens: number;
    cacheWrites?: number;
    cacheReads?: number;
    totalCost: number;
    className?: string;
    showDetails?: boolean;
}

export interface CostItem {
    label: string;
    tokens: number;
    costPerMillion: number;
    totalCost: number;
    percentage: number;
}

export const CostBreakdown: React.FC<CostBreakdownProps> = ({
    inputTokens,
    outputTokens,
    cacheWrites = 0,
    cacheReads = 0,
    totalCost,
    className = '',
    showDetails = true
}) => {
    // Claude Sonnet 4 pricing
    const PRICING = {
        INPUT_PER_MTOK: 3.0,
        OUTPUT_PER_MTOK: 15.0,
        CACHE_WRITE_PER_MTOK: 3.75,
        CACHE_READ_PER_MTOK: 0.30
    };

    // Calculate individual costs
    const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MTOK;
    const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MTOK;
    const cacheWriteCost = (cacheWrites / 1_000_000) * PRICING.CACHE_WRITE_PER_MTOK;
    const cacheReadCost = (cacheReads / 1_000_000) * PRICING.CACHE_READ_PER_MTOK;

    const calculatedTotal = inputCost + outputCost + cacheWriteCost + cacheReadCost;

    // Build cost items
    const costItems: CostItem[] = [
        {
            label: 'Input',
            tokens: inputTokens,
            costPerMillion: PRICING.INPUT_PER_MTOK,
            totalCost: inputCost,
            percentage: (inputCost / calculatedTotal) * 100
        },
        {
            label: 'Output',
            tokens: outputTokens,
            costPerMillion: PRICING.OUTPUT_PER_MTOK,
            totalCost: outputCost,
            percentage: (outputCost / calculatedTotal) * 100
        }
    ];

    if (cacheWrites > 0) {
        costItems.push({
            label: 'Cache Write',
            tokens: cacheWrites,
            costPerMillion: PRICING.CACHE_WRITE_PER_MTOK,
            totalCost: cacheWriteCost,
            percentage: (cacheWriteCost / calculatedTotal) * 100
        });
    }

    if (cacheReads > 0) {
        costItems.push({
            label: 'Cache Read',
            tokens: cacheReads,
            costPerMillion: PRICING.CACHE_READ_PER_MTOK,
            totalCost: cacheReadCost,
            percentage: (cacheReadCost / calculatedTotal) * 100
        });
    }

    // Calculate cache hit rate
    const totalCache = cacheWrites + cacheReads;
    const cacheHitRate = totalCache > 0 ? (cacheReads / totalCache) * 100 : 0;

    const formatCost = (cost: number): string => {
        if (cost < 0.01) {
            return `$${(cost * 1000).toFixed(2)}m`; // Show in thousandths
        }
        return `$${cost.toFixed(4)}`;
    };

    const formatTokens = (tokens: number): string => {
        if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}k`;
        }
        return tokens.toString();
    };

    return (
        <div className={`cost-breakdown ${className}`}>
            <div className="cost-header">
                <span className="cost-label">API Cost</span>
                <span className="cost-total">{formatCost(totalCost)}</span>
            </div>

            {showDetails && (
                <>
                    <div className="cost-items">
                        {costItems.map((item, index) => (
                            <div key={index} className="cost-item">
                                <div className="cost-item-header">
                                    <span className="cost-item-label">{item.label}</span>
                                    <span className="cost-item-value">
                                        {formatCost(item.totalCost)}
                                    </span>
                                </div>
                                <div className="cost-item-details">
                                    <span className="cost-item-tokens">
                                        {formatTokens(item.tokens)} tokens
                                    </span>
                                    <span className="cost-item-rate">
                                        @${item.costPerMillion}/M
                                    </span>
                                </div>
                                <div className="cost-item-bar">
                                    <div 
                                        className="cost-item-fill"
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {totalCache > 0 && (
                        <div className="cache-stats">
                            <div className="cache-stat-item">
                                <span className="cache-label">Cache Hit Rate:</span>
                                <span className={`cache-value ${cacheHitRate > 50 ? 'good' : 'low'}`}>
                                    {cacheHitRate.toFixed(1)}%
                                </span>
                            </div>
                            <div className="cache-stat-item">
                                <span className="cache-label">Cache Savings:</span>
                                <span className="cache-value good">
                                    {formatCost(cacheWriteCost - cacheReadCost)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="cost-summary">
                        <div className="summary-item">
                            <span className="summary-label">Total Tokens:</span>
                            <span className="summary-value">
                                {formatTokens(inputTokens + outputTokens)}
                            </span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Avg Cost/Token:</span>
                            <span className="summary-value">
                                ${((totalCost / (inputTokens + outputTokens)) * 1000).toFixed(6)}/k
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CostBreakdown;
