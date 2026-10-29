import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/teste_importacao";
process.env.GEMINI_API_KEY = "chave-simulada";
process.env.GROQ_API_KEY = "chave-simulada";
const { normalizeImportUrl, collectComments } = await import("../server/video-sources");
const { collectRecipeSources } = await import("../server/import-recipe");
const { AIError } = await import("../server/ai");

test("normaliza links de celular, computador e texto compartilhado", () => {
  assert.equal(normalizeImportUrl("Veja esta receita https://vt.tiktok.com/ZSgpqvmnQ/").platform, "tiktok");
  assert.equal(normalizeImportUrl("https://vm.tiktok.com/abc/").platform, "tiktok");
  assert.equal(normalizeImportUrl("https://m.tiktok.com/@chef/video/123?share=1").url, "https://www.tiktok.com/@chef/video/123");
  assert.equal(normalizeImportUrl("https://www.instagram.com/reels/ABC/?igsh=xyz").url, "https://www.instagram.com/reel/ABC/");
  assert.equal(normalizeImportUrl("https://www.instagram.com/share/reel/ABC/").platform, "instagram");
  assert.equal(normalizeImportUrl("https://tiktok.com.example.org/video/123").platform, "website");
  assert.throws(() => normalizeImportUrl("https://usuario:senha@tiktok.com/video/1"));
  assert.throws(() => normalizeImportUrl("file:///tmp/video"));
});

test("comentários fixados exigem sinalização explícita; popularidade não basta", () => {
  const result = collectComments({ uploader_id: "chef", comments: [
    { id: "1", author_id: "visitante", text: "Muito bom", like_count: 10000 },
    { id: "2", author_id: "chef", text: "Use 2 ovos" },
    { id: "3", author_id: "visitante", text: "Forno a 180 graus", is_pinned: true },
  ] }, '<script type="application/json">{"comments":[{"cid":"4","user":{"uniqueId":"chef"},"text":"Asse por 20 minutos","isPinned":true}]}</script>');
  assert.equal(result.length, 3);
  assert.equal(result.filter(c => c.pinned).length, 2);
  assert.equal(result.some(c => c.text === "Muito bom"), false);
});

const observations = "O vídeo mostra um ovo, duas colheres de tapioca e frango desfiado, preparados na frigideira.";
function fakeServices() {
  return {
    downloadVideo: async (_url: string, directory: string) => ({ mediaPath: directory + "/video.mp4", metadata: { title: "Receita", description: "Misture ovo, tapioca e frango.", uploader_id: "chef", comments: [{ id: "1", author_id: "chef", text: "Use uma colher de requeijão.", is_pinned: true }] } }),
    fetchPublicPage: async () => "<html></html>",
    prepareVideo: async (file: string) => file,
    analyzeVideo: async (_file: string, context: string) => {
      assert.match(context, /requeijão/);
      return { hasRecipe: true, observations, missingInfo: ["A quantidade de frango não foi informada."] };
    },
    prepareAudio: async (file: string) => file,
    transcribeAudio: async () => observations,
    extractVideoCover: async () => undefined,
  };
}

test("combina vídeo, descrição, fixado e complemento; apaga arquivos temporários", async () => {
  const services = fakeServices();
  let directory = "";
  const download = services.downloadVideo;
  services.downloadVideo = async (url, dir) => { directory = dir; return download(url, dir); };
  const result = await collectRecipeSources("https://vt.tiktok.com/abc/", "Descrição copiada pelo usuário.", services);
  assert.equal(result.report.video, "analyzed");
  assert.equal(result.report.description, true);
  assert.equal(result.report.pinnedComments, 1);
  assert.match(result.text, /quantidade de frango/);
  assert.equal(result.report.evidence.audioTranscript, observations);
  assert.equal(result.report.evidence.supplementalText, "Descrição copiada pelo usuário.");
  assert.equal(existsSync(directory), false);
});

test("falha visual produz importação parcial explícita, sem inventar análise", async () => {
  const services = fakeServices();
  services.analyzeVideo = async () => { throw new AIError("Cota indisponível.", 429); };
  const result = await collectRecipeSources("https://www.instagram.com/reel/ABC/", "", services);
  assert.equal(result.report.video, "audio_only");
  assert.ok(result.report.warnings.some(w => w.includes("somente o áudio")));
});

test("vídeo sem receita é recusado e recursos são limpos", async () => {
  const services = fakeServices();
  services.analyzeVideo = async () => ({ hasRecipe: false, observations: "O vídeo mostra uma viagem, sem receita.", missingInfo: [] });
  await assert.rejects(collectRecipeSources("https://vt.tiktok.com/abc/", "", services), /identificar uma receita/);
});

test("sem vídeo analisável ou evidência textual suficiente, recusa a importação", async () => {
  const services = fakeServices();
  services.downloadVideo = async (_url, directory) => ({ mediaPath: directory + "/video.mp4", metadata: { title: "Vídeo", description: "", uploader_id: "chef", comments: [] } });
  services.analyzeVideo = async () => { throw new AIError("Vídeo indisponível."); };
  services.transcribeAudio = async () => { throw new AIError("Áudio indisponível."); };
  await assert.rejects(collectRecipeSources("https://vt.tiktok.com/abc/", "", services), /não há texto suficiente/);
});
