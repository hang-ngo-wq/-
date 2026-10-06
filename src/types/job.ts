export interface ExtractionFixedOvertime {
  status: 'あり' | 'なし' | '要確認';
  amount: string; // e.g. "40,000円" or empty
  hours: string; // e.g. "20時間" or empty
  overtime_payment: 'あり' | 'なし' | '不明'; // 超過分の追加支給
  evidence: string; // 本文からの引用根拠文章
}

export interface ExtractionTrialPeriod {
  status: 'あり' | 'なし' | '要確認';
  duration: string; // 数字 (e.g. "3")
  unit: '日' | '週間' | 'ヶ月' | '年' | '';
  salary_condition: '同条件' | '異なる' | '不明';
  work_condition: '同条件' | '異なる' | '不明';
  evidence: string; // 本文からの引用根拠文章
}

export interface JobExtractionResult {
  fixed_overtime: ExtractionFixedOvertime;
  trial_period: ExtractionTrialPeriod;
  overall_status: 'OK' | '要確認' | '情報なし';
  notes?: string;
}

export interface JobRecord {
  id: string; // internal unique key
  jobId: string; // original job ID
  title: string;
  content: string; // 求人本文
  salary: string;
  rawColumns: Record<string, string>; // original columns
  extractionStatus: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  result?: JobExtractionResult;
  verifiedByUser?: boolean;
}

export interface ColumnMapping {
  jobIdCol: string;
  titleCol: string;
  contentCol: string;
  salaryCol: string;
}

export interface BatchProcessingStats {
  total: number;
  processed: number;
  success: number; // OK
  needsReview: number; // 要確認
  noInfo: number; // 情報なし
  error: number;
  isRunning: boolean;
  isPaused: boolean;
}
