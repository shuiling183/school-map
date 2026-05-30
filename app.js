// v19 - API fix from proven map.html pattern
var VERSION='v19',map,favIds,hiddenIds,showFavOnly,currentSchool;

// Login
function doLogin(){
  if(document.getElementById('pwdInput').value==='shanghai2026'){
    localStorage.setItem('auth18','1');
    document.getElementById('loginPage').style.display='none';
    document.getElementById('mapPage').style.display='flex';
    setTimeout(initMap,200);
  }else{document.getElementById('loginError').style.display='block';}
}
if(localStorage.getItem('auth18')==='1'){
  document.getElementById('loginPage').style.display='none';
  document.getElementById('mapPage').style.display='flex';
  setTimeout(initMap,300);
}

// Data helpers
function getEdits(){try{return JSON.parse(localStorage.getItem('ed18')||'{}');}catch(e){return{};}}
function setEdits(e){localStorage.setItem('ed18',JSON.stringify(e));}
function getGeo(){try{return JSON.parse(localStorage.getItem('g18')||'{}');}catch(e){return{};}}
function setGeo(c){localStorage.setItem('g18',JSON.stringify(c));}
function sd(s){var e=getEdits(),d=e[s.id]||{};return{tier:d.tier!==undefined?d.tier:s.tier,sr25:d.sr25!==undefined?d.sr25:s.srRate25,sr24:d.sr24!==undefined?d.sr24:s.srRate24,sr23:d.sr23!==undefined?d.sr23:s.srRate23,res25:d.res25!==undefined?d.res25:s.residency25,hl:d.hl!==undefined?d.hl:s.highlights,notes:d.notes!==undefined?d.notes:''};}
function getCoord(s){var c=getGeo();if(c[s.id]&&c[s.id].lng)return c[s.id];var o=centerOf(s.district);if(!o)return null;return{lng:o[0]+Math.sin(s.id*12.7)*0.02,lat:o[1]+Math.cos(s.id*7.3)*0.02};}
function centerOf(d){var m={黄浦:[121.48,31.23],徐汇:[121.44,31.19],长宁:[121.42,31.22],静安:[121.45,31.23],普陀:[121.40,31.25],虹口:[121.49,31.26],杨浦:[121.52,31.27],闵行:[121.38,31.12],浦东:[121.55,31.22],宝山:[121.48,31.40],嘉定:[121.25,31.38],松江:[121.23,31.03],青浦:[121.12,31.15],金山:[121.33,30.75],奉贤:[121.47,30.92],崇明:[121.40,31.62]};return m[d]||null;}

// Init
function initMap(){
  favIds=new Set(JSON.parse(localStorage.getItem('fv18')||'[]'));
  hiddenIds=new Set(JSON.parse(localStorage.getItem('hd18')||'[]'));
  showFavOnly=false;
  map=new AMap.Map('mapContainer',{zoom:11,center:[121.47,31.22],mapStyle:'amap://styles/light',viewMode:'3D'});
  var ds=[],seen={};
  for(var i=0;i<ALL_SCHOOLS.length;i++){var d=ALL_SCHOOLS[i].district;if(d&&!seen[d]){ds.push(d);seen[d]=1;}}
  ds.sort();
  var sel=document.getElementById('districtFilter');
  for(i=0;i<ds.length;i++){var o=document.createElement('option');o.value=ds[i];o.text=ds[i];sel.appendChild(o);}
  sel.onchange=doRender;document.getElementById('tierFilter').onchange=doRender;
  document.getElementById('typeFilter').onchange=doRender;document.getElementById('searchInput').oninput=doRender;
  doRender();
}

// Render
function doRender(){
  if(!map)return;
  map.clearMap();
  var df=document.getElementById('districtFilter').value;
  var tf=document.getElementById('tierFilter').value;
  var pf=document.getElementById('typeFilter').value;
  var kw=document.getElementById('searchInput').value.toLowerCase();
  var list=[];
  for(var i=0;i<ALL_SCHOOLS.length;i++){
    var s=ALL_SCHOOLS[i];
    if(df&&s.district!==df)continue;
    var tier=sd(s).tier||'';
    if(tf&&tier.indexOf(tf)<0)continue;
    if(pf&&(s.type||'').indexOf(pf)<0)continue;
    if(kw&&!matchSearch(s,kw))continue;
    if(showFavOnly&&!favIds.has(s.id))continue;
    list.push(s);
  }
  for(i=0;i<list.length;i++){
    var s=list[i],c=getCoord(s);
    if(!c)continue;
    var tier=sd(s).tier||'',fc='#7f8c8d',r=6;
    if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}
    else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}
    else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
    if(hiddenIds.has(s.id)){fc='#ccc';r=4;}
    var cm=new AMap.CircleMarker({center:[c.lng,c.lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:'#fff',strokeWeight:2});
    cm.setMap(map);
    cm.on('click',(function(school){return function(){showDetail(school);}})(s));
    var nm=(s.name||'').length>6?(s.name||'').substring(0,5)+'..':(s.name||'');
    var tl=new AMap.Text({text:nm,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+8),style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101});
    tl.setMap(map);
    var tierLabel='';
    if(tier.indexOf('一梯队')>=0)tierLabel='一梯队';
    else if(tier.indexOf('二梯队')>=0)tierLabel='二梯队';
    else if(tier.indexOf('三梯队')>=0)tierLabel='三梯队';
    if(tierLabel){
      var ttl=new AMap.Text({text:tierLabel,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+20),style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101});
      ttl.setMap(map);
    }
    if(favIds.has(s.id)){
      var star=new AMap.Text({text:'*',position:[c.lng,c.lat],offset:new AMap.Pixel(0,-r-8),style:{'font-size':'14px','color':'#f39c12','font-weight':'bold','text-align':'center'},zIndex:102});
      star.setMap(map);
    }
  }
  document.getElementById('schoolCount').innerHTML='共 '+list.length+' 所 ('+VERSION+') <a href="#" onclick="startGeo()" style="color:#2ecc71">定位</a> <a href="#" onclick="localStorage.removeItem(\'g18\');location.reload()" style="color:#e94560">重置</a>';
}

// Search
function matchSearch(s,kw){
  var aliases={上实西校:['实验西校','上海实验西校'],华师大二附校:['闵华二'],骏博外国语:['骏博'],兰生复旦:['兰生'],新华初级:['新华初'],迅行初级:['迅行'],五浦汇实验:['五浦汇'],宝山华曜:['华曜宝山'],上外双语:['杨浦双语']};
  if(aliases[s.name]){for(var i=0;i<aliases[s.name].length;i++){if(aliases[s.name][i].toLowerCase().indexOf(kw)>=0)return true;}}
  var f=[s.name,s.fullName,s.district,s.address,sd(s).tier];
  for(i=0;i<f.length;i++){if((f[i]||'').toLowerCase().indexOf(kw)>=0)return true;}
  return false;
}

// Detail
function showDetail(s){
  currentSchool=s;var t=sd(s),tier=t.tier||'',tc='t3';
  if(tier.indexOf('一梯队')>=0)tc='t1';else if(tier.indexOf('二梯队')>=0)tc='t2';
  var isF=favIds.has(s.id),isH=hiddenIds.has(s.id);
  var h='<button onclick="document.getElementById(\'detailPanel\').style.display=\'none\'" style="float:right;background:transparent;color:#aaa;font-size:16px;cursor:pointer;">X</button>';
  h+='<h3>'+s.name+' <span class="tier-tag '+tc+'">'+tier+'</span></h3>';
  h+='<p>全称: '+(s.fullName||'-')+'</p>';
  h+='<p>区域: '+s.district+' | '+(s.type||'')+'</p>';
  h+='<p>地址: '+(s.address||'-')+'</p>';
  if((s.type||'').indexOf('民办')>=0)h+='<p>中签率: '+(s.lotteryRate||'-')+'</p>';
  h+='<hr><b>可编辑</b><br>';
  h+=edrow('梯队','tier_'+s.id,tier);
  h+=edrow('市重率2025','sr25_'+s.id,t.sr25);
  h+=edrow('市重率2024','sr24_'+s.id,t.sr24);
  h+=edrow('市重率2023','sr23_'+s.id,t.sr23);
  h+=edrow('入户年限2025','res25_'+s.id,t.res25);
  h+=edrow('亮点','hl_'+s.id,t.hl);
  h+='<p>备注:</p><textarea id="notes_'+s.id+'" style="width:100%;height:50px;">'+(t.notes||'')+'</textarea>';
  h+='<div style="margin-top:10px">';
  h+='<button onclick="toggleFav('+s.id+')" style="background:#f39c12">'+(isF?'取消收藏':'收藏')+'</button> ';
  h+='<button onclick="toggleHide('+s.id+')" style="background:'+(isH?'#2ecc71':'#e74c3c')+'">'+(isH?'显示':'隐藏')+'</button> ';
  h+='<button onclick="saveEdit('+s.id+')" style="background:#2ecc71">保存修改</button>';
  h+='<button onclick="document.getElementById(\'detailPanel\').style.display=\'none\'">关闭</button>';
  h+='</div>';
  document.getElementById('detailContent').innerHTML=h;
  document.getElementById('detailPanel').style.display='block';
}
function edrow(label,id,val){return label+': <input id="'+id+'" value="'+(val||'').replace(/"/g,'&quot;')+'">';}

function saveEdit(id){
  var e=getEdits();
  e[id]={tier:document.getElementById('tier_'+id).value,sr25:document.getElementById('sr25_'+id).value,sr24:document.getElementById('sr24_'+id).value,sr23:document.getElementById('sr23_'+id).value,res25:document.getElementById('res25_'+id).value,hl:document.getElementById('hl_'+id).value,notes:document.getElementById('notes_'+id).value};
  setEdits(e);doRender();
  var s=null;for(var i=0;i<ALL_SCHOOLS.length;i++){if(ALL_SCHOOLS[i].id===id){s=ALL_SCHOOLS[i];break;}}
  if(s)showDetail(s);
}
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fv18',JSON.stringify(Array.from(favIds)));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hd18',JSON.stringify(Array.from(hiddenIds)));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFavFilter(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'显示全部':'只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';doRender();}

// Export
function exportCSV(){
  var e=getEdits(),csv='区域,简称,性质,全称,中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址\n';
  for(var i=0;i<ALL_SCHOOLS.length;i++){
    var s=ALL_SCHOOLS[i],d=sd(s);
    csv+=['"'+s.district+'"','"'+s.name+'"','"'+s.type+'"','"'+(s.fullName||'')+'"','"'+(s.lotteryRate||'')+'"','"'+(s.residency23||'')+'"','"'+(s.residency24||'')+'"','"'+d.res25+'"','"'+(s.feederSchool||'')+'"','"'+(s.communities||'')+'"','"'+d.sr23+'"','"'+d.sr24+'"','"'+d.sr25+'"','"'+d.tier+'"','"'+d.hl+'"','"'+(s.address||'')+'"'].join(',')+'\n';
  }
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='初中排名_导出_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// Geocoding
var geoCodingActive=false;
function startGeo(){
  if(geoCodingActive)return;
  var cache=getGeo(),todo=[];
  for(var i=0;i<ALL_SCHOOLS.length;i++){var s=ALL_SCHOOLS[i];if(s.address&&!cache[s.id])todo.push(s);}
  if(todo.length===0)return;
  if(typeof AMap==='undefined'||!AMap.Geocoder)return;
  geoCodingActive=true;
  document.getElementById('schoolCount').textContent='定位中 0/'+todo.length;
  var gc=new AMap.Geocoder({city:'上海'}),idx=0,ok=0;
  function next(){
    if(idx>=todo.length){setGeo(cache);geoCodingActive=false;doRender();return;}
    gc.getLocation(todo[idx].address,function(status,result){
      if(status==='complete'&&result.geocodes&&result.geocodes.length>0){var loc=result.geocodes[0].location;cache[todo[idx].id]={lng:loc.lng,lat:loc.lat};ok++;}
      idx++;
      if(idx%20===0||idx>=todo.length){document.getElementById('schoolCount').textContent='定位中 '+idx+'/'+todo.length+' (OK'+ok+')';setGeo(cache);doRender();}
      setTimeout(next,80);
    });
  }
  next();
}