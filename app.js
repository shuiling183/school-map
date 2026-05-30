// ===== 上海初中分布地图 v15 =====
var PASSWORD='shanghai2026',VERSION='v15',map,favIds,hiddenIds,showFavOnly,currentSchool,geoCodingActive=false;

// ====== 登录 ======
function doLogin(){var p=document.getElementById('pwdInput').value;if(p===PASSWORD){localStorage.setItem('auth_v2','true');showMap();}else document.getElementById('loginError').style.display='block';}
if(localStorage.getItem('auth_v2')==='true'){document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='block';window.addEventListener('load',showMap);}
document.getElementById('pwdInput').addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});

// ====== 数据管理 ======
function loadEdits(){try{return JSON.parse(localStorage.getItem('edits_v2')||'{}');}catch(e){return{};}}
function saveEdits(edits){localStorage.setItem('edits_v2',JSON.stringify(edits));}
function getGeoCache(){try{return JSON.parse(localStorage.getItem('geo_v5')||'{}');}catch(e){return{};}}
function setGeoCache(c){localStorage.setItem('geo_v5',JSON.stringify(c));}
function getSchoolData(school){var e=loadEdits(),d=e[school.id]||{};return{tier:d.tier!==undefined?d.tier:school.tier,srRate25:d.srRate25!==undefined?d.srRate25:school.srRate25,srRate24:d.srRate24!==undefined?d.srRate24:school.srRate24,srRate23:d.srRate23!==undefined?d.srRate23:school.srRate23,residency25:d.residency25!==undefined?d.residency25:school.residency25,highlights:d.highlights!==undefined?d.highlights:school.highlights,notes:d.notes!==undefined?d.notes:''};}
function getCoord(school){var cache=getGeoCache();if(cache[school.id]&&cache[school.id].lng) return cache[school.id];var c=getCenter(school.district);if(!c) return null;return{lng:c[0]+Math.sin(school.id*12.7)*0.02,lat:c[1]+Math.cos(school.id*7.3)*0.02};}
function getCenter(d){var m={'黄浦':[121.48,31.23],'徐汇':[121.44,31.19],'长宁':[121.42,31.22],'静安':[121.45,31.23],'普陀':[121.40,31.25],'虹口':[121.49,31.26],'杨浦':[121.52,31.27],'闵行':[121.38,31.12],'浦东':[121.55,31.22],'宝山':[121.48,31.40],'嘉定':[121.25,31.38],'松江':[121.23,31.03],'青浦':[121.12,31.15],'金山':[121.33,30.75],'奉贤':[121.47,30.92],'崇明':[121.40,31.62]};return m[d]||null;}

// ====== 初始化 ======
function showMap(){document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='block';setTimeout(initMap,200);}
function initMap(){
  favIds=new Set(JSON.parse(localStorage.getItem('fav_v2')||'[]'));
  hiddenIds=new Set(JSON.parse(localStorage.getItem('hide_v2')||'[]'));
  showFavOnly=false;
  map=new AMap.Map('mapContainer',{zoom:11,center:[121.47,31.22],mapStyle:'amap://styles/light',viewMode:'3D'});
  popFilters();doRender();setTimeout(startGeocoding,2000);
}
function popFilters(){
  var ds=[...new Set(ALL_SCHOOLS.map(function(s){return s.district;}).filter(Boolean))].sort();
  var sel=document.getElementById('districtFilter');
  ds.forEach(function(d){var o=document.createElement('option');o.value=d;o.textContent=d;sel.appendChild(o);});
  document.getElementById('districtFilter').onchange=doRender;
  document.getElementById('tierFilter').onchange=doRender;
  document.getElementById('typeFilter').onchange=doRender;
  document.getElementById('searchInput').oninput=doRender;
}

// ====== 搜索 ======
function matchSearch(school,keyword){
  if(!keyword) return true;
  var k=keyword.toLowerCase(),aliases={'上实西校':['实验西校','上海实验西校'],'华师大二附校':['闵华二'],'骏博外国语':['骏博'],'圣华紫竹':['华二紫竹'],'民办欣竹':['新竹园'],'浦华曜':['华曜浦东'],'兰生复旦':['兰生'],'存志学校':['存志'],'新华初级':['新华初'],'迅行初级':['迅行'],'五浦汇实验':['五浦汇'],'宝山华曜':['华曜宝山'],'华曜初级':['华曜嘉定'],'九峰实验':['九峰'],'上外双语':['杨浦双语']};
  if(aliases[school.name]){for(var a=0;a<aliases[school.name].length;a++){if(aliases[school.name][a].toLowerCase().indexOf(k)>=0) return true;}}
  var fields=[school.name,school.fullName,school.district,school.highlights,getSchoolData(school).tier,school.address];
  for(var i=0;i<fields.length;i++){if((fields[i]||'').toLowerCase().indexOf(k)>=0) return true;}
  for(var i=0;i<fields.length;i++){var f=(fields[i]||'').toLowerCase();if(f&&k.indexOf(f)>=0) return true;}
  return false;
}

// ====== 渲染 ======
function doRender(){
  if(!map) return;
  map.clearMap();
  var d=document.getElementById('districtFilter').value,t=document.getElementById('tierFilter').value,tp=document.getElementById('typeFilter').value,s=document.getElementById('searchInput').value.toLowerCase();
  var list=ALL_SCHOOLS.slice();
  if(d) list=list.filter(function(x){return x.district===d;});
  if(t) list=list.filter(function(x){var td=getSchoolData(x).tier;return(td||'').indexOf(t)>=0;});
  if(tp) list=list.filter(function(x){return(x.type||'').indexOf(tp)>=0;});
  if(s) list=list.filter(function(x){return matchSearch(x,s);});
  if(showFavOnly) list=list.filter(function(x){return favIds.has(x.id);});
  for(var i=0;i<list.length;i++) addOne(list[i]);
  if(!geoCodingActive) updStatus();
}
function addOne(school){
  var coord=getCoord(school);if(!coord) return;
  var lng=coord.lng,lat=coord.lat,sd=getSchoolData(school),tier=sd.tier||'',fc='#7f8c8d',r=6;
  if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
  if(hiddenIds.has(school.id)){fc='#ccc';r=4;}
  var cm=new AMap.CircleMarker({center:[lng,lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:'#fff',strokeWeight:2});cm.setMap(map);
  var name=(school.name||'').length>7?(school.name||'').substring(0,5)+'...':(school.name||'');
  new AMap.Text({text:name,position:[lng,lat],offset:new AMap.Pixel(0,r+8),style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  var tl=tier.indexOf('一梯队')>=0?'一梯队':(tier.indexOf('二梯队')>=0?'二梯队':(tier.indexOf('三梯队')>=0?'三梯队':''));
  if(tl) new AMap.Text({text:tl,position:[lng,lat],offset:new AMap.Pixel(0,r+20),style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  if(favIds.has(school.id)) new AMap.Text({text:'*',position:[lng,lat],offset:new AMap.Pixel(0,-r-8),style:{'font-size':'14px','color':'#f39c12','font-weight':'bold','text-align':'center'},zIndex:102}).setMap(map);
  cm.on('click',function(){showDetail(school);});
}
function updStatus(){
  document.getElementById('schoolCount').innerHTML='共 '+ALL_SCHOOLS.length+' 所学校 ('+VERSION+') <a href="#" onclick="startGeocoding();return false;" style="color:#2ecc71;font-size:11px;">精确定位</a> <a href="#" onclick="localStorage.removeItem('geo_v5');location.reload();return false;" style="color:#e94560;font-size:11px;">重置</a>';
}

// ====== 地理编码 ======
function startGeocoding(){
  if(geoCodingActive) return;
  var cache=getGeoCache(),todo=ALL_SCHOOLS.filter(function(s){return s.address&&s.address!==''&&!cache[s.id];});
  if(todo.length===0){updStatus();return;}
  if(typeof AMap==='undefined'||!AMap.Geocoder){document.getElementById('schoolCount').textContent='Geocoder未加载,点重置';return;}
  geoCodingActive=true;
  document.getElementById('schoolCount').textContent='精确定位中... 0/'+todo.length;
  var geocoder=new AMap.Geocoder({city:'上海'}),i=0,ok=0;
  function next(){
    if(i>=todo.length){setGeoCache(cache);geoCodingActive=false;doRender();updStatus();return;}
    var school=todo[i];
    geocoder.getLocation(school.address,function(status,result){
      i++;
      if(status==='complete'&&result.geocodes&&result.geocodes.length>0){var loc=result.geocodes[0].location;cache[school.id]={lng:loc.lng,lat:loc.lat};ok++;}
      if(i%20===0||i>=todo.length){document.getElementById('schoolCount').textContent='精确定位中 '+i+'/'+todo.length+' (成功'+ok+')';setGeoCache(cache);doRender();}
      setTimeout(next,80);
    });
  }
  next();
}

// ====== 详情+编辑 ======
function showDetail(school){
  currentSchool=school;var sd=getSchoolData(school),tier=sd.tier||'',tc=tier.indexOf('一梯队')>=0?'t1':(tier.indexOf('二梯队')>=0?'t2':'t3');
  var isFav=favIds.has(school.id),isHidden=hiddenIds.has(school.id);
  var h='<button class="close" onclick="hideDetail()">X</button>';
  h+='<h3>'+school.name+' <span class="tier-tag '+tc+'">'+tier+'</span></h3>';
  h+='<div class="detail-row"><span class="label">全称</span><span class="value">'+(school.fullName||'-')+'</span></div>';
  h+='<div class="detail-row"><span class="label">区域/类型</span><span class="value">'+(school.district||'')+' | '+(school.type||'')+'</span></div>';
  h+='<div class="detail-row"><span class="label">地址</span><span class="value">'+(school.address||'-')+'</span></div>';
  h+='<h4 style="margin:15px 0 8px;color:#e94560;">可编辑字段</h4>';
  h+=erow('梯队','tier_'+school.id,tier);
  h+=erow('市重率2025','sr25_'+school.id,sd.srRate25);
  h+=erow('市重率2024','sr24_'+school.id,sd.srRate24);
  h+=erow('市重率2023','sr23_'+school.id,sd.srRate23);
  h+=erow('入户年限2025','res25_'+school.id,sd.residency25);
  h+=erow('亮点','hl_'+school.id,sd.highlights);
  h+='<div class="detail-row"><span class="label">备注</span><span class="value"><textarea id="notes_'+school.id+'" class="edit-area">'+(sd.notes||'')+'</textarea></span></div>';
  if((school.type||'').indexOf('民办')>=0) h+='<div class="detail-row"><span class="label">中签率</span><span class="value">'+(school.lotteryRate||'-')+'</span></div>';
  h+='<div class="btn-row"><button onclick="toggleFav('+school.id+')">'+(isFav?'取消收藏':'收藏')+'</button>';
  h+='<button onclick="toggleHide('+school.id+')">'+(isHidden?'显示':'隐藏')+'</button>';
  h+='<button onclick="saveEdit('+school.id+')" style="background:#2ecc71;">保存修改</button>';
  h+='<button onclick="hideDetail()">关闭</button></div>';
  document.getElementById('detailContent').innerHTML=h;document.getElementById('detailPanel').style.display='block';
}
function erow(label,id,value){return '<div class="detail-row"><span class="label">'+label+'</span><span class="value"><input id="'+id+'" value="'+(value||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:4px 8px;background:#16213e;color:#eee;border:1px solid #444;border-radius:4px;font-size:13px;"></span></div>';}
function hideDetail(){document.getElementById('detailPanel').style.display='none';currentSchool=null;}
function saveEdit(id){
  var edits=loadEdits();
  edits[id]={tier:document.getElementById('tier_'+id).value,srRate25:document.getElementById('sr25_'+id).value,srRate24:document.getElementById('sr24_'+id).value,srRate23:document.getElementById('sr23_'+id).value,residency25:document.getElementById('res25_'+id).value,highlights:document.getElementById('hl_'+id).value,notes:document.getElementById('notes_'+id).value};
  saveEdits(edits);doRender();showDetail(ALL_SCHOOLS.find(function(s){return s.id===id;}));
}
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fav_v2',JSON.stringify([...favIds]));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hide_v2',JSON.stringify([...hiddenIds]));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFavFilter(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'显示全部':'只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';doRender();}

// ====== 导入导出 ======
function exportCSV(){
  var edits=loadEdits(),csv='区域,学校简称,性质,学校全称,民办中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址\n';
  ALL_SCHOOLS.forEach(function(s){var e=edits[s.id]||{},sd=getSchoolData(s);csv+=['"'+s.district+'"','"'+s.name+'"','"'+s.type+'"','"'+(s.fullName||'')+'"','"'+(s.lotteryRate||'')+'"','"'+(s.residency23||'')+'"','"'+(s.residency24||'')+'"','"'+sd.residency25+'"','"'+(s.feederSchool||'')+'"','"'+(s.communities||'')+'"','"'+sd.srRate23+'"','"'+sd.srRate24+'"','"'+sd.srRate25+'"','"'+sd.tier+'"','"'+sd.highlights+'"','"'+(s.address||'')+'"'].join(',')+'\n';});
  var b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='初中排名_导出_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}
function importCSV(){
  var inp=document.createElement('input');inp.type='file';inp.accept='.csv';
  inp.onchange=function(e){var f=e.target.files[0];if(!f) return;var r=new FileReader();r.onload=function(ev){var lines=ev.target.result.split('\n'),edits=loadEdits(),c=0;for(var i=1;i<lines.length;i++){var cols=parseLine(lines[i]);if(cols.length<15) continue;var school=ALL_SCHOOLS.find(function(s){return s.name===cols[1];});if(!school) continue;if(!edits[school.id]) edits[school.id]={};if(cols[8]) edits[school.id].residency25=cols[8];if(cols[12]) edits[school.id].srRate23=cols[12];if(cols[13]) edits[school.id].srRate24=cols[13];if(cols[14]) edits[school.id].srRate25=cols[14];if(cols[15]) edits[school.id].tier=cols[15];if(cols[16]) edits[school.id].highlights=cols[16];c++;}saveEdits(edits);doRender();alert('导入完成: '+c+' 所');};r.readAsText(f,'utf-8');};inp.click();
}
function parseLine(line){var r=[],c='',q=false;for(var i=0;i<line.length;i++){var ch=line[i];if(q){if(ch==='"'){if(line[i+1]==='"'){c+='"';i++;}else q=false;}else c+=ch;}else{if(ch===','){r.push(c);c='';}else if(ch==='"') q=true;else c+=ch;}}r.push(c);return r;}