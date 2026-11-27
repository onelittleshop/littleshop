// ==================== [全域輕提示 Toast] ====================
function showToast(message, type = 'info', duration = 2800) {
  const container = document.getElementById('toastContainer');
  if (!container) return alert(message);

  const styles = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    error: 'bg-rose-600 text-white border-rose-500',
    info: 'bg-slate-900 text-white border-slate-700'
  };
  const icons = {
    success: '<i class="fa-solid fa-circle-check mr-2 shrink-0"></i>',
    error: '<i class="fa-solid fa-circle-exclamation mr-2 shrink-0"></i>',
    info: '<i class="fa-solid fa-circle-info mr-2 shrink-0"></i>'
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto flex items-center px-4 py-2.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold transition-all duration-300 opacity-0 -translate-y-2 ${styles[type] || styles.info}`;
  toast.innerHTML = `${icons[type] || icons.info}<span>${String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', '-translate-y-2');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function openRulesModal() {
  document.getElementById('rulesModal')?.classList.remove('hidden');
}

function closeRulesModal() {
  document.getElementById('rulesModal')?.classList.add('hidden');
}

function toggleMobileFilters() {
  const panel = document.getElementById('advancedFilterPanel');
  if (panel) {
    panel.classList.toggle('hidden');
    panel.classList.toggle('flex');
  }
}

function copyItemLink() {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('✅ 已複製商品連結！可直接貼上分享', 'success');
    }).catch(() => {
      prompt('請手動複製以下連結：', url);
    });
  } else {
    prompt('請手動複製以下連結：', url);
  }
}

function setQuickBid(amount) {
  const input = document.getElementById('bidAmountInput');
  if (input) input.value = amount;
}

// ==================== [模塊：UI & Modals] ====================
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function openProfileModal(isForced) {
  const modal = document.getElementById('profileModal');
  if (modal) modal.classList.remove('hidden');
  const cancelBtn = document.getElementById('cancelProfileBtn');
  const title = document.getElementById('profileModalTitle');
  
  if (isForced) {
    if(cancelBtn) cancelBtn.classList.add('hidden');
    if(title) title.textContent = '完善聯絡資料 (選填)';
  } else {
    if(cancelBtn) cancelBtn.classList.remove('hidden');
    if(title) title.textContent = '檢視聯絡資料';
  }
  
  const nickInput = document.getElementById('profileNickname');
  if(nickInput) nickInput.value = currentUser?.nickname || '';

  const phoneInput = document.getElementById('profilePhone');
  if(phoneInput) {
    phoneInput.value = currentUser?.phone || '';
    if (currentUser?.phone) {
      phoneInput.readOnly = true;
      phoneInput.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
      const hint = document.getElementById('phoneLockHint');
      if (hint) {
        hint.textContent = '🔒 電話號碼已鎖定。如需更改，請 IG 私訊管理員。';
        hint.classList.remove('hidden');
      }
    } else {
      phoneInput.readOnly = false;
      phoneInput.classList.remove('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');
      const hint = document.getElementById('phoneLockHint');
      if (hint) hint.classList.add('hidden');
    }
  }
  
  const avatarContainer = document.getElementById('avatarPreviewContainer');
  if (avatarContainer) {
    avatarContainer.innerHTML = currentUser?.avatar_url ? 
      `<img src="${currentUser.avatar_url}" class="w-full h-full object-cover">` : 
      (currentUser?.nickname ? currentUser.nickname.charAt(0).toUpperCase() : 'U');
  }
}

function renderUploadImagePreviews() {
  const container = document.getElementById('imagePreviewContainer');
  const placeholder = document.getElementById('uploadPlaceholder');
  if (!container || !placeholder) return;
  if (tempImagesBase64.length === 0) {
    placeholder.classList.remove('hidden');
    container.classList.add('hidden');
    container.innerHTML = '';
  } else {
    container.innerHTML = tempImagesBase64.map((src, i) => `
      <div class="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-200">
        <img src="${src}" class="w-full h-full object-cover">
        <button type="button" onclick="removeTempImage(${i})" class="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
      </div>
    `).join('');
    placeholder.classList.add('hidden');
    container.classList.remove('hidden');
  }
}

function openUploadModal() {
  if (!currentUser?.isAdmin) return showToast('權限不足', 'error');
  editingAuctionId = null;
  document.getElementById('uploadForm')?.reset();
  tempImagesBase64 = [];
  renderUploadImagePreviews();

  if (typeof isCustomCategoryMode !== 'undefined' && isCustomCategoryMode) {
    toggleNewCategoryInput();
  }

  const titleEl = document.getElementById('uploadModalTitle');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-gavel text-amber-500 mr-2"></i>官方上架新拍賣品';
  const quickBtn = document.getElementById('quickPublishBtn');
  if (quickBtn) quickBtn.innerHTML = '<i class="fa-solid fa-gavel mr-1.5"></i> 快速發布競標';
  const pubBtn = document.getElementById('publishBtn');
  if (pubBtn) pubBtn.textContent = '發布競標';

  const modal = document.getElementById('uploadModal');
  if (modal) modal.classList.remove('hidden');
  
  const endInput = document.getElementById('endTime');
  if (endInput) {
    // 預設 2026年11月30日 22:00 HKT
    const targetDate = new Date('2026-11-30T22:00:00+08:00');
    const localDate = new Date(targetDate.getTime() - (targetDate.getTimezoneOffset() * 60000));
    endInput.value = localDate.toISOString().slice(0, 16);
  }
}

function openEditAuctionModal() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;

  editingAuctionId = item.id;
  document.getElementById('detailModal')?.classList.add('hidden');
  if (detailInterval) clearInterval(detailInterval);

  const modal = document.getElementById('uploadModal');
  if (modal) modal.classList.remove('hidden');

  const titleEl = document.getElementById('uploadModalTitle');
  if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-600 mr-2"></i>編輯拍賣品資料';
  const quickBtn = document.getElementById('quickPublishBtn');
  if (quickBtn) quickBtn.innerHTML = '<i class="fa-solid fa-floppy-disk mr-1.5"></i> 儲存修改';
  const pubBtn = document.getElementById('publishBtn');
  if (pubBtn) pubBtn.textContent = '儲存修改';

  document.getElementById('itemTitle').value = item.title || '';
  document.getElementById('itemSubCategory').value = item.subCategory || '';
  document.getElementById('startPrice').value = item.startPrice;
  document.getElementById('bidIncrement').value = item.bidIncrement;
  document.getElementById('itemDesc').value = item.desc || '';
  const pinChk = document.getElementById('itemIsPinned');
  if (pinChk) pinChk.checked = Boolean(item.isPinned);

  // Category
  if (typeof isCustomCategoryMode !== 'undefined' && isCustomCategoryMode) {
    toggleNewCategoryInput();
  }
  const catSelect = document.getElementById('itemCategorySelect');
  if (catSelect) {
    const hasOption = Array.from(catSelect.options).some(o => o.value === item.category);
    if (hasOption) {
      catSelect.value = item.category;
    } else if (item.category) {
      const opt = document.createElement('option');
      opt.value = item.category;
      opt.textContent = item.category;
      catSelect.appendChild(opt);
      catSelect.value = item.category;
    }
  }

  // End Time
  const endInput = document.getElementById('endTime');
  if (endInput && item.endTime) {
    const d = new Date(item.endTime);
    const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
    endInput.value = localDate.toISOString().slice(0, 16);
  }

  // Method & Location (stored as "面交 · 葵興地鐵站")
  const parts = (item.location || '').split(' · ');
  const methodSelect = document.getElementById('itemMethod');
  const locSelect = document.getElementById('itemLocation');
  if (parts.length >= 2) {
    if (methodSelect && Array.from(methodSelect.options).some(o => o.value === parts[0])) methodSelect.value = parts[0];
    if (locSelect && Array.from(locSelect.options).some(o => o.value === parts[1])) locSelect.value = parts[1];
  }

  // Images
  tempImagesBase64 = Array.isArray(item.images) ? [...item.images] : [];
  renderUploadImagePreviews();
}

function closeUploadModal() {
  editingAuctionId = null;
  document.getElementById('uploadModal').classList.add('hidden');
  document.getElementById('uploadForm').reset();
  tempImagesBase64 = [];
  renderUploadImagePreviews();
}

function applyWatermarkToCanvas(ctx, width, height, text) {
  if (!text) return;
  ctx.save();

  // 1. 中央微淡斜向防盜水印 (不遮擋貨品細節，但防止截圖裁走角落)
  const centerFontSize = Math.max(18, Math.round(Math.min(width, height) * 0.055));
  ctx.font = `700 ${centerFontSize}px "Microsoft JhengHei", "PingFang HK", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 4;
  ctx.fillText(text, 0, 0);
  ctx.restore();

  // 2. 右下角清晰半透明標籤水印 (方便辨識店舖與 IG 導流)
  ctx.save();
  const cornerFontSize = Math.max(12, Math.round(Math.min(width, height) * 0.028));
  ctx.font = `700 ${cornerFontSize}px "Microsoft JhengHei", "PingFang HK", sans-serif`;
  const textMetrics = ctx.measureText(text);
  const padX = Math.round(cornerFontSize * 0.65);
  const padY = Math.round(cornerFontSize * 0.4);
  const boxW = textMetrics.width + padX * 2;
  const boxH = cornerFontSize + padY * 2;
  const margin = Math.round(Math.min(width, height) * 0.025);
  const boxX = width - boxW - margin;
  const boxY = height - boxH - margin;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  const r = Math.min(8, boxH / 2);
  ctx.beginPath();
  ctx.moveTo(boxX + r, boxY);
  ctx.lineTo(boxX + boxW - r, boxY);
  ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  ctx.lineTo(boxX + boxW, boxY + boxH - r);
  ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  ctx.lineTo(boxX + r, boxY + boxH);
  ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  ctx.lineTo(boxX, boxY + r);
  ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2 + 0.5);
  ctx.restore();
}

function previewSelectedImages(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  const container = document.getElementById('imagePreviewContainer');
  const placeholder = document.getElementById('uploadPlaceholder');
  const enableWm = document.getElementById('enableWatermark')?.checked ?? true;
  const wmText = (document.getElementById('watermarkText')?.value || '一間小店 | IG: one_little_shop').trim();

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX = 800;
        if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
        else { if (height > MAX) { width *= MAX / height; height = MAX; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        if (enableWm && wmText) {
          applyWatermarkToCanvas(ctx, width, height, wmText);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        
        if (tempImagesBase64.length < 5) {
          tempImagesBase64.push(dataUrl);
          container.innerHTML = tempImagesBase64.map((src, idx) => `
            <div class="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-200">
              <img src="${src}" class="w-full h-full object-cover">
              <button type="button" onclick="removeTempImage(${idx})" class="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
            </div>
          `).join('');
          placeholder.classList.add('hidden');
          container.classList.remove('hidden');
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function removeTempImage(idx) {
  tempImagesBase64.splice(idx, 1);
  const container = document.getElementById('imagePreviewContainer');
  const placeholder = document.getElementById('uploadPlaceholder');
  if (tempImagesBase64.length === 0) {
    placeholder.classList.remove('hidden');
    container.classList.add('hidden');
    container.innerHTML = '';
  } else {
    container.innerHTML = tempImagesBase64.map((src, i) => `
      <div class="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-200">
        <img src="${src}" class="w-full h-full object-cover">
        <button type="button" onclick="removeTempImage(${i})" class="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center">×</button>
      </div>
    `).join('');
  }
}

async function openDetailModal(id) {
  activeDetailId = id;
  const item = auctions.find(a => a.id === id);
  if (!item) return;
  if (typeof markItemAsSeen === 'function') {
    markItemAsSeen(id);
    if (typeof renderAuctions === 'function') renderAuctions();
  }
  
  // 修改網址，加上 ?item= 參數，但不重新載入頁面
  const url = new URL(window.location);
  url.searchParams.set('item', id);
  window.history.pushState({}, '', url);

  await logActivity('auction_detail', id);
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailDesc').textContent = item.desc || '暫無詳細描述';
  document.getElementById('detailCat').textContent = item.subCategory ? `${item.category} / ${item.subCategory}` : item.category;
  document.getElementById('detailLocation').textContent = typeof formatCardLocation === 'function' ? formatCardLocation(item.location) : item.location;
  document.getElementById('detailStartPrice').textContent = item.startPrice;
  document.getElementById('detailIncrement').textContent = item.bidIncrement;
  const isZeroStart = Number(item.startPrice) === 0;
  const zeroBanner = document.getElementById('detailZeroStartBanner');
  if (zeroBanner) {
    if (isZeroStart && !(new Date() > new Date(item.endTime))) {
      zeroBanner.classList.remove('hidden');
      const zeroIncEl = document.getElementById('detailZeroInc');
      if (zeroIncEl) zeroIncEl.textContent = item.bidIncrement;
    } else {
      zeroBanner.classList.add('hidden');
    }
  }
  const priceLabelEl = document.getElementById('detailPriceLabel');
  const currentPriceEl = document.getElementById('detailCurrentPrice');
  if (item.bids.length > 0) {
    priceLabelEl.textContent = '目前出價';
    priceLabelEl.className = 'text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md shadow-sm';
    currentPriceEl.textContent = '$' + item.currentPrice;
    currentPriceEl.className = 'text-3xl font-extrabold text-amber-600';
  } else if (isZeroStart) {
    priceLabelEl.textContent = '💥 無底價起拍';
    priceLabelEl.className = 'text-xs sm:text-sm font-extrabold text-white bg-rose-600 px-2.5 py-1 rounded-md shadow-sm';
    currentPriceEl.textContent = '$0 起';
    currentPriceEl.className = 'text-3xl font-black text-rose-600';
  } else {
    priceLabelEl.textContent = '起標價格';
    priceLabelEl.className = 'text-xs sm:text-sm font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md shadow-sm';
    currentPriceEl.textContent = '$' + item.startPrice;
    currentPriceEl.className = 'text-3xl font-extrabold text-amber-600';
  }
  document.getElementById('detailBidCount').textContent = item.bids.length;

  const highestBidder = item.bids.length > 0 ? item.bids[item.bids.length - 1].bidderName : '暫無出價';
  document.getElementById('detailHighestBidder').textContent = '領先者：' + highestBidder;

  currentDetailImageIdx = 0;
  renderDetailImages(item.images);

  const isEnded = new Date() > new Date(item.endTime);
  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = !item.isVisible ? '已隱藏' : (isEnded ? '已截標' : (!item.isBiddable ? '即將開標' : '競標中'));
  badge.className = `absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold z-20 text-white ${!item.isVisible ? 'bg-slate-800' : (isEnded ? 'bg-rose-500' : (!item.isBiddable ? 'bg-indigo-600' : 'bg-amber-500'))}`;

  const adminGroup = document.getElementById('adminActionGroup');
  if (currentUser?.isAdmin) {
    adminGroup.classList.remove('hidden');
    document.getElementById('adminItemViewBadge').innerHTML = `<i class="fa-regular fa-eye mr-1"></i>瀏覽: ${item.viewCount || 0} 次`;
    
    const pinBtn = document.getElementById('adminPinBtn');
    if (pinBtn) {
      pinBtn.innerHTML = item.isPinned ? '<i class="fa-solid fa-thumbtack mr-1"></i>取消置頂' : '<i class="fa-solid fa-thumbtack mr-1"></i>設為置頂';
      pinBtn.className = item.isPinned ? 'bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md' : 'bg-white/90 hover:bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-md';
    }

    const visBtn = document.getElementById('adminVisibilityBtn');
    visBtn.textContent = !item.isVisible ? '解除隱藏' : '隱藏商品';
    visBtn.className = !item.isVisible ? 'bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md' : 'bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md';

    const bidBtn = document.getElementById('adminBiddableBtn');
    bidBtn.textContent = item.isBiddable ? '鎖定不出價' : '開放出價';
    bidBtn.className = item.isBiddable ? 'bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md' : 'bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md';

    if (item.bids.length > 0) {
      const winnerBid = item.bids[item.bids.length - 1];
      const contactBox = document.getElementById('adminWinnerContactBox');
      contactBox.classList.remove('hidden');
      contactBox.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <strong>🏆 最高出價者：</strong> ${winnerBid.bidderName} <br>
            <span class="text-[10px] text-slate-500">(UUID: ${winnerBid.bidderId})</span>
          </div>
          <button onclick="notifyWinner('${item.id}', '${winnerBid.bidderId}', '${winnerBid.bidderName}')" class="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">發送得標通知</button>
        </div>
      `;
    } else {
      document.getElementById('adminWinnerContactBox').classList.add('hidden');
    }
  } else {
    adminGroup.classList.add('hidden');
    document.getElementById('adminWinnerContactBox').classList.add('hidden');
  }

  const actionArea = document.getElementById('bidActionArea');
  if (!currentUser) {
    actionArea.innerHTML = `<button onclick="closeDetailModal(); openLoginModal();" class="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">登入參與競標</button>`;
  } else if (currentUser.isBlacklisted) {
    actionArea.innerHTML = `<div class="text-center py-3 px-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs sm:text-sm">🚫 您的帳號已被列入黑名單，暫時無法參與競標（如有疑問請 IG 聯絡管理員）</div>`;
  } else if (isEnded) {
    actionArea.innerHTML = `<div class="text-center py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm">本場拍賣已結標</div>`;
  } else if (!item.isBiddable) {
    const safeItemTitle = String(item.title || '').replace(/'/g, "\'");
    actionArea.innerHTML = `
      <div class="text-center py-3.5 px-3 bg-indigo-50 text-indigo-900 border border-indigo-100 rounded-xl space-y-2.5">
        <div class="font-bold text-xs sm:text-sm">✨ 預熱展示中｜11月27日 (五) 22:00 正式開標</div>
        <div class="flex flex-wrap items-center justify-center gap-2">
          <button type="button" onclick="addOpenBidCalendarReminder('${safeItemTitle}')" class="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-sm transition">
            <i class="fa-regular fa-calendar-plus mr-1.5 text-amber-400"></i>加入開標日曆提醒
          </button>
          <a href="https://www.instagram.com/one_little_shop" target="_blank" class="inline-flex items-center justify-center bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white text-xs font-bold px-3.5 py-2 rounded-full shadow-sm hover:opacity-95 transition">
            <i class="fa-brands fa-instagram mr-1.5 text-sm"></i>追蹤 IG 通知
          </a>
        </div>
      </div>`;
  } else {
    const nextMin = item.bids.length === 0 ? item.startPrice : (item.currentPrice + item.bidIncrement);
    const inc = item.bidIncrement;
    actionArea.innerHTML = `
      <div class="flex flex-wrap gap-1.5 mb-2">
        <button type="button" onclick="setQuickBid(${nextMin})" class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition">最低 $${nextMin}</button>
        <button type="button" onclick="setQuickBid(${nextMin + inc})" class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition">+1口 ($${nextMin + inc})</button>
        <button type="button" onclick="setQuickBid(${nextMin + inc * 2})" class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition">+2口 ($${nextMin + inc * 2})</button>
        <button type="button" onclick="setQuickBid(${nextMin + inc * 5})" class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition">+5口 ($${nextMin + inc * 5})</button>
      </div>
      <div class="flex items-center space-x-2">
        <input type="number" id="bidAmountInput" min="${nextMin}" step="${inc}" value="${nextMin}" class="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-base font-bold text-slate-900 bg-white">
        <button onclick="placeBid('${item.id}')" class="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition shrink-0">確認出價</button>
      </div>
      <p class="text-[10px] text-slate-400 mt-1.5">最低出價 $${nextMin}，每口 +$${inc}｜最後 1 分鐘出價自動延長 5 分鐘</p>
    `;
  }

  const historyList = document.getElementById('bidHistoryList');
  historyList.innerHTML = item.bids.length === 0 ? '<div class="text-slate-400 text-center py-4 text-xs">暫無出價紀錄</div>' :
    item.bids.slice().reverse().map((b, i) => `
      <div class="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
        <div class="flex items-center space-x-2 min-w-0">
          <span class="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center shrink-0">${item.bids.length - i}</span>
          <span class="font-bold text-slate-800 text-xs truncate">${b.bidderName}</span>
          ${currentUser?.isAdmin ? `<button onclick="adminBlacklistUser('${b.bidderId}', '${String(b.bidderName || '').replace(/'/g, "\'")}')" title="列入黑名單" class="text-[10px] text-rose-500 hover:bg-rose-100 px-1.5 py-0.5 rounded transition shrink-0"><i class="fa-solid fa-ban"></i></button>` : ''}
        </div>
        <div class="text-right shrink-0 ml-2">
          <span class="font-extrabold text-amber-600 text-xs">$${b.amount}</span>
          <span class="text-[10px] text-slate-400 block">${new Date(b.time).toLocaleString()}</span>
        </div>
      </div>
    `).join('');

  if (detailInterval) clearInterval(detailInterval);
  updateCountdown(item.endTime);
  detailInterval = setInterval(() => updateCountdown(item.endTime), 1000);
}

function renderDetailImages(images) {
  const container = document.getElementById('detailImgContainer');
  const indicator = document.getElementById('multiImgIndicator');
  const prevBtn = document.getElementById('prevImgBtn');
  const nextBtn = document.getElementById('nextImgBtn');
  const zoomHint = document.getElementById('detailZoomHint');

  if (!images || images.length === 0) {
    container.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-bold text-sm"><img src="./logo.png" class="w-full h-full object-contain p-8"></div>`;
    indicator.classList.add('hidden');
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    if (zoomHint) zoomHint.classList.add('hidden');
    return;
  }

  container.innerHTML = images.map((src, idx) => `<div onclick="openImageLightbox(${idx})" class="w-full h-full shrink-0 snap-center flex items-center justify-center bg-slate-100 cursor-zoom-in"><img src="${src}" onerror="this.src='./logo.png'" class="w-full h-full object-contain"></div>`).join('');
  if (zoomHint) zoomHint.classList.remove('hidden');

  if (images.length > 1) {
    indicator.classList.remove('hidden');
    prevBtn.classList.remove('hidden');
    nextBtn.classList.remove('hidden');
    indicator.innerHTML = images.map((_, i) => `<span class="w-2 h-2 rounded-full mx-1 ${i === currentDetailImageIdx ? 'bg-white' : 'bg-white/50'}"></span>`).join('');
  } else {
    indicator.classList.add('hidden');
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
  }
}

function scrollDetailImages(direction) {
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item || !item.images) return;
  currentDetailImageIdx += direction;
  if (currentDetailImageIdx < 0) currentDetailImageIdx = item.images.length - 1;
  if (currentDetailImageIdx >= item.images.length) currentDetailImageIdx = 0;

  const container = document.getElementById('detailImgContainer');
  container.scrollTo({ left: container.clientWidth * currentDetailImageIdx, behavior: 'smooth' });
  
  const indicator = document.getElementById('multiImgIndicator');
  indicator.innerHTML = item.images.map((_, i) => `<span class="w-2 h-2 rounded-full mx-1 ${i === currentDetailImageIdx ? 'bg-white' : 'bg-white/50'}"></span>`).join('');
}

function updateCountdown(endTimeStr) {
  const now = new Date();
  const end = new Date(endTimeStr);
  const diff = end - now;
  const box = document.getElementById('detailCountdownBox');
  const text = document.getElementById('detailCountdownText');

  if (diff <= 0) {
    text.textContent = '已截標';
    box.className = 'text-xs font-bold flex items-center space-x-1.5 text-rose-500';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  text.textContent = days > 0 ? `剩餘 ${days}天 ${hours}時 ${mins}分 ${secs}秒` : `剩餘 ${hours}時 ${mins}分 ${secs}秒`;
  box.className = 'text-xs font-bold flex items-center space-x-1.5 text-amber-600';
}

function closeDetailModal() {
  const modal = document.getElementById('detailModal');
  if (modal) modal.classList.add('hidden');
  if (detailInterval) clearInterval(detailInterval);
  activeDetailId = null;
  
  // 關閉時清除 URL 上的 item 參數
  const url = new URL(window.location);
  url.searchParams.delete('item');
  window.history.pushState({}, '', url);
}

async function toggleAuctionPinned() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newPinned = !item.isPinned;
  const { error } = await sb.from('auctions').update({ is_pinned: newPinned }).eq('id', activeDetailId);
  if (error) return showToast('更新置頂狀態失敗：' + error.message, 'error');
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

async function toggleAuctionVisibility() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newVisible = !item.isVisible;
  const { error } = await sb.from('auctions').update({ is_visible: newVisible }).eq('id', activeDetailId);
  if (error) return showToast('更新狀態失敗：' + error.message, 'error');
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

async function toggleAuctionBiddable() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newBiddable = !item.isBiddable;
  const { error } = await sb.from('auctions').update({ is_biddable: newBiddable }).eq('id', activeDetailId);
  if (error) return showToast('更新狀態失敗：' + error.message, 'error');
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

async function notifyWinner(auctionId, winnerId, winnerName) {
  if (!currentUser?.isAdmin) return;
  const item = auctions.find(a => a.id === auctionId);
  if (!item) return;

  const firstImage = item.images && item.images.length > 0 ? item.images[0] : '';
  const imgPrefix = firstImage ? `[[IMG:${firstImage}]]\n` : '';

  const content = `${imgPrefix}恭喜您！您已成功得標【${item.title}】🎉\n結標金額為：$${item.currentPrice}\n交收地點：${item.location}\n\n請直接回覆此訊息與我們確認交收時間與細節，謝謝！`;

  const { error } = await sb.from('messages').insert([{
    user_id: winnerId,
    sender_id: currentUser.id,
    receiver_id: winnerId,
    sender_name: '官方管理員',
    receiver_name: winnerName,
    auction_id: auctionId,
    content: content
  }]);

  if (error) {
    showToast('發送通知失敗：' + error.message, 'error');
  } else {
    showToast('✅ 已發送得標通知給買家！', 'success');
    fetchUserMessages();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user);
      }

      sb.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          currentUser = null;
          updateAuthUI();
        }
      });
    } catch (e) {
      console.warn('Auth session check failed:', e);
    }
  }

  await logActivity('home');
  await fetchAuctions();
  initRealtimeAuctions();
  
  // 檢查獨立連結參數 (例如: ?item=uuid)
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('item');
  if (itemId) {
    // 如果 fetchAuctions 完成後有這個 ID，直接打開 Modal
    setTimeout(() => {
      openDetailModal(itemId);
    }, 500); // 稍微延遲確保資料渲染完成
  }
});

function openAdminMsgModal() { 
  document.getElementById('adminMsgModal').classList.remove('hidden'); 
}
function closeAdminMsgModal() { document.getElementById('adminMsgModal').classList.add('hidden'); }

async function handleAdminSendMessage(e) {
  e.preventDefault();
  if (!currentUser?.isAdmin) return showToast('權限不足', 'error');
  const targetUuid = document.getElementById('adminTargetUuid').value.trim();
  const content = document.getElementById('adminMsgContent').value.trim();

  const { error } = await sb.from('messages').insert([{
    user_id: targetUuid,
    sender_id: currentUser.id,
    receiver_id: targetUuid,
    sender_name: '官方管理員',
    receiver_name: '用戶',
    content: content
  }]);

  if (error) {
    showToast('發送失敗：' + error.message, 'error');
  } else {
    showToast('✅ 訊息已發送！', 'success');
    closeAdminMsgModal();
    document.getElementById('adminMsgContent').value = '';
    document.getElementById('adminTargetUuid').value = '';
    fetchUserMessages();
  }
}

let isCustomCategoryMode = false;
function toggleNewCategoryInput() {
  isCustomCategoryMode = !isCustomCategoryMode;
  const selectEl = document.getElementById('itemCategorySelect');
  const customEl = document.getElementById('itemCategoryCustom');
  const btnText = document.getElementById('toggleCatBtnText');

  if (isCustomCategoryMode) {
    selectEl.classList.add('hidden');
    customEl.classList.remove('hidden');
    customEl.value = '';
    customEl.focus();
    btnText.textContent = '返回選擇現有';
  } else {
    customEl.classList.add('hidden');
    selectEl.classList.remove('hidden');
    btnText.textContent = '新增分類';
  }
}

function handleCategorySelectChange(selectEl) {
  // Can be used if needed
}

// ==================== [雙向訊息系統 (完整對齊用戶 ID 匹配)] ====================
let activeChatUserId = null;
let activeChatAuctionId = null;

async function fetchUserMessages() {
  if (!currentUser || !currentUser.id || !sb) return;
  
  let query = sb.from('messages').select('*').order('created_at', { ascending: true });

  if (currentUser.isAdmin) {
    const { data } = await query;
    userMessages = data || [];
  } else {
    // 普通用戶：抓取所有與自己帳號相關的訊息
    const { data } = await query.or(`user_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id},sender_id.eq.${currentUser.id}`);
    userMessages = data || [];
  }
  
  const unreadCount = userMessages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;
  const badge = document.getElementById('unreadMsgBadge');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function getConversations() {
  const convos = {};
  userMessages.forEach(m => {
    let partnerId, partnerName;
    if (currentUser.isAdmin) {
      partnerId = m.user_id === currentUser.id ? (m.sender_id === currentUser.id ? m.receiver_id : m.sender_id) : m.user_id;
      partnerName = m.sender_id === currentUser.id ? (m.receiver_name || '用戶') : (m.sender_name || '用戶');
    } else {
      partnerId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
      partnerName = m.sender_id === currentUser.id ? (m.receiver_name || '官方管理員') : (m.sender_name || '官方管理員');
    }
    
    const threadKey = m.auction_id ? `${m.user_id || partnerId}_${m.auction_id}` : `${m.user_id || partnerId}_general`;
    
    if (!convos[threadKey]) {
      // 嘗試從本地的 auctions 陣列找出這則訊息對應的拍賣品名稱
      let aucTitle = '專屬訂單對話';
      if (m.auction_id && typeof auctions !== 'undefined') {
        const found = auctions.find(a => a.id === m.auction_id);
        if (found && found.title) aucTitle = found.title;
      }
      
      convos[threadKey] = {
        partnerId: m.user_id || partnerId,
        partnerName: partnerName,
        auctionId: m.auction_id,
        auctionTitle: aucTitle,
        messages: [],
        lastMessage: m,
        unreadCount: 0
      };
    }
    
    convos[threadKey].messages.push(m);
    if (m.receiver_id === currentUser.id && !m.is_read) {
      convos[threadKey].unreadCount++;
    }
    convos[threadKey].messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  });
  
  return Object.values(convos).sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));
}

let chatPollInterval = null;

function closeMessagesModal() {
  const modal = document.getElementById('messagesModal');
  if (modal) modal.classList.add('hidden');
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
  // Reset mobile view when closing
  const sidebar = document.getElementById('messagesSidebar');
  const chatContainer = document.getElementById('messagesChatContainer');
  if (sidebar) { sidebar.classList.remove('hidden'); sidebar.classList.add('flex'); }
  if (chatContainer) { chatContainer.classList.add('hidden'); chatContainer.classList.remove('flex'); }
}

function backToListMobile() {
  const sidebar = document.getElementById('messagesSidebar');
  const chatContainer = document.getElementById('messagesChatContainer');
  if (sidebar) {
    sidebar.classList.remove('hidden');
    sidebar.classList.add('flex');
  }
  if (chatContainer) {
    chatContainer.classList.add('hidden');
    chatContainer.classList.remove('flex');
  }
  activeChatUserId = null;
  activeChatAuctionId = null;
  showMessagesList(); // Re-render to clear active highlight
}

async function openMessagesModal() {
  if (typeof logActivity === 'function') await logActivity('messages_view');
  const modal = document.getElementById('messagesModal');
  if (modal) modal.classList.remove('hidden');
  
  // Ensure layout is correct on open (sidebar visible, chat hidden on mobile)
  const sidebar = document.getElementById('messagesSidebar');
  const chatContainer = document.getElementById('messagesChatContainer');
  if(sidebar) { sidebar.classList.remove('hidden'); sidebar.classList.add('flex'); }
  if(chatContainer) { chatContainer.classList.add('hidden'); chatContainer.classList.remove('flex'); }
  
  const emptyState = document.getElementById('messagesEmptyState');
  if (emptyState) emptyState.classList.remove('hidden');
  
  activeChatUserId = null;
  activeChatAuctionId = null;

  showMessagesList();
  
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(async () => {
    if (!currentUser) return;
    const prevCount = userMessages.length;
    await fetchUserMessages();
    if (userMessages.length > prevCount) {
      const cContainer = document.getElementById('messagesChatContainer');
      if (cContainer && (!cContainer.classList.contains('hidden') || cContainer.classList.contains('sm:flex'))) {
         renderChatHistory();
      }
      showMessagesList();
    }
  }, 4000);
}

function showMessagesList() {
  const container = document.getElementById('messagesListContainer');
  if (!container) return;
  
  try {
    const convos = getConversations();

    if (convos.length === 0) {
      container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs flex flex-col items-center"><i class="fa-regular fa-comments text-3xl mb-3 text-slate-200"></i>目前沒有任何對話紀錄</div>';
      return;
    }

    container.innerHTML = convos.map(c => {
      const isUnread = c.unreadCount > 0;
      
      const safeTitle = String(c.auctionTitle || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const itemInfo = c.auctionId ? `<span class="text-[9px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 ml-1.5 shadow-sm truncate max-w-[80px] sm:max-w-[100px] inline-block align-bottom"><i class="fa-solid fa-gavel mr-1"></i>${safeTitle}</span>` : '';
      
      let previewText = String(c.lastMessage.content || '').replace(/\[\[IMG:.+?\]\]\n?/g, '[圖片] ');
      previewText = previewText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      const isActive = (c.partnerId === activeChatUserId && c.auctionId === activeChatAuctionId);
      const activeClasses = isActive ? 'bg-slate-200 shadow-inner' : 'bg-transparent hover:bg-slate-100';
      
      let dateStr = '';
      try {
         dateStr = c.lastMessage.created_at ? new Date(c.lastMessage.created_at).toLocaleDateString(undefined, {month:'numeric', day:'numeric'}) : '';
      } catch(e) {}
      
      const pName = String(c.partnerName || 'U');
      const avatarChar = pName.charAt(0).toUpperCase();
      
      const safePartnerId = String(c.partnerId || '').replace(/'/g, "\'");
      const safeAuctionId = String(c.auctionId || '').replace(/'/g, "\'");
      const safePartnerName = pName.replace(/'/g, "\'").replace(/"/g, "&quot;");

      return `
        <div onclick="openChat('${safePartnerId}', '${safeAuctionId}', '${safePartnerName}')" class="p-3 rounded-xl border border-transparent ${activeClasses} text-xs cursor-pointer transition flex justify-between items-center group mb-0.5 mx-2">
          <div class="flex items-center space-x-3 overflow-hidden w-full">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              ${avatarChar}
            </div>
            <div class="truncate flex-1">
              <div class="flex items-center justify-between">
                <div class="font-bold text-slate-900 text-sm flex items-center truncate pr-2">
                  ${pName} ${itemInfo}
                </div>
                <span class="text-[10px] text-slate-400 shrink-0">${dateStr}</span>
              </div>
              <div class="flex items-center justify-between mt-1">
                <div class="text-slate-500 truncate ${isUnread ? 'font-semibold text-amber-900' : ''}">${previewText}</div>
                ${isUnread ? `<span class="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ml-2">${c.unreadCount}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error rendering message list:", err);
    container.innerHTML = '<div class="text-center py-10 text-rose-500 text-xs">載入對話失敗，請重新整理頁面。</div>';
  }
}

async function openChat(partnerId, auctionId, partnerName) {
  activeChatUserId = partnerId;
  activeChatAuctionId = auctionId || null;
  
  // Mobile / Desktop View Logic
  const sidebar = document.getElementById('messagesSidebar');
  const chatContainer = document.getElementById('messagesChatContainer');
  
  // On mobile: hide sidebar, show chat. On desktop: keep sidebar (sm:flex), show chat.
  if(sidebar) { sidebar.classList.add('hidden', 'sm:flex'); sidebar.classList.remove('flex'); }
  if(chatContainer) { chatContainer.classList.remove('hidden'); chatContainer.classList.add('flex'); }
  
  const emptyState = document.getElementById('messagesEmptyState');
  if (emptyState) emptyState.classList.add('hidden');
  
  document.getElementById('messagesModalTitle').textContent = partnerName;
  
  showMessagesList(); // Re-render to update the active background color
  renderChatHistory();
  
  const unreadIds = userMessages
    .filter(m => m.receiver_id === currentUser.id && !m.is_read && (m.user_id === partnerId || m.sender_id === partnerId) && (m.auction_id || '') === auctionId)
    .map(m => m.id);
    
  if (unreadIds.length > 0 && sb) {
    await sb.from('messages').update({ is_read: true }).in('id', unreadIds);
    userMessages.forEach(m => {
      if (unreadIds.includes(m.id)) m.is_read = true;
    });
    if (typeof updateAuthUI === 'function') {
      const globalUnread = userMessages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;
      const badge = document.getElementById('unreadMsgBadge');
      if (badge) {
        if (globalUnread > 0) { badge.textContent = globalUnread; badge.classList.remove('hidden'); }
        else { badge.classList.add('hidden'); }
      }
    }
    showMessagesList(); // Update unread bubbles in the list instantly
  }
}

function renderChatHistory() {
  const container = document.getElementById('chatHistory');
  if (!container) return;
  
  const threadKey = activeChatAuctionId ? `${activeChatUserId}_${activeChatAuctionId}` : `${activeChatUserId}_general`;
  const convo = getConversations().find(c => (c.auctionId ? `${c.partnerId}_${c.auctionId}` : `${c.partnerId}_general`) === threadKey);
  
  if (!convo) {
    container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">尚無訊息內容</div>';
    return;
  }

  container.innerHTML = convo.messages.map(m => {
    const isMe = m.sender_id === currentUser.id;
    let safeContent = (m.content || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    safeContent = safeContent.replace(/\[\[IMG:(.+?)\]\]/g, '<img src="$1" class="w-full max-w-[200px] h-auto rounded-lg mb-2 object-cover border border-black/10 shadow-sm block">');
    return `
      <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe ? 'bg-amber-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}">
          <div class="whitespace-pre-line leading-relaxed">${safeContent}</div>
          <span class="text-[9px] mt-1.5 block opacity-70 ${isMe ? 'text-right text-amber-100' : 'text-left text-slate-400'}">${m.created_at ? new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
        </div>
      </div>
    `;
  }).join('');
  
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 10);
}

async function handleReplyMessage(e) {
  if(e) e.preventDefault();
  const input = document.getElementById('replyMsgContent');
  const content = input.value.trim();
  if (!content || !activeChatUserId) return;

  input.value = '';
  input.style.height = '';

  const isMeAdmin = currentUser.isAdmin;
  const targetUserId = isMeAdmin ? activeChatUserId : currentUser.id;
  // If not admin, the receiver is the admin we are talking to.
  // We should extract this from the active conversation instead of just finding ANY message.
  let receiverId = null;
  if (isMeAdmin) {
    receiverId = activeChatUserId;
  } else {
    // 找一個該對話串的歷史紀錄來判斷對方的ID
    const msg = userMessages.find(m => (m.user_id === activeChatUserId || m.sender_id === activeChatUserId) && m.sender_id !== currentUser.id);
    receiverId = msg ? msg.sender_id : activeChatUserId; 
  }

  const tempMsg = {
    id: 'temp_' + Date.now(),
    user_id: targetUserId,
    sender_id: currentUser.id,
    receiver_id: receiverId,
    sender_name: currentUser.nickname || (isMeAdmin ? '官方管理員' : '用戶'),
    receiver_name: document.getElementById('messagesModalTitle').textContent,
    auction_id: activeChatAuctionId,
    content: content,
    is_read: false,
    created_at: new Date().toISOString()
  };
  
  userMessages.push(tempMsg);
  renderChatHistory();
  showMessagesList();

  const { error } = await sb.from('messages').insert([{
    user_id: targetUserId,
    sender_id: currentUser.id,
    receiver_id: receiverId,
    sender_name: currentUser.nickname || (isMeAdmin ? '官方管理員' : '用戶'),
    receiver_name: document.getElementById('messagesModalTitle').textContent,
    auction_id: activeChatAuctionId,
    content: content
  }]);

  if (error) {
    showToast('發送失敗：' + error.message, 'error');
    userMessages = userMessages.filter(m => m.id !== tempMsg.id);
    renderChatHistory();
    showMessagesList();
  } else {
    await fetchUserMessages();
    renderChatHistory();
    showMessagesList();
  }
}

// ==================== [Realtime 即時監聽機制] ====================

window.msgSubscription = null;

function initRealtimeMessages() {
  if (!sb || !currentUser) return;
  if (window.msgSubscription) return;

  console.log('啟動即時訊息監聽...');
  window.msgSubscription = sb.channel('chat-room-' + currentUser.id)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      async (payload) => {
        console.log('⚡ 收到 Realtime 新訊息:', payload);
        const prevCount = userMessages.length;
        await fetchUserMessages();
        
        if (userMessages.length > prevCount) {
          const chatContainer = document.getElementById('messagesChatContainer');
          if (chatContainer && !chatContainer.classList.contains('hidden')) {
             renderChatHistory();
          }
          const listContainer = document.getElementById('messagesListContainer');
          if (listContainer && !listContainer.classList.contains('hidden')) {
             showMessagesList();
          }
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime 連線狀態:', status);
    });
}

window.auctionSubscription = null;

function initRealtimeAuctions() {
  if (!sb || window.auctionSubscription) return;
  window.auctionSubscription = sb.channel('public-auctions-live')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'auctions' },
      async (payload) => {
        await fetchAuctions();
        if (activeDetailId && payload.new && payload.new.id === activeDetailId) {
          refreshActiveDetailSilently(activeDetailId);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'bids' },
      async (payload) => {
        await fetchAuctions();
        if (activeDetailId && payload.new && payload.new.auction_id === activeDetailId) {
          refreshActiveDetailSilently(activeDetailId);
        }
      }
    )
    .subscribe();
}

function refreshActiveDetailSilently(id) {
  const item = auctions.find(a => a.id === id);
  if (!item || activeDetailId !== id) return;

  document.getElementById('detailPriceLabel').textContent = item.bids.length > 0 ? '目前出價' : '起標價格';
  document.getElementById('detailCurrentPrice').textContent = '$' + (item.bids.length > 0 ? item.currentPrice : item.startPrice);
  document.getElementById('detailBidCount').textContent = item.bids.length;
  const highestBidder = item.bids.length > 0 ? item.bids[item.bids.length - 1].bidderName : '暫無出價';
  document.getElementById('detailHighestBidder').textContent = '領先者：' + highestBidder;

  const historyList = document.getElementById('bidHistoryList');
  if (historyList) {
    historyList.innerHTML = item.bids.length === 0 ? '<div class="text-slate-400 text-center py-4 text-xs">暫無出價紀錄</div>' :
      item.bids.slice().reverse().map((b, i) => `
        <div class="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
          <div class="flex items-center space-x-2">
            <span class="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">${item.bids.length - i}</span>
            <span class="font-bold text-slate-800 text-xs">${b.bidderName}</span>
          </div>
          <div class="text-right">
            <span class="font-extrabold text-amber-600 text-xs">$${b.amount}</span>
            <span class="text-[10px] text-slate-400 block">${new Date(b.time).toLocaleString()}</span>
          </div>
        </div>
      `).join('');
  }

  // 更新倒數計時器目標（處理防秒殺自動延長後的新時間）
  if (detailInterval) clearInterval(detailInterval);
  updateCountdown(item.endTime);
  detailInterval = setInterval(() => updateCountdown(item.endTime), 1000);

  // 更新最低出價輸入框的最小值
  const nextMin = item.bids.length === 0 ? item.startPrice : (item.currentPrice + item.bidIncrement);
  const bidInput = document.getElementById('bidAmountInput');
  if (bidInput && Number(bidInput.value) < nextMin) {
    bidInput.min = nextMin;
    bidInput.value = nextMin;
  }
}

async function adminBlacklistUser(userId, userName) {
  if (!currentUser?.isAdmin || !userId) return;
  if (!confirm(`確定要將【${userName}】列入黑名單嗎？\n\n列入後該用戶將無法在網站出價。`)) return;
  const { error } = await sb.from('profiles').update({ is_blacklisted: true }).eq('id', userId);
  if (error) {
    showToast('加入黑名單失敗：' + error.message, 'error');
  } else {
    showToast(`🚫 已將【${userName}】列入黑名單`, 'info');
  }
}

// ==================== [商品圖片全螢幕放大檢視 Lightbox] ====================
let lightboxImages = [];
let lightboxCurrentIdx = 0;
let lightboxTouchStartX = 0;

function openImageLightbox(startIdx = 0) {
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item || !item.images || item.images.length === 0) return;

  lightboxImages = item.images;
  lightboxCurrentIdx = (startIdx >= 0 && startIdx < lightboxImages.length) ? startIdx : 0;

  const modal = document.getElementById('imageLightboxModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  updateLightboxView();
}

function updateLightboxView() {
  const imgEl = document.getElementById('lightboxImg');
  const counterEl = document.getElementById('lightboxCounter');
  const prevBtn = document.getElementById('lightboxPrevBtn');
  const nextBtn = document.getElementById('lightboxNextBtn');

  if (imgEl && lightboxImages[lightboxCurrentIdx]) {
    imgEl.src = lightboxImages[lightboxCurrentIdx];
  }
  if (counterEl) {
    counterEl.textContent = lightboxImages.length > 1 ? `${lightboxCurrentIdx + 1} / ${lightboxImages.length}` : '原圖檢視';
  }
  if (prevBtn && nextBtn) {
    if (lightboxImages.length > 1) {
      prevBtn.classList.remove('hidden');
      nextBtn.classList.remove('hidden');
    } else {
      prevBtn.classList.add('hidden');
      nextBtn.classList.add('hidden');
    }
  }
}

function navigateLightbox(direction) {
  if (lightboxImages.length <= 1) return;
  lightboxCurrentIdx += direction;
  if (lightboxCurrentIdx < 0) lightboxCurrentIdx = lightboxImages.length - 1;
  if (lightboxCurrentIdx >= lightboxImages.length) lightboxCurrentIdx = 0;
  updateLightboxView();
}

function closeImageLightbox() {
  const modal = document.getElementById('imageLightboxModal');
  if (modal) modal.classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('imageLightboxModal');
  if (!modal || modal.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeImageLightbox();
  else if (e.key === 'ArrowLeft') navigateLightbox(-1);
  else if (e.key === 'ArrowRight') navigateLightbox(1);
});

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('imageLightboxModal');
  if (!modal) return;
  modal.addEventListener('touchstart', (e) => {
    lightboxTouchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  modal.addEventListener('touchend', (e) => {
    const diff = e.changedTouches[0].screenX - lightboxTouchStartX;
    if (Math.abs(diff) > 40) {
      navigateLightbox(diff > 0 ? -1 : 1);
    }
  }, { passive: true });
});

// ==================== [管理員進階工具：刪除、批次開標、結算總覽、黑名單管理] ====================
async function deleteActiveAuction() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;

  const extraWarn = item.bids.length > 0 ? `\n⚠️ 注意：此商品已有 ${item.bids.length} 筆出價紀錄，刪除後將一併移除且無法復原！` : '\n刪除後將無法復原！';
  if (!confirm(`確定要永久刪除【${item.title}】嗎？${extraWarn}`)) return;

  if (item.bids.length > 0) {
    const { error: bidsDelErr } = await sb.from('bids').delete().eq('auction_id', activeDetailId);
    if (bidsDelErr) {
      return showToast('刪除出價紀錄失敗：' + bidsDelErr.message, 'error');
    }
  }

  const { error } = await sb.from('auctions').delete().eq('id', activeDetailId);
  if (error) {
    showToast('刪除商品失敗：' + error.message, 'error');
  } else {
    showToast('🗑️ 已永久刪除拍賣品', 'info');
    closeDetailModal();
    await fetchAuctions();
  }
}

async function bulkSetBiddable(isBiddable) {
  if (!currentUser?.isAdmin || !sb) return;
  const actionLabel = isBiddable ? '全部開放出價（正式開標）' : '全部鎖定出價（預熱展示中）';
  if (!confirm(`確定要將所有「顯示中」的拍賣品一次過${actionLabel}嗎？`)) return;

  const { error } = await sb.from('auctions').update({ is_biddable: isBiddable }).eq('is_visible', true);
  if (error) {
    showToast('批次更新失敗：' + error.message, 'error');
  } else {
    showToast(`✅ 已將所有顯示中的拍賣品${actionLabel}`, 'success');
    await fetchAuctions();
  }
}

let currentSettlementTab = 'ended';
let adminProfilesMap = {};

async function openSettlementModal() {
  if (!currentUser?.isAdmin || !sb) return;
  document.getElementById('settlementModal')?.classList.remove('hidden');
  const content = document.getElementById('settlementContent');
  if (content) content.innerHTML = '<div class="text-center py-8 text-slate-400 text-xs"><i class="fa-solid fa-spinner fa-spin mr-1"></i>正在載入買家電話與結算資料...</div>';

  await fetchAuctions();
  const { data: profilesData, error } = await sb.from('profiles').select('id, nickname, phone, is_blacklisted, is_admin');
  adminProfilesMap = {};
  if (!error && profilesData) {
    profilesData.forEach(p => { adminProfilesMap[p.id] = p; });
  }
  switchSettlementTab(currentSettlementTab);
}

function closeSettlementModal() {
  document.getElementById('settlementModal')?.classList.add('hidden');
}

function switchSettlementTab(tab) {
  currentSettlementTab = tab;
  const activeCls = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-sm transition';
  const inactiveCls = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
  document.getElementById('settleTabEnded').className = tab === 'ended' ? activeCls : inactiveCls;
  document.getElementById('settleTabAll').className = tab === 'all' ? activeCls : inactiveCls;
  document.getElementById('settleTabBlacklist').className = tab === 'blacklist' ? activeCls : inactiveCls;
  renderSettlementContent();
}

function buildWhatsAppUrl(phone, text) {
  const clean = String(phone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  const fullPhone = clean.length === 8 ? '852' + clean : clean;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

function renderSettlementContent() {
  const container = document.getElementById('settlementContent');
  const summaryEl = document.getElementById('settlementSummaryText');
  if (!container) return;

  if (currentSettlementTab === 'blacklist') {
    const blacklistedUsers = Object.values(adminProfilesMap).filter(p => p.is_blacklisted);
    if (summaryEl) summaryEl.textContent = `目前共有 ${blacklistedUsers.length} 位黑名單用戶`;
    if (blacklistedUsers.length === 0) {
      container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">目前沒有任何黑名單用戶 🎉</div>';
      return;
    }
    container.innerHTML = blacklistedUsers.map(u => `
      <div class="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div>
          <div class="font-bold text-slate-900">${u.nickname || '未命名用戶'}</div>
          <div class="text-slate-500 mt-0.5">電話：${u.phone ? '+852 ' + u.phone : '未填寫'} ｜ <span class="font-mono text-[10px]">${u.id}</span></div>
        </div>
        <button onclick="adminUnblacklistUser('${u.id}', '${String(u.nickname || '').replace(/'/g, "\'")}')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition">
          <i class="fa-solid fa-rotate-left mr-1"></i>解除黑名單
        </button>
      </div>
    `).join('');
    return;
  }

  const now = new Date();
  const targetItems = auctions.filter(item => {
    if (!item.bids || item.bids.length === 0) return false;
    if (currentSettlementTab === 'ended') return now > new Date(item.endTime);
    return true;
  });

  const totalAmount = targetItems.reduce((sum, item) => sum + (item.currentPrice || 0), 0);
  if (summaryEl) {
    summaryEl.textContent = currentSettlementTab === 'ended'
      ? `已截標成交 ${targetItems.length} 件 ｜ 總成交額 HK$${totalAmount.toLocaleString()}`
      : `全部有出價共 ${targetItems.length} 件 ｜ 目前總出價額 HK$${totalAmount.toLocaleString()}`;
  }

  if (targetItems.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs">暫時沒有符合條件的拍賣紀錄</div>';
    return;
  }

  container.innerHTML = targetItems.map(item => {
    const isEnded = now > new Date(item.endTime);
    const img = item.images[0] || './logo.png';

    // 找出不重複買家的最高出價排名 (第一高價、第二高價候補)
    const uniqueBidders = [];
    const seen = new Set();
    for (let i = item.bids.length - 1; i >= 0; i--) {
      const b = item.bids[i];
      if (!seen.has(b.bidderId)) {
        seen.add(b.bidderId);
        uniqueBidders.push(b);
      }
      if (uniqueBidders.length >= 2) break;
    }

    const winner = uniqueBidders[0];
    const runnerUp = uniqueBidders[1] || null;

    const wProfile = adminProfilesMap[winner.bidderId] || {};
    const wPhone = wProfile.phone || '';
    const wMsg = `你好！恭喜你喺「一間小店」成功得標【${item.title}】（結標價 $${winner.amount}，${item.location}），請問幾時方便交收？`;
    const wWaUrl = buildWhatsAppUrl(wPhone, wMsg);

    let runnerUpHtml = '<div class="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">🥈 第二高價候補：暫無其他出價者</div>';
    if (runnerUp) {
      const rProfile = adminProfilesMap[runnerUp.bidderId] || {};
      const rPhone = rProfile.phone || '';
      const rMsg = `你好！關於「一間小店」拍賣品【${item.title}】，由於原得標者未能完成交收，你係第二高價出價者（當時出價 $${runnerUp.amount}），想問你有冇興趣以雙方議定價優先候補購買？`;
      const rWaUrl = buildWhatsAppUrl(rPhone, rMsg);
      runnerUpHtml = `
        <div class="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div>
            <span class="font-bold text-slate-700">🥈 候補：${runnerUp.bidderName}</span>
            <span class="text-amber-600 font-bold ml-1">($${runnerUp.amount})</span>
            <span class="text-slate-500 ml-1">${rPhone ? '📞 ' + rPhone : '未填電話（可站內聯絡）'}</span>
            ${rProfile.is_blacklisted ? '<span class="ml-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[10px]">黑名單</span>' : ''}
          </div>
          <div class="flex items-center gap-1.5">
            ${rWaUrl ? `<a href="${rWaUrl}" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md font-bold transition"><i class="fa-brands fa-whatsapp mr-1"></i>WhatsApp 候補</a>` : ''}
            <button onclick="adminBlacklistUserFromSettle('${runnerUp.bidderId}', '${String(runnerUp.bidderName || '').replace(/'/g, "\'")}')" class="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2 py-1 rounded-md font-bold transition"><i class="fa-solid fa-ban"></i></button>
          </div>
        </div>
      `;
    }

    return `
      <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
        <div class="flex items-start gap-3">
          <img src="${img}" onerror="this.src='./logo.png'" onclick="closeSettlementModal(); openDetailModal('${item.id}')" class="w-16 h-16 rounded-lg object-contain bg-slate-100 shrink-0 cursor-pointer border border-slate-100">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded ${isEnded ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}">${isEnded ? '已截標' : '競標中'}</span>
                <h4 onclick="closeSettlementModal(); openDetailModal('${item.id}')" class="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-amber-600">${item.title}</h4>
              </div>
              <span class="text-base font-extrabold text-amber-600 shrink-0">$${winner.amount} <span class="text-[10px] text-slate-400 font-normal">(${item.bids.length}口)</span></span>
            </div>

            <div class="mt-2 bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span class="font-bold text-emerald-900">🏆 ${isEnded ? '得標者' : '目前領先'}：${winner.bidderName}</span>
                <span class="text-slate-600 ml-2 font-mono">${wPhone ? '📞 ' + wPhone : '未填電話（請用站內通知）'}</span>
                ${wProfile.is_blacklisted ? '<span class="ml-1 px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px]">黑名單</span>' : ''}
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                ${wWaUrl ? `<a href="${wWaUrl}" target="_blank" class="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-sm transition"><i class="fa-brands fa-whatsapp mr-1"></i>WhatsApp 聯絡</a>` : ''}
                <button onclick="notifyWinner('${item.id}', '${winner.bidderId}', '${String(winner.bidderName || '').replace(/'/g, "\'")}')" class="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-sm transition"><i class="fa-solid fa-bell mr-1"></i>站內通知</button>
                <button onclick="adminBlacklistUserFromSettle('${winner.bidderId}', '${String(winner.bidderName || '').replace(/'/g, "\'")}')" title="棄標列入黑名單" class="bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded-lg font-bold text-[11px] shadow-sm transition"><i class="fa-solid fa-ban mr-1"></i>黑名單</button>
              </div>
            </div>

            ${runnerUpHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function adminBlacklistUserFromSettle(userId, userName) {
  await adminBlacklistUser(userId, userName);
  if (adminProfilesMap[userId]) adminProfilesMap[userId].is_blacklisted = true;
  renderSettlementContent();
}

async function adminUnblacklistUser(userId, userName) {
  if (!currentUser?.isAdmin || !userId) return;
  if (!confirm(`確定要解除【${userName}】的黑名單限制嗎？`)) return;
  const { error } = await sb.from('profiles').update({ is_blacklisted: false }).eq('id', userId);
  if (error) {
    showToast('解除黑名單失敗：' + error.message, 'error');
  } else {
    showToast(`✅ 已解除【${userName}】的黑名單限制`, 'success');
    if (adminProfilesMap[userId]) adminProfilesMap[userId].is_blacklisted = false;
    renderSettlementContent();
  }
}

// ==================== [一鍵加入開標日曆提醒 (支援 iPhone .ics 與 Google 日曆)] ====================
const OPEN_BID_TIME_HKT = new Date('2026-11-27T22:00:00+08:00');

function addOpenBidCalendarReminder(itemTitle = '') {
  const title = itemTitle
    ? `🔥 一間小店開標提醒：${itemTitle}`
    : '🔥 一間小店 正式開標！$0起拍搶標';
  const shopUrl = 'https://onelittleshop.github.io/littleshop/?from=calendar';
  const details = `一間小店限時拍賣正式開標！0% 買家手續費，多款精選 $0 無底價起拍！\n立即入場搶頭香：${shopUrl}`;

  // 2026-11-27 22:00 - 22:30 HKT => 20261127T140000Z - 20261127T143000Z
  const startUtc = '20261127T140000Z';
  const endUtc = '20261127T143000Z';

  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent) && !/Chrome|Android/i.test(navigator.userAgent);

  if (isApple) {
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//One Little Shop//Auction Reminder//ZH',
      'BEGIN:VEVENT',
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details.replace(/\n/g, '\\n')}`,
      `LOCATION:${shopUrl}`,
      `URL:${shopUrl}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:DISPLAY',
      'DESCRIPTION:一間小店仲有 5 分鐘就開標啦！',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'one_little_shop_open_bid.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('📅 已產生日曆提醒檔，請按「加入」即可於開標前 5 分鐘響鈴提示！', 'success', 4000);
  } else {
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startUtc}/${endUtc}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(shopUrl)}`;
    window.open(gcalUrl, '_blank');
    showToast('📅 已為您開啟 Google 日曆，按「儲存」即可設定開標提醒！', 'success', 3500);
  }
}

// 控制主頁置頂區「開標提醒」按鈕：開標前顯示，開標後自動隱藏
document.addEventListener('DOMContentLoaded', () => {
  const calBtn = document.getElementById('pinnedCalendarBtn');
  if (calBtn && new Date() < OPEN_BID_TIME_HKT) {
    calBtn.classList.remove('hidden');
  }
});
