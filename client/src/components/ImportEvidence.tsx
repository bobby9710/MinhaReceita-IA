import type { RecipeWithDetails } from "@shared/schema";

export function ImportEvidence({ report }: { report?: RecipeWithDetails["importAnalysis"] }) {
  if (!report) return null;
  const videoLabels = { analyzed: "Vídeo e áudio analisados", audio_only: "Somente áudio analisado", unavailable: "Vídeo não analisado", not_applicable: "Receita extraída de página" };
  return <section className="bg-card rounded-2xl p-5 border border-border mb-6 space-y-3" aria-label="Fontes da receita importada">
    <h2 className="font-semibold">Fontes consultadas</h2>
    <p className="text-sm">{videoLabels[report.video]} · {report.description ? "Descrição disponível" : "Descrição indisponível"}</p>
    <p className="text-sm">Comentários fixados confirmados: {report.pinnedComments}. Comentários do autor: {report.authorComments}.</p>
    {report.warnings.length > 0 && <div className="rounded-xl bg-amber-50 text-amber-950 p-4 text-sm">
      <p className="font-semibold mb-2">Revise estas limitações antes de salvar:</p>
      <ul className="list-disc pl-5 space-y-1">{report.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
    </div>}
    <details className="text-sm">
      <summary className="cursor-pointer font-medium">Ver informações usadas na importação</summary>
      <div className="space-y-3 mt-3 whitespace-pre-wrap break-words">
        {report.evidence.description && <p><strong>Descrição:</strong>{"\n"}{report.evidence.description}</p>}
        {report.evidence.comments.length > 0 && <p><strong>Comentários identificados:</strong>{"\n"}{report.evidence.comments.join("\n\n")}</p>}
        {report.evidence.videoObservations && <p><strong>Observações do vídeo:</strong>{"\n"}{report.evidence.videoObservations}</p>}
        {report.evidence.audioTranscript && <p><strong>Transcrição do áudio:</strong>{"\n"}{report.evidence.audioTranscript}</p>}
        {report.evidence.supplementalText && <p><strong>Complemento fornecido por você:</strong>{"\n"}{report.evidence.supplementalText}</p>}
      </div>
    </details>
    <p className="text-xs text-muted-foreground">A análise pode perder detalhes ou conter erros. Confira quantidades, tempos e restrições alimentares. Fontes indisponíveis não foram verificadas.</p>
  </section>;
}
