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
- [`website/`](website/) — site interativo (scrollytelling) que apresenta a dissertação

## Dissertação

- [PDF final](dissertation/pdf/dissertacao_Renan_Andrades.pdf)
- [Arquivos-fonte LaTeX](dissertation/latex/)
- [Arquivo compactado (.zip)](dissertation/archives/dissertation-latex.zip)

## Website

O projeto é apresentado de forma interativa (scrollytelling) em:

**https://renandrades.github.io/mestrado_dissertacao/**

A narrativa percorre o problema, a metodologia e os principais resultados, com gráficos que
acompanham o texto, e termina em um explorador onde é possível buscar qualquer um dos
19.602 genes e ver a probabilidade prevista por cada rede PPI e pelo *ensemble*. O site
abre em português e no tema claro; um botão no canto superior direito alterna para o tema
escuro (a escolha fica salva no navegador). Em telas verticais, como celulares, o gráfico
fica fixo no topo e o texto rola abaixo dele.

### Tecnologia

HTML, CSS e JavaScript puros: sem frameworks, sem bibliotecas externas e sem etapa de
build. Os gráficos são construídos diretamente no DOM/SVG e animados com transições CSS.

```
website/
├── index.html                      # estrutura e textos de todas as seções
├── style.css                       # tema claro/escuro (variáveis CSS), layout e responsividade
├── script.js                       # dados dos gráficos, renderização, animações e explorador
├── data/gene-predictions.json      # predições por gene usadas pelo explorador
├── assets/                         # logos do rodapé
└── dissertacao_Renan_Andrades.pdf
```

### Rodar localmente

Como o explorador carrega `data/gene-predictions.json` via `fetch`, o site precisa ser
servido por HTTP (abrir o `index.html` direto do disco não carrega os dados dos genes):

```bash
cd website
python3 -m http.server 8000
# abra http://localhost:8000
```

### Publicação

O site é publicado automaticamente no GitHub Pages a cada push na branch `main` que altere
a pasta `website/`: o workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
envia o conteúdo da pasta como está, sem build.

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
