/* ==========================================================================
   Dissertation scrollytelling site — vanilla JS.

   No frameworks, no build step, no external libraries. Charts are built as
   plain DOM (label/track/value bar rows) or hand-authored SVG, animated with
   CSS transitions triggered by IntersectionObserver. Every scroll-triggered
   animation fires once — re-scrolling past a section never replays it. The
   one deliberate exception is the network graph's ambient float, which is a
   continuous requestAnimationFrame loop, not a scroll-triggered reveal.
   ========================================================================== */
(function () {
  'use strict';

  var REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================================
     REAL DATA — every number below comes from the dissertation (see the
     Astro rebuild's src/charts/*.config.ts for original sourcing/citations).
     Network codes are the single standardized form used everywhere on this
     page (charts + gene explorer alike): HPRD, MULTINET, IREF, CPDB, PCNET,
     STRING, UNION.
     ======================================================================== */

  var NETWORKS_6 = ['HPRD', 'MULTINET', 'IREF', 'CPDB', 'PCNET', 'STRING'];

  var CLASS_IMBALANCE = {
    networks: NETWORKS_6.concat(['UNION']),
    counts: {
      HPRD: { driver: 793, passenger: 4873, unlabeled: 3772 },
      MULTINET: { driver: 868, passenger: 8486, unlabeled: 4633 },
      IREF: { driver: 874, passenger: 8838, unlabeled: 4915 },
      CPDB: { driver: 889, passenger: 10043, unlabeled: 5311 },
      PCNET: { driver: 907, passenger: 12454, unlabeled: 5755 },
      STRING: { driver: 865, passenger: 11473, unlabeled: 5534 },
      UNION: { driver: 907, passenger: 12918, unlabeled: 5777 },
    },
  };

  var CENTRALITY_LIFT = {
    facets: ['HPRD', 'MULTINET', 'IREF'],
    groups: ['gat', 'gcn', 'graphsage'],
    // facet -> group -> [before (multi-omics only), after (+ centralities)]
    values: {
      HPRD: { gat: [0.3258, 0.3992], gcn: [0.4984, 0.596], graphsage: [0.3317, 0.3786] },
      MULTINET: { gat: [0.2182, 0.3648], gcn: [0.3839, 0.4019], graphsage: [0.2671, 0.3174] },
      IREF: { gat: [0.2144, 0.3598], gcn: [0.4315, 0.4274], graphsage: [0.2001, 0.2427] },
    },
  };

  var IMBALANCE_STRATEGIES = {
    facets: ['HPRD', 'MULTINET', 'IREF'],
    groups: ['gat', 'gcn', 'graphsage'],
    categories: ['Cross-entropy', 'Undersampling', 'Balanced CE', 'Focal loss (γ=0.5)', 'Focal loss (γ=1)', 'Focal loss (γ=2)'],
    // facet -> [ [gat, gcn, graphsage], ... one row per category, in order ]
    values: {
      HPRD: [
        [0.3992, 0.596, 0.3786],
        [0.3275, 0.5479, 0.3332],
        [0.4215, 0.5918, 0.4069],
        [0.3873, 0.5235, 0.423],
        [0.3581, 0.5756, 0.3985],
        [0.3792, 0.5583, 0.448],
      ],
      MULTINET: [
        [0.3648, 0.4019, 0.3174],
        [0.2817, 0.4521, 0.2188],
        [0.3551, 0.4661, 0.3929],
        [0.4143, 0.4177, 0.3264],
        [0.3363, 0.2978, 0.3196],
        [0.2753, 0.4481, 0.3822],
      ],
      IREF: [
        [0.3598, 0.4274, 0.2427],
        [0.1714, 0.4384, 0.1887],
        [0.3135, 0.4841, 0.3013],
        [0.3546, 0.4664, 0.2296],
        [0.2977, 0.3776, 0.2832],
        [0.3917, 0.4488, 0.2928],
      ],
    },
  };

  var GNN_VS_TRADITIONAL = {
    categories: ['HPRD', 'MULTINET', 'IREF'],
    groups: ['gat', 'gcn', 'graphsage', 'gbt'],
    values: {
      HPRD: [0.3992, 0.596, 0.3786, 0.5437],
      MULTINET: [0.3648, 0.4019, 0.3174, 0.4505],
      IREF: [0.3598, 0.4274, 0.2427, 0.423],
    },
  };

  var NETWORK_PERFORMANCE = {
    categories: ['HPRD', 'MULTINET', 'IREF', 'CPDB', 'PCNET', 'STRING', 'UNION', 'Ensemble-Average'],
    values: {
      HPRD: 0.5768, MULTINET: 0.5947, IREF: 0.5663, CPDB: 0.5646, PCNET: 0.5925, STRING: 0.6358,
      UNION: 0.5579, 'Ensemble-Average': 0.677,
    },
    revealCategories: ['UNION', 'Ensemble-Average'],
    // Visual ceiling (100% bar width) — deliberately NOT 1.0: 0.75 reads as
    // "state of the art" reference point. The printed numbers next to each
    // bar are always the real AUC-PR values; only the fill width is rescaled.
    visualCeiling: 0.75,
  };

  var METHODOLOGY_STAGES = [
    { title: 'Coleta de dados', substeps: ['Rede de interação proteína-proteína (PPI)', 'Atributos multi-ômicos', 'Exemplos positivos e negativos'] },
    { title: 'Pré-processamento dos dados', substeps: ['Mapeamento de IDs', 'Interseção entre redes e atributos', 'Cálculo de centralidades'] },
    { title: 'Treinamento do modelo', substeps: ['Seleção do algoritmo', 'Tratamento do desbalanceamento de classes', 'Otimização de hiperparâmetros', 'Avaliação'] },
    { title: 'Abordagem em ensemble', substeps: [] },
  ];

  // Illustrative toy PPI graph (hand-laid-out seed positions, not real
  // interaction data) — relaxed into a better spread by relaxNetworkLayout()
  // at render time, then kept gently floating in place continuously.
  var NETWORK_GRAPH = {
    nodes: [
      { id: 'TP53', group: 'driver', x: 260, y: 170 },
      { id: 'BRCA1', group: 'driver', x: 140, y: 300 },
      { id: 'KRAS', group: 'driver', x: 360, y: 90 },
      { id: 'MYH9', group: 'passenger', x: 340, y: 230 },
      { id: 'ACTB', group: 'passenger', x: 440, y: 280 },
      { id: 'GAPDH', group: 'passenger', x: 510, y: 360 },
      { id: 'TUBB5', group: 'passenger', x: 480, y: 170 },
      { id: 'HSPA8', group: 'passenger', x: 160, y: 100 },
      { id: 'RPL11', group: 'passenger', x: 90, y: 380 },
      { id: 'EEF2', group: 'passenger', x: 190, y: 440 },
      { id: 'VCL', group: 'passenger', x: 380, y: 380 },
      { id: 'FLNA', group: 'passenger', x: 460, y: 440 },
      { id: 'CALM2', group: 'passenger', x: 250, y: 320 },
      { id: 'HNRNPA1', group: 'passenger', x: 570, y: 280 },
      { id: 'ZNF521', group: 'unlabeled', x: 110, y: 190 },
      { id: 'ORF15', group: 'unlabeled', x: 60, y: 250 },
      { id: 'KIAA1109', group: 'unlabeled', x: 560, y: 130 },
      { id: 'C11orf80', group: 'unlabeled', x: 300, y: 430 },
    ],
    links: [
      ['TP53', 'BRCA1'], ['TP53', 'KRAS'], ['TP53', 'MYH9'], ['TP53', 'HSPA8'], ['TP53', 'CALM2'], ['TP53', 'ZNF521'],
      ['BRCA1', 'RPL11'], ['BRCA1', 'EEF2'], ['BRCA1', 'ORF15'],
      ['KRAS', 'VCL'], ['KRAS', 'FLNA'],
      ['ACTB', 'MYH9'], ['ACTB', 'VCL'], ['ACTB', 'FLNA'], ['ACTB', 'GAPDH'], ['ACTB', 'TUBB5'],
      ['GAPDH', 'HNRNPA1'], ['TUBB5', 'KIAA1109'], ['HSPA8', 'HNRNPA1'], ['CALM2', 'C11orf80'],
      ['VCL', 'FLNA'], ['RPL11', 'EEF2'],
    ],
  };

  var GROUP_LABEL = { gat: 'GAT', gcn: 'GCN', graphsage: 'GraphSAGE', gbt: 'GBT', individual: 'Redes individuais', ensemble: 'Ensemble-Average' };
  var GROUP_TEXT_PT = { driver: 'Driver', passenger: 'Passenger', unlabeled: 'Não rotulado' };
  var RADIUS = { driver: 11, passenger: 6, unlabeled: 6 };
  var HIT_RADIUS = { driver: 17, passenger: 14, unlabeled: 14 };

  /* ========================================================================
     FORMATTING
     ======================================================================== */

  function fmtAuc(v) { return v.toFixed(3).replace('.', ','); }
  function fmtInt(v) { return Math.round(v).toLocaleString('pt-BR'); }
  function fmtPercent(v) { return (v * 100).toFixed(1).replace('.', ',') + '%'; }

  /* ========================================================================
     SMALL DOM HELPERS
     ======================================================================== */

  function el(tag, className, attrs) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]);
      }
    }
    return node;
  }

  /* ========================================================================
     TOOLTIP — one shared floating element, reused by every chart (bar rows,
     dumbbells, network-graph nodes). show()/move() take the raw pointer
     event so the tooltip always tracks the cursor; hide() fades it out.
     ======================================================================== */

  var Tooltip = (function () {
    var node = null;

    function ensure() {
      if (!node) {
        node = document.createElement('div');
        node.className = 'viz-tooltip';
        var value = document.createElement('div');
        value.className = 'tooltip-value';
        var label = document.createElement('div');
        label.className = 'tooltip-label';
        node.appendChild(value);
        node.appendChild(label);
        document.body.appendChild(node);
      }
      return node;
    }

    function move(event) {
      var t = ensure();
      var pad = 16;
      var x = event.clientX + pad;
      var y = event.clientY + pad;
      var maxX = window.innerWidth - 236;
      var maxY = window.innerHeight - 64;
      if (x > maxX) x = event.clientX - pad - 220;
      if (y > maxY) y = event.clientY - pad - 48;
      t.style.left = Math.max(8, x) + 'px';
      t.style.top = Math.max(8, y) + 'px';
    }

    function show(event, valueText, labelText) {
      var t = ensure();
      t.querySelector('.tooltip-value').textContent = valueText;
      t.querySelector('.tooltip-label').textContent = labelText;
      t.classList.add('is-visible');
      move(event);
    }

    function hide() { if (node) node.classList.remove('is-visible'); }

    /** Wires the standard pointerenter/pointermove/pointerleave trio onto
     * `target`, showing `valueText`/`labelText` (or functions returning
     * them, for rows whose values can change later). */
    function wire(target, valueText, labelText) {
      target.addEventListener('pointerenter', function (e) {
        show(e, typeof valueText === 'function' ? valueText() : valueText, typeof labelText === 'function' ? labelText() : labelText);
      });
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerleave', hide);
    }

    return { show: show, move: move, hide: hide, wire: wire };
  })();

  /** One "label — track — value" bar row. Returns the row element plus a
   * grow() closure that transitions the fill to its real target width — the
   * row is always born at 0% width so callers control exactly when the
   * "grow from zero" animation plays (see the golden rule: only once).
   * `opts.label` may be omitted/null to render no label column at all (the
   * row is then identified purely by the chart's color legend); the hover
   * tooltip still shows `opts.tooltipLabel` (falls back to `opts.label`). */
  function makeBarRow(opts) {
    var row = el('div', 'bar-row');

    if (opts.label != null) {
      var label = el('div', 'bar-row-label');
      if (opts.labelWidth) label.style.flexBasis = opts.labelWidth + 'px';
      if (opts.swatchColor) {
        var sw = el('span', 'swatch');
        sw.style.setProperty('--c', opts.swatchColor);
        label.appendChild(sw);
      }
      label.appendChild(document.createTextNode(opts.label));
      row.appendChild(label);
    }

    var track = el('div', 'bar-row-track');
    var fill = el('div', 'bar-row-fill' + (opts.muted ? ' muted' : ''));
    if (!opts.muted && opts.color) fill.style.background = opts.color;
    track.appendChild(fill);
    row.appendChild(track);

    var value = el('div', 'bar-row-value');
    value.textContent = opts.valueText;
    row.appendChild(value);

    Tooltip.wire(track, opts.valueText, opts.tooltipLabel || opts.label || '');

    var targetPct = Math.max(0, Math.min(100, opts.pct));
    return {
      row: row,
      grow: function () {
        // Force one frame at width:0 to actually paint before transitioning,
        // otherwise a same-frame width change never renders as an animation.
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            fill.style.width = targetPct + '%';
          });
        });
      },
      reset: function () { fill.style.width = '0%'; },
    };
  }

  /** Runs `callback` exactly once, the first time `target` intersects the
   * viewport past `threshold` — then stops observing. This is THE mechanism
   * behind "animations happen once, scrolling back up never replays them". */
  function revealOnce(target, callback, options) {
    var opts = options || {};
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: opts.threshold || 0.3, rootMargin: opts.rootMargin || '0px' });
    observer.observe(target);
  }

  /* ========================================================================
     CHART: class-imbalance — VERTICAL stacked bars, one column per PPI
     network. The y-axis scales exactly to the tallest real total (no
     rounded/padded ceiling) — the tallest bar always touches the top.
     ======================================================================== */

  function renderClassImbalance() {
    var container = document.getElementById('chart-class-imbalance');
    var networks = CLASS_IMBALANCE.networks;
    var TRACK_PX = 260; // matches .vbar-plot's CSS height exactly
    // Fixed round-number scale (0-20,000) rather than the raw data max —
    // gives clean 5,000/10,000/15,000/20,000 gridlines instead of odd
    // fractional tick values.
    var yMax = 20000;

    var plot = el('div', 'vbar-plot');
    var gridWrap = el('div', 'vbar-gridlines');
    [5000, 10000, 15000, 20000].forEach(function (tickValue) {
      var frac = tickValue / yMax;
      var line = el('div', 'vbar-gridline');
      line.style.bottom = frac * 100 + '%';
      gridWrap.appendChild(line);
      var label = el('span', 'vbar-gridline-label');
      label.style.bottom = frac * 100 + '%';
      label.textContent = fmtInt(tickValue);
      gridWrap.appendChild(label);
    });
    plot.appendChild(gridWrap);

    var barsWrap = el('div', 'vbar-bars');
    var labelsWrap = el('div', 'vbar-labels');
    var segmentsData = [];

    networks.forEach(function (n) {
      var c = CLASS_IMBALANCE.counts[n];
      var group = el('div', 'vbar-group');
      var track = el('div', 'vbar-track');

      // DOM order [driver, passenger, unlabeled] + .vbar-track's CSS
      // (column flex, justify-content:flex-end) puts driver on top and
      // unlabeled at the very bottom, touching the baseline.
      var segDriver = el('div', 'vbar-segment');
      segDriver.style.background = 'var(--series-driver)';
      var segPassenger = el('div', 'vbar-segment');
      segPassenger.style.background = 'var(--series-passenger)';
      var segUnlabeled = el('div', 'vbar-segment');
      segUnlabeled.style.background = 'var(--series-unlabeled)';

      // Absolute count PLUS the share of that network's own total — the
      // percentage is what actually makes the imbalance legible at a glance.
      var networkTotal = c.driver + c.passenger + c.unlabeled;
      Tooltip.wire(segDriver, function () { return fmtInt(c.driver) + ' (' + fmtPercent(c.driver / networkTotal) + ')'; }, n + ' · Driver');
      Tooltip.wire(segPassenger, function () { return fmtInt(c.passenger) + ' (' + fmtPercent(c.passenger / networkTotal) + ')'; }, n + ' · Passenger');
      Tooltip.wire(segUnlabeled, function () { return fmtInt(c.unlabeled) + ' (' + fmtPercent(c.unlabeled / networkTotal) + ')'; }, n + ' · Não rotulado');

      track.appendChild(segDriver);
      track.appendChild(segPassenger);
      track.appendChild(segUnlabeled);
      group.appendChild(track);
      barsWrap.appendChild(group);

      var labelEl = el('div', 'vbar-label');
      labelEl.textContent = n;
      labelsWrap.appendChild(labelEl);

      segmentsData.push({
        driverEl: segDriver, driverPx: (c.driver / yMax) * TRACK_PX,
        passengerEl: segPassenger, passengerPx: (c.passenger / yMax) * TRACK_PX,
        unlabeledEl: segUnlabeled, unlabeledPx: (c.unlabeled / yMax) * TRACK_PX,
      });
    });

    plot.appendChild(barsWrap);
    container.appendChild(plot);
    container.appendChild(labelsWrap);

    return function grow() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          segmentsData.forEach(function (s) {
            s.driverEl.style.height = s.driverPx + 'px';
            s.passengerEl.style.height = s.passengerPx + 'px';
            s.unlabeledEl.style.height = s.unlabeledPx + 'px';
          });
        });
      });
    };
  }

  /* ========================================================================
     MINI FORCE SIMULATION — no external library. Settles the illustrative
     graph's hand-placed seed coordinates into a less-clustered layout via a
     fixed number of repulsion/spring/centering iterations, synchronously,
     once, at render time.
     ======================================================================== */

  function relaxNetworkLayout(nodes, links, width, height, iterations) {
    var byId = {};
    nodes.forEach(function (n) { byId[n.id] = n; n.vx = 0; n.vy = 0; });

    for (var iter = 0; iter < iterations; iter += 1) {
      for (var i = 0; i < nodes.length; i += 1) {
        for (var j = i + 1; j < nodes.length; j += 1) {
          var a = nodes[i], b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var distSq = dx * dx + dy * dy || 0.01;
          var dist = Math.sqrt(distSq);
          var force = 950 / distSq;
          var fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      links.forEach(function (l) {
        var a = byId[l[0]], b = byId[l[1]];
        var dx = b.x - a.x, dy = b.y - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var diff = (dist - 95) * 0.02;
        var fx = (dx / dist) * diff, fy = (dy / dist) * diff;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      nodes.forEach(function (n) {
        n.vx += (width / 2 - n.x) * 0.006;
        n.vy += (height / 2 - n.y) * 0.006;
      });
      nodes.forEach(function (n) {
        n.x += n.vx * 0.12;
        n.y += n.vy * 0.12;
        n.vx *= 0.82;
        n.vy *= 0.82;
        var margin = 36;
        n.x = Math.max(margin, Math.min(width - margin, n.x));
        n.y = Math.max(margin, Math.min(height - margin, n.y));
      });
    }
  }

  /* ========================================================================
     CHART: network-idea — illustrative force-graph-style SVG. Nodes settle
     via relaxNetworkLayout(), then float continuously (slow per-node
     sine/cosine drift), hover for a quick tooltip, click for a feature card.
     ======================================================================== */

  function renderNetworkGraph() {
    var svg = document.getElementById('chart-ppi-network');
    var panel = document.getElementById('network-panel');
    var VIEW_W = 640, VIEW_H = 520;

    relaxNetworkLayout(NETWORK_GRAPH.nodes, NETWORK_GRAPH.links, VIEW_W, VIEW_H, 260);

    NETWORK_GRAPH.nodes.forEach(function (n, i) {
      n.baseX = n.x;
      n.baseY = n.y;
      n.phase = i * 0.66;
      n.ampX = 3.5 + (i % 3) * 1.4;
      n.ampY = 3.5 + ((i + 2) % 3) * 1.4;
      n.freq = 0.00022 + (i % 5) * 0.00005;
    });

    var byId = {};
    NETWORK_GRAPH.nodes.forEach(function (n) { byId[n.id] = n; });

    var linkEls = [];
    var linkLayer = svgEl('g');
    NETWORK_GRAPH.links.forEach(function (link) {
      var a = byId[link[0]], b = byId[link[1]];
      var line = svgEl('line', { class: 'n-link', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      linkLayer.appendChild(line);
      linkEls.push({ el: line, a: a, b: b });
    });
    svg.appendChild(linkLayer);

    var nodeEls = [];
    var nodeLayer = svgEl('g');
    var order = { unlabeled: 0, passenger: 1, driver: 2 };
    var sorted = NETWORK_GRAPH.nodes.slice().sort(function (a, b) { return order[a.group] - order[b.group]; });

    sorted.forEach(function (n) {
      // Positioning lives on an OUTER <g> via the SVG `transform` attribute.
      // The CSS-animated scale/opacity (see .n-group in style.css) goes on
      // an INNER <g> instead of this same element: a CSS `transform`
      // property on an element silently replaces its `transform` ATTRIBUTE
      // rather than composing with it, which would collapse every node to
      // the same translate(0,0) origin the instant the reveal animation's
      // CSS `transform: scale(...)` applied.
      var outer = svgEl('g', { transform: 'translate(' + n.x + ',' + n.y + ')' });
      var g = svgEl('g', { class: 'n-group' });
      g.appendChild(svgEl('circle', { class: 'n-node', r: RADIUS[n.group], fill: 'var(--series-' + n.group + ')' }));
      var t = svgEl('text', { class: 'n-label', x: RADIUS[n.group] + 6, y: 4 });
      t.textContent = n.id;
      g.appendChild(t);
      // Generous invisible hit target layered on top — the visible dot is
      // as small as 6px, too small to reliably hover/click on its own.
      var hit = svgEl('circle', { class: 'n-hit', r: HIT_RADIUS[n.group], fill: 'transparent' });
      g.appendChild(hit);
      outer.appendChild(g);
      nodeLayer.appendChild(outer);

      Tooltip.wire(hit, n.id, GROUP_TEXT_PT[n.group]);
      nodeEls.push({ node: n, outer: outer, hit: hit });
    });
    svg.appendChild(nodeLayer);

    setupNetworkCard(panel, nodeEls);

    // Continuous ambient float — deliberately NOT gated by the "animate
    // once" rule (the site owner explicitly asked for ongoing motion here).
    // Respects prefers-reduced-motion by simply never starting the loop.
    if (!REDUCED_MOTION) {
      (function floatLoop(ts) {
        NETWORK_GRAPH.nodes.forEach(function (n) {
          n.x = n.baseX + Math.sin(ts * n.freq + n.phase) * n.ampX;
          n.y = n.baseY + Math.cos(ts * n.freq * 1.3 + n.phase) * n.ampY;
        });
        nodeEls.forEach(function (entry) {
          entry.outer.setAttribute('transform', 'translate(' + entry.node.x + ',' + entry.node.y + ')');
        });
        linkEls.forEach(function (entry) {
          entry.el.setAttribute('x1', entry.a.x);
          entry.el.setAttribute('y1', entry.a.y);
          entry.el.setAttribute('x2', entry.b.x);
          entry.el.setAttribute('y2', entry.b.y);
        });
        requestAnimationFrame(floatLoop);
      })(0);
    }

    return function grow() { svg.classList.add('is-revealed'); };
  }

  // The dissertation's Figure 4.2: 4 omics categories x 16 TCGA cancer
  // types = 64 node features. Same for every gene (illustrative graph, no
  // real per-gene values) — what changes per click is only the heading.
  var OMICS_CATEGORIES = ['Mutations', 'Copy Number Variation', 'DNA Methylation', 'Gene Expression'];
  var CANCER_TYPES = ['BRCA', 'LUAD', 'UCEC', 'KIRC', 'HNSC', 'THCA', 'LUSC', 'PRAD', 'COAD', 'STAD', 'BLCA', 'LIHC', 'CESC', 'KIRP', 'ESCA', 'READ'];

  /** Floating card opened by clicking a node — replicates the dissertation's
   * Figure 4.2: a 2x2 grid of the 4 omics categories, each holding the 16
   * cancer-type chips that make up that category's features (4 x 16 = 64
   * total node features). */
  function setupNetworkCard(panel, nodeEls) {
    var card = el('div', 'network-card', { hidden: 'hidden' });
    var head = el('div', 'network-card-head');
    var geneEl = el('span', 'network-card-gene');
    var closeBtn = el('button', 'network-card-close', { type: 'button', 'aria-label': 'Fechar' });
    closeBtn.textContent = '×';
    head.appendChild(geneEl);
    head.appendChild(closeBtn);
    card.appendChild(head);

    var groupEl = el('div', 'network-card-group');
    card.appendChild(groupEl);

    var intro = el('p', 'network-card-intro');
    intro.textContent = '64 atributos multi-ômicos: 4 categorias × 16 tipos de câncer do TCGA';
    card.appendChild(intro);

    var grid = el('div', 'network-card-grid');
    OMICS_CATEGORIES.forEach(function (category) {
      var box = el('div', 'network-card-category');
      var heading = el('h5', '');
      heading.textContent = category;
      box.appendChild(heading);

      var chips = el('div', 'network-card-chips');
      CANCER_TYPES.forEach(function (cancerType) {
        var chip = el('span', 'network-card-chip');
        chip.textContent = cancerType;
        chips.appendChild(chip);
      });
      box.appendChild(chips);
      grid.appendChild(box);
    });
    card.appendChild(grid);
    panel.appendChild(card);

    var activeId = null;

    function open(entry) {
      activeId = entry.node.id;
      geneEl.textContent = entry.node.id;
      groupEl.innerHTML = '';
      var dot = el('span', '');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;background:var(--series-' + entry.node.group + ')';
      groupEl.appendChild(dot);
      groupEl.appendChild(document.createTextNode(GROUP_TEXT_PT[entry.node.group]));
      card.hidden = false;
    }

    function close() { card.hidden = true; activeId = null; }

    nodeEls.forEach(function (entry) {
      entry.hit.addEventListener('click', function (e) {
        e.stopPropagation();
        if (activeId === entry.node.id) close(); else open(entry);
      });
    });

    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });

    // Click anywhere outside the card (including empty SVG background) closes it.
    document.addEventListener('click', function (e) {
      if (!card.hidden && !card.contains(e.target)) close();
    });
  }

  /* ========================================================================
     CHART: methodology — 4-stage pipeline list
     ======================================================================== */

  function renderMethodology() {
    var list = document.getElementById('chart-methodology');
    var stages = [];

    METHODOLOGY_STAGES.forEach(function (stage, i) {
      // No substeps ("Abordagem em ensemble") -> center the head within the
      // card instead of leaving it top/left-aligned in an otherwise-empty box.
      var li = el('li', stage.substeps.length ? 'pipeline-stage' : 'pipeline-stage pipeline-stage-empty');
      var head = el('div', 'pipeline-stage-head');
      var num = el('span', 'pipeline-stage-num');
      num.textContent = String(i + 1).padStart(2, '0');
      var title = el('h4', 'pipeline-stage-title');
      title.textContent = stage.title;
      head.appendChild(num);
      head.appendChild(title);
      li.appendChild(head);

      if (stage.substeps.length) {
        var sub = el('ul', 'pipeline-substeps');
        stage.substeps.forEach(function (s) {
          var subLi = el('li', '');
          subLi.textContent = s;
          sub.appendChild(subLi);
        });
        li.appendChild(sub);
      }

      list.appendChild(li);
      stages.push(li);

      if (i < METHODOLOGY_STAGES.length - 1) {
        var arrowLi = el('li', 'pipeline-arrow');
        arrowLi.innerHTML = '<svg width="16" height="20" viewBox="0 0 16 20" aria-hidden="true"><path d="M8,1 L8,13 M2,9 L8,15 L14,9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        list.appendChild(arrowLi);
      }
    });

    return function grow() {
      stages.forEach(function (stageEl, i) {
        setTimeout(function () { stageEl.classList.add('is-revealed'); }, i * 140);
      });
    };
  }

  /* ========================================================================
     CHART: centrality-lift — DUMBBELL PLOT. One horizontal line per
     (facet, algorithm): hollow dot at "before" (multi-omics only), filled
     dot at "after" (+ centralities). IREF/GCN is a real decrease — the line
     simply points the other way, never smoothed over.
     ======================================================================== */

  function renderCentralityLift() {
    var container = document.getElementById('chart-centrality-lift');
    var maxValue = 0.65;
    var ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
    var reveals = [];

    CENTRALITY_LIFT.facets.forEach(function (facet) {
      var panel = el('div', 'bar-group');
      var title = el('div', 'bar-group-title');
      title.textContent = facet;
      panel.appendChild(title);

      // Gridlines scoped to THIS facet's own rows only — stacking one
      // .bar-group after another (via its own margin-top) is what puts a
      // visible break between HPRD/MULTINET/IREF's lines, instead of one
      // continuous line running through all 3 panels.
      var rowsWrap = el('div', 'dumbbell-rows');
      var gridWrap = el('div', 'dumbbell-gridlines');
      ticks.forEach(function (t) {
        var line = el('div', 'dumbbell-gridline');
        line.style.left = (t / maxValue) * 100 + '%';
        gridWrap.appendChild(line);
      });
      rowsWrap.appendChild(gridWrap);

      CENTRALITY_LIFT.groups.forEach(function (algo) {
        var pair = CENTRALITY_LIFT.values[facet][algo];
        var beforePct = (pair[0] / maxValue) * 100;
        var afterPct = (pair[1] / maxValue) * 100;

        // No per-row label: algorithm identity comes from the single
        // unified legend below all 3 panels (dot color = algorithm).
        var row = el('div', 'dumbbell-row');
        var track = el('div', 'dumbbell-track');
        var line = el('div', 'dumbbell-line');
        line.style.background = 'var(--series-' + algo + ')';
        var dotBefore = el('div', 'dumbbell-dot dumbbell-dot-before');
        var dotAfter = el('div', 'dumbbell-dot dumbbell-dot-after');
        dotAfter.style.background = 'var(--series-' + algo + ')';

        // Born collapsed at the "before" position: both dots overlap and
        // the line has zero length, until grow() runs.
        dotBefore.style.left = beforePct + '%';
        dotAfter.style.left = beforePct + '%';
        line.style.left = beforePct + '%';
        line.style.width = '0%';

        track.appendChild(line);
        track.appendChild(dotBefore);
        track.appendChild(dotAfter);
        row.appendChild(track);
        rowsWrap.appendChild(row);

        var tooltipLabel = GROUP_LABEL[algo] + ' · ' + facet;
        var tooltipValue = fmtAuc(pair[0]) + ' → ' + fmtAuc(pair[1]);
        Tooltip.wire(track, tooltipValue, tooltipLabel);

        reveals.push(function () {
          var left = Math.min(beforePct, afterPct);
          var width = Math.abs(afterPct - beforePct);
          dotAfter.style.left = afterPct + '%';
          line.style.left = left + '%';
          line.style.width = width + '%';
        });
      });

      panel.appendChild(rowsWrap);
      container.appendChild(panel);
    });

    // X-axis value labels only under the LAST (bottom) facet — the two
    // panels above it just have the plain gridlines running through them.
    var axis = el('div', 'dumbbell-axis');
    ticks.forEach(function (t) {
      var tick = el('span', 'dumbbell-axis-tick');
      tick.style.left = (t / maxValue) * 100 + '%';
      tick.textContent = t.toFixed(2);
      axis.appendChild(tick);
    });
    container.appendChild(axis);

    return function grow() {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          reveals.forEach(function (r) { r(); });
        });
      });
    };
  }

  /* ========================================================================
     CHART: gnn-vs-traditional — grouped horizontal bars, categories =
     networks. Row labels removed by request — algorithm identity comes
     purely from the color legend beneath the chart.
     ======================================================================== */

  function renderGnnVsTraditional() {
    var container = document.getElementById('chart-gnn-vs-traditional');
    var growers = [];
    var maxValue = 0.65;

    GNN_VS_TRADITIONAL.categories.forEach(function (category) {
      var group = el('div', 'bar-group');
      var title = el('div', 'bar-group-title');
      title.textContent = category;
      group.appendChild(title);

      GNN_VS_TRADITIONAL.groups.forEach(function (algo, i) {
        var value = GNN_VS_TRADITIONAL.values[category][i];
        var bar = makeBarRow({
          label: null, tooltipLabel: GROUP_LABEL[algo] + ' · ' + category, color: 'var(--series-' + algo + ')',
          pct: (value / maxValue) * 100, valueText: fmtAuc(value),
        });
        group.appendChild(bar.row);
        growers.push(bar.grow);
      });

      container.appendChild(group);
    });

    return function grow() { growers.forEach(function (g) { g(); }); };
  }

  /* ========================================================================
     CHART: network-performance — shared by "O modelo refinado" (6 bars) and
     "O poder do consenso" (adds UNION + Ensemble-Average, animated in once).
     Visual fill ceiling is NETWORK_PERFORMANCE.visualCeiling (0.75, "state
     of the art"), not 1.0 — the printed numbers stay the real AUC-PR values.
     ======================================================================== */

  function renderNetworkPerformance() {
    var container = document.getElementById('chart-network-performance');
    var baseGrowers = [];
    var revealEls = [];
    var maxValue = NETWORK_PERFORMANCE.visualCeiling;

    NETWORK_PERFORMANCE.categories.forEach(function (category) {
      var isReveal = NETWORK_PERFORMANCE.revealCategories.indexOf(category) !== -1;
      var value = NETWORK_PERFORMANCE.values[category];
      var isEnsemble = category === 'Ensemble-Average';
      var bar = makeBarRow({
        label: category, labelWidth: 118,
        color: isEnsemble ? 'var(--series-ensemble)' : 'var(--series-individual)',
        pct: (value / maxValue) * 100, valueText: fmtAuc(value),
      });
      if (isReveal) {
        bar.row.classList.add('reveal-bar');
        revealEls.push(bar.row);
      }
      container.appendChild(bar.row);
      // Reveal-category bars grow in place too — they're just invisible
      // (opacity:0/scaleY(0) via .reveal-bar) until revealExtra() runs, so
      // the moment they fade/scale in they're already at full value.
      baseGrowers.push(bar.grow);
    });

    return {
      growBase: function () { baseGrowers.forEach(function (g) { g(); }); },
      revealExtra: function () { revealEls.forEach(function (r) { r.classList.add('is-revealed'); }); },
      // Scrolling back up from "A força do consenso" into "Ajuste fino"
      // reverses the reveal: UNION + Ensemble-Average fade/scale back down
      // via the exact same .reveal-bar CSS transition, just run backwards.
      // Their underlying width (set once by growBase(), never reset here)
      // stays put — only opacity/scale toggle, so no global style changes.
      hideExtra: function () { revealEls.forEach(function (r) { r.classList.remove('is-revealed'); }); },
    };
  }

  /* ========================================================================
     CAROUSEL: imbalance-strategies, one PPI network per slide. Row labels
     removed by request (color legend only); a title above the chart
     ("Rede: HPRD") updates with the slide.
     ======================================================================== */

  function setupImbalanceCarousel() {
    var container = document.getElementById('chart-imbalance-strategies');
    var titleEl = document.getElementById('carousel-imbalance-title');
    var prevBtn = document.querySelector('#carousel-imbalance .carousel-prev');
    var nextBtn = document.querySelector('#carousel-imbalance .carousel-next');
    var dotsWrap = document.getElementById('carousel-imbalance-dots');
    var facets = IMBALANCE_STRATEGIES.facets;
    var current = 0;
    var maxValue = 0.65;

    facets.forEach(function (facet, i) {
      var dot = el('button', i === 0 ? 'is-active' : '', { type: 'button', 'aria-label': 'Ir para ' + facet });
      dot.addEventListener('click', function () { goTo(i); });
      dotsWrap.appendChild(dot);
    });

    function renderSlide(facetIndex) {
      container.innerHTML = '';
      container.classList.remove('carousel-fade');
      // eslint-disable-next-line no-unused-expressions
      void container.offsetWidth; // restart the fade-in animation on every slide change
      container.classList.add('carousel-fade');

      var facet = facets[facetIndex];
      titleEl.textContent = facet;
      var growers = [];

      IMBALANCE_STRATEGIES.categories.forEach(function (category, categoryIndex) {
        var group = el('div', 'bar-group');
        var title = el('div', 'bar-group-title');
        title.textContent = category;
        group.appendChild(title);

        IMBALANCE_STRATEGIES.groups.forEach(function (algo, algoIndex) {
          var value = IMBALANCE_STRATEGIES.values[facet][categoryIndex][algoIndex];
          var bar = makeBarRow({
            label: null, tooltipLabel: GROUP_LABEL[algo] + ' · ' + category, color: 'var(--series-' + algo + ')',
            pct: (value / maxValue) * 100, valueText: fmtAuc(value),
          });
          group.appendChild(bar.row);
          growers.push(bar.grow);
        });

        container.appendChild(group);
      });

      return function grow() { growers.forEach(function (g) { g(); }); };
    }

    var currentGrow = null;

    function goTo(index) {
      current = (index + facets.length) % facets.length;
      currentGrow = renderSlide(current);
      Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
        dot.classList.toggle('is-active', i === current);
      });
      currentGrow();
    }

    prevBtn.addEventListener('click', function () { goTo(current - 1); });
    nextBtn.addEventListener('click', function () { goTo(current + 1); });

    return {
      firstGrow: function () { goTo(0); },
    };
  }

  /* ========================================================================
     HERO STAT COUNT-UP
     ======================================================================== */

  function setupHeroStats() {
    var wrap = document.getElementById('hero-stats');
    if (!wrap) return;
    var values = wrap.querySelectorAll('[data-count-to]');

    revealOnce(wrap, function () {
      values.forEach(function (node) {
        var target = parseFloat(node.getAttribute('data-count-to'));
        var decimals = parseInt(node.getAttribute('data-decimals') || '0', 10);
        var suffix = node.getAttribute('data-suffix') || '';
        var useComma = node.getAttribute('data-comma') === 'true';
        var duration = 1200;
        var start = null;

        function frame(ts) {
          if (start === null) start = ts;
          var progress = Math.min(1, (ts - start) / duration);
          var eased = 1 - Math.pow(1 - progress, 3);
          var current = target * eased;
          var text = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toString();
          if (decimals > 0 && useComma) text = text.replace('.', ',');
          else if (decimals === 0) text = fmtInt(current);
          node.textContent = text + suffix;
          if (progress < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.4 });
  }

  /* ========================================================================
     GENE EXPLORER
     ======================================================================== */

  function setupGeneExplorer() {
    var input = document.getElementById('gene-search-input');
    var listbox = document.getElementById('gene-search-listbox');
    var status = document.getElementById('explorer-status');
    var examples = document.getElementById('explorer-examples');
    var detail = document.getElementById('gene-detail');
    var detailHeading = document.getElementById('gene-detail-heading');
    var trueLabelBadge = document.getElementById('gene-true-label');
    var ensembleAvgEl = document.getElementById('gene-ensemble-avg');
    var majorityLabelEl = document.getElementById('gene-majority-label');
    var majorityVerdictEl = document.getElementById('gene-majority-verdict');
    var networkChart = document.getElementById('gene-network-chart');

    var SUGGESTION_LIMIT = 8;
    var dataset = null;
    var sortedSymbols = [];
    var highlightedIndex = -1;
    var visibleSymbols = [];

    fetch('data/gene-predictions.json')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        dataset = json;
        sortedSymbols = Object.keys(dataset.genes).sort();
        status.textContent = '';
        status.hidden = true;
        input.disabled = false;
      })
      .catch(function () {
        status.textContent = 'Não foi possível carregar os dados dos genes. Tente novamente mais tarde.';
        status.classList.add('is-error');
      });

    function bisectLeft(sorted, value) {
      var lo = 0, hi = sorted.length;
      while (lo < hi) {
        var mid = (lo + hi) >>> 1;
        if (sorted[mid] < value) lo = mid + 1; else hi = mid;
      }
      return lo;
    }

    function prefixUpperBound(prefix) {
      if (!prefix.length) return prefix;
      var lastCode = prefix.charCodeAt(prefix.length - 1);
      return prefix.slice(0, -1) + String.fromCharCode(lastCode + 1);
    }

    function updateSuggestions(query) {
      var trimmed = query.trim().toUpperCase();
      if (!trimmed || !sortedSymbols.length) {
        visibleSymbols = [];
        renderListbox(0);
        return;
      }
      var start = bisectLeft(sortedSymbols, trimmed);
      var end = bisectLeft(sortedSymbols, prefixUpperBound(trimmed));
      visibleSymbols = sortedSymbols.slice(start, Math.min(end, start + SUGGESTION_LIMIT));
      renderListbox(Math.max(0, end - start));
    }

    function renderListbox(totalMatches) {
      listbox.innerHTML = '';
      highlightedIndex = -1;

      if (!visibleSymbols.length) {
        if (input.value.trim().length) {
          var none = el('li', 'is-note');
          none.textContent = 'Nenhum gene encontrado com esse símbolo.';
          listbox.appendChild(none);
          listbox.hidden = false;
        } else {
          listbox.hidden = true;
        }
        return;
      }

      visibleSymbols.forEach(function (symbol, i) {
        var li = el('li', '', { role: 'option', id: 'gene-option-' + symbol });
        li.textContent = symbol;
        li.addEventListener('mousedown', function (e) { e.preventDefault(); selectGene(symbol); });
        li.addEventListener('mouseenter', function () { setHighlighted(i); });
        listbox.appendChild(li);
      });

      if (totalMatches > visibleSymbols.length) {
        var more = el('li', 'is-note');
        more.textContent = '+' + (totalMatches - visibleSymbols.length) + ' outros resultados — continue digitando para refinar';
        listbox.appendChild(more);
      }

      listbox.hidden = false;
    }

    function setHighlighted(index) {
      highlightedIndex = index;
      Array.prototype.forEach.call(listbox.querySelectorAll('li'), function (li, i) {
        li.classList.toggle('is-highlighted', i === index);
      });
    }

    function selectGene(symbol) {
      if (!dataset || !dataset.genes[symbol]) return;
      input.value = symbol;
      listbox.hidden = true;
      examples.style.display = 'none';
      renderGeneDetail(symbol, dataset.genes[symbol]);
    }

    function renderGeneDetail(symbol, prediction) {
      detail.hidden = false;
      detailHeading.textContent = 'Detalhes de ' + symbol;

      var trueLabel = prediction.true === 1 ? 'Driver conhecido' : prediction.true === 0 ? 'Passenger conhecido' : 'Não rotulado';
      var trueColor = prediction.true === 1 ? 'var(--series-driver)' : prediction.true === 0 ? 'var(--series-passenger)' : 'var(--series-unlabeled)';
      trueLabelBadge.querySelector('.badge-dot').style.background = trueColor;
      trueLabelBadge.querySelector('span:last-child').textContent = trueLabel;

      ensembleAvgEl.textContent = prediction.ensembleAvg === null ? 'Indisponível' : fmtPercent(prediction.ensembleAvg);

      var ensembleNetworks = dataset.meta.ensembleNetworks;
      var votes = 0;
      ensembleNetworks.forEach(function (n) {
        var v = prediction.networks[n];
        if (v !== null && v !== undefined && v >= 0.5) votes += 1;
      });
      majorityLabelEl.textContent = votes + '/' + ensembleNetworks.length + ' redes do ensemble preveem driver';
      var majorityIsDriver = prediction.ensembleMajority === 1;
      majorityVerdictEl.querySelector('.badge-dot').style.background = majorityIsDriver ? 'var(--series-driver)' : 'var(--series-passenger)';
      majorityVerdictEl.querySelector('span:last-child').textContent = majorityIsDriver ? 'Votação majoritária: candidato a driver' : 'Votação majoritária: não é driver';

      // One shared label width for EVERY row in this chart, including the
      // ensemble-average row — different widths per row would shift where
      // each track starts, breaking the shared x=0 axis and shrinking
      // whichever track sits behind the widest label. 150px is wide enough
      // to fit "Média do ensemble" in full, with the short network codes
      // just left-aligned inside the same column.
      var LOLLIPOP_LABEL_WIDTH = 150;

      networkChart.innerHTML = '';
      dataset.meta.networks.forEach(function (networkKey) {
        var value = prediction.networks[networkKey];
        var code = networkKey.toUpperCase();
        if (value === null || value === undefined) {
          // "N/A" instead of "Sem dados": a longer phrase risks wrapping
          // inside the fixed-width value column.
          var absentRow = makeBarRow({ label: code, labelWidth: LOLLIPOP_LABEL_WIDTH, muted: true, pct: 0, valueText: 'N/A' });
          networkChart.appendChild(absentRow.row);
          return;
        }
        var color = value >= 0.5 ? 'var(--series-driver)' : 'var(--series-passenger)';
        var row = makeBarRow({ label: code, labelWidth: LOLLIPOP_LABEL_WIDTH, color: color, pct: value * 100, valueText: fmtPercent(value) });
        networkChart.appendChild(row.row);
        row.grow();
      });

      if (prediction.ensembleAvg !== null && prediction.ensembleAvg !== undefined) {
        var ensembleColor = prediction.ensembleAvg >= 0.5 ? 'var(--series-driver)' : 'var(--series-passenger)';
        var ensembleRow = makeBarRow({
          // No swatchColor: unlike network rows (identified by their code),
          // this summary row has no color-coded chart series of its own.
          label: 'Média do ensemble', labelWidth: LOLLIPOP_LABEL_WIDTH,
          color: ensembleColor, pct: prediction.ensembleAvg * 100, valueText: fmtPercent(prediction.ensembleAvg),
        });
        ensembleRow.row.style.borderTop = '1px solid var(--border-hairline)';
        ensembleRow.row.style.marginTop = '0.5rem';
        ensembleRow.row.style.paddingTop = '0.5rem';
        ensembleRow.row.querySelector('.bar-row-label').style.fontWeight = '700';
        networkChart.appendChild(ensembleRow.row);
        ensembleRow.grow();
      }
    }

    input.addEventListener('input', function () {
      updateSuggestions(input.value);
      input.setAttribute('aria-expanded', String(!listbox.hidden));
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (listbox.hidden) updateSuggestions(input.value);
        setHighlighted(Math.min(highlightedIndex + 1, visibleSymbols.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted(Math.max(highlightedIndex - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && visibleSymbols[highlightedIndex]) {
          selectGene(visibleSymbols[highlightedIndex]);
        } else {
          var exact = input.value.trim().toUpperCase();
          if (dataset && dataset.genes[exact]) selectGene(exact);
          else if (visibleSymbols[0]) selectGene(visibleSymbols[0]);
        }
      } else if (e.key === 'Escape') {
        listbox.hidden = true;
      }
    });

    document.addEventListener('click', function (e) {
      if (!input.contains(e.target) && !listbox.contains(e.target)) listbox.hidden = true;
    });

    Array.prototype.forEach.call(examples.querySelectorAll('button[data-example]'), function (btn) {
      btn.addEventListener('click', function () { selectGene(btn.getAttribute('data-example')); });
    });
  }

  /* ========================================================================
     HEADER: progress bar + section-driven nav dots / sticky panel swap
     ======================================================================== */

  function setupProgressBar() {
    var fill = document.getElementById('scroll-progress-fill');
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      fill.style.transform = 'scaleX(' + ratio + ')';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function setupSections(onSectionEnter) {
    var trackedIds = ['hero', 'problema', 'ideia', 'metodologia', 'achado-features', 'achado-imbalance', 'achado-gnn', 'refinado', 'ensemble', 'explorador'];
    var dots = document.querySelectorAll('.section-dots a');
    var panels = document.querySelectorAll('.visual-panel');
    var grownPanels = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        var panelId = entry.target.getAttribute('data-panel');

        dots.forEach(function (dot) { dot.classList.toggle('is-active', dot.getAttribute('data-section-id') === id); });

        if (panelId) {
          panels.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-panel') === panelId); });
          if (!grownPanels[panelId]) {
            grownPanels[panelId] = true;
            onSectionEnter(id, panelId, true);
          } else {
            onSectionEnter(id, panelId, false);
          }
        } else {
          onSectionEnter(id, null, false);
        }
      });
    }, { threshold: 0.5, rootMargin: '-15% 0px -15% 0px' });

    trackedIds.forEach(function (id) {
      var node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    // Clicking a nav dot should smooth-scroll even though href="#id" would
    // already do that natively — intercepted only to keep behavior identical
    // across browsers that don't honor `scroll-behavior: smooth` on same-page hashes.
    dots.forEach(function (dot) {
      dot.addEventListener('click', function (e) {
        var id = dot.getAttribute('data-section-id');
        var target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  function setupNarrativeReveal() {
    var steps = document.querySelectorAll('.scrolly-step');
    steps.forEach(function (step) {
      revealOnce(step, function () { step.classList.add('is-revealed'); }, { threshold: 0.2 });
    });
  }

  /* ========================================================================
     INIT
     ======================================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    setupProgressBar();
    setupNarrativeReveal();
    setupHeroStats();
    setupGeneExplorer();

    var growClassImbalance = renderClassImbalance();
    var growNetworkGraph = renderNetworkGraph();
    var growMethodology = renderMethodology();
    var growCentralityLift = renderCentralityLift();
    var growGnnVsTraditional = renderGnnVsTraditional();
    var networkPerformance = renderNetworkPerformance();
    var carousel = setupImbalanceCarousel();

    setupSections(function (sectionId, panelId, isFirstTimeForPanel) {
      if (!isFirstTimeForPanel) {
        // "O poder do consenso": the shared chart is already on screen (its
        // panel activated back at "O modelo refinado") — scrolling down
        // into "ensemble" reveals UNION + Ensemble-Average; scrolling back
        // up into "refinado" hides them again, every time, in either
        // direction (not a one-shot reveal like every other chart's grow).
        if (sectionId === 'ensemble') networkPerformance.revealExtra();
        else if (sectionId === 'refinado') networkPerformance.hideExtra();
        return;
      }

      if (panelId === 'problema') growClassImbalance();
      else if (panelId === 'ideia') growNetworkGraph();
      else if (panelId === 'metodologia') growMethodology();
      else if (panelId === 'achado-features') growCentralityLift();
      else if (panelId === 'achado-imbalance') carousel.firstGrow();
      else if (panelId === 'achado-gnn') growGnnVsTraditional();
      else if (panelId === 'refinado-ensemble') {
        networkPerformance.growBase();
        if (sectionId === 'ensemble') networkPerformance.revealExtra();
      }
    });
  });
})();
