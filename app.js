/**
 * Cami's Diff Scan - Core Client-Side Application Logic
 * Supports robust browser-based extraction of .PDF, .DOCX, .TXT and interactive stepping.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Tab Elements
  const tabFile = document.getElementById('tab-file');
  const tabText = document.getElementById('tab-text');
  const sectionFile = document.getElementById('section-file');
  const sectionText = document.getElementById('section-text');

  // Input Elements
  const fileInput1 = document.getElementById('file-input-1');
  const fileInput2 = document.getElementById('file-input-2');
  const fileLabel1 = document.getElementById('file-label-1');
  const fileLabel2 = document.getElementById('file-label-2');
  const extractedPreview1 = document.getElementById('extracted-preview-1');
  const extractedPreview2 = document.getElementById('extracted-preview-2');

  const textarea1 = document.getElementById('textarea-1');
  const textarea2 = document.getElementById('textarea-2');
  const btnClear1 = document.getElementById('btn-clear-1');
  const btnClear2 = document.getElementById('btn-clear-2');
  const btnSample = document.getElementById('btn-sample');

  // View Mode Toggles
  const viewSplit = document.getElementById('view-split');
  const viewUnified = document.getElementById('view-unified');
  const outputSplit = document.getElementById('output-split');
  const outputUnified = document.getElementById('output-unified');

  // Output Containers
  const renderOlder = document.getElementById('render-older');
  const renderNewer = document.getElementById('render-newer');
  const renderUnified = document.getElementById('render-unified');

  // Status & Stepper Elements
  const diffStatusText = document.getElementById('diff-status-text');
  const diffMetricsPill = document.getElementById('diff-metrics-pill');
  const metricAdd = document.getElementById('metric-add');
  const metricDel = document.getElementById('metric-del');

  const stepperControls = document.getElementById('stepper-controls');
  const stepperCounter = document.getElementById('stepper-counter');
  const btnPrevDiff = document.getElementById('btn-prev-diff');
  const btnNextDiff = document.getElementById('btn-next-diff');

  // State Variables
  let currentMode = 'file'; // 'file' | 'text'
  let currentView = 'split'; // 'split' | 'unified'
  let textBuffer1 = '';
  let textBuffer2 = '';
  let diffChunks = [];
  let diffNodesOlder = [];
  let diffNodesNewer = [];
  let activeStepIndex = -1;

  // =========================================================================
  // 1. TAB TOGGLE LOGIC
  // =========================================================================
  tabFile.addEventListener('click', () => {
    currentMode = 'file';
    tabFile.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-indigo-600 text-white shadow-sm';
    tabText.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all duration-200';
    sectionFile.classList.remove('hidden');
    sectionFile.classList.add('flex');
    sectionText.classList.remove('flex');
    sectionText.classList.add('hidden');
    compareAndRender();
  });

  tabText.addEventListener('click', () => {
    currentMode = 'text';
    tabText.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-indigo-600 text-white shadow-sm';
    tabFile.className = 'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all duration-200';
    sectionText.classList.remove('hidden');
    sectionText.classList.add('flex');
    sectionFile.classList.remove('flex');
    sectionFile.classList.add('hidden');
    compareAndRender();
  });

  // =========================================================================
  // 2. VIEW TOGGLE LOGIC (Split vs Unified)
  // =========================================================================
  viewSplit.addEventListener('click', () => {
    currentView = 'split';
    viewSplit.className = 'px-3 py-1.5 rounded-md font-medium bg-slate-800 text-white shadow-sm transition';
    viewUnified.className = 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-white transition';
    outputSplit.style.display = 'grid';
    outputUnified.style.display = 'none';
  });

  viewUnified.addEventListener('click', () => {
    currentView = 'unified';
    viewUnified.className = 'px-3 py-1.5 rounded-md font-medium bg-slate-800 text-white shadow-sm transition';
    viewSplit.className = 'px-3 py-1.5 rounded-md font-medium text-slate-400 hover:text-white transition';
    outputUnified.style.display = 'flex';
    outputSplit.style.display = 'none';
  });

  // =========================================================================
  // 3. FILE EXTRACTION PARSERS (.PDF, .DOCX, .TXT)
  // =========================================================================
  async function parseFileContent(file, targetBufferIndex, labelElement, previewElement) {
    if (!file) return;

    labelElement.textContent = `Parsing ${file.name}...`;
    previewElement.classList.remove('hidden');
    previewElement.textContent = `Extracting pure text from [${file.name}]...`;

    try {
      let extractedText = '';
      const extension = file.name.split('.').pop().toLowerCase();

      if (extension === 'pdf') {
        extractedText = await extractTextFromPDF(file);
      } else if (extension === 'docx') {
        extractedText = await extractTextFromDOCX(file);
      } else {
        // Default TXT / Markdown
        extractedText = await file.text();
      }

      // Store in respective buffer
      if (targetBufferIndex === 1) {
        textBuffer1 = extractedText;
      } else {
        textBuffer2 = extractedText;
      }

      labelElement.textContent = `${file.name}`;
      previewElement.textContent = extractedText.substring(0, 180) + '...';
      
      compareAndRender();
    } catch (err) {
      console.error('File parsing error:', err);
      labelElement.textContent = 'Parsing Failed';
      previewElement.textContent = `Error: ${err.message || 'Could not decode file format'}`;
    }
  }

  // Pure Client-Side PDF Parsing via Mozilla PDF.js
  async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText.trim();
  }

  // Pure Client-Side DOCX Parsing via Mammoth.js
  async function extractTextFromDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  // Input Event Listeners
  fileInput1.addEventListener('change', (e) => parseFileContent(e.target.files[0], 1, fileLabel1, extractedPreview1));
  fileInput2.addEventListener('change', (e) => parseFileContent(e.target.files[0], 2, fileLabel2, extractedPreview2));

  // Drag and Drop Enhancements
  const setupDropzone = (dropzoneId, inputId) => {
    const dz = document.getElementById(dropzoneId);
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('border-indigo-500'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('border-indigo-500'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('border-indigo-500');
      const input = document.getElementById(inputId);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  };
  setupDropzone('dropzone-1', 'file-input-1');
  setupDropzone('dropzone-2', 'file-input-2');

  // Direct Textarea Sync
  textarea1.addEventListener('input', () => { textBuffer1 = textarea1.value; compareAndRender(); });
  textarea2.addEventListener('input', () => { textBuffer2 = textarea2.value; compareAndRender(); });

  btnClear1.addEventListener('click', () => { textarea1.value = ''; textBuffer1 = ''; compareAndRender(); });
  btnClear2.addEventListener('click', () => { textarea2.value = ''; textBuffer2 = ''; compareAndRender(); });

  // =========================================================================
  // 4. DEMO RESUME POPULATOR
  // =========================================================================
  btnSample.addEventListener('click', () => {
    const sampleOld = `ALEXANDER MERCER
Senior Software Engineer | Cloud Platforms
Email: alex.mercer@gmail.com | Phone: (555) 123-4567

EDUCATION
B.S. in Computer Science - University of California, Berkeley
GPA: 3.75 / 4.0

PROFESSIONAL EXPERIENCE
Google - Senior Platform Engineer (2022 - Present)
- Designed highly scalable distributed microservices processing 450,000 requests per second.
- Reduced overall tail latency by 18% through Redis cache optimization and connection pooling.
- Mentored 4 junior software engineers and led core infrastructure code reviews.

Acme Corp - Software Engineer (2019 - 2022)
- Built backend APIs using Python and Node.js with 99.9% uptime SLA.`;

    const sampleNew = `ALEXANDER MERCER
Principal Software Engineer | Cloud Infrastructure
Email: alex.mercer@gmail.com | Phone: (555) 123-4567

EDUCATION
B.S. in Computer Science - University of California, Berkeley
GPA: 3.82 / 4.0 (Magna Cum Laude)

PROFESSIONAL EXPERIENCE
Google - Lead Staff Engineer (2022 - Present)
- Architected resilient distributed microservices processing over 650,000 requests per second.
- Reduced overall tail latency by 24% through advanced Spanner connection pooling.
- Spearheaded zero-trust identity authentication rollout for 12,000 internal services.
- Mentored 6 junior engineers and chaired the infrastructure technical review board.

Acme Corp - Software Engineer (2019 - 2022)
- Built secure backend APIs using Python and Go with 99.95% uptime SLA.`;

    // Populate buffers
    textBuffer1 = sampleOld;
    textBuffer2 = sampleNew;
    textarea1.value = sampleOld;
    textarea2.value = sampleNew;
    
    // Switch to Direct Text tab to instantly show off
    tabText.dispatchEvent(new Event('click'));
  });

  // =========================================================================
  // 5. HIGH-FIDELITY DIFFING ENGINE & RENDERING
  // =========================================================================
  function compareAndRender() {
    const t1 = (textBuffer1 || '').trim();
    const t2 = (textBuffer2 || '').trim();

    if (!t1 && !t2) {
      diffStatusText.textContent = 'Awaiting Input Documents';
      diffMetricsPill.style.display = 'none';
      stepperControls.style.display = 'none';
      renderOlder.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-600 py-12 text-center"><i data-lucide="split" class="w-10 h-10 mb-3 stroke-[1.5]"></i><p class="text-xs font-sans">Upload older resume version or paste text above to compare.</p></div>`;
      renderNewer.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-600 py-12 text-center"><i data-lucide="sparkles" class="w-10 h-10 mb-3 stroke-[1.5]"></i><p class="text-xs font-sans">Upload newer resume version or paste text above to spot tweaks.</p></div>`;
      renderUnified.innerHTML = '';
      lucide.createIcons();
      return;
    }

    diffStatusText.textContent = 'Comparing...';

    // Run jsdiff diffWordsWithSpace
    diffChunks = Diff.diffWordsWithSpace(t1, t2);

    let additionsCount = 0;
    let deletionsCount = 0;

    let olderHTML = '';
    let newerHTML = '';
    let unifiedHTML = '';

    diffNodesOlder = [];
    diffNodesNewer = [];

    let diffGlobalIndex = 0;

    diffChunks.forEach((chunk) => {
      const escaped = escapeHtml(chunk.value);
      const isWhitespaceOnly = !chunk.value.trim();

      if (chunk.added) {
        if (!isWhitespaceOnly) additionsCount += chunk.value.trim().split(/\s+/).length;
        const markId = `diff-tweak-${diffGlobalIndex}`;
        
        // Add to Newer Document
        newerHTML += `<mark id="newer-${markId}" class="diff-add diff-step-target" data-step="${diffGlobalIndex}">${escaped}</mark>`;
        // Add to Unified Document
        unifiedHTML += `<mark class="diff-add">${escaped}</mark>`;
        
        diffNodesNewer.push(`newer-${markId}`);
        diffGlobalIndex++;
      } else if (chunk.removed) {
        if (!isWhitespaceOnly) deletionsCount += chunk.value.trim().split(/\s+/).length;
        const markId = `diff-tweak-${diffGlobalIndex}`;

        // Add to Older Document
        olderHTML += `<mark id="older-${markId}" class="diff-del diff-step-target" data-step="${diffGlobalIndex}">${escaped}</mark>`;
        // Add to Unified Document
        unifiedHTML += `<mark class="diff-del">${escaped}</mark>`;

        diffNodesOlder.push(`older-${markId}`);
        diffGlobalIndex++;
      } else {
        // Unchanged shared text
        olderHTML += escaped;
        newerHTML += escaped;
        unifiedHTML += escaped;
      }
    });

    renderOlder.innerHTML = olderHTML;
    renderNewer.innerHTML = newerHTML;
    renderUnified.innerHTML = unifiedHTML;

    // Update Header Pill Metrics
    diffMetricsPill.style.display = 'flex';
    metricAdd.textContent = `${additionsCount} Words Added`;
    metricDel.textContent = `${deletionsCount} Words Removed`;

    const totalTweaks = diffNodesNewer.length + diffNodesOlder.length;

    if (totalTweaks === 0) {
      diffStatusText.textContent = 'Documents are 100% Identical';
      stepperControls.style.display = 'none';
    } else {
      diffStatusText.textContent = `${totalTweaks} Wording / Number Tweaks Detected`;
      stepperControls.style.display = 'flex';
      stepperCounter.textContent = `0 of ${totalTweaks}`;
      activeStepIndex = -1;
    }
  }

  // =========================================================================
  // 6. THE "NAKED-EYE SAVER" INTERACTIVE STEPPER
  // =========================================================================
  function stepToDifference(direction) {
    const combinedMarkIds = [...diffNodesOlder, ...diffNodesNewer];
    if (!combinedMarkIds.length) return;

    // Remove active step glowing border from previously active
    document.querySelectorAll('.diff-active-step').forEach(node => node.classList.remove('diff-active-step'));

    if (direction === 'next') {
      activeStepIndex = (activeStepIndex + 1) % combinedMarkIds.length;
    } else {
      activeStepIndex = (activeStepIndex - 1 + combinedMarkIds.length) % combinedMarkIds.length;
    }

    stepperCounter.textContent = `${activeStepIndex + 1} of ${combinedMarkIds.length}`;

    const targetId = combinedMarkIds[activeStepIndex];
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      targetElement.classList.add('diff-active-step');
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  btnNextDiff.addEventListener('click', () => stepToDifference('next'));
  btnPrevDiff.addEventListener('click', () => stepToDifference('prev'));

  // Keyboard Shortcuts for Instant Stepping
  document.addEventListener('keydown', (e) => {
    // Avoid triggering when user is typing in textarea
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    if (e.key === ']' || e.key === 'ArrowDown') {
      e.preventDefault();
      stepToDifference('next');
    } else if (e.key === '[' || e.key === 'ArrowUp') {
      e.preventDefault();
      stepToDifference('prev');
    }
  });

  // Helper Html Escape
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

});
