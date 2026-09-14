// Obsidianのタロットノート(大アルカナ/小アルカナ)を読み込み、
// アプリ用の data/cards.js と images/ を生成する一回限りのスクリプト。
// 実行: node scripts/build-cards.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const LORE_ROOT = "F:\\マイドライブ\\obsidian\\lore\\projects\\タロット";

const MAJOR_DIR = path.join(LORE_ROOT, "大アルカナ");
const MINOR_DIR = path.join(LORE_ROOT, "小アルカナ");
const IMG_MAJOR_DIR = path.join(LORE_ROOT, "画像");
const IMG_MINOR_DIR = path.join(LORE_ROOT, "画像", "小アルカナ");

const OUT_DATA = path.join(PROJECT_ROOT, "data", "cards.js");
const OUT_IMG_MAJOR = path.join(PROJECT_ROOT, "images", "major");
const OUT_IMG_MINOR = path.join(PROJECT_ROOT, "images", "minor");

const MAJOR_SLUGS = [
  "fool", "magician", "high-priestess", "empress", "emperor",
  "hierophant", "lovers", "chariot", "strength", "hermit",
  "wheel-of-fortune", "justice", "hanged-man", "death", "temperance",
  "devil", "tower", "star", "moon", "sun", "judgement", "world",
];

const SUIT_SLUG = {
  "ワンド": "wands",
  "カップ": "cups",
  "ソード": "swords",
  "ペンタクル": "pentacles",
};

function rankLabelForImage(rank) {
  if (rank === 1) return "エース";
  if (rank >= 2 && rank <= 10) return String(rank);
  if (rank === 11) return "ペイジ";
  if (rank === 12) return "ナイト";
  if (rank === 13) return "クイーン";
  if (rank === 14) return "キング";
  throw new Error(`不明なrank: ${rank}`);
}

function readFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return { fm: {}, rest: content };
  const fmBlock = m[1];
  const fm = {};
  for (const line of fmBlock.split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      let val = kv[2].trim();
      val = val.replace(/^"(.*)"$/, "$1");
      fm[kv[1]] = val;
    }
  }
  const rest = content.slice(m[0].length);
  return { fm, rest };
}

function extractTitle(body) {
  const m = body.match(/^#\s+.+$/m);
  if (!m) return { nameJa: "", nameEn: "" };
  const line = m[0].replace(/^#\s+/, "");
  const jaEn = line.match(/^(?:\d+\.\s*)?(.+?)(?:（(.+)）)?$/);
  return {
    nameJa: (jaEn?.[1] ?? line).trim(),
    nameEn: (jaEn?.[2] ?? "").trim(),
  };
}

function extractOrientation(body) {
  const upM = body.match(/^-\s*正位置[：:]\s*(.+)$/m);
  const revM = body.match(/^-\s*逆位置[：:]\s*(.+)$/m);
  return {
    uprightShort: upM ? upM[1].trim() : "",
    reversedShort: revM ? revM[1].trim() : "",
  };
}

function cleanBody(rest) {
  return rest
    .replace(/^!\[\[.*\]\]\s*$/gm, "")
    .trim();
}

function copyImage(src, destDir, destName) {
  fs.mkdirSync(destDir, { recursive: true });
  const dest = path.join(destDir, destName);
  fs.copyFileSync(src, dest);
  return dest;
}

const cards = [];

// 大アルカナ
const majorFiles = fs.readdirSync(MAJOR_DIR).filter(f => f.endsWith(".md"));
for (const file of majorFiles) {
  const full = path.join(MAJOR_DIR, file);
  const content = fs.readFileSync(full, "utf8");
  const { fm, rest } = readFrontmatter(content);
  const number = Number(fm.card_number);
  if (Number.isNaN(number)) throw new Error(`card_numberが読めない: ${file}`);
  const { nameJa, nameEn } = extractTitle(rest);
  const { uprightShort, reversedShort } = extractOrientation(rest);
  const slug = MAJOR_SLUGS[number];
  const imgName = `${String(number).padStart(2, "0")}-${slug}.jpg`;

  const srcImgFile = fs.readdirSync(IMG_MAJOR_DIR).find(f =>
    f.startsWith(String(number).padStart(2, "0") + "-") && f.endsWith(".jpg")
  );
  if (!srcImgFile) throw new Error(`画像が見つからない(大アルカナ): ${number}`);
  copyImage(path.join(IMG_MAJOR_DIR, srcImgFile), OUT_IMG_MAJOR, imgName);

  cards.push({
    id: `major-${String(number).padStart(2, "0")}`,
    arcana: "major",
    suit: null,
    rank: null,
    isCourt: false,
    number,
    nameJa,
    nameEn,
    uprightShort,
    reversedShort,
    bodyMarkdown: cleanBody(rest),
    image: `images/major/${imgName}`,
  });
}

// 小アルカナ
const minorFiles = fs.readdirSync(MINOR_DIR).filter(f => f.endsWith(".md"));
for (const file of minorFiles) {
  const full = path.join(MINOR_DIR, file);
  const content = fs.readFileSync(full, "utf8");
  const { fm, rest } = readFrontmatter(content);
  const suitJa = fm.suit;
  const rank = Number(fm.rank);
  const suitSlug = SUIT_SLUG[suitJa];
  if (!suitSlug) throw new Error(`不明なsuit: ${suitJa} (${file})`);
  if (Number.isNaN(rank)) throw new Error(`rankが読めない: ${file}`);
  const { nameJa, nameEn } = extractTitle(rest);
  const { uprightShort, reversedShort } = extractOrientation(rest);
  const imgName = `${suitSlug}-${String(rank).padStart(2, "0")}.jpg`;

  const rankLabel = rankLabelForImage(rank);
  const srcImgFile = path.join(IMG_MINOR_DIR, `${suitJa}の${rankLabel}.jpg`);
  if (!fs.existsSync(srcImgFile)) throw new Error(`画像が見つからない(小アルカナ): ${srcImgFile}`);
  copyImage(srcImgFile, OUT_IMG_MINOR, imgName);

  cards.push({
    id: `${suitSlug}-${String(rank).padStart(2, "0")}`,
    arcana: "minor",
    suit: suitSlug,
    rank,
    isCourt: rank >= 11,
    number: null,
    nameJa,
    nameEn,
    uprightShort,
    reversedShort,
    bodyMarkdown: cleanBody(rest),
    image: `images/minor/${imgName}`,
  });
}

cards.sort((a, b) => a.id.localeCompare(b.id));

const header = "// 自動生成ファイル。scripts/build-cards.mjs で再生成する。手動編集は上書きされるので避けること。\n";
const jsContent = `${header}const CARDS = ${JSON.stringify(cards, null, 2)};\n`;
fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true });
fs.writeFileSync(OUT_DATA, jsContent, "utf8");

console.log(`生成完了: ${cards.length}枚`);
console.log(`  大アルカナ: ${cards.filter(c => c.arcana === "major").length}枚`);
console.log(`  小アルカナ: ${cards.filter(c => c.arcana === "minor").length}枚`);
console.log(`  コートカード: ${cards.filter(c => c.isCourt).length}枚`);
