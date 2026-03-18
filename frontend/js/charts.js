/**
 * charts.js — Gráficos con Chart.js v4
 * Gestiona la creación y actualización de todos los gráficos del dashboard.
 */

// Referencia a las instancias activas para poder destruirlas al actualizar
const instances = {
  evolucion: null,
  categoriasGasto: null,
  categoriasIngreso: null,
};

// ============================================================
// CONFIGURACIÓN GLOBAL DE CHART.JS
// ============================================================

/** Colores de la paleta de la app */
const PALETTE = [
  '#6366F1', '#10B981', '#F43F5E', '#F59E0B', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
  '#84CC16', '#EF4444',
];

/** Defaults globales para Chart.js */
function applyGlobalDefaults() {
  if (typeof Chart === 'undefined') return;

  Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
  Chart.defaults.font.size = 12;
  Chart.defaults.color = '#64748B';
  Chart.defaults.plugins.legend.display = false; // Ocultamos la leyenda por defecto
  Chart.defaults.animation.duration = 400;
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
}

// ============================================================
// GRÁFICO DE EVOLUCIÓN MENSUAL (líneas/barras)
// ============================================================

/**
 * Renderiza el gráfico de evolución mensual.
 * @param {Array<{ mes: string, ingresos: number, gastos: number }>} evolucionMensual
 */
export function renderChartEvolucion(evolucionMensual) {
  const canvas = document.getElementById('chartEvolucion');
  if (!canvas || typeof Chart === 'undefined') return;

  // Destruir instancia previa
  if (instances.evolucion) {
    instances.evolucion.destroy();
    instances.evolucion = null;
  }

  if (!evolucionMensual?.length) {
    renderPlaceholder(canvas, 'Sin datos de evolución');
    return;
  }

  const labels = evolucionMensual.map(m => formatMes(m.mes));
  const ingresos = evolucionMensual.map(m => Number(m.ingresos));
  const gastos   = evolucionMensual.map(m => Number(m.gastos));

  instances.evolucion = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: ingresos,
          backgroundColor: 'rgba(16,185,129,0.75)',
          borderColor: '#10B981',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Gastos',
          data: gastos,
          backgroundColor: 'rgba(244,63,94,0.75)',
          borderColor: '#F43F5E',
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            borderRadius: 3,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            padding: 16,
            font: { size: 12, weight: '500' },
          },
        },
        tooltip: buildTooltipConfig(),
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            maxRotation: 0,
            font: { size: 11 },
          },
        },
        y: {
          grid: {
            color: 'rgba(100,116,139,0.08)',
            drawBorder: false,
          },
          border: { display: false, dash: [4, 4] },
          ticks: {
            font: { size: 11 },
            callback: val => formatCurrencyShort(val),
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ============================================================
// GRÁFICO DE DONA — Categorías de Gasto
// ============================================================

/**
 * Renderiza el gráfico de dona de gastos por categoría.
 * @param {Array<{ nombre: string, total: number, color: string, icono: string }>} porCategoria
 */
export function renderChartCategoriasGasto(porCategoria) {
  const canvas = document.getElementById('chartCategoriasGasto');
  if (!canvas || typeof Chart === 'undefined') return;

  if (instances.categoriasGasto) {
    instances.categoriasGasto.destroy();
    instances.categoriasGasto = null;
  }

  const gastos = porCategoria?.filter(c => c.tipo === 'gasto' || !c.tipo);

  if (!gastos?.length) {
    renderPlaceholder(canvas, 'Sin gastos por categoría');
    return;
  }

  instances.categoriasGasto = buildDonutChart(canvas, gastos, 'Gastos');
}

// ============================================================
// GRÁFICO DE DONA — Categorías de Ingreso
// ============================================================

/**
 * Renderiza el gráfico de dona de ingresos por categoría.
 * @param {Array} porCategoria
 */
export function renderChartCategoriasIngreso(porCategoria) {
  const canvas = document.getElementById('chartCategoriasIngreso');
  if (!canvas || typeof Chart === 'undefined') return;

  if (instances.categoriasIngreso) {
    instances.categoriasIngreso.destroy();
    instances.categoriasIngreso = null;
  }

  const ingresos = porCategoria?.filter(c => c.tipo === 'ingreso');

  if (!ingresos?.length) {
    renderPlaceholder(canvas, 'Sin ingresos por categoría');
    return;
  }

  instances.categoriasIngreso = buildDonutChart(canvas, ingresos, 'Ingresos');
}

// ============================================================
// HELPERS INTERNOS
// ============================================================

/**
 * Construye un gráfico de dona genérico.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{ nombre: string, total: number, color: string }>} data
 * @param {string} label
 * @returns {Chart}
 */
function buildDonutChart(canvas, data, label) {
  const topN = data.slice(0, 8); // Máximo 8 segmentos para legibilidad
  const otros = data.slice(8);

  const labels = topN.map(c => `${c.icono || ''} ${c.nombre}`.trim());
  const values = topN.map(c => Number(c.total));
  const colors = topN.map((c, i) => c.color || PALETTE[i % PALETTE.length]);

  // Agrupa el resto en "Otros" si hay más de 8
  if (otros.length > 0) {
    labels.push('Otros');
    values.push(otros.reduce((s, c) => s + Number(c.total), 0));
    colors.push('#94A3B8');
  }

  const total = values.reduce((a, b) => a + b, 0);

  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: '#FFFFFF',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 3,
            padding: 12,
            font: { size: 11 },
            generateLabels(chart) {
              const meta = chart.getDatasetMeta(0);
              return chart.data.labels.map((label, i) => ({
                text: `${label} (${((values[i] / total) * 100).toFixed(1)}%)`,
                fillStyle: colors[i],
                strokeStyle: '#fff',
                lineWidth: 2,
                hidden: meta.data[i]?.hidden || false,
                index: i,
              }));
            },
          },
        },
        tooltip: {
          ...buildTooltipConfig(),
          callbacks: {
            label(ctx) {
              const val = ctx.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
              return ` ${formatCurrencyShort(val)} (${pct}%)`;
            },
          },
        },
      },
    },
    plugins: [centerTextPlugin(label, total)],
  });
}

/**
 * Plugin para mostrar texto centrado en la dona.
 * @param {string} label
 * @param {number} total
 */
function centerTextPlugin(label, total) {
  return {
    id: `centerText_${label}`,
    afterDraw(chart) {
      if (chart.config.type !== 'doughnut') return;
      const { width, height, ctx } = chart;
      const cx = width / 2;
      const cy = height / 2;

      ctx.save();

      // Total
      ctx.font = `700 ${Math.min(height * 0.1, 18)}px Inter, sans-serif`;
      ctx.fillStyle = '#0F172A';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatCurrencyShort(total), cx, cy - 8);

      // Label
      ctx.font = `500 ${Math.min(height * 0.07, 11)}px Inter, sans-serif`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(label, cx, cy + 12);

      ctx.restore();
    },
  };
}

/**
 * Configuración base para los tooltips.
 * @returns {Object}
 */
function buildTooltipConfig() {
  return {
    backgroundColor: 'rgba(15,23,42,0.9)',
    titleColor: '#94A3B8',
    bodyColor: '#F8FAFC',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 4,
    callbacks: {
      label(ctx) {
        return ` ${formatCurrencyShort(ctx.parsed.y ?? ctx.parsed)}`;
      },
    },
  };
}

/**
 * Muestra un placeholder cuando no hay datos.
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 */
function renderPlaceholder(canvas, text) {
  const parent = canvas.parentElement;
  if (!parent) return;

  // Ocultar canvas y mostrar placeholder
  canvas.style.display = 'none';

  const existing = parent.querySelector('.chart-placeholder');
  if (existing) existing.remove();

  const placeholder = document.createElement('div');
  placeholder.className = 'chart-placeholder';
  placeholder.innerHTML = `
    <span class="chart-placeholder__icon">📊</span>
    <span class="chart-placeholder__text">${text}</span>
  `;
  parent.appendChild(placeholder);
}

/**
 * Formatea 'YYYY-MM' a nombre de mes abreviado.
 * @param {string} mesStr - '2026-03'
 * @returns {string} 'Mar'
 */
function formatMes(mesStr) {
  if (!mesStr) return '?';
  const [year, month] = mesStr.split('-');
  const d = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(d);
}

/**
 * Formatea un número como moneda corta (sin decimales para miles).
 * @param {number} val
 * @returns {string}
 */
function formatCurrencyShort(val) {
  if (Math.abs(val) >= 1000) {
    return (val / 1000).toFixed(1) + 'k€';
  }
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(val);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

/** Aplica los defaults globales al cargar el módulo. */
applyGlobalDefaults();
