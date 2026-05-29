// ===== 上海初中分布地图 v4 - 最简标记 =====
var PASSWORD='shanghai2026';

// 登录
function doLogin(){
  var p=document.getElementById('pwdInput').value;
  if(p===PASSWORD){localStorage.setItem('auth_school_map','true');showMap();}
  else document.getElementById('loginError').style.display='block';
}
if(localStorage.getItem('auth_school_map')==='true') window.addEventListener('load',showMap);
document.getElementById('pwdInput').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

function showMap(){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('mapPage').style.display='block';
  loadAMap(initMap);
}

// 加载高德
var _amapReady=false;
function loadAMap(cb){
  if(_amapReady){cb();return;}
  window._AMapSecurityConfig={securityJsCode:'699e495168e30b5c0dc90291b04836d1'};
  var s=document.createElement('script');
  s.src='https://webapi.amap.com/maps?v=2.0&key=fd6164c500d567b965a18497e92139d9';
  s.onload=function(){_amapReady=true;cb();};
  s.onerror=function(){alert('高德地图加载失败，请刷新重试');};
  document.head.appendChild(s);
}

var map,favIds,hiddenIds,showFavOnly,currentSchool,allMarkers=[];

function initMap(){
  favIds=new Set(JSON.parse(localStorage.getItem('fav_schools')||'[]'));
  hiddenIds=new Set(JSON.parse(localStorage.getItem('hidden_schools')||'[]'));
  showFavOnly=false;

  map=new AMap.Map('mapContainer',{zoom:11,center:[121.47,31.22],mapStyle:'amap://styles/light',viewMode:'3D'});

  populateFilters();
  doRender();
}

function populateFilters(){
  var ds=[...new Set(ALL_SCHOOLS.map(function(s){return s.district;}).filter(Boolean))].sort();
  var sel=document.getElementById('districtFilter');
  ds.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o);});
  document.getElementById('districtFilter').onchange=doRender;
  document.getElementById('tierFilter').onchange=doRender;
  document.getElementById('typeFilter').onchange=doRender;
  document.getElementById('searchInput').oninput=doRender;
}

function doRender(){
  // 清除
  if(map) map.clearMap();
  allMarkers=[];

  var d=document.getElementById('districtFilter').value;
  var t=document.getElementById('tierFilter').value;
  var tp=document.getElementById('typeFilter').value;
  var s=document.getElementById('searchInput').value.toLowerCase();

  var list=ALL_SCHOOLS.slice();
  if(d) list=list.filter(function(x){return x.district===d;});
  if(t) list=list.filter(function(x){return (x.tier||'').indexOf(t)>=0;});
  if(tp) list=list.filter(function(x){return (x.type||'').indexOf(tp)>=0;});
  if(s) list=list.filter(function(x){return (x.name||'').toLowerCase().indexOf(s)>=0;});
  if(showFavOnly) list=list.filter(function(x){return favIds.has(x.id);});

  for(var i=0;i<list.length;i++){
    addOne(list[i]);
  }
  document.getElementById('schoolCount').textContent='共 '+list.length+' 所学校';
}

function addOne(school){
  var c=getCenter(school.district); if(!c) return;
  var lng=c[0]+Math.sin(school.id*12.7+1.3)*0.025;
  var lat=c[1]+Math.cos(school.id*7.3+2.1)*0.025;

  var tier=school.tier||'',fc='#7f8c8d',r=6;
  if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}
  else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}
  else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
  var isHidden=hiddenIds.has(school.id);
  if(isHidden){fc='#ccc';r=5;}

  // 圆点标记
  var cm=new AMap.CircleMarker({
    center:[lng,lat], radius:r, fillColor:fc, fillOpacity:0.9,
    strokeColor:'#fff', strokeWeight:2, zIndex:tier.indexOf('一梯队')>=0?100:60
  });
  cm.setMap(map);

  // 文字标签
  var name=(school.name||'').length>7?(school.name||'').substring(0,5)+'…':(school.name||'');
  var label=new AMap.Text({
    text:name, position:[lng,lat], offset:new AMap.Pixel(0,r+8),
    style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},
    zIndex:101
  });
  label.setMap(map);

  // 梯队标签
  var tl=tier.indexOf('一梯队')>=0?'一梯队':(tier.indexOf('二梯队')>=0?'二梯队':(tier.indexOf('三梯队')>=0?'三梯队':''));
  if(tl){
    var tierLabel=new AMap.Text({
      text:tl, position:[lng,lat], offset:new AMap.Pixel(0,r+20),
      style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},
      zIndex:101
    });
    tierLabel.setMap(map);
  }

  // 收藏星标
  if(favIds.has(school.id)){
    var star=new AMap.Text({
      text:'★', position:[lng,lat], offset:new AMap.Pixel(0,-r-8),
      style:{'font-size':'14px','color':'#f39c12','font-weight':'bold','text-align':'center'},
      zIndex:102
    });
    star.setMap(map);
  }

  // 点击事件
  cm.on('click',function(){showDetail(school);});
  allMarkers.push(cm);
}

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

function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hidden_schools',JSON.stringify([...hiddenIds]));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fav_schools',JSON.stringify([...favIds]));if(currentSchool)showDetail(currentSchool);doRender();}
function toggleFav(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'⭐ 显示全部':'⭐ 只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';doRender();}
function editNote(){document.getElementById('noteDisplay').style.display='none';document.getElementById('noteEditArea').style.display='block';document.getElementById('editNoteBtn').style.display='none';document.getElementById('saveNoteBtn').style.display='inline-block';}
function saveNote(id){var n=document.getElementById('noteEditArea').value;localStorage.setItem('note_'+id,n);document.getElementById('noteDisplay').textContent=n||'无';document.getElementById('noteDisplay').style.display='block';document.getElementById('noteEditArea').style.display='none';document.getElementById('editNoteBtn').style.display='inline-block';document.getElementById('saveNoteBtn').style.display='none';}
function exportFav(){
  var fav=ALL_SCHOOLS.filter(function(s){return favIds.has(s.id);});
  var csv='名称,区域,类型,梯队,市重率2025,地址\n';
  fav.forEach(function(s){csv+='"'+s.name+'","'+s.district+'","'+s.type+'","'+s.tier+'","'+s.srRate25+'","'+s.address+'"\n';});
  var b=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='收藏学校.csv';a.click();
}
function getCenter(d){
  var m={'黄浦':[121.48,31.23],'徐汇':[121.44,31.19],'长宁':[121.42,31.22],'静安':[121.45,31.23],'普陀':[121.40,31.25],'虹口':[121.49,31.26],'杨浦':[121.52,31.27],'闵行':[121.38,31.12],'浦东':[121.55,31.22],'宝山':[121.48,31.40],'嘉定':[121.25,31.38],'松江':[121.23,31.03],'青浦':[121.12,31.15],'金山':[121.33,30.75],'奉贤':[121.47,30.92],'崇明':[121.40,31.62]};
  return m[d]||null;
}
