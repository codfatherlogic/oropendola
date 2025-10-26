/**
 * useTaskCost Hook
 * 
 * Fetches and manages task cost data from the extension backend.
 * Automatically requests cost updates and listens for cost changes.
 */

import { useState, useEffect } from 'react';
import vscode from '../vscode-api';

export interface TaskCost {
  taskId: string;
  totalMessages: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
    cacheWrite?: number;
    cacheRead?: number;
  };
  totalCost: {
    inputCost: number;
    outputCost: number;
    cacheWriteCost: number;
    cacheReadCost: number;
    totalCost: number;
  };
  messageCosts: Array<{
    messageId: string;
    timestamp: number;
    type: 'user' | 'assistant';
    tokens: {
      input: number;
      output: number;
      total: number;
      cacheWrite?: number;
      cacheRead?: number;
    };
    cost: {
      inputCost: number;
      outputCost: number;
      cacheWriteCost: number;
      cacheReadCost: number;
      totalCost: number;
    };
  }>;
  startTime: number;
  lastUpdated: number;
}

export interface CostSummary {
  totalTasks: number;
  totalCost: number;
  totalTokens: number;
  avgCostPerTask: number;
  avgTokensPerTask: number;
  cacheHitRate: number;
}

export function useTaskCost(taskId: string | undefined) {
  const [cost, setCost] = useState<TaskCost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId) {
      setCost(null);
      return;
    }

    // Request cost data
    setLoading(true);
    vscode.postMessage({
      command: 'getTaskCost',
      taskId
    });

    // Listen for cost updates
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.command === 'taskCost') {
        if (message.error) {
          setError(message.error);
          setLoading(false);
        } else if (message.taskId === taskId) {
          setCost(message.cost);
          setError(null);
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [taskId]);

  const refresh = () => {
    if (taskId) {
      setLoading(true);
      vscode.postMessage({
        command: 'getTaskCost',
        taskId
      });
    }
  };

  return { cost, loading, error, refresh };
}

export function useCostSummary() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Request cost summary
    setLoading(true);
    vscode.postMessage({
      command: 'getCostSummary'
    });

    // Listen for summary updates
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.command === 'costSummary') {
        if (message.error) {
          setError(message.error);
          setLoading(false);
        } else {
          setSummary(message.summary);
          setError(null);
          setLoading(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const refresh = () => {
    setLoading(true);
    vscode.postMessage({
      command: 'getCostSummary'
    });
  };

  return { summary, loading, error, refresh };
}
