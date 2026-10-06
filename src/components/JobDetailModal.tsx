import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  FileText, 
  Quote, 
  ExternalLink,
  ShieldCheck,
  Save
} from 'lucide-react';
import { JobRecord, JobExtractionResult } from '../types/job';

interface JobDetailModalProps {
  job: JobRecord | null;
  onClose: () => void;
  onSaveJob: (updatedJob: JobRecord) => void;
  onReanalyze: (job: JobRecord) => Promise<void>;
  isProcessing: boolean;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  onClose,
  onSaveJob,
  onReanalyze,
  isProcessing,
}) => {
  if (!job) return null;

  // Local state for human-in-the-loop editing
  const [formData, setFormData] = useState<JobExtractionResult>(
    job.result || {
      fixed_overtime: {
        status: 'なし',
        amount: '',
        hours: '',
        overtime_payment: '不明',
        evidence: '',
      },
      trial_period: {
        status: 'なし',
        duration: '',
        unit: '',
        salary_condition: '不明',
        work_condition: '不明',
        evidence: '',
      },
      overall_status: '要確認',
      notes: '',
    }
  );
  const [verified, setVerified] = useState<boolean>(job.verifiedByUser || false);
  const [activeTab, setActiveTab] = useState<'content' | 'raw_cols'>('content');

  const handleSave = (markVerified: boolean = false) => {
    onSaveJob({
      ...job,
      result: formData,
      verifiedByUser: markVerified ? true : verified,
      extractionStatus: 'completed',
    });
    onClose();
  };

  const highlightEvidenceInText = (text: string, evidences: string[]) => {
    if (!text) return '(本文なし)';
    const validEvidences = evidences.filter((e) => e && e.trim().length > 3);
    if (validEvidences.length === 0) return text;

    // Split text with highlights
    // For simple display, let's look for matching segments
    return (
      <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
        {text}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                  {job.jobId || 'ID未指定'}
                </span>
                <h2 className="text-base font-bold text-slate-900 truncate max-w-md">
                  {job.title || '無題の求人'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {job.salary || '給与記載なし'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onReanalyze(job)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-blue-600' : ''}`} />
              <span>AI再解析</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Job Body & Raw Data (7 cols) */}
          <div className="lg:col-span-6 border-r border-slate-200 flex flex-col overflow-hidden bg-slate-50/30">
            {/* Tabs */}
            <div className="flex items-center border-b border-slate-200 px-4 pt-2 bg-slate-100/60 text-xs">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'content'
                    ? 'border-blue-600 text-blue-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                求人本文 (Indeed全文)
              </button>
              <button
                onClick={() => setActiveTab('raw_cols')}
                className={`px-3 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'raw_cols'
                    ? 'border-blue-600 text-blue-700 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                元データ全カラム ({Object.keys(job.rawColumns).length}列)
              </button>
            </div>

            {/* Scrollable text area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeTab === 'content' ? (
                <div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 select-text">
                    {job.content || '(求人本文が空です)'}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left divide-y divide-slate-200">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="p-2.5 w-1/3">列名</th>
                        <th className="p-2.5">値</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {Object.entries(job.rawColumns).map(([col, val]) => (
                        <tr key={col}>
                          <td className="p-2.5 font-semibold text-slate-700 bg-slate-50/50">{col}</td>
                          <td className="p-2.5 text-slate-800 whitespace-pre-wrap break-all">{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Evidences Highlight Box */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Quote className="w-3.5 h-3.5 text-blue-600" />
                  <span>AIが抽出した根拠文章（原文そのまま）</span>
                </div>
                {formData.fixed_overtime.evidence && (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-blue-200/80 text-blue-950 font-sans">
                    <span className="font-bold text-blue-700 mr-1">【固定残業根拠】</span>
                    {formData.fixed_overtime.evidence}
                  </div>
                )}
                {formData.trial_period.evidence && (
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-teal-200/80 text-teal-950 font-sans">
                    <span className="font-bold text-teal-700 mr-1">【試用期間根拠】</span>
                    {formData.trial_period.evidence}
                  </div>
                )}
                {!formData.fixed_overtime.evidence && !formData.trial_period.evidence && (
                  <p className="text-xs text-slate-500 italic">該当する根拠文章はありません（制度なしまたは言及なし）。</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Extracted Values & Human Editing (6 cols) */}
          <div className="lg:col-span-6 flex flex-col overflow-y-auto p-5 bg-white space-y-5">
            
            {/* 1. 固定残業グループ */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
              <div className="flex items-center justify-between border-b border-blue-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <h3 className="text-sm font-bold text-blue-950">① 固定残業（みなし残業）</h3>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <label className="text-slate-500 mr-1">判定:</label>
                  {(['あり', 'なし', '要確認'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          fixed_overtime: { ...formData.fixed_overtime, status: st },
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        formData.fixed_overtime.status === st
                          ? st === 'あり'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : st === '要確認'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">固定残業代（金額）</label>
                  <input
                    type="text"
                    value={formData.fixed_overtime.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fixed_overtime: { ...formData.fixed_overtime, amount: e.target.value },
                      })
                    }
                    placeholder="例: 40,000円"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">固定残業時間（時間）</label>
                  <input
                    type="text"
                    value={formData.fixed_overtime.hours}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        fixed_overtime: { ...formData.fixed_overtime, hours: e.target.value },
                      })
                    }
                    placeholder="例: 20時間"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-600 font-medium mb-1">超過分の追加支給</label>
                <div className="flex items-center gap-2">
                  {(['あり', 'なし', '不明'] as const).map((pay) => (
                    <button
                      key={pay}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          fixed_overtime: { ...formData.fixed_overtime, overtime_payment: pay },
                        })
                      }
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        formData.fixed_overtime.overtime_payment === pay
                          ? 'bg-blue-700 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {pay}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-600 font-medium mb-1">固定残業 根拠文章</label>
                <textarea
                  rows={2}
                  value={formData.fixed_overtime.evidence}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fixed_overtime: { ...formData.fixed_overtime, evidence: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            {/* 2. 試用期間グループ */}
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
              <div className="flex items-center justify-between border-b border-teal-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                  <h3 className="text-sm font-bold text-teal-950">② 試用期間</h3>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <label className="text-slate-500 mr-1">判定:</label>
                  {(['あり', 'なし', '要確認'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          trial_period: { ...formData.trial_period, status: st },
                        })
                      }
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        formData.trial_period.status === st
                          ? st === 'あり'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : st === '要確認'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">期間（数字）</label>
                  <input
                    type="text"
                    value={formData.trial_period.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trial_period: { ...formData.trial_period, duration: e.target.value },
                      })
                    }
                    placeholder="例: 3"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">単位</label>
                  <select
                    value={formData.trial_period.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trial_period: { ...formData.trial_period, unit: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-xs bg-white"
                  >
                    <option value="">(なし)</option>
                    <option value="日">日</option>
                    <option value="週間">週間</option>
                    <option value="ヶ月">ヶ月</option>
                    <option value="年">年</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">試用期間中の給与</label>
                  <select
                    value={formData.trial_period.salary_condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trial_period: { ...formData.trial_period, salary_condition: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="同条件">同条件</option>
                    <option value="異なる">異なる</option>
                    <option value="不明">不明</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">試用期間中の勤務条件</label>
                  <select
                    value={formData.trial_period.work_condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trial_period: { ...formData.trial_period, work_condition: e.target.value as any },
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="同条件">同条件</option>
                    <option value="異なる">異なる</option>
                    <option value="不明">不明</option>
                  </select>
                </div>
              </div>

              <div className="text-xs">
                <label className="block text-slate-600 font-medium mb-1">試用期間 根拠文章</label>
                <textarea
                  rows={2}
                  value={formData.trial_period.evidence}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trial_period: { ...formData.trial_period, evidence: e.target.value },
                    })
                  }
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white"
                />
              </div>
            </div>

            {/* 3. 総合判定 & 確認フラグ */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">総合判定</label>
                <div className="flex items-center gap-1.5">
                  {(['OK', '要確認', '情報なし'] as const).map((stat) => (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => setFormData({ ...formData, overall_status: stat })}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        formData.overall_status === stat
                          ? stat === 'OK'
                            ? 'bg-emerald-600 text-white'
                            : stat === '要確認'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-700 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      {stat}
                    </button>
                  ))}
                </div>
              </div>

              {formData.notes && (
                <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <span className="font-semibold">AI特記事項: </span>
                  {formData.notes}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {job.verifiedByUser ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> 人間による目視確認済み
              </span>
            ) : (
              <span>人間による未確認（内容を修正して「確認済みにする」を押せます）</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              閉じる
            </button>
            <button
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
            >
              変更のみ保存
            </button>
            <button
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>保存して確認済みにする</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
