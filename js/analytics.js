// ==================== [模塊：Analytics & Activity Logs] ====================
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
}

async function logActivity(pageType, targetId = null) {
  if (!sb) return;
  const uId = currentUser ? currentUser.id : null;
  const gSession = getGuestSession();
  const dType = getDeviceType();
  
  await sb.rpc('log_activity', {
    p_user_id: uId,
    p_guest_session: gSession,
    p_device_type: dType,
    p_page_type: pageType,
    p_target_id: targetId
  });
}

async function trackDailyVisit() {
  if (!sb) return;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const deviceType = getDeviceType();
  
  const lastVisitDate = localStorage.getItem('last_visit_date');
  const lastVisitDevice = localStorage.getItem('last_visit_device');
  
  if (lastVisitDate !== todayStr || lastVisitDevice !== deviceType) {
    await sb.rpc('log_device_visit', { p_date: todayStr, p_device_type: deviceType });
    localStorage.setItem('last_visit_date', todayStr);
    localStorage.setItem('last_visit_device', deviceType);
  }
}

async function fetchAdminDeviceStats() {
  if (!sb || !currentUser?.isAdmin) return;
  const { data, error } = await sb.rpc('get_admin_daily_stats');
  if (data && data.length > 0) {
    const todayHk = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"})).toISOString().split('T')[0];
    const todayData = data.find(d => d.log_date === todayHk) || {total_visits: 0, mobile_visits: 0, tablet_visits: 0, desktop_visits: 0};
    
    document.getElementById('adminVisitCount').textContent = todayData.total_visits;
    document.getElementById('adminDeviceStats').innerHTML = `<i class="fa-solid fa-mobile-screen-button mr-1"></i>手機 ${todayData.mobile_visits} 人 <span class="mx-1">|</span> <i class="fa-solid fa-tablet-screen-button mr-1"></i>平板 ${todayData.tablet_visits} 人 <span class="mx-1">|</span> <i class="fa-solid fa-desktop mr-1"></i>電腦 ${todayData.desktop_visits} 人`;
  }
}

async function openStatsModal() {
  if (!currentUser?.isAdmin) return;
  document.getElementById('statsModal').classList.remove('hidden');
  const container = document.getElementById('statsListContainer');
  container.innerHTML = '<div class="text-center py-4 text-slate-500 text-xs">數據載入中...</div>';

  const { data, error } = await sb.rpc('get_admin_daily_stats');
  
  if (error || !data) {
    container.innerHTML = `<div class="text-center py-4 text-rose-500 text-xs">載入失敗：${error?.message}</div>`;
    return;
  }

  if (data.length === 0) {
     container.innerHTML = '<div class="text-center py-4 text-slate-500 text-xs">暫無任何日誌數據</div>';
     return;
  }

  let html = '';
  data.forEach(stats => {
    html += `
      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1.5">
        <div class="flex justify-between items-center border-b border-slate-200 pb-1.5">
          <span class="font-bold text-slate-700">${stats.log_date}</span>
          <span class="font-black text-amber-600">總計: ${stats.total_visits} 人</span>
        </div>
        <div class="flex justify-between text-xs text-slate-500 font-medium px-1">
          <span><i class="fa-solid fa-mobile-screen-button mr-1"></i>手機: ${stats.mobile_visits}</span>
          <span><i class="fa-solid fa-tablet-screen-button mr-1"></i>平板: ${stats.tablet_visits}</span>
          <span><i class="fa-solid fa-desktop mr-1"></i>電腦: ${stats.desktop_visits}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}
