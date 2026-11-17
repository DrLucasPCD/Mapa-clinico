# Fontes, atribuições e licenças

## Atlas

Vanatome Human Atlas 1.4.0 — https://github.com/vixotic/Vanatome . GLB e metadados distribuídos pelo projeto sob CC BY-SA 4.0. Arquivo obtido de https://atlas.vanatome.vixotic.in/models/z-anatomy-1.4.0-full-body.glb .

Derivado de **Z-Anatomy**, https://github.com/Z-Anatomy/Models . Créditos principais: Gauthier Kervyn (design, 3D e anatomia) e Marcin Zielinski (scripts Python). Fontes upstream incluem **BodyParts3D, © The Database Center for Life Science**. Histórico e créditos adicionais nos projetos originais. Licença: https://creativecommons.org/licenses/by-sa/4.0/ . Preserve também `public/models/LICENSE.md`.

GLB e metadados foram redistribuídos sem alteração do conteúdo. As mudanças visuais aplicadas em tempo de execução incluem seleção, cores de destaque, ocultação, clipping, afastamento, pulsação e movimento didático. Adaptações do material do atlas permanecem sob CC BY-SA 4.0; a licença MIT do código não relicencia os assets.

## Radiopaedia

Casos e imagens selecionados para ensino não comercial, consultados em 7 de setembro de 2026 UTC (6 de setembro em Recife):

1. **Frank Gaillard**, Hyperdense middle cerebral artery sign. Radiopaedia.org, rID 2604. https://doi.org/10.53347/rID-2604 . Imagens 606 (admissão) e 36 (seguimento).
2. **Jose Rodriguez Vazquez**, Boxer's fracture. Radiopaedia.org, rID 164685. https://doi.org/10.53347/rID-164685 . Imagem 61598981 (frontal).
3. **Luu Hanh**, Brain abscess with dual rim sign. Radiopaedia.org, rID 87566. https://doi.org/10.53347/rID-87566 . Imagem anotada 54573996 (FLAIR, detalhe do duplo halo).

Imagens de ultrassom selecionadas para o simulador didático, consultadas em 28 de outubro de 2026:

4. **Dennis Odhiambo Agolah**, Normal upper abdominal ultrasound. Radiopaedia.org, rID 148000. https://radiopaedia.org/cases/148000 . Imagens 58956756, 58956757, 58956759, 58956762, 58956763, 58956767 e 58957335.
5. **Andrew Dixon**, Cholelithiasis - acoustic shadowing. Radiopaedia.org, rID 27525. https://radiopaedia.org/cases/27525 . Imagens 5834137 e 5834145.
6. **David Carroll**, FAST exam - normal (ultrasonography). Radiopaedia.org, rID 64279. https://radiopaedia.org/cases/64279 . Imagens 43769767 e 43769759.

O simulador só alterna entre imagens documentadas do caso escolhido. A posição do transdutor é esquemática, sem dados espaciais para reconstruir vistas contínuas. O catálogo e os créditos por arquivo constam de `public/ultrasound/sources.json`.

O painel “Download Image” da própria fonte informa que o uso não requer pedido de permissão quando é não comercial, atribui o contribuinte e não reivindica copyright do material. As condições completas prevalecem: https://radiopaedia.org/licence e https://radiopaedia.org/terms . Regime de referência: CC BY-NC-SA 3.0 — https://creativecommons.org/licenses/by-nc-sa/3.0/ . Não se concede sublicença comercial. Sínteses em português dos casos são adaptações didáticas, preservadas sob as condições aplicáveis à fonte. As imagens não foram alteradas; brilho, contraste e zoom são transformações temporárias da interface. Não foram copiadas séries completas ou feito scraping periódico.

## RM de referência do joelho

**Hellerhoff**, _VKB-Riss MRT T1 PDW sag.jpg_, Wikimedia Commons. Imagem redistribuída sem alterações sob CC BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/ . Fonte: https://commons.wikimedia.org/wiki/File:VKB-Riss_MRT_T1_PDW_sag.jpg . Arquivo: `public/study/knee-mri-hellerhoff.jpg`. Exame distinto do caso Radiopaedia rID 54521, vinculado como leitura complementar.

## Voz

Trelis — **piper-pt-br-faber-medium**. https://huggingface.co/Trelis/piper-pt-br-faber-medium . Model card declara CC0 1.0, https://creativecommons.org/publicdomain/zero/1.0/ . Narrações foram geradas a partir de textos didáticos originais. O modelo ONNX é baixado diretamente da fonte somente quando o usuário ativa a voz local. As introduções em WAV estão em `public/audio`. As falas do Modo Plantão foram sintetizadas a partir da revisão `0ac9b61ff8e1d9c2a7eaf0e32602c16f6b491a02` do modelo e publicadas em MP3 em `public/audio/plantao`.

## Retratos do Modo Plantão

Os retratos fictícios em `public/study/patients/plantao-portraits.jpg` foram gerados com a ferramenta ImageGen. Os retratos e nomes apresentados durante a consulta representam personagens da simulação.

<details>
<summary>Prompt de geração</summary>

Create one polished lookbook sprite sheet for a Brazilian clinical education web app, in subtle editorial 3D portrait style. Exactly 6 square tiles in a clean 3-column by 2-row grid, landscape 3:2 image, each tile equal with absolutely no borders/gutters. Each contains a different fictional Brazilian person centered in a head and shoulders portrait, same crop and eye level, head fits in middle 64% of tile for circular crop. Top row from left: adult woman early 30s with dark shoulder-length hair and teal knit top; adult man early 30s with brown skin and dark curls in slate overshirt; older woman 65 with dark gray hair in mauve blouse. Bottom row from left: older man around 70 with brown skin and salt-and-pepper hair in denim blue shirt; guardian beside school-age child close together in a single centered portrait; gender-neutral adult wearing a muted teal crew-neck shirt. Calm, natural expressions, attentive gaze toward clinician, warm natural soft light with dimensional shading. Uniform pale pearly mint to pale lavender background. Everyday clothes. No medical hardware, no logos, no text, no labels, no props, no real person likeness, no visible brand. High quality facial anatomy and distinct readable silhouettes at thumbnail scale.

</details>

## Tradução do Treino Visual

O catálogo traduz novas legendas com **OPUS-MT**, Helsinki-NLP, Jörg Tiedemann e Santhosh Thottingal ([OPUS-MT, 2020](https://aclanthology.org/2020.eamt-1.61), [modelo inglês–português](https://huggingface.co/Helsinki-NLP/opus-mt-tc-big-en-pt)). A automação usa a [conversão ONNX quantizada por Douglasrambo](https://huggingface.co/Douglasrambo/opus-mt-tc-big-en-pt-onnx/tree/738ee4cce801ce7c519954e4b78d02d5057b6740). Ambos indicam licença [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). As traduções de legendas mantêm a atribuição e a licença do artigo de origem.

## Referências educacionais

OpenStax, _Anatomy and Physiology 2e_ — https://openstax.org/details/books/anatomy-and-physiology-2e . Fontes específicas são vinculadas nas fichas. NCBI Bookshelf/StatPearls: anatomia do ombro (NBK482410), glúteo médio (NBK557509), reto abdominal (NBK538328). Textos do aplicativo são sínteses, não reprodução integral desses capítulos.

PubMed/NCBI E-utilities — https://www.ncbi.nlm.nih.gov/home/develop/api/ . A indexação não significa licença das figuras de artigos. A descoberta automática mostra apenas metadados e links, mantendo o status “não revisada”.

## Atlas detalhados adicionais

Arquivos em `public/models/detailed`: distribuição de https://github.com/Nurkan1/Anatria-3D, com LICENSE e NOTICE preservados.

- Masculino (`*_male.glb`, `manifest.json`): Z-Anatomy / BodyParts3D, DBCLS, CC BY-SA 4.0 conforme a distribuição; atribuições de origem completas no NOTICE.
- Feminino (`*_female.glb`, `manifest_female.json`): NIH Human Reference Atlas / Visible Human Female, CC BY 4.0. Abrangência: tronco e pelve.
- Os arquivos não foram mesclados entre sexos/fontes. O aplicativo adapta coordenadas e interação em memória; as licenças dos ativos permanecem independentes da licença do código.
- Decodificadores Draco: distribuídos com Three.js; licença Apache 2.0 do Draco preservada na pasta de decodificadores.

### Modelos moleculares 3D

O Laboratório 3D usa coordenadas de conformações e ligações obtidas da API PUG REST do PubChem (NCBI), convertidas para JSON: [dopamina, CID 681](https://pubchem.ncbi.nlm.nih.gov/compound/681), [serotonina, CID 5202](https://pubchem.ncbi.nlm.nih.gov/compound/5202) e [noradrenalina, CID 439260](https://pubchem.ncbi.nlm.nih.gov/compound/439260). As cenas renderizam essas coordenadas localmente.

## Inferência local da conversa e da voz

- Qwen Team, **Qwen3-4B**, Apache 2.0. Pesos quantizados MLC em https://huggingface.co/mlc-ai/Qwen3-4B-q4f16_1-MLC (revisão `a5c9fab855e3ccbdfed2e7e69683d75f30332161`) e https://huggingface.co/mlc-ai/Qwen3-4B-q4f32_1-MLC (revisão `b7e4eb1ba80728187fb5df44055cc1a7c32310e0`). Os pesos são baixados diretamente da fonte, fora do repositório. O modelo original e sua licença estão em https://huggingface.co/Qwen/Qwen3-4B .
- MLC AI, **WebLLM 0.2.89**, Apache 2.0, https://github.com/mlc-ai/web-llm .
- Microsoft, **ONNX Runtime Web 1.18.0**, MIT, https://github.com/microsoft/onnxruntime .
- Diffusion Studio, **piper-wasm 1.0.0**, wrapper declarado MIT, https://github.com/diffusion-studio/piper-wasm . O pacote inclui o fonemizador Piper e dados e código do **eSpeak NG**, GPLv3 ou posterior, https://github.com/rhasspy/espeak-ng . Os componentes compilados mantêm suas licenças próprias. Fontes e receita de compilação estão no repositório do pacote e nos upstreams https://github.com/wide-video/piper-phonemize e https://github.com/wide-video/piper-wasm .

A voz Faber continua sendo a revisão Trelis identificada acima. A adaptação da inferência local no app usa tensores Piper e geração de WAV no worker; não há serviço pago de TTS.
