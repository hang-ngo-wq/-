import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));

// Server-side Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface BatchItemInput {
  id: string;
  jobId?: string;
  title?: string;
  content: string;
  salary?: string;
}

const EXTRACTION_SYSTEM_INSTRUCTION = `あなたはIndeed求人データから「固定残業（みなし残業）」と「試用期間」を抽出・判定する専門アナリストです。
求人本文には表記ゆれが多いため、文章の意味を文脈を含めて深く理解し、厳格な判定ルールに基づいて正確に抽出してください。

【最重要判定ルール】
1. 固定残業（fixed_overtime）の判定ルール：
   - 「固定残業あり」：
     ・「固定残業代」「固定残業手当」「みなし残業代」「みなし残業手当」「固定残業時間」「みなし残業時間」「月○時間分の固定残業」「○時間分の固定残業代を含む」「固定残業○時間分○円」等が明記されている場合。
     ・「○時間を超える時間外労働には追加で支給」などの表現がある場合、前後の文章から固定残業制度が明確なら「あり」。
   - 「固定残業なし」：
     ・【超重要】「残業あり」「時間外勤務あり」「時間外労働あり」「残業月平均○時間」のみの場合は、絶対に固定残業ありと判定せず【なし】とする！
     ・「残業代別途支給」は固定残業とは限らないため、単独では「あり」にしない（固定残業【なし】）。
     ・「固定残業手当は含みません」「みなし残業なし」等の明記がある場合は【なし】。
     ・求人本文中に固定残業に関する記載が一切ない場合は【なし】。
   - 【禁止事項】：給与情報（例：「月給300,000円」）の金額の高さから固定残業を勝手に推測してはならない！
   - 固定残業の出力項目：
     - status: "あり" | "なし" | "要確認"
     - amount: 固定残業代（金額、例: "40,000円", "62,500円〜97,600円"）。記載がない/なしの場合は空文字 ""
     - hours: 固定残業時間（時間、例: "20時間", "30時間"）。記載がない/なしの場合は空文字 ""
     - overtime_payment: 超過分の追加支給（"あり" | "なし" | "不明"）
     - evidence: 求人本文の中からその判定を行った根拠となる文章を【原文のまま完全一致で引用】。改変・創作禁止。該当なしの場合は空文字 ""

2. 試用期間（trial_period）の判定ルール：
   - 対象表現：「試用期間」「試用期間あり」「試用期間○ヶ月」「試用期間○日」「試用期間中の給与」「研修期間」「仮採用期間」
   - 「試用期間なし」と明記されている場合は status: "なし"
   - 「試用期間3ヶ月」など明確な場合は status: "あり", duration: "3", unit: "ヶ月"
   - 「試用期間中の給与」：給与の変更がなければ "同条件"、減額・時給制変更等があれば "異なる"、言及がなければ "不明"
   - 「試用期間中の勤務条件」：待遇変更がなければ "同条件"、条件変更があれば "異なる"、言及がなければ "不明"
   - 「研修期間3ヶ月」：試用期間として扱える可能性があるため、文脈を確認し曖昧なら "要確認" または適切に判定。
   - 「入社後3ヶ月間は研修」：自動的に試用期間ありとは判定せず、"要確認" または文脈に応じる。
   - 求人本文中に試用期間に関する言及が一切ない場合は status: "なし"
   - 試用期間の出力項目：
     - status: "あり" | "なし" | "要確認"
     - duration: 期間の数字（例: "3", "6", "90"）。なし/不明の場合は空文字 ""
     - unit: 単位（"日" | "週間" | "ヶ月" | "年" | ""）
     - salary_condition: "同条件" | "異なる" | "不明"
     - work_condition: "同条件" | "異なる" | "不明"
     - evidence: 求人本文の中から判定の根拠となった文章を【原文のまま完全一致で引用】。該当なしの場合は空文字 ""

3. 総合判定（overall_status）のルール：
   - "OK": 固定残業・試用期間ともに明確に判断できた場合（あり・なし問わず）。
   - "要確認": 文脈が不十分、研修期間と試用期間の区別が曖昧、金額と時間の対応関係が不明、制度矛盾、怪しい手当表記など人間による目視確認が必要な場合。
   - "情報なし": 固定残業・試用期間の双方が求人本文に全く記載されていない場合。

4. 厳守事項：
   - 求人本文にない情報を勝手に推測・補完しない。
   - 根拠文章（evidence）は必ず入力テキストからそのまま抜き出すこと。`;

// Gemini response schema for a batch of jobs
const itemExtractionResponseSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: '求人レコードの内部ID' },
    fixed_overtime: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ['あり', 'なし', '要確認'] },
        amount: { type: Type.STRING, description: '固定残業代の金額（例: 40,000円）' },
        hours: { type: Type.STRING, description: '固定残業時間（例: 20時間）' },
        overtime_payment: { type: Type.STRING, enum: ['あり', 'なし', '不明'] },
        evidence: { type: Type.STRING, description: '根拠文章の原文そのまま' },
      },
      required: ['status', 'amount', 'hours', 'overtime_payment', 'evidence'],
    },
    trial_period: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ['あり', 'なし', '要確認'] },
        duration: { type: Type.STRING, description: '期間の数字（例: 3）' },
        unit: { type: Type.STRING, description: '期間の単位（日、週間、ヶ月、年。該当なしは空文字）' },
        salary_condition: { type: Type.STRING, enum: ['同条件', '異なる', '不明'] },
        work_condition: { type: Type.STRING, enum: ['同条件', '異なる', '不明'] },
        evidence: { type: Type.STRING, description: '根拠文章の原文そのまま' },
      },
      required: ['status', 'duration', 'unit', 'salary_condition', 'work_condition', 'evidence'],
    },
    overall_status: { type: Type.STRING, enum: ['OK', '要確認', '情報なし'] },
    notes: { type: Type.STRING, description: '要確認の理由や特記事項（短く簡潔に）' },
  },
  required: ['id', 'fixed_overtime', 'trial_period', 'overall_status'],
};

const batchResponseSchema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: itemExtractionResponseSchema,
      description: '各求人の抽出結果配列',
    },
  },
  required: ['results'],
};

// Resilient Gemini model caller with exponential backoff and model fallback
async function callGeminiWithResilience(contents: string, responseSchema: any) {
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  let lastError: any = null;
  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: EXTRACTION_SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.1,
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Attempt ${attempt} on ${model} failed:`, err?.message || err);
        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }

  throw lastError;
}

// Batch extraction API endpoint
app.post('/api/extract-batch', async (req, res) => {
  try {
    const items: BatchItemInput[] = req.body?.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '求人データ(items)が指定されていません。' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY が設定されていません。' });
    }

    // Format prompt with items
    const formattedPrompt = items
      .map(
        (item, index) => `
--- 求人 [${index + 1}] (ID: ${item.id}) ---
タイトル: ${item.title || '(なし)'}
給与列: ${item.salary || '(なし)'}
求人本文:
${item.content || '(本文なし)'}
`
      )
      .join('\n');

    const promptText = `以下のIndeed求人データ（${items.length}件）を解析し、各求人の固定残業と試用期間を判定・抽出してください。\n${formattedPrompt}`;

    const response = await callGeminiWithResilience(promptText, batchResponseSchema);

    const responseText = response.text?.trim() || '{}';
    let parsed: { results: any[] };
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response JSON:', responseText);
      return res.status(500).json({ error: 'AI応答のJSON解析に失敗しました。', raw: responseText });
    }

    return res.json({ results: parsed.results || [] });
  } catch (error: any) {
    console.error('Error in /api/extract-batch:', error);
    return res.status(500).json({
      error: error?.message || 'バッチ処理中にエラーが発生しました。',
    });
  }
});

// Single extraction endpoint for individual re-run
app.post('/api/extract-single', async (req, res) => {
  try {
    const item: BatchItemInput = req.body;
    if (!item || !item.content) {
      return res.status(400).json({ error: '求人本文(content)が指定されていません。' });
    }

    const promptText = `以下の求人データを解析してください：
ID: ${item.id}
タイトル: ${item.title || ''}
給与: ${item.salary || ''}
求人本文:
${item.content}
`;

    const response = await callGeminiWithResilience(promptText, itemExtractionResponseSchema);

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText);
    return res.json({ result: parsed });
  } catch (error: any) {
    console.error('Error in /api/extract-single:', error);
    return res.status(500).json({
      error: error?.message || '単一解析中にエラーが発生しました。',
    });
  }
});

// Setup Vite or static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
