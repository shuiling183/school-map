// v21 - geocoding fix + history in panel + add school + community poly
var VERSION='v21',map,favIds,hiddenIds,showFavOnly,currentSchool,placeSearch;

// Login
function doLogin(){if(document.getElementById('pwdInput').value==='shanghai2026'){localStorage.setItem('auth21','1');document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='flex';setTimeout(initMap,200);}else document.getElementById('loginError').style.display='block';}
if(localStorage.getItem('auth21')==='1'){document.getElementById('loginPage').style.display='none';document.getElementById('mapPage').style.display='flex';setTimeout(initMap,300);}

// Edit history
function getHistory(){try{return JSON.parse(localStorage.getItem('hist21')||'[]');}catch(e){return[];}}
function addHistory(school,changes){var h=getHistory();h.unshift({time:new Date().toLocaleString(),name:school.name,changes:changes});if(h.length>200)h=h.slice(0,200);localStorage.setItem('hist21',JSON.stringify(h));}

// Data
function getEdits(){try{return JSON.parse(localStorage.getItem('ed21')||'{}');}catch(e){return{};}}
function setEdits(e){localStorage.setItem('ed21',JSON.stringify(e));}
function getGeo(){try{return JSON.parse(localStorage.getItem('g21')||'{}');}catch(e){return{};}}
function setGeo(c){localStorage.setItem('g21',JSON.stringify(c));}
function getExtra(){try{return JSON.parse(localStorage.getItem('x21')||'[]');}catch(e){return[];}}
function setExtra(e){localStorage.setItem('x21',JSON.stringify(e));}
function allSchools(){return ALL_SCHOOLS.concat(getExtra());}
function sd(s){var e=getEdits(),d=e[s.id]||{};return{
  tier:d.tier!==undefined?d.tier:s.tier,
  lottery:d.lottery!==undefined?d.lottery:(s.lotteryRate||''),
  feeder:d.feeder!==undefined?d.feeder:(s.feederSchool||''),
  communities:d.communities!==undefined?d.communities:(s.communities||''),
  sr25:d.sr25!==undefined?d.sr25:s.srRate25,sr24:d.sr24!==undefined?d.sr24:s.srRate24,sr23:d.sr23!==undefined?d.sr23:s.srRate23,
  res25:d.res25!==undefined?d.res25:s.residency25,hl:d.hl!==undefined?d.hl:s.highlights,notes:d.notes!==undefined?d.notes:''
};}
function getCoord(s){var c=getGeo();if(c[s.id]&&c[s.id].lng)return c[s.id];var o=centerOf(s.district);if(!o)return null;return{lng:o[0]+Math.sin(s.id*12.7)*0.02,lat:o[1]+Math.cos(s.id*7.3)*0.02};}
function centerOf(d){var m={黄浦:[121.48,31.23],徐汇:[121.44,31.19],长宁:[121.42,31.22],静安:[121.45,31.23],普陀:[121.40,31.25],虹口:[121.49,31.26],杨浦:[121.52,31.27],闵行:[121.38,31.12],浦东:[121.55,31.22],宝山:[121.48,31.40],嘉定:[121.25,31.38],松江:[121.23,31.03],青浦:[121.12,31.15],金山:[121.33,30.75],奉贤:[121.47,30.92],崇明:[121.40,31.62]};return m[d]||null;}

// Community outlines
var communityOutlines=[];
function clearOutlines(){for(var i=0;i<communityOutlines.length;i++)communityOutlines[i].setMap(null);communityOutlines=[];}
function drawCommunities(school){
  clearOutlines();
  var d=sd(school),text=d.communities||'';if(!text||text==='-'||text==='')return;
  var parts=text.split(/[,，;；、\s]+/).filter(function(x){return x.length>0;});if(parts.length===0||typeof AMap==='undefined')return;
  var gc=new AMap.Geocoder({city:'上海'});
  for(var i=0;i<parts.length;i++){
    (function(name,idx){
      gc.getLocation(name,function(status,result){
        if(status==='complete'&&result.geocodes&&result.geocodes.length>0){
          var loc=result.geocodes[0].location;
          // Try to get boundary via DistrictSearch
          var ds=new AMap.DistrictSearch({level:'biz_area',extensions:'all'});
          ds.search(name,function(dstatus,dresult){
            if(dstatus==='complete'&&dresult.districtList&&dresult.districtList.length>0&&dresult.districtList[0].boundaries){
              var bounds=dresult.districtList[0].boundaries;
              for(var b=0;b<bounds.length;b++){
                var poly=new AMap.Polygon({path:bounds[b],fillColor:'#2ecc71',fillOpacity:0.15,strokeColor:'#2ecc71',strokeWeight:2,strokeOpacity:0.6});
                poly.setMap(map);communityOutlines.push(poly);
              }
            }else{
              // Fallback: circle
              var circle=new AMap.CircleMarker({center:[loc.lng,loc.lat],radius:15,fillColor:'#2ecc71',fillOpacity:0.2,strokeColor:'#2ecc71',strokeWeight:2,strokeOpacity:0.6});
              circle.setMap(map);communityOutlines.push(circle);
            }
          });
          var label=new AMap.Text({text:name,position:[loc.lng,loc.lat],offset:new AMap.Pixel(0,-20),style:{'font-size':'9px','color':'#2ecc71','background':'rgba(255,255,255,0.8)','padding':'1px 3px','border-radius':'2px'},zIndex:90});
          label.setMap(map);communityOutlines.push(label);
        }
      });
    })(parts[i],i);
  }
}

// Init
function initMap(){
  favIds=new Set(JSON.parse(localStorage.getItem('fv21')||'[]'));
  hiddenIds=new Set(JSON.parse(localStorage.getItem('hd21')||'[]'));
  showFavOnly=false;
  map=new AMap.Map('mapContainer',{zoom:11,center:[121.47,31.22],mapStyle:'amap://styles/light',viewMode:'3D'});
  // Init place search
  if(typeof AMap!=='undefined'&&AMap.PlaceSearch)placeSearch=new AMap.PlaceSearch({city:'上海',pageSize:10});
  var ds=[],seen={},all=allSchools();
  for(var i=0;i<all.length;i++){var d=all[i].district;if(d&&!seen[d]){ds.push(d);seen[d]=1;}}
  ds.sort();var sel=document.getElementById('districtFilter');
  for(i=0;i<ds.length;i++){var o=document.createElement('option');o.value=ds[i];o.text=ds[i];sel.appendChild(o);}
  sel.onchange=doRender;document.getElementById('tierFilter').onchange=doRender;
  document.getElementById('typeFilter').onchange=doRender;document.getElementById('searchInput').oninput=doRender;
  // Map click to add school
  map.on('click',function(e){if(window._addMode)startAddSchool(e.lnglat.getLng(),e.lnglat.getLat());});
  doRender();
  setTimeout(startGeocoding,2000);
}

// Render
function doRender(){
  if(!map)return;map.clearMap();clearOutlines();
  var df=document.getElementById('districtFilter').value,tf=document.getElementById('tierFilter').value;
  var pf=document.getElementById('typeFilter').value,kw=document.getElementById('searchInput').value.toLowerCase();
  var all=allSchools(),list=[];
  for(var i=0;i<all.length;i++){
    var s=all[i];if(df&&s.district!==df)continue;var tier=sd(s).tier||'';
    if(tf&&tier.indexOf(tf)<0)continue;if(pf&&(s.type||'').indexOf(pf)<0)continue;
    if(kw&&!matchSearch(s,kw))continue;if(showFavOnly&&!favIds.has(s.id))continue;
    list.push(s);
  }
  for(i=0;i<list.length;i++)addMarker(list[i]);
  document.getElementById('schoolCount').innerHTML='共 '+list.length+' 所 ('+VERSION+') <a href="#" onclick="startGeocoding()" style="color:#2ecc71">精确定位</a> <a href="#" onclick="localStorage.removeItem(\'g21\');location.reload()" style="color:#e94560">重置</a> <a href="#" onclick="toggleAddMode()" style="color:#f39c12">新增学校</a> <a href="#" onclick="searchAddress()" style="color:#3498db">地址搜索</a>';
}

function addMarker(s){
  var c=getCoord(s);if(!c)return;
  var tier=sd(s).tier||'',fc='#7f8c8d',r=6,isExtra=s._extra||false;
  if(tier.indexOf('一梯队')>=0){fc='#e94560';r=9;}else if(tier.indexOf('二梯队')>=0){fc='#f39c12';r=7;}else if(tier.indexOf('三梯队')>=0){fc='#3498db';r=6;}
  if(hiddenIds.has(s.id)){fc='#ccc';r=4;}
  var stroke=isExtra?'#f39c12':'#fff';
  var cm=new AMap.CircleMarker({center:[c.lng,c.lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:stroke,strokeWeight:isExtra?3:2});cm.setMap(map);
  cm.on('click',(function(school){return function(){showDetail(school);}})(s));
  var nm=(s.name||'').length>6?(s.name||'').substring(0,5)+'..':(s.name||'');
  new AMap.Text({text:nm,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+8),style:{'font-size':'10px','color':'#222','font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  var tl='';if(tier.indexOf('一梯队')>=0)tl='一梯队';else if(tier.indexOf('二梯队')>=0)tl='二梯队';else if(tier.indexOf('三梯队')>=0)tl='三梯队';
  if(tl)new AMap.Text({text:tl,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+20),style:{'font-size':'8px','color':fc,'font-weight':'bold','text-shadow':'0 0 3px #fff','text-align':'center','white-space':'nowrap'},zIndex:101}).setMap(map);
  if(favIds.has(s.id))new AMap.Text({text:'*',position:[c.lng,c.lat],offset:new AMap.Pixel(0,-r-8),style:{'font-size':'14px','color':'#f39c12','font-weight':'bold','text-align':'center'},zIndex:102}).setMap(map);
}

// Search
function matchSearch(s,kw){
  var aliases={上实西校:['实验西校','上海实验西校'],华师大二附校:['闵华二'],骏博外国语:['骏博'],兰生复旦:['兰生'],新华初级:['新华初'],迅行初级:['迅行'],五浦汇实验:['五浦汇'],宝山华曜:['华曜宝山'],上外双语:['杨浦双语']};
  if(aliases[s.name]){for(var i=0;i<aliases[s.name].length;i++){if(aliases[s.name][i].toLowerCase().indexOf(kw)>=0)return true;}}
  var f=[s.name,s.fullName,s.district,s.address,sd(s).tier];for(i=0;i<f.length;i++){if((f[i]||'').toLowerCase().indexOf(kw)>=0)return true;}
  return false;
}

// Detail with history
function showDetail(s){
  currentSchool=s;var t=sd(s),tier=t.tier||'',tc='t3',isF=favIds.has(s.id),isH=hiddenIds.has(s.id);
  if(tier.indexOf('一梯队')>=0)tc='t1';else if(tier.indexOf('二梯队')>=0)tc='t2';

  var h='<button onclick="document.getElementById(\'detailPanel\').style.display=\'none\';clearOutlines();" style="float:right;background:transparent;color:#aaa;font-size:16px;cursor:pointer;">X</button>';
  h+='<h3>'+s.name+' <span class="tier-tag '+tc+'">'+tier+'</span>'+(s._extra?' <span style="background:#f39c12;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px;">自定义</span>':'')+'</h3>';
  h+='<p>全称: '+(s.fullName||'-')+' | '+s.district+' | '+(s.type||'')+'</p>';
  h+='<p>地址: '+(s.address||'-')+'</p>';
  h+='<hr><b style="color:#e94560">可编辑</b><br>';
  h+=erow('梯队','tier_'+s.id,tier,'一梯队/二梯队/三梯队');
  h+=erow('市重率2025','sr25_'+s.id,t.sr25);h+=erow('市重率2024','sr24_'+s.id,t.sr24);h+=erow('市重率2023','sr23_'+s.id,t.sr23);
  h+=erow('入户年限2025','res25_'+s.id,t.res25);h+=erow('中签率','lottery_'+s.id,t.lottery,'仅民办');
  h+=erow('对口小学','feeder_'+s.id,t.feeder,'逗号分隔');
  h+='<p>学区小区:</p><textarea id="communities_'+s.id+'" style="width:100%;height:60px;margin:3px 0">'+t.communities.replace(/"/g,'&quot;')+'</textarea>';
  h+=erow('亮点','hl_'+s.id,t.hl);h+='<p>备注:</p><textarea id="notes_'+s.id+'" style="width:100%;height:50px">'+t.notes.replace(/"/g,'&quot;')+'</textarea>';
  h+='<div style="margin-top:10px">';
  h+='<button onclick="toggleFav('+s.id+')" style="background:#f39c12">'+(isF?'取消收藏':'收藏')+'</button> ';
  h+='<button onclick="toggleHide('+s.id+')" style="background:'+(isH?'#2ecc71':'#e74c3c')+'">'+(isH?'显示':'隐藏')+'</button> ';
  h+='<button onclick="saveEdit('+s.id+')" style="background:#2ecc71">保存</button> ';
  h+='<button onclick="drawCommunities(ALL_SCHOOLS.concat(getExtra()).find(function(x){return x.id==='+s.id+';}))" style="background:#3498db">框选小区</button> ';
  h+='<button onclick="document.getElementById(\'detailPanel\').style.display=\'none\';clearOutlines();">关闭</button></div>';

  // Show recent history for this school
  var hist=getHistory().filter(function(x){return x.name===s.name;});
  if(hist.length>0){
    h+='<hr><b>修改历史</b><br>';
    for(var i=0;i<Math.min(hist.length,5);i++){h+='<div style="font-size:10px;color:#aaa;margin:3px 0;padding:4px;background:rgba(255,255,255,0.03);border-radius:2px">'+hist[i].time+'<br>'+hist[i].changes+'</div>';}
  }

  document.getElementById('detailContent').innerHTML=h;
  document.getElementById('detailPanel').style.display='block';
  drawCommunities(s);
}
function erow(label,id,val,placeholder){return '<div style="margin:2px 0;font-size:12px">'+label+': <input id="'+id+'" value="'+(val||'').replace(/"/g,'&quot;')+'" placeholder="'+(placeholder||'')+'" style="width:100%;padding:3px 6px;background:#16213e;color:#eee;border:1px solid #444;border-radius:3px;font-size:12px"></div>';}

// Save
function saveEdit(id){
  var oldE=getEdits(),oldD=oldE[id]||{};
  var newD={tier:document.getElementById('tier_'+id).value,sr25:document.getElementById('sr25_'+id).value,sr24:document.getElementById('sr24_'+id).value,sr23:document.getElementById('sr23_'+id).value,res25:document.getElementById('res25_'+id).value,lottery:document.getElementById('lottery_'+id).value,feeder:document.getElementById('feeder_'+id).value,communities:document.getElementById('communities_'+id).value,hl:document.getElementById('hl_'+id).value,notes:document.getElementById('notes_'+id).value};
  oldE[id]=newD;setEdits(oldE);
  var all=allSchools(),s=null;for(var i=0;i<all.length;i++){if(all[i].id===id){s=all[i];break;}}
  if(s){var changes=[];for(var k in newD){if(newD[k]!==(oldD[k]||''))changes.push(k+': '+(oldD[k]||'无')+' → '+newD[k]);}if(changes.length>0)addHistory(s,changes.join('; '));}
  doRender();if(s)showDetail(s);
}

// 收藏/隐藏
function toggleFav(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);localStorage.setItem('fv21',JSON.stringify(Array.from(favIds)));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleHide(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);localStorage.setItem('hd21',JSON.stringify(Array.from(hiddenIds)));doRender();if(currentSchool&&currentSchool.id===id)showDetail(currentSchool);}
function toggleFavFilter(){showFavOnly=!showFavOnly;var b=document.getElementById('favBtn');b.textContent=showFavOnly?'显示全部':'只看收藏';b.style.background=showFavOnly?'#e94560':'#f39c12';doRender();}

// ====== NEW: Add school ======
var _addMode=false,_addLng=null,_addLat=null;
function toggleAddMode(){
  _addMode=!_addMode;
  if(_addMode){alert('新增模式已开启。在地图上点击位置，或在下方搜索地址后点击新增。');map.setDefaultCursor('crosshair');}
  else{map.setDefaultCursor('default');}
}
function searchAddress(){
  var kw=prompt('搜索地址（如：平吉路300号）：','');
  if(!kw||!placeSearch)return;
  placeSearch.search(kw,function(status,result){
    if(status==='complete'&&result.poiList){
      var pois=result.poiList.pois;
      var list='选择地址:\n';
      for(var i=0;i<Math.min(pois.length,10);i++){list+=(i+1)+'. '+pois[i].name+' '+pois[i].address+'\n';}
      var choice=prompt(list+'输入序号:','1');
      var idx=parseInt(choice)-1;
      if(idx>=0&&idx<pois.length){
        var p=pois[idx];
        map.setCenter([p.location.lng,p.location.lat]);
        map.setZoom(16);
        startAddSchool(p.location.lng,p.location.lat,p.name,p.address);
      }
    }else{alert('未找到匹配地址');}
  });
}
function startAddSchool(lng,lat,name,addr){
  name=name||prompt('学校简称:','');
  if(!name)return;
  addr=addr||prompt('学校地址:','');
  var district=prompt('区域 (如: 闵行/徐汇/浦东):','闵行');
  var type=prompt('性质 (公办/民办):','公办');
  var tier=prompt('梯队 (一梯队/二梯队/三梯队):','');
  var sr25=prompt('市重率2025:','');
  var extra=getExtra();
  var newId=90000+extra.length+1;
  extra.push({id:newId,district:district||'',name:name,type:type||'公办',fullName:name||'',address:addr||'',tier:tier||'',srRate25:sr25||'',lotteryRate:'',feederSchool:'',communities:'',residency23:'',residency24:'',residency25:'',srRate23:'',srRate24:'',highlights:'',_extra:true});
  setExtra(extra);
  // Auto-geocode
  if(addr){
    var cache=getGeo();cache[newId]={lng:lng,lat:lat};setGeo(cache);
  }
  doRender();showDetail(extra[extra.length-1]);
  _addMode=false;map.setDefaultCursor('default');
}

// Export
function exportCSV(){
  var e=getEdits(),csv='区域,简称,性质,全称,中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址,自定义\n';
  var all=allSchools();
  for(var i=0;i<all.length;i++){var s=all[i],d=sd(s);csv+=['"'+s.district+'"','"'+s.name+'"','"'+s.type+'"','"'+(s.fullName||'')+'"','"'+d.lottery+'"','"'+(s.residency23||'')+'"','"'+(s.residency24||'')+'"','"'+d.res25+'"','"'+d.feeder+'"','"'+d.communities+'"','"'+d.sr23+'"','"'+d.sr24+'"','"'+d.sr25+'"','"'+d.tier+'"','"'+d.hl+'"','"'+(s.address||'')+'"','"'+(s._extra?'是':'')+'"'].join(',')+'\n';}
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='初中排名_导出_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
}

// Geocoding - FIXED closure bug
var geoCodingActive=false;
function startGeocoding(){
  if(geoCodingActive)return;
  var cache=getGeo(),todo=[],all=allSchools();
  for(var i=0;i<all.length;i++){var s=all[i];if(s.address&&!cache[s.id])todo.push(s);}
  if(todo.length===0)return;
  if(typeof AMap==='undefined'||!AMap.Geocoder)return;
  geoCodingActive=true;
  document.getElementById('schoolCount').textContent='定位中 0/'+todo.length;
  var gc=new AMap.Geocoder({city:'上海'}),idx=0,ok=0;
  function next(){
    if(idx>=todo.length){setGeo(cache);geoCodingActive=false;doRender();return;}
    var cur=todo[idx];var curId=cur.id; // FIX: save before async
    gc.getLocation(cur.address,function(status,result){
      idx++;
      if(status==='complete'&&result.geocodes&&result.geocodes.length>0){var loc=result.geocodes[0].location;cache[curId]={lng:loc.lng,lat:loc.lat};ok++;}
      if(idx%20===0||idx>=todo.length){document.getElementById('schoolCount').textContent='定位中 '+idx+'/'+todo.length+' (OK'+ok+')';setGeo(cache);doRender();}
      setTimeout(next,80);
    });
  }
  next();
}