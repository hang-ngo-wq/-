import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileQuestion, 
  AlertOctagon, 
  Clock, 
  ChevronRight, 
  RefreshCw, 
  ExternalLink,
  Info,
  Check
} from 'lucide-react';
import { JobRecord } from '../types/job';

interface JobTableProps {
  jobs: JobRecord[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onSelectJobForDetail: (job: JobRecord) => void;
  onSingleReanalyze: (job: JobRecord) => void;
  isProcessingId?: string;
}

export const JobTable: React.FC<JobTableProps> = ({
  jobs,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onSelectJobForDetail,
  onSingleReanalyze,
  isProcessingId,
}) => {
  const allSelected = jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id));

  const getStatusBadge = (status?: string, verified?: boolean) => {
    if (verified) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <Check className="w-3 h-3" />
          確認済
        </span>
      );
    }
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            OK
          </span>
        );
      case '要確認':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            要確認
          </span>
        );
      case '情報なし':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <FileQuestion className="w-3 h-3" />
            情報なし
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-400">
            <Clock className="w-3 h-3" />
            未解析
          </span>
        );
    }
  };

  const getTagBadge = (value: string | undefined, type: 'yes_no' | 'condition') => {
    if (!value) return <span className="text-slate-300">-</span>;
    if (value === 'あり') {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          あり
        </span>
      );
    }
    if (value === 'なし') {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
          なし
        </span>
      );
    }
    if (value === '要確認') {
      return (
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          要確認
        </span>
      );
    }
    if (value === '同条件') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
          同条件
        </span>
      );
    }
    if (value === '異なる') {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
          異なる
        </span>
      );
    }
    return <span className="text-slate-600 text-xs">{value}</span>;
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] select-none">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  title="全選択 / 全解除"
                />
              </th>
              <th className="py-3 px-3 min-w-[100px]">求人ID</th>
              <th className="py-3 px-3 min-w-[200px] max-w-[260px]">求人タイトル</th>
              {/* 固定残業グループ */}
              <th className="py-3 px-3 min-w-[80px] bg-blue-50/50 text-blue-900 border-l border-blue-100">固定残業</th>
              <th className="py-3 px-3 min-w-[95px] bg-blue-50/50 text-blue-900">固定残業代</th>
              <th className="py-3 px-3 min-w-[90px] bg-blue-50/50 text-blue-900">固定残業時間</th>
              <th className="py-3 px-3 min-w-[85px] bg-blue-50/50 text-blue-900">超過分支給</th>
              {/* 試用期間グループ */}
              <th className="py-3 px-3 min-w-[80px] bg-teal-50/50 text-teal-900 border-l border-teal-100">試用期間</th>
              <th className="py-3 px-3 min-w-[60px] bg-teal-50/50 text-teal-900">期間</th>
              <th className="py-3 px-3 min-w-[60px] bg-teal-50/50 text-teal-900">単位</th>
              <th className="py-3 px-3 min-w-[95px] bg-teal-50/50 text-teal-900">試用中給与</th>
              <th className="py-3 px-3 min-w-[95px] bg-teal-50/50 text-teal-900">試用中条件</th>
              {/* 根拠・判定 */}
              <th className="py-3 px-3 min-w-[220px] max-w-[320px] border-l border-slate-200">根拠文章</th>
              <th className="py-3 px-3 min-w-[85px]">判定</th>
              <th className="py-3 px-3 w-16 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileQuestion className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">表示対象の求人データがありません</p>
                    <p className="text-xs text-slate-400">CSV/Excelをアップロードするか、サンプルデータを読み込んでください。</p>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const isSelected = selectedIds.has(job.id);
                const isProcessing = job.extractionStatus === 'processing' || isProcessingId === job.id;
                const r = job.result;

                return (
                  <tr
                    key={job.id}
                    className={`transition-colors hover:bg-blue-50/30 ${
                      isSelected ? 'bg-blue-50/60' : ''
                    } ${
                      r?.overall_status === '要確認' && !job.verifiedByUser ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(job.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* 求人ID */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {job.jobId || '(IDなし)'}
                    </td>

                    {/* 求人タイトル */}
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 line-clamp-1" title={job.title}>
                        {job.title || '(タイトルなし)'}
                      </div>
                      {job.salary && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 font-mono">
                          {job.salary}
                        </div>
                      )}
                    </td>

                    {/* 固定残業 */}
                    <td className="py-2.5 px-3 bg-blue-50/20 border-l border-blue-50">
                      {isProcessing ? (
                        <span className="text-blue-500 animate-pulse font-mono">解析中...</span>
                      ) : (
                        getTagBadge(r?.fixed_overtime.status, 'yes_no')
                      )}
                    </td>

                    {/* 固定残業代 */}
                    <td className="py-2.5 px-3 bg-blue-50/20 font-mono text-slate-800">
                      {r?.fixed_overtime.amount || <span className="text-slate-300">-</span>}
                    </td>

                    {/* 固定残業時間 */}
                    <td className="py-2.5 px-3 bg-blue-50/20 font-mono text-slate-800">
                      {r?.fixed_overtime.hours || <span className="text-slate-300">-</span>}
                    </td>

                    {/* 超過分支給 */}
                    <td className="py-2.5 px-3 bg-blue-50/20">
                      {r?.fixed_overtime.overtime_payment ? (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                          r.fixed_overtime.overtime_payment === 'あり'
                            ? 'bg-blue-100 text-blue-800 font-semibold'
                            : 'text-slate-600'
                        }`}>
                          {r.fixed_overtime.overtime_payment}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* 試用期間 */}
                    <td className="py-2.5 px-3 bg-teal-50/20 border-l border-teal-50">
                      {isProcessing ? (
                        <span className="text-teal-600 animate-pulse font-mono">解析中...</span>
                      ) : (
                        getTagBadge(r?.trial_period.status, 'yes_no')
                      )}
                    </td>

                    {/* 期間 */}
                    <td className="py-2.5 px-3 bg-teal-50/20 font-mono font-medium text-slate-800">
                      {r?.trial_period.duration || <span className="text-slate-300">-</span>}
                    </td>

                    {/* 単位 */}
                    <td className="py-2.5 px-3 bg-teal-50/20 text-slate-700">
                      {r?.trial_period.unit || <span className="text-slate-300">-</span>}
                    </td>

                    {/* 試用中給与 */}
                    <td className="py-2.5 px-3 bg-teal-50/20">
                      {getTagBadge(r?.trial_period.salary_condition, 'condition')}
                    </td>

                    {/* 試用中条件 */}
                    <td className="py-2.5 px-3 bg-teal-50/20">
                      {getTagBadge(r?.trial_period.work_condition, 'condition')}
                    </td>

                    {/* 根拠文章 */}
                    <td className="py-2.5 px-3 border-l border-slate-100 max-w-[320px]">
                      {isProcessing ? (
                        <div className="h-4 bg-slate-200 animate-pulse rounded w-3/4"></div>
                      ) : (
                        <div className="space-y-1">
                          {r?.fixed_overtime.evidence && (
                            <div className="text-[11px] text-blue-900 bg-blue-50/70 p-1.5 rounded border border-blue-100 line-clamp-2" title={r.fixed_overtime.evidence}>
                              <span className="font-semibold text-blue-700">【固定残業】</span>
                              {r.fixed_overtime.evidence}
                            </div>
                          )}
                          {r?.trial_period.evidence && (
                            <div className="text-[11px] text-teal-900 bg-teal-50/70 p-1.5 rounded border border-teal-100 line-clamp-2" title={r.trial_period.evidence}>
                              <span className="font-semibold text-teal-700">【試用期間】</span>
                              {r.trial_period.evidence}
                            </div>
                          )}
                          {!r?.fixed_overtime.evidence && !r?.trial_period.evidence && (
                            <span className="text-slate-400 italic text-[11px]">
                              {job.extractionStatus === 'completed' ? '(本文に言及なし)' : '-'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* 判定 */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isProcessing ? (
                        <span className="inline-flex items-center gap-1 text-blue-600 font-semibold animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          処理中
                        </span>
                      ) : (
                        getStatusBadge(r?.overall_status, job.verifiedByUser)
                      )}
                    </td>

                    {/* 操作 */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectJobForDetail(job)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="詳細確認・修正"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSingleReanalyze(job)}
                          disabled={isProcessing}
                          className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                          title="この求人を再解析"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
