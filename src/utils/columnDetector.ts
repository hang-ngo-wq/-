import { ColumnMapping } from '../types/job';

export function detectColumns(headers: string[]): ColumnMapping {
  const lowerHeaders = headers.map(h => h.trim().toLowerCase());

  // Detect Content column (most critical)
  const contentKeywords = [
    '求人本文', '本文', '仕事内容', '求人詳細', '募集要項', '業務内容', 
    '職務内容', '募集要項本文', '求人内容', '詳細', 'description', 'job description', 'content', 'body'
  ];
  let contentCol = '';
  for (const kw of contentKeywords) {
    const foundIdx = lowerHeaders.findIndex(h => h.includes(kw));
    if (foundIdx !== -1) {
      contentCol = headers[foundIdx];
      break;
    }
  }
  if (!contentCol && headers.length > 0) {
    // Fallback: pick the column with the highest character length or 3rd column
    contentCol = headers[Math.min(2, headers.length - 1)];
  }

  // Detect Job ID
  const idKeywords = ['求人id', 'job id', '求人コード', '管理番号', '求人番号', '案件id', 'id', 'code'];
  let jobIdCol = '';
  for (const kw of idKeywords) {
    const foundIdx = lowerHeaders.findIndex(h => h === kw || h.includes(kw));
    if (foundIdx !== -1) {
      jobIdCol = headers[foundIdx];
      break;
    }
  }
  if (!jobIdCol && headers.length > 0) {
    jobIdCol = headers[0];
  }

  // Detect Title
  const titleKeywords = ['求人タイトル', '募集職種', '職種名', '職種', 'ポジション', 'タイトル', 'job title', 'title', '求人名'];
  let titleCol = '';
  for (const kw of titleKeywords) {
    const foundIdx = lowerHeaders.findIndex(h => h.includes(kw));
    if (foundIdx !== -1 && headers[foundIdx] !== jobIdCol && headers[foundIdx] !== contentCol) {
      titleCol = headers[foundIdx];
      break;
    }
  }
  if (!titleCol && headers.length > 1) {
    titleCol = headers[1] !== contentCol ? headers[1] : headers[0];
  }

  // Detect Salary
  const salaryKeywords = ['給与', '想定年収', '月給', '給与詳細', '給与・待遇', 'salary', '賃金', '基本給'];
  let salaryCol = '';
  for (const kw of salaryKeywords) {
    const foundIdx = lowerHeaders.findIndex(h => h.includes(kw));
    if (foundIdx !== -1 && headers[foundIdx] !== contentCol) {
      salaryCol = headers[foundIdx];
      break;
    }
  }

  return {
    jobIdCol: jobIdCol || headers[0] || '',
    titleCol: titleCol || headers[1] || '',
    contentCol: contentCol || headers[0] || '',
    salaryCol: salaryCol || '',
  };
}
