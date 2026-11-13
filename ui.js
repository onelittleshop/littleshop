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
  document.getElementById('detailPriceLabel').textContent = item.bids.length > 0 ? '目前出價' : '起標價格';
  document.getElementById('detailCurrentPrice').textContent = '$' + (item.bids.length > 0 ? item.currentPrice : item.startPrice);
  document.getElementById('detailBidCount').textContent = item.bids.length;

  const highestBidder = item.bids.length > 0 ? item.bids[item.bids.length - 1].bidderName : '暫無出價';
  document.getElementById('detailHighestBidder').textContent = '領先者：' + highestBidder;

  currentDetailImageIdx = 0;
  renderDetailImages(item.images);

  const isEnded = new Date() > new Date(item.endTime);
  const badge = document.getElementById('detailStatusBadge');
  badge.textContent = !item.isVisible ? '已隱藏' : (isEnded ? '已截標' : (!item.isBiddable ? '已鎖定' : '競標中'));
  badge.className = `absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold z-20 text-white ${!item.isVisible ? 'bg-slate-800' : (isEnded ? 'bg-rose-500' : (!item.isBiddable ? 'bg-slate-600' : 'bg-amber-500'))}`;

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
    alert('發送失敗：' + error.message);
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
