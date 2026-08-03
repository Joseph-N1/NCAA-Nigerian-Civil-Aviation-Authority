import { generatePieChartSVG } from './charts.js';

/**
 * Renders the Daily Status Report HTML string for preview and printing.
 */
export function generateDSR(check, stats, highlights) {
  const startDate = check.checkStartDate ? new Date(check.checkStartDate) : new Date();
  const completionDate = check.completionDate ? new Date(check.completionDate) : new Date();
  const startDateStr = startDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const completionDateStr = completionDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const todayStr = new Date().toLocaleDateString('en-GB', {
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
    <div style="font-family: Arial, sans-serif; color: #111827; width: 100%; max-width: 210mm; margin: 0 auto; padding: 10mm; background-color: #ffffff; border: 1px solid #d1d5db; box-sizing: border-box; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #f59e0b; padding-bottom: 10px; margin-bottom: 16px;">
        <div>
          <div style="font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #7c3aed; text-transform: uppercase;">Rano Air AMO</div>
          <div style="font-size: 22px; font-weight: 700; color: #111827; margin-top: 2px;">DAILY STATUS REPORT</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Aircraft Maintenance Control / Line Maintenance</div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #374151; line-height: 1.5;">
          <div><strong>Document Date:</strong> ${todayStr}</div>
          <div><strong>Report No:</strong> ${check.aircraftRegistration || 'N/A'}</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 12px;">
        <tr>
          <td style="width: 22%; padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">MRO:</td>
          <td style="width: 28%; padding: 7px; border: 1px solid #d1d5db;">${check.mro}</td>
          <td style="width: 22%; padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">DATE:</td>
          <td style="width: 28%; padding: 7px; border: 1px solid #d1d5db;">${completionDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">AIRCRAFT TYPE:</td>
          <td style="padding: 7px; border: 1px solid #d1d5db;">${check.aircraftType}</td>
          <td style="padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">AIRCRAFT REG:</td>
          <td style="padding: 7px; border: 1px solid #d1d5db;">${check.aircraftRegistration}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">CHECK START DATE:</td>
          <td style="padding: 7px; border: 1px solid #d1d5db;">${startDateStr}</td>
          <td style="padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">AIRCRAFT MSN:</td>
          <td style="padding: 7px; border: 1px solid #d1d5db;">${check.aircraftMSN}</td>
        </tr>
        <tr>
          <td style="padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">CHECK PACKAGES:</td>
          <td style="padding: 7px; border: 1px solid #d1d5db;">${checkTypesStr}</td>
          <td style="padding: 7px; border: 1px solid #d1d5db; font-weight: bold; background-color: #f8fafc;">EST. RTS:</td>
          <td style="padding: 7px; border: 1px solid #d1d5db;">${check.estimatedRTS || 'TBD'}</td>
        </tr>
      </table>

      <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; font-size: 15px; text-transform: uppercase; font-weight: bold; color: #7c3aed;">CHECK PROGRESS STATUS</h3>

      <div style="display: flex; gap: 20px; align-items: flex-start; margin-bottom: 20px;">
        <div style="flex: 2;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">PLANNED TASK</th>
                <th style="padding: 8px; border: 1px solid #d1d5db; width: 80px; text-align: center;">NO. OF TASK CARDS</th>
                <th style="padding: 8px; border: 1px solid #d1d5db; width: 80px; text-align: center;">NO. OF TASKS CLOSED</th>
                <th style="padding: 8px; border: 1px solid #d1d5db; width: 100px; text-align: center;">COMPLETION STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <div style="flex: 1; border: 1px solid #d1d5db; padding: 15px; display: flex; flex-col; justify-content: center; align-items: center; text-align: center; min-height: 180px;">
          <div>
            <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">TOTAL TASKS COMPLETION STATUS</h4>
            <div style="display: flex; justify-content: center; margin-bottom: 8px;">
              ${generatePieChartSVG(overallPct)}
            </div>
            <div style="font-size: 14px; font-weight: bold;">${overallPct}% CLOSED</div>
            <div style="font-size: 12px; color: #6b7280;">${100 - overallPct}% OPEN</div>
          </div>
        </div>
      </div>

      <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #7c3aed; padding-bottom: 4px; font-size: 15px; text-transform: uppercase; font-weight: bold; color: #7c3aed;">SHIFT HIGHLIGHTS & DEFERRALS</h3>
      <div style="border: 1px solid #d1d5db; padding: 15px; min-height: 120px; background-color: #fafafa; margin-bottom: 18px;">
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6;">
          ${highlightsListHTML || '<li>No highlights reported for this shift.</li>'}
        </ul>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #374151;">
        <div style="flex: 1; border-top: 1px solid #d1d5db; padding-top: 8px;">
          <div><strong>Inspector:</strong> ____________________</div>
          <div style="margin-top: 6px;"><strong>Date:</strong> ____________________</div>
        </div>
        <div style="flex: 1; border-top: 1px solid #d1d5db; padding-top: 8px;">
          <div><strong>Supervisor:</strong> ____________________</div>
          <div style="margin-top: 6px;"><strong>Date:</strong> ____________________</div>
        </div>
      </div>
    </div>
  `;
}
