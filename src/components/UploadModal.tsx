import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, 
  Upload, 
  ClipboardPaste, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet, 
  ArrowRight,
  Settings2
} from 'lucide-react';
import { detectColumns } from '../utils/columnDetector';
import { ColumnMapping, JobRecord } from '../types/job';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportJobs: (jobs: JobRecord[]) => void;
  initialMode?: 'file' | 'paste';
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onImportJobs,
  initialMode = 'file',
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'file' | 'paste'>(initialMode);
  const [pasteText, setPasteText] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    jobIdCol: '',
    titleCol: '',
    contentCol: '',
    salaryCol: '',
  });
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetData = () => {
    setParsedHeaders([]);
    setParsedRows([]);
    setErrorMessage('');
    setFileName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    resetData();
    setFileName(file.name);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (!json || json.length < 2) {
        setErrorMessage('ファイル内にデータが見つかりませんでした。');
        return;
      }

      // Headers from first row
      const headers = (json[0] as any[]).map((h) => String(h || '').trim()).filter(Boolean);
      if (headers.length === 0) {
        setErrorMessage('ヘッダー行が検出できませんでした。');
        return;
      }

      const rows: Record<string, string>[] = [];
      for (let i = 1; i < json.length; i++) {
        const rowArr = json[i];
        if (!rowArr || rowArr.length === 0) continue;
        const rowObj: Record<string, string> = {};
        let hasContent = false;
        headers.forEach((h, colIdx) => {
          const val = rowArr[colIdx] !== undefined && rowArr[colIdx] !== null ? String(rowArr[colIdx]).trim() : '';
          rowObj[h] = val;
          if (val) hasContent = true;
        });
        if (hasContent) {
          rows.push(rowObj);
        }
      }

      setParsedHeaders(headers);
      setParsedRows(rows);
      const detected = detectColumns(headers);
      setMapping(detected);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(`ファイル解析エラー: ${err?.message || '形式を確認してください'}`);
    }
  };

  const handleProcessPastedText = () => {
    resetData();
    if (!pasteText.trim()) {
      setErrorMessage('貼り付けテキストが空です。');
      return;
    }

    try {
      const lines = pasteText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        setErrorMessage('データ行が2行以上必要です（1行目: ヘッダー、2行目以降: データ）。');
        return;
      }

      // Detect separator: Tab (from Excel / Sheets copy) or Comma
      const firstLine = lines[0];
      const sep = firstLine.includes('\t') ? '\t' : ',';

      const headers = firstLine.split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
      const rows: Record<string, string>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        const rowObj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        rows.push(rowObj);
      }

      setParsedHeaders(headers);
      setParsedRows(rows);
      const detected = detectColumns(headers);
      setMapping(detected);
    } catch (err: any) {
      setErrorMessage('貼り付けテキストの解析に失敗しました。');
    }
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) return;

    const importedJobs: JobRecord[] = parsedRows.map((row, index) => {
      const id = `job-imp-${Date.now()}-${index}`;
      const jobId = row[mapping.jobIdCol] || `ID-${index + 1}`;
      const title = row[mapping.titleCol] || '求人タイトル未設定';
      const content = row[mapping.contentCol] || '';
      const salary = row[mapping.salaryCol] || '';

      return {
        id,
        jobId,
        title,
        content,
        salary,
        rawColumns: row,
        extractionStatus: 'pending',
      };
    });

    onImportJobs(importedJobs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Indeed 求人データのインポート
              </h2>
              <p className="text-xs text-slate-500">
                CSV / Excel / Google Sheetsからのコピー＆ペーストに対応
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-white text-xs">
          <button
            onClick={() => setActiveTab('file')}
            className={`inline-flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'file'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV / Excelファイル選択
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`inline-flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            クリップボードから貼り付け (TSV / CSV)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'file' ? (
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3"
              >
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    クリックしてファイルを選択、またはここにドラッグ＆ドロップ
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    対応形式: .xlsx, .xls, .csv（大量データ対応）
                  </p>
                </div>
                {fileName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5" /> 選択中: {fileName}
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ExcelやGoogleスプレッドシートからコピーしたデータを貼り付けてください
                </label>
                <textarea
                  rows={6}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`求人ID\t求人タイトル\t給与\t求人本文\nIND-001\t営業職\t月給28万円\t固定残業代4万円（20時間分）を含む。試用期間3ヶ月...`}
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={handleProcessPastedText}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900 transition-colors"
              >
                <span>テキストを解析して列を認識する</span>
              </button>
            </div>
          )}

          {/* Column Auto-Detection & Mapping Preview */}
          {parsedHeaders.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    列の自動判定結果（{parsedRows.length.toLocaleString()}件 読み込み完了）
                  </h3>
                </div>
                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  求人本文列を自動特定済み
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {/* Job ID Column */}
                <div>
                  <label className="block text-slate-600 font-medium mb-1">求人ID 列</label>
                  <select
                    value={mapping.jobIdCol}
                    onChange={(e) => setMapping({ ...mapping, jobIdCol: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="">(なし / 連番)</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Job Title Column */}
                <div>
                  <label className="block text-slate-600 font-medium mb-1">求人タイトル 列</label>
                  <select
                    value={mapping.titleCol}
                    onChange={(e) => setMapping({ ...mapping, titleCol: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="">(なし)</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Job Content Column */}
                <div>
                  <label className="block text-blue-900 font-bold mb-1">
                    求人本文 列 <span className="text-rose-500">*最重要</span>
                  </label>
                  <select
                    value={mapping.contentCol}
                    onChange={(e) => setMapping({ ...mapping, contentCol: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border-2 border-blue-500 text-xs bg-white font-semibold text-blue-900"
                  >
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>

                {/* Salary Column */}
                <div>
                  <label className="block text-slate-600 font-medium mb-1">給与 列</label>
                  <select
                    value={mapping.salaryCol}
                    onChange={(e) => setMapping({ ...mapping, salaryCol: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  >
                    <option value="">(なし)</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview Table (First 3 rows) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">
                  先頭行プレビュー（最初の3件）:
                </span>
                <div className="overflow-x-auto rounded-lg border border-slate-200 text-[11px] max-h-40">
                  <table className="w-full text-left bg-white">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        {parsedHeaders.slice(0, 5).map((h) => (
                          <th key={h} className="p-2 border-r border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {parsedRows.slice(0, 3).map((r, idx) => (
                        <tr key={idx}>
                          {parsedHeaders.slice(0, 5).map((h) => (
                            <td key={h} className="p-2 border-r border-slate-100 max-w-[200px] truncate">
                              {r[h]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 && (
              <span>検出件数: <strong className="text-slate-800">{parsedRows.length.toLocaleString()}件</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedRows.length === 0 || !mapping.contentCol}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              <span>この内容でインポート</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
