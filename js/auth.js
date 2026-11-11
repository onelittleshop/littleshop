// ==================== [模塊：Auth & User Profile] ====================
async function oauthLogin(provider) {
  if (!sb) return alert('請先填入 Supabase 憑證');
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) alert('OAuth 登入錯誤：' + error.message);
}

async function loadUserProfile(userId) {
  if (!sb) return;
  let uid = userId;
  if (typeof uid === 'object' && uid !== null) {
    uid = uid.id || uid.user?.id || '';
  }
  if (!uid || typeof uid !== 'string') return;

  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) {
      currentUser = {
        id: uid,
        nickname: data.nickname || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        isAdmin: Boolean(data.is_admin)
      };
      if (!data.nickname) {
        openProfileModal(true);
      }
    } else {
      currentUser = { id: uid, nickname: '', phone: '', avatar_url: '', isAdmin: false };
      openProfileModal(true);
    }
  } catch (err) {
    console.warn('載入 Profile 發生異常:', err);
    currentUser = { id: uid, nickname: '', phone: '', avatar_url: '', isAdmin: false };
    openProfileModal(true);
  }
  if (typeof updateAuthUI === 'function') updateAuthUI();
  await fetchUserMessages();
}

function previewAndCompressAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      const MAX = 200;
      if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } }
      else { if (height > MAX) { width *= MAX / height; height = MAX; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      tempAvatarBase64 = canvas.toDataURL('image/jpeg', 0.8);
      document.getElementById('avatarPreviewContainer').innerHTML = `<img src="${tempAvatarBase64}" class="w-full h-full object-cover">`;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleProfileSave(e) {
  e.preventDefault();
  const nicknameInput = document.getElementById('profileNickname').value.trim();
  const phoneInput = document.getElementById('profilePhone').value.trim();

  if (!nicknameInput) return alert('⚠️ 系統顯示名稱為必填項目，請務必輸入！');
  if (phoneInput && !/^[0-9]{8}$/.test(phoneInput)) return alert('請輸入有效的 8 位數香港電話！');
  if (currentUser.nickname && currentUser.nickname !== nicknameInput) return alert('用戶名稱已永久鎖定，無法更改！');

  const hasBids = auctions.some(a => a.bids.some(b => b.bidderId === currentUser.id));
  if (hasBids && currentUser.phone && currentUser.phone !== phoneInput) {
    return alert('你目前有正在參與的競標，電話號碼暫時無法更改！');
  }

  const finalAvatar = tempAvatarBase64 || currentUser.avatar_url || '';
  const { error } = await sb.from('profiles').upsert({
    id: currentUser.id,
    nickname: nicknameInput,
    phone: phoneInput,
    avatar_url: finalAvatar
  });

  if (error) return alert('儲存失敗：' + error.message);

  currentUser.nickname = nicknameInput;
  currentUser.phone = phoneInput;
  currentUser.avatar_url = finalAvatar;

  document.getElementById('profileModal').classList.add('hidden');
  updateAuthUI();
  renderAuctions();
  alert('✨ 個人資料儲存成功！');
}

async function logout() {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  userMessages = [];
  updateAuthUI();
  switchView('all');
}

function updateAuthUI() {
  const guestView = document.getElementById('guestAuthView');
  const userView = document.getElementById('userAuthView');
  const adminBanner = document.getElementById('adminBanner');
  const myBidCount = currentUser ? auctions.filter(a => a.bids.some(b => b.bidderId === currentUser.id)).length : 0;
  document.getElementById('myBidCountBadge').textContent = myBidCount;

  if (currentUser) {
    guestView.classList.add('hidden');
    userView.classList.remove('hidden');
    document.getElementById('userNameDisplay').textContent = currentUser.nickname || '未設定';
    
    const avatarContainer = document.getElementById('userAvatarContainer');
    if (currentUser.avatar_url) {
      avatarContainer.innerHTML = `<img src="${currentUser.avatar_url}" class="w-full h-full object-cover">`;
    } else {
      avatarContainer.textContent = (currentUser.nickname || 'U').charAt(0).toUpperCase();
    }

    const roleBadge = document.getElementById('userRoleBadge');
    if (currentUser.isAdmin) {
      roleBadge.textContent = '官方管理員';
      roleBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold';
      document.getElementById('adminUploadBtn').classList.remove('hidden');
      adminBanner.classList.remove('hidden');
      updateAdminStatsUI(); 
    } else {
      roleBadge.textContent = currentUser.phone ? '已綁電話' : '未綁電話';
      roleBadge.className = currentUser.phone ? 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200';
      document.getElementById('adminUploadBtn').classList.add('hidden');
      adminBanner.classList.add('hidden');
    }
  } else {
    guestView.classList.remove('hidden');
    userView.classList.add('hidden');
    adminBanner.classList.add('hidden');
  }
}

// ==================== [雙向訊息系統] ====================
let activeChatUserId = null;
let activeChatAuctionId = null;

async function fetchUserMessages() {
  if (!currentUser || !currentUser.id || !sb) return;
  
  const { data } = await sb.from('messages')
    .select('*')
    .or(`receiver_id.eq.${currentUser.id},sender_id.eq.${currentUser.id}`)
    .order('created_at', { ascending: false });
    
  userMessages = data || [];
  
  const unreadCount = userMessages.filter(m => m.receiver_id === currentUser.id && !m.is_read).length;
  const badge = document.getElementById('unreadMsgBadge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function getConversations() {
  const convos = {};
  userMessages.forEach(m => {
    const partnerId = m.sender_id === currentUser.id ? m.receiver_id : m.sender_id;
    const partnerName = m.sender_id === currentUser.id ? (m.receiver_name || '系統/用戶') : (m.sender_name || '管理員');
    
    const threadId = m.auction_id ? `${partnerId}_${m.auction_id}` : `${partnerId}_general`;
    
    if (!convos[threadId]) {
      convos[threadId] = {
        partnerId: partnerId,
        partnerName: partnerName,
        auctionId: m.auction_id,
        messages: [],
        lastMessage: m,
        unreadCount: 0
      };
    }
    
    convos[threadId].messages.push(m);
    if (m.receiver_id === currentUser.id && !m.is_read) {
      convos[threadId].unreadCount++;
    }
    convos[threadId].messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  });
  
  return Object.values(convos).sort((a, b) => new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at));
}

async function openMessagesModal() {
  await logActivity('messages_view');
  document.getElementById('messagesModal').classList.remove('hidden');
  showMessagesList();
}

function showMessagesList() {
  document.getElementById('messagesListContainer').classList.remove('hidden');
  document.getElementById('messagesChatContainer').classList.add('hidden');
  document.getElementById('msgBackButton').classList.add('hidden');
  document.getElementById('messagesModalTitle').innerHTML = `<i class="fa-regular fa-bell text-amber-500 mr-2"></i>站內訊息中心`;
  activeChatUserId = null;
  activeChatAuctionId = null;

  const container = document.getElementById('messagesListContainer');
  const convos = getConversations();

  if (convos.length === 0) {
    container.innerHTML = '<div class="text-center py-10 text-slate-400 text-xs flex flex-col items-center"><i class="fa-regular fa-comments text-3xl mb-3 text-slate-200"></i>目前沒有任何對話紀錄</div>';
    return;
  }

  container.innerHTML = convos.map(c => {
    const isUnread = c.unreadCount > 0;
    const itemInfo = c.auctionId ? `<span class="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 ml-2 shadow-sm"><i class="fa-solid fa-gavel mr-1"></i>專屬訂單對話</span>` : '';
    return `
      <div onclick="openChat('${c.partnerId}', '${c.auctionId || ''}', '${c.partnerName}')" class="p-3.5 rounded-xl border ${isUnread ? 'bg-amber-50/80 border-amber-300 shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'} text-xs cursor-pointer transition flex justify-between items-center group">
        <div class="flex items-center space-x-3 overflow-hidden">
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            ${c.partnerName.charAt(0)}
          </div>
          <div class="truncate">
            <div class="font-bold text-slate-900 text-sm flex items-center">
              ${c.partnerName} ${itemInfo}
            </div>
            <div class="text-slate-500 truncate mt-0.5 ${isUnread ? 'font-semibold text-amber-900' : ''}">${c.lastMessage.content}</div>
          </div>
        </div>
        <div class="flex flex-col items-end shrink-0 pl-2">
          <span class="text-[10px] text-slate-400">${new Date(c.lastMessage.created_at).toLocaleDateString()}</span>
          ${isUnread ? `<span class="w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold mt-1 shadow-sm">${c.unreadCount}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function openChat(partnerId, auctionId, partnerName) {
  activeChatUserId = partnerId;
  activeChatAuctionId = auctionId || null;
  
  document.getElementById('messagesListContainer').classList.add('hidden');
  document.getElementById('messagesChatContainer').classList.remove('hidden');
  document.getElementById('msgBackButton').classList.remove('hidden');
  document.getElementById('messagesModalTitle').textContent = partnerName;
  
  renderChatHistory();
  
  const unreadIds = userMessages
    .filter(m => m.receiver_id === currentUser.id && !m.is_read && m.sender_id === partnerId && (m.auction_id || '') === auctionId)
    .map(m => m.id);
    
  if (unreadIds.length > 0 && sb) {
    await sb.from('messages').update({ is_read: true }).in('id', unreadIds);
    userMessages.forEach(m => {
      if (unreadIds.includes(m.id)) m.is_read = true;
    });
    fetchUserMessages(); 
  }
}

function renderChatHistory() {
  const container = document.getElementById('chatHistory');
  const threadId = activeChatAuctionId ? `${activeChatUserId}_${activeChatAuctionId}` : `${activeChatUserId}_general`;
  const convo = getConversations().find(c => (c.auctionId ? `${c.partnerId}_${c.auctionId}` : `${c.partnerId}_general`) === threadId);
  
  if (!convo) return;

  container.innerHTML = convo.messages.map(m => {
    const isMe = m.sender_id === currentUser.id;
    return `
      <div class="flex ${isMe ? 'justify-end' : 'justify-start'}">
        <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isMe ? 'bg-amber-500 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}">
          <p class="whitespace-pre-line leading-relaxed">${m.content}</p>
          <span class="text-[9px] mt-1.5 block opacity-70 ${isMe ? 'text-right text-amber-100' : 'text-left text-slate-400'}">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>
    `;
  }).join('');
  
  setTimeout(() => {
    container.scrollTop = container.scrollHeight;
  }, 10);
}

async function handleReplyMessage(e) {
  e.preventDefault();
  const input = document.getElementById('replyMsgContent');
  const content = input.value.trim();
  if (!content || !activeChatUserId) return;

  input.value = '';
  input.style.height = '';

  const tempMsg = {
    id: 'temp_' + Date.now(),
    user_id: activeChatUserId,
    sender_id: currentUser.id,
    receiver_id: activeChatUserId,
    sender_name: currentUser.nickname || '用戶',
    receiver_name: document.getElementById('messagesModalTitle').textContent,
    auction_id: activeChatAuctionId,
    content: content,
    is_read: false,
    created_at: new Date().toISOString()
  };
  
  userMessages.push(tempMsg);
  renderChatHistory();

  const { error } = await sb.from('messages').insert([{
    user_id: activeChatUserId,
    sender_id: currentUser.id,
    receiver_id: activeChatUserId,
    sender_name: currentUser.nickname || '用戶',
    receiver_name: document.getElementById('messagesModalTitle').textContent,
    auction_id: activeChatAuctionId,
    content: content
  }]);

  if (error) {
    alert('發送失敗：' + error.message);
    userMessages = userMessages.filter(m => m.id !== tempMsg.id);
    renderChatHistory();
  } else {
    await fetchUserMessages();
    renderChatHistory();
  }
}
