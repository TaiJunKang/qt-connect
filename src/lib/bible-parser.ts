/**
 * Bible text parser for Korean Bible (개역개정)
 * Expected format in bible.txt:
 *   창1:1 <천지 창조> 태초에 하나님이...
 *   창1:2 땅이 혼돈하고...
 */

let bibleTextCache: string | null = null;
let loadPromise: Promise<string> | null = null;

/** Load bible.txt as raw text (cached) */
async function loadBibleText(): Promise<string> {
  if (bibleTextCache !== null) return bibleTextCache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const response = await fetch('/bible.txt');
    if (!response.ok) {
      throw new Error(`파일을 불러올 수 없습니다. (상태 코드: ${response.status})`);
    }
    // bible.txt is EUC-KR encoded — decode with the correct charset
    const buffer = await response.arrayBuffer();
    const text = new TextDecoder('euc-kr').decode(buffer);
    if (text.trim().startsWith('<')) {
      throw new Error('텍스트 파일이 아니라 HTML이 불러와졌습니다. public 폴더에 bible.txt가 있는지 확인해주세요.');
    }
    bibleTextCache = text;
    return bibleTextCache;
  })();

  return loadPromise;
}

type ParseResult =
  | { success: true; text: string }
  | { success: false; error: string };

/**
 * Extract bible verses from the full text for a given reference string.
 * Flexible: handles spaces, ~ or - as range separator, e.g. "창1:1~8", "창 1:1-8", "요3:16"
 */
function extractBibleVerses(fullText: string, reference: string): ParseResult {
  const cleanRef = reference.replace(/\s+/g, '').replace('~', '-');
  const match = cleanRef.match(/^([가-힣]+)(\d+):(\d+)(?:-(\d+))?$/);

  if (!match) {
    return { success: false, error: `구절 형식이 올바르지 않습니다. (예: 창1:1~8) — 입력값: "${reference}"` };
  }

  const book = match[1];
  const chapter = parseInt(match[2], 10);
  const startVerse = parseInt(match[3], 10);
  const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

  const lines = fullText.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Flexible: allow optional space between book and chapter (e.g. "창1:1" or "창 1:1")
    const lineRegex = new RegExp(`^${book}\\s*${chapter}:(\\d+)`);
    const lineMatch = line.match(lineRegex);

    if (lineMatch) {
      const currentVerse = parseInt(lineMatch[1], 10);
      if (currentVerse >= startVerse && currentVerse <= endVerse) {
        result.push(line);
      }
      if (currentVerse > endVerse) break;
    }
  }

  if (result.length > 0) {
    return { success: true, text: result.join('\n') };
  } else {
    return {
      success: false,
      error: `파일에서 [${book} ${chapter}장 ${startVerse}절~${endVerse}절]을 찾을 수 없습니다. (약어 확인 필요)`,
    };
  }
}

/**
 * Public API: extract scripture text for a given reference string.
 * Throws a descriptive Error on failure so callers can show it via toast.
 */
export async function extractScripture(ref: string): Promise<string> {
  const fullText = await loadBibleText();
  const result = extractBibleVerses(fullText, ref);

  if (result.success) {
    return result.text;
  } else {
    const err = (result as { success: false; error: string }).error;
    console.error('Bible Parse Error:', err);
    throw new Error(err);
  }
}

export interface BibleSearchResult {
  reference: string; // e.g. "창1:1"
  text: string;      // verse content
}

/**
 * Search bible.txt for verses containing the keyword.
 * Returns up to `limit` matching verses.
 */
export async function searchBible(keyword: string, limit = 50): Promise<BibleSearchResult[]> {
  const fullText = await loadBibleText();
  const lines = fullText.split('\n');
  const results: BibleSearchResult[] = [];
  const query = keyword.trim().toLowerCase();

  if (!query) return results;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.toLowerCase().includes(query)) {
      // Extract reference (e.g. "창1:1") from the line start
      const refMatch = trimmed.match(/^([가-힣]+\d+:\d+)/);
      if (refMatch) {
        results.push({
          reference: refMatch[1],
          text: trimmed.slice(refMatch[0].length).replace(/^\s*<[^>]*>\s*/, '').trim(),
        });
      }
      if (results.length >= limit) break;
    }
  }

  return results;
}

/** Generate "YYYY-MM-DD" strings for 7 consecutive days starting from a Date */
export function getWeekDates(startDate: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
}
