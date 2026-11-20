// ==================== [模塊：Auth & User Profile] ====================
async function oauthLogin(provider) {
  if (!sb) return showToast('請先填入 Supabase 憑證', 'error');
  const { error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
  if (error) showToast('OAuth 登入錯誤：' + error.message, 'error');
}

async function loadUserProfile(userId) {
  if (!sb) return;
  let uid = userId;
  let email = '';
  let fullName = '';
  
  if (typeof uid === 'object' && uid !== null) {
    const uObj = uid.user || uid;
    email = uObj.email || '';
    fullName = uObj.user_metadata?.full_name || uObj.user_metadata?.name || '';
    uid = uObj.id || '';
  }
  if (!email || !fullName) {
     const { data: sessionData } = await sb.auth.getSession();
     const sUser = sessionData?.session?.user;
     if (!email) email = sUser?.email || '';
     if (!fullName) fullName = sUser?.user_metadata?.full_name || sUser?.user_metadata?.name || '';
  }
  if (!uid || typeof uid !== 'string') return;

  function getMaskedName(mail) {
    if (!mail || !mail.includes('@')) return '匿名用戶_' + uid.substring(0,4);
    const [local, domain] = mail.split('@');
    const f = local.substring(0, 2);
    const l = local.length > 2 ? local.substring(local.length - 2) : '';
    return `${f}xxx${l}@${domain}`;
  }

  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    let dbNickname = data?.nickname;
    
    // 如果原本完全沒有設定名稱，或是新用戶，自動生成並儲存
    if (!dbNickname) {
       dbNickname = getMaskedName(email);
       await sb.from('profiles').upsert({
         id: uid,
         nickname: dbNickname,
         phone: data?.phone || '',
         avatar_url: data?.avatar_url || ''
       });
    }

    currentUser = {
      id: uid,
      nickname: dbNickname,
      email: email,
      fullName: fullName,
      phone: data?.phone || '',
      avatar_url: data?.avatar_url || '',
      isAdmin: Boolean(data?.is_admin),
      isBlacklisted: Boolean(data?.is_blacklisted)
    };
    
  } catch (err) {
    console.warn('載入 Profile 發生異常:', err);
    currentUser = { id: uid, nickname: getMaskedName(email), email: email, fullName: fullName, phone: '', avatar_url: '', isAdmin: false, isBlacklisted: false };
  }
  if (typeof updateAuthUI === 'function') updateAuthUI();
  
  if (typeof fetchUserMessages === 'function') await fetchUserMessages();
  if (typeof initRealtimeMessages === 'function') initRealtimeMessages();
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
  const phoneInput = document.getElementById('profilePhone').value.trim();

  if (phoneInput && !/^[0-9]{8}$/.test(phoneInput)) return showToast('請輸入有效的 8 位數香港電話！', 'error');

  const hasBids = auctions.some(a => a.bids.some(b => b.bidderId === currentUser.id));
  if (hasBids && currentUser.phone && currentUser.phone !== phoneInput) {
    return showToast('你目前有正在參與的競標，電話號碼暫時無法更改！', 'error');
  }

  const finalAvatar = tempAvatarBase64 || currentUser.avatar_url || '';
  const { error } = await sb.from('profiles').upsert({
    id: currentUser.id,
    nickname: currentUser.nickname, // 保持原本資料庫或自動生成的名字，不從前端抓取
    phone: phoneInput,
    avatar_url: finalAvatar
  });

  if (error) return showToast('儲存失敗：' + error.message, 'error');

  currentUser.phone = phoneInput;
  currentUser.avatar_url = finalAvatar;

  const modal = document.getElementById('profileModal');
  if(modal) modal.classList.add('hidden');
  updateAuthUI();
  if (typeof renderAuctions === 'function') renderAuctions();
  showToast('✨ 聯絡資料儲存成功！', 'success');
}

async function logout() {
  if (sb) await sb.auth.signOut();
  currentUser = null;
  userMessages = [];
  if (typeof updateAuthUI === 'function') updateAuthUI();
  if (typeof switchView === 'function') switchView('all');
  
  // 清除即時監聽
  if (window.msgSubscription) {
    sb.removeChannel(window.msgSubscription);
    window.msgSubscription = null;
  }
}

function updateAuthUI() {
  const guestView = document.getElementById('guestAuthView');
  const userView = document.getElementById('userAuthView');
  const adminBanner = document.getElementById('adminBanner');
  const myBidCountBadge = document.getElementById('myBidCountBadge');
  
  const myBidCount = currentUser ? auctions.filter(a => {
    if (!currentUser.isAdmin && !a.isVisible) return false;
    return a.bids.some(b => b.bidderId === currentUser.id);
  }).length : 0;
  if (myBidCountBadge) myBidCountBadge.textContent = myBidCount;

  const myWonCountBadge = document.getElementById('myWonCountBadge');
  const myWonCount = currentUser ? auctions.filter(a => {
    if (!currentUser.isAdmin && !a.isVisible) return false;
    const isEnded = new Date() > new Date(a.endTime);
    const highestBidderId = a.bids.length > 0 ? a.bids[a.bids.length - 1].bidderId : null;
    return isEnded && highestBidderId === currentUser.id;
  }).length : 0;
  if (myWonCountBadge) myWonCountBadge.textContent = myWonCount;

  const viewTabsBar = document.getElementById('viewTabsBar');
  if (currentUser) {
    if(guestView) guestView.classList.add('hidden');
    if(userView) userView.classList.remove('hidden');
    if(viewTabsBar) viewTabsBar.classList.remove('hidden');
    
    const userNameDisplay = document.getElementById('userNameDisplay');
    if(userNameDisplay) userNameDisplay.textContent = currentUser.nickname || '未設定';
    
    const avatarContainer = document.getElementById('userAvatarContainer');
    if (avatarContainer) {
      if (currentUser.avatar_url) {
        avatarContainer.innerHTML = `<img src="${currentUser.avatar_url}" class="w-full h-full object-cover">`;
      } else {
        avatarContainer.textContent = (currentUser.nickname || 'U').charAt(0).toUpperCase();
      }
    }

    const roleBadge = document.getElementById('userRoleBadge');
    if (roleBadge) {
      if (currentUser.isAdmin) {
        roleBadge.textContent = '官方管理員';
        roleBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-white font-bold';
        document.getElementById('adminUploadBtn')?.classList.remove('hidden');
        if(adminBanner) adminBanner.classList.remove('hidden');
        if(typeof updateAdminStatsUI === 'function') updateAdminStatsUI(); 
      } else if (currentUser.isBlacklisted) {
        roleBadge.textContent = '已限制競標';
        roleBadge.className = 'text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-white font-bold';
        document.getElementById('adminUploadBtn')?.classList.add('hidden');
        if(adminBanner) adminBanner.classList.add('hidden');
      } else {
        roleBadge.textContent = currentUser.phone ? '已填電話' : '可參與競標';
        roleBadge.className = currentUser.phone ? 'text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-200';
        document.getElementById('adminUploadBtn')?.classList.add('hidden');
        if(adminBanner) adminBanner.classList.add('hidden');
      }
    }
  } else {
    if(guestView) guestView.classList.remove('hidden');
    if(userView) userView.classList.add('hidden');
    if(adminBanner) adminBanner.classList.add('hidden');
    if(viewTabsBar) viewTabsBar.classList.add('hidden');
  }
}
