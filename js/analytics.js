// ==================== [模塊：Analytics] ====================
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/ipad|tablet|playbook|silk/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function getGuestSession() {
  let session = localStorage.getItem('guest_session');
  if (!session) {
    session = 'gs_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('guest_session', session);
  }
  return session;
}

async function logActivity(pageType, targetId = null) {
  if (!sb) return;
  const device = getDeviceType();
  const session = getGuestSession();
  const userId = currentUser ? currentUser.id : null;
  
  let itemTitle = null;
  if (targetId && auctions) {
    const item = auctions.find(a => a.id === targetId);
    if (item) itemTitle = item.title;
  }

  try {
    const { error: rpcError } = await sb.rpc('log_activity', {
      p_user_id: userId,
      p_guest_session: session,
      p_device_type: device,
      p_page_type: pageType,
      p_target_id: targetId,
      p_title: itemTitle
    });

    if (rpcError) {
      const { error: insertError } = await sb.from('activity_logs').insert([{
        user_id: userId,
        guest_session: session,
        device_type: device,
        page_type: pageType,
        target_id: targetId,
        title: itemTitle
      }]);
      
      if (insertError) {
        await sb.rpc('log_daily_visit', { device_type: device });
      }
    }
  } catch (err) {
    console.warn('Analytics log failed:', err);
  }
}

async function updateAdminStatsUI() {
  if (!currentUser?.isAdmin || !sb) return;
  try {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Hong_Kong' });

    const { data: visitData } = await sb
      .from('daily_visits')
      .select('visit_count')
      .eq('visit_date', todayStr)
      .maybeSingle();

    const visitEl = document.getElementById('adminVisitCount');
    if (visitEl) {
      visitEl.textContent = visitData ? visitData.visit_count : 0;
    }

    const { data: devData } = await sb
      .from('homepage_device_stats')
      .select('device_type, visit_count')
      .eq('visit_date', todayStr);

    const devEl = document.getElementById('adminDeviceStats');
    if (devEl) {
      if (devData && devData.length > 0) {
        let mobile = 0, tablet = 0, desktop = 0;
        devData.forEach(d => {
          if (d.device_type === 'mobile') mobile += d.visit_count;
          if (d.device_type === 'tablet') tablet += d.visit_count;
          if (d.device_type === 'desktop') desktop += d.visit_count;
        });
        devEl.textContent = `今日設備分佈 ➔ 手機: ${mobile} ｜ 平板: ${tablet} ｜ 電腦: ${desktop}`;
      } else {
        devEl.textContent = '設備分佈統計 ➔ 尚無今日數據';
      }
    }
  } catch (err) {
    console.warn('更新管理員統計失敗:', err);
  }
}

async function openStatsModal() {
  if (!currentUser?.isAdmin || !sb) return;
  document.getElementById('statsModal').classList.remove('hidden');
  const container = document.getElementById('statsListContainer');
  container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">載入詳細流量紀錄中...</div>';
  
  const { data, error } = await sb.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error || !data) {
    container.innerHTML = '<div class="text-center py-4 text-rose-500 text-xs">載入失敗</div>';
    return;
  }
  
  if (data.length === 0) {
    container.innerHTML = '<div class="text-center py-4 text-slate-400 text-xs">目前沒有任何紀錄</div>';
    return;
  }
  
  container.innerHTML = data.map(log => `
    <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
      <div class="overflow-hidden">
        <span class="font-bold text-slate-800">${log.page_type || '瀏覽'}</span>
        ${log.title ? `<span class="text-slate-500 ml-1 truncate block sm:inline">${log.title}</span>` : ''}
        <span class="text-[10px] text-slate-400 block">${new Date(log.created_at).toLocaleString()}</span>
      </div>
      <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0">${log.device_type || 'Unknown'}</span>
    </div>
  `).join('');
}
