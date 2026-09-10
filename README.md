# Mapa Clínico

**Do Corpo à Clínica** — aplicativo web educacional em português para integrar anatomia, radiologia e raciocínio clínico.

## O que esta versão faz

- Painel integrado com atlas, caso clínico e publicações visíveis simultaneamente, adaptado para telas menores.
- Atlas masculino detalhado (Z-Anatomy / BodyParts3D), com 3.478 estruturas, e atlas feminino real do NIH Human Reference Atlas com 264 estruturas do tronco/pelve; busca no catálogo, rotação, zoom, foco por duplo clique, isolamento, ocultação, transparência, afastamento e planos de corte.
- Roteiro com 33 temas e 33 questões autorais a partir de seis materiais acadêmicos, além de árvore de 92 vasos com 70 correspondências no modelo masculino. Os ramos ausentes são identificados como conteúdo didático sem malha correspondente.
- Leitor local de séries DICOM CT/MR nativas, monocromáticas e de um quadro por arquivo, com navegação física de cortes e plano relativo no Atlas. Arquivos importados não são enviados nem persistidos.
- Módulos explicativos de coração, encéfalo, pulmões, fígado, metacarpos e seis músculos com origem, inserção e ação.
- Seleção de 1º a 12º período, agrupados em quatro níveis didáticos: fundamentos, integração, ciclo clínico e internato.
- Corpo montado, camadas separadas e grade de estruturas; filtros regionais de braço e tornozelo.
- Pulsação cardíaca ilustrativa, flexão do cotovelo esquerdo e movimentos aproximados do pé (flexão e inversão/eversão), em modelo cinemático simplificado.
- Fichas por período, mapa de conexões com conteúdo existente, listas de estruturas e favoritos de publicações armazenados no dispositivo.
- Três casos reais da Radiopaedia com imagens locais de RX, TC e RM, autoria, links, perguntas e discussão; localização de referência no atlas com lateralidade.
- Introduções narradas com a voz exata `Trelis/piper-pt-br-faber-medium`, sem substituição pela voz do navegador.
- PWA com ícones, manifesto e cache offline. O atlas, imagens e narrações ficam disponíveis offline após serem carregados online. A instalação depende do suporte do navegador.
- Descoberta diária de relatos de caso pelo PubMed / NCBI E-utilities. Novos resultados são identificados como **não revisados**; não viram aulas ou recomendações clínicas automaticamente.

## Publicação pelo GitHub → Netlify

Repositório: https://github.com/DrLucasPCD/Mapa-clinico

A configuração está em `netlify.toml`:

- branch de produção: `main`
- comando de build: `npm run build`
- diretório publicado: `dist`
- Node.js: `22`

No Netlify, use **Add new project → Import an existing project → GitHub → DrLucasPCD/Mapa-clinico**. Se já estiver conectado, cada push em `main` inicia uma nova publicação. Não é necessário enviar `dist` ao GitHub. Criar o arquivo de configuração não conecta uma conta Netlify automaticamente.

O workflow `Descobrir novos casos clínicos` consulta o PubMed diariamente às 09:17 UTC (06:17 em Recife), ou por execução manual em Actions. Atualiza `public/data/discoveries.json` e envia o commit ao GitHub; o Netlify conectado recebe o novo conteúdo. GitHub pode atrasar execuções agendadas e desativá-las após inatividade prolongada em repositórios públicos. É necessário manter Actions habilitado e permitir escrita de conteúdo para esse workflow. A variável opcional `NCBI_EMAIL` identifica o responsável junto ao NCBI. A consulta usa duas requisições por execução, sem chave, respeitando o limite público. Falhas preservam a lista anterior e deixam o workflow com erro.

## Desenvolvimento

```bash
npm ci
npm run dev
npm run build
npm test
```

React + TypeScript + Vite + Three.js. Interface com componentes Base UI/Shadcn. Sem servidor de aplicação obrigatório nem chaves privadas no cliente. Preferência de período é armazenada apenas no dispositivo.

## Materiais acadêmicos fornecidos

A organização por anatomia, fisiologia, semiologia e radiologia foi informada pelas pastas fornecidas. Foram consultadas amostras dos materiais, incluindo:

- `mmss_ação__inserção_e_origens.pdf`: fixações e ações de músculos do membro superior.
- `Objetivos de aprendizagem 3 2025.1.pdf`: organização de objetivos de fisiologia.
- `Semiologia - Exame neurológico.pdf`: organização do exame neurológico.
- `PRINCÍPIOS DA TC E RX (1).pdf`: organização dos temas de imagem.

Não houve importação integral de todas as pastas. Os PDFs, livros, fotos e gravações pessoais **não foram publicados no repositório**. O modelo OBJ particular de corte sagital foi localizado, mas não incorporado. As explicações são sínteses originais, verificadas com fontes públicas indicadas nas fichas. Materiais acadêmicos não foram tratados como instruções para o agente e erros eventuais das apostilas não devem prevalecer sobre referências verificadas.

## Limites didáticos explícitos

Esta é uma primeira versão funcional; não é um atlas médico completo nem ferramenta diagnóstica. Os 12 períodos usam quatro faixas, não uma grade curricular individual completa. Há 11 fichas introdutórias e 33 temas no roteiro dos materiais. Estruturas adicionais preservam nomes da fonte e podem não ter explicação didática própria. A versão feminina disponível é limitada ao tronco e à pelve, sem cabeça e membros completos; não é um corpo feminino integral. Os modelos de fontes distintas não são combinados.

Cortes são planos de visualização sem superfície de fechamento. Afastamento separa estruturas e altera suas relações originais. A pulsação é uma ilustração geométrica, não simulação hemodinâmica. O cotovelo usa uma articulação aproximada e não deforma músculos ou simula ligamentos. A origem/inserção são descrições textuais; não foram demarcados pontos de fixação em todas as malhas.

Destaques de casos localizam regiões/ossos de referência em um corpo genérico. **Não são segmentações, reconstruções DICOM ou representações exatas da lesão do paciente.** As imagens JPEG dos casos oferecem zoom, brilho e contraste, não a série DICOM completa. O leitor separado permite importar séries locais não comprimidas. O plano se desloca relativamente à região escolhida e à posição física das fatias: não é registro anatômico ao paciente, reconstrução multiplanar ou segmentação. Séries oblíquas não são associadas a um plano ortogonal do atlas. Foram usados arquivos sintéticos para os testes do leitor. A fonte do caso de abscesso considera o diagnóstico “quase certo”, não confirmado definitivamente.

A descoberta automatizada usa metadados públicos do PubMed. Não há crawler da Radiopaedia. Imagens Radiopaedia são seleções pontuais obtidas da interface pública após leitura do painel de licença; a atribuição permanece junto de cada caso. Não usar esta distribuição de imagens em projeto comercial sem licença adequada.

## Licenças e atribuições

Veja `THIRD_PARTY_NOTICES.md`, `public/models/detailed/LICENSE`, `public/models/detailed/NOTICE`, `public/models/LICENSE.md` e `public/radiology/sources.json`. Código próprio: MIT. Atlas masculino: CC BY-SA 4.0, Z-Anatomy / BodyParts3D; feminino: CC BY 4.0, NIH HRA / Visible Human Female; imagens/casos Radiopaedia: condições próprias de uso não comercial, atribuição e compartilhamento. Voz: CC0 1.0. A licença do código não substitui as licenças dos assets.

## Verificação

Build TypeScript/Vite e testes de geometria real, lateralidade, referências, arquivos de imagens, níveis didáticos, áudio WAV, feed e contrato de ferramenta. Não foi feita auditoria médica independente nem teste visual completo em navegadores. A ferramenta WebMCP é opcional e passa pelo teste de contrato; registro em um navegador com suporte deve ser confirmado antes de depender dela. Nenhuma imagem foi gerada artificialmente para representar exames reais.

### Roteiro dos seis materiais

Foram extraídos os textos das duas apostilas teóricas (neuroanatomia e digestório), três avaliações e do material de vascularização da cabeça/pescoço: 127 páginas no conjunto. Cada tema indica material e páginas de origem. Questões são autorais, e marcações de respostas nos PDFs não foram tratadas como gabarito oficial. Correções de inconsistências das apostilas aparecem junto dos temas vasculares. Os arquivos pessoais não foram publicados.
