import React from 'react';
import { 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  FileSpreadsheet, 
  FileText, 
  ClipboardPaste,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { BatchProcessingStats } from '../types/job';

interface HeaderProps {
  stats: BatchProcessingStats;
  onOpenUpload: () => void;
  onOpenPaste: () => void;
  onLoadSample: () => void;
  onStartAnalysis: () => void;
  onPauseAnalysis: () => void;
  onReanalyzeNeedsReview: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  hasItems: boolean;
  needsReviewCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onOpenUpload,
  onOpenPaste,
  onLoadSample,
  onStartAnalysis,
  onPauseAnalysis,
  onReanalyzeNeedsReview,
  onExportCSV,
  onExportExcel,
  hasItems,
  needsReviewCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          
          {/* Title and Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Indeed 求人データ抽出システム
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  固定残業・試用期間 AI抽出
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                文章の意味・文脈を理解し、固定残業と試用期間を根拠文章付きで高精度に自動判定
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Upload & Import Group */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded-md transition-all shadow-xs"
                title="CSVまたはExcelファイルをアップロード"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>CSV / Excelアップロード</span>
              </button>
              <button
                onClick={onOpenPaste}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white rounded-md transition-all shadow-xs"
                title="Google SheetsやExcelからコピーした表データを貼り付け"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                <span>表データ貼付</span>
              </button>
              <button
                onClick={onLoadSample}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all"
                title="様々なパターンのIndeed求人サンプルをロード"
              >
                <span>サンプル読込</span>
              </button>
            </div>

            {/* Analysis Execution Group */}
            {stats.isRunning ? (
              <button
                onClick={onPauseAnalysis}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>一時停止</span>
              </button>
            ) : (
              <button
                onClick={onStartAnalysis}
                disabled={!hasItems}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all ${
                  hasItems
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-98'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>解析開始</span>
              </button>
            )}

            {/* Reanalyze Needs Review */}
            <button
              onClick={onReanalyzeNeedsReview}
              disabled={needsReviewCount === 0 || stats.isRunning}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                needsReviewCount > 0 && !stats.isRunning
                  ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
              title="要確認フラグの求人のみ再解析"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>要確認を再解析 ({needsReviewCount})</span>
            </button>

            {/* Export Group */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50/80 p-0.5">
              <button
                onClick={onExportCSV}
                disabled={!hasItems}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  hasItems
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                title="CSV形式（UTF-8 BOM付き）で出力"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV出力</span>
              </button>
              <button
                onClick={onExportExcel}
                disabled={!hasItems}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  hasItems
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-white'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
                title="Excel (.xlsx) 形式で出力"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <span>Excel出力</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
