// ===== v17 minimal stable =====
var PASSWORD='shanghai2026',VERSION='v17',map,favIds,hiddenIds,showFavOnly,currentSchool,geoCodingActive=false;

function doLogin(){if(document.getElementById('pwdInput').value===PASSWORD){localStorage.setItem('a','1');showMap();}else document.getElementById('loginError').style.display='block';}
function showMap(){document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='block';setTimeout(initMap,300);}
if(localStorage.getItem('a')==='1'){document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='block';window.onload=initMap;}

function loadEdits(){try{return JSON.parse(localStorage.getItem('ed3')||'{}');}catch(e){return{};}}
function saveEdits(e){localStorage.setItem('ed3',JSON.stringify(e));}
function getGeoCache(){try{return JSON.parse(localStorage.getItem('g7')||'{}');}catch(e){return{};}}
function setGeoCache(c){localStorage.setItem('g7',JSON.stringify(c));}
function sdata(s){var e=loadEdits(),d=e[s.id]||{};return{tier:d.tier!==undefined?d.tier:s.tier,sr25:d.srRate25!==undefined?d.srRate25:s.srRate25,sr24:d.srRate24!==undefined?d.srRate24:s.srRate24,sr23:d.srRate23!==undefined?d.srRate23:s.srRate23,res25:d.residency25!==undefined?d.residency25:s.residency25,hl:d.highlights!==undefined?d.highlights:s.highlights,notes:d.notes!==undefined?d.notes:''};}
function getCoord(s){var c=getGeoCache();if(c[s.id]&&c[s.id].lng)return c[s.id];var o=ctr(s.district);if(!o)return null;return{lng:o[0]+Math.sin(s.id*12.7)*0.02,lat:o[1]+Math.cos(s.id*7.3)*0.02};}
function ctr(d){var m={'黄浦':[121.48,31.23],'徐汇':[121.44,31.19],'长宁':[121.42,31.22],'静安':[121.45,31.23],'普陀':[121.40,31.25],'虹口':[121.49,31.26],'杨浦':[121.52,31.27],'闵行':[121.38,31.12],'浦东':[121.55,31.22],'宝山':[121.48,31.40],'嘉定':[121.25,31.38],'松江':[121.23,31.03],'青浦':[121.12,31.15],'金山':[121.33,30.75],'奉贤':[121.47,30.92],'崇明':[121.40,31.62]};return m[d]||null;}

function initMap(){
  favIds=new Set(JSON.parse(localStorage.getItem('fv3')||'[]'));
  hiddenIds=new Set(JSON.parse(localStorage.getItem('hd3')||'[]'));
  map=new AMap.Map('mapContainer',{zoom:11,center:[121.47,31.22],mapStyle:'amap://styles/light',viewMode:'3D'});
  var ds=[],seen={};
  for(var i=0;i<ALL_SCHOOLS.length;i++){var d=ALL_SCHOOLS[i].district;if(d&&!seen[d]){ds.push(d);seen[d]=1;}}
  ds.sort();
  var sel=document.getElementById('districtFilter');
  for(var i=0;i<ds.length;i++){var o=document.createElement('option');o.value=ds[i];o.textContent=ds[i];sel.appendChild(o);}
  sel.onchange=render;document.getElementById('tierFilter').onchange=render;
  document.getElementById('typeFilter').onchange=render;document.getElementById('searchInput').oninput=render;
  render();
  setTimeout(startGeocoding,2000);
}

function render(){
  if(!map)return;map.clearMap();
  var d=document.getElementById('districtFilter').value,t=document.getElementById('tierFilter').value,tp=document.getElementById('typeFilter').value,s=document.getElementById('searchInput').value.toLowerCase();
  var list=[];
  for(var i=0;i<ALL_SCHOOLS.length;i++){
    var x=ALL_SCHOOLS[i];
    if(d&&x.district!==d)continue;
    if(t&&(sdata(x).tier||'').indexOf(t)<0)continue;
    if(tp&&(x.type||'').indexOf(tp)<0)continue;
    if(s&&!msearch(x,s))continue;
    if(showFavOnly&&!favIds.has(x.id))continue;
    list.push(x);
  }
  for(var i=0;i<list.length;i++)addOne(list[i]);
  if(!geoCodingActive)document.getElementById('schoolCount').innerHTML='共 '+list.length+' 所 ('+VERSION+') <a href="#" onclick="startGeocoding();return false" style="color:#2ecc71">定位</a> <a href="#" onclick="localStorage.removeItem(\'g7\');location.reload();return false" style="color:#e94560">重置</a>';
}

function addOne(s){
  var c=getCoord(s);if(!c)return;
  var lng=c.lng,lat=c.lat,tier=sdata(s).tier||'',fc='#7f8c8d',r=6;
  if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
  if(hiddenIds.has(s.id)){fc='#ccc';r=4;}
  var cm=new AMap.CircleMarker({center:[lng,lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:'#fff',strokeWeight:2});cm.setMap(map);
  var nm=(s.name||'').length>6?(s.name||'').substring(0,5)+'..':(s.name||'');
  new AMap.Text({text:nm,position:[lng,lat],offset:new AMap.Pixel(0,r+8),style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  var tl=tier.indexOf('一梯队')>=0?'一梯队':(tier.indexOf('二梯队')>=0?'二梯队':(tier.indexOf('三梯队')>=0?'三梯队':''));
  if(tl)new AMap.Text({text:tl,position:[lng,lat],offset:new AMap.Pixel(0,r+20),style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  cm.on('click',function(){detail(s);});
}

function msearch(s,k){
  var a={'上实西校':['实验西校','上海实验西校'],'华师大二附校':['闵华二'],'骏博外国语':['骏博'],'兰生复旦':['兰生'],'新华初级':['新华初'],'迅行初级':['迅行'],'五浦汇实验':['五浦汇'],'宝山华曜':['华曜宝山'],'上外双语':['杨浦双语']};
  if(a[s.name]){for(var i=0;i<a[s.name].length;i++){if(a[s.name][i].toLowerCase().indexOf(k)>=0)return true;}}
  var f=[s.name,s.fullName,s.district,s.address,sdata(s).tier];
  for(var i=0;i<f.length;i++){if((f[i]||'').toLowerCase().indexOf(k)>=0)return true;}
  return false;
}

function detail(s){
  currentSchool=s;var t=sdata(s),tier=t.tier||'',tc='t3';if(tier.indexOf('一梯队')>=0)tc='t1';else if(tier.indexOf('二梯队')>=0)tc='t2';
  var isF=favIds.has(s.id),isH=hiddenIds.has(s.id),n=t.notes||'';
  var h='<button class="close" onclick="document.getElementById(\'dp\').style.display=\'none\'">X</button>';
  h+='<h3>'+s.name+' <span class="tier-tag '+tc+'">'+tier+'</span></h3>';
  h+='<p>全称: '+(s.fullName||'-')+'</p><p>区域: '+s.district+' | '+s.type+'</p><p>地址: '+(s.address||'-')+'</p>';
  h+='<hr><b>可编辑</b><br>';
  h+=erow('梯队','tier_'+s.id,tier);
  h+=erow('市重率25','sr25_'+s.id,t.sr25);
  h+=erow('市重率24','sr24_'+s.id,t.sr24);
  h+=erow('市重率23','sr23_'+s.id,t.sr23);
  h+=erow('入户25','res25_'+s.id,t.res25);
  h+=erow('亮点','hl_'+s.id,t.hl);
  h+='备注: <textarea id="notes_'+s.id+'" style="width:100%;height:50px;background:#16213e;color:#eee;border:1px solid #444">'+n+'</textarea><br>';
  h+='<button onclick="fav('+s.id+')">'+(isF?'取消收藏':'收藏')+'</button> ';
  h+='<button onclick="hide('+s.id+')">'+(isH?'显示':'隐藏')+'</button> ';
  h+='<button onclick="sv('+s.id+')" style="background:#2ecc71">保存</button> ';
  h+='<button onclick="document.getElementById(\'dp\').style.display=\'none\'">关闭</button>';
  document.getElementById('detailContent').innerHTML=h;document.getElementById('detailPanel').style.display='block';
}
function erow(l,id,v){return l+': <input id="'+id+'" value="'+(v||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:2px 6px;background:#16213e;color:#eee;border:1px solid #444;font-size:13px;margin:2px 0"><br>';}
function sv(id){var e=loadEdits();e[id]={tier:document.getElementById('tier_'+id).value,srRate25:document.getElementById('sr25_'+id).value,srRate24:document.getElementById('sr24_'+id).value,srRate23:document.getElementById('sr23_'+id).value,residency25:document.getElementById('res25_'+id).value,highlights:document.getElementById('hl_'+id).value,notes:document.getElementById('notes_'+id).value};saveEdits(e);render();detail(ALL_SCHOOLS.find(function(x){return x.id===id;}));}
function fav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fv3',JSON.stringify([...favIds]));render();if(currentSchool&&currentSchool.id===id)detail(currentSchool);}
function hide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hd3',JSON.stringify([...hiddenIds]));render();if(currentSchool&&currentSchool.id===id)detail(currentSchool);}
function toggleFavFilter(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'显示全部':'只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';render();}

function startGeocoding(){
  if(geoCodingActive)return;
  var cache=getGeoCache(),todo=[];
  for(var i=0;i<ALL_SCHOOLS.length;i++){var s=ALL_SCHOOLS[i];if(s.address&&!cache[s.id])todo.push(s);}
  if(todo.length===0)return;
  if(typeof AMap==='undefined'||!AMap.Geocoder)return;
  geoCodingActive=true;
  document.getElementById('schoolCount').textContent='定位中...0/'+todo.length;
  var gc=new AMap.Geocoder({city:'上海'}),idx=0,ok=0;
  function next(){
    if(idx>=todo.length){setGeoCache(cache);geoCodingActive=false;render();return;}
    gc.getLocation(todo[idx].address,function(status,result){
      if(status==='complete'&&result.geocodes&&result.geocodes.length>0){var loc=result.geocodes[0].location;cache[todo[idx].id]={lng:loc.lng,lat:loc.lat};ok++;}
      idx++;
      if(idx%20===0||idx>=todo.length){document.getElementById('schoolCount').textContent='定位中 '+idx+'/'+todo.length+' (OK'+ok+')';setGeoCache(cache);render();}
      setTimeout(next,80);
    });
  }
  next();
}

function exportCSV(){
  var e=loadEdits(),csv='﻿区域,简称,性质,全称,中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址\n';
  for(var i=0;i<ALL_SCHOOLS.length;i++){var s=ALL_SCHOOLS[i],d=sdata(s);
    csv+=[s.district,s.name,s.type,s.fullName||'',s.lotteryRate||'',s.residency23||'',s.residency24||'',d.res25||'',s.feederSchool||'',s.communities||'',d.sr23||'',d.sr24||'',d.sr25||'',d.tier||'',d.hl||'',s.address||''].map(function(v){return'"'+(v+'').replace(/"/g,'""')+'"';}).join(',')+'\n';
  }
  var b=new Blob([csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='初中排名_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}