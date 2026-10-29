import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AIError, transcribeAudio, analyzeVideo, generateRecipe } from "./ai";
import { normalizeImportUrl, downloadVideo, prepareVideo, prepareAudio, collectComments, extractVideoCover } from "./video-sources";
import { createHash } from "node:crypto";
import { db } from "./db";
import { recipeWithDetailsSchema, type RecipeWithDetails } from "../shared/schema";
import { generateRecipeImageAsset, saveImageAsset } from "./image-assets";

export function isPublicIPv4(address: string) {
  const [a, b] = address.split(".").map(Number);
  return a > 0 && a < 224 && ![10, 127].includes(a) && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && [0, 168].includes(b)) && !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && [18, 19, 51].includes(b)) && !(a === 203 && b === 0);
}
async function fetchPublicPage(rawUrl: string, redirects = 0, json = false): Promise<string> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) throw new AIError("Use um endereço público HTTPS de receita.", 400);
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(item => !isPublicIPv4(item.address))) throw new AIError("Este endereço não pode ser importado.", 400);
  return new Promise((resolve, reject) => {
    const req = request(url, {
      // Fixa o IP verificado para impedir mudança de DNS entre validação e conexão.
      lookup: (_hostname, options, callback) => {
        if (options.all) (callback as any)(null, [addresses[0]]);
        else callback(null, addresses[0].address, 4);
      },
      agent: false,
      headers: { "User-Agent": "Mozilla/5.0 MinhaReceita/1.0", Accept: json ? "application/json" : "text/html" },
    }, response => {
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        if (redirects >= 3) return reject(new AIError("A página redirecionou muitas vezes.", 400));
        resolve(fetchPublicPage(new URL(response.headers.location, url).href, redirects + 1, json));
        return;
      }
      if (status !== 200 || !response.headers["content-type"]?.includes(json ? "application/json" : "text/html")) {
        response.resume(); reject(new AIError("A página não disponibilizou conteúdo de receita. Cole o texto no campo de IA.", 400)); return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > 2_000_000) { req.destroy(new AIError("A página é grande demais para importar.", 400)); return; }
        chunks.push(chunk);
      });
      response.on("error", reject);
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    const timer = setTimeout(() => req.destroy(new AIError("A página demorou demais para responder.", 400)), 15000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end();
  });
}

let activeVideoImports = 0;
const sourceServices = { downloadVideo, fetchPublicPage, prepareVideo, analyzeVideo, prepareAudio, transcribeAudio, extractVideoCover };
export async function collectRecipeSources(rawUrl: string, supplementalText = "", services = sourceServices) {
  const { url, platform } = normalizeImportUrl(rawUrl);
  const report: NonNullable<RecipeWithDetails["importAnalysis"]> = {
    platform, video: platform === "website" ? "not_applicable" : "unavailable", description: false,
    pinnedComments: 0, authorComments: 0, warnings: [], analyzedAt: new Date().toISOString(),
    evidence: { description: "", comments: [], videoObservations: "", supplementalText },
  };
  if (platform === "website") {
    const html = await services.fetchPublicPage(url);
    const text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 12000);
    if (text.length < 50) throw new AIError("Não encontramos texto suficiente. Cole a receita no campo complementar.", 400);
    report.description = true;
    report.evidence.description = text.slice(0, 10000);
    return { text: text + "\nComplemento informado pelo usuário:\n" + supplementalText, sourceUrl: url, report };
  }
  if (activeVideoImports >= 2) throw new AIError("Há vídeos sendo analisados. Aguarde um momento e tente novamente.", 429);
  activeVideoImports++;
  let directory: string | undefined;
  try {
    directory = await mkdtemp(path.join(tmpdir(), "minha-receita-"));
    const { mediaPath, metadata, coverPath } = await services.downloadVideo(url, directory);
    const resolvedCoverPath = coverPath || await services.extractVideoCover(mediaPath, directory);
    const coverImage = resolvedCoverPath ? { data: await readFile(resolvedCoverPath), mimeType: "image/jpeg" } : undefined;
    let sourceUrl = url;
    if (metadata.webpage_url) {
      const canonical = normalizeImportUrl(metadata.webpage_url);
      if (canonical.platform === platform) sourceUrl = canonical.url;
    }
    let html = "";
    try { html = await services.fetchPublicPage(sourceUrl); }
    catch { report.warnings.push("A página pública não liberou todos os metadados e comentários."); }
    const comments = collectComments(metadata, html);
    report.evidence.description = (metadata.description || "").slice(0, 10000);
    if (!report.evidence.description.trim() && platform === "tiktok") {
      try {
        const embed = JSON.parse(await services.fetchPublicPage(`https://www.tiktok.com/oembed?url=${encodeURIComponent(sourceUrl)}`, 0, true));
        if (typeof embed.title === "string") report.evidence.description = embed.title.slice(0, 10000);
      } catch { /* O endpoint público pode não disponibilizar a legenda. */ }
    }
    report.description = !!report.evidence.description.trim();
    report.evidence.comments = comments.map(comment => `${comment.pinned ? "[Fixado confirmado]" : "[Autor do vídeo]"} ${comment.text}`);
    report.pinnedComments = comments.filter(comment => comment.pinned).length;
    report.authorComments = comments.filter(comment => comment.author).length;
    if (!report.description) report.warnings.push("A descrição não foi disponibilizada pela plataforma.");
    if (!report.pinnedComments) report.warnings.push("Não foi possível confirmar ou ler um comentário fixado. Isso não significa que ele não exista.");
    let context = [
      `Título: ${String(metadata.title || "").slice(0, 500)}`,
      `Descrição disponível: ${report.evidence.description || "Não disponível"}`,
      `Comentários identificados: ${report.evidence.comments.join("\n") || "Não disponíveis"}`,
      `Complemento fornecido pelo usuário (não verificado na plataforma): ${supplementalText || "Nenhum"}`,
    ].join("\n\n");
    // A transcrição dedicada complementa a análise multimodal e evita perder medidas faladas.
    if (process.env.GROQ_API_KEY) {
      try {
        const transcript = await services.transcribeAudio(await services.prepareAudio(mediaPath, directory));
        report.evidence.audioTranscript = transcript;
        report.evidence.videoObservations = transcript;
        report.video = "audio_only";
        context += "\n\nTranscrição dedicada do áudio (confira com as imagens):\n" + transcript;
      } catch (error) { report.warnings.push(error instanceof AIError ? error.message : "A transcrição adicional do áudio não pôde ser concluída."); }
    }
    if (process.env.GEMINI_API_KEY) {
      try {
        const video = await services.prepareVideo(mediaPath, directory);
        const analysis = await services.analyzeVideo(video, context);
        if (!analysis.hasRecipe) throw new AIError("Não foi possível identificar uma receita no vídeo e nas fontes disponíveis.", 422);
        report.video = "analyzed";
        report.evidence.videoObservations = analysis.observations;
        report.warnings.push(...analysis.missingInfo);
      } catch (error) {
        if (error instanceof AIError && error.status === 422) throw error;
        report.warnings.push(error instanceof AIError ? error.message : "A análise audiovisual não pôde ser concluída.");
      }
    } else report.warnings.push("A chave Gemini não está configurada; as imagens do vídeo não foram analisadas.");
    if (report.video === "audio_only") report.warnings.push("Importação parcial: somente o áudio foi analisado. Textos e ações visuais podem estar ausentes.");
    if (report.video === "unavailable") {
      if ((report.evidence.description + supplementalText + report.evidence.comments.join(" ")).length < 80) {
        throw new AIError("Não foi possível analisar o vídeo e não há texto suficiente para uma receita confiável. Confira a chave/cota Gemini ou cole a descrição e o comentário fixado no complemento.", 422);
      }
      report.warnings.push("Importação parcial baseada apenas em texto. O vídeo não foi analisado.");
    }
    return {
      text: context + `\n\n${report.video === "analyzed" ? "Observações audiovisuais" : "Transcrição disponível"}:\n${report.evidence.videoObservations}\n\nLimitações e incertezas:\n${report.warnings.join("\n")}`,
      sourceUrl, report, coverImage,
    };
  } finally {
    activeVideoImports--;
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

// Compatibilidade com verificações de importação de páginas.
export async function recipeContent(url: string) { return (await collectRecipeSources(url)).text; }

const inProgress = new Map<string, Promise<RecipeWithDetails>>();
export async function importRecipe(url: string, userId: number, supplementalText = "") {
  const normalized = normalizeImportUrl(url);
  const key = createHash("sha256").update(JSON.stringify(["video-v2", userId, normalized.url, supplementalText, process.env.GEMINI_VIDEO_MODEL || process.env.GEMINI_MODEL, process.env.GROQ_MODEL])).digest("hex");
  const cache = db.collection<{ _id: string; userId: number; recipe: RecipeWithDetails; expiresAt: Date }>("ai_import_cache");
  const cached = await cache.findOne({ _id: key, expiresAt: { $gt: new Date() } });
  if (cached) return recipeWithDetailsSchema.parse(cached.recipe);
  if (inProgress.has(key)) return inProgress.get(key)!;
  const operation = (async () => {
    const sources = await collectRecipeSources(normalized.url, supplementalText);
    const recipe = await generateRecipe(
      "Extraia uma receita fiel às evidências abaixo. Não complete lacunas com uma receita genérica. Quantidades desconhecidas devem ser 'não informada'; tempos ausentes são estimativas e devem ser identificados nas notas. Explique conflitos e lacunas nas notas. Não diga que leu fontes marcadas como indisponíveis. Use descrição e comentários para complementar, sem contradizer o vídeo silenciosamente.\n\n" + sources.text,
      userId,
    );
    let imageUrl: string | undefined;
    if (sources.coverImage) imageUrl = await saveImageAsset(sources.coverImage.data, sources.coverImage.mimeType, userId);
    else {
      try { imageUrl = await generateRecipeImageAsset(recipe, userId); }
      catch { /* A receita continua disponível; a imagem pode ser gerada pela edição. */ }
    }
    const result = recipeWithDetailsSchema.parse({ ...recipe, imageUrl, sourceUrl: sources.sourceUrl, importAnalysis: sources.report });
    // Resultados parciais não ficam em cache: uma nova tentativa pode recuperar a fonte ausente.
    if (sources.report.video === "analyzed" || sources.report.video === "not_applicable") {
      await cache.updateOne({ _id: key }, { $set: { userId, recipe: result, expiresAt: new Date(Date.now() + 86400000) } }, { upsert: true });
    }
    return result;
  })();
  inProgress.set(key, operation);
  try { return await operation; } finally { inProgress.delete(key); }
}
