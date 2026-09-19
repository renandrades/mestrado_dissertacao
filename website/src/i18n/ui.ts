export const languages = {
  pt: 'Português',
  en: 'English',
} as const;

export type Lang = keyof typeof languages;

export const defaultLang: Lang = 'pt';

export const ui = {
  pt: {
    'site.title': 'Genes causadores de câncer & Graph Neural Networks',
    'site.tagline': 'Uma dissertação de mestrado, em forma de scrollytelling',
    'nav.pdf': 'Dissertação completa (PDF)',
    'nav.lang': 'EN',
    'chart.source': 'Fonte: dissertação',

    'chart.class-imbalance.title': 'Distribuição de rótulos por rede PPI',
    'chart.class-imbalance.driver': 'Driver',
    'chart.class-imbalance.passenger': 'Passenger',
    'chart.class-imbalance.unlabeled': 'Não rotulado',
    'chart.class-imbalance.yaxis': 'Número de genes',

    'chart.ppi-network.title': 'Rede de interação proteína-proteína (ilustrativa)',
    'chart.ppi-network.driver': 'Driver',
    'chart.ppi-network.passenger': 'Passenger',
    'chart.ppi-network.unlabeled': 'Não rotulado',
    'chart.ppi-network.driver-aria': 'gene driver',
    'chart.ppi-network.passenger-aria': 'gene passenger',
    'chart.ppi-network.unlabeled-aria': 'gene não rotulado',

    'chart.methodology-pipeline.title': 'Metodologia do projeto',
    'chart.methodology-pipeline.data-collection': 'Coleta de dados',
    'chart.methodology-pipeline.preprocessing': 'Pré-processamento dos dados',
    'chart.methodology-pipeline.training': 'Treinamento do modelo',
    'chart.methodology-pipeline.ensemble': 'Abordagem em ensemble',
    'chart.methodology-pipeline.ppi-network': 'Rede de interação proteína-proteína (PPI)',
    'chart.methodology-pipeline.omics-features': 'Atributos multi-ômicos',
    'chart.methodology-pipeline.labeled-examples': 'Exemplos positivos e negativos',
    'chart.methodology-pipeline.id-mapping': 'Mapeamento de IDs',
    'chart.methodology-pipeline.network-feature-intersection': 'Interseção entre redes e atributos',
    'chart.methodology-pipeline.centrality-computation': 'Cálculo de centralidades',
    'chart.methodology-pipeline.algorithm-selection': 'Seleção do algoritmo',
    'chart.methodology-pipeline.imbalance-handling': 'Tratamento do desbalanceamento de classes',
    'chart.methodology-pipeline.hyperparameter-optimization': 'Otimização de hiperparâmetros',
    'chart.methodology-pipeline.evaluation': 'Avaliação',

    'chart.centrality-lift.title': 'Ganho de desempenho com medidas de centralidade',
    'chart.centrality-lift.gat': 'GAT',
    'chart.centrality-lift.gcn': 'GCN',
    'chart.centrality-lift.graphsage': 'GraphSAGE',
    'chart.centrality-lift.before': 'Multi-ômicos',
    'chart.centrality-lift.after': 'Multi-ômicos + centralidades',
    'chart.centrality-lift.yaxis': 'AUC-PR',
    'chart.centrality-lift.aria-template':
      '{facet}, {group}: {before} multi-ômicos, {after} multi-ômicos + centralidades',

    'chart.imbalance-strategies.title': 'Estratégias para o desbalanceamento de classes',
    'chart.imbalance-strategies.gat': 'GAT',
    'chart.imbalance-strategies.gcn': 'GCN',
    'chart.imbalance-strategies.graphsage': 'GraphSAGE',
    'chart.imbalance-strategies.yaxis': 'AUC-PR',

    'chart.gnn-vs-traditional.title': 'GNNs vs. aprendizado de máquina tradicional',
    'chart.gnn-vs-traditional.gat': 'GAT',
    'chart.gnn-vs-traditional.gcn': 'GCN',
    'chart.gnn-vs-traditional.graphsage': 'GraphSAGE',
    'chart.gnn-vs-traditional.gbt': 'Gradient Boosting Trees',
    'chart.gnn-vs-traditional.yaxis': 'AUC-PR',

    'chart.refined-model.title': 'Desempenho do GCN ajustado, por rede PPI',
    'chart.refined-model.gcn': 'GCN (ajustado)',
    'chart.refined-model.yaxis': 'AUC-PR',

    'chart.ensemble-comparison.title': 'Redes individuais vs. ensemble',
    'chart.ensemble-comparison.individual': 'Redes individuais',
    'chart.ensemble-comparison.ensemble': 'Ensemble-Average',
    'chart.ensemble-comparison.yaxis': 'AUC-PR',
  },
  en: {
    'site.title': 'Cancer Driver Genes & Graph Neural Networks',
    'site.tagline': "A master's dissertation, told as scrollytelling",
    'nav.pdf': 'Full dissertation (PDF)',
    'nav.lang': 'PT',
    'chart.source': 'Source: dissertation',

    'chart.class-imbalance.title': 'Label distribution per PPI network',
    'chart.class-imbalance.driver': 'Driver',
    'chart.class-imbalance.passenger': 'Passenger',
    'chart.class-imbalance.unlabeled': 'Unlabeled',
    'chart.class-imbalance.yaxis': 'Number of genes',

    'chart.ppi-network.title': 'Protein-protein interaction network (illustrative)',
    'chart.ppi-network.driver': 'Driver',
    'chart.ppi-network.passenger': 'Passenger',
    'chart.ppi-network.unlabeled': 'Unlabeled',
    'chart.ppi-network.driver-aria': 'driver gene',
    'chart.ppi-network.passenger-aria': 'passenger gene',
    'chart.ppi-network.unlabeled-aria': 'unlabeled gene',

    'chart.methodology-pipeline.title': 'Project methodology',
    'chart.methodology-pipeline.data-collection': 'Data collection',
    'chart.methodology-pipeline.preprocessing': 'Data pre-processing',
    'chart.methodology-pipeline.training': 'Model training',
    'chart.methodology-pipeline.ensemble': 'Ensemble approach',
    'chart.methodology-pipeline.ppi-network': 'PPI network',
    'chart.methodology-pipeline.omics-features': 'Multi-omics features',
    'chart.methodology-pipeline.labeled-examples': 'Positive and negative examples',
    'chart.methodology-pipeline.id-mapping': 'ID mapping',
    'chart.methodology-pipeline.network-feature-intersection': 'Networks and features intersection',
    'chart.methodology-pipeline.centrality-computation': 'Computing centralities',
    'chart.methodology-pipeline.algorithm-selection': 'Selecting algorithm',
    'chart.methodology-pipeline.imbalance-handling': 'Treating class imbalance',
    'chart.methodology-pipeline.hyperparameter-optimization': 'Hyperparameter optimization',
    'chart.methodology-pipeline.evaluation': 'Evaluation',

    'chart.centrality-lift.title': 'Performance lift from centrality measures',
    'chart.centrality-lift.gat': 'GAT',
    'chart.centrality-lift.gcn': 'GCN',
    'chart.centrality-lift.graphsage': 'GraphSAGE',
    'chart.centrality-lift.before': 'Multi-omics',
    'chart.centrality-lift.after': 'Multi-omics + centralities',
    'chart.centrality-lift.yaxis': 'AUC-PR',
    'chart.centrality-lift.aria-template':
      '{facet}, {group}: {before} multi-omics, {after} multi-omics + centralities',

    'chart.imbalance-strategies.title': 'Class imbalance strategies',
    'chart.imbalance-strategies.gat': 'GAT',
    'chart.imbalance-strategies.gcn': 'GCN',
    'chart.imbalance-strategies.graphsage': 'GraphSAGE',
    'chart.imbalance-strategies.yaxis': 'AUC-PR',

    'chart.gnn-vs-traditional.title': 'GNNs vs. traditional machine learning',
    'chart.gnn-vs-traditional.gat': 'GAT',
    'chart.gnn-vs-traditional.gcn': 'GCN',
    'chart.gnn-vs-traditional.graphsage': 'GraphSAGE',
    'chart.gnn-vs-traditional.gbt': 'Gradient Boosting Trees',
    'chart.gnn-vs-traditional.yaxis': 'AUC-PR',

    'chart.refined-model.title': 'Tuned GCN performance, per PPI network',
    'chart.refined-model.gcn': 'GCN (tuned)',
    'chart.refined-model.yaxis': 'AUC-PR',

    'chart.ensemble-comparison.title': 'Individual networks vs. ensemble',
    'chart.ensemble-comparison.individual': 'Individual networks',
    'chart.ensemble-comparison.ensemble': 'Ensemble-Average',
    'chart.ensemble-comparison.yaxis': 'AUC-PR',
  },
} as const;

export type UiKey = keyof (typeof ui)['pt'];
