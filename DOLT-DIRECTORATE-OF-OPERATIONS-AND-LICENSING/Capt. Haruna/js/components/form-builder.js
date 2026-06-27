// ============================================
// NCAA DOLT License Management System
// Form Builder Component — js/components/form-builder.js
// ============================================

const FormBuilder = {
  currentStep: 1,
  totalSteps: 5,
  category: null,
  formData: {},
  recordId: null, // If editing, stores the record ID
  saveDraftTimer: null,

  // Render the forms dynamically
  render(category, containerId, recordData = null) {
    this.category = category;
    this.currentStep = 1;
    this.recordId = recordData ? recordData.id : null;
    
    // Initialize form data (either edit record or empty template)
    if (recordData) {
      this.formData = { ...recordData };
    } else {
      this.formData = window.createPersonnelRecord(category);
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    let html = `
      <div class="form-container relative">
        <!-- Draft Auto-Save tag -->
        <div id="formDraftTag" class="form-draft-tag">
          <span></span> Draft Auto-Saved
        </div>

        <!-- Wizard steps navigation header -->
        <div class="wizard-steps">
          <div class="wizard-step active" data-step="1">
            <div class="wizard-step-circle"><span>1</span></div>
            <div class="wizard-step-label">Personal</div>
          </div>
          <div class="wizard-step" data-step="2">
            <div class="wizard-step-circle"><span>2</span></div>
            <div class="wizard-step-label">License</div>
          </div>
          <div class="wizard-step" data-step="3">
            <div class="wizard-step-circle"><span>3</span></div>
            <div class="wizard-step-label">Ratings</div>
          </div>
          <div class="wizard-step" data-step="4">
            <div class="wizard-step-circle"><span>4</span></div>
            <div class="wizard-step-label">Medical</div>
          </div>
          <div class="wizard-step" data-step="5">
            <div class="wizard-step-circle"><span>5</span></div>
            <div class="wizard-step-label">Review</div>
          </div>
        </div>

        <!-- Step 1: Personal Details -->
        <div id="step1Content" class="wizard-step-content stagger-children">
          <h4 class="form-section-title">👤 Personal Details</h4>
          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_title">Title</label>
              <input type="text" id="f_title" name="title" placeholder="e.g. Capt., Engr." value="${this.formData.title || ''}">
            </div>
            <div class="form-group required">
              <label for="f_surname">Surname</label>
              <input type="text" id="f_surname" name="surname" value="${this.formData.surname || ''}">
              <span class="form-error-msg">Surname is required</span>
            </div>
            <div class="form-group required">
              <label for="f_firstName">First Name</label>
              <input type="text" id="f_firstName" name="firstName" value="${this.formData.firstName || ''}">
              <span class="form-error-msg">First name is required</span>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_middleName">Middle Name</label>
              <input type="text" id="f_middleName" name="middleName" value="${this.formData.middleName || ''}">
            </div>
            <div class="form-group required">
              <label for="f_dateOfBirth">Date of Birth</label>
              <input type="date" id="f_dateOfBirth" name="dateOfBirth" value="${this.formData.dateOfBirth ? this.formData.dateOfBirth.split('T')[0] : ''}">
              <span class="form-error-msg">Valid date of birth is required</span>
            </div>
            <div class="form-group">
              <label for="f_gender">Gender</label>
              <select id="f_gender" name="gender">
                <option value="">Select</option>
                <option value="Male" ${this.formData.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${this.formData.gender === 'Female' ? 'selected' : ''}>Female</option>
              </select>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_nationality">Nationality</label>
              <input type="text" id="f_nationality" name="nationality" value="${this.formData.nationality || 'Nigerian'}">
            </div>
            <div class="form-group">
              <label for="f_stateOfOrigin">State of Origin</label>
              <input type="text" id="f_stateOfOrigin" name="stateOfOrigin" value="${this.formData.stateOfOrigin || ''}">
            </div>
            <div class="form-group">
              <label for="f_placeOfBirth">Place of Birth</label>
              <input type="text" id="f_placeOfBirth" name="placeOfBirth" value="${this.formData.placeOfBirth || ''}">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_telephone">Telephone</label>
              <input type="tel" id="f_telephone" name="telephone" value="${this.formData.telephone || ''}">
              <span class="form-error-msg">Enter a valid phone number</span>
            </div>
            <div class="form-group">
              <label for="f_email">Email</label>
              <input type="email" id="f_email" name="email" value="${this.formData.email || ''}">
              <span class="form-error-msg">Enter a valid email address</span>
            </div>
          </div>

          <div class="form-group mb-4">
            <label for="f_residentialAddress">Residential Address</label>
            <textarea id="f_residentialAddress" name="residentialAddress" rows="2">${this.formData.residentialAddress || ''}</textarea>
          </div>
          <div class="form-group mb-4">
            <label for="f_permanentAddress">Permanent Address</label>
            <textarea id="f_permanentAddress" name="permanentAddress" rows="2">${this.formData.permanentAddress || ''}</textarea>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_idDocumentType">ID Document Type</label>
              <select id="f_idDocumentType" name="idDocumentType">
                <option value="">Select ID Type</option>
                <option value="International Passport" ${this.formData.idDocumentType === 'International Passport' ? 'selected' : ''}>International Passport</option>
                <option value="National ID (NIN)" ${this.formData.idDocumentType === 'National ID (NIN)' ? 'selected' : ''}>National ID (NIN)</option>
                <option value="Drivers License" ${this.formData.idDocumentType === 'Drivers License' ? 'selected' : ''}>Driver's License</option>
              </select>
            </div>
            <div class="form-group">
              <label for="f_idDocumentNumber">ID Document Number</label>
              <input type="text" id="f_idDocumentNumber" name="idDocumentNumber" value="${this.formData.idDocumentNumber || ''}">
            </div>
          </div>
        </div>

        <!-- Step 2: License Details -->
        <div id="step2Content" class="wizard-step-content stagger-children hidden">
          <h4 class="form-section-title">✈ License Details</h4>
          <div class="form-grid-2">
            <div class="form-group required">
              <label for="f_licenseNumber">License Number</label>
              <input type="text" id="f_licenseNumber" name="licenseNumber" value="${this.formData.licenseNumber || ''}">
              <span class="form-error-msg">Provide a valid license number</span>
            </div>
            <div class="form-group required">
              <label for="f_licenseType">License Type/Category</label>
              <input type="text" id="f_licenseType" name="licenseType" placeholder="e.g. CPL, ATPL, AME-A, ATC-Radar" value="${this.formData.licenseType || ''}">
              <span class="form-error-msg">License type is required</span>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_dateOfFirstIssue">Date of First Issue</label>
              <input type="date" id="f_dateOfFirstIssue" name="dateOfFirstIssue" value="${this.formData.dateOfFirstIssue ? this.formData.dateOfFirstIssue.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_dateOfLastRenewal">Date of Last Renewal</label>
              <input type="date" id="f_dateOfLastRenewal" name="dateOfLastRenewal" value="${this.formData.dateOfLastRenewal ? this.formData.dateOfLastRenewal.split('T')[0] : ''}">
            </div>
            <div class="form-group required">
              <label for="f_licenseValidUntil">License Valid Until</label>
              <input type="date" id="f_licenseValidUntil" name="licenseValidUntil" value="${this.formData.licenseValidUntil ? this.formData.licenseValidUntil.split('T')[0] : ''}">
              <span class="form-error-msg">Validity date is required</span>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_licenseStatus">License Status</label>
              <select id="f_licenseStatus" name="licenseStatus">
                <option value="ACTIVE" ${this.formData.licenseStatus === 'ACTIVE' ? 'selected' : ''}>Active</option>
                <option value="SUSPENDED" ${this.formData.licenseStatus === 'SUSPENDED' ? 'selected' : ''}>Suspended</option>
                <option value="REVOKED" ${this.formData.licenseStatus === 'REVOKED' ? 'selected' : ''}>Revoked</option>
                <option value="EXPIRED" ${this.formData.licenseStatus === 'EXPIRED' ? 'selected' : ''}>Expired</option>
              </select>
            </div>
            <div class="form-group">
              <label for="f_languageProficiency">English Proficiency Level</label>
              <select id="f_languageProficiency" name="languageProficiency">
                <option value="">Select Level</option>
                <option value="Level 4" ${this.formData.languageProficiency === 'Level 4' ? 'selected' : ''}>ICAO Level 4 (Operational)</option>
                <option value="Level 5" ${this.formData.languageProficiency === 'Level 5' ? 'selected' : ''}>ICAO Level 5 (Extended)</option>
                <option value="Level 6" ${this.formData.languageProficiency === 'Level 6' ? 'selected' : ''}>ICAO Level 6 (Expert)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="f_employerOrganisation">Current Employer / Organisation</label>
              <input type="text" id="f_employerOrganisation" name="employerOrganisation" placeholder="e.g. Arik, Air Peace, NCAA" value="${this.formData.employerOrganisation || ''}">
            </div>
          </div>
        </div>

        <!-- Step 3: Category Specific Fields (Ratings, etc.) -->
        <div id="step3Content" class="wizard-step-content stagger-children hidden">
          ${this.getCategorySpecificFormFieldsHTML()}
        </div>

        <!-- Step 4: Medical Details -->
        <div id="step4Content" class="wizard-step-content stagger-children hidden">
          <h4 class="form-section-title">🏥 Medical Certification</h4>
          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_medicalClass">Medical Class</label>
              <select id="f_medicalClass" name="medicalClass">
                <option value="">Select Class</option>
                <option value="Class 1" ${this.formData.medicalClass === 'Class 1' ? 'selected' : ''}>Class 1 (Commercial/Airline Pilots)</option>
                <option value="Class 2" ${this.formData.medicalClass === 'Class 2' ? 'selected' : ''}>Class 2 (PPL, Cabin Crew, ATC)</option>
                <option value="Class 3" ${this.formData.medicalClass === 'Class 3' ? 'selected' : ''}>Class 3 (ATSEP, dispatchers)</option>
              </select>
            </div>
            <div class="form-group">
              <label for="f_medicalValidUntil">Medical Valid Until</label>
              <input type="date" id="f_medicalValidUntil" name="medicalValidUntil" value="${this.formData.medicalValidUntil ? this.formData.medicalValidUntil.split('T')[0] : ''}">
              <span class="form-error-msg">Medical validity must be a future date</span>
            </div>
            <div class="form-group">
              <label for="f_medicalExaminer">Authorised Medical Examiner (AAME)</label>
              <input type="text" id="f_medicalExaminer" name="medicalExaminer" placeholder="Name or number of examiner" value="${this.formData.medicalExaminer || ''}">
            </div>
          </div>
        </div>

        <!-- Step 5: Review & Passport Photo -->
        <div id="step5Content" class="wizard-step-content stagger-children hidden">
          <h4 class="form-section-title">📸 Photo & Review</h4>
          
          <div class="photo-upload-container">
            <div id="photoDropzone" class="photo-dropzone">
              <div class="photo-dropzone-icon">📷</div>
              <div class="photo-dropzone-text">Drag passport photo here or click</div>
              <img id="photoPreviewImg" class="photo-preview ${this.formData.passportPhoto ? '' : 'hidden'}" src="${this.formData.passportPhoto ? (typeof this.formData.passportPhoto === 'string' ? this.formData.passportPhoto : URL.createObjectURL(this.formData.passportPhoto)) : ''}">
            </div>
            <div class="photo-actions">
              <input type="file" id="f_photoFile" accept="image/*" class="hidden">
              <button id="btnChoosePhoto" class="btn btn-secondary btn-sm">Select Image</button>
              <button id="btnClearPhoto" class="btn btn-secondary btn-sm ${this.formData.passportPhoto ? '' : 'hidden'}">Remove</button>
            </div>
          </div>

          <div class="form-group mb-4">
            <label for="f_limitations">Limitations & Endorsements</label>
            <textarea id="f_limitations" name="limitations" rows="3" placeholder="e.g. Corrective lenses required, valid only for daylight operations">${this.formData.limitations || ''}</textarea>
          </div>

          <div class="form-group mb-4">
            <label for="f_remarks">Remarks / Special Notes</label>
            <textarea id="f_remarks" name="remarks" rows="2" placeholder="Internal remarks">${this.formData.remarks || ''}</textarea>
          </div>

          <!-- Review Summary Panel -->
          <div class="card" style="padding: var(--space-4); background: rgba(0,0,0,0.15);">
            <div style="font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--color-text-primary);">📝 Verify Information Summary:</div>
            <div style="font-size: var(--font-size-sm); line-height: 1.6; color: var(--color-text-secondary);">
              <strong>Category:</strong> ${this.category}<br>
              <strong>Name:</strong> <span id="revName">...</span><br>
              <strong>License No:</strong> <span id="revLicenseNo">...</span><br>
              <strong>Valid Until:</strong> <span id="revExpiry">...</span>
            </div>
          </div>
        </div>

      </div>
    `;

    container.innerHTML = html;
    this.bindEvents();
    this.updateWizardButtons();
  },

  getCategorySpecificFormFieldsHTML() {
    switch (this.category) {
      case 'PILOT':
        return `
          <h4 class="form-section-title">✈ Pilot Subtypes & Ratings</h4>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_pilotLicenseSubType">Pilot Subtype</label>
              <select id="f_pilotLicenseSubType" name="pilotLicenseSubType">
                <option value="">Select Subtype</option>
                <option value="Student Authorization" ${this.formData.pilotLicenseSubType === 'Student Authorization' ? 'selected' : ''}>Student Authorization</option>
                <option value="PPL" ${this.formData.pilotLicenseSubType === 'PPL' ? 'selected' : ''}>Private Pilot License (PPL)</option>
                <option value="CPL" ${this.formData.pilotLicenseSubType === 'CPL' ? 'selected' : ''}>Commercial Pilot License (CPL)</option>
                <option value="ATPL" ${this.formData.pilotLicenseSubType === 'ATPL' ? 'selected' : ''}>Airline Transport Pilot License (ATPL)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Category Ratings</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" name="categoryRating" value="Aeroplane" ${this.formData.categoryRating.includes('Aeroplane') ? 'checked' : ''}>
                  <div class="checkbox-box"></div>
                  <span class="checkbox-text">Aeroplane</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="categoryRating" value="Helicopter" ${this.formData.categoryRating.includes('Helicopter') ? 'checked' : ''}>
                  <div class="checkbox-box"></div>
                  <span class="checkbox-text">Helicopter</span>
                </label>
              </div>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>Class Ratings</label>
              <div class="checkbox-group">
                <label class="checkbox-item">
                  <input type="checkbox" name="classRatings" value="Single-Engine Land" ${this.formData.classRatings.includes('Single-Engine Land') ? 'checked' : ''}>
                  <div class="checkbox-box"></div>
                  <span class="checkbox-text">Single-Engine Land</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" name="classRatings" value="Multi-Engine Land" ${this.formData.classRatings.includes('Multi-Engine Land') ? 'checked' : ''}>
                  <div class="checkbox-box"></div>
                  <span class="checkbox-text">Multi-Engine Land</span>
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="switch">
                <input type="checkbox" id="f_instrumentRating" name="instrumentRating" class="switch-input" ${this.formData.instrumentRating ? 'checked' : ''}>
                <span class="switch-slider"></span>
                <span class="switch-label">Instrument Rating Held</span>
              </label>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_instrumentValidUntil">Instrument Valid Until</label>
              <input type="date" id="f_instrumentValidUntil" name="instrumentValidUntil" value="${this.formData.instrumentValidUntil ? this.formData.instrumentValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_simulatorValidUntil">Simulator Valid Until</label>
              <input type="date" id="f_simulatorValidUntil" name="simulatorValidUntil" value="${this.formData.simulatorValidUntil ? this.formData.simulatorValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_privatePrivilegesValidUntil">Private Privileges Valid Until</label>
              <input type="date" id="f_privatePrivilegesValidUntil" name="privatePrivilegesValidUntil" value="${this.formData.privatePrivilegesValidUntil ? this.formData.privatePrivilegesValidUntil.split('T')[0] : ''}">
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label class="switch">
                <input type="checkbox" id="f_instructorRating" name="instructorRating" class="switch-input" ${this.formData.instructorRating ? 'checked' : ''}>
                <span class="switch-slider"></span>
                <span class="switch-label">Instructor Rating Endorsed</span>
              </label>
            </div>
            <div class="form-group">
              <label for="f_instructorRatingEndorsement">Instructor Rating Endorsements</label>
              <input type="text" id="f_instructorRatingEndorsement" name="instructorRatingEndorsement" placeholder="e.g. FI, TRI" value="${this.formData.instructorRatingEndorsement || ''}">
            </div>
          </div>
        `;
      
      case 'CABIN_CREW':
        return `
          <h4 class="form-section-title">👤 Cabin Crew Details & Drills</h4>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_cabinCrewLicenseType">Cabin Crew License Type</label>
              <input type="text" id="f_cabinCrewLicenseType" name="cabinCrewLicenseType" placeholder="e.g. Standard Purple License" value="${this.formData.cabinCrewLicenseType || ''}">
            </div>
            <div class="form-group">
              <label for="f_aircraftTypesQualified">Qualified Aircraft Types</label>
              <input type="text" id="f_aircraftTypesQualified" name="aircraftTypesQualified" placeholder="e.g. B737; CRJ900 (semicolon separated)" value="${(this.formData.aircraftTypesQualified || []).join('; ')}">
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_emergencyDrillsValidUntil">Emergency Drills Validity</label>
              <input type="date" id="f_emergencyDrillsValidUntil" name="emergencyDrillsValidUntil" value="${this.formData.emergencyDrillsValidUntil ? this.formData.emergencyDrillsValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_evacuationDrillValidUntil">Evacuation Drill Validity</label>
              <input type="date" id="f_evacuationDrillValidUntil" name="evacuationDrillValidUntil" value="${this.formData.evacuationDrillValidUntil ? this.formData.evacuationDrillValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_fireDrillValidUntil">Fire Drill Validity</label>
              <input type="date" id="f_fireDrillValidUntil" name="fireDrillValidUntil" value="${this.formData.fireDrillValidUntil ? this.formData.fireDrillValidUntil.split('T')[0] : ''}">
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_ditchingDrillValidUntil">Ditching Drill Validity</label>
              <input type="date" id="f_ditchingDrillValidUntil" name="ditchingDrillValidUntil" value="${this.formData.ditchingDrillValidUntil ? this.formData.ditchingDrillValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_firstAidValidUntil">First Aid Validity</label>
              <input type="date" id="f_firstAidValidUntil" name="firstAidValidUntil" value="${this.formData.firstAidValidUntil ? this.formData.firstAidValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_crmTrainingValidUntil">CRM Validity</label>
              <input type="date" id="f_crmTrainingValidUntil" name="crmTrainingValidUntil" value="${this.formData.crmTrainingValidUntil ? this.formData.crmTrainingValidUntil.split('T')[0] : ''}">
            </div>
          </div>
        `;

      case 'FLIGHT_DISPATCHER':
        return `
          <h4 class="form-section-title">📋 Flight Dispatcher Ratings</h4>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_dispatcherLicenseType">Dispatcher License Type</label>
              <input type="text" id="f_dispatcherLicenseType" name="dispatcherLicenseType" placeholder="e.g. Dispatcher License" value="${this.formData.dispatcherLicenseType || ''}">
            </div>
            <div class="form-group">
              <label for="f_meteorologyValidUntil">Meteorology Valid Until</label>
              <input type="date" id="f_meteorologyValidUntil" name="meteorologyValidUntil" value="${this.formData.meteorologyValidUntil ? this.formData.meteorologyValidUntil.split('T')[0] : ''}">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_flightPlanningValidUntil">Flight Planning Valid Until</label>
              <input type="date" id="f_flightPlanningValidUntil" name="flightPlanningValidUntil" value="${this.formData.flightPlanningValidUntil ? this.formData.flightPlanningValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_navigationValidUntil">Navigation Valid Until</label>
              <input type="date" id="f_navigationValidUntil" name="navigationValidUntil" value="${this.formData.navigationValidUntil ? this.formData.navigationValidUntil.split('T')[0] : ''}">
            </div>
          </div>
        `;

      case 'AME':
        return `
          <h4 class="form-section-title">🔧 AME Specialisations & Audits</h4>
          <div class="form-group mb-4">
            <label>AME License Categories</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" name="ameLicenseCategory" value="Airframe (A)" ${this.formData.ameLicenseCategory.includes('Airframe (A)') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Airframe (A)</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="ameLicenseCategory" value="Powerplant (P)" ${this.formData.ameLicenseCategory.includes('Powerplant (P)') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Powerplant (P)</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="ameLicenseCategory" value="Avionics (AV)" ${this.formData.ameLicenseCategory.includes('Avionics (AV)') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Avionics (AV)</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="ameLicenseCategory" value="Instruments (I)" ${this.formData.ameLicenseCategory.includes('Instruments (I)') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Instruments (I)</span>
              </label>
            </div>
          </div>

          <div class="form-grid-3">
            <div class="form-group">
              <label for="f_practicalExperienceMonths">Experience Months</label>
              <input type="number" id="f_practicalExperienceMonths" name="practicalExperienceMonths" value="${this.formData.practicalExperienceMonths || 0}">
            </div>
            <div class="form-group">
              <label for="f_competencyAuditDate">Competency Audit Date</label>
              <input type="date" id="f_competencyAuditDate" name="competencyAuditDate" value="${this.formData.competencyAuditDate ? this.formData.competencyAuditDate.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_competencyAuditValidUntil">Audit Valid Until</label>
              <input type="date" id="f_competencyAuditValidUntil" name="competencyAuditValidUntil" value="${this.formData.competencyAuditValidUntil ? this.formData.competencyAuditValidUntil.split('T')[0] : ''}">
            </div>
          </div>
        `;

      case 'ATC':
        return `
          <h4 class="form-section-title">📡 Air Traffic Control Endorsements</h4>
          <div class="form-group mb-4">
            <label>ATC Ratings Held</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" name="atcRatings" value="Aerodrome Control" ${this.formData.atcRatings.includes('Aerodrome Control') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Aerodrome Control</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="atcRatings" value="Approach Procedural" ${this.formData.atcRatings.includes('Approach Procedural') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Approach Procedural</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="atcRatings" value="Approach Surveillance" ${this.formData.atcRatings.includes('Approach Surveillance') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Approach Surveillance</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="atcRatings" value="Area Radar" ${this.formData.atcRatings.includes('Area Radar') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Area Radar</span>
              </label>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_atcUnit">ATC Assigned Unit/Facility</label>
              <input type="text" id="f_atcUnit" name="atcUnit" placeholder="e.g. DNMM Tower, DNUA Control" value="${this.formData.atcUnit || ''}">
            </div>
            <div class="form-group">
              <label for="f_competencyCheckValidUntil">Competency Check Valid Until</label>
              <input type="date" id="f_competencyCheckValidUntil" name="competencyCheckValidUntil" value="${this.formData.competencyCheckValidUntil ? this.formData.competencyCheckValidUntil.split('T')[0] : ''}">
            </div>
          </div>
        `;

      case 'ASO':
        return `
          <h4 class="form-section-title">📻 Aeronautical Station Operator Ratings</h4>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_asoLicenseType">ASO License Type</label>
              <input type="text" id="f_asoLicenseType" name="asoLicenseType" value="${this.formData.asoLicenseType || ''}">
            </div>
            <div class="form-group">
              <label for="f_stationAssignment">Assigned Station</label>
              <input type="text" id="f_stationAssignment" name="stationAssignment" placeholder="e.g. Lagos Radio" value="${this.formData.stationAssignment || ''}">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_communicationProceduresValidUntil">Comms Procedures Validity</label>
              <input type="date" id="f_communicationProceduresValidUntil" name="communicationProceduresValidUntil" value="${this.formData.communicationProceduresValidUntil ? this.formData.communicationProceduresValidUntil.split('T')[0] : ''}">
            </div>
            <div class="form-group">
              <label for="f_recurrentTrainingValidUntil">Recurrent Training Validity</label>
              <input type="date" id="f_recurrentTrainingValidUntil" name="recurrentTrainingValidUntil" value="${this.formData.recurrentTrainingValidUntil ? this.formData.recurrentTrainingValidUntil.split('T')[0] : ''}">
            </div>
          </div>
        `;

      case 'ATSEP':
        return `
          <h4 class="form-section-title">⚡ ATSEP Tech Qualifications</h4>
          <div class="form-group mb-4">
            <label>ATSEP Specialisations</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" name="atsepSpecialization" value="Navigation" ${this.formData.atsepSpecialization.includes('Navigation') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Navigation</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="atsepSpecialization" value="Surveillance" ${this.formData.atsepSpecialization.includes('Surveillance') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Surveillance</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="atsepSpecialization" value="Communication" ${this.formData.atsepSpecialization.includes('Communication') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Communication</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="atsepSpecialization" value="Data Processing" ${this.formData.atsepSpecialization.includes('Data Processing') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Data Processing</span>
              </label>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_facilityAssignment">Assigned Facility/Equipment</label>
              <input type="text" id="f_facilityAssignment" name="facilityAssignment" placeholder="e.g. ILS Runway 18R, Radar Room" value="${this.formData.facilityAssignment || ''}">
            </div>
            <div class="form-group">
              <label for="f_competencyAssessmentValidUntil">Competency Validity</label>
              <input type="date" id="f_competencyAssessmentValidUntil" name="competencyAssessmentValidUntil" value="${this.formData.competencyAssessmentValidUntil ? this.formData.competencyAssessmentValidUntil.split('T')[0] : ''}">
            </div>
          </div>
        `;

      case 'FLIGHT_ENGINEER':
        return `
          <h4 class="form-section-title">⚙ Flight Engineer Systems Ratings</h4>
          <div class="form-grid-2">
            <div class="form-group">
              <label for="f_feLicenseType">Flight Engineer License Type</label>
              <input type="text" id="f_feLicenseType" name="feLicenseType" value="${this.formData.feLicenseType || ''}">
            </div>
            <div class="form-group">
              <label for="f_totalFlightHours">Total Flight Hours</label>
              <input type="number" id="f_totalFlightHours" name="totalFlightHours" value="${this.formData.totalFlightHours || 0}">
            </div>
          </div>
          <div class="form-group">
            <label>Systems Specialities</label>
            <div class="checkbox-group">
              <label class="checkbox-item">
                <input type="checkbox" name="systemsKnowledge" value="Electrical" ${this.formData.systemsKnowledge && this.formData.systemsKnowledge.includes('Electrical') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Electrical</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="systemsKnowledge" value="Hydraulics" ${this.formData.systemsKnowledge && this.formData.systemsKnowledge.includes('Hydraulics') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Hydraulics</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="systemsKnowledge" value="Pneumatics" ${this.formData.systemsKnowledge && this.formData.systemsKnowledge.includes('Pneumatics') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Pneumatics</span>
              </label>
              <label class="checkbox-item">
                <input type="checkbox" name="systemsKnowledge" value="Engines" ${this.formData.systemsKnowledge && this.formData.systemsKnowledge.includes('Engines') ? 'checked' : ''}>
                <div class="checkbox-box"></div>
                <span class="checkbox-text">Engines</span>
              </label>
            </div>
          </div>
        `;

      default:
        return '';
    }
  },

  bindEvents() {
    const root = document.getElementById('formModalBody');
    if (!root) return;

    // Attach listeners on inputs to auto-sync with formData and trigger auto-save
    root.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('change', (e) => this.syncField(e.target));
      el.addEventListener('input', (e) => {
        this.syncField(e.target);
        this.triggerAutoSave();
      });
    });

    // Wizard Step clicks (allowing jumping back, or jumping forward with sequential validation)
    root.querySelectorAll('.wizard-step').forEach(stepNode => {
      stepNode.addEventListener('click', () => {
        const step = parseInt(stepNode.getAttribute('data-step'));
        if (step < this.currentStep) {
          this.goToStep(step);
        } else if (step > this.currentStep) {
          for (let s = this.currentStep; s < step; s++) {
            if (!this.validateStep(s)) {
              this.goToStep(s);
              return;
            }
          }
          this.goToStep(step);
        }
      });
    });

    // Image Upload Logic
    const zone = root.querySelector('#photoDropzone');
    const fileInput = root.querySelector('#f_photoFile');
    const chooseBtn = root.querySelector('#btnChoosePhoto');
    const clearBtn = root.querySelector('#btnClearPhoto');
    const previewImg = root.querySelector('#photoPreviewImg');

    if (zone && fileInput) {
      zone.addEventListener('click', () => fileInput.click());
      chooseBtn.addEventListener('click', () => fileInput.click());
      
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
      });
      
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          this.processImageFile(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.processImageFile(e.target.files[0]);
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.formData.passportPhoto = null;
        previewImg.src = '';
        previewImg.classList.add('hidden');
        clearBtn.classList.add('hidden');
        this.triggerAutoSave();
      });
    }
  },

  syncField(target) {
    const name = target.name;
    if (!name) return;

    if (target.type === 'checkbox') {
      if (target.name === 'categoryRating' || target.name === 'classRatings' || target.name === 'ameLicenseCategory' || target.name === 'atcRatings' || target.name === 'atsepSpecialization' || target.name === 'systemsKnowledge') {
        // Multi checkbox array
        const checked = Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(c => c.value);
        this.formData[name] = checked;
      } else {
        // Toggle boolean
        this.formData[name] = target.checked;
      }
    } else {
      let val = target.value;
      if (name === 'aircraftTypesQualified') {
        val = val.split(';').map(t => t.trim()).filter(Boolean);
      }
      this.formData[name] = val;
    }
  },

  processImageFile(file) {
    if (!file.type.startsWith('image/')) {
      window.Toast.error('Invalid File Type', 'Please upload a photo image.');
      return;
    }

    // Read and compress image using Canvas
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize parameters (Max 400x500 for standard passport ratio)
        const maxWidth = 400;
        const maxHeight = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert back to Blob
        canvas.toBlob((blob) => {
          this.formData.passportPhoto = blob;
          
          // Show preview
          const previewImg = document.getElementById('photoPreviewImg');
          const clearBtn = document.getElementById('btnClearPhoto');
          
          previewImg.src = URL.createObjectURL(blob);
          previewImg.classList.remove('hidden');
          if (clearBtn) clearBtn.classList.remove('hidden');
          
          this.triggerAutoSave();
          window.Toast.success('Photo Compressed', 'Passport image attached successfully.');
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  triggerAutoSave() {
    const draftTag = document.getElementById('formDraftTag');
    if (draftTag) {
      draftTag.classList.add('saving');
    }

    clearTimeout(this.saveDraftTimer);
    this.saveDraftTimer = setTimeout(async () => {
      try {
        // Draft saves (without passport photo blob to keep draft space clean, or with it if small)
        await window.DB.saveDraft(this.category, this.formData);
        if (draftTag) {
          draftTag.classList.remove('saving');
          draftTag.style.opacity = 1;
        }
      } catch (e) {
        console.error('Draft auto save failed', e);
      }
    }, 1000);
  },

  validateStep(step) {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.form-group').forEach(fg => fg.classList.remove('has-error'));

    if (step === 1) {
      // Validate Personal
      const surnameRes = window.Validators.validateRequired(this.formData.surname, 'Surname');
      if (!surnameRes.valid) {
        this.markFieldError('f_surname', surnameRes.message);
        isValid = false;
      }
      
      const firstRes = window.Validators.validateRequired(this.formData.firstName, 'First Name');
      if (!firstRes.valid) {
        this.markFieldError('f_firstName', firstRes.message);
        isValid = false;
      }

      const dobRes = window.Validators.validateRequired(this.formData.dateOfBirth, 'Date of birth');
      if (!dobRes.valid) {
        this.markFieldError('f_dateOfBirth', dobRes.message);
        isValid = false;
      }

      const ageRes = window.Validators.validateAge(this.formData.dateOfBirth, 17);
      if (!ageRes.valid) {
        this.markFieldError('f_dateOfBirth', ageRes.message);
        isValid = false;
      }

      const phoneRes = window.Validators.validatePhone(this.formData.telephone);
      if (!phoneRes.valid) {
        this.markFieldError('f_telephone', phoneRes.message);
        isValid = false;
      }

      const emailRes = window.Validators.validateEmail(this.formData.email);
      if (!emailRes.valid) {
        this.markFieldError('f_email', emailRes.message);
        isValid = false;
      }
    }

    if (step === 2) {
      // Validate License Info
      const licNoRes = window.Validators.validateLicenseNumber(this.formData.licenseNumber);
      if (!licNoRes.valid) {
        this.markFieldError('f_licenseNumber', licNoRes.message);
        isValid = false;
      }

      const typeRes = window.Validators.validateRequired(this.formData.licenseType, 'License Type');
      if (!typeRes.valid) {
        this.markFieldError('f_licenseType', typeRes.message);
        isValid = false;
      }

      const expRes = window.Validators.validateRequired(this.formData.licenseValidUntil, 'Valid Until');
      if (!expRes.valid) {
        this.markFieldError('f_licenseValidUntil', expRes.message);
        isValid = false;
      }

      if (!this.recordId) {
        const futureRes = window.Validators.validateFutureDate(this.formData.licenseValidUntil, 'License expiry');
        if (!futureRes.valid) {
          this.markFieldError('f_licenseValidUntil', futureRes.message);
          isValid = false;
        }
      }
    }

    if (step === 4 && !this.recordId && this.formData.medicalValidUntil) {
      const medFutureRes = window.Validators.validateFutureDate(this.formData.medicalValidUntil, 'Medical expiry');
      if (!medFutureRes.valid) {
        this.markFieldError('f_medicalValidUntil', medFutureRes.message);
        isValid = false;
      }
    }

    return isValid;
  },

  markFieldError(elementId, message) {
    const input = document.getElementById(elementId);
    if (!input) return;
    const group = input.closest('.form-group');
    if (group) {
      group.classList.add('has-error');
      const errLabel = group.querySelector('.form-error-msg');
      if (errLabel) errLabel.innerText = message;
    }
  },

  goToStep(step) {
    // Hide active step content
    document.getElementById(`step${this.currentStep}Content`).classList.add('hidden');
    
    // Show target step content
    document.getElementById(`step${step}Content`).classList.remove('hidden');

    // Update wizard steps indicators
    document.querySelectorAll('.wizard-step').forEach(node => {
      const stepNum = parseInt(node.getAttribute('data-step'));
      if (stepNum === step) {
        node.className = 'wizard-step active';
      } else if (stepNum < step) {
        node.className = 'wizard-step completed';
      } else {
        node.className = 'wizard-step';
      }
    });

    this.currentStep = step;
    this.updateWizardButtons();

    if (step === 5) {
      // Populate review panel
      document.getElementById('revName').innerText = `${(this.formData.surname || '').toUpperCase()}, ${this.formData.firstName || ''}`;
      document.getElementById('revLicenseNo').innerText = this.formData.licenseNumber || 'N/A';
      document.getElementById('revExpiry').innerText = window.DateUtils.formatDate(this.formData.licenseValidUntil);
    }
  },

  updateWizardButtons() {
    const prevBtn = document.getElementById('btnFormPrev');
    const nextBtn = document.getElementById('btnFormNext');
    const submitBtn = document.getElementById('btnFormSubmit');

    if (this.currentStep === 1) {
      prevBtn.classList.add('hidden');
    } else {
      prevBtn.classList.remove('hidden');
    }

    if (this.currentStep === this.totalSteps) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }
  },

  handleNext() {
    if (this.validateStep(this.currentStep)) {
      this.goToStep(this.currentStep + 1);
    }
  },

  handlePrev() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  },

  async submitForm() {
    // Final validations
    if (!this.validateStep(1) || !this.validateStep(2) || !this.validateStep(4)) {
      window.Toast.error('Validation Errors', 'Please fill all required fields correctly before saving.');
      return;
    }

    try {
      const user = window.Auth.getUser();
      const username = user ? user.username : 'Assistant';

      if (this.recordId) {
        // Update existing record
        await window.DB.updatePersonnel(this.recordId, this.formData, username);
        window.Toast.success('Record Saved', `Successfully updated license ${this.formData.licenseNumber}`);
      } else {
        // Add new record
        await window.DB.addPersonnel(this.category, this.formData, username);
        window.Toast.success('Record Saved', `Successfully added license ${this.formData.licenseNumber}`);
      }

      // Delete category draft
      await window.DB.deleteDraft(this.category);

      // Close modal
      const modal = document.getElementById('formModalOverlay');
      if (modal) modal.classList.remove('active');

      // Refresh current page
      if (window.App && window.App.currentPageModule && window.App.currentPageModule.loadData) {
        await window.App.currentPageModule.loadData();
      }
    } catch (e) {
      window.Toast.error('Save Failed', e.message);
    }
  }
};

window.FormBuilder = FormBuilder;
