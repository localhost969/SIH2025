(function(){
    // Mobile nav toggle
    const btn = document.getElementById('menuBtn');
    const menu = document.getElementById('mobileMenu');
    if(btn && menu){ btn.addEventListener('click', () => menu.classList.toggle('hidden')); }

    // Demo simulation — auto-loop video-style
    const progressBar = document.getElementById('demoProgressBar');
    const logEl = document.getElementById('demoLog');
    const filesEl = document.getElementById('selectedFilesChips');
    const summariesContainer = document.getElementById('summariesContainer');
    const resultEl = document.getElementById('resultCards');
    const stepEls = Array.from(document.querySelectorAll('[data-demo-step]'));
    const aiBeams = document.getElementById('aiBeams');
    const fileItems = Array.from(document.querySelectorAll('.file-item'));

    if(!progressBar) return; // Demo section not on page

    let timers = [];
    let running = false;

    const steps = [
      { name: 'Ingestion', dur: 600 },
      { name: 'OCR', dur: 900 },
      { name: 'Summarization', dur: 1400 },
      { name: 'Prioritization', dur: 800 },
      { name: 'Routing', dur: 700 },
      { name: 'Audit Log', dur: 500 },
    ];

    function clearTimers(){ timers.forEach(t=>clearTimeout(t)); timers=[]; }

    const docDatabase = {
      'Safety_Bulletin_SB-2025-09.pdf': { dept:'Operations', priority:'High', tags:['Safety','Action Required'], icon:'alert-triangle', summary:'Safety Bulletin SB-2025-09\n\n• Topic: Traction substation TS-04 inspection update\n• Actions: Verify earthing switch, record IR test values, attach photos\n• Deadline: Today 18:00 hrs\n• Notify: Duty Controller on completion\n• Trace: Linked to Incident #KMRL-44821' },
      'Engineering_Change_ECO-142.docx': { dept:'Engineering', priority:'Medium', tags:['Design','Track'], icon:'wrench', summary:'Engineering Change Order ECO-142\n\n• Update: Axle bearing vendor spec revised\n• Effective: Use Rev-D drawings from 01 Oct 2025\n• Scope: Affects rakes A12–A16\n• Action: Update maintenance logs and inspection checklists' },
      'Vendor_Invoice_INV-0925.xlsx': { dept:'Finance', priority:'Low', tags:['Payment','Audit'], icon:'dollar-sign', summary:'Vendor Invoice INV-0925\n\n• Amount: ₹12,48,000 verified against WO-6631\n• Status: Awaiting Goods Receipt confirmation\n• Vendor: Metro Spares Pvt Ltd\n• Action: Release payment after GR posting' },
      'Track_Inspection_Report.pdf': { dept:'Engineering', priority:'High', tags:['Track','Inspection'], icon:'move', summary:'Track Inspection Report\n\n• Section: Aluva to Kalamassery (3.2 km)\n• Findings: Minor ballast settlement at Ch. 1420\n• Action: Schedule tamping within 48 hours\n• Inspector: Sr. Engineer Rajesh Kumar' },
      'Shift_Report_Morning.pdf': { dept:'Operations', priority:'Medium', tags:['Operations','Daily'], icon:'clipboard-list', summary:'Morning Shift Report\n\n• Shift: 06:00-14:00 hrs\n• Train Services: 142 trips completed\n• Delays: 3 minor (< 5 min)\n• Incidents: Nil\n• Remarks: Normal operations maintained' },
      'Purchase_Order_PO-6631.pdf': { dept:'Finance', priority:'Low', tags:['Procurement'], icon:'package', summary:'Purchase Order PO-6631\n\n• Item: Brake pad assemblies (200 units)\n• Supplier: Rail Components India\n• Delivery: Expected by Oct 15, 2025\n• Value: ₹8,42,000' },
      'Leave_Policy_Update.pdf': { dept:'HR', priority:'Low', tags:['Policy','HR'], icon:'users', summary:'Leave Policy Update\n\n• Effective: Oct 1, 2025\n• Changes: Casual leave carry-forward increased to 10 days\n• Action: Update HRMS and notify all employees\n• Ref: Circular HR/2025/087' },
      'Maintenance_Schedule_Q4.pdf': { dept:'Operations', priority:'Medium', tags:['Maintenance','Planning'], icon:'settings', summary:'Maintenance Schedule Q4 2025\n\n• Major overhauls: Rakes A04, A07, A11\n• Scheduled: Oct-Dec 2025\n• Duration: 7 days per rake\n• Coordination: Operations & Engineering teams' }
    };

    let currentBatch = [];
    let batchIndex = 0;

    function selectNextBatch(){
      const batchSize = 3;
      const start = (batchIndex * batchSize) % fileItems.length;
      currentBatch = [];
      for(let i = 0; i < batchSize && start + i < fileItems.length; i++){
        currentBatch.push(fileItems[start + i]);
      }
      if(currentBatch.length === 0 && fileItems.length > 0){
        currentBatch = [fileItems[0]];
      }
      batchIndex++;
      return currentBatch.map(f => f.dataset.filename);
    }

    function resetDemo(){
      clearTimers();
      running = false;
      summariesContainer.innerHTML = '';
      resultEl.innerHTML = '';
      logEl.innerHTML = '';
      progressBar.style.width = '0%';
      stepEls.forEach(el => {
        const dot = el.querySelector('.demo-dot');
        dot.className = 'demo-dot inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600 bg-white';
      });
      Array.from(filesEl.querySelectorAll('.file-chip')).forEach(ch => ch.classList.remove('animate-pulse'));
      fileItems.forEach(f => f.classList.remove('bg-brand-50','border','border-brand-300'));
      aiBeams && aiBeams.classList.remove('on');
      progressBar.classList.remove('progress-anim');
    }

    function log(msg){
      const d = document.createElement('div');
      d.textContent = '• ' + msg;
      logEl.appendChild(d);
      logEl.scrollTop = logEl.scrollHeight;
    }

    function setStep(i){
      stepEls.forEach((el, idx)=>{
        const dot = el.querySelector('.demo-dot');
        if(idx < i){ dot.className = 'demo-dot inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white text-xs'; }
        else if(idx === i){ dot.className = 'demo-dot inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand-600 text-xs text-brand-700 bg-white ring-4 ring-brand-100 animate-pulse'; }
        else { dot.className = 'demo-dot inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-600'; }
      });
      progressBar.style.width = Math.round((i/steps.length)*100) + '%';
    }

    function typeText(el, text, speed){
      return new Promise(resolve=>{
        el.textContent = '';
        let i = 0;
        const iv = setInterval(()=>{
          el.textContent += text.charAt(i++);
          if(i >= text.length){ clearInterval(iv); resolve(); }
        }, speed || 16);
      });
    }

    async function typeTextInElement(el, text, speed = 20){
      return new Promise(resolve => {
        let i = 0;
        el.textContent = '';
        const interval = setInterval(() => {
          if(i < text.length){
            el.textContent += text.charAt(i);
            i++;
          } else {
            clearInterval(interval);
            resolve();
          }
        }, speed);
      });
    }

    function createResultSkeleton(filename){
      const doc = docDatabase[filename];
      if(!doc) return;
      const priorityColor = doc.priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' : doc.priority === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-green-50 text-green-700 border-green-200';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'rounded-xl border border-slate-200 bg-white p-3 shadow-subtle';
      wrapper.style.animation = 'fadeIn 0.5s ease-in';
      wrapper.dataset.filename = filename;
      wrapper.innerHTML = `
        <div class="skeleton-lines space-y-1.5">
          <div class="skeleton-line" style="width: 100%;"></div>
          <div class="skeleton-line" style="width: 60%;"></div>
          <div class="skeleton-line" style="width: 80%;"></div>
        </div>
        <div class="result-content hidden">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-slate-800 filename-text"></p>
            <span class="text-[10px] px-2 py-0.5 rounded-full ${priorityColor} border font-medium">${doc.priority}</span>
          </div>
          <p class="mt-1 text-xs text-slate-600 dept-text"></p>
          <div class="mt-2 flex flex-wrap gap-1">
            ${doc.tags.map(t=>`<span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">${t}</span>`).join('')}
          </div>
        </div>
      `;
      resultEl.appendChild(wrapper);
      return wrapper;
    }

    async function populateResult(wrapper, filename){
      const doc = docDatabase[filename];
      if(!doc) return;
      
      // Wait for skeleton animation
      await new Promise(r => setTimeout(r, 600));
      
      // Hide skeleton and show content
      const skeletonLines = wrapper.querySelector('.skeleton-lines');
      const resultContent = wrapper.querySelector('.result-content');
      const filenameText = wrapper.querySelector('.filename-text');
      const deptText = wrapper.querySelector('.dept-text');
      
      skeletonLines.classList.add('hidden');
      resultContent.classList.remove('hidden');
      
      // Type out filename and department
      await typeTextInElement(filenameText, filename, 10);
      await typeTextInElement(deptText, `→ ${doc.dept}`, 15);
    }

    function createSummarySkeleton(filename){
      const doc = docDatabase[filename];
      const iconName = doc?.icon || 'file-text';
      
      const wrapper = document.createElement('div');
      wrapper.className = 'rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800';
      wrapper.style.animation = 'fadeIn 0.5s ease-in';
      wrapper.dataset.filename = filename;
      wrapper.innerHTML = `
        <div class="flex items-start gap-2">
          <i data-lucide="${iconName}" class="w-4 h-4 text-brand-600 mt-0.5 flex-shrink-0"></i>
          <div class="flex-1">
            <div class="skeleton-lines space-y-1.5">
              <div class="skeleton-line" style="width: 100%;"></div>
              <div class="skeleton-line" style="width: 85%;"></div>
              <div class="skeleton-line" style="width: 95%;"></div>
            </div>
            <div class="summary-text whitespace-pre-wrap hidden"></div>
          </div>
        </div>
      `;
      summariesContainer.appendChild(wrapper);
      lucide.createIcons();
      return wrapper;
    }

    async function populateSummary(wrapper, text){
      // Wait for skeleton animation
      await new Promise(r => setTimeout(r, 800));
      
      // Hide skeleton and show text container
      const skeletonLines = wrapper.querySelector('.skeleton-lines');
      const textContainer = wrapper.querySelector('.summary-text');
      skeletonLines.classList.add('hidden');
      textContainer.classList.remove('hidden');
      
      // Type out the text
      await typeTextInElement(textContainer, text, 15);
    }

    function renderFileChips(filenames){
      filesEl.innerHTML = filenames.map(name=>`
        <span class="file-chip inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
          <i data-lucide="file" class="w-3.5 h-3.5 text-brand-700"></i>
          ${name}
        </span>
      `).join('');
      lucide.createIcons();
    }

    async function run(){
      if(running) return; running = true;
      
      const activeList = selectNextBatch();
      renderFileChips(activeList);
      
      // Highlight selected files in tree
      currentBatch.forEach(item => {
        item.classList.add('bg-brand-50','border','border-brand-300');
      });

      // Create skeleton placeholders immediately when files are selected
      const summaryWrappers = {};
      const resultWrappers = {};
      for(const filename of activeList){
        summaryWrappers[filename] = createSummarySkeleton(filename);
        resultWrappers[filename] = createResultSkeleton(filename);
      }

      Array.from(filesEl.querySelectorAll('.file-chip')).forEach(ch => ch.classList.add('animate-pulse'));
      aiBeams && aiBeams.classList.add('on');
      progressBar.classList.add('progress-anim');
      log(`Processing ${activeList.length} document(s) from Local Cloud...`);

      let elapsed = 0;
      for(let i=0;i<steps.length;i++){
        setStep(i);
        log(steps[i].name + '...');
        await new Promise(r=>setTimeout(r, steps[i].dur));
        elapsed += steps[i].dur;
        
        if(steps[i].name === 'Summarization'){
          for(const filename of activeList){
            const doc = docDatabase[filename];
            if(doc){
              await new Promise(r=>setTimeout(r, 300));
              await populateSummary(summaryWrappers[filename], doc.summary);
              log(`✓ Summary generated for ${filename}`);
            }
          }
        }
        
        if(steps[i].name === 'Routing'){
          for(const filename of activeList){
            await new Promise(r=>setTimeout(r, 200));
            await populateResult(resultWrappers[filename], filename);
            log(`✓ Routed to ${docDatabase[filename]?.dept}`);
          }
        }
      }
      
      setStep(steps.length);
      progressBar.style.width = '100%';
      Array.from(filesEl.querySelectorAll('.file-chip')).forEach(ch => ch.classList.remove('animate-pulse'));
      log(`Completed batch in ~${Math.round(elapsed/1000)}s`);
      running = false;
      aiBeams && aiBeams.classList.remove('on');
      progressBar.classList.remove('progress-anim');
      
      // Auto continue after pause
      await new Promise(r=>setTimeout(r, 2000));
      resetDemo();
      await new Promise(r=>setTimeout(r, 1000));
      run();
    }

    // Start auto-loop
    resetDemo();
    setTimeout(run, 1000);

    // Initialize Lucide icons
    lucide.createIcons();
  })();
