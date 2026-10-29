# Minha Receita

Aplicativo React + Vite, com API Express, MongoDB Atlas e geração de receitas por IA na nuvem.

## Iniciar no Windows

Requisito: Node.js 22.12 ou mais recente. Na pasta do projeto, use o PowerShell:

```powershell
npm.cmd ci
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Se `.env` já existir, **preserve o arquivo** e apenas complete os valores. O arquivo não é versionado. A preparação inicial feita nesta cópia já criou um `SESSION_SECRET` aleatório.

Preencha no `.env`:

```dotenv
MONGODB_URI=mongodb+srv://USUARIO:SENHA@SEU_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=minha_receita
SESSION_SECRET=um-segredo-longo-e-aleatorio
AI_PROVIDER=groq
GROQ_API_KEY=sua-chave-do-plano-gratuito
```

No Atlas, copie a URI em **Connect > Drivers**, crie um usuário com acesso de leitura e escrita ao banco escolhido e autorize o IP do computador em **Network Access**. Caracteres especiais na senha precisam estar codificados na URI. Use um banco separado para testes se o cluster já contém dados importantes.

Se a consulta DNS SRV do Atlas falhar com `ECONNREFUSED`, configure `MONGODB_DNS_SERVERS=1.1.1.1,8.8.8.8` no `.env`. Essa opção afeta apenas o processo Node.js, sem alterar o DNS do sistema operacional. Reinicie o app após modificar o `.env`.

```powershell
npm.cmd run db:check
npm.cmd run dev
```

Abra **http://localhost:5000**, crie uma conta e acesse **Criar Nova Receita**. Para encerrar, pressione `Ctrl+C`. `npm.cmd` evita o bloqueio de `npm.ps1` pelo PowerShell. O app carrega `.env` automaticamente; frontend e API usam a mesma porta localmente. Deixe `FRONTEND_URL` e `VITE_API_URL` vazios para esse modo.

`db:check` conecta, faz ping e cria/verifica os índices. Não é necessário executar migrações SQL. O MongoDB precisa aceitar transações: Atlas já oferece essa capacidade; um MongoDB local precisa de replica set.

## IA gratuita na nuvem

- **Groq (principal):** gere uma chave em https://console.groq.com/keys e mantenha a conta no plano gratuito. O modelo padrão de texto é `qwen/qwen3.8-27b`; a transcrição usa `whisper-large-v3-turbo`.
- **Gemini (alternativa):** gere uma chave em https://aistudio.google.com/apikey em um projeto elegível à modalidade gratuita, sem faturamento. Configure `GEMINI_API_KEY` e `AI_PROVIDER=gemini`. O modelo padrão é `gemini-3.5-flash-lite`.
- **Alternativa automática opcional:** com Groq principal, configure `AI_FALLBACK_PROVIDER=gemini` para permitir o envio ao Gemini em caso de limite ou indisponibilidade. Por padrão, esse encaminhamento está desativado.

Esses planos gratuitos não exigem compra de créditos, mas têm limites por requisições, tokens e/ou áudio. Não existe garantia de uso ilimitado. Consulte os limites efetivos da sua conta; os provedores podem alterar modelos e cotas. O app não ativa faturamento, mas **uma chave de conta paga pode gerar cobrança pelo provedor**. Não use uma chave de projeto pago se deseja manter o uso gratuito.

Para economizar cota, o app limita o tamanho dos pedidos e respostas, reaproveita por 24 horas resultados do mesmo pedido por usuário/modelo, agrupa pedidos simultâneos iguais no processo e limita novas solicitações por usuário. Ao receber HTTP 429, aguarda antes de voltar ao provedor. Esses controles locais de concorrência não constituem um limite global entre várias réplicas do servidor.

As instruções e os textos de receitas são enviados ao provedor selecionado. Não são enviados a ele a senha da conta nem a URI do MongoDB. As condições da modalidade gratuita do Gemini incluem uso do conteúdo para melhorar seus produtos: consulte a política antes de enviar dados particulares.

Na tela **Criar Nova Receita**, descreva ingredientes, porções e restrições alimentares ou cole o texto de uma receita. A IA preenche o formulário; revise antes de salvar. A importação de páginas HTTPS extrai texto público. Páginas bloqueadas, dinâmicas ou que exigem login podem não funcionar.

### Importação de vídeos do TikTok e Instagram

O campo aceita links do computador, links compartilhados (`vt.tiktok.com`, `vm.tiktok.com`), Reels e links de compartilhamento do Instagram. Também aceita um link inserido em texto compartilhado. O acesso depende de o conteúdo estar público e de a plataforma permitir a extração; login, vídeos privados e bloqueios não são contornados.

No Windows, instale o extrator no projeto:

```powershell
npm.cmd run media:setup
```

O instalador baixa o yt-dlp do repositório oficial e verifica o SHA-256. O FFmpeg é instalado pelo pacote `ffmpeg-static` durante `npm ci`. Caminhos alternativos podem ser configurados em `YTDLP_PATH` e `FFMPEG_PATH`. Em Linux, instale yt-dlp no servidor e informe o caminho se não estiver no PATH. A publicação deve prever esses binários; o script de instalação do yt-dlp incluído é específico para Windows.

A importação combina:

- Transcrição dedicada pelo Groq para recuperar medidas faladas.
- Análise do arquivo de vídeo inteiro pelo Gemini, considerando imagens, áudio, textos na tela e a transcrição. Configure `GEMINI_API_KEY` e, opcionalmente, `GEMINI_VIDEO_MODEL` (padrão: `gemini-3.5-flash-lite`). A análise visual usa Gemini mesmo com `AI_PROVIDER=groq`.
- Descrição obtida pelo extrator e, quando disponível, metadados públicos do TikTok.
- Comentários do autor e comentários explicitamente marcados como fixados nas informações públicas recuperadas. Quantidade de curtidas ou posição na lista **não** prova que um comentário está fixado. O extrator atual não fornece comentários de TikTok de forma geral nem garante a indicação de fixação no Instagram; a leitura de dados públicos da página é uma tentativa complementar, não uma garantia.

Vídeos podem ter até 10 minutos e 80 MB; são comprimidos para análise, com limite final de 18 MB. Os arquivos temporários são apagados em caso de sucesso ou falha. O modelo pode deixar passar detalhes visuais, textos pequenos e falas. A interface apresenta as fontes efetivamente utilizadas, a transcrição e as incertezas. Esses registros acompanham a receita salva no MongoDB.

Se a análise visual falhar, o app pode oferecer uma importação parcial baseada no áudio, claramente sinalizada. Sem evidências suficientes, a importação é recusada. Quantidades ausentes não devem ser inventadas. Quando a plataforma ocultar descrição ou comentário fixado, use **Complementar com descrição ou comentário fixado** para fornecer o texto manualmente; sua origem manual fica registrada.

Importações audiovisuais concluídas ficam em cache por usuário e link durante 24 horas para economizar cota. Resultados parciais não entram nesse cache. O vídeo é enviado ao Gemini e o áudio ao Groq; aplicam-se os limites e as políticas de privacidade das contas configuradas.

Referências: https://ai.google.dev/gemini-api/docs/video-understanding e https://github.com/yt-dlp/yt-dlp.

### Imagens das receitas

Receitas criadas pelo campo de IA recebem uma imagem automaticamente. Importações de TikTok e Instagram priorizam a capa fornecida pela plataforma; quando não houver capa, o app tenta gerar uma imagem baseada na receita. Na edição, **Gerar imagem com IA** cria ou substitui a imagem, inclusive em receitas antigas.

As imagens são copiadas para o MongoDB, vinculadas ao usuário e servidas por uma rota autenticada. Imagens provisórias expiram em 24 horas quando a receita não é salva. Ao substituir ou excluir uma receita, a imagem anterior armazenada também é removida.

Para não ativar cobrança na chave Gemini, a geração tenta por padrão o endpoint público legado do Pollinations, configurável em `FREE_IMAGE_API_URL`. Se o serviço estiver sem cota, a receita continua disponível e o app mostra um aviso para tentar novamente pelo botão **Gerar imagem com IA**. O app não troca silenciosamente para os modelos de imagem pagos do Gemini. A documentação atual do Pollinations exige chave nos endpoints novos; por isso, esta integração gratuita deve ser tratada como melhor esforço, não como disponibilidade garantida. O Gemini 3.1 Flash Image não possui modalidade gratuita na tabela oficial de preços.

Referências oficiais:

- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/speech-to-text
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/rate-limits

## Dados e migração

Usuários, senhas com hash, sessões, receitas, ingredientes, temperos, etapas, planejamento, compras e cache da IA ficam no MongoDB. Ingredientes, temperos e etapas ficam dentro do documento da receita. IDs numéricos são alocados por contadores atômicos para preservar os contratos da interface. Imagens por URL continuam hospedadas no endereço informado; o banco armazena a referência.

A exclusão de uma receita remove o planejamento relacionado e desvincula os itens de compra em uma transação. As consultas e alterações da aplicação são restritas ao usuário autenticado. Sessões e cache possuem expiração.

A camada de armazenamento do módulo legado de conversas também foi convertida para MongoDB. As rotas genéricas legadas de chat, áudio e imagens em `server/replit_integrations` não são registradas pelo app; o fluxo ativo de IA está em `server/ai.ts` e `server/routes.ts`.

Esta alteração **não transfere registros de um PostgreSQL antigo**. Nenhuma conexão PostgreSQL estava configurada nesta cópia. Se houver dados em uma instalação anterior, faça backup e planeje uma importação separada antes de trocar o ambiente de produção. O SQL em `migrations/` é histórico e não deve ser executado no MongoDB.

## Verificação e produção

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd start
```

Os testes usam um MongoDB temporário com replica set e não acessam o Atlas. Na primeira execução, o utilitário de testes pode baixar o executável do MongoDB. Os testes de IA simulam as respostas dos provedores; não consomem cota nem avaliam a qualidade real dos modelos.

Para frontend separado, configure `FRONTEND_URL` no backend e `VITE_API_URL` no build do frontend. Configure os segredos no serviço de hospedagem. Não coloque chaves de IA nem credenciais do MongoDB em variáveis `VITE_*`.

Nada é publicado automaticamente pela execução dos comandos locais acima.

### Estado da verificação desta alteração

A verificação de TypeScript, o build e os testes locais de integração foram executados com sucesso. Em 28/10/2026, também foram validados o Atlas configurado, cadastro, sessão, geração real com Groq e gravação, consulta e exclusão de uma receita. A importação do TikTok `https://vt.tiktok.com/ZSgpqvmnQ/` foi testada com análise audiovisual Gemini e persistência das evidências. A conta e a receita temporárias foram removidas. Não foi fornecido um link de receita do Instagram para validação real; os formatos de URL foram cobertos por testes automatizados.

Na auditoria de dependências, a atualização de `proxy-addr` removeu o alerta crítico encontrado. Permanecem 32 avisos do npm (20 altos, 8 moderados e 4 baixos), incluindo dependências anteriores a esta migração. A aprovação dos testes funcionais não representa uma auditoria de segurança completa nem liberação para produção.
