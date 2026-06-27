// ============================================
// NCAA DOLT License Management System
// Detail Slide-Out Panel — js/components/detail-panel.js
// ============================================

const DetailPanel = {
  overlay: null,
  panel: null,
  currentRecord: null,

  init() {
    this.overlay = document.getElementById('detailPanelOverlay');
    this.panel = document.getElementById('detailPanel');
    this.bindEvents();
  },

  bindEvents() {
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.hide();
      });
    }
  },

  async show(id) {
    try {
      const record = await window.DB.getPersonnelById(id);
      if (!record) {
        window.Toast.error('Error', 'Record not found.');
        return;
      }
      this.currentRecord = record;

      // Fetch audit trail
      const audits = await window.DB.getAuditTrail(id);
      this.render(record, audits);
      this.overlay.classList.add('active');
    } catch (e) {
      console.error(e);
      window.Toast.error('Load Error', 'Failed to retrieve record details.');
    }
  },

  hide() {
    if (this.overlay) {
      this.overlay.classList.remove('active');
    }
    this.currentRecord = null;
  },

  render(record, audits) {
    const photoURL = record.passportPhoto
      ? (typeof record.passportPhoto === 'string' ? record.passportPhoto : URL.createObjectURL(record.passportPhoto))
      : null;

    const formattedDob = window.DateUtils.formatDate(record.dateOfBirth);
    const formattedIssue = window.DateUtils.formatDate(record.dateOfFirstIssue);
    const formattedRenewal = window.DateUtils.formatDate(record.dateOfLastRenewal);
    const formattedExpiry = window.DateUtils.formatDate(record.licenseValidUntil);
    const formattedMedical = window.DateUtils.formatDate(record.medicalValidUntil);

    const expiryUrgency = window.DateUtils.getExpiryUrgency(record.licenseValidUntil);
    const daysLeftText = window.DateUtils.getDaysRemainingText(record.licenseValidUntil);

    let html = `
      <!-- Detail Header -->
      <div class="detail-header">
        <div class="detail-header-close" id="btnDetailClose">✕</div>
        ${photoURL
          ? `<img class="detail-photo" src="${photoURL}" alt="Passport Photo">`
          : `<div class="detail-photo detail-photo-placeholder">
              <span>${record.firstName ? record.firstName.charAt(0) : ''}${record.surname ? record.surname.charAt(0) : ''}</span>
              <small>Photo</small>
             </div>`
        }
        <div class="detail-header-info">
          <div class="detail-header-name">${(record.surname || '').toUpperCase()}, ${record.firstName || ''} ${record.middleName || ''}</div>
          <div class="detail-header-license">${record.licenseNumber}</div>
          <span class="badge badge-${record.licenseStatus.toLowerCase()}">${record.licenseStatus}</span>
        </div>
        <div class="detail-header-actions assistant-only" style="display: flex; gap: var(--space-2); margin-left: auto;">
          <button class="btn btn-primary btn-sm" id="btnDetailEdit" title="Edit this record">✏️ Edit</button>
        </div>
      </div>

      <!-- Detail Body -->
      <div class="detail-body">
        
        <!-- Section 1: General Info -->
        <div class="detail-section">
          <div class="detail-section-header">
            <h5 class="detail-section-title">👤 Personal Information</h5>
            <button class="btn btn-ghost btn-sm btn-add-section assistant-only" data-section="personal" title="Edit personal information">＋ Add</button>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Title</span><span class="detail-val">${record.title || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Date of Birth</span><span class="detail-val">${formattedDob}</span></div>
            <div class="detail-item"><span class="detail-label">Gender</span><span class="detail-val">${record.gender || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Nationality</span><span class="detail-val">${record.nationality || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">State of Origin</span><span class="detail-val">${record.stateOfOrigin || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Phone</span><span class="detail-val">${record.telephone || 'N/A'}</span></div>
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Email</span><span class="detail-val">${record.email || 'N/A'}</span></div>
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Residential Address</span><span class="detail-val">${record.residentialAddress || 'N/A'}</span></div>
          </div>
        </div>

        <!-- Section 2: License General Details -->
        <div class="detail-section">
          <div class="detail-section-header">
            <h5 class="detail-section-title">✈ License Details</h5>
            <button class="btn btn-ghost btn-sm btn-add-section assistant-only" data-section="license" title="Edit license information">＋ Add</button>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">License Type</span><span class="detail-val">${record.licenseType || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">First Issue Date</span><span class="detail-val">${formattedIssue}</span></div>
            <div class="detail-item"><span class="detail-label">Last Renewal Date</span><span class="detail-val">${formattedRenewal}</span></div>
            <div class="detail-item">
              <span class="detail-label">License Valid Until</span>
              <span class="detail-val ${expiryUrgency === 'expired' ? 'expired' : (expiryUrgency === 'critical' ? 'expiring' : '')}">
                ${formattedExpiry} (${daysLeftText})
              </span>
            </div>
            <div class="detail-item"><span class="detail-label">English Proficiency</span><span class="detail-val">${record.languageProficiency || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Employer / Org</span><span class="detail-val">${record.employerOrganisation || 'N/A'}</span></div>
          </div>
        </div>

        <!-- Section 3: Category Specific Ratings -->
        <div class="detail-section">
          <div class="detail-section-header">
            <h5 class="detail-section-title">🛡 Ratings & Endorsements</h5>
            <button class="btn btn-ghost btn-sm btn-add-section assistant-only" data-section="ratings" title="Edit ratings and endorsements">＋ Add</button>
          </div>
          ${this.getCategorySpecificDetailsHTML(record)}
        </div>

        <!-- Section 4: Medical Details -->
        <div class="detail-section">
          <div class="detail-section-header">
            <h5 class="detail-section-title">🏥 Medical Certificate</h5>
            <button class="btn btn-ghost btn-sm btn-add-section assistant-only" data-section="medical" title="Edit medical certificate">＋ Add</button>
          </div>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Medical Class</span><span class="detail-val">${record.medicalClass || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Medical Valid Until</span><span class="detail-val">${formattedMedical}</span></div>
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Authorised Examiner</span><span class="detail-val">${record.medicalExaminer || 'N/A'}</span></div>
          </div>
        </div>

        <!-- Limitations & Remarks -->
        <div class="detail-section">
          <div class="detail-section-header">
            <h5 class="detail-section-title">⚠️ Limitations & Remarks</h5>
            <button class="btn btn-ghost btn-sm btn-add-section assistant-only" data-section="limitations" title="Edit limitations and remarks">＋ Add</button>
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); line-height: 1.5;">
            <strong>Limitations:</strong> ${record.limitations || 'None'}<br>
            <strong>Remarks:</strong> ${record.remarks || 'None'}
          </div>
        </div>

        <!-- Print/PDF Button -->
        <div style="display: flex; gap: var(--space-3); margin-top: var(--space-4);" class="no-print">
          <button class="btn btn-primary" id="btnDetailPrint" style="flex: 1;">🖨 Print Summary (PDF)</button>
        </div>

        <!-- Section 5: Audit Logs -->
        <div class="detail-section">
          <div class="detail-section-header">
            <h5 class="detail-section-title">📝 Audit History Log</h5>
          </div>
          <div class="audit-list">
            ${audits.length === 0 
              ? '<div style="color: var(--color-text-muted); font-size: var(--font-size-xs);">No log edits recorded.</div>'
              : audits.map(audit => {
                  const field = audit.fieldChanged || audit.action || 'record';
                  const actor = audit.changedBy || audit.editor || 'system';
                  const action = field === '_created' ? 'created' : (field === '_deleted' ? 'deleted' : `updated ${field}`);
                  const oldVal = audit.oldValue && audit.oldValue !== 'null' ? audit.oldValue : '';
                  const newVal = audit.newValue && audit.newValue !== 'null' ? audit.newValue : '';
                  return `
                    <div class="audit-list-item">
                      Record <strong>${action}</strong> by <strong>${actor}</strong>.
                      ${field !== '_created' && field !== '_deleted' ? `<div style="font-size:10px; color:var(--color-text-muted); margin-top:2px;">Previous: ${oldVal}<br>Current: ${newVal}</div>` : ''}
                      <span class="audit-list-time">${window.DateUtils.formatDate(audit.timestamp)} at ${new Date(audit.timestamp).toLocaleTimeString()}</span>
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>

      </div>
    `;

    this.panel.innerHTML = html;

    // Attach local button actions
    document.getElementById('btnDetailClose').addEventListener('click', () => this.hide());
    document.getElementById('btnDetailPrint').addEventListener('click', () => this.printDetails(record));
    const btnEdit = document.getElementById('btnDetailEdit');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        this.hide();
        setTimeout(() => {
          window.PageRouter.showForm(record.category, record.id);
        }, 300);
      });
    }
    
    // Add section edit buttons
    document.querySelectorAll('.btn-add-section').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hide();
        setTimeout(() => {
          window.PageRouter.showForm(record.category, record.id);
        }, 300);
      });
    });
  },

  getCategorySpecificDetailsHTML(record) {
    switch (record.category) {
      case 'PILOT':
        return `
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Pilot Subtype</span><span class="detail-val">${record.pilotLicenseSubType || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Category Ratings</span><span class="detail-val">${(record.categoryRating || []).join(', ') || 'N/A'}</span></div>
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Class Ratings</span><span class="detail-val">${(record.classRatings || []).join(', ') || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Instrument Rating</span><span class="detail-val">${record.instrumentRating ? 'Yes' : 'No'}</span></div>
            <div class="detail-item"><span class="detail-label">Instrument Valid Until</span><span class="detail-val">${window.DateUtils.formatDate(record.instrumentValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Simulator Valid Until</span><span class="detail-val">${window.DateUtils.formatDate(record.simulatorValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Private Privileges Valid</span><span class="detail-val">${window.DateUtils.formatDate(record.privatePrivilegesValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Instructor Rating</span><span class="detail-val">${record.instructorRating ? `Yes (${record.instructorRatingEndorsement})` : 'No'}</span></div>
          </div>
        `;
      
      case 'CABIN_CREW':
        return `
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label font-bold">Cabin Crew License Type</span><span class="detail-val">${record.cabinCrewLicenseType || 'N/A'}</span></div>
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Qualified Aircraft Types</span><span class="detail-val">${(record.aircraftTypesQualified || []).join(', ') || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Emergency Drills Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.emergencyDrillsValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Evacuation Drill Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.evacuationDrillValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Fire Drill Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.fireDrillValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Ditching Drill Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.ditchingDrillValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">First Aid Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.firstAidValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">CRM Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.crmTrainingValidUntil)}</span></div>
          </div>
        `;

      case 'FLIGHT_DISPATCHER':
        return `
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Dispatcher License Type</span><span class="detail-val">${record.dispatcherLicenseType || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Meteorology Valid</span><span class="detail-val">${window.DateUtils.formatDate(record.meteorologyValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Flight Planning Valid</span><span class="detail-val">${window.DateUtils.formatDate(record.flightPlanningValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Navigation Valid</span><span class="detail-val">${window.DateUtils.formatDate(record.navigationValidUntil)}</span></div>
          </div>
        `;

      case 'AME':
        return `
          <div class="detail-grid">
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">AME License Categories</span><span class="detail-val">${(record.ameLicenseCategory || []).join(', ') || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Experience Months</span><span class="detail-val">${record.practicalExperienceMonths || 0} months</span></div>
            <div class="detail-item"><span class="detail-label">Competency Audit Date</span><span class="detail-val">${window.DateUtils.formatDate(record.competencyAuditDate)}</span></div>
            <div class="detail-item"><span class="detail-label">Audit Valid Until</span><span class="detail-val">${window.DateUtils.formatDate(record.competencyAuditValidUntil)}</span></div>
          </div>
        `;

      case 'ATC':
        return `
          <div class="detail-grid">
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">ATC Ratings Held</span><span class="detail-val">${(record.atcRatings || []).join(', ') || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Assigned Unit/Facility</span><span class="detail-val">${record.atcUnit || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Competency Check Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.competencyCheckValidUntil)}</span></div>
          </div>
        `;

      case 'ASO':
        return `
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">ASO License Type</span><span class="detail-val">${record.asoLicenseType || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Assigned Station</span><span class="detail-val">${record.stationAssignment || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Comms Procedures Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.communicationProceduresValidUntil)}</span></div>
            <div class="detail-item"><span class="detail-label">Recurrent Training Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.recurrentTrainingValidUntil)}</span></div>
          </div>
        `;

      case 'ATSEP':
        return `
          <div class="detail-grid">
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">ATSEP Specialisations</span><span class="detail-val">${(record.atsepSpecialization || []).join(', ') || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Assigned Facility</span><span class="detail-val">${record.facilityAssignment || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Competency Expiry</span><span class="detail-val">${window.DateUtils.formatDate(record.competencyAssessmentValidUntil)}</span></div>
          </div>
        `;

      case 'FLIGHT_ENGINEER':
        return `
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">FE License Type</span><span class="detail-val">${record.feLicenseType || 'N/A'}</span></div>
            <div class="detail-item"><span class="detail-label">Total Flight Hours</span><span class="detail-val">${record.totalFlightHours || 0} hrs</span></div>
            <div class="detail-item" style="grid-column: span 2;"><span class="detail-label">Systems Specialties</span><span class="detail-val">${(record.systemsKnowledge || []).join(', ') || 'N/A'}</span></div>
          </div>
        `;

      default:
        return '';
    }
  },

  printDetails(record) {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    
    // Convert photo blob to object URL or base64 if needed, but in print frame it's fine as URL
    const photoURL = record.passportPhoto
      ? (typeof record.passportPhoto === 'string' ? record.passportPhoto : URL.createObjectURL(record.passportPhoto))
      : '';

    doc.write(`
      <html>
      <head>
        <title>License Summary - ${record.licenseNumber}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0a1628; padding-bottom: 20px; margin-bottom: 30px; }
          .title-area h1 { margin: 0; color: #0a1628; font-size: 24px; }
          .title-area p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
          .passport-photo { width: 100px; height: 120px; border: 2px solid #ccc; object-fit: cover; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px 40px; margin-bottom: 30px; }
          .grid-item { border-bottom: 1px solid #eee; padding-bottom: 8px; }
          .label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: bold; }
          .value { font-size: 15px; font-weight: 500; margin-top: 4px; }
          .section-title { font-size: 16px; font-weight: bold; color: #0a1628; border-bottom: 1px solid #0a1628; margin: 30px 0 15px 0; padding-bottom: 5px; text-transform: uppercase; }
          .footer { text-align: center; font-size: 11px; color: #999; margin-top: 50px; border-top: 1px dashed #ccc; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>NIGERIAN CIVIL AVIATION AUTHORITY</h1>
            <p>Directorate of Licensing (DOLT) - Personnel License Summary</p>
          </div>
          ${photoURL ? `<img class="passport-photo" src="${photoURL}">` : ''}
        </div>

        <div class="section-title">Personal Particulars</div>
        <div class="grid">
          <div class="grid-item"><div class="label">Full Name</div><div class="value">${(record.surname || '').toUpperCase()}, ${record.firstName || ''} ${record.middleName || ''}</div></div>
          <div class="grid-item"><div class="label">Date of Birth</div><div class="value">${window.DateUtils.formatDate(record.dateOfBirth)}</div></div>
          <div class="grid-item"><div class="label">Gender</div><div class="value">${record.gender || 'N/A'}</div></div>
          <div class="grid-item"><div class="label">Nationality</div><div class="value">${record.nationality || 'N/A'}</div></div>
          <div class="grid-item"><div class="label">Telephone</div><div class="value">${record.telephone || 'N/A'}</div></div>
          <div class="grid-item"><div class="label">Email</div><div class="value">${record.email || 'N/A'}</div></div>
          <div class="grid-item" style="grid-column: span 2;"><div class="label">Residential Address</div><div class="value">${record.residentialAddress || 'N/A'}</div></div>
        </div>

        <div class="section-title">License & Authorization</div>
        <div class="grid">
          <div class="grid-item"><div class="label">License Number</div><div class="value" style="font-family: monospace; font-weight: bold; color: #00d4aa;">${record.licenseNumber}</div></div>
          <div class="grid-item"><div class="label">License Type</div><div class="value">${record.licenseType}</div></div>
          <div class="grid-item"><div class="label">Date of First Issue</div><div class="value">${window.DateUtils.formatDate(record.dateOfFirstIssue)}</div></div>
          <div class="grid-item"><div class="label">Date of Last Renewal</div><div class="value">${window.DateUtils.formatDate(record.dateOfLastRenewal)}</div></div>
          <div class="grid-item"><div class="label">License Valid Until</div><div class="value">${window.DateUtils.formatDate(record.licenseValidUntil)}</div></div>
          <div class="grid-item"><div class="label">Status</div><div class="value">${record.licenseStatus}</div></div>
        </div>

        <div class="footer">
          This is an official NCAA DOLT database record summary sheet generated on ${new Date().toLocaleString()}.
        </div>
      </body>
      </html>
    `);
    
    doc.close();

    // Trigger printing
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      document.body.removeChild(printFrame);
    }, 1000);
  }
};

window.DetailPanel = DetailPanel;
