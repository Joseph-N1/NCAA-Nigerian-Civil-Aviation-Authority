import { generatePieChartSVG } from './charts.js';

/**
 * Renders the Daily Status Report HTML string for preview and printing.
 */
export function generateDSR(check, stats, highlights) {
  const dateStr = new Date(check.checkStartDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const checkTypesStr = check.checkTypes.map(c => c.type).join('+');
  const overallPct = stats.total.total > 0 ? Math.round((stats.total.closed / stats.total.total) * 100) : 0;

  // Generate progress rows
  let tableRows = '';
  check.checkTypes.forEach(c => {
    const cStats = stats[c.type] || { total: c.plannedTasks, closed: 0 };
    const pct = cStats.total > 0 ? Math.round((cStats.closed / cStats.total) * 100) : 0;
    tableRows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #000;">${c.type}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${cStats.total}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${cStats.closed}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">${pct}%</td>
      </tr>
    `;
  });

  // Non-routine row
  const nrStats = stats['Non-Routine'] || { total: 0, closed: 0 };
  const nrPct = nrStats.total > 0 ? Math.round((nrStats.closed / nrStats.total) * 100) : 0;
  tableRows += `
    <tr>
      <td style="padding: 8px; border: 1px solid #000; font-style: italic;">Non-Routine Tasks</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${nrStats.total}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${nrStats.closed}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">${nrPct}%</td>
    </tr>
  `;

  // Total row
  tableRows += `
    <tr style="font-weight: bold; background-color: #f1f5f9;">
      <td style="padding: 8px; border: 1px solid #000;">TOTAL</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${stats.total.total}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${stats.total.closed}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${overallPct}%</td>
    </tr>
  `;

  // Convert highlights list to bullets
  const highlightsListHTML = (highlights || '')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => `<li>${line.replace(/^[•\-\*]\s*/, '')}</li>`)
    .join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fff; border: 1px solid #ccc; box-sizing: border-box;">
      <!-- Header -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 25%; padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">MRO:</td>
          <td style="width: 25%; padding: 8px; border: 1px solid #000;">${check.mro}</td>
          <td style="width: 25%; padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">DATE:</td>
          <td style="width: 25%; padding: 8px; border: 1px solid #000;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">AIRCRAFT TYPE:</td>
          <td style="padding: 8px; border: 1px solid #000;">${check.aircraftType}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">AIRCRAFT REGISTRATION:</td>
          <td style="padding: 8px; border: 1px solid #000;">${check.aircraftRegistration}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">CHECK START DATE:</td>
          <td style="padding: 8px; border: 1px solid #000;">${dateStr}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">AIRCRAFT MSN:</td>
          <td style="padding: 8px; border: 1px solid #000;">${check.aircraftMSN}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">TYPE OF CHECK:</td>
          <td style="padding: 8px; border: 1px solid #000;">(${checkTypesStr}+DAILY+WEEKLY+ROUTINE+ADDITIONAL WORKS)</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">ESTIMATED RTS DATE:</td>
          <td style="padding: 8px; border: 1px solid #000;">${check.estimatedRTS || 'TBD'}</td>
        </tr>
      </table>

      <!-- Progress Section Title -->
      <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #000; padding-bottom: 4px; font-size: 16px; text-transform: uppercase; font-weight: bold;">CHECK PROGRESS STATUS</h3>

      <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
        <!-- Table -->
        <div style="flex: 2;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <th style="padding: 8px; border: 1px solid #000; text-align: left;">PLANNED TASK</th>
                <th style="padding: 8px; border: 1px solid #000; width: 80px; text-align: center;">NO. OF TASK CARDS</th>
                <th style="padding: 8px; border: 1px solid #000; width: 80px; text-align: center;">NO. OF TASKS CLOSED</th>
                <th style="padding: 8px; border: 1px solid #000; width: 100px; text-align: center;">COMPLETION STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <!-- Pie Chart -->
        <div style="flex: 1; border: 1px solid #000; padding: 15px; display: flex; flex-col; justify-content: center; align-items: center; text-align: center; min-height: 180px;">
          <div>
            <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">TOTAL TASKS COMPLETION STATUS</h4>
            <div style="display: flex; justify-content: center; margin-bottom: 8px;">
              ${generatePieChartSVG(overallPct)}
            </div>
            <div style="font-size: 14px; font-weight: bold;">${overallPct}% CLOSED</div>
            <div style="font-size: 12px; color: #555;">${100 - overallPct}% OPEN</div>
          </div>
        </div>
      </div>

      <!-- Highlights -->
      <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #000; padding-bottom: 4px; font-size: 16px; text-transform: uppercase; font-weight: bold;">SHIFT HIGHLIGHTS & DEFERRALS</h3>
      <div style="border: 1px solid #000; padding: 15px; min-height: 120px; background-color: #fafafa;">
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
          ${highlightsListHTML || '<li>No highlights reported for this shift.</li>'}
        </ul>
      </div>
    </div>
  `;
}
