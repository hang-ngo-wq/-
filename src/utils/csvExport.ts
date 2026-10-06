import * as XLSX from 'xlsx';
import { JobRecord } from '../types/job';

export function exportToCSV(jobs: JobRecord[], filename = 'indeed_job_extraction_results.csv') {
  if (jobs.length === 0) return;

  // Determine all raw column headers from the first record or unified keys
  const originalHeadersSet = new Set<string>();
  jobs.forEach(job => {
    Object.keys(job.rawColumns).forEach(k => originalHeadersSet.add(k));
  });
  const originalHeaders = Array.from(originalHeadersSet);

  const extractionHeaders = [
    '固定残業',
    '固定残業代',
    '固定残業時間',
    '超過分支給',
    '固定残業_根拠文章',
    '試用期間',
    '試用期間_期間',
    '試用期間_単位',
    '試用期間_給与条件',
    '試用期間_勤務条件',
    '試用期間_根拠文章',
    '総合判定',
    'ユーザー確認状況'
  ];

  const allHeaders = [...originalHeaders, ...extractionHeaders];

  const escapeCSV = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csvRows: string[] = [];
  csvRows.push(allHeaders.map(h => escapeCSV(h)).join(','));

  jobs.forEach(job => {
    const r = job.result;
    const rowValues: string[] = [];

    // Original values
    originalHeaders.forEach(header => {
      rowValues.push(escapeCSV(job.rawColumns[header] ?? ''));
    });

    // Extraction values
    rowValues.push(escapeCSV(r?.fixed_overtime.status ?? (job.extractionStatus === 'error' ? 'エラー' : '未解析')));
    rowValues.push(escapeCSV(r?.fixed_overtime.amount ?? ''));
    rowValues.push(escapeCSV(r?.fixed_overtime.hours ?? ''));
    rowValues.push(escapeCSV(r?.fixed_overtime.overtime_payment ?? ''));
    rowValues.push(escapeCSV(r?.fixed_overtime.evidence ?? ''));

    rowValues.push(escapeCSV(r?.trial_period.status ?? (job.extractionStatus === 'error' ? 'エラー' : '未解析')));
    rowValues.push(escapeCSV(r?.trial_period.duration ?? ''));
    rowValues.push(escapeCSV(r?.trial_period.unit ?? ''));
    rowValues.push(escapeCSV(r?.trial_period.salary_condition ?? ''));
    rowValues.push(escapeCSV(r?.trial_period.work_condition ?? ''));
    rowValues.push(escapeCSV(r?.trial_period.evidence ?? ''));

    rowValues.push(escapeCSV(r?.overall_status ?? (job.extractionStatus === 'error' ? 'エラー' : '未解析')));
    rowValues.push(escapeCSV(job.verifiedByUser ? '確認済み' : ''));

    csvRows.push(rowValues.join(','));
  });

  // Prepend UTF-8 BOM so Excel opens Japanese characters seamlessly
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(jobs: JobRecord[], filename = 'indeed_job_extraction_results.xlsx') {
  if (jobs.length === 0) return;

  const originalHeadersSet = new Set<string>();
  jobs.forEach(job => {
    Object.keys(job.rawColumns).forEach(k => originalHeadersSet.add(k));
  });
  const originalHeaders = Array.from(originalHeadersSet);

  const dataRows = jobs.map(job => {
    const rowObj: Record<string, string> = {};
    const r = job.result;

    originalHeaders.forEach(header => {
      rowObj[header] = job.rawColumns[header] ?? '';
    });

    rowObj['固定残業'] = r?.fixed_overtime.status ?? (job.extractionStatus === 'error' ? 'エラー' : '未解析');
    rowObj['固定残業代'] = r?.fixed_overtime.amount ?? '';
    rowObj['固定残業時間'] = r?.fixed_overtime.hours ?? '';
    rowObj['超過分支給'] = r?.fixed_overtime.overtime_payment ?? '';
    rowObj['固定残業_根拠文章'] = r?.fixed_overtime.evidence ?? '';

    rowObj['試用期間'] = r?.trial_period.status ?? (job.extractionStatus === 'error' ? 'エラー' : '未解析');
    rowObj['試用期間_期間'] = r?.trial_period.duration ?? '';
    rowObj['試用期間_単位'] = r?.trial_period.unit ?? '';
    rowObj['試用期間_給与条件'] = r?.trial_period.salary_condition ?? '';
    rowObj['試用期間_勤務条件'] = r?.trial_period.work_condition ?? '';
    rowObj['試用期間_根拠文章'] = r?.trial_period.evidence ?? '';

    rowObj['総合判定'] = r?.overall_status ?? (job.extractionStatus === 'error' ? 'エラー' : '未解析');
    rowObj['確認状況'] = job.verifiedByUser ? '確認済み' : '';

    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(dataRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '抽出結果一覧');
  XLSX.writeFile(workbook, filename);
}
