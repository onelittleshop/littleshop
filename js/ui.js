
// ==================== [模塊：UI & Modals] ====================
function openLoginModal() {
  document.getElementById('loginModal').classList.remove('hidden');
}

function closeLoginModal() {
  document.getElementById('loginModal').classList.add('hidden');
}

function openProfileModal(isForced) {
  document.getElementById('profileModal').classList.remove('hidden');
  const cancelBtn = document.getElementById('cancelProfileBtn');
  const title = document.getElementById('profileModalTitle');
  
  if (isForced) {
    cancelBtn.classList.add('hidden');
    title.textContent = '首次登入：完善個人資料 (必填)';
  } else {
    cancelBtn.classList.remove('hidden');
    title.textContent = '修改個人資料';
  }
  
  document.getElementById('profileNickname').value = currentUser?.nickname || '';
  document.getElementById('profilePhone').value = currentUser?.phone || '';
  document.getElementById('avatarPreviewContainer').innerHTML = currentUser?.avatar_url ? 
    `<img src="${currentUser.avatar_url}" class="w-full h-full object-cover">` : 
    (currentUser?.nickname ? currentUser.nickname.charAt(0).toUpperCase() : 'U');
}

function openUploadModal() {
  if (!currentUser?.isAdmin) return alert('權限不足');
  document.getElementById('uploadModal').classList.remove('hidden');
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
  document.getElementById('endTime').value = tomorrow.toISOString().slice(0, 16);
}

function closeUploadModal() {
  document.getElementById('uploadModal').classList.add('hidden');
  document.getElementById('uploadForm').reset();
  tempImagesBase64 = [];
  document.getElementById('uploadPlaceholder').classList.remove('hidden');
  document.getElementById('imagePreviewContainer').classList.add('hidden');
  document.getElementById('imagePreviewContainer').innerHTML = '';
}

function previewSelectedImages(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  const container = document.getElementById('imagePreviewContainer');
  const placeholder = document.getElementById('uploadPlaceholder');

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width, height = img.height;
        const MAX = 600;
        if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
        else { if (height > MAX) { width *= MAX / height; height = MAX; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
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

  await logActivity('view_item');
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailDesc').textContent = item.desc || '暫無詳細描述';
  document.getElementById('detailCat').textContent = item.subCategory ? `${item.category} / ${item.subCategory}` : item.category;
  document.getElementById('detailLocation').textContent = item.location;
  document.getElementById('detailStartPrice').textContent = item.startPrice;
  document.getElementById('detailIncrement').textContent = item.bidIncrement;
  document.getElementById('detailCurrentPrice').textContent = '$' + item.currentPrice;
  document.getElementById('detailBidCount').textContent = item.bids.length;

  const highestBidder = item.bids.length > 0 ? item.bids[item.bids.length - 1].bidderName : '暫無出價';
  document.getElementById('detailHighestBidder').textContent = '領先者：' + highestBidder;

  // Render images
  currentDetailImageIdx = 0;
  renderDetailImages(item.images);

  // Status badge
  const isEnded = new Date() > new Date(item.endTime) || item.status === 'ended';
  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = isEnded ? '已截標' : '競標中';
  badge.className = `absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold z-20 text-white ${isEnded ? 'bg-rose-500' : 'bg-amber-500'}`;

  // Admin Actions
  const adminGroup = document.getElementById('adminActionGroup');
  if (currentUser?.isAdmin) {
    adminGroup.classList.remove('hidden');
    document.getElementById('adminItemViewBadge').innerHTML = `<i class="fa-regular fa-eye mr-1"></i>狀態: ${item.status}`;
    
    const visBtn = document.getElementById('adminVisibilityBtn');
    visBtn.textContent = item.status === 'hidden' ? '解除隱藏' : '隱藏商品';
    visBtn.className = item.status === 'hidden' ? 'bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md' : 'bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md';

    const bidBtn = document.getElementById('adminBiddableBtn');
    bidBtn.textContent = item.isBiddable ? '鎖定不出價' : '開放出價';
    bidBtn.className = item.isBiddable ? 'bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md' : 'bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md';

    if (isEnded && item.bids.length > 0) {
      const winnerBid = item.bids[item.bids.length - 1];
      const contactBox = document.getElementById('adminWinnerContactBox');
      contactBox.classList.remove('hidden');
      contactBox.innerHTML = `<strong>🏆 得標者：</strong> ${winnerBid.bidderName} | <strong>電話：</strong> ${winnerBid.bidderPhone || '未登記'} <button onclick="copyWinnerInfo('${winnerBid.bidderName}', '${winnerBid.bidderPhone}')" class="ml-2 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px]">複製聯絡資訊</button>`;
    } else {
      document.getElementById('adminWinnerContactBox').classList.add('hidden');
    }
  } else {
    adminGroup.classList.add('hidden');
    document.getElementById('adminWinnerContactBox').classList.add('hidden');
  }

  // Bid Action Area
  const actionArea = document.getElementById('bidActionArea');
  if (!currentUser) {
    actionArea.innerHTML = `<button onclick="openLoginModal()" class="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition">登入參與競標</button>`;
  } else if (isEnded) {
    actionArea.innerHTML = `<div class="text-center py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm">本場拍賣已結標</div>`;
  } else if (!item.isBiddable) {
    actionArea.innerHTML = `<div class="text-center py-3 bg-amber-50 text-amber-800 rounded-xl font-bold text-sm">管理員已暫停本場競標</div>`;
  } else {
    const nextMin = item.currentPrice + item.bidIncrement;
    actionArea.innerHTML = `
      <div class="flex items-center space-x-2">
        <input type="number" id="bidAmountInput" min="${nextMin}" value="${nextMin}" class="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-base font-bold text-slate-900 bg-white">
        <button onclick="placeBid('${item.id}')" class="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition shrink-0">確認出價 (+$${item.bidIncrement})</button>
      </div>
      <p class="text-[10px] text-slate-400 mt-1.5">最低出價需達 $${nextMin} (當前價 + 每口價)</p>
    `;
  }

  // Bid History
  const historyList = document.getElementById('bidHistoryList');
  historyList.innerHTML = item.bids.length === 0 ? '<div class="text-slate-400 text-center py-4 text-xs">暫無出價紀錄</div>' :
    item.bids.slice().reverse().map((b, i) => `
      <div class="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
        <div class="flex items-center space-x-2">
          <span class="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">${item.bids.length - i}</span>
          <span class="font-bold text-slate-800 text-xs">${b.bidderName}</span>
        </div>
        <div class="text-right">
          <span class="font-extrabold text-amber-600 text-xs">$${b.amount}</span>
          <span class="text-[10px] text-slate-400 block">${new Date(b.time).toLocaleTimeString()}</span>
        </div>
      </div>
    `).join('');

  // Countdown timer
  if (detailInterval) clearInterval(detailInterval);
  updateCountdown(item.endTime);
  detailInterval = setInterval(() => updateCountdown(item.endTime), 1000);
}

function renderDetailImages(images) {
  const container = document.getElementById('detailImgContainer');
  const indicator = document.getElementById('multiImgIndicator');
  const prevBtn = document.getElementById('prevImgBtn');
  const nextBtn = document.getElementById('nextImgBtn');

  if (!images || images.length === 0) {
    container.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-bold text-sm">暫無圖片</div>`;
    indicator.classList.add('hidden');
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    return;
  }

  container.innerHTML = images.map(src => `<div class="w-full h-full shrink-0 snap-center"><img src="${src}" class="w-full h-full object-cover"></div>`).join('');
  
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

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  text.textContent = `剩餘 ${hours}時 ${mins}分 ${secs}秒`;
  box.className = 'text-xs font-bold flex items-center space-x-1.5 text-amber-600';
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
  if (detailInterval) clearInterval(detailInterval);
  activeDetailId = null;
}

async function placeBid(itemId) {
  if (!currentUser) return openLoginModal();
  if (!currentUser.phone) {
    alert('⚠️ 您的帳號尚未綁定香港電話，請先前往「修改資料」綁定電話後才能下標！');
    return openProfileModal(false);
  }

  const item = auctions.find(a => a.id === itemId);
  if (!item) return;

  const inputAmt = Number(document.getElementById('bidAmountInput').value);
  const minRequired = item.currentPrice + item.bidIncrement;
  if (inputAmt < minRequired) {
    return alert(`出價金額不得低於 $${minRequired}`);
  }

  const newBid = {
    bidderId: currentUser.id,
    bidderName: currentUser.nickname || '匿名買家',
    bidderPhone: currentUser.phone,
    amount: inputAmt,
    time: new Date().toISOString()
  };

  const updatedBids = [...item.bids, newBid];
  const { error } = await sb.from('items').update({
    current_price: inputAmt,
    bids: updatedBids
  }).eq('id', itemId);

  if (error) {
    alert('出價失敗：' + error.message);
  } else {
    alert('🎉 出價成功！');
    await logActivity('place_bid');
    await fetchAuctions();
    openDetailModal(itemId);
  }
}

async function toggleAuctionVisibility() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newStatus = item.status === 'hidden' ? 'active' : 'hidden';
  await sb.from('items').update({ status: newStatus }).eq('id', activeDetailId);
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

async function toggleAuctionBiddable() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newBiddable = !item.isBiddable;
  await sb.from('items').update({ is_biddable: newBiddable }).eq('id', activeDetailId);
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

function copyWinnerInfo(name, phone) {
  const text = `得標者：${name} | 電話：${phone}`;
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ 得標者資訊已複製到剪貼簿！');
  });
}

// Global init on DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        // Check if admin email or hardcoded admin check
        const email = session.user.email || '';
        const isAdmin = email.includes('admin') || session.user.id === 'YOUR_ADMIN_UUID_HERE'; // Or configure as needed
        currentUser = {
          id: session.user.id,
          nickname: '',
          phone: '',
          avatar_url: session.user.user_metadata?.avatar_url || '',
          isAdmin: session.user.user_metadata?.is_admin || false
        };
        // Explicitly load profile
        await loadUserProfile(session.user.id);
      }

      sb.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          currentUser = {
            id: session.user.id,
            nickname: '',
            phone: '',
            avatar_url: session.user.user_metadata?.avatar_url || '',
            isAdmin: session.user.user_metadata?.is_admin || false
          };
          await loadUserProfile(session.user.id);
        } else {
          currentUser = null;
          updateAuthUI();
        }
      });
    } catch (e) {
      console.warn('Auth session check failed:', e);
    }
  }

  await fetchAuctions();
});
