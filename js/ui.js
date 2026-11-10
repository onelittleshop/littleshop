// ==================== [模塊：UI, View Switch, Sort & Layout] ====================
function switchView(v) {
  currentView = v;
  const tabAll = document.getElementById('tabAll');
  const tabMyBids = document.getElementById('tabMyBids');
  if (v === 'all') {
    tabAll.className = 'px-4 py-1.5 rounded-full text-sm font-medium bg-slate-900 text-white shadow-sm transition';
    tabMyBids.className = 'px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition';
  } else {
    if (!currentUser) { openLoginModal(); return; }
    tabAll.className = 'px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition';
    tabMyBids.className = 'px-4 py-1.5 rounded-full text-sm font-medium bg-slate-900 text-white shadow-sm transition';
  }
  renderAuctions();
}

function setCategory(c) {
  currentCategory = c;
  renderCategoryButtons(); 
  renderAuctions();
}

function changeSort() {
  currentSort = document.getElementById('sortSelect').value;
  renderAuctions();
}

function changeLayout(layout) {
  currentLayout = layout;
  if (layout === 'grid') {
    document.getElementById('layoutGridBtn').className = 'p-1.5 px-2.5 rounded-md bg-white shadow-sm text-slate-700 text-sm transition';
    document.getElementById('layoutListBtn').className = 'p-1.5 px-2.5 rounded-md text-slate-400 hover:text-slate-700 text-sm transition';
  } else {
    document.getElementById('layoutGridBtn').className = 'p-1.5 px-2.5 rounded-md text-slate-400 hover:text-slate-700 text-sm transition';
    document.getElementById('layoutListBtn').className = 'p-1.5 px-2.5 rounded-md bg-white shadow-sm text-slate-700 text-sm transition';
  }
  renderAuctions();
}

function openLoginModal() { document.getElementById('loginModal').classList.remove('hidden'); }
function closeLoginModal() { document.getElementById('loginModal').classList.add('hidden'); }

function openProfileModal(isFirst) {
  if (!currentUser) return;
  const nicknameInput = document.getElementById('profileNickname');
  const phoneInput = document.getElementById('profilePhone');
  nicknameInput.value = currentUser.nickname || '';
  phoneInput.value = currentUser.phone || '';

  if (currentUser.nickname) {
    nicknameInput.disabled = true;
    nicknameInput.className = "w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-sm text-slate-500 cursor-not-allowed";
    document.getElementById('nicknameLockHint').classList.remove('hidden');
  } else {
    nicknameInput.disabled = false;
    nicknameInput.className = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white";
    document.getElementById('nicknameLockHint').classList.add('hidden');
  }

  const hasBids = auctions.some(a => a.bids.some(b => b.bidderId === currentUser.id));
  if (hasBids && currentUser.phone) {
    phoneInput.disabled = true;
    phoneInput.className = "w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-r-lg text-sm text-slate-500 cursor-not-allowed";
    document.getElementById('phoneLockHint').classList.remove('hidden');
  } else {
    phoneInput.disabled = false;
    phoneInput.className = "w-full px-3 py-2 border border-slate-300 rounded-r-lg text-sm bg-white";
    document.getElementById('phoneLockHint').classList.add('hidden');
  }

  document.getElementById('cancelProfileBtn').classList.toggle('hidden', isFirst);
  document.getElementById('profileModal').classList.remove('hidden');
}

function openUploadModal() {
  document.getElementById('uploadForm').reset();
  selectedFilesArray = [];
  const container = document.getElementById('imagePreviewContainer');
  if (container) { container.innerHTML = ''; container.classList.add('hidden'); }
  const placeholder = document.getElementById('uploadPlaceholder');
  if (placeholder) placeholder.classList.remove('hidden');

  document.getElementById('startPrice').value = 10;
  document.getElementById('bidIncrement').value = 5;

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  document.getElementById('endTime').value = `${year}-${month}-${day}T23:59`;

  document.getElementById('itemCategory').value = '';
  document.getElementById('itemSubCategory').value = '';
  document.getElementById('subCatWrapper').classList.add('hidden');
  
  document.getElementById('uploadModal').classList.remove('hidden');
}

function closeUploadModal() { 
  document.getElementById('uploadModal').classList.add('hidden'); 
}

function previewSelectedImages(event) {
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  let combinedFiles = selectedFilesArray.concat(files);
  if (combinedFiles.length > 5) {
    alert('⚠️ 單一物件最多只能上傳 5 張相片！');
    combinedFiles = combinedFiles.slice(0, 5);
  }
  selectedFilesArray = combinedFiles;

  const container = document.getElementById('imagePreviewContainer');
  container.innerHTML = '';
  
  selectedFilesArray.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = "h-full w-24 object-cover rounded-lg border border-slate-200 shrink-0";
      container.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  container.classList.remove('hidden');
  document.getElementById('uploadPlaceholder').classList.add('hidden');
}

setInterval(() => {
  document.querySelectorAll('[data-countdown-id]').forEach(el => {
    const item = auctions.find(a => a.id === el.getAttribute('data-countdown-id'));
    if (item) el.textContent = getCountdownInfo(item.endTime).text;
  });
}, 1000);

// Initialize App Entry Point
// initApp(); --REMOVE TO config.js
