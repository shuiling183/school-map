// ===== 上海初中分布地图 v6 - 可编辑 =====
var PASSWORD='shanghai2026';

// 登录
function doLogin(){
  var p=document.getElementById('pwdInput').value;
  if(p===PASSWORD){localStorage.setItem('auth_school_map','true');showMap();}
  else document.getElementById('loginError').style.display='block';
}
if(localStorage.getItem('auth_school_map')==='true') window.addEventListener('load',showMap);
document.getElementById('pwdInput').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

// 加载用户编辑数据
function loadEdits(){
  try{return JSON.parse(localStorage.getItem('school_edits')||'{}');}catch(e){return{};}
}
function saveEdits(edits){localStorage.setItem('school_edits',JSON.stringify(edits));}

function getSchoolData(school){
  var edits=loadEdits();
  var e=edits[school.id]||{};
  return {
    tier: e.tier!==undefined?e.tier:school.tier,
    srRate25: e.srRate25!==undefined?e.srRate25:school.srRate25,
    srRate24: e.srRate24!==undefined?e.srRate24:school.srRate24,
    srRate23: e.srRate23!==undefined?e.srRate23:school.srRate23,
    residency25: e.residency25!==undefined?e.residency25:school.residency25,
    highlights: e.highlights!==undefined?e.highlights:school.highlights,
    notes: e.notes!==undefined?e.notes:''
  };
}

function showMap(){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('mapPage').style.display='block';
  setTimeout(initMap,200);
}

var map,favIds,hiddenIds,showFavOnly,currentSchool;

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
  if(map) map.clearMap();

  var d=document.getElementById('districtFilter').value;
  var t=document.getElementById('tierFilter').value;
  var tp=document.getElementById('typeFilter').value;
  var s=document.getElementById('searchInput').value.toLowerCase();

  var list=ALL_SCHOOLS.slice();
  if(d) list=list.filter(function(x){return x.district===d;});
  if(t) list=list.filter(function(x){
    var td=getSchoolData(x).tier;
    return (td||'').indexOf(t)>=0;
  });
  if(tp) list=list.filter(function(x){return (x.type||'').indexOf(tp)>=0;});
  if(s) list=list.filter(function(x){return (x.name||'').toLowerCase().indexOf(s)>=0;});
  if(showFavOnly) list=list.filter(function(x){return favIds.has(x.id);});

  for(var i=0;i<list.length;i++){addOne(list[i]);}
  document.getElementById('schoolCount').textContent='共 '+list.length+' 所学校';
}

function addOne(school){
  var c=getCenter(school.district); if(!c) return;
  var lng=c[0]+Math.sin(school.id*12.7+1.3)*0.025;
  var lat=c[1]+Math.cos(school.id*7.3+2.1)*0.025;

  var sd=getSchoolData(school);
  var tier=sd.tier||'',fc='#7f8c8d',r=6;
  if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}
  else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}
  else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
  var isHidden=hiddenIds.has(school.id);
  if(isHidden){fc='#ccc';r=5;}

  var cm=new AMap.CircleMarker({center:[lng,lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:'#fff',strokeWeight:2});
  cm.setMap(map);

  var name=(school.name||'').length>7?(school.name||'').substring(0,5)+'…':(school.name||'');
  var label=new AMap.Text({text:name,position:[lng,lat],offset:new AMap.Pixel(0,r+8),
    style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101});
  label.setMap(map);

  var tl=tier.indexOf('一梯队')>=0?'一梯队':(tier.indexOf('二梯队')>=0?'二梯队':(tier.indexOf('三梯队')>=0?'三梯队':''));
  if(tl){
    var tierLabel=new AMap.Text({text:tl,position:[lng,lat],offset:new AMap.Pixel(0,r+20),
      style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101});
    tierLabel.setMap(map);
  }

  if(favIds.has(school.id)){
    var star=new AMap.Text({text:'★',position:[lng,lat],offset:new AMap.Pixel(0,-r-8),
      style:{'font-size':'14px','color':'#f39c12','font-weight':'bold','text-align':'center'},zIndex:102});
    star.setMap(map);
  }

  cm.on('click',function(){showDetail(school);});
}

// ===== 详情+编辑面板 =====
function showDetail(school){
  currentSchool=school;
  var sd=getSchoolData(school);
  var tier=sd.tier||'';
  var tc=tier.indexOf('一梯队')>=0?'t1':(tier.indexOf('二梯队')>=0?'t2':(tier.indexOf('三梯队')>=0?'t3':''));
  var isFav=favIds.has(school.id),isHidden=hiddenIds.has(school.id);

  var html='<button class="close" onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">✕</button>';
  html+='<h3>'+school.name+' <span class="tier-tag '+tc+'">'+tier+'</span></h3>';
  html+='<div class="detail-row"><span class="label">全称</span><span class="value">'+(school.fullName||'-')+'</span></div>';
  html+='<div class="detail-row"><span class="label">区域/类型</span><span class="value">'+(school.district||'')+' | '+(school.type||'')+'</span></div>';
  html+='<div class="detail-row"><span class="label">地址</span><span class="value">'+(school.address||'-')+'</span></div>';

  // editable fields
  html+='<h4 style="margin:15px 0 8px;color:#e94560;">✏️ 可编辑字段</h4>';
  html+=editableRow('梯队','tier_'+school.id,tier,'一梯队 / 二梯队 / 三梯队');
  html+=editableRow('市重率2025','sr25_'+school.id,sd.srRate25,'如: 约40%');
  html+=editableRow('市重率2024','sr24_'+school.id,sd.srRate24,'如: 约38%');
  html+=editableRow('市重率2023','sr23_'+school.id,sd.srRate23,'如: 约35%');
  html+=editableRow('入户年限2025','res25_'+school.id,sd.residency25,'如: 户籍满3年');
  html+=editableRow('亮点','hl_'+school.id,sd.highlights,'教学特色/成绩亮点');
  html+='<div class="detail-row"><span class="label">备注</span><span class="value"><textarea id="notes_'+school.id+'" class="edit-area" placeholder="个人备注...">'+(sd.notes||'')+'</textarea></span></div>';

  // read-only fields
  html+='<h4 style="margin:15px 0 8px;color:#aaa;">📋 原始数据（只读）</h4>';
  html+='<div class="detail-row"><span class="label">原始梯队</span><span class="value" style="color:#888;">'+(school.tier||'-')+'</span></div>';
  html+='<div class="detail-row"><span class="label">原始市重率</span><span class="value" style="color:#888;">'+(school.srRate25||'-')+' / '+(school.srRate24||'-')+' / '+(school.srRate23||'-')+'</span></div>';
  html+='<div class="detail-row"><span class="label">原始入户年限</span><span class="value" style="color:#888;">'+(school.residency25||'-')+'</span></div>';
  html+='<div class="detail-row"><span class="label">原始亮点</span><span class="value" style="color:#888;">'+(school.highlights||'-')+'</span></div>';

  // 仅民办显示中签率
  if((school.type||'').indexOf('民办')>=0){
    html+='<div class="detail-row"><span class="label">中签率</span><span class="value">'+(school.lotteryRate||'-')+'</span></div>';
  }

  html+='<div class="btn-row">';
  html+='<button class="btn-fav" onclick="toggleFav('+school.id+')">'+(isFav?'★ 取消':'☆ 收藏')+'</button>';
  html+='<button style="background:'+(isHidden?'#2ecc71':'#e74c3c')+';color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:13px;" onclick="toggleHide('+school.id+')">'+(isHidden?'👁 取消隐藏':'🚫 隐藏')+'</button>';
  html+='<button style="background:#2ecc71;color:#fff;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:14px;font-weight:bold;" onclick="saveEditsForSchool('+school.id+')">💾 保存修改</button>';
  html+='<button class="btn-close" onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">关闭</button></div>';

  document.getElementById('detailContent').innerHTML=html;
  document.getElementById('detailPanel').style.display='block';
}

function editableRow(label,id,value,placeholder){
  return '<div class="detail-row"><span class="label">'+label+'</span><span class="value"><input type="text" id="'+id+'" value="'+(value||'').replace(/"/g,'&quot;')+'" placeholder="'+placeholder+'" style="width:100%;padding:4px 8px;background:#16213e;color:#eee;border:1px solid #444;border-radius:4px;font-size:13px;"/></span></div>';
}

function saveEditsForSchool(id){
  var school=ALL_SCHOOLS.find(function(s){return s.id===id;});
  if(!school) return;

  var edits=loadEdits();
  edits[id]={
    tier: document.getElementById('tier_'+id).value,
    srRate25: document.getElementById('sr25_'+id).value,
    srRate24: document.getElementById('sr24_'+id).value,
    srRate23: document.getElementById('sr23_'+id).value,
    residency25: document.getElementById('res25_'+id).value,
    highlights: document.getElementById('hl_'+id).value,
    notes: document.getElementById('notes_'+id).value
  };
  saveEdits(edits);

  // 刷新地图标记（颜色会根据新梯队变化）
  doRender();
  // 重新打开编辑面板（保持编辑状态）
  showDetail(school);
  // 闪烁提示
  var panel=document.getElementById('detailPanel');
  panel.style.boxShadow='0 0 20px #2ecc71';
  setTimeout(function(){panel.style.boxShadow='';},1000);
}

// ===== 其他功能 =====
function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hidden_schools',JSON.stringify([...hiddenIds]));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fav_schools',JSON.stringify([...favIds]));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFav(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'⭐ 显示全部':'⭐ 只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';doRender();}

function exportFav(){
  var fav=ALL_SCHOOLS.filter(function(s){return favIds.has(s.id);});
  var edits=loadEdits();
  var csv='名称,区域,类型,梯队(编辑后),市重率2025(编辑后),地址\n';
  fav.forEach(function(s){
    var e=edits[s.id]||{},sd=getSchoolData(s);
    csv+='"'+s.name+'","'+s.district+'","'+s.type+'","'+sd.tier+'","'+sd.srRate25+'","'+s.address+'"\n';
  });
  var b=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='收藏学校.csv';a.click();
}

function getCenter(d){
  var m={'黄浦':[121.48,31.23],'徐汇':[121.44,31.19],'长宁':[121.42,31.22],'静安':[121.45,31.23],'普陀':[121.40,31.25],'虹口':[121.49,31.26],'杨浦':[121.52,31.27],'闵行':[121.38,31.12],'浦东':[121.55,31.22],'宝山':[121.48,31.40],'嘉定':[121.25,31.38],'松江':[121.23,31.03],'青浦':[121.12,31.15],'金山':[121.33,30.75],'奉贤':[121.47,30.92],'崇明':[121.40,31.62]};
  return m[d]||null;
}
