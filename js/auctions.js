// ==================== [模塊：Auctions, Categories & Bidding] ====================
async function fetchCategories() {
  if (!sb) return;
  const { data } = await sb.from('categories').select('name').is('parent_name', null).order('created_at', { ascending: true });
  if (data) {
    siteCategories = data.map(c => c.name);
    renderCategoryButtons();
    renderCategoryOptions();
  }
}

function renderCategoryButtons() {
  const container = document.getElementById('categoryBtnContainer');
  let html = `<span class="text-slate-400 text-xs mr-1 shrink-0">分類:</span>`;
  
  const allClass = currentCategory === '全部' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
  html += `<button onclick="setCategory('全部')" class="cat-btn shrink-0 px-3 py-1 rounded-md font-medium transition ${allClass}" data-cat="全部">全部</button>`;
  
  siteCategories.forEach(cat => {
    const activeClass = currentCategory === cat ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200';
    html += `<button onclick="setCategory('${cat}')" class="cat-btn shrink-0 px-3 py-1 rounded-md font-medium transition ${activeClass}" data-cat="${cat}">${cat}</button>`;
  });
  
  container.innerHTML = html;
}

function renderCategoryOptions() {
  const datalist = document.getElementById('categoryOptions');
  datalist.innerHTML = siteCategories.map(cat => `<option value="${cat}">`).join('');
}

async function fetchAuctions() {
  if (!sb) return;
  const { data: aucData } = await sb.from('auctions').select('*').order('created_at', { ascending: false });
  const { data: bidsData } = await sb.from('bids').select('*').order('amount', { ascending: false });

  if (aucData) {
    auctions = aucData.map(a => {
      const urls = a.image_url ? a.image_url.split(',') : [];
      return {
        id: a.id,
        title: a.title,
        category: a.category,
        subCategory: a.sub_category || '', 
        location: a.location,
        desc: a.description || '',
        imageUrl: urls[0] || '',
        imageUrls: urls,
        startPrice: a.start_price,
        bidIncrement: a.bid_increment,
        currentPrice: a.current_price,
        endTime: a.end_time,
        createdAt: a.created_at,
        sellerId: a.seller_id,
        sellerName: a.seller_name,
        highestBidderId: a.highest_bidder_id,
        highestBidderName: a.highest_bidder_name,
        is_visible: a.is_visible !== false,
        is_biddable: a.is_biddable !== false,
        view_count: a.view_count || 0,
        bids: (bidsData || []).filter(b => b.auction_id === a.id).map(b => ({
          bidderId: b.bidder_id,
          bidderName: b.bidder_name,
          amount: b.amount,
          time: new Date(b.created_at).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })
        }))
      };
    });
  }
  renderAuctions();
  if (activeDetailAuctionId) renderDetailModalContent();
}

async function handlePlaceBid(e, auctionId) {
  e.preventDefault();
  if (!currentUser) return openLoginModal();
  if (!currentUser.phone) {
    alert('⚠️ 尚未綁定電話號碼！無電話者無法下標。');
    openProfileModal(false);
    return;
  }

  const amount = Number(document.getElementById('bidAmountInput').value);
  const { error } = await sb.rpc('place_bid', { p_auction_id: auctionId, p_amount: amount });

  if (error) {
    alert('出價失敗：' + error.message);
  } else {
    await fetchAuctions();
    await fetchUserMessages();
  }
}

function getCountdownInfo(endTimeIso) {
  const diff = new Date(endTimeIso).getTime() - Date.now();
  if (diff <= 0) return { ended: true, text: '已截標結束', urgent: false };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  const text = d > 0 ? `剩餘 ${d}日 ${h}時 ${m}分` : `剩餘 ${h}時 ${m}分 ${s}秒`;
  return { ended: false, text, urgent: diff < 3600000 };
}

function renderAuctions() {
  const grid = document.getElementById('auctionsGrid');
  const empty = document.getElementById('emptyState');
  const kw = (document.getElementById('searchInput')?.value || '').toLowerCase();

  const filtered = auctions.filter(a => {
    const mVisible = (currentUser && currentUser.isAdmin) ? true : a.is_visible;
    const mView = currentView === 'all' ? true : (currentUser && a.bids.some(b => b.bidderId === currentUser.id));
    const mCat = currentCategory === '全部' ? true : a.category === currentCategory;
    const mKw = a.title.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw) || (a.subCategory && a.subCategory.toLowerCase().includes(kw));
    return mVisible && mView && mCat && mKw;
  });

  filtered.sort((a, b) => {
    if (currentSort === 'ending_soon') {
        return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
    } else if (currentSort === 'price_asc') {
        return a.currentPrice - b.currentPrice;
    } else if (currentSort === 'price_desc') {
        return b.currentPrice - a.currentPrice;
    } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (!filtered.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  if (currentLayout === 'list') {
    grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-3'; 
  } else {
    grid.className = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6'; 
  }

  grid.innerHTML = filtered.map(item => {
    const cd = getCountdownInfo(item.endTime);
    const isLeading = currentUser && item.highestBidderId === currentUser.id;
    const nextMinBid = item.bids.length === 0 ? item.startPrice : item.currentPrice + item.bidIncrement;
    const hiddenStyle = !item.is_visible ? 'opacity-60 grayscale-[50%] border-dashed' : 'border-slate-200';

    let cleanLocation = item.location || '面交, 葵興地鐵站';
    if (cleanLocation.includes('(') && cleanLocation.includes(')')) {
       cleanLocation = cleanLocation.replace(' (', ' · ').replace(')', '');
    }

    if (currentLayout === 'list') {
      let listBtnHtml = '';
      if (cd.ended) {
        listBtnHtml = `<button class="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500">查看結果</button>`;
      } else if (!item.is_biddable) {
        listBtnHtml = `<button class="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-500 border border-rose-200"><i class="fa-solid fa-lock mr-1"></i>暫停</button>`;
      } else {
        listBtnHtml = `<button class="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 group-hover:bg-amber-500 text-white">立即出價</button>`;
      }

      const badgeListHtml = `
        <div class="absolute top-1 left-1 flex flex-col gap-1 items-start z-10">
          ${!item.is_visible ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-white shadow-sm"><i class="fa-solid fa-eye-slash mr-1"></i>隱藏</span>` : ''}
          ${!item.is_biddable && !cd.ended ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-600 text-white shadow-sm"><i class="fa-solid fa-lock mr-1"></i>暫停</span>` : ''}
          ${isLeading ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-white">👑 領先</span>` : ''}
        </div>`;

      return `
        <div onclick="openDetailModal('${item.id}')" class="bg-white rounded-xl border ${isLeading ? 'border-amber-400 ring-2 ring-amber-400/20' : hiddenStyle} overflow-hidden shadow-sm hover:shadow-md transition flex cursor-pointer group relative h-[132px]">
          <div class="w-[125px] shrink-0 relative bg-slate-100 overflow-hidden border-r border-slate-100">
            ${badgeListHtml}
            <img src="${item.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition ${cd.ended ? 'opacity-65 grayscale-[30%]' : ''}">
          </div>
          <div class="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-800 text-[13px] sm:text-sm line-clamp-1 mb-1">${item.title}</h3>
              <div class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60 mb-1">
                <i class="fa-solid fa-location-dot text-amber-500 mr-1"></i>${cleanLocation}
              </div>
              <div class="flex items-center justify-between text-slate-400 text-[10px]">
                <span>底價 $${item.startPrice}</span>
                <span>每口 +$${item.bidIncrement}</span>
              </div>
            </div>
            <div class="flex items-end justify-between border-t border-slate-100 pt-1.5">
              <div>
                <div class="text-[10px] text-slate-400 mb-0.5 leading-none">目前最高</div>
                <div class="text-base sm:text-lg font-extrabold text-amber-600 leading-none">HK$ ${item.currentPrice}</div>
              </div>
              <div class="text-right flex flex-col items-end justify-end">
                <div class="text-[9px] font-bold ${cd.ended ? 'text-slate-500' : (cd.urgent ? 'text-rose-600' : 'text-emerald-600')} mb-1">
                  <i class="fa-regular fa-clock mr-0.5"></i><span data-countdown-id="${item.id}">${cd.text}</span>
                </div>
                ${listBtnHtml}
              </div>
            </div>
          </div>
        </div>`;
    } 
    else {
      const badgesHtml = `
        <div class="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
          ${!item.is_visible ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white shadow-sm"><i class="fa-solid fa-eye-slash mr-1"></i>已隱藏</span>` : ''}
          ${!item.is_biddable && !cd.ended ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-sm"><i class="fa-solid fa-lock mr-1"></i>暫停出價</span>` : ''}
        </div>`;

      let btnHtml = '';
      if (cd.ended) {
        btnHtml = `<button class="w-full py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-100 text-slate-500">查看結果</button>`;
      } else if (!item.is_biddable) {
        btnHtml = `<button class="w-full py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-rose-50 text-rose-500 border border-rose-200"><i class="fa-solid fa-lock mr-1"></i>暫停出價</button>`;
      } else {
        btnHtml = `<button class="w-full py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold bg-slate-900 group-hover:bg-amber-500 text-white">立即出價</button>`;
      }

      return `
        <div onclick="openDetailModal('${item.id}')" class="bg-white rounded-2xl border ${isLeading ? 'border-amber-400 ring-2 ring-amber-400/20' : hiddenStyle} overflow-hidden shadow-sm hover:shadow-md transition flex flex-col cursor-pointer group relative">
          ${badgesHtml}
          <div class="relative h-44 sm:h-52 bg-slate-100 overflow-hidden">
            <img src="${item.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition ${cd.ended ? 'opacity-65 grayscale-[30%]' : ''}">
            <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
              <span data-countdown-id="${item.id}" class="px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${cd.ended ? 'bg-slate-800' : (cd.urgent ? 'bg-rose-600' : 'bg-emerald-600')}">${cd.text}</span>
              ${isLeading ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">${cd.ended ? '🎉 已得標' : '👑 領先中'}</span>` : ''}
            </div>
          </div>
          <div class="p-3 sm:p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-bold text-slate-800 text-xs sm:text-sm mb-1.5 line-clamp-2">${item.title}</h3>
              <div class="flex items-center px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold bg-amber-50/90 text-amber-900 border border-amber-200/60 mb-2 truncate">
                <i class="fa-solid fa-location-dot text-amber-500 mr-1.5 shrink-0"></i>
                <span class="truncate">${cleanLocation}</span>
              </div>
              <div class="bg-slate-50 rounded-xl p-2 border border-slate-100 mb-2.5">
                <div class="flex justify-between text-[10px] text-slate-400">
                  <span>${item.bids.length > 0 ? '目前最高' : '底價'}</span>
                  <span>每口 +$${item.bidIncrement}</span>
                </div>
                <div class="flex justify-between items-baseline mt-0.5">
                  <span class="text-sm sm:text-lg font-extrabold text-amber-600">HK$ ${item.currentPrice}</span>
                </div>
              </div>
            </div>
            ${btnHtml}
          </div>
        </div>`;
    }
  }).join('');
}

async function openDetailModal(id) {
  activeDetailAuctionId = id;
  await logActivity('item_detail', id);
  const item = auctions.find(a => a.id === id);
  if (item) item.view_count = (item.view_count || 0) + 1;
  await renderDetailModalContent();
  document.getElementById('detailModal').classList.remove('hidden');
}

function closeDetailModal() { 
  activeDetailAuctionId = null; 
  document.getElementById('detailModal').classList.add('hidden'); 
}

async function toggleAuctionVisibility() {
  if (!currentUser?.isAdmin || !activeDetailAuctionId) return;
  const item = auctions.find(a => a.id === activeDetailAuctionId);
  const newStatus = !item.is_visible;
  const { error } = await sb.from('auctions').update({ is_visible: newStatus }).eq('id', activeDetailAuctionId);
  if (error) return alert('狀態切換失敗：' + error.message);
  item.is_visible = newStatus;
  renderDetailModalContent();
  renderAuctions();
}

async function toggleAuctionBiddable() {
  if (!currentUser?.isAdmin || !activeDetailAuctionId) return;
  const item = auctions.find(a => a.id === activeDetailAuctionId);
  const newStatus = !item.is_biddable;
  const { error } = await sb.from('auctions').update({ is_biddable: newStatus }).eq('id', activeDetailAuctionId);
  if (error) return alert('狀態切換失敗：' + error.message);
  item.is_biddable = newStatus;
  renderDetailModalContent();
  renderAuctions();
}

function scrollDetailImages(direction) {
  const container = document.getElementById('detailImgContainer');
  const scrollAmount = container.clientWidth;
  container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

async function renderDetailModalContent() {
  const item = auctions.find(a => a.id === activeDetailAuctionId);
  if (!item) return;
  const cd = getCountdownInfo(item.endTime);
  const nextMinBid = item.bids.length === 0 ? item.startPrice : item.currentPrice + item.bidIncrement;

  const adminGroup = document.getElementById('adminActionGroup');
  const visBtn = document.getElementById('adminVisibilityBtn');
  const bidToggleBtn = document.getElementById('adminBiddableBtn');
  const viewBadge = document.getElementById('adminItemViewBadge');
  
  if (currentUser && currentUser.isAdmin) {
    adminGroup.classList.remove('hidden');
    viewBadge.innerHTML = `<i class="fa-regular fa-eye mr-1"></i>${item.view_count || 1} 次瀏覽`;

    if (item.is_visible) {
      visBtn.innerHTML = '<i class="fa-solid fa-eye-slash mr-1"></i>設為隱藏';
      visBtn.className = "bg-slate-900/80 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition w-full text-right";
    } else {
      visBtn.innerHTML = '<i class="fa-solid fa-eye mr-1"></i>設為公開';
      visBtn.className = "bg-emerald-600/90 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition w-full text-right";
    }

    if (item.is_biddable) {
      bidToggleBtn.innerHTML = '<i class="fa-solid fa-lock mr-1"></i>暫停出價';
      bidToggleBtn.className = "bg-rose-600/90 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition w-full text-right";
    } else {
      bidToggleBtn.innerHTML = '<i class="fa-solid fa-lock-open mr-1"></i>開放出價';
      bidToggleBtn.className = "bg-emerald-600/90 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md transition w-full text-right";
    }
  } else {
    adminGroup.classList.add('hidden');
  }

  const imgContainer = document.getElementById('detailImgContainer');
  imgContainer.innerHTML = item.imageUrls.map(url => `
    <div class="min-w-full w-full h-full flex items-center justify-center snap-center shrink-0 p-2">
      <img src="${url}" class="max-w-full max-h-full object-contain drop-shadow-sm">
    </div>
  `).join('');

  const indicator = document.getElementById('multiImgIndicator');
  const prevBtn = document.getElementById('prevImgBtn');
  const nextBtn = document.getElementById('nextImgBtn');
  
  if (item.imageUrls.length > 1) {
    indicator.innerHTML = `<div class="bg-black/50 backdrop-blur-sm text-white text-[10px] px-3 py-1 rounded-full shadow-sm tracking-wide">左右滑動 (共 ${item.imageUrls.length} 張)</div>`;
    indicator.classList.remove('hidden');
    prevBtn.classList.remove('hidden');
    nextBtn.classList.remove('hidden');
  } else {
    indicator.classList.add('hidden');
    prevBtn.classList.add('hidden');
    nextBtn.classList.add('hidden');
  }

  const categoryDisplay = item.subCategory ? `${item.category} <i class="fa-solid fa-chevron-right text-[8px] mx-1"></i> ${item.subCategory}` : item.category;
  document.getElementById('detailCat').innerHTML = categoryDisplay;
  
  let cleanLocation = item.location;
  if (cleanLocation && cleanLocation.includes('(') && cleanLocation.includes(')')) {
     cleanLocation = cleanLocation.replace(' (', ' · ').replace(')', '');
  }
  document.getElementById('detailLocation').textContent = cleanLocation;
  
  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailDesc').textContent = item.desc;
  document.getElementById('detailStartPrice').textContent = item.startPrice;
  document.getElementById('detailIncrement').textContent = item.bidIncrement;
  document.getElementById('detailCurrentPrice').textContent = `HK$ ${item.currentPrice}`;
  document.getElementById('detailBidCount').textContent = item.bids.length;
  document.getElementById('detailCountdownText').textContent = cd.text;
  document.getElementById('detailHighestBidder').textContent = item.highestBidderName ? `領先：${item.highestBidderName}` : '尚未出價';

  const actionArea = document.getElementById('bidActionArea');
  if (cd.ended) {
    actionArea.innerHTML = `<div class="bg-slate-100 text-slate-600 p-3 rounded-xl text-center text-xs font-bold">拍賣已截標結束</div>`;
  } else if (!item.is_biddable) {
    actionArea.innerHTML = `<div class="bg-rose-50 text-rose-600 p-3 rounded-xl text-center text-xs font-bold border border-rose-200"><i class="fa-solid fa-lock mr-1"></i>此拍賣品目前已由管理員暫停出價</div>`;
  } else if (!currentUser) {
    actionArea.innerHTML = `<button onclick="closeDetailModal(); openLoginModal();" class="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold">請先登入以參與出價</button>`;
  } else {
    actionArea.innerHTML = `
      <form onsubmit="handlePlaceBid(event, '${item.id}')" class="flex space-x-2">
        <input type="number" id="bidAmountInput" inputmode="numeric" required min="${nextMinBid}" step="${item.bidIncrement}" value="${nextMinBid}" class="flex-1 px-3 py-2 border-2 border-amber-400 rounded-xl text-sm font-extrabold">
        <button type="submit" class="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl text-sm font-bold">出價</button>
      </form>`;
  }

  const historyList = document.getElementById('bidHistoryList');
  historyList.innerHTML = item.bids.length === 0
    ? `<div class="text-slate-400 py-3 text-center">暫無出價紀錄</div>`
    : item.bids.map((b, i) => `<div class="flex justify-between p-2 rounded ${i === 0 ? 'bg-amber-50 font-bold' : 'bg-slate-50'}"><span>${b.bidderName}</span><span>HK$ ${b.amount} <small class="text-slate-400">${b.time}</small></span></div>`).join('');
}
