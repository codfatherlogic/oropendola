# Week 9: Analytics & Insights - Frontend Integration Guide

## Overview

This guide shows how to integrate the 16 Analytics APIs into your VS Code extension frontend. The analytics system provides comprehensive tracking, reporting, and insights capabilities.

**Backend Location**: `ai_assistant/core/analytics.py`
**API Endpoints**: 16 endpoints in `ai_assistant/api/__init__.py`
**Database**: 6 DocTypes (tables) for analytics data

---

## Table of Contents

1. [TypeScript Type Definitions](#typescript-type-definitions)
2. [API Client Setup](#api-client-setup)
3. [Event Tracking](#event-tracking)
4. [Usage Metrics](#usage-metrics)
5. [Performance Monitoring](#performance-monitoring)
6. [Analytics Reports](#analytics-reports)
7. [AI Insights](#ai-insights)
8. [Dashboard Widgets](#dashboard-widgets)
9. [Trend Analysis](#trend-analysis)
10. [React Component Examples](#react-component-examples)
11. [Best Practices](#best-practices)

---

## TypeScript Type Definitions

Create `src/types/analytics.ts`:

```typescript
// Event Types
export interface AnalyticsEvent {
  event_id: string;
  event_type: string;
  event_action: string;
  event_category?: string;
  event_label?: string;
  event_value?: number;
  user_id: string;
  session_id?: string;
  metadata?: Record<string, any>;
  event_date: string;
  event_hour: number;
  created_at: string;
}

export interface TrackEventParams {
  event_type: string;
  event_action: string;
  event_category?: string;
  event_label?: string;
  event_value?: number;
  metadata?: Record<string, any>;
}

// Usage Metrics
export interface UsageMetric {
  metric_id: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  unit: string;
  period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  user_id: string;
  workspace_id?: string;
  created_at: string;
}

export interface TrackUsageParams {
  metric_type: string;
  metric_name: string;
  metric_value: number;
  unit?: string;
  period_type?: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

// Performance Metrics
export interface PerformanceMetric {
  metric_id: string;
  metric_name: string;
  value: number;
  unit: string;
  metric_category: string;
  endpoint?: string;
  feature?: string;
  threshold_warning?: number;
  threshold_critical?: number;
  status: 'normal' | 'warning' | 'critical';
  user_id: string;
  recorded_at: string;
}

export interface TrackPerformanceParams {
  metric_name: string;
  value: number;
  unit: string;
  metric_category?: string;
  endpoint?: string;
  feature?: string;
  threshold_warning?: number;
  threshold_critical?: number;
}

// Analytics Reports
export interface AnalyticsReport {
  report_id: string;
  report_name: string;
  report_type: 'usage' | 'performance' | 'user_engagement' | 'feature_adoption';
  period_start: string;
  period_end: string;
  scope: 'user' | 'workspace' | 'team' | 'global';
  scope_id?: string;
  generated_by: string;
  report_data: Record<string, any>;
  summary: string;
  insights?: string[];
  status: 'generating' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

export interface GenerateReportParams {
  report_name: string;
  report_type: 'usage' | 'performance' | 'user_engagement' | 'feature_adoption';
  period_start: string;
  period_end: string;
  scope?: 'user' | 'workspace' | 'team' | 'global';
  scope_id?: string;
}

// Dashboard Widgets
export interface DashboardWidget {
  widget_id: string;
  widget_name: string;
  widget_type: 'metric' | 'chart' | 'table' | 'list';
  data_source: string;
  query_config: Record<string, any>;
  display_config?: Record<string, any>;
  chart_type?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  user_id: string;
  workspace_id?: string;
  is_shared: boolean;
  created_at: string;
}

export interface CreateWidgetParams {
  widget_name: string;
  widget_type: 'metric' | 'chart' | 'table' | 'list';
  data_source: string;
  query_config: Record<string, any>;
  display_config?: Record<string, any>;
  chart_type?: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

// AI Insights
export interface AnalyticsInsight {
  insight_id: string;
  category: 'performance' | 'usage' | 'security' | 'quality' | 'trend';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence_score: number;
  data_sources: string[];
  recommendations?: string[];
  affected_users?: string[];
  status: 'new' | 'acknowledged' | 'resolved' | 'dismissed';
  generated_at: string;
}

// Trend Analysis
export interface TrendData {
  success: boolean;
  metric_type: string;
  metric_name: string;
  period_type: string;
  data_points: Array<{
    period: string;
    value: number;
    change_percent?: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  average: number;
  min: number;
  max: number;
  change_percent: number;
  forecast?: Array<{
    period: string;
    predicted_value: number;
    confidence?: number;
  }>;
}

// Dashboard Data
export interface DashboardData {
  success: boolean;
  workspace_id?: string;
  summary: {
    total_events_today: number;
    active_users_today: number;
    avg_performance_score: number;
    critical_insights: number;
  };
  recent_events: AnalyticsEvent[];
  top_features: Array<{
    feature: string;
    usage_count: number;
  }>;
  performance_summary: {
    avg_response_time: number;
    error_rate: number;
    success_rate: number;
  };
  widgets: DashboardWidget[];
}
```

---

## API Client Setup

Create `src/services/analytics.ts`:

```typescript
import * as vscode from 'vscode';
import { getServerUrl } from '../config/settings';

const BACKEND_URL = getServerUrl(); // https://oropendola.ai

export class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async apiCall<T>(
    endpoint: string,
    params: Record<string, any>
  ): Promise<T> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/method/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message || data;
    } catch (error) {
      console.error(`Analytics API call failed (${endpoint}):`, error);
      throw error;
    }
  }

  private async getAuthToken(): Promise<string> {
    // Get authentication token from VS Code settings or authentication provider
    const config = vscode.workspace.getConfiguration('oropendolaAI');
    return config.get<string>('authToken') || '';
  }

  // Event Tracking
  async trackEvent(params: TrackEventParams): Promise<void> {
    try {
      await this.apiCall('ai_assistant.api.analytics_track_event', {
        ...params,
        metadata: params.metadata ? JSON.stringify(params.metadata) : undefined
      });
    } catch (error) {
      // Silently fail to not disrupt user experience
      console.warn('Failed to track event:', error);
    }
  }

  async getEvents(
    event_type?: string,
    start_date?: string,
    end_date?: string,
    limit: number = 100
  ): Promise<AnalyticsEvent[]> {
    const result = await this.apiCall<{ events: AnalyticsEvent[] }>(
      'ai_assistant.api.analytics_get_events',
      { event_type, start_date, end_date, limit }
    );
    return result.events;
  }

  // Usage Tracking
  async trackUsage(params: TrackUsageParams): Promise<void> {
    try {
      await this.apiCall('ai_assistant.api.analytics_track_usage', params);
    } catch (error) {
      console.warn('Failed to track usage:', error);
    }
  }

  async getUsage(
    metric_type?: string,
    period_type: string = 'daily',
    start_date?: string,
    end_date?: string
  ): Promise<UsageMetric[]> {
    const result = await this.apiCall<{ metrics: UsageMetric[] }>(
      'ai_assistant.api.analytics_get_usage',
      { metric_type, period_type, start_date, end_date }
    );
    return result.metrics;
  }

  // Performance Tracking
  async trackPerformance(params: TrackPerformanceParams): Promise<void> {
    try {
      await this.apiCall('ai_assistant.api.analytics_track_performance', params);
    } catch (error) {
      console.warn('Failed to track performance:', error);
    }
  }

  async getPerformance(
    metric_category?: string,
    feature?: string,
    start_time?: string,
    end_time?: string,
    limit: number = 100
  ): Promise<PerformanceMetric[]> {
    const result = await this.apiCall<{ metrics: PerformanceMetric[] }>(
      'ai_assistant.api.analytics_get_performance',
      { metric_category, feature, start_time, end_time, limit }
    );
    return result.metrics;
  }

  // Reports
  async generateReport(params: GenerateReportParams): Promise<AnalyticsReport> {
    return await this.apiCall<AnalyticsReport>(
      'ai_assistant.api.analytics_generate_report',
      params
    );
  }

  async getReport(report_id: string): Promise<AnalyticsReport> {
    return await this.apiCall<AnalyticsReport>(
      'ai_assistant.api.analytics_get_report',
      { report_id }
    );
  }

  async listReports(report_type?: string, limit: number = 50): Promise<AnalyticsReport[]> {
    const result = await this.apiCall<{ reports: AnalyticsReport[] }>(
      'ai_assistant.api.analytics_list_reports',
      { report_type, limit }
    );
    return result.reports;
  }

  async exportReport(report_id: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<any> {
    return await this.apiCall(
      'ai_assistant.api.analytics_export_report',
      { report_id, format }
    );
  }

  // Insights
  async getInsights(
    category?: string,
    severity?: string,
    status: string = 'new',
    limit: number = 10
  ): Promise<AnalyticsInsight[]> {
    const result = await this.apiCall<{ insights: AnalyticsInsight[] }>(
      'ai_assistant.api.analytics_get_insights',
      { category, severity, status, limit }
    );
    return result.insights;
  }

  // Dashboard
  async getDashboard(workspace_id?: string): Promise<DashboardData> {
    return await this.apiCall<DashboardData>(
      'ai_assistant.api.analytics_get_dashboard',
      { workspace_id }
    );
  }

  // Widgets
  async createWidget(params: CreateWidgetParams): Promise<DashboardWidget> {
    return await this.apiCall<DashboardWidget>(
      'ai_assistant.api.analytics_create_widget',
      {
        ...params,
        query_config: JSON.stringify(params.query_config),
        display_config: params.display_config ? JSON.stringify(params.display_config) : undefined
      }
    );
  }

  async updateWidget(widget_id: string, updates: Partial<CreateWidgetParams>): Promise<DashboardWidget> {
    return await this.apiCall<DashboardWidget>(
      'ai_assistant.api.analytics_update_widget',
      { widget_id, updates: JSON.stringify(updates) }
    );
  }

  async deleteWidget(widget_id: string): Promise<void> {
    await this.apiCall('ai_assistant.api.analytics_delete_widget', { widget_id });
  }

  // Trends
  async getTrends(
    metric_type: string,
    metric_name: string,
    period_type: string = 'daily',
    periods: number = 30
  ): Promise<TrendData> {
    return await this.apiCall<TrendData>(
      'ai_assistant.api.analytics_get_trends',
      { metric_type, metric_name, period_type, periods }
    );
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
```

---

## Event Tracking

### Automatic Event Tracking

Create `src/analytics/eventTracking.ts`:

```typescript
import { analyticsService } from '../services/analytics';
import * as vscode from 'vscode';

export class EventTracker {
  /**
   * Track when user opens a file
   */
  static async trackFileOpen(document: vscode.TextDocument): Promise<void> {
    await analyticsService.trackEvent({
      event_type: 'file',
      event_action: 'open',
      event_category: 'editor',
      event_label: document.languageId,
      metadata: {
        file_extension: document.fileName.split('.').pop(),
        line_count: document.lineCount,
        size_bytes: Buffer.byteLength(document.getText())
      }
    });
  }

  /**
   * Track AI assistant interactions
   */
  static async trackAIInteraction(
    action: 'query' | 'code_generation' | 'refactor' | 'explain',
    metadata?: Record<string, any>
  ): Promise<void> {
    await analyticsService.trackEvent({
      event_type: 'ai_interaction',
      event_action: action,
      event_category: 'assistant',
      metadata
    });
  }

  /**
   * Track command execution
   */
  static async trackCommand(
    commandId: string,
    success: boolean,
    executionTimeMs?: number
  ): Promise<void> {
    await analyticsService.trackEvent({
      event_type: 'command',
      event_action: 'execute',
      event_category: 'extension',
      event_label: commandId,
      event_value: executionTimeMs,
      metadata: { success }
    });
  }

  /**
   * Track error occurrences
   */
  static async trackError(
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>
  ): Promise<void> {
    await analyticsService.trackEvent({
      event_type: 'error',
      event_action: 'occurred',
      event_category: errorType,
      event_label: errorMessage.substring(0, 100),
      metadata: context
    });
  }

  /**
   * Track feature usage
   */
  static async trackFeatureUsage(
    featureName: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await analyticsService.trackEvent({
      event_type: 'feature',
      event_action: action,
      event_category: 'usage',
      event_label: featureName,
      metadata
    });
  }
}

// Register event listeners in extension activation
export function registerEventTracking(context: vscode.ExtensionContext): void {
  // Track file opens
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      EventTracker.trackFileOpen(document);
    })
  );

  // Track editor changes (with debouncing)
  let changeTimeout: NodeJS.Timeout;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      clearTimeout(changeTimeout);
      changeTimeout = setTimeout(() => {
        analyticsService.trackEvent({
          event_type: 'editor',
          event_action: 'edit',
          event_category: 'content',
          metadata: {
            language: event.document.languageId,
            changes_count: event.contentChanges.length
          }
        });
      }, 5000); // Track after 5 seconds of inactivity
    })
  );
}
```

### Usage Example in Extension Code

```typescript
import { EventTracker } from './analytics/eventTracking';

// In your command handlers
async function handleCodeGeneration(prompt: string): Promise<void> {
  const startTime = Date.now();

  try {
    const result = await generateCode(prompt);

    await EventTracker.trackAIInteraction('code_generation', {
      prompt_length: prompt.length,
      result_length: result.length,
      duration_ms: Date.now() - startTime,
      success: true
    });

    return result;
  } catch (error) {
    await EventTracker.trackError('code_generation', error.message, {
      prompt_length: prompt.length
    });
    throw error;
  }
}
```

---

## Usage Metrics

### Tracking Feature Usage

```typescript
import { analyticsService } from '../services/analytics';

export class UsageTracker {
  /**
   * Track daily active usage
   */
  static async trackDailyActive(): Promise<void> {
    await analyticsService.trackUsage({
      metric_type: 'user_activity',
      metric_name: 'daily_active_users',
      metric_value: 1,
      unit: 'count',
      period_type: 'daily'
    });
  }

  /**
   * Track feature-specific usage
   */
  static async trackFeatureUsage(
    featureName: string,
    usageCount: number = 1
  ): Promise<void> {
    await analyticsService.trackUsage({
      metric_type: 'feature_usage',
      metric_name: featureName,
      metric_value: usageCount,
      unit: 'count',
      period_type: 'daily'
    });
  }

  /**
   * Track API calls
   */
  static async trackAPICall(endpoint: string): Promise<void> {
    await analyticsService.trackUsage({
      metric_type: 'api_usage',
      metric_name: endpoint,
      metric_value: 1,
      unit: 'count',
      period_type: 'hourly'
    });
  }

  /**
   * Track token consumption
   */
  static async trackTokenUsage(tokens: number, model: string): Promise<void> {
    await analyticsService.trackUsage({
      metric_type: 'ai_tokens',
      metric_name: model,
      metric_value: tokens,
      unit: 'tokens',
      period_type: 'daily'
    });
  }
}
```

---

## Performance Monitoring

### Performance Decorator

```typescript
import { analyticsService } from '../services/analytics';

/**
 * Decorator to automatically track function performance
 */
export function TrackPerformance(
  metricName: string,
  category: string = 'general',
  thresholdWarning?: number,
  thresholdCritical?: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        await analyticsService.trackPerformance({
          metric_name: metricName,
          value: duration,
          unit: 'ms',
          metric_category: category,
          feature: propertyKey,
          threshold_warning: thresholdWarning,
          threshold_critical: thresholdCritical
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        await analyticsService.trackPerformance({
          metric_name: `${metricName}_error`,
          value: duration,
          unit: 'ms',
          metric_category: category,
          feature: propertyKey
        });

        throw error;
      }
    };

    return descriptor;
  };
}

// Usage example
export class CodeAnalyzer {
  @TrackPerformance('code_analysis_time', 'analysis', 1000, 3000)
  async analyzeCode(code: string): Promise<AnalysisResult> {
    // Your analysis logic here
    return result;
  }
}
```

### Manual Performance Tracking

```typescript
export class PerformanceMonitor {
  static async trackOperation(
    operationName: string,
    operation: () => Promise<any>,
    category: string = 'general'
  ): Promise<any> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      await analyticsService.trackPerformance({
        metric_name: operationName,
        value: duration,
        unit: 'ms',
        metric_category: category
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      await analyticsService.trackPerformance({
        metric_name: `${operationName}_error`,
        value: duration,
        unit: 'ms',
        metric_category: category
      });

      throw error;
    }
  }
}

// Usage
const result = await PerformanceMonitor.trackOperation(
  'ai_code_generation',
  async () => await generateCode(prompt),
  'ai_operations'
);
```

---

## Analytics Reports

### Report Generation Component

```typescript
import { analyticsService } from '../services/analytics';
import type { GenerateReportParams, AnalyticsReport } from '../types/analytics';

export class ReportGenerator {
  /**
   * Generate usage report for last 30 days
   */
  static async generateUsageReport(): Promise<AnalyticsReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return await analyticsService.generateReport({
      report_name: 'Monthly Usage Report',
      report_type: 'usage',
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      scope: 'user'
    });
  }

  /**
   * Generate performance report
   */
  static async generatePerformanceReport(days: number = 7): Promise<AnalyticsReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await analyticsService.generateReport({
      report_name: `Performance Report (${days} days)`,
      report_type: 'performance',
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      scope: 'user'
    });
  }

  /**
   * Poll report status until complete
   */
  static async waitForReport(reportId: string, maxWaitMs: number = 30000): Promise<AnalyticsReport> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const report = await analyticsService.getReport(reportId);

      if (report.status === 'completed') {
        return report;
      } else if (report.status === 'failed') {
        throw new Error('Report generation failed');
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Report generation timeout');
  }
}
```

---

## AI Insights

### Insights Panel Component

```typescript
import { analyticsService } from '../services/analytics';
import type { AnalyticsInsight } from '../types/analytics';

export class InsightsManager {
  /**
   * Get critical insights
   */
  static async getCriticalInsights(): Promise<AnalyticsInsight[]> {
    return await analyticsService.getInsights(
      undefined, // all categories
      'critical',
      'new',
      10
    );
  }

  /**
   * Get insights by category
   */
  static async getInsightsByCategory(
    category: 'performance' | 'usage' | 'security' | 'quality' | 'trend'
  ): Promise<AnalyticsInsight[]> {
    return await analyticsService.getInsights(category, undefined, 'new', 20);
  }

  /**
   * Format insight for display
   */
  static formatInsight(insight: AnalyticsInsight): string {
    const severityEmoji = {
      info: 'ℹ️',
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    };

    return `${severityEmoji[insight.severity]} ${insight.title}

${insight.description}

Confidence: ${(insight.confidence_score * 100).toFixed(0)}%

${insight.recommendations ? '\nRecommendations:\n' + insight.recommendations.map(r => `• ${r}`).join('\n') : ''}`;
  }
}
```

---

## Dashboard Widgets

### Widget Management

```typescript
import { analyticsService } from '../services/analytics';
import type { CreateWidgetParams, DashboardWidget } from '../types/analytics';

export class WidgetManager {
  /**
   * Create "Daily Active Users" metric widget
   */
  static async createDailyActiveUsersWidget(): Promise<DashboardWidget> {
    return await analyticsService.createWidget({
      widget_name: 'Daily Active Users',
      widget_type: 'metric',
      data_source: 'usage_metrics',
      query_config: {
        metric_type: 'user_activity',
        metric_name: 'daily_active_users',
        period_type: 'daily',
        aggregation: 'sum'
      },
      display_config: {
        show_trend: true,
        trend_period: 7
      },
      position_x: 0,
      position_y: 0,
      width: 4,
      height: 2
    });
  }

  /**
   * Create "Feature Usage Trend" chart widget
   */
  static async createFeatureUsageChart(): Promise<DashboardWidget> {
    return await analyticsService.createWidget({
      widget_name: 'Feature Usage Trend',
      widget_type: 'chart',
      chart_type: 'line',
      data_source: 'usage_metrics',
      query_config: {
        metric_type: 'feature_usage',
        period_type: 'daily',
        limit: 30
      },
      display_config: {
        x_axis: 'date',
        y_axis: 'usage_count',
        group_by: 'feature_name'
      },
      position_x: 4,
      position_y: 0,
      width: 8,
      height: 4
    });
  }

  /**
   * Create "Performance Metrics" table widget
   */
  static async createPerformanceTable(): Promise<DashboardWidget> {
    return await analyticsService.createWidget({
      widget_name: 'Performance Metrics',
      widget_type: 'table',
      data_source: 'performance_metrics',
      query_config: {
        metric_category: 'api_performance',
        limit: 10,
        order_by: 'value DESC'
      },
      display_config: {
        columns: ['metric_name', 'value', 'unit', 'status'],
        sortable: true,
        filterable: true
      },
      position_x: 0,
      position_y: 2,
      width: 12,
      height: 4
    });
  }
}
```

---

## Trend Analysis

### Trend Visualization

```typescript
import { analyticsService } from '../services/analytics';

export class TrendAnalyzer {
  /**
   * Get feature usage trend for last 30 days
   */
  static async getFeatureUsageTrend(featureName: string): Promise<TrendData> {
    return await analyticsService.getTrends(
      'feature_usage',
      featureName,
      'daily',
      30
    );
  }

  /**
   * Get performance trend
   */
  static async getPerformanceTrend(
    metricName: string,
    days: number = 7
  ): Promise<TrendData> {
    return await analyticsService.getTrends(
      'performance',
      metricName,
      'daily',
      days
    );
  }

  /**
   * Format trend for display
   */
  static formatTrend(trend: TrendData): string {
    const trendEmoji = {
      increasing: '📈',
      decreasing: '📉',
      stable: '➡️',
      volatile: '📊'
    };

    const changeSign = trend.change_percent >= 0 ? '+' : '';

    return `${trendEmoji[trend.trend]} ${trend.metric_name}

Trend: ${trend.trend.toUpperCase()}
Change: ${changeSign}${trend.change_percent.toFixed(1)}%
Average: ${trend.average.toFixed(2)}
Range: ${trend.min.toFixed(2)} - ${trend.max.toFixed(2)}

Data points: ${trend.data_points.length}
${trend.forecast ? `Forecast available for ${trend.forecast.length} periods` : ''}`;
  }
}
```

---

## React Component Examples

### Analytics Dashboard Component

```tsx
import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/analytics';
import type { DashboardData, AnalyticsInsight } from '../types/analytics';

export const AnalyticsDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashboardData, insightsData] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getInsights(undefined, 'high', 'new', 5)
      ]);
      setDashboard(dashboardData);
      setInsights(insightsData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (!dashboard) {
    return <div className="analytics-error">Failed to load analytics</div>;
  }

  return (
    <div className="analytics-dashboard">
      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card">
          <h3>Events Today</h3>
          <p className="metric-value">{dashboard.summary.total_events_today}</p>
        </div>
        <div className="summary-card">
          <h3>Active Users</h3>
          <p className="metric-value">{dashboard.summary.active_users_today}</p>
        </div>
        <div className="summary-card">
          <h3>Performance Score</h3>
          <p className="metric-value">
            {dashboard.summary.avg_performance_score.toFixed(1)}
          </p>
        </div>
        <div className="summary-card">
          <h3>Critical Insights</h3>
          <p className="metric-value critical">
            {dashboard.summary.critical_insights}
          </p>
        </div>
      </div>

      {/* Critical Insights */}
      {insights.length > 0 && (
        <div className="analytics-insights">
          <h2>Critical Insights</h2>
          {insights.map(insight => (
            <div key={insight.insight_id} className={`insight-card ${insight.severity}`}>
              <div className="insight-header">
                <h4>{insight.title}</h4>
                <span className="severity-badge">{insight.severity}</span>
              </div>
              <p>{insight.description}</p>
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div className="recommendations">
                  <strong>Recommendations:</strong>
                  <ul>
                    {insight.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="insight-footer">
                <span>Confidence: {(insight.confidence_score * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Features */}
      <div className="analytics-top-features">
        <h2>Most Used Features</h2>
        <table>
          <thead>
            <tr>
              <th>Feature</th>
              <th>Usage Count</th>
            </tr>
          </thead>
          <tbody>
            {dashboard.top_features.map((feature, idx) => (
              <tr key={idx}>
                <td>{feature.feature}</td>
                <td>{feature.usage_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Summary */}
      <div className="analytics-performance">
        <h2>Performance Summary</h2>
        <div className="performance-metrics">
          <div className="metric">
            <span className="metric-label">Avg Response Time</span>
            <span className="metric-value">
              {dashboard.performance_summary.avg_response_time.toFixed(0)}ms
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Success Rate</span>
            <span className="metric-value success">
              {(dashboard.performance_summary.success_rate * 100).toFixed(1)}%
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Error Rate</span>
            <span className="metric-value error">
              {(dashboard.performance_summary.error_rate * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Trend Chart Component

```tsx
import React, { useEffect, useState } from 'react';
import { analyticsService } from '../services/analytics';
import type { TrendData } from '../types/analytics';
import { Line } from 'react-chartjs-2'; // Using Chart.js

interface TrendChartProps {
  metricType: string;
  metricName: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
  periods?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  metricType,
  metricName,
  periodType = 'daily',
  periods = 30
}) => {
  const [trendData, setTrendData] = useState<TrendData | null>(null);

  useEffect(() => {
    loadTrend();
  }, [metricType, metricName, periodType, periods]);

  const loadTrend = async () => {
    try {
      const data = await analyticsService.getTrends(
        metricType,
        metricName,
        periodType,
        periods
      );
      setTrendData(data);
    } catch (error) {
      console.error('Failed to load trend:', error);
    }
  };

  if (!trendData) {
    return <div>Loading trend data...</div>;
  }

  const chartData = {
    labels: trendData.data_points.map(dp => dp.period),
    datasets: [
      {
        label: metricName,
        data: trendData.data_points.map(dp => dp.value),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      ...(trendData.forecast ? [{
        label: 'Forecast',
        data: [
          ...Array(trendData.data_points.length - 1).fill(null),
          trendData.data_points[trendData.data_points.length - 1].value,
          ...trendData.forecast.map(f => f.predicted_value)
        ],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderDash: [5, 5],
        tension: 0.1
      }] : [])
    ]
  };

  return (
    <div className="trend-chart">
      <h3>{metricName} Trend</h3>
      <div className="trend-summary">
        <span className={`trend-indicator ${trendData.trend}`}>
          {trendData.trend.toUpperCase()}
        </span>
        <span className="trend-change">
          {trendData.change_percent >= 0 ? '+' : ''}
          {trendData.change_percent.toFixed(1)}%
        </span>
      </div>
      <Line data={chartData} options={{
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: false }
        }
      }} />
    </div>
  );
};
```

---

## Best Practices

### 1. Performance Considerations

```typescript
// ✅ GOOD: Batch analytics calls
async function trackMultipleEvents(events: TrackEventParams[]): Promise<void> {
  // Send all events in parallel
  await Promise.allSettled(
    events.map(event => analyticsService.trackEvent(event))
  );
}

// ❌ BAD: Sequential tracking
for (const event of events) {
  await analyticsService.trackEvent(event);
}
```

### 2. Error Handling

```typescript
// ✅ GOOD: Silent failure for analytics
async function trackWithGracefulFailure(params: TrackEventParams): Promise<void> {
  try {
    await analyticsService.trackEvent(params);
  } catch (error) {
    // Log but don't disrupt user experience
    console.warn('Analytics tracking failed:', error);
  }
}

// ❌ BAD: Throwing analytics errors
await analyticsService.trackEvent(params); // May disrupt user
```

### 3. Privacy Compliance

```typescript
// ✅ GOOD: Sanitize sensitive data
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };

  // Remove PII
  delete sanitized.email;
  delete sanitized.name;
  delete sanitized.ip_address;

  // Truncate long strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
      sanitized[key] = sanitized[key].substring(0, 500) + '...';
    }
  });

  return sanitized;
}

await analyticsService.trackEvent({
  event_type: 'user_action',
  event_action: 'submit',
  metadata: sanitizeMetadata(rawMetadata)
});
```

### 4. Debouncing High-Frequency Events

```typescript
import { debounce } from 'lodash';

// ✅ GOOD: Debounce editor changes
const trackEditorChange = debounce(
  async (document: vscode.TextDocument) => {
    await analyticsService.trackEvent({
      event_type: 'editor',
      event_action: 'edit',
      metadata: { language: document.languageId }
    });
  },
  5000 // Track at most every 5 seconds
);

vscode.workspace.onDidChangeTextDocument((event) => {
  trackEditorChange(event.document);
});
```

### 5. Contextual Tracking

```typescript
// ✅ GOOD: Include context
class AnalyticsContext {
  private context: Record<string, any> = {};

  setContext(key: string, value: any): void {
    this.context[key] = value;
  }

  async trackEvent(params: TrackEventParams): Promise<void> {
    await analyticsService.trackEvent({
      ...params,
      metadata: {
        ...params.metadata,
        ...this.context
      }
    });
  }
}

const analytics = new AnalyticsContext();
analytics.setContext('workspace_type', 'monorepo');
analytics.setContext('language', 'typescript');

await analytics.trackEvent({
  event_type: 'build',
  event_action: 'success'
}); // Automatically includes workspace_type and language
```

---

## Testing Analytics Integration

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { analyticsService } from '../services/analytics';
import { EventTracker } from '../analytics/eventTracking';

describe('Analytics Integration', () => {
  it('should track events with correct parameters', async () => {
    const spy = vi.spyOn(analyticsService, 'trackEvent');

    await EventTracker.trackCommand('myCommand', true, 150);

    expect(spy).toHaveBeenCalledWith({
      event_type: 'command',
      event_action: 'execute',
      event_category: 'extension',
      event_label: 'myCommand',
      event_value: 150,
      metadata: { success: true }
    });
  });

  it('should handle tracking failures gracefully', async () => {
    vi.spyOn(analyticsService, 'trackEvent').mockRejectedValue(new Error('Network error'));

    // Should not throw
    await expect(EventTracker.trackCommand('myCommand', true)).resolves.not.toThrow();
  });
});
```

---

## Summary

This guide covers all 16 Analytics APIs:

| Feature | APIs | Frontend Components |
|---------|------|---------------------|
| Event Tracking | 2 | EventTracker, Auto-tracking |
| Usage Metrics | 2 | UsageTracker, Metric widgets |
| Performance | 2 | PerformanceMonitor, Decorators |
| Reports | 4 | ReportGenerator, Export |
| Insights | 1 | InsightsManager, Display |
| Dashboard | 1 | AnalyticsDashboard Component |
| Widgets | 3 | WidgetManager, Charts |
| Trends | 1 | TrendAnalyzer, TrendChart |

**Next Steps:**
1. Copy TypeScript types to your project
2. Implement AnalyticsService class
3. Add event tracking to key user actions
4. Create analytics dashboard in webview
5. Test with real usage data

**Estimated Integration Time**: 12-16 hours
- Types & Service: 2-3 hours
- Event Tracking: 3-4 hours
- Dashboard UI: 5-7 hours
- Testing: 2-3 hours
