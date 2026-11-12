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
  
  const nickInput = document.getElementById('profileNickname');
  nickInput.value = currentUser?.nickname || '';
  if (currentUser?.nickname) {
    nickInput.readOnly = true;
    nickInput.classList.add('bg-slate-100', 'text-slate-500');
    document.getElementById('nicknameLockHint')?.classList.remove('hidden');
  } else {
    nickInput.readOnly = false;
    nickInput.classList.remove('bg-slate-100', 'text-slate-500');
    document.getElementById('nicknameLockHint')?.classList.add('hidden');
  }

  document.getElementById('profilePhone').value = currentUser?.phone || '';
  document.getElementById('avatarPreviewContainer').innerHTML = currentUser?.avatar_url ? 
    `<img src="${currentUser.avatar_url}" class="w-full h-full object-cover">` : 
    (currentUser?.nickname ? currentUser.nickname.charAt(0).toUpperCase() : 'U');
}

function openUploadModal() {
  if (!currentUser?.isAdmin) return alert('權限不足');
  document.getElementById('uploadModal').classList.remove('hidden');
  const now = new Date();
  now.setHours(23, 59, 0, 0);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('endTime').value = now.toISOString().slice(0, 16);
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
        const MAX = 800;
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

  await logActivity('auction_detail', id);
  document.getElementById('detailModal').classList.remove('hidden');
  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailDesc').textContent = item.desc || '暫無詳細描述';
  document.getElementById('detailCat').textContent = item.subCategory ? `${item.category} / ${item.subCategory}` : item.category;
  document.getElementById('detailLocation').textContent = `${item.location}`;
  document.getElementById('detailStartPrice').textContent = item.startPrice;
  document.getElementById('detailIncrement').textContent = item.bidIncrement;
  document.getElementById('detailCurrentPrice').textContent = item.bids.length > 0 ? '$' + item.currentPrice : '尚未出價';
  document.getElementById('detailBidCount').textContent = item.bids.length;

  const highestBidder = item.bids.length > 0 ? item.bids[item.bids.length - 1].bidderName : '暫無出價';
  document.getElementById('detailHighestBidder').textContent = '領先者：' + highestBidder;

  currentDetailImageIdx = 0;
  renderDetailImages(item.images);

  const isEnded = new Date() > new Date(item.endTime);
  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = !item.isVisible ? '已隱藏' : (isEnded ? '已截標' : '競標中');
  badge.className = `absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold z-20 text-white ${!item.isVisible ? 'bg-slate-800' : (isEnded ? 'bg-rose-500' : 'bg-amber-500')}`;

  const adminGroup = document.getElementById('adminActionGroup');
  if (currentUser?.isAdmin) {
    adminGroup.classList.remove('hidden');
    document.getElementById('adminItemViewBadge').innerHTML = `<i class="fa-regular fa-eye mr-1"></i>瀏覽: ${item.viewCount || 0} 次`;
    
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
  } else if (isEnded) {
    actionArea.innerHTML = `<div class="text-center py-3 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm">本場拍賣已結標</div>`;
  } else if (!item.isBiddable) {
    actionArea.innerHTML = `<div class="text-center py-3 bg-amber-50 text-amber-800 rounded-xl font-bold text-sm">管理員已暫停本場競標</div>`;
  } else {
    const nextMin = item.bids.length === 0 ? item.startPrice : (item.currentPrice + item.bidIncrement);
    actionArea.innerHTML = `
      <div class="flex items-center space-x-2">
        <input type="number" id="bidAmountInput" min="${nextMin}" step="${item.bidIncrement}" value="${nextMin}" class="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-base font-bold text-slate-900 bg-white">
        <button onclick="placeBid('${item.id}')" class="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition shrink-0">確認出價</button>
      </div>
      <p class="text-[10px] text-slate-400 mt-1.5">最低出價 $${nextMin}，且只能以每口價 ($${item.bidIncrement}) 的倍數遞增</p>
    `;
  }

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

  if (!images || images.length === 0) {
    container.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400 font-bold text-sm"><img src="./logo.png" class="w-full h-full object-contain p-8"></div>`;
    indicator.classList.add('hidden');
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
    return;
  }

  container.innerHTML = images.map(src => `<div class="w-full h-full shrink-0 snap-center"><img src="${src}" onerror="this.src='./logo.png'" class="w-full h-full object-cover"></div>`).join('');
  
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
  document.getElementById('detailModal').classList.add('hidden');
  if (detailInterval) clearInterval(detailInterval);
  activeDetailId = null;
}

async function toggleAuctionVisibility() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newVisible = !item.isVisible;
  const { error } = await sb.from('auctions').update({ is_visible: newVisible }).eq('id', activeDetailId);
  if (error) return alert('更新狀態失敗：' + error.message);
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

async function toggleAuctionBiddable() {
  if (!currentUser?.isAdmin || !activeDetailId) return;
  const item = auctions.find(a => a.id === activeDetailId);
  if (!item) return;
  const newBiddable = !item.isBiddable;
  const { error } = await sb.from('auctions').update({ is_biddable: newBiddable }).eq('id', activeDetailId);
  if (error) return alert('更新狀態失敗：' + error.message);
  await fetchAuctions();
  openDetailModal(activeDetailId);
}

async function notifyWinner(auctionId, winnerId, winnerName) {
  if (!currentUser?.isAdmin) return;
  const item = auctions.find(a => a.id === auctionId);
  if (!item) return;

  const content = `恭喜您！您已成功得標【${item.title}】🎉
結標金額為：$${item.currentPrice}
交收地點：${item.location}

請直接回覆此訊息與我們確認交收時間與細節，謝謝！`;

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
    alert('發送通知失敗：' + error.message);
  } else {
    alert('✅ 已成功發送得標通知與專屬對話視窗給買家！');
    fetchUserMessages();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }

      sb.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
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

  await logActivity('home');
  await fetchAuctions();
});

function openAdminMsgModal() { 
  document.getElementById('adminMsgModal').classList.remove('hidden'); 
}
function closeAdminMsgModal() { document.getElementById('adminMsgModal').classList.add('hidden'); }

async function handleAdminSendMessage(e) {
  e.preventDefault();
  if (!currentUser?.isAdmin) return alert('權限不足');
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
    alert('發送失敗：' + error.message);
  } else {
    alert('✅ 訊息已成功發送給指定用戶！');
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
