// ==================== [模塊：Auctions & Bidding] ====================
let tempImagesBase64 = [];
let activeDetailId = null;
let currentDetailImageIdx = 0;
let detailInterval = null;

async function fetchAuctions() {
  if (!sb) return;
  // Fetch items along with their relational bids
  const { data, error } = await sb.from('auctions').select('*, bids(*)').order('created_at', { ascending: false });
  if (!error && data) {
    auctions = data.map(item => ({
      id: item.id,
      title: item.title,
      category: item.category,
      subCategory: item.sub_category || '',
      startPrice: item.start_price,
      bidIncrement: item.bid_increment,
      currentPrice: item.current_price,
      endTime: item.end_time,
      method: item.method,
      location: item.location,
      desc: item.description,
      images: item.images || [],
      // Map relational bids to match frontend structure expected by UI
      bids: (item.bids || []).map(b => ({
        bidderId: b.bidder_id,
        bidderName: b.bidder_name,
        amount: b.amount,
        time: b.created_at
      })).sort((a, b) => new Date(a.time) - new Date(b.time)),
      status: item.status || 'active',
      isBiddable: item.is_biddable ?? true,
      winnerId: item.winner_id || null,
      winnerPhone: item.winner_phone || null
    }));
  }
  renderCategories();
  renderAuctions();
}

function renderCategories() {
  const container = document.getElementById('categoryBtnContainer');
  const cats = ['all', ...new Set(auctions.map(a => a.category))];
  
  container.innerHTML = cats.map(c => {
    const active = currentCategory === c;
    const label = c === 'all' ? '全部' : c;
    return `<button onclick="switchCategory('${c}')" class="px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition ${active ? 'bg-amber-500 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">${label}</button>`;
  }).join('');

  const datalist = document.getElementById('categoryOptions');
  if (datalist) {
    datalist.innerHTML = cats.filter(c => c !== 'all').map(c => `<option value="${c}">`).join('');
  }
}

function switchCategory(cat) {
  currentCategory = cat;
  renderCategories();
  renderAuctions();
}

function switchView(view) {
  currentView = view;
  document.getElementById('tabAll').className = view === 'all' ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-slate-900 text-white shadow-sm transition' : 'px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition';
  document.getElementById('tabMyBids').className = view === 'my_bids' ? 'px-4 py-1.5 rounded-full text-sm font-medium bg-slate-900 text-white shadow-sm transition' : 'px-4 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition';
  renderAuctions();
}

function changeSort() {
  renderAuctions();
}

function changeLayout(layout) {
  currentLayout = layout;
  document.getElementById('layoutGridBtn').className = layout === 'grid' ? 'p-1.5 px-2.5 rounded-md bg-white shadow-sm text-slate-700 text-sm transition' : 'p-1.5 px-2.5 rounded-md text-slate-400 hover:text-slate-700 text-sm transition';
  document.getElementById('layoutListBtn').className = layout === 'list' ? 'p-1.5 px-2.5 rounded-md bg-white shadow-sm text-slate-700 text-sm transition' : 'p-1.5 px-2.5 rounded-md text-slate-400 hover:text-slate-700 text-sm transition';
  renderAuctions();
}

function renderAuctions() {
  const grid = document.getElementById('auctionsGrid');
  const empty = document.getElementById('emptyState');
  const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
  const sortType = document.getElementById('sortSelect').value;

  let list = auctions.filter(item => {
    if (currentCategory !== 'all' && item.category !== currentCategory) return false;
    if (currentView === 'my_bids') {
      if (!currentUser) return false;
      const hasBid = item.bids.some(b => b.bidderId === currentUser.id);
      if (!hasBid) return false;
    }
    if (!currentUser?.isAdmin && item.status === 'hidden') return false;
    if (keyword && !item.title.toLowerCase().includes(keyword) && !item.desc.toLowerCase().includes(keyword)) return false;
    return true;
  });

  list.sort((a, b) => {
    if (sortType === 'latest') return new Date(b.id) - new Date(a.id);
    if (sortType === 'ending_soon') return new Date(a.endTime) - new Date(b.endTime);
    if (sortType === 'price_asc') return a.currentPrice - b.currentPrice;
    if (sortType === 'price_desc') return b.currentPrice - a.currentPrice;
    return 0;
  });

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  if (currentLayout === 'grid') {
    grid.className = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6";
    grid.innerHTML = list.map(item => {
      const img = item.images[0] || './logo.png';
      const isEnded = new Date() > new Date(item.endTime) || item.status === 'ended';
      const statusBadge = item.status === 'hidden' ? '<span class="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">已隱藏</span>' :
                          isEnded ? '<span class="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">已截標</span>' : 
                          '<span class="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">競標中</span>';
      return `
        <div onclick="openDetailModal('${item.id}')" class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition group flex flex-col justify-between">
          <div class="relative aspect-square bg-slate-100 overflow-hidden">
            <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
            ${statusBadge}
          </div>
          <div class="p-3 sm:p-4 flex-1 flex flex-col justify-between">
            <div>
              <div class="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block mb-1">${item.category}</div>
              <h3 class="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">${item.title}</h3>
            </div>
            <div class="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span class="text-[10px] text-slate-400">目前價</span>
              <span class="text-sm sm:text-base font-extrabold text-amber-600">$${item.currentPrice}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } else {
    grid.className = "grid grid-cols-1 gap-3";
    grid.innerHTML = list.map(item => {
      const img = item.images[0] || './logo.png';
      const isEnded = new Date() > new Date(item.endTime) || item.status === 'ended';
      return `
        <div onclick="openDetailModal('${item.id}')" class="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 sm:p-4 cursor-pointer hover:shadow-md transition flex items-center space-x-4">
          <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
            <img src="${img}" class="w-full h-full object-cover">
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2 mb-1">
              <span class="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">${item.category}</span>
              <span class="text-[10px] ${isEnded ? 'text-rose-500 font-bold' : 'text-emerald-600 font-bold'}">${isEnded ? '已截標' : '競標中'}</span>
            </div>
            <h3 class="text-sm sm:text-base font-bold text-slate-900 truncate">${item.title}</h3>
            <p class="text-xs text-slate-500 truncate mt-0.5">${item.desc || '無描述'}</p>
          </div>
          <div class="text-right shrink-0 pl-2">
            <span class="text-[10px] text-slate-400 block">目前最高</span>
            <span class="text-base sm:text-lg font-extrabold text-amber-600">$${item.currentPrice}</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

async function handleCreateAuction(e) {
  e.preventDefault();
  if (!currentUser?.isAdmin) return alert('權限不足');
  if (tempImagesBase64.length === 0) return alert('請至少上傳一張相片');

  const title = document.getElementById('itemTitle').value.trim();
  const category = document.getElementById('itemCategory').value.trim();
  const subCategory = document.getElementById('itemSubCategory').value.trim();
  const startPrice = Number(document.getElementById('startPrice').value);
  const bidIncrement = Number(document.getElementById('bidIncrement').value);
  const endTimeInput = document.getElementById('endTime').value;
  const method = document.getElementById('itemMethod').value;
  const location = document.getElementById('itemLocation').value;
  const desc = document.getElementById('itemDesc').value.trim();

  let endTime = endTimeInput ? new Date(endTimeInput).toISOString() : new Date(Date.now() + 86400000).toISOString();

  const newItem = {
    title,
    category,
    sub_category: subCategory,
    start_price: startPrice,
    bid_increment: bidIncrement,
    current_price: startPrice,
    end_time: endTime,
    method,
    location,
    description: desc,
    images: tempImagesBase64,
    status: 'active',
    is_biddable: true
  };

  const { error } = await sb.from('auctions').insert([newItem]);
  if (error) {
    alert('上架失敗：' + error.message);
  } else {
    alert('✨ 拍賣品成功上架！');
    closeUploadModal();
    await fetchAuctions();
  }
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

  // Insert into relational public.bids table
  const { error: bidError } = await sb.from('bids').insert([{
    auction_id: itemId,
    bidder_id: currentUser.id,
    bidder_name: currentUser.nickname || '匿名買家',
    amount: inputAmt
  }]);

  if (bidError) {
    return alert('出價失敗：' + bidError.message);
  }

  // Update current_price on items table
  const { error: updateError } = await sb.from('auctions').update({
    current_price: inputAmt
  }).eq('id', itemId);

  if (updateError) {
    alert('更新價格失敗：' + updateError.message);
  } else {
    alert('🎉 出價成功！');
    await logActivity('place_bid');
    await fetchAuctions();
    openDetailModal(itemId);
  }
}
