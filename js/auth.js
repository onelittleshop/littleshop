
// ==================== [模塊：Auth & User Profile] ====================
async function oauthLogin(provider) {
  if (!sb) return alert('請先填入 Supabase 憑證');
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + window.location.pathname } });
  if (error) alert('OAuth 登入錯誤：' + error.message);
}

async function loadUserProfile(userId) {
  if (!sb) return;
  // Ensure userId is a string primitive, not an object or event
  let uid = userId;
  if (typeof uid === 'object' && uid !== null) {
    uid = uid.id || uid.user?.id || '';
  }
  if (!uid || typeof uid !== 'string') return;

  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      currentUser = {
        id: uid,
        nickname: data.nickname || '',
        phone: data.phone || '',
        avatar_url: data.avatar_url || '',
        isAdmin: currentUser?.isAdmin || false
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
    id: currentUser.id, nickname: nicknameInput, phone: phoneInput, avatar_url: finalAvatar
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

async function fetchUserMessages() {
  if (!currentUser || !currentUser.id || !sb) return;
  const { data } = await sb.from('messages').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
  userMessages = data || [];
  const unreadCount = userMessages.filter(m => !m.is_read).length;
  const badge = document.getElementById('unreadMsgBadge');
  if (unreadCount > 0) {
    badge.textContent = unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function openMessagesModal() {
  await logActivity('messages');
  document.getElementById('messagesModal').classList.remove('hidden');
}

function openAdminMsgModal() { 
  document.getElementById('adminMsgModal').classList.remove('hidden'); 
}
function closeAdminMsgModal() { document.getElementById('adminMsgModal').classList.add('hidden'); }

async function handleAdminSendMessage(e) {
  e.preventDefault();
  if (!currentUser?.isAdmin) return alert('權限不足');
  const targetUuid = document.getElementById('adminTargetUuid').value.trim();
  const senderName = document.getElementById('adminSenderName').value.trim() || '系統訊息';
  const content = document.getElementById('adminMsgContent').value.trim();

  const { error } = await sb.from('messages').insert([{ user_id: targetUuid, sender_name: senderName, content: content }]);
  if (error) {
    alert('發送失敗：' + error.message);
  } else {
    alert('✅ 訊息已成功發送給指定用戶！');
    closeAdminMsgModal();
    document.getElementById('adminMsgContent').value = '';
    document.getElementById('adminTargetUuid').value = '';
  }
}
