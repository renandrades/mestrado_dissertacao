# Prediction of Cancer Driver Genes with Graph Neural Networks

Dissertação de Mestrado — Programa de Pós-Graduação em Computação (PPGC), Instituto de
Informática, Universidade Federal do Rio Grande do Sul (UFRGS), 2023.

**Autor:** Renan Soares de Andrades
**Orientadora:** Prof.ª Dr.ª Mariana Recamonde-Mendoza

## Sobre

Identificar genes causadores de câncer (*cancer driver genes*) entre milhares de mutações
somáticas é um dos grandes desafios da genômica do câncer. Este trabalho investiga o uso de
*Graph Neural Networks* (GNNs) para essa tarefa, integrando redes de interação
proteína-proteína (PPI) e dados multi-ômicos de 16 tipos de câncer do TCGA. São comparados
três algoritmos de GNN (GCN, GAT, GraphSAGE) e quatro algoritmos tradicionais de aprendizado
de máquina, além de estratégias de mitigação de desbalanceamento de classes e abordagens de
*ensemble* combinando múltiplas redes PPI.

## Estrutura do repositório

- [`data_collection/`](data_collection/) — coleta e preparação inicial das redes PPI,
  atributos (*features*) multi-ômicos e rótulos (genes *driver*/*passenger*)
- [`data_preprocessing/`](data_preprocessing/) — mapeamento de IDs, interseção entre redes e
  atributos, e extração de medidas de centralidade
- [`model_training/`](model_training/) — seleção de algoritmo, otimização de
  hiperparâmetros e avaliação dos modelos
- [`ensemble_approach/`](ensemble_approach/) — extração e combinação das predições dos
  modelos treinados nas diferentes redes PPI
- [`scripts_graficos/`](scripts_graficos/) — scripts de geração dos gráficos e figuras
  usados na dissertação
- [`dissertation/`](dissertation/) — arquivos-fonte LaTeX, PDF final e arquivo compactado da
  dissertação
- [`website/`](website/) — código-fonte do site acadêmico interativo (scrollytelling)

## Dissertação

- [PDF final](dissertation/pdf/dissertacao_Renan_Andrades.pdf)
- [Arquivos-fonte LaTeX](dissertation/latex/)
- [Arquivo compactado (.zip)](dissertation/archives/dissertation-latex.zip)

## Website

O projeto é apresentado de forma interativa (scrollytelling), em português e inglês, em:

**https://renandrades.github.io/mestrado_dissertacao/**

O código-fonte do site (Astro + D3.js) está em [`website/`](website/) e é publicado
automaticamente no GitHub Pages a cada push na branch `main` que altere essa pasta (veja
[`.github/workflows/pages.yml`](.github/workflows/pages.yml)).

## Reprodutibilidade

Os notebooks em `data_collection/`, `data_preprocessing/`, `model_training/` e
`ensemble_approach/` documentam, em ordem, o pipeline completo: coleta de dados públicas
(redes PPI via NDEx, dados TCGA), pré-processamento, treinamento/avaliação dos modelos e
construção dos modelos de *ensemble*. `scripts_graficos/` reproduz as figuras da
dissertação a partir dos resultados desses experimentos.

## Citação

Andrades, R. S. de. **Prediction of Cancer Driver Genes with Graph Neural Networks: A
Comparative Analysis and a Graph Convolutional Network-based Model.** Dissertação
(Mestrado em Ciência da Computação) — Programa de Pós-Graduação em Computação, UFRGS,
Porto Alegre, 2023.
