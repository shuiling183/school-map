// ===== 上海初中分布地图 - 纯静态版 v2 =====
const PASSWORD = 'shanghai2026';
const AMAP_KEY = 'fd6164c500d567b965a18497e92139d9';
const AMAP_SECRET = '699e495168e30b5c0dc90291b04836d1';
let map, geocoder, markers = [], favIds = new Set(), hiddenIds = new Set(), showFavOnly = false, currentSchool = null;
let amapLoaded = false;

// 动态加载高德地图
function loadAMap(callback) {
  if (amapLoaded) { callback(); return; }
  if (window.AMap) { amapLoaded = true; callback(); return; }
  // JS API v2.0 安全密钥配置（必须在加载API前设置）
  window._AMapSecurityConfig = { securityJsCode: AMAP_SECRET };
  const script = document.createElement('script');
  script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + AMAP_KEY + '&plugin=AMap.Geocoder';
  script.onload = function() { amapLoaded = true; callback(); };
  script.onerror = function() { alert('高德地图加载失败，请检查网络或刷新重试'); };
  document.head.appendChild(script);
}

// ===== 登录 =====
function doLogin() {
  if (document.getElementById('pwdInput').value === PASSWORD) {
    localStorage.setItem('auth_school_map', 'true');
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mapPage').style.display = 'block';
    loadAMap(initMap);
  } else { document.getElementById('loginError').style.display = 'block'; }
}
if (localStorage.getItem('auth_school_map') === 'true') {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mapPage').style.display = 'block';
  window.addEventListener('load', function() { loadAMap(initMap); });
}

// ===== 初始化 =====
function initMap() {
  map = new AMap.Map('mapContainer', {
    zoom: 12, center: [121.47, 31.23], mapStyle: 'amap://styles/light', viewMode: '3D'
  });
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({position:{top:60,right:10}}));
  geocoder = new AMap.Geocoder({city:'上海'});

  favIds = new Set(JSON.parse(localStorage.getItem('fav_schools')||'[]'));
  hiddenIds = new Set(JSON.parse(localStorage.getItem('hidden_schools')||'[]'));

  populateFilters();
  renderMap();
}

function populateFilters() {
  const districts = [...new Set(ALL_SCHOOLS.map(s=>s.district).filter(Boolean))].sort();
  const sel = document.getElementById('districtFilter');
  districts.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o)});
  document.getElementById('districtFilter').addEventListener('change',renderMap);
  document.getElementById('tierFilter').addEventListener('change',renderMap);
  document.getElementById('typeFilter').addEventListener('change',renderMap);
  document.getElementById('searchInput').addEventListener('input',renderMap);
}

// ===== 渲染地图 =====
function renderMap() {
  markers.forEach(m=>map.remove(m)); markers=[];

  const district=document.getElementById('districtFilter').value;
  const tier=document.getElementById('tierFilter').value;
  const type=document.getElementById('typeFilter').value;
  const search=document.getElementById('searchInput').value.toLowerCase();

  let filtered=ALL_SCHOOLS;
  if(district) filtered=filtered.filter(s=>s.district===district);
  if(tier) filtered=filtered.filter(s=>(s.tier||'').includes(tier));
  if(type) filtered=filtered.filter(s=>(s.type||'').includes(type));
  if(search) filtered=filtered.filter(s=>(s.name||'').toLowerCase().includes(search)||(s.fullName||'').toLowerCase().includes(search));
  if(showFavOnly) filtered=filtered.filter(s=>favIds.has(s.id));

  // Use district centers with offsets for all markers (reliable, no API calls needed)
  filtered.forEach(school=>{
    const c=getCenter(school.district);
    if(c){
      // Spread schools within their district using pseudo-random but consistent offsets
      const offsetLng=Math.sin(school.id*12.7+1.3)*0.025;
      const offsetLat=Math.cos(school.id*7.3+2.1)*0.025;
      addMarker(school,c[0]+offsetLng,c[1]+offsetLat);
    }
  });
  updateCount();
}

function updateCount() {
  document.getElementById('schoolCount').textContent='共 '+markers.length+' 所学校（隐藏 '+hiddenIds.size+' 所）';
}

// ===== 添加标记（带文字标签）=====
function addMarker(school, lng, lat) {
  const tier=school.tier||'';
  let fc='#95a5a6',sc='#7f8c8d',size=12,tierLabel='';
  if(tier.includes('一梯队')){fc='#e94560';sc='#c0392b';size=16;tierLabel='一梯队';}
  else if(tier.includes('二梯队')){fc='#f39c12';sc='#e67e22';size=14;tierLabel='二梯队';}
  else if(tier.includes('三梯队')){fc='#3498db';sc='#2980b9';size=12;tierLabel='三梯队';}

  const isFav=favIds.has(school.id);
  const isHidden=hiddenIds.has(school.id);
  const opacity=isHidden?'0.35':'1';
  const name=(school.name||'').length>7?(school.name||'').substring(0,6)+'…':(school.name||'');

  const div=document.createElement('div');
  div.innerHTML=
    '<div style="text-align:center;cursor:pointer;opacity:'+opacity+';">'+
    // 圆点标记
    '<div style="width:'+size+'px;height:'+size+'px;background:'+fc+';border:2px solid '+sc+';border-radius:50%;margin:0 auto;box-shadow:0 2px 6px rgba(0,0,0,0.3);'+(isFav?'box-shadow:0 0 10px #f39c12;':'')+(isHidden?'filter:grayscale(100%);':'')+'"></div>'+
    // 学校名称（标记下方）
    '<div style="font-size:10px;color:#222;font-weight:bold;margin-top:2px;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff;max-width:80px;overflow:hidden;text-overflow:ellipsis;">'+name+'</div>'+
    // 梯队标签
    (tierLabel?'<div style="font-size:9px;color:'+fc+';font-weight:bold;text-shadow:0 0 2px #fff;line-height:1;">'+tierLabel+'</div>':'')+
    // 收藏/隐藏标记
    (isFav?'<div style="font-size:9px;color:#f39c12;">★</div>':'')+
    (isHidden?'<div style="font-size:9px;color:#999;">👁 已隐藏</div>':'')+
    '</div>';

  const marker=new AMap.Marker({
    position:[lng,lat], content:div,
    offset:new AMap.Pixel(-size/2,-size-20),
    zIndex:tier.includes('一梯队')?100:(tier.includes('二梯队')?80:60)
  });
  marker.on('click',()=>showDetail(school));
  marker.setMap(map);
  markers.push(marker);
}

// ===== 详情面板 =====
function showDetail(school) {
  currentSchool=school;
  const tc=(school.tier||'').includes('一梯队')?'t1':((school.tier||'').includes('二梯队')?'t2':'t3');
  const isFav=favIds.has(school.id);
  const isHidden=hiddenIds.has(school.id);
  const notes=localStorage.getItem('note_'+school.id)||'';

  document.getElementById('detailContent').innerHTML=
    '<button class="close" onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">✕</button>'+
    '<h3>'+school.name+' <span class="tier-tag '+tc+'">'+(school.tier||'未知')+'</span></h3>'+
    '<div class="detail-row"><span class="label">全称</span><span class="value">'+(school.fullName||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">区域/类型</span><span class="value">'+(school.district||'')+' | '+(school.type||'')+'</span></div>'+
    '<div class="detail-row"><span class="label">地址</span><span class="value">'+(school.address||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">市重率(2025)</span><span class="value" style="color:#e94560;font-weight:bold;">'+(school.srRate25||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">市重率(2024)</span><span class="value">'+(school.srRate24||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">入户年限(2025)</span><span class="value">'+(school.residency25||'-')+'</span></div>'+
    ((school.type||'').includes('民办')?'<div class="detail-row"><span class="label">中签率</span><span class="value">'+(school.lotteryRate||'-')+'</span></div>':'')+
    '<div class="detail-row"><span class="label">对口小学</span><span class="value">'+(school.feederSchool||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">学区小区</span><span class="value" style="font-size:11px;">'+(school.communities||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">亮点</span><span class="value">'+(school.highlights||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">我的备注</span><span class="value" id="noteDisplay">'+(notes||'无')+'</span></div>'+
    '<textarea class="edit-area" id="noteEditArea" placeholder="添加个人备注..." style="display:none;">'+notes+'</textarea>'+
    // 操作按钮行
    '<div class="btn-row">'+
    '<button class="btn-fav" onclick="toggleFav('+school.id+')">'+(isFav?'★ 取消收藏':'☆ 收藏')+'</button>'+
    '<button class="btn-hide" onclick="toggleHide('+school.id+')" style="background:'+(isHidden?'#2ecc71':'#e74c3c')+';color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:13px;">'+(isHidden?'👁 取消隐藏':'🚫 隐藏此校')+'</button>'+
    '<button class="btn-save" id="editNoteBtn" onclick="editNote()">✏️ 备注</button>'+
    '<button class="btn-save" id="saveNoteBtn" onclick="saveNote('+school.id+')" style="display:none;">💾 保存</button>'+
    '<button class="btn-close" onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">关闭</button>'+
    '</div>';
  panel.style.display='block';
}

// ===== 隐藏/显示学校 =====
function toggleHide(id) {
  if(hiddenIds.has(id)) hiddenIds.delete(id); else hiddenIds.add(id);
  localStorage.setItem('hidden_schools',JSON.stringify([...hiddenIds]));
  renderMap();
  // 如果有详情面板打开，刷新它
  if(currentSchool&&currentSchool.id===id) showDetail(currentSchool);
}

// ===== 备注 =====
function editNote() {
  document.getElementById('noteDisplay').style.display='none';
  document.getElementById('noteEditArea').style.display='block';
  document.getElementById('editNoteBtn').style.display='none';
  document.getElementById('saveNoteBtn').style.display='inline-block';
}
function saveNote(id) {
  const note=document.getElementById('noteEditArea').value;
  localStorage.setItem('note_'+id,note);
  document.getElementById('noteDisplay').textContent=note||'无';
  document.getElementById('noteDisplay').style.display='block';
  document.getElementById('noteEditArea').style.display='none';
  document.getElementById('editNoteBtn').style.display='inline-block';
  document.getElementById('saveNoteBtn').style.display='none';
}

// ===== 收藏 =====
function toggleFav(id) {
  if(favIds.has(id)) favIds.delete(id); else favIds.add(id);
  localStorage.setItem('fav_schools',JSON.stringify([...favIds]));
  if(currentSchool) showDetail(currentSchool);
  renderMap();
}
function toggleFav() {
  showFavOnly=!showFavOnly;
  const btn=document.getElementById('favBtn');
  btn.textContent=showFavOnly?'⭐ 显示全部':'⭐ 只看收藏';
  btn.style.background=showFavOnly?'#e94560':'#f39c12';
  renderMap();
}

// ===== 导出 =====
function exportFav() {
  const favSchools=ALL_SCHOOLS.filter(s=>favIds.has(s.id));
  let csv='名称,区域,类型,梯队,市重率2025,地址,备注,是否隐藏\n';
  favSchools.forEach(s=>{
    csv+=['"'+s.name+'"','"'+s.district+'"','"'+s.type+'"','"'+s.tier+'"','"'+s.srRate25+'"','"'+s.address+'"','"'+localStorage.getItem('note_'+s.id)+'"','"'+hiddenIds.has(s.id)+'"'].join(',')+'\n';
  });
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='我的收藏学校.csv';a.click();
}

// ===== 新增：查看隐藏学校列表 =====
function showHiddenList() {
  const hidden=ALL_SCHOOLS.filter(s=>hiddenIds.has(s.id));
  if(hidden.length===0){alert('没有隐藏的学校');return;}
  let list='已隐藏的学校（点击恢复）：\n\n';
  hidden.forEach(s=>{list+=s.district+' - '+s.name+' ['+(s.tier||'')+']\n';});
  alert(list);
}

// ===== 区域中心 =====
function getCenter(district) {
  const m={'黄浦':[121.48,31.23],'徐汇':[121.44,31.19],'长宁':[121.42,31.22],'静安':[121.45,31.23],'普陀':[121.40,31.25],'虹口':[121.49,31.26],'杨浦':[121.52,31.27],'闵行':[121.38,31.12],'浦东':[121.55,31.22],'宝山':[121.48,31.40],'嘉定':[121.25,31.38],'松江':[121.23,31.03],'青浦':[121.12,31.15],'金山':[121.33,30.75],'奉贤':[121.47,30.92],'崇明':[121.40,31.62]};
  return m[district]||null;
}
