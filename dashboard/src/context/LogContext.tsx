import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface LogClassification {
  matched: boolean;
  engine: string;
  log_level: string;
  confidence_score: number;
  explanation?: string;
}

export interface LogResult {
  raw_log: string;
  status: string;
  classification: LogClassification;
}

interface LogContextType {
  results: LogResult[];
  setResults: (results: LogResult[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export function LogProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<LogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <LogContext.Provider value={{ results, setResults, loading, setLoading, error, setError }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
}
