import { generatePieChartSVG } from './charts.js';
import { RANO_LOGO_BASE64 } from './logo.js';

/**
 * Renders the Daily Status Report HTML string for preview, local PDF/HTML saving, and printing.
 */
export function generateDSR(check, stats, highlights, exportFormat = 'html') {
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

  const checkTypesStr = check.checkTypes ? check.checkTypes.map(c => c.type).join(' + ') : 'Maintenance';
  const overallPct = stats.total.total > 0 ? Math.round((stats.total.closed / stats.total.total) * 100) : 0;

  // Generate progress rows
  let tableRows = '';
  if (check.checkTypes) {
    check.checkTypes.forEach(c => {
      const cStats = stats[c.type] || { total: c.plannedTasks, closed: 0 };
      const pct = cStats.total > 0 ? Math.round((cStats.closed / cStats.total) * 100) : 0;
      tableRows += `
        <tr>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">${c.type}</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; color: #334155;">${cStats.total}</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; color: #16a34a; font-weight: bold;">${cStats.closed}</td>
          <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #A50050;">${pct}%</td>
        </tr>
      `;
    });
  }

  // Non-routine row
  const nrStats = stats['Non-Routine'] || { total: 0, closed: 0 };
  const nrPct = nrStats.total > 0 ? Math.round((nrStats.closed / nrStats.total) * 100) : 0;
  tableRows += `
    <tr>
      <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-style: italic; color: #d97706; font-weight: 600;">Non-Routine Tasks</td>
      <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; color: #334155;">${nrStats.total}</td>
      <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; color: #334155;">${nrStats.closed}</td>
      <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #d97706;">${nrPct}%</td>
    </tr>
  `;

  // Total row
  tableRows += `
    <tr style="font-weight: bold; background-color: #f1f5f9;">
      <td style="padding: 8px 10px; border: 1px solid #94a3b8; font-size: 12px; color: #0f172a;">TOTAL WORK CARDS</td>
      <td style="padding: 8px 10px; border: 1px solid #94a3b8; text-align: center; font-size: 12px; color: #0f172a;">${stats.total.total}</td>
      <td style="padding: 8px 10px; border: 1px solid #94a3b8; text-align: center; font-size: 12px; color: #16a34a;">${stats.total.closed}</td>
      <td style="padding: 8px 10px; border: 1px solid #94a3b8; text-align: center; font-size: 12px; color: #A50050;">${overallPct}%</td>
    </tr>
  `;

  // Convert highlights list to bullets
  const highlightsListHTML = (highlights || '')
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => `<li>${line.replace(/^[•\-\*]\s*/, '')}</li>`)
    .join('');

  return `
    <div id="dsrRootDocument" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #0f172a; width: 100%; max-width: 194mm; margin: 0 auto; padding: 6mm 8mm; background-color: #ffffff; box-sizing: border-box;">
      
      <!-- REPORT HEADER WITH PROPERLY ALIGNED LOGO -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #A50050; padding-bottom: 10px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${RANO_LOGO_BASE64}" alt="Rano Air Logo" style="height: 46px; width: auto; max-width: 130px; object-fit: contain; display: block;" />
          <div>
            <div style="font-size: 10.5px; font-weight: 800; letter-spacing: 1.8px; color: #A50050; text-transform: uppercase;">RANO AIR · LINE MAINTENANCE</div>
            <div style="font-size: 18px; font-weight: 900; color: #1D1B4C; margin-top: 1px; letter-spacing: 0.2px;">DAILY STATUS REPORT (DSR)</div>
            <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">Nnamdi Azikiwe International Airport (NAIA)</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 10.5px; color: #334155; line-height: 1.45; background: #f8fafc; padding: 7px 12px; border-radius: 6px; border: 1px solid #e2e8f0; min-width: 170px;">
          <div><strong>Document Date:</strong> ${todayStr}</div>
          <div><strong>Aircraft Reg:</strong> <span style="color: #A50050; font-weight: 800;">${check.aircraftRegistration || 'N/A'}</span></div>
          <div><strong>Status:</strong> <span style="color: ${check.isActive ? '#16a34a' : '#64748b'}; font-weight: 700;">${check.isActive ? 'ACTIVE CHECK' : 'FINALIZED'}</span></div>
        </div>
      </div>

      <!-- METADATA TABLE -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5px;">
        <tr>
          <td style="width: 18%; padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">MRO ORGANISATION:</td>
          <td style="width: 32%; padding: 5px 8px; border: 1px solid #cbd5e1; color: #0f172a;">${check.mro || 'Rano Air'}</td>
          <td style="width: 18%; padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">REPORT DATE:</td>
          <td style="width: 32%; padding: 5px 8px; border: 1px solid #cbd5e1; color: #0f172a;">${completionDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">AIRCRAFT TYPE:</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 800; color: #A50050;">${check.aircraftType}</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">AIRCRAFT REG:</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 800; color: #0f172a;">${check.aircraftRegistration}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">CHECK COMMENCED:</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; color: #0f172a;">${startDateStr}</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">AIRCRAFT MSN:</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; color: #0f172a;">${check.aircraftMSN}</td>
        </tr>
        <tr>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">CHECK PACKAGES:</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">${checkTypesStr}</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 700; background-color: #f8fafc; color: #1D1B4C;">EST. RETURN TO SERVICE:</td>
          <td style="padding: 5px 8px; border: 1px solid #cbd5e1; color: #d97706; font-weight: 700;">${check.estimatedRTS || 'TBD'}</td>
        </tr>
      </table>

      <!-- CHECK PROGRESS SECTION HEADER -->
      <div style="border-bottom: 1.5px solid #A50050; padding-bottom: 3px; margin-bottom: 8px; font-size: 11.5px; text-transform: uppercase; font-weight: 800; color: #A50050; letter-spacing: 0.5px;">
        CHECK PROGRESS STATUS REGISTER
      </div>

      <div style="display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px;">
        <div style="flex: 2;">
          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <thead>
              <tr style="background-color: #1D1B4C; color: #ffffff; font-weight: 700;">
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: left;">WORK PACKAGE</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 80px; text-align: center;">PLANNED</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 80px; text-align: center;">CLOSED</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 90px; text-align: center;">COMPLETION</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>

        <div style="flex: 1; border: 1px solid #cbd5e1; padding: 10px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background-color: #f8fafc; border-radius: 6px; min-height: 160px; box-sizing: border-box;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1D1B4C; margin-bottom: 6px;">TOTAL COMPLETION</div>
          <div style="display: flex; justify-content: center; margin-bottom: 4px;">
            ${generatePieChartSVG(overallPct)}
          </div>
          <div style="font-size: 14px; font-weight: 900; color: #16a34a;">${overallPct}% CLOSED</div>
          <div style="font-size: 10px; color: #64748b; font-weight: 600; margin-top: 1px;">${100 - overallPct}% OPEN</div>
        </div>
      </div>

      <!-- SHIFT HIGHLIGHTS SECTION -->
      <div style="border-bottom: 1.5px solid #A50050; padding-bottom: 3px; margin-bottom: 8px; font-size: 11.5px; text-transform: uppercase; font-weight: 800; color: #A50050; letter-spacing: 0.5px;">
        SHIFT HIGHLIGHTS, DISCREPANCIES & DEFERRALS
      </div>
      <div style="border: 1px solid #cbd5e1; padding: 10px 12px; min-height: 80px; background-color: #f8fafc; margin-bottom: 14px; border-radius: 6px;">
        <ul style="margin: 0; padding-left: 18px; font-size: 11px; line-height: 1.55; color: #1e293b;">
          ${highlightsListHTML || '<li>No specific shift remarks or deferrals recorded for this period.</li>'}
        </ul>
      </div>

    </div>
  `;
}
