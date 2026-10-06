import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileQuestion, 
  AlertOctagon, 
  Filter, 
  Clock, 
  Layers
} from 'lucide-react';
import { BatchProcessingStats } from '../types/job';

export type FilterType = 
  | 'all' 
  | 'needs_review' 
  | 'success' 
  | 'fixed_ot_yes' 
  | 'trial_period_yes' 
  | 'no_info' 
  | 'error';

interface StatsBarProps {
  stats: BatchProcessingStats;
  currentFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  fixedOtCount: number;
  trialCount: number;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  stats,
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  fixedOtCount,
  trialCount,
}) => {
  const percent = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        
        {/* Row 1: Real-time Processing Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          
          {/* Progress summary */}
          <div className="flex items-center gap-4 min-w-[240px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                処理状況
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {stats.processed.toLocaleString()} / {stats.total.toLocaleString()}件
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex-1 max-w-[200px] h-2.5 bg-slate-200 rounded-full overflow-hidden relative">
              <div
                className={`h-full transition-all duration-300 ${
                  stats.isRunning ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {percent}%
            </span>
          </div>

          {/* Counts metrics */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* OK */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>成功 (OK)：</span>
              <span className="font-bold font-mono">{stats.success.toLocaleString()}</span>
            </div>

            {/* 要確認 */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>要確認：</span>
              <span className="font-bold font-mono">{stats.needsReview.toLocaleString()}</span>
            </div>

            {/* 情報なし */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
              <FileQuestion className="w-3.5 h-3.5 text-slate-500" />
              <span>情報なし：</span>
              <span className="font-bold font-mono">{stats.noInfo.toLocaleString()}</span>
            </div>

            {/* エラー */}
            {stats.error > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                <span>エラー：</span>
                <span className="font-bold font-mono">{stats.error.toLocaleString()}</span>
              </div>
            )}

            {/* 未処理 */}
            {stats.total - stats.processed > 0 && (
              <div className="flex items-center gap-1 px-2 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                <span>未処理:</span>
                <span className="font-medium font-mono">{(stats.total - stats.processed).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Filter Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Quick Filter buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              絞り込み:
            </span>

            <button
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                currentFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              すべて ({stats.total})
            </button>

            <button
              onClick={() => onFilterChange('needs_review')}
              className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                currentFilter === 'needs_review'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              要確認のみ ({stats.needsReview})
            </button>

            <button
              onClick={() => onFilterChange('success')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                currentFilter === 'success'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              OK ({stats.success})
            </button>

            <button
              onClick={() => onFilterChange('fixed_ot_yes')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                currentFilter === 'fixed_ot_yes'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              固定残業あり ({fixedOtCount})
            </button>

            <button
              onClick={() => onFilterChange('trial_period_yes')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                currentFilter === 'trial_period_yes'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
              }`}
            >
              試用期間あり ({trialCount})
            </button>

            {stats.noInfo > 0 && (
              <button
                onClick={() => onFilterChange('no_info')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  currentFilter === 'no_info'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                情報なし ({stats.noInfo})
              </button>
            )}

            {stats.error > 0 && (
              <button
                onClick={() => onFilterChange('error')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  currentFilter === 'error'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                エラー ({stats.error})
              </button>
            )}
          </div>

          {/* Search text box */}
          <div className="w-full md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="求人ID・タイトル・本文を検索..."
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

        </div>

      </div>
    </div>
  );
};
