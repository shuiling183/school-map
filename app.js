// ===== 上海初中分布地图 v3 =====
var PASSWORD='shanghai2026',AMAP_KEY='fd6164c500d567b965a18497e92139d9',AMAP_SECRET='699e495168e30b5c0dc90291b04836d1';
var map,markers=[],favIds=new Set(),hiddenIds=new Set(),showFavOnly=false,currentSchool=null,amapLoaded=false;

// 登录
function doLogin(){
  var p=document.getElementById('pwdInput').value;
  if(p===PASSWORD){localStorage.setItem('auth_school_map','true');document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='block';loadAMap(initMap);}
  else document.getElementById('loginError').style.display='block';
}
if(localStorage.getItem('auth_school_map')==='true'){
  document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='block';
  window.addEventListener('load',function(){loadAMap(initMap);});
}
document.getElementById('pwdInput').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

// 加载高德
function loadAMap(cb){
  if(amapLoaded){cb();return;}
  if(window.AMap){amapLoaded=true;cb();return;}
  window._AMapSecurityConfig={securityJsCode:AMAP_SECRET};
  var s=document.createElement('script');
  s.src='https://webapi.amap.com/maps?v=2.0&key='+AMAP_KEY+'&plugin=AMap.Geocoder';
  s.onload=function(){amapLoaded=true;cb();};
  s.onerror=function(){alert('高德地图加载失败');};
  document.head.appendChild(s);
}

// 初始化
function initMap(){
  map=new AMap.Map('mapContainer',{zoom:12,center:[121.47,31.23],mapStyle:'amap://styles/light',viewMode:'3D'});
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({position:{top:60,right:10}}));

  favIds=new Set(JSON.parse(localStorage.getItem('fav_schools')||'[]'));
  hiddenIds=new Set(JSON.parse(localStorage.getItem('hidden_schools')||'[]'));
  populateFilters();
  renderMap();

  // 调试：在地图加载完成后显示学校数量
  setTimeout(function(){
    document.getElementById('schoolCount').textContent='共加载 ALL_SCHOOLS: '+ALL_SCHOOLS.length+' 所';
  },500);
}

function populateFilters(){
  var districts=[...new Set(ALL_SCHOOLS.map(function(s){return s.district;}).filter(Boolean))].sort();
  var sel=document.getElementById('districtFilter');
  districts.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o);});
  document.getElementById('districtFilter').addEventListener('change',renderMap);
  document.getElementById('tierFilter').addEventListener('change',renderMap);
  document.getElementById('typeFilter').addEventListener('change',renderMap);
  document.getElementById('searchInput').addEventListener('input',renderMap);
}

// 渲染
function renderMap(){
  // 清除旧标记
  markers.forEach(function(m){map.remove(m);});
  markers=[];

  var district=document.getElementById('districtFilter').value;
  var tier=document.getElementById('tierFilter').value;
  var type=document.getElementById('typeFilter').value;
  var search=document.getElementById('searchInput').value.toLowerCase();

  var filtered=ALL_SCHOOLS.slice();
  if(district) filtered=filtered.filter(function(s){return s.district===district;});
  if(tier) filtered=filtered.filter(function(s){return (s.tier||'').indexOf(tier)>=0;});
  if(type) filtered=filtered.filter(function(s){return (s.type||'').indexOf(type)>=0;});
  if(search) filtered=filtered.filter(function(s){return (s.name||'').toLowerCase().indexOf(search)>=0||(s.fullName||'').toLowerCase().indexOf(search)>=0;});
  if(showFavOnly) filtered=filtered.filter(function(s){return favIds.has(s.id);});

  // 添加标记
  for(var i=0;i<filtered.length;i++){
    var school=filtered[i];
    var c=getCenter(school.district);
    if(!c) continue;
    var lng=c[0]+Math.sin(school.id*12.7+1.3)*0.025;
    var lat=c[1]+Math.cos(school.id*7.3+2.1)*0.025;
    addMarker(school,lng,lat);
  }

  document.getElementById('schoolCount').textContent='共 '+filtered.length+' 所学校（总数:'+ALL_SCHOOLS.length+'）';
}

function addMarker(school,lng,lat){
  var tier=school.tier||'';
  var fc='#95a5a6',sc='#7f8c8d',size=12,tierLabel='';
  if(tier.indexOf('一梯队')>=0){fc='#e94560';sc='#c0392b';size=16;tierLabel='一梯队';}
  else if(tier.indexOf('二梯队')>=0){fc='#f39c12';sc='#e67e22';size=14;tierLabel='二梯队';}
  else if(tier.indexOf('三梯队')>=0){fc='#3498db';sc='#2980b9';size=12;tierLabel='三梯队';}

  var isFav=favIds.has(school.id);
  var isHidden=hiddenIds.has(school.id);
  var op=isHidden?'0.35':'1';
  var name=(school.name||'').length>7?(school.name||'').substring(0,6)+'…':(school.name||'');

  // 直接用 AMap.Marker 创建标记
  var marker=new AMap.Marker({
    position:[lng,lat],
    icon: new AMap.Icon({
      size: new AMap.Size(size+4,size+4),
      image: 'data:image/svg+xml,'+encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="'+(size+4)+'" height="'+(size+4)+'">'+
        '<circle cx="'+(size/2+2)+'" cy="'+(size/2+2)+'" r="'+size/2+'" fill="'+fc+'" stroke="'+sc+'" stroke-width="2"'+(isHidden?' opacity="0.35"':'')+'/>'+
        (isFav?'<polygon points="'+(size/2+2)+','+(size/2-3)+' '+(size/2-2)+','+(size/2+2)+' '+(size/2+6)+','+(size/2+2)+'" fill="#f39c12"/>':'')+
        '</svg>'
      ),
      imageOffset: new AMap.Pixel(-size/2-2,-size/2-2)
    }),
    label: {
      content: '<div style="font-size:11px;color:#222;font-weight:bold;white-space:nowrap;text-shadow:0 0 4px #fff;">'+name+'</div><div style="font-size:9px;color:'+fc+';font-weight:bold;text-align:center;">'+tierLabel+'</div>',
      offset: new AMap.Pixel(0,size/2+4),
      direction: 'bottom'
    },
    zIndex: tier.indexOf('一梯队')>=0?100:(tier.indexOf('二梯队')>=0?80:60),
    offset: new AMap.Pixel(0,0)
  });

  marker.on('click',function(){showDetail(school);});
  marker.setMap(map);
  markers.push(marker);
}

// 详情
function showDetail(school){
  currentSchool=school;
  var tc=(school.tier||'').indexOf('一梯队')>=0?'t1':((school.tier||'').indexOf('二梯队')>=0?'t2':'t3');
  var isFav=favIds.has(school.id),isHidden=hiddenIds.has(school.id);
  var notes=localStorage.getItem('note_'+school.id)||'';

  document.getElementById('detailContent').innerHTML=
    '<button class="close" onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">✕</button>'+
    '<h3>'+school.name+' <span class="tier-tag '+tc+'">'+(school.tier||'未知')+'</span></h3>'+
    '<div class="detail-row"><span class="label">全称</span><span class="value">'+(school.fullName||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">区域/类型</span><span class="value">'+(school.district||'')+' | '+(school.type||'')+'</span></div>'+
    '<div class="detail-row"><span class="label">地址</span><span class="value">'+(school.address||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">市重率(2025)</span><span class="value" style="color:#e94560;font-weight:bold;">'+(school.srRate25||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">市重率(2024)</span><span class="value">'+(school.srRate24||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">入户年限(2025)</span><span class="value">'+(school.residency25||'-')+'</span></div>'+
    ((school.type||'').indexOf('民办')>=0?'<div class="detail-row"><span class="label">中签率</span><span class="value">'+(school.lotteryRate||'-')+'</span></div>':'')+
    '<div class="detail-row"><span class="label">对口小学</span><span class="value">'+(school.feederSchool||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">亮点</span><span class="value">'+(school.highlights||'-')+'</span></div>'+
    '<div class="detail-row"><span class="label">备注</span><span class="value" id="noteDisplay">'+(notes||'无')+'</span></div>'+
    '<textarea class="edit-area" id="noteEditArea" placeholder="添加备注..." style="display:none;">'+notes+'</textarea>'+
    '<div class="btn-row">'+
    '<button class="btn-fav" onclick="toggleFav('+school.id+')">'+(isFav?'★ 取消':'☆ 收藏')+'</button>'+
    '<button style="background:'+(isHidden?'#2ecc71':'#e74c3c')+';color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:13px;" onclick="toggleHide('+school.id+')">'+(isHidden?'👁 取消隐藏':'🚫 隐藏')+'</button>'+
    '<button class="btn-save" id="editNoteBtn" onclick="editNote()">✏️ 备注</button>'+
    '<button class="btn-save" id="saveNoteBtn" onclick="saveNote('+school.id+')" style="display:none;">💾 保存</button>'+
    '<button class="btn-close" onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">关闭</button></div>';
  document.getElementById('detailPanel').style.display='block';
}

function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hidden_schools',JSON.stringify([...hiddenIds]));renderMap();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fav_schools',JSON.stringify([...favIds]));if(currentSchool)showDetail(currentSchool);renderMap();}
function toggleFav(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'⭐ 显示全部':'⭐ 只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';renderMap();}
function editNote(){document.getElementById('noteDisplay').style.display='none';document.getElementById('noteEditArea').style.display='block';document.getElementById('editNoteBtn').style.display='none';document.getElementById('saveNoteBtn').style.display='inline-block';}
function saveNote(id){var n=document.getElementById('noteEditArea').value;localStorage.setItem('note_'+id,n);document.getElementById('noteDisplay').textContent=n||'无';document.getElementById('noteDisplay').style.display='block';document.getElementById('noteEditArea').style.display='none';document.getElementById('editNoteBtn').style.display='inline-block';document.getElementById('saveNoteBtn').style.display='none';}
function exportFav(){
  var fav=ALL_SCHOOLS.filter(function(s){return favIds.has(s.id);});
  var csv='名称,区域,类型,梯队,市重率2025,地址,备注\n';
  fav.forEach(function(s){csv+='"'+s.name+'","'+s.district+'","'+s.type+'","'+s.tier+'","'+s.srRate25+'","'+s.address+'","'+(localStorage.getItem('note_'+s.id)||'')+'"\n';});
  var b=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='收藏学校.csv';a.click();
}
function getCenter(d){
  var m={'黄浦':[121.48,31.23],'徐汇':[121.44,31.19],'长宁':[121.42,31.22],'静安':[121.45,31.23],'普陀':[121.40,31.25],'虹口':[121.49,31.26],'杨浦':[121.52,31.27],'闵行':[121.38,31.12],'浦东':[121.55,31.22],'宝山':[121.48,31.40],'嘉定':[121.25,31.38],'松江':[121.23,31.03],'青浦':[121.12,31.15],'金山':[121.33,30.75],'奉贤':[121.47,30.92],'崇明':[121.40,31.62]};
  return m[d]||null;
}
