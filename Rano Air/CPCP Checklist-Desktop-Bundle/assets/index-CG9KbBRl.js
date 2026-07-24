(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={db:null,init(){if(!window.indexedDB){console.error(`IndexedDB is not supported.`);return}let e=window.indexedDB.open(`RanoAirCPCPTrackerDB`,1);e.onupgradeneeded=e=>{let t=e.target.result;if(!t.objectStoreNames.contains(`checks`)){let e=t.createObjectStore(`checks`,{keyPath:`id`,autoIncrement:!0});e.createIndex(`aircraftRegistration`,`aircraftRegistration`,{unique:!1}),e.createIndex(`isActive`,`isActive`,{unique:!1})}if(!t.objectStoreNames.contains(`tasks`)){let e=t.createObjectStore(`tasks`,{keyPath:`id`,autoIncrement:!0});e.createIndex(`checkId`,`checkId`,{unique:!1}),e.createIndex(`checkType`,`checkType`,{unique:!1}),e.createIndex(`status`,`status`,{unique:!1})}if(!t.objectStoreNames.contains(`personnel`)){let e=t.createObjectStore(`personnel`,{keyPath:`id`,autoIncrement:!0});e.createIndex(`staffId`,`staffId`,{unique:!0}),e.createIndex(`role`,`role`,{unique:!1})}if(!t.objectStoreNames.contains(`audit_log`)){let e=t.createObjectStore(`audit_log`,{keyPath:`id`,autoIncrement:!0});e.createIndex(`checkId`,`checkId`,{unique:!1}),e.createIndex(`timestamp`,`timestamp`,{unique:!1})}if(!t.objectStoreNames.contains(`dsr_snapshots`)){let e=t.createObjectStore(`dsr_snapshots`,{keyPath:`id`,autoIncrement:!0});e.createIndex(`checkId`,`checkId`,{unique:!1}),e.createIndex(`generatedAt`,`generatedAt`,{unique:!1})}},e.onerror=e=>{console.error(`Failed to open IndexedDB:`,e.target.error)},e.onsuccess=e=>{this.db=e.target.result,console.log(`IndexedDB initialized.`),window.dispatchEvent(new Event(`db-ready`))}},async addCheck(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`checks`,`readwrite`).objectStore(`checks`).add(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async updateCheck(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`checks`,`readwrite`).objectStore(`checks`).put(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async getActiveCheck(){return this.db?new Promise((e,t)=>{let n=this.db.transaction(`checks`,`readonly`).objectStore(`checks`).index(`isActive`).getAll(1);n.onsuccess=()=>{let t=n.result||[];e(t.length>0?t[0]:null)},n.onerror=()=>t(n.error)}):null},async getAllChecks(){return this.db?new Promise((e,t)=>{let n=this.db.transaction(`checks`,`readonly`).objectStore(`checks`).getAll();n.onsuccess=()=>e(n.result||[]),n.onerror=()=>t(n.error)}):[]},async addTask(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`tasks`,`readwrite`).objectStore(`tasks`).add(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async addTasksBulk(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`tasks`,`readwrite`).objectStore(`tasks`),i=0;function a(){if(i<e.length){let t=r.add(e[i]);t.onsuccess=()=>{i++,a()},t.onerror=()=>n(t.error)}else t()}a()})},async getTasksForCheck(e){return this.db?new Promise((t,n)=>{let r=this.db.transaction(`tasks`,`readonly`).objectStore(`tasks`).index(`checkId`).getAll(e);r.onsuccess=()=>t(r.result||[]),r.onerror=()=>n(r.error)}):[]},async getAllTasks(){return this.db?new Promise((e,t)=>{let n=this.db.transaction(`tasks`,`readonly`).objectStore(`tasks`).getAll();n.onsuccess=()=>e(n.result||[]),n.onerror=()=>t(n.error)}):[]},async updateTask(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`tasks`,`readwrite`).objectStore(`tasks`).put(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async updateTasksBulk(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`tasks`,`readwrite`).objectStore(`tasks`),i=0;function a(){if(i<e.length){let t=r.put(e[i]);t.onsuccess=()=>{i++,a()},t.onerror=()=>n(t.error)}else t()}a()})},async deleteTask(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`tasks`,`readwrite`).objectStore(`tasks`).delete(e);r.onsuccess=()=>t(),r.onerror=()=>n(r.error)})},async addPerson(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`personnel`,`readwrite`).objectStore(`personnel`).add(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async getAllPersonnel(){return this.db?new Promise((e,t)=>{let n=this.db.transaction(`personnel`,`readonly`).objectStore(`personnel`).getAll();n.onsuccess=()=>e(n.result||[]),n.onerror=()=>t(n.error)}):[]},async addAuditEntry(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`audit_log`,`readwrite`).objectStore(`audit_log`).add(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async getAuditEntriesForCheck(e){return this.db?new Promise((t,n)=>{let r=this.db.transaction(`audit_log`,`readonly`).objectStore(`audit_log`).index(`checkId`).getAll(e);r.onsuccess=()=>t(r.result||[]),r.onerror=()=>n(r.error)}):[]},async getAllAuditEntries(){return this.db?new Promise((e,t)=>{let n=this.db.transaction(`audit_log`,`readonly`).objectStore(`audit_log`).getAll();n.onsuccess=()=>e(n.result||[]),n.onerror=()=>t(n.error)}):[]},async clearAuditEntriesForCheck(e){if(!this.db)return;let t=await this.getAuditEntriesForCheck(e);return new Promise((e,n)=>{let r=this.db.transaction(`audit_log`,`readwrite`).objectStore(`audit_log`),i=0;function a(){if(i>=t.length){e();return}let o=r.delete(t[i].id);o.onsuccess=()=>{i++,a()},o.onerror=()=>n(o.error)}a()})},async addDSRSnapshot(e){if(this.db)return new Promise((t,n)=>{let r=this.db.transaction(`dsr_snapshots`,`readwrite`).objectStore(`dsr_snapshots`).add(e);r.onsuccess=()=>t(r.result),r.onerror=()=>n(r.error)})},async getDSRSnapshots(e){return this.db?new Promise((t,n)=>{let r=this.db.transaction(`dsr_snapshots`,`readonly`).objectStore(`dsr_snapshots`).index(`checkId`).getAll(e);r.onsuccess=()=>t(r.result||[]),r.onerror=()=>n(r.error)}):[]},async getAllDSRSnapshots(){return this.db?new Promise((e,t)=>{let n=this.db.transaction(`dsr_snapshots`,`readonly`).objectStore(`dsr_snapshots`).getAll();n.onsuccess=()=>e(n.result||[]),n.onerror=()=>t(n.error)}):[]},async clearAll(){if(!this.db)return;let e=[`checks`,`tasks`,`personnel`,`audit_log`,`dsr_snapshots`],t=this.db.transaction(e,`readwrite`);return Promise.all(e.map(e=>new Promise((n,r)=>{let i=t.objectStore(e).clear();i.onsuccess=()=>n(),i.onerror=()=>r(i.error)})))}};function t(e,t,n,r,i=120){let a=typeof e==`string`?document.getElementById(e):e;if(!a)return;let o=Math.max(0,Math.min(100,isNaN(t)?0:t)),s=2*Math.PI*45;a.innerHTML=`
    <div class="flex flex-col items-center justify-center p-2">
      <div class="relative" style="width: ${i}px; height: ${i}px;">
        <svg viewBox="0 0 120 120" class="w-full h-full transform -rotate-90">
          <!-- Background track -->
          <circle 
            cx="60" 
            cy="60" 
            r="45" 
            stroke="rgba(255, 255, 255, 0.05)" 
            stroke-width="12" 
            fill="transparent"
          />
          <!-- Progress path -->
          <circle 
            cx="60" 
            cy="60" 
            r="45" 
            stroke="${r}" 
            stroke-width="12" 
            fill="transparent" 
            stroke-dasharray="${s}" 
            stroke-dashoffset="${s-o/100*s}"
            stroke-linecap="round"
            class="chart-slice"
          />
        </svg>
        <!-- Center value -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-lg font-bold text-ncaa-text">${Math.round(o)}%</span>
        </div>
      </div>
      <span class="mt-2 text-xs font-semibold text-ncaa-muted text-center">${n}</span>
    </div>
  `}function n(e,n,r){let i=n+r;t(e,i>0?n/i*100:0,`TOTAL COMPLETION STATUS`,`var(--color-ncaa-success)`,180)}function r(e){let t=2*Math.PI*45;return`
    <svg viewBox="0 0 120 120" style="width: 120px; height: 120px; transform: rotate(-90deg);">
      <circle cx="60" cy="60" r="45" stroke="#e2e8f0" stroke-width="12" fill="none" />
      <circle cx="60" cy="60" r="45" stroke="#22c55e" stroke-width="12" fill="none" 
              stroke-dasharray="${t}" stroke-dashoffset="${t-e/100*t}" />
    </svg>
  `}function i(e,t,n){let i=new Date(e.checkStartDate).toLocaleDateString(`en-GB`,{day:`numeric`,month:`long`,year:`numeric`}),a=e.checkTypes.map(e=>e.type).join(`+`),o=t.total.total>0?Math.round(t.total.closed/t.total.total*100):0,s=``;e.checkTypes.forEach(e=>{let n=t[e.type]||{total:e.plannedTasks,closed:0},r=n.total>0?Math.round(n.closed/n.total*100):0;s+=`
      <tr>
        <td style="padding: 8px; border: 1px solid #000;">${e.type}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${n.total}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center;">${n.closed}</td>
        <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">${r}%</td>
      </tr>
    `});let c=t[`Non-Routine`]||{total:0,closed:0},l=c.total>0?Math.round(c.closed/c.total*100):0;s+=`
    <tr>
      <td style="padding: 8px; border: 1px solid #000; font-style: italic;">Non-Routine Tasks</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${c.total}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${c.closed}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">${l}%</td>
    </tr>
  `,s+=`
    <tr style="font-weight: bold; background-color: #f1f5f9;">
      <td style="padding: 8px; border: 1px solid #000;">TOTAL</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${t.total.total}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${t.total.closed}</td>
      <td style="padding: 8px; border: 1px solid #000; text-align: center;">${o}%</td>
    </tr>
  `;let u=(n||``).split(`
`).filter(e=>e.trim().length>0).map(e=>`<li>${e.replace(/^[•\-\*]\s*/,``)}</li>`).join(``);return`
    <div style="font-family: Arial, sans-serif; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #fff; border: 1px solid #ccc; box-sizing: border-box;">
      <!-- Header -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 25%; padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">MRO:</td>
          <td style="width: 25%; padding: 8px; border: 1px solid #000;">${e.mro}</td>
          <td style="width: 25%; padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">DATE:</td>
          <td style="width: 25%; padding: 8px; border: 1px solid #000;">${i}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">AIRCRAFT TYPE:</td>
          <td style="padding: 8px; border: 1px solid #000;">${e.aircraftType}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">AIRCRAFT REGISTRATION:</td>
          <td style="padding: 8px; border: 1px solid #000;">${e.aircraftRegistration}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">CHECK START DATE:</td>
          <td style="padding: 8px; border: 1px solid #000;">${i}</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">AIRCRAFT MSN:</td>
          <td style="padding: 8px; border: 1px solid #000;">${e.aircraftMSN}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">TYPE OF CHECK:</td>
          <td style="padding: 8px; border: 1px solid #000;">(${a}+DAILY+WEEKLY+ROUTINE+ADDITIONAL WORKS)</td>
          <td style="padding: 8px; border: 1px solid #000; font-weight: bold; background-color: #f8fafc;">ESTIMATED RTS DATE:</td>
          <td style="padding: 8px; border: 1px solid #000;">${e.estimatedRTS||`TBD`}</td>
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
              ${s}
            </tbody>
          </table>
        </div>

        <!-- Pie Chart -->
        <div style="flex: 1; border: 1px solid #000; padding: 15px; display: flex; flex-col; justify-content: center; align-items: center; text-align: center; min-height: 180px;">
          <div>
            <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">TOTAL TASKS COMPLETION STATUS</h4>
            <div style="display: flex; justify-content: center; margin-bottom: 8px;">
              ${r(o)}
            </div>
            <div style="font-size: 14px; font-weight: bold;">${o}% CLOSED</div>
            <div style="font-size: 12px; color: #555;">${100-o}% OPEN</div>
          </div>
        </div>
      </div>

      <!-- Highlights -->
      <h3 style="margin: 0 0 10px 0; border-bottom: 2px solid #000; padding-bottom: 4px; font-size: 16px; text-transform: uppercase; font-weight: bold;">SHIFT HIGHLIGHTS & DEFERRALS</h3>
      <div style="border: 1px solid #000; padding: 15px; min-height: 120px; background-color: #fafafa;">
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
          ${u||`<li>No highlights reported for this shift.</li>`}
        </ul>
      </div>
    </div>
  `}var a=[{code:`CPCP`,name:`CPCP Work Scope Tasks`,defaultCount:362,color:`var(--color-check-cpcp)`},{code:`1A`,name:`1A Check Tasks`,defaultCount:20,color:`var(--color-check-a-series)`},{code:`2A`,name:`2A Check Tasks`,defaultCount:25,color:`var(--color-check-a-series)`},{code:`3A`,name:`3A Check Tasks`,defaultCount:20,color:`var(--color-check-a-series)`},{code:`4A`,name:`4A Check Tasks`,defaultCount:15,color:`var(--color-check-a-series)`},{code:`5A`,name:`5A Check Tasks`,defaultCount:20,color:`var(--color-check-a-series)`},{code:`OOP`,name:`Out of Phase Tasks`,defaultCount:10,color:`var(--color-check-opp)`},{code:`Daily`,name:`Daily Check Tasks`,defaultCount:10,color:`var(--color-check-routine)`},{code:`Weekly`,name:`Weekly Check Tasks`,defaultCount:15,color:`var(--color-check-routine)`},{code:`Routine`,name:`Routine Tasks`,defaultCount:30,color:`var(--color-check-routine)`}],o={activeCheck:null,tasks:[],personnel:[],currentUser:{name:`Line Manager`,role:`manager`},async init(){await new Promise(t=>{window.addEventListener(`db-ready`,t,{once:!0}),e.init()}),this.bindEvents(),await this.loadInitialData()},bindEvents(){document.getElementById(`userSwitcher`).addEventListener(`change`,e=>{let t=e.target.value;if(t===`manager`)this.currentUser={name:`Line Manager`,role:`manager`};else{let e=this.personnel.find(e=>e.id===parseInt(t)||e.staffId===t);e&&(this.currentUser={name:e.name,role:e.role})}document.getElementById(`userName`).textContent=this.currentUser.name,document.getElementById(`userRole`).textContent=this.currentUser.role.toUpperCase(),this.refreshPermissions()});let t=document.querySelectorAll(`.tab-button`);t.forEach(e=>{e.addEventListener(`click`,()=>{t.forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),[`dashboard`,`engineers`,`handover`,`audit`].forEach(e=>{document.getElementById(`tab-${e}`).classList.add(`hidden`)});let n=e.dataset.tab;document.getElementById(`tab-${n}`).classList.remove(`hidden`),this.renderTabContent(n)})}),document.getElementById(`setupForm`).addEventListener(`submit`,async e=>{e.preventDefault(),await this.initializeNewCheck()}),document.getElementById(`defectForm`).addEventListener(`submit`,async e=>{e.preventDefault(),await this.logDefect()}),document.getElementById(`engineerForm`).addEventListener(`submit`,async e=>{e.preventDefault(),await this.addPersonnel()}),document.getElementById(`addDefectBtn`).addEventListener(`click`,()=>{this.populateDefectAssigneeSelect(),document.getElementById(`defectModal`).classList.remove(`hidden`)}),document.getElementById(`addEngineerBtn`).addEventListener(`click`,()=>{document.getElementById(`engineerModal`).classList.remove(`hidden`)}),document.getElementById(`generateDsrBtn`).addEventListener(`click`,()=>{this.openDSRPreview()}),document.getElementById(`printDsrTriggerBtn`).addEventListener(`click`,()=>{window.print()}),document.getElementById(`saveHandoverBtn`).addEventListener(`click`,async()=>{await this.saveHandoverNotes()}),document.getElementById(`closeCheckBtn`).addEventListener(`click`,async()=>{await this.closeCheck()}),document.getElementById(`clearAuditBtn`).addEventListener(`click`,async()=>{confirm(`Are you sure you want to clear the safety audit log for this check?`)&&(await e.clearAuditEntriesForCheck(this.activeCheck.id),await this.renderAuditTab(),this.showToast(`Audit entries cleared for this check only.`,`success`))}),document.getElementById(`exportBackupBtn`).addEventListener(`click`,()=>this.exportBackup()),document.getElementById(`importBackupBtn`).addEventListener(`click`,()=>{document.getElementById(`backupFileInput`).click()}),document.getElementById(`backupFileInput`).addEventListener(`change`,e=>this.importBackup(e))},async loadInitialData(){this.activeCheck=await e.getActiveCheck(),this.personnel=await e.getAllPersonnel(),this.personnel.length===0&&(await e.addPerson({name:`Engr. Musa Ibrahim`,staffId:`RAN/AMO/E01`,role:`engineer`}),await e.addPerson({name:`Engr. Fatima Yusuf`,staffId:`RAN/AMO/E02`,role:`engineer`}),await e.addPerson({name:`Certifier Jatau Usman`,staffId:`RAN/AMO/C01`,role:`certifier`}),this.personnel=await e.getAllPersonnel());let t=document.getElementById(`userSwitcher`);t.innerHTML=`<option value="manager">Line Maintenance Manager</option>`,this.personnel.forEach(e=>{t.innerHTML+=`<option value="${e.id}">${e.name} (${e.role.toUpperCase()})</option>`}),this.activeCheck?(this.tasks=await e.getTasksForCheck(this.activeCheck.id),document.getElementById(`checkMetaContainer`).classList.remove(`hidden`),document.getElementById(`appShell`).classList.remove(`hidden`),document.getElementById(`setupWizard`).classList.add(`hidden`),this.populateCheckMeta(),await this.refreshDashboard()):(document.getElementById(`checkMetaContainer`).classList.add(`hidden`),document.getElementById(`appShell`).classList.add(`hidden`),document.getElementById(`setupWizard`).classList.remove(`hidden`),this.renderSetupWizard()),this.refreshPermissions()},populateCheckMeta(){document.getElementById(`metaReg`).textContent=this.activeCheck.aircraftRegistration,document.getElementById(`metaType`).textContent=`(${this.activeCheck.aircraftType})`,document.getElementById(`metaMSN`).textContent=this.activeCheck.aircraftMSN,document.getElementById(`metaStartDate`).textContent=new Date(this.activeCheck.checkStartDate).toLocaleDateString(`en-GB`),document.getElementById(`metaRTS`).textContent=this.activeCheck.estimatedRTS||`TBD`},renderSetupWizard(){let e=document.getElementById(`checkTypeSelectGrid`);e.innerHTML=``,a.forEach(t=>{e.innerHTML+=`
        <label class="flex items-center gap-2 p-2 bg-white/[0.02] border border-white/[0.08] rounded-lg cursor-pointer hover:bg-white/[0.05]">
          <input type="checkbox" name="checkType" value="${t.code}" class="check-type-cb">
          <span class="text-sm font-semibold text-ncaa-text">${t.code}</span>
        </label>
      `}),document.querySelectorAll(`.check-type-cb`).forEach(e=>{e.addEventListener(`change`,()=>this.updateSetupWizardInputs())}),document.getElementById(`setupStartDate`).value=new Date().toISOString().substring(0,10)},updateSetupWizardInputs(){let e=document.getElementById(`taskCountInputsContainer`);e.innerHTML=``,Array.from(document.querySelectorAll(`.check-type-cb:checked`)).map(e=>e.value).forEach(t=>{let n=a.find(e=>e.code===t);e.innerHTML+=`
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg">
          <span class="text-sm font-bold text-ncaa-accent">${n.name} (${t})</span>
          <div class="flex items-center gap-2">
            <label class="text-xs text-ncaa-muted">Task Cards Planned:</label>
            <input type="number" id="setup-count-${t}" value="${n.defaultCount}" min="1" class="form-input !py-1 !px-2 w-24 text-center">
          </div>
        </div>
      `})},async initializeNewCheck(){let t=document.getElementById(`setupReg`).value.trim(),n=document.getElementById(`setupType`).value,r=document.getElementById(`setupMSN`).value.trim(),i=document.getElementById(`setupStartDate`).value,a=Array.from(document.querySelectorAll(`.check-type-cb:checked`)).map(e=>e.value);if(a.length===0){this.showToast(`Please select at least one check type package.`,`error`);return}let o=a.map(e=>{let t=document.getElementById(`setup-count-${e}`);return{type:e,plannedTasks:parseInt(t.value)||1}}),s={mro:`Rano Air AMO`,aircraftType:n,aircraftRegistration:t,aircraftMSN:r,checkStartDate:i,estimatedRTS:`TBD`,checkTypes:o,isActive:1,createdAt:new Date().toISOString()},c=await e.addCheck(s);s.id=c,this.activeCheck=s;let l=[];o.forEach(e=>{l.push({checkId:c,checkType:e.type,totalPlanned:e.plannedTasks,closed:0,remarks:``})}),l.push({checkId:c,checkType:`Non-Routine`,totalPlanned:0,closed:0,remarks:``}),await e.addTasksBulk(l),await e.addAuditEntry({checkId:c,timestamp:new Date().toISOString(),userId:`manager`,userName:`Line Manager`,action:`Check Initialized`,details:`Initialized check for ${t} (${n}) with package scope: ${a.join(`+`)}`}),this.showToast(`Check tracker initialized successfully.`,`success`),await this.loadInitialData()},async refreshDashboard(){if(!this.activeCheck)return;this.tasks=await e.getTasksForCheck(this.activeCheck.id);let r=0,i=0,o={};this.tasks.forEach(e=>{o[e.checkType]={total:e.totalPlanned,closed:e.closed},r+=e.totalPlanned,i+=e.closed}),o.total={total:r,closed:i},document.getElementById(`totalTasksCount`).textContent=r,document.getElementById(`closedTasksCount`).textContent=i,document.getElementById(`openTasksCount`).textContent=r-i;let s=r>0?i/r*100:0;document.getElementById(`overallPercentage`).textContent=`${Math.round(s)}%`,n(`masterPieContainer`,i,r-i);let c=document.getElementById(`packagePieGrid`);c.innerHTML=``;let l=document.getElementById(`progressTableBody`);l.innerHTML=``,this.activeCheck.checkTypes.forEach(e=>{let n=o[e.type]||{total:e.plannedTasks,closed:0},r=n.total>0?n.closed/n.total*100:0,i=a.find(t=>t.code===e.type)||{color:`var(--color-ncaa-accent)`},s=document.createElement(`div`);c.appendChild(s),t(s,r,e.type,i.color,90),l.innerHTML+=this.createProgressRowHTML(e.type,n.total,n.closed,!1)});let u=o[`Non-Routine`]||{total:0,closed:0};l.innerHTML+=this.createProgressRowHTML(`Non-Routine`,u.total,u.closed,!0),this.bindTableControls(),await this.renderDSRHistory()},createProgressRowHTML(e,t,n,r){let i=t>0?Math.round(n/t*100):0,a=t-n,o=`w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.08] flex items-center justify-center font-bold text-ncaa-text cursor-pointer transition-colors`,s=!this.canWrite();return`
      <tr>
        <td class="font-bold text-ncaa-text">${e}</td>
        <td class="text-center font-semibold">${t}</td>
        <td class="text-center text-ncaa-success font-semibold" id="closed-count-${e}">${n}</td>
        <td class="text-center font-bold text-ncaa-accent">${i}%</td>
        <td class="text-center text-ncaa-muted">${a}</td>
        <td class="no-print">
          <div class="flex items-center justify-center gap-3">
            <button class="${o} action-btn-dec" data-type="${e}" ${s?`disabled`:``}>-</button>
            <button class="${o} action-btn-inc" data-type="${e}" ${s?`disabled`:``}>+</button>
          </div>
        </td>
      </tr>
    `},bindTableControls(){let e=document.querySelectorAll(`.action-btn-dec`),t=document.querySelectorAll(`.action-btn-inc`);e.forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.type;await this.adjustTaskCount(t,-1)})}),t.forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.type;await this.adjustTaskCount(t,1)})})},async adjustTaskCount(t,n){if(!this.canWrite())return;let r=this.tasks.find(e=>e.checkType===t);if(!r)return;let i=r.closed+n;if(i<0&&(i=0),i>r.totalPlanned){i=r.totalPlanned,this.showToast(`Closed count cannot exceed total planned task cards.`,`info`);return}r.closed=i,await e.updateTask(r),await e.addAuditEntry({checkId:this.activeCheck.id,timestamp:new Date().toISOString(),userId:this.currentUser.name,userName:this.currentUser.name,action:`Progress Updated`,details:`${t} closed count adjusted by ${n>0?`+`:``}${n}. Current: ${i}/${r.totalPlanned}`}),await this.refreshDashboard()},populateDefectAssigneeSelect(){let e=document.getElementById(`defectAssignee`);e.innerHTML=`<option value="">Unassigned</option>`,this.personnel.filter(e=>e.role===`engineer`).forEach(t=>{e.innerHTML+=`<option value="${t.name}">${t.name}</option>`})},async logDefect(){if(!this.canWrite())return;let t=document.getElementById(`defectTitle`).value.trim(),n=document.getElementById(`defectAssignee`).value,r=this.tasks.find(e=>e.checkType===`Non-Routine`);r&&(r.totalPlanned+=1,await e.updateTask(r),await e.addAuditEntry({checkId:this.activeCheck.id,timestamp:new Date().toISOString(),userId:this.currentUser.name,userName:this.currentUser.name,action:`Non-Routine Defect Logged`,details:`Raised Non-Routine item: "${t}". Allocated assignee: ${n||`None`}. Non-routine card count incremented.`}),document.getElementById(`defectForm`).reset(),document.getElementById(`defectModal`).classList.add(`hidden`),this.showToast(`Non-routine defect logged successfully.`,`success`),await this.refreshDashboard())},async addPersonnel(){if(!this.canWrite())return;let t=document.getElementById(`engName`).value.trim(),n=document.getElementById(`engStaffId`).value.trim(),r=document.getElementById(`engRole`).value;try{await e.addPerson({name:t,staffId:n,role:r}),this.showToast(`Personnel added successfully.`,`success`),document.getElementById(`engineerForm`).reset(),document.getElementById(`engineerModal`).classList.add(`hidden`),await this.loadInitialData();let i=document.getElementById(`userSwitcher`);i.innerHTML=`<option value="manager">Line Maintenance Manager</option>`,this.personnel.forEach(e=>{i.innerHTML+=`<option value="${e.id}">${e.name} (${e.role.toUpperCase()})</option>`})}catch{this.showToast(`Staff ID already exists.`,`error`)}},async renderTabContent(e){e===`engineers`?this.renderPersonnelTab():e===`handover`?await this.renderHandoverTab():e===`audit`&&await this.renderAuditTab()},renderPersonnelTab(){this.renderPersonnelTabAsync()},async renderPersonnelTabAsync(){let t=document.getElementById(`personnelTableBody`);t.innerHTML=``;let n=this.activeCheck?await e.getAuditEntriesForCheck(this.activeCheck.id):[],r=new Date().toISOString().substring(0,10);this.personnel.forEach(e=>{let i=n.filter(t=>t.action===`Non-Routine Defect Logged`&&t.details.includes(`Allocated assignee: ${e.name}`)).length,a=n.filter(t=>t.userName===e.name&&t.action===`Progress Updated`&&t.timestamp.substring(0,10)===r).length,o=n.filter(t=>t.userName===e.name&&t.action===`Handover Remarks Saved`).sort((e,t)=>new Date(t.timestamp)-new Date(e.timestamp))[0];t.innerHTML+=`
        <tr>
          <td class="font-bold text-ncaa-text">${e.name}</td>
          <td class="text-xs uppercase tracking-wider text-ncaa-muted">${e.role}</td>
          <td class="text-center font-semibold">${i}</td>
          <td class="text-center font-semibold text-ncaa-success">${a}</td>
          <td><span class="text-xs text-ncaa-muted">${o?o.details:`No handover remarks recorded.`}</span></td>
          <td>
            <button class="btn-danger !py-1 !px-2 text-xs" ${this.canWrite()?``:`disabled`}>Remove</button>
          </td>
        </tr>
      `})},async renderHandoverTab(){let t=await e.getAuditEntriesForCheck(this.activeCheck.id),n=new Date(Date.now()-720*60*1e3).toISOString(),r=t.filter(e=>e.timestamp>=n),i=r.filter(e=>e.action===`Progress Updated`).length,a=r.filter(e=>e.action===`Non-Routine Defect Logged`).length;document.getElementById(`shiftTotalActions`).textContent=i,document.getElementById(`shiftNewDefects`).textContent=a},async saveHandoverNotes(){let t=document.getElementById(`handoverRemarksInput`).value.trim();t&&(await e.addAuditEntry({checkId:this.activeCheck.id,timestamp:new Date().toISOString(),userId:this.currentUser.name,userName:this.currentUser.name,action:`Handover Remarks Saved`,details:t}),this.showToast(`Handover remarks saved to audit log.`,`success`))},async renderAuditTab(){let t=document.getElementById(`auditTableBody`);t.innerHTML=``;let n=await e.getAuditEntriesForCheck(this.activeCheck.id);n.reverse(),n.forEach(e=>{let n=new Date(e.timestamp).toLocaleString(`en-GB`);t.innerHTML+=`
        <tr>
          <td class="text-xs text-ncaa-muted">${n}</td>
          <td class="font-semibold text-ncaa-text">${e.userName}</td>
          <td class="text-xs uppercase font-bold text-ncaa-accent">${e.action}</td>
          <td class="text-sm text-ncaa-muted">${e.details}</td>
        </tr>
      `})},buildDSRStats(){let e=0,t=0,n={};return this.tasks.forEach(r=>{n[r.checkType]={total:r.totalPlanned,closed:r.closed},e+=r.totalPlanned,t+=r.closed}),n.total={total:e,closed:t},n},async openDSRPreview(){let t=this.buildDSRStats(),n=document.getElementById(`handoverRemarksInput`).value,r=i(this.activeCheck,t,n),a=new Date().toISOString();document.getElementById(`dsrPreviewContainer`).innerHTML=r,document.getElementById(`dsrPrintSection`).innerHTML=r,await e.addDSRSnapshot({checkId:this.activeCheck.id,generatedAt:a,generatedBy:this.currentUser.name,headerData:{...this.activeCheck},progressData:t,highlights:n,totalCompletion:t.total.total>0?Math.round(t.total.closed/t.total.total*100):0,html:r}),await e.addAuditEntry({checkId:this.activeCheck.id,timestamp:a,userId:this.currentUser.name,userName:this.currentUser.name,action:`DSR Snapshot Generated`,details:`Daily Status Report saved at ${new Date(a).toLocaleString(`en-GB`)}.`}),await this.renderDSRHistory(),document.getElementById(`dsrPreviewModal`).classList.remove(`hidden`)},async renderDSRHistory(){let t=document.getElementById(`dsrHistoryTableBody`);if(!t||!this.activeCheck)return;let n=await e.getDSRSnapshots(this.activeCheck.id);if(n.sort((e,t)=>new Date(t.generatedAt)-new Date(e.generatedAt)),n.length===0){t.innerHTML=`
        <tr>
          <td colspan="6" class="text-center text-ncaa-muted py-4">No DSR snapshots generated yet.</td>
        </tr>
      `;return}t.innerHTML=``,n.forEach(e=>{t.innerHTML+=`
        <tr>
          <td class="text-xs text-ncaa-muted">${new Date(e.generatedAt).toLocaleString(`en-GB`)}</td>
          <td class="font-semibold text-ncaa-text">${e.generatedBy||`Line Manager`}</td>
          <td class="text-center">${e.progressData?.total?.total||0}</td>
          <td class="text-center text-ncaa-success font-semibold">${e.progressData?.total?.closed||0}</td>
          <td class="text-center font-bold text-ncaa-accent">${e.totalCompletion||0}%</td>
          <td class="text-center">
            <button class="btn-secondary !py-1 !px-3 text-xs view-dsr-snapshot-btn" data-id="${e.id}">View</button>
          </td>
        </tr>
      `}),document.querySelectorAll(`.view-dsr-snapshot-btn`).forEach(e=>{e.addEventListener(`click`,()=>{let t=n.find(t=>t.id===parseInt(e.dataset.id));t&&(document.getElementById(`dsrPreviewContainer`).innerHTML=t.html,document.getElementById(`dsrPrintSection`).innerHTML=t.html,document.getElementById(`dsrPreviewModal`).classList.remove(`hidden`))})})},async closeCheck(){this.canWrite()&&confirm(`Are you sure you want to CLOSE/COMPLETE this maintenance check? All data will be finalized and archived.`)&&(this.activeCheck.isActive=0,await e.updateCheck(this.activeCheck),await e.addAuditEntry({checkId:this.activeCheck.id,timestamp:new Date().toISOString(),userId:this.currentUser.name,userName:this.currentUser.name,action:`Check Completed`,details:`Finalized check status for ${this.activeCheck.aircraftRegistration}.`}),this.showToast(`Check completed and archived.`,`success`),this.activeCheck=null,await this.loadInitialData())},canWrite(){return this.currentUser.role===`manager`||this.currentUser.role===`certifier`},refreshPermissions(){let e=this.canWrite();document.getElementById(`addDefectBtn`).disabled=!e,document.getElementById(`closeCheckBtn`).disabled=!e,document.getElementById(`tab-dashboard`).classList.contains(`hidden`)===!1&&this.refreshDashboard()},exportBackup(){Promise.all([e.getAllChecks(),e.getAllTasks(),e.getAllPersonnel(),e.getAllAuditEntries(),e.getAllDSRSnapshots()]).then(([e,t,n,r,i])=>{let a={checks:e,tasks:t,personnel:n,audit:r,dsrSnapshots:i,exportedAt:new Date().toISOString()},o=new Blob([JSON.stringify(a,null,2)],{type:`application/json`}),s=URL.createObjectURL(o),c=document.createElement(`a`);c.href=s,c.download=`rano-air-cpcp-backup-${new Date().toISOString().substring(0,10)}.json`,c.click()})},async importBackup(t){if(!this.canWrite())return;let n=t.target.files[0];if(!n)return;let r=new FileReader;r.onload=async t=>{try{let n=JSON.parse(t.target.result);if(!n.checks||!n.tasks)throw Error(`Invalid backup file structure.`);await e.clearAll();let r=e.db.transaction(`checks`,`readwrite`).objectStore(`checks`);for(let e of n.checks)await r.add(e);let i=e.db.transaction(`tasks`,`readwrite`).objectStore(`tasks`);for(let e of n.tasks)await i.add(e);let a=e.db.transaction(`personnel`,`readwrite`).objectStore(`personnel`);for(let e of n.personnel||[])try{await a.add(e)}catch{}let o=e.db.transaction(`audit_log`,`readwrite`).objectStore(`audit_log`);for(let e of n.audit||[])await o.add(e);let s=e.db.transaction(`dsr_snapshots`,`readwrite`).objectStore(`dsr_snapshots`);for(let e of n.dsrSnapshots||[])await s.add(e);this.showToast(`Backup restored successfully!`,`success`),window.location.reload()}catch(e){this.showToast(`Failed to import backup: `+e.message,`error`)}},r.readAsText(n)},showToast(e,t=`info`){let n=document.getElementById(`toastContainer`),r=document.createElement(`div`);r.className=`toast ${t}`,r.textContent=e,n.appendChild(r),setTimeout(()=>{r.style.opacity=`0`,setTimeout(()=>r.remove(),300)},3e3)}};window.App=o,document.addEventListener(`DOMContentLoaded`,()=>o.init());