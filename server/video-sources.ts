import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import { AIError } from "./ai";

const run = promisify(execFile);
export type VideoMetadata = {
  title?: string; description?: string; duration?: number; webpage_url?: string;
  uploader?: string; uploader_id?: string; channel?: string;
  comments?: Record<string, unknown>[]; thumbnail?: string;
};
export function normalizeImportUrl(input: string) {
  const match = input.trim().match(/https?:\/\/[^\s<>]+/i);
  if (!match) throw new AIError("Cole um link válido de vídeo ou receita.", 400);
  let url: URL;
  try { url = new URL(match[0].replace(/[)\],.]+$/, "")); }
  catch { throw new AIError("O endereço informado não é válido.", 400); }
  if (url.username || url.password || url.port) throw new AIError("Use um link público sem credenciais ou porta personalizada.", 400);
  const host = url.hostname.toLowerCase();
  const platform = /^(www\.|m\.|vm\.|vt\.)?tiktok\.com$/.test(host) ? "tiktok"
    : /^(www\.|m\.)?instagram\.com$/.test(host) ? "instagram"
    : /^(www\.|m\.)?youtube\.com$/.test(host) || host === "youtu.be" ? "youtube" : "website";
  if (platform !== "website") url.protocol = "https:";
  if (url.protocol !== "https:") throw new AIError("Use um endereço HTTPS público.", 400);
  if (platform === "tiktok" || platform === "instagram") {
    if (host.startsWith("m.")) url.hostname = "www." + host.slice(2);
    url.search = "";
    if (platform === "instagram") url.pathname = url.pathname.replace(/^\/reels\//, "/reel/");
  }
  url.hash = "";
  return { url: url.href, platform } as const;
}

export function mediaTools() {
  const local = path.resolve(".tools", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
  return {
    downloader: process.env.YTDLP_PATH || (existsSync(local) ? local : "yt-dlp"),
    ffmpeg: process.env.FFMPEG_PATH || ffmpegStatic || "ffmpeg",
  };
}

export async function downloadVideo(url: string, directory: string) {
  const tools = mediaTools();
  try {
    await run(tools.downloader, [
      "--ignore-config", "--no-playlist", "--playlist-items", "1", "--no-progress", "--no-warnings",
      "--socket-timeout", "15", "--retries", "1", "--extractor-retries", "1",
      "--max-filesize", "80M", "--match-filter", "duration <= 600",
      "--get-comments", "--extractor-args", "youtube:max_comments=30;comment_sort=top",
      "--write-info-json", "--write-thumbnail", "--convert-thumbnails", "jpg", "--ffmpeg-location", tools.ffmpeg,
      "-f", "b[ext=mp4]/b", "-o", path.join(directory, "video.%(ext)s"), "--", url,
    ], { timeout: 150000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    const files = await readdir(directory);
    const media = files.find(name => /^video\.(mp4|webm|mov|mkv)$/.test(name));
    if (!media) throw new AIError("O vídeo não foi baixado. Use um vídeo público de até 10 minutos e 80 MB.", 400);
    const metadataPath = path.join(directory, "video.info.json");
    const metadata: VideoMetadata = existsSync(metadataPath) ? JSON.parse(await readFile(metadataPath, "utf8")) : {};
    if (metadata.duration && metadata.duration > 600) throw new AIError("Use um vídeo de até 10 minutos.", 400);
    const mediaPath = path.join(directory, media);
    if ((await stat(mediaPath)).size > 80 * 1024 * 1024) throw new AIError("O vídeo ultrapassa o limite de 80 MB.", 400);
    const cover = files.find(name => /^video\.(jpg|jpeg|png|webp)$/.test(name));
    return { mediaPath, metadata, coverPath: cover ? path.join(directory, cover) : undefined };
  } catch (error) {
    if (error instanceof AIError) throw error;
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new AIError("O importador de vídeos não está instalado no servidor. Execute a preparação de mídia do projeto.");
    throw new AIError("A plataforma não liberou o vídeo para importação. Verifique se o link abre sem login; vídeos privados, removidos ou bloqueados não podem ser lidos.", 422);
  }
}
export async function extractVideoCover(mediaPath: string, directory: string) {
  const output = path.join(directory, "cover.jpg");
  try {
    await run(mediaTools().ffmpeg, ["-nostdin", "-y", "-ss", "1", "-i", mediaPath, "-frames:v", "1", "-vf", "scale=768:768:force_original_aspect_ratio=decrease", "-q:v", "3", output], { timeout: 60000, maxBuffer: 1024 * 1024, windowsHide: true });
    return output;
  } catch { return undefined; }
}

export async function prepareVideo(mediaPath: string, directory: string) {
  const output = path.join(directory, "analysis.mp4");
  try {
    await run(mediaTools().ffmpeg, ["-nostdin", "-y", "-i", mediaPath, "-map", "0:v:0", "-map", "0:a:0?", "-vf", "scale=640:640:force_original_aspect_ratio=decrease:force_divisible_by=2", "-r", "12", "-c:v", "libx264", "-preset", "veryfast", "-b:v", "150k", "-maxrate", "170k", "-bufsize", "340k", "-c:a", "aac", "-b:a", "32k", "-movflags", "+faststart", output], { timeout: 180000, maxBuffer: 1024 * 1024, windowsHide: true });
  } catch { throw new AIError("Não foi possível preparar o vídeo para análise. Verifique o FFmpeg no servidor."); }
  if ((await stat(output)).size > 18 * 1024 * 1024) throw new AIError("O vídeo é grande demais para a análise gratuita. Use um vídeo mais curto.", 400);
  return output;
}
export async function prepareAudio(mediaPath: string, directory: string) {
  const output = path.join(directory, "audio.mp3");
  try { await run(mediaTools().ffmpeg, ["-nostdin", "-y", "-i", mediaPath, "-vn", "-ac", "1", "-b:a", "48k", output], { timeout: 90000, maxBuffer: 1024 * 1024, windowsHide: true }); }
  catch { throw new AIError("Não foi possível extrair áudio deste vídeo.", 422); }
  return output;
}

type Comment = { text: string; pinned: boolean; author: boolean };
export function collectComments(metadata: VideoMetadata, html = "") {
  const found = new Map<string, Comment>();
  const names = [metadata.uploader, metadata.uploader_id, metadata.channel].filter(Boolean).map(name => String(name).replace(/^@/, "").toLowerCase());
  function inspect(value: unknown, depth = 0) {
    if (depth > 35 || !value || typeof value !== "object") return;
    if (Array.isArray(value)) { for (const item of value.slice(0, 200)) inspect(item, depth + 1); return; }
    const item = value as Record<string, any>;
    const text = item.text ?? item.comment_text;
    const author = item.author_id ?? item.user?.uniqueId ?? item.user?.unique_id ?? item.user?.username ?? item.author;
    if (typeof text === "string" && text.trim() && author && (item.id || item.cid || item.pk)) {
      const pinned = item.is_pinned === true || item.is_pinned === 1 || item.isPinned === true || item.pinned === true;
      const byAuthor = item.author_is_uploader === true || names.includes(String(author).replace(/^@/, "").toLowerCase());
      if (pinned || byAuthor) {
        const previous = found.get(text);
        found.set(text, { text: text.slice(0, 2000), pinned: pinned || !!previous?.pinned, author: byAuthor || !!previous?.author });
      }
    }
    for (const [key, child] of Object.entries(item)) if (!["formats", "thumbnails"].includes(key)) inspect(child, depth + 1);
  }
  inspect(metadata.comments);
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { inspect(JSON.parse(match[1])); } catch {}
  }
  return [...found.values()].slice(0, 20);
}
