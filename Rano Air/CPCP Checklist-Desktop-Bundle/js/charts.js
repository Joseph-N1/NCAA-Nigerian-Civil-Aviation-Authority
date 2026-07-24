/**
 * Hand-crafted SVG Chart rendering module.
 * Uses vanilla SVG shapes for performance, offline-first reliability, and exact print compatibility.
 */

/**
 * Renders an SVG donut chart in the target container.
 * @param {string|HTMLElement} container - The container element or selector.
 * @param {number} percentage - The percentage completed (0 to 100).
 * @param {string} label - The label for the chart.
 * @param {string} color - The CSS color for the progress stroke (e.g. 'var(--color-ncaa-accent)').
 * @param {number} [size=120] - Size of the chart in pixels.
 */
export function renderDonutChart(container, percentage, label, color, size = 120) {
  const target = typeof container === 'string' ? document.getElementById(container) : container;
  if (!target) return;

  const validPct = Math.max(0, Math.min(100, isNaN(percentage) ? 0 : percentage));
  
  // Circle parameters: r = 45, cx = 60, cy = 60
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // ~282.74
  const offset = circumference - (validPct / 100) * circumference;

  const svgHTML = `
    <div class="flex flex-col items-center justify-center p-2">
      <div class="relative" style="width: ${size}px; height: ${size}px;">
        <svg viewBox="0 0 120 120" class="w-full h-full transform -rotate-90">
          <!-- Background track -->
          <circle 
            cx="60" 
            cy="60" 
            r="${radius}" 
            stroke="rgba(255, 255, 255, 0.05)" 
            stroke-width="12" 
            fill="transparent"
          />
          <!-- Progress path -->
          <circle 
            cx="60" 
            cy="60" 
            r="${radius}" 
            stroke="${color}" 
            stroke-width="12" 
            fill="transparent" 
            stroke-dasharray="${circumference}" 
            stroke-dashoffset="${offset}"
            stroke-linecap="round"
            class="chart-slice"
          />
        </svg>
        <!-- Center value -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-lg font-bold text-ncaa-text">${Math.round(validPct)}%</span>
        </div>
      </div>
      <span class="mt-2 text-xs font-semibold text-ncaa-muted text-center">${label}</span>
    </div>
  `;

  target.innerHTML = svgHTML;
}

/**
 * Renders the primary master status pie chart.
 * @param {string|HTMLElement} container 
 * @param {number} totalClosed 
 * @param {number} totalOpen 
 */
export function renderMasterDonutChart(container, totalClosed, totalOpen) {
  const total = totalClosed + totalOpen;
  const pct = total > 0 ? (totalClosed / total) * 100 : 0;
  
  renderDonutChart(container, pct, 'TOTAL COMPLETION STATUS', 'var(--color-ncaa-success)', 180);
}

/**
 * Helper to generate raw SVG string for DSR PDF/print document.
 */
export function generatePieChartSVG(percentage) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return `
    <svg viewBox="0 0 120 120" style="width: 120px; height: 120px; transform: rotate(-90deg);">
      <circle cx="60" cy="60" r="${radius}" stroke="#e2e8f0" stroke-width="12" fill="none" />
      <circle cx="60" cy="60" r="${radius}" stroke="#22c55e" stroke-width="12" fill="none" 
              stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" />
    </svg>
  `;
}
