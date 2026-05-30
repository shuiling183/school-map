// v22 - fix search+delete+geocoding
var VERSION='v22',map,favIds,hiddenIds,showFavOnly,currentSchool,placeSearch,geoCodingActive=false,_searchMarker=null;

// Login
function doLogin(){if(document.getElementById('pwdInput').value==='shanghai2026'){localStorage.setItem('a22','1');document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='flex';setTimeout(initMap,200);}else document.getElementById('loginError').style.display='block';}
if(localStorage.getItem('a22')==='1'){document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='flex';setTimeout(initMap,300);}

// History
function getHistory(){try{return JSON.parse(localStorage.getItem('h22')||'[]');}catch(e){return[];}}
function addHistory(s,c){var h=getHistory();h.unshift({t:new Date().toLocaleString(),n:s.name,c:c});if(h.length>200)h=h.slice(0,200);localStorage.setItem('h22',JSON.stringify(h));}

// Data
function ld(k,d){try{return JSON.parse(localStorage.getItem(k)||d);}catch(e){return JSON.parse(d);}}
function sv(k,v){localStorage.setItem(k,JSON.stringify(v));}
function getEdits(){return ld('e22','{}');}
function getGeo(){return ld('g22','{}');}
function getExtra(){return ld('x22','[]');}
function allS(){return ALL_SCHOOLS.concat(getExtra());}
function sd(s){var e=getEdits(),d=e[s.id]||{};return{tier:d.tier!==undefined?d.tier:s.tier,lottery:d.lottery!==undefined?d.lottery:(s.lotteryRate||''),feeder:d.feeder!==undefined?d.feeder:(s.feederSchool||''),communities:d.communities!==undefined?d.communities:(s.communities||''),sr25:d.sr25!==undefined?d.sr25:s.srRate25,sr24:d.sr24!==undefined?d.sr24:s.srRate24,sr23:d.sr23!==undefined?d.sr23:s.srRate23,res25:d.res25!==undefined?d.res25:s.residency25,hl:d.hl!==undefined?d.hl:s.highlights,notes:d.notes!==undefined?d.notes:''};}
function getCoord(s){var c=getGeo();if(c[s.id]&&c[s.id].lng)return c[s.id];var o=ctr(s.district);if(!o)return null;return{lng:o[0]+Math.sin(s.id*12.7)*0.02,lat:o[1]+Math.cos(s.id*7.3)*0.02};}
function ctr(d){var m={黄浦:[121.48,31.23],徐汇:[121.44,31.19],长宁:[121.42,31.22],静安:[121.45,31.23],普陀:[121.40,31.25],虹口:[121.49,31.26],杨浦:[121.52,31.27],闵行:[121.38,31.12],浦东:[121.55,31.22],宝山:[121.48,31.40],嘉定:[121.25,31.38],松江:[121.23,31.03],青浦:[121.12,31.15],金山:[121.33,30.75],奉贤:[121.47,30.92],崇明:[121.40,31.62]};return m[d]||null;}

// Init
function initMap(){
  favIds=new Set(ld('f22','[]'));hiddenIds=new Set(ld('hd22','[]'));showFavOnly=false;
  map=new AMap.Map('mapContainer',{zoom:11,center:[121.47,31.22],mapStyle:'amap://styles/light',viewMode:'3D'});
  if(typeof AMap!=='undefined'&&AMap.PlaceSearch)placeSearch=new AMap.PlaceSearch({city:'上海',pageSize:10});
  var ds=[],seen={},all=allS();
  for(var i=0;i<all.length;i++){var d=all[i].district;if(d&&!seen[d]){ds.push(d);seen[d]=1;}}
  ds.sort();var sel=document.getElementById('districtFilter');
  for(i=0;i<ds.length;i++){var o=document.createElement('option');o.value=ds[i];o.text=ds[i];sel.appendChild(o);}
  sel.onchange=doRender;document.getElementById('tierFilter').onchange=doRender;
  document.getElementById('typeFilter').onchange=doRender;document.getElementById('searchInput').oninput=doRender;
  doRender();
  setTimeout(startGeocoding,2000);
}

// Render - DONT overwrite geocoding status
function doRender(){
  if(!map)return;map.clearMap();clearOutlines();
  var df=document.getElementById('districtFilter').value,tf=document.getElementById('tierFilter').value;
  var pf=document.getElementById('typeFilter').value,kw=document.getElementById('searchInput').value.toLowerCase();
  var all=allS(),list=[];
  for(var i=0;i<all.length;i++){
    var s=all[i];if(df&&s.district!==df)continue;var tier=sd(s).tier||'';
    if(tf&&tier.indexOf(tf)<0)continue;if(pf&&(s.type||'').indexOf(pf)<0)continue;
    if(kw&&!matchSearch(s,kw))continue;if(showFavOnly&&!favIds.has(s.id))continue;
    list.push(s);
  }
  for(i=0;i<list.length;i++)addMarker(list[i]);
  if(!geoCodingActive){document.getElementById('schoolCount').innerHTML='共 '+list.length+' 所 ('+VERSION+') <a href="#" onclick="startGeocoding()" style="color:#2ecc71">定位</a> <a href="#" onclick="localStorage.removeItem(\'g22\');location.reload()" style="color:#e94560">重置</a> <a href="#" onclick="searchAddr()" style="color:#3498db">搜索地址</a>';}
}

function addMarker(s){
  var c=getCoord(s);if(!c)return;
  var tier=sd(s).tier||'',fc='#7f8c8d',r=6;
  if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
  if(hiddenIds.has(s.id)){fc='#ccc';r=4;}
  var stroke=s._extra?'#f39c12':'#fff',sw=s._extra?3:2;
  var cm=new AMap.CircleMarker({center:[c.lng,c.lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:stroke,strokeWeight:sw});cm.setMap(map);
  cm.on('click',(function(sch){return function(){showDetail(sch);}})(s));
  var nm=(s.name||'').length>6?(s.name||'').substring(0,5)+'..':(s.name||'');
  new AMap.Text({text:nm,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+8),style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  var tl='';if(tier.indexOf('一梯队')>=0)tl='一梯队';else if(tier.indexOf('二梯队')>=0)tl='二梯队';else if(tier.indexOf('三梯队')>=0)tl='三梯队';
  if(tl)new AMap.Text({text:tl,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+20),style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  if(favIds.has(s.id))new AMap.Text({text:'*',position:[c.lng,c.lat],offset:new AMap.Pixel(0,-r-8),style:{'font-size':'14px','color':'#f39c12','font-weight':'bold','text-align':'center'},zIndex:102}).setMap(map);
}

// Search
function matchSearch(s,kw){
  var al={上实西校:['实验西校','上海实验西校'],华师大二附校:['闵华二'],骏博外国语:['骏博'],兰生复旦:['兰生'],新华初级:['新华初'],迅行初级:['迅行'],五浦汇实验:['五浦汇'],宝山华曜:['华曜宝山'],上外双语:['杨浦双语']};
  if(al[s.name]){for(var i=0;i<al[s.name].length;i++){if(al[s.name][i].toLowerCase().indexOf(kw)>=0)return true;}}
  var f=[s.name,s.fullName,s.district,s.address,sd(s).tier];for(i=0;i<f.length;i++){if((f[i]||'').toLowerCase().indexOf(kw)>=0)return true;}
  return false;
}

// Community outlines
var commOut=[];
function clearOutlines(){for(var i=0;i<commOut.length;i++)commOut[i].setMap(null);commOut=[];}
function drawCommunities(school){
  clearOutlines();var d=sd(school),t=d.communities||'';if(!t||t==='-')return;
  var parts=t.split(/[,，;；、\s]+/).filter(function(x){return x.length>0;});if(!parts.length||typeof AMap==='undefined')return;
  var gc=new AMap.Geocoder({city:'上海'});
  for(var i=0;i<parts.length;i++){(function(n){gc.getLocation(n,function(st,re){if(st==='complete'&&re.geocodes&&re.geocodes.length>0){var loc=re.geocodes[0].location;var ds2=new AMap.DistrictSearch({level:'biz_area',extensions:'all'});ds2.search(n,function(ds,dre){var hasPoly=false;if(ds==='complete'&&dre.districtList&&dre.districtList.length>0&&dre.districtList[0].boundaries){var bounds=dre.districtList[0].boundaries;for(var b=0;b<bounds.length;b++){var poly=new AMap.Polygon({path:bounds[b],fillColor:'#2ecc71',fillOpacity:0.15,strokeColor:'#2ecc71',strokeWeight:2,strokeOpacity:0.6});poly.setMap(map);commOut.push(poly);hasPoly=true;}}if(!hasPoly){var ci=new AMap.CircleMarker({center:[loc.lng,loc.lat],radius:15,fillColor:'#2ecc71',fillOpacity:0.2,strokeColor:'#2ecc71',strokeWeight:2});ci.setMap(map);commOut.push(ci);}});var lb=new AMap.Text({text:n,position:[loc.lng,loc.lat],offset:new AMap.Pixel(0,-20),style:{'font-size':'9px','color':'#2ecc71','background':'rgba(255,255,255,0.8)','padding':'1px 3px','border-radius':'2px'},zIndex:90});lb.setMap(map);commOut.push(lb);}});})(parts[i]);}
}

// Detail + history
function showDetail(s){
  currentSchool=s;var t=sd(s),tier=t.tier||'',tc='t3',isF=favIds.has(s.id),isH=hiddenIds.has(s.id);
  if(tier.indexOf('一梯队')>=0)tc='t1';else if(tier.indexOf('二梯队')>=0)tc='t2';
  var h='<button onclick="closeDetail()" style="float:right;background:transparent;color:#aaa;font-size:16px;cursor:pointer;">X</button>';
  h+='<h3>'+s.name+' <span class="tier-tag '+tc+'">'+tier+'</span>'+(s._extra?' <span style="background:#f39c12;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;">自定义</span>':'')+'</h3>';
  h+='<p>全称: '+(s.fullName||'-')+' | '+s.district+' | '+(s.type||'')+'</p>';
  h+='<p>地址: '+(s.address||'-')+'</p>';
  h+='<hr><b style="color:#e94560">可编辑</b><br>';
  h+=erow('梯队','t_'+s.id,tier);h+=erow('市重率25','s25_'+s.id,t.sr25);h+=erow('市重率24','s24_'+s.id,t.sr24);h+=erow('市重率23','s23_'+s.id,t.sr23);
  h+=erow('入户25','r25_'+s.id,t.res25);h+=erow('中签率','lot_'+s.id,t.lottery);h+=erow('对口小学','fd_'+s.id,t.feeder);
  h+='<p>学区小区:</p><textarea id="cm_'+s.id+'" style="width:100%;height:60px;margin:3px 0">'+t.communities.replace(/"/g,'&quot;')+'</textarea>';
  h+=erow('亮点','hl_'+s.id,t.hl);h+='<p>备注:</p><textarea id="nt_'+s.id+'" style="width:100%;height:50px">'+t.notes.replace(/"/g,'&quot;')+'</textarea>';
  h+='<div style="margin-top:10px"><button onclick="toggleFav('+s.id+')" style="background:#f39c12">'+(isF?'取消收藏':'收藏')+'</button> ';
  h+='<button onclick="toggleHide('+s.id+')" style="background:'+(isH?'#2ecc71':'#e74c3c')+'">'+(isH?'显示':'隐藏')+'</button> ';
  h+='<button onclick="saveEdit('+s.id+')" style="background:#2ecc71">保存</button> ';
  h+='<button onclick="drawCommunities(allS().find(function(x){return x.id==='+s.id+';}))" style="background:#3498db">框选小区</button>';
  if(s._extra)h+=' <button onclick="deleteSchool('+s.id+')" style="background:#e74c3c">删除此校</button>';
  h+=' <button onclick="closeDetail()">关闭</button></div>';

  var hist=getHistory().filter(function(x){return x.n===s.name;});
  if(hist.length>0){h+='<hr><b>修改历史</b><br>';for(var i=0;i<Math.min(hist.length,5);i++){h+='<div style="font-size:10px;color:#aaa;margin:3px 0;padding:4px;background:rgba(255,255,255,0.03);border-radius:2px">'+hist[i].t+'<br>'+hist[i].c+'</div>';}}

  document.getElementById('detailContent').innerHTML=h;document.getElementById('detailPanel').style.display='block';
  drawCommunities(s);
}
function erow(l,id,v,ph){return '<div style="margin:2px 0;font-size:12px">'+l+': <input id="'+id+'" value="'+(v||'').replace(/"/g,'&quot;')+'" placeholder="'+(ph||'')+'" style="width:100%;padding:3px 6px;background:#16213e;color:#eee;border:1px solid #444;border-radius:3px;font-size:12px"></div>';}
function closeDetail(){document.getElementById('detailPanel').style.display='none';clearOutlines();currentSchool=null;}

// Save + Delete
function saveEdit(id){var oldE=getEdits(),oldD=oldE[id]||{};var newD={tier:document.getElementById('t_'+id).value,sr25:document.getElementById('s25_'+id).value,sr24:document.getElementById('s24_'+id).value,sr23:document.getElementById('s23_'+id).value,res25:document.getElementById('r25_'+id).value,lottery:document.getElementById('lot_'+id).value,feeder:document.getElementById('fd_'+id).value,communities:document.getElementById('cm_'+id).value,hl:document.getElementById('hl_'+id).value,notes:document.getElementById('nt_'+id).value};oldE[id]=newD;sv('e22',oldE);var all=allS(),s=null;for(var i=0;i<all.length;i++){if(all[i].id===id){s=all[i];break;}}if(s){var ch=[];for(var k in newD){if(newD[k]!==(oldD[k]||''))ch.push(k+': '+(oldD[k]||'无')+' → '+newD[k]);}if(ch.length>0)addHistory(s,ch.join('; '));}doRender();if(s)showDetail(s);}
function deleteSchool(id){if(!confirm('确定删除这所学校？'))return;var extra=getExtra().filter(function(x){return x.id!==id;});sv('x22',extra);closeDetail();doRender();}

// 收藏/隐藏
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);sv('f22',Array.from(favIds));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);sv('hd22',Array.from(hiddenIds));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFavFilter(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'显示全部':'只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';doRender();}

// ====== Search (navigate only, NO auto-create) ======
function searchAddr(){
  var kw=prompt('搜索地址（如：平吉路300号 或 万源新城南区）：','');
  if(!kw||!placeSearch)return;
  placeSearch.search(kw,function(status,result){
    if(status==='complete'&&result.poiList&&result.poiList.pois){
      var pois=result.poiList.pois,list='选择地址（仅定位，不自动创建）:\n';
      for(var i=0;i<Math.min(pois.length,10);i++){list+=(i+1)+'. '+pois[i].name+' - '+pois[i].address+'\n';}
      list+='\n0. 取消';
      var c=prompt(list,'1');var idx=parseInt(c)-1;
      if(idx>=0&&idx<pois.length){
        var p=pois[idx];
        // Clear previous search marker
        if(_searchMarker){_searchMarker.setMap(null);}
        _searchMarker=new AMap.Marker({position:[p.location.lng,p.location.lat],title:p.name});
        _searchMarker.setMap(map);
        _searchMarker.on('click',function(){
          var add=confirm('在此位置新增学校？\n'+p.name+'\n'+p.address);
          if(add)addSchoolHere(p.location.lng,p.location.lat,p.name,p.address);
        });
        map.setCenter([p.location.lng,p.location.lat]);map.setZoom(16);
        alert('已定位到: '+p.name+'\n点击地图上的蓝色标记可在此新增学校。');
      }
    }else{alert('未找到匹配地址');}
  });
}

// Add school at clicked/selected position
function addSchoolHere(lng,lat,name,addr){
  name=name||prompt('学校简称:','');if(!name)return;
  addr=addr||prompt('学校地址:','');var district=prompt('区域:','闵行');
  var type=prompt('性质 (公办/民办):','公办'),tier=prompt('梯队:','');
  var extra=getExtra(),nid=90000+extra.length+1;
  extra.push({id:nid,district:district||'',name:name,type:type||'公办',fullName:name||'',address:addr||'',tier:tier||'',srRate25:'',lotteryRate:'',feederSchool:'',communities:'',residency23:'',residency24:'',residency25:'',srRate23:'',srRate24:'',highlights:'',_extra:true});
  sv('x22',extra);
  var cache=getGeo();cache[nid]={lng:lng,lat:lat};sv('g22',cache);
  doRender();showDetail(extra[extra.length-1]);
}

// Export
function exportCSV(){
  var e=getEdits(),csv='区域,简称,性质,全称,中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址,自定义\n',all=allS();
  for(var i=0;i<all.length;i++){var s=all[i],d=sd(s);csv+=['"'+s.district+'"','"'+s.name+'"','"'+s.type+'"','"'+(s.fullName||'')+'"','"'+d.lottery+'"','"'+(s.residency23||'')+'"','"'+(s.residency24||'')+'"','"'+d.res25+'"','"'+d.feeder+'"','"'+d.communities+'"','"'+d.sr23+'"','"'+d.sr24+'"','"'+d.sr25+'"','"'+d.tier+'"','"'+d.hl+'"','"'+(s.address||'')+'"','"'+(s._extra?'是':'')+'"'].join(',')+'\n';}
  var b=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='初中排名_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// ====== Geocoding - FIXED: closure + don't get overwritten ======
function startGeocoding(){
  if(geoCodingActive)return;
  var cache=getGeo(),todo=[],all=allS();
  for(var i=0;i<all.length;i++){var s=all[i];if(s.address&&!cache[s.id])todo.push(s);}
  if(todo.length===0){alert('所有地址已定位完成！');return;}
  if(typeof AMap==='undefined'||!AMap.Geocoder){alert('Geocoder未加载');return;}
  geoCodingActive=true;
  var el=document.getElementById('schoolCount'),gc=new AMap.Geocoder({city:'上海'}),idx=0,ok=0;
  el.textContent='定位中...0/'+todo.length;
  function next(){
    if(idx>=todo.length){sv('g22',cache);geoCodingActive=false;doRender();return;}
    var cur=todo[idx],curId=cur.id,curAddr=cur.address;
    gc.getLocation(curAddr,function(status,result){
      idx++;
      if(status==='complete'&&result.geocodes&&result.geocodes.length>0){var loc=result.geocodes[0].location;cache[curId]={lng:loc.lng,lat:loc.lat};ok++;}
      var progress='定位中 '+idx+'/'+todo.length+' (成功'+ok+')';
      if(idx>=todo.length)progress='定位完成! '+ok+'/'+todo.length;
      el.textContent=progress;
      if(idx%5===0||idx>=todo.length){sv('g22',cache);doRender();}
      setTimeout(next,60);
    });
  }
  next();
}