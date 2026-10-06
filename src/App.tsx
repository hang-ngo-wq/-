import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatsBar, FilterType } from './components/StatsBar';
import { JobTable } from './components/JobTable';
import { JobDetailModal } from './components/JobDetailModal';
import { UploadModal } from './components/UploadModal';
import { INITIAL_SAMPLE_JOBS } from './utils/sampleData';
import { exportToCSV, exportToExcel } from './utils/csvExport';
import { JobRecord, BatchProcessingStats, JobExtractionResult } from './types/job';
import { 
  Sparkles, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Download
} from 'lucide-react';

const BATCH_SIZE = 4; // High speed batch size for deterministic accuracy and rate stability

export default function App() {
  const [jobs, setJobs] = useState<JobRecord[]>(() => {
    const saved = localStorage.getItem('indeed_extractor_jobs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_SAMPLE_JOBS;
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file');
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<JobRecord | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isProcessingSingleId, setIsProcessingSingleId] = useState<string | null>(null);

  // Ref to handle cancellation / pause
  const isPauseRequestedRef = useRef(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('indeed_extractor_jobs', JSON.stringify(jobs));
    } catch (e) {
      console.warn('LocalStorage limit exceeded, saving skipped');
    }
  }, [jobs]);

  // Statistics calculation
  const stats: BatchProcessingStats = useMemo(() => {
    const total = jobs.length;
    const processed = jobs.filter(j => j.extractionStatus === 'completed').length;
    const success = jobs.filter(j => j.result?.overall_status === 'OK').length;
    const needsReview = jobs.filter(j => j.result?.overall_status === '要確認' && !j.verifiedByUser).length;
    const noInfo = jobs.filter(j => j.result?.overall_status === '情報なし').length;
    const error = jobs.filter(j => j.extractionStatus === 'error').length;

    return {
      total,
      processed,
      success,
      needsReview,
      noInfo,
      error,
      isRunning,
      isPaused: !isRunning && processed > 0 && processed < total,
    };
  }, [jobs, isRunning]);

  const fixedOtCount = useMemo(() => {
    return jobs.filter(j => j.result?.fixed_overtime.status === 'あり').length;
  }, [jobs]);

  const trialCount = useMemo(() => {
    return jobs.filter(j => j.result?.trial_period.status === 'あり').length;
  }, [jobs]);

  // Filtered & searched job list
  const filteredJobs = useMemo(() => {
    let result = jobs;

    // Apply Filter Tab
    switch (currentFilter) {
      case 'needs_review':
        result = result.filter(j => j.result?.overall_status === '要確認' && !j.verifiedByUser);
        break;
      case 'success':
        result = result.filter(j => j.result?.overall_status === 'OK' || j.verifiedByUser);
        break;
      case 'fixed_ot_yes':
        result = result.filter(j => j.result?.fixed_overtime.status === 'あり');
        break;
      case 'trial_period_yes':
        result = result.filter(j => j.result?.trial_period.status === 'あり');
        break;
      case 'no_info':
        result = result.filter(j => j.result?.overall_status === '情報なし');
        break;
      case 'error':
        result = result.filter(j => j.extractionStatus === 'error');
        break;
      case 'all':
      default:
        break;
    }

    // Apply Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(j => 
        j.jobId.toLowerCase().includes(q) ||
        j.title.toLowerCase().includes(q) ||
        j.content.toLowerCase().includes(q) ||
        j.salary.toLowerCase().includes(q)
      );
    }

    return result;
  }, [jobs, currentFilter, searchQuery]);

  // Batch analysis worker
  const runBatchProcessing = async (targetJobs: JobRecord[]) => {
    if (targetJobs.length === 0) return;

    setIsRunning(true);
    isPauseRequestedRef.current = false;

    const queue = [...targetJobs];

    while (queue.length > 0 && !isPauseRequestedRef.current) {
      const batch = queue.splice(0, BATCH_SIZE);
      const batchIds = new Set(batch.map(j => j.id));

      // Mark batch items as 'processing'
      setJobs(prev =>
        prev.map(j => (batchIds.has(j.id) ? { ...j, extractionStatus: 'processing' } : j))
      );

      try {
        const payload = {
          items: batch.map(b => ({
            id: b.id,
            jobId: b.jobId,
            title: b.title,
            content: b.content,
            salary: b.salary,
          })),
        };

        const res = await fetch('/api/extract-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        const data = await res.json();
        const resultsMap = new Map<string, JobExtractionResult>();
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((r: any) => {
            if (r.id) {
              resultsMap.set(r.id, {
                fixed_overtime: r.fixed_overtime,
                trial_period: r.trial_period,
                overall_status: r.overall_status,
                notes: r.notes,
              });
            }
          });
        }

        // Update processed items
        setJobs(prev =>
          prev.map(j => {
            if (batchIds.has(j.id)) {
              const resObj = resultsMap.get(j.id);
              if (resObj) {
                return {
                  ...j,
                  extractionStatus: 'completed',
                  result: resObj,
                  errorMessage: undefined,
                };
              } else {
                return {
                  ...j,
                  extractionStatus: 'error',
                  errorMessage: 'AI結果マッピングが見つかりませんでした。',
                };
              }
            }
            return j;
          })
        );
      } catch (err: any) {
        console.error('Batch extraction error:', err);
        setJobs(prev =>
          prev.map(j =>
            batchIds.has(j.id)
              ? {
                  ...j,
                  extractionStatus: 'error',
                  errorMessage: err?.message || '解析エラーが発生しました。',
                }
              : j
          )
        );
      }

      // Small delay between batches to ensure server rate hygiene
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsRunning(false);
  };

  const handleStartAnalysis = () => {
    // Priority: selected items if any; else unanalyzed / error items; else all items
    let targets: JobRecord[];
    if (selectedIds.size > 0) {
      targets = jobs.filter(j => selectedIds.has(j.id));
    } else {
      const pendingOrError = jobs.filter(j => j.extractionStatus !== 'completed');
      targets = pendingOrError.length > 0 ? pendingOrError : jobs;
    }
    runBatchProcessing(targets);
  };

  const handlePauseAnalysis = () => {
    isPauseRequestedRef.current = true;
    setIsRunning(false);
  };

  const handleReanalyzeNeedsReview = () => {
    const needsReviewJobs = jobs.filter(j => j.result?.overall_status === '要確認' && !j.verifiedByUser);
    if (needsReviewJobs.length === 0) return;
    runBatchProcessing(needsReviewJobs);
  };

  // Single job re-analysis
  const handleSingleReanalyze = async (targetJob: JobRecord) => {
    setIsProcessingSingleId(targetJob.id);
    setJobs(prev =>
      prev.map(j => (j.id === targetJob.id ? { ...j, extractionStatus: 'processing' } : j))
    );

    try {
      const res = await fetch('/api/extract-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetJob.id,
          jobId: targetJob.jobId,
          title: targetJob.title,
          content: targetJob.content,
          salary: targetJob.salary,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      const resObj: JobExtractionResult = data.result;

      setJobs(prev =>
        prev.map(j =>
          j.id === targetJob.id
            ? {
                ...j,
                extractionStatus: 'completed',
                result: resObj,
                errorMessage: undefined,
              }
            : j
        )
      );

      // If the modal is currently open for this job, sync its view
      if (selectedJobForDetail?.id === targetJob.id) {
        setSelectedJobForDetail(prev =>
          prev ? { ...prev, extractionStatus: 'completed', result: resObj } : null
        );
      }
    } catch (err: any) {
      console.error('Single extraction failed:', err);
      setJobs(prev =>
        prev.map(j =>
          j.id === targetJob.id
            ? { ...j, extractionStatus: 'error', errorMessage: err.message }
            : j
        )
      );
    } finally {
      setIsProcessingSingleId(null);
    }
  };

  // Row selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (filteredJobs.length === 0) return;
    const allFilteredSelected = filteredJobs.every(j => selectedIds.has(j.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredJobs.forEach(j => next.delete(j.id));
      } else {
        filteredJobs.forEach(j => next.add(j.id));
      }
      return next;
    });
  };

  // Import handler
  const handleImportJobs = (imported: JobRecord[]) => {
    setJobs(prev => [...prev, ...imported]);
    setSelectedIds(new Set());
  };

  const handleLoadSample = () => {
    setJobs(INITIAL_SAMPLE_JOBS);
    setSelectedIds(new Set());
  };

  const handleClearAll = () => {
    if (window.confirm('すべての求人データを削除してもよろしいですか？')) {
      setJobs([]);
      setSelectedIds(new Set());
      localStorage.removeItem('indeed_extractor_jobs');
    }
  };

  const handleSaveJobFromDetail = (updated: JobRecord) => {
    setJobs(prev => prev.map(j => (j.id === updated.id ? updated : j)));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Navigation & Action Header */}
      <Header
        stats={stats}
        onOpenUpload={() => {
          setUploadMode('file');
          setIsUploadOpen(true);
        }}
        onOpenPaste={() => {
          setUploadMode('paste');
          setIsUploadOpen(true);
        }}
        onLoadSample={handleLoadSample}
        onStartAnalysis={handleStartAnalysis}
        onPauseAnalysis={handlePauseAnalysis}
        onReanalyzeNeedsReview={handleReanalyzeNeedsReview}
        onExportCSV={() => exportToCSV(jobs, `indeed_extraction_${Date.now()}.csv`)}
        onExportExcel={() => exportToExcel(jobs, `indeed_extraction_${Date.now()}.xlsx`)}
        hasItems={jobs.length > 0}
        needsReviewCount={stats.needsReview}
      />

      {/* Real-time Status & Filter Controls */}
      <StatsBar
        stats={stats}
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        fixedOtCount={fixedOtCount}
        trialCount={trialCount}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full space-y-4">
        
        {/* Helper guide / Info banner */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <span className="p-1 rounded-md bg-blue-100 text-blue-700">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <span>
              <strong>抽出基準：</strong>「残業あり」のみは固定残業なしと判定 / 研修期間との区別 / 原文の完全一致根拠引用 / 曖昧ケースは「要確認」
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedIds.size > 0 && (
              <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                選択中: {selectedIds.size}件
              </span>
            )}
            <button
              onClick={handleClearAll}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 transition-colors"
              title="データを全消去"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>全消去</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <JobTable
          jobs={filteredJobs}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectJobForDetail={setSelectedJobForDetail}
          onSingleReanalyze={handleSingleReanalyze}
          isProcessingId={isProcessingSingleId || undefined}
        />

        {/* Footnote on rule definitions */}
        <div className="pt-2 pb-6 text-slate-500 text-[11px] leading-relaxed flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200">
          <div><strong>固定残業ルール：</strong>「残業あり」「時間外労働あり」だけでは固定残業「なし」。金額・時間明記時は「あり」。</div>
          <div><strong>試用期間ルール：</strong>「試用期間3ヶ月」は「あり/3/ヶ月」。「研修期間」等は文脈に応じ要確認。</div>
          <div><strong>根拠引用：</strong>AIによる文章創作を排除し、求人本文から該当箇所をそのまま抜粋。</div>
        </div>

      </main>

      {/* Upload & Paste Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onImportJobs={handleImportJobs}
        initialMode={uploadMode}
      />

      {/* Job Detail & Manual Inspection Modal */}
      <JobDetailModal
        job={selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        onSaveJob={handleSaveJobFromDetail}
        onReanalyze={handleSingleReanalyze}
        isProcessing={isProcessingSingleId === selectedJobForDetail?.id}
      />

    </div>
  );
}
