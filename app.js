
// v41 Shanghai School Map - clean, no shortcuts
var PWD="shanghai2026",VER="v41",theMap,favorites=new Set,hiddenSchools=new Set,favOnly=false,currentDetail,placeSearch,geoCodingActive=false,searchMarkers=[],schoolsHidden=false,watchdog=null;

// ====== Login ======
function doLogin(){
  if(document.getElementById("pwdInput").value===PWD){
    localStorage.setItem("auth41","1");
    document.getElementById("loginPage").style.display="none";
    document.getElementById("mapPage").style.display="flex";
    setTimeout(initMap,150);
  }else{document.getElementById("loginError").style.display="block";}
}
if(localStorage.getItem("auth41")==="1"){
  document.getElementById("loginPage").style.display="none";
  document.getElementById("mapPage").style.display="flex";
  setTimeout(initMap,200);
}
document.getElementById("pwdInput").addEventListener("keydown",function(e){if(e.key==="Enter")doLogin();});

// ====== Storage ======
function loadData(key,def){try{return JSON.parse(localStorage.getItem(key)||def);}catch(e){return JSON.parse(def);}}
function saveData(key,val){localStorage.setItem(key,JSON.stringify(val));}
function getEdits(){return loadData("edits41","{}");}
function setEdits(val){saveData("edits41",val);}
function getGeoCache(){return loadData("geo41","{}");}
function setGeoCache(val){saveData("geo41",val);}
function getExtraSchools(){return loadData("extra41","[]");}
function setExtraSchools(val){saveData("extra41",val);}
function allSchools(){return ALL_SCHOOLS.concat(getExtraSchools());}

// ====== School data with edits ======
function getSchoolData(school){
  var edits=getEdits(),d=edits[school.id]||{};
  return {
    tier:  d.tier  !=null ? d.tier  : (school.tier||""),
    lottery: d.lottery !=null ? d.lottery : (school.lotteryRate||""),
    feeder: d.feeder !=null ? d.feeder : (school.feederSchool||""),
    communities: d.communities !=null ? d.communities : (school.communities||""),
    rate25: d.rate25!=null ? d.rate25 : (school.srRate25||""),
    rate24: d.rate24!=null ? d.rate24 : (school.srRate24||""),
    rate23: d.rate23!=null ? d.rate23 : (school.srRate23||""),
    res25: d.res25 !=null ? d.res25 : (school.residency25||""),
    highlights: d.highlights!=null ? d.highlights : (school.highlights||""),
    notes: d.notes  !=null ? d.notes  : ""
  };
}

// ====== Coordinates ======
function getCoord(school){
  var cache=getGeoCache();
  if(cache[school.id] && cache[school.id].lng) return cache[school.id];
  var center=districtCenter(school.district);
  if(!center) return null;
  return {lng:center[0]+Math.sin(school.id*12.7)*0.02, lat:center[1]+Math.cos(school.id*7.3)*0.02};
}
function districtCenter(d){
  var m={黄浦:[121.48,31.23],徐汇:[121.44,31.19],长宁:[121.42,31.22],静安:[121.45,31.23],普陀:[121.40,31.25],虹口:[121.49,31.26],杨浦:[121.52,31.27],闵行:[121.38,31.12],浦东:[121.55,31.22],宝山:[121.48,31.40],嘉定:[121.25,31.38],松江:[121.23,31.03],青浦:[121.12,31.15],金山:[121.33,30.75],奉贤:[121.47,30.92],崇明:[121.40,31.62]};
  return m[d]||null;
}

// ====== Init ======
function initMap(){
  favorites=new Set(loadData("fav41","[]"));
  hiddenSchools=new Set(loadData("hide41","[]"));

  // Create map
  theMap=new AMap.Map("mapContainer",{zoom:13,center:[121.47,31.22],mapStyle:"amap://styles/normal",viewMode:"3D"});
  if(typeof AMap!=="undefined" && AMap.PlaceSearch) placeSearch=new AMap.PlaceSearch({city:"上海",pageSize:12});

  // Populate district filter
  var districts=[],seen={},all=allSchools();
  for(var i=0;i<all.length;i++){
    var d=all[i].district;
    if(d && !seen[d]){districts.push(d);seen[d]=1;}
  }
  districts.sort();
  var sel=document.getElementById("districtFilter");
  for(i=0;i<districts.length;i++){
    var o=document.createElement("option");o.value=districts[i];o.textContent=districts[i];sel.appendChild(o);
  }

  // Event handlers
  sel.onchange=renderSchools;
  document.getElementById("tierFilter").onchange=renderSchools;
  document.getElementById("typeFilter").onchange=renderSchools;
  document.getElementById("schoolSearch").addEventListener("input",renderSchools);
  document.getElementById("addrSearch").addEventListener("keydown",function(e){if(e.key==="Enter")searchAddress();});

  // Render NOW
  renderSchools();

  // Background geocoding
  setTimeout(function(){if(theMap) startGeocoding(true);},2500);
}

// ====== Render ======
function renderSchools(){
  if(!theMap || schoolsHidden) return;
  theMap.clearMap();

  var dFilter=document.getElementById("districtFilter").value;
  var tFilter=document.getElementById("tierFilter").value;
  var pFilter=document.getElementById("typeFilter").value;
  var keyword=(document.getElementById("schoolSearch").value||"").toLowerCase();

  var all=allSchools(), list=[];
  for(var i=0;i<all.length;i++){
    var s=all[i];
    if(dFilter && s.district!==dFilter) continue;
    var tier=getSchoolData(s).tier||"";
    if(tFilter && tier.indexOf(tFilter)<0) continue;
    if(pFilter && (s.type||"").indexOf(pFilter)<0) continue;
    if(keyword && !searchMatch(s,keyword)) continue;
    if(favOnly && !favorites.has(s.id)) continue;
    list.push(s);
  }

  for(i=0;i<list.length;i++) addSchoolMarker(list[i]);

  var el=document.getElementById("schoolCount");
  if(geoCodingActive){
    el.innerHTML='<span style="color:#f39c12">校正中...</span> 共'+list.length+'所 ('+VER+')';
  }else{
    el.innerHTML='共 '+list.length+' 所 ('+VER+') <a href=# onclick=startGeocoding(false) style=color:#2ecc71>校正坐标</a> <a href=# onclick=clearGeoAndReload() style=color:#e94560>清除缓存</a>';
  }
}

function addSchoolMarker(school){
  var coord=getCoord(school); if(!coord) return;
  var tier=getSchoolData(school).tier||"", color="#7f8c8d", radius=6;
  if(tier.indexOf("一梯队")>=0){color="#e94560";radius=9;}
  else if(tier.indexOf("二梯队")>=0){color="#f39c12";radius=7;}
  else if(tier.indexOf("三梯队")>=0){color="#3498db";radius=6;}
  if(hiddenSchools.has(school.id)){color="#ccc";radius=4;}

  var stroke=school._extra?"#f39c12":"#fff", sw=school._extra?3:2;
  var marker=new AMap.CircleMarker({center:[coord.lng,coord.lat],radius:radius,fillColor:color,fillOpacity:0.9,strokeColor:stroke,strokeWeight:sw});
  marker.setMap(theMap);
  marker.on("click",(function(s){return function(){openDetail(s);}})(school));

  var name=(school.name||"").length>6?(school.name||"").substring(0,5)+"..":(school.name||"");
  new AMap.Text({text:name,position:[coord.lng,coord.lat],offset:new AMap.Pixel(0,radius+8),style:{"font-size":"10px",color:"#222","font-weight":"bold","text-shadow":"0 0 3px #fff","text-align":"center","white-space":"nowrap"},zIndex:101}).setMap(theMap);

  var tierLabel="";
  if(tier.indexOf("一梯队")>=0) tierLabel="一梯队";
  else if(tier.indexOf("二梯队")>=0) tierLabel="二梯队";
  else if(tier.indexOf("三梯队")>=0) tierLabel="三梯队";
  if(tierLabel) new AMap.Text({text:tierLabel,position:[coord.lng,coord.lat],offset:new AMap.Pixel(0,radius+20),style:{"font-size":"8px",color:color,"font-weight":"bold","text-shadow":"0 0 3px #fff","text-align":"center","white-space":"nowrap"},zIndex:101}).setMap(theMap);

  if(favorites.has(school.id)) new AMap.Text({text:"★",position:[coord.lng,coord.lat],offset:new AMap.Pixel(0,-radius-8),style:{"font-size":"14px",color:"#f39c12","font-weight":"bold","text-align":"center"},zIndex:102}).setMap(theMap);
}

// ====== Search ======
function searchMatch(school,keyword){
  var aliases={上实西校:["实验西校","上海实验西校"],华师大二附校:["闵华二"],骏博外国语:["骏博"],兰生复旦:["兰生"],新华初级:["新华初"],迅行初级:["迅行"],五浦汇实验:["五浦汇"],宝山华曜:["华曜宝山"],上外双语:["杨浦双语"]};
  if(aliases[school.name]){for(var i=0;i<aliases[school.name].length;i++){if(aliases[school.name][i].toLowerCase().indexOf(keyword)>=0) return true;}}
  var fields=[school.name,school.fullName,school.district,school.address,getSchoolData(school).tier];
  for(i=0;i<fields.length;i++){if((fields[i]||"").toLowerCase().indexOf(keyword)>=0) return true;}
  return false;
}

function clearSchoolSearch(){document.getElementById("schoolSearch").value="";renderSchools();}

// ====== Address Search ======
function clearSearchMarkers(){for(var i=0;i<searchMarkers.length;i++) searchMarkers[i].setMap(null);searchMarkers=[];}
function cancelAddrSearch(){schoolsHidden=false;clearSearchMarkers();renderSchools();}

function searchAddress(){
  var kw=document.getElementById("addrSearch").value.trim();
  if(!kw||!placeSearch){alert("请输入地址");return;}
  placeSearch.search(kw,function(status,result){
    if(status==="complete"&&result.poiList&&result.poiList.pois&&result.poiList.pois.length>0){
      schoolsHidden=true;theMap.clearMap();clearSearchMarkers();
      var pois=result.poiList.pois;
      for(var i=0;i<pois.length;i++){
        (function(poi,idx){
          var mk=new AMap.Marker({position:[poi.location.lng,poi.location.lat]});mk.setMap(theMap);searchMarkers.push(mk);
          var lb=new AMap.Text({text:(idx+1)+"."+(poi.name||"").substring(0,10),position:[poi.location.lng,poi.location.lat],offset:new AMap.Pixel(15,-10),style:{"font-size":"12px",color:"#2980b9","font-weight":"bold",background:"rgba(255,255,255,0.9)",padding:"2px 6px","border-radius":"3px"},zIndex:201});lb.setMap(theMap);searchMarkers.push(lb);
          mk.on("click",function(){selectAddrResult(poi);});lb.on("click",function(){selectAddrResult(poi);});
        })(pois[i],i);
      }
      theMap.setFitView(null,false,[80,80,80,80]);
      document.getElementById("schoolCount").innerHTML='找到 <b>'+pois.length+'</b> 个地址 | 点击蓝色标记选择 | <a href="#" onclick="cancelAddrSearch()" style="color:#e74c3c">取消</a>';
    }else{alert("未找到");}
  });
}
function selectAddrResult(poi){
  if(confirm("选择: "+poi.name+"\n"+poi.address+"\n\n在此新增学校？")){
    addSchoolHere(poi.location.lng,poi.location.lat,poi.name,poi.address);
  }
}
function startAddSchool(){
  alert("请先在搜索地址框输入地址并回车，地图上显示蓝色标记后点击选择。");
}
function addSchoolHere(lng,lat,name,addr){
  name=prompt("学校简称:",name||"");if(!name) return cancelAddrSearch();
  addr=prompt("地址:",addr||"");
  var district=prompt("区域:","闵行"),type=prompt("性质:","公办"),tier=prompt("梯队:","");
  var rate25=prompt("市重率2025:",""),lottery=prompt("中签率:",""),feeder=prompt("对口小学:","");
  var communities=prompt("学区小区:",""),highlights=prompt("亮点:","");
  var extra=getExtraSchools(),nid=90000+extra.length+1;
  extra.push({id:nid,district:district||"",name:name,type:type||"公办",fullName:name,address:addr||"",tier:tier||"",srRate25:rate25||"",lotteryRate:lottery||"",feederSchool:feeder||"",communities:communities||"",residency23:"",residency24:"",residency25:"",srRate23:"",srRate24:"",highlights:highlights||"",_extra:true});
  setExtraSchools(extra);
  var cache=getGeoCache();cache[nid]={lng:lng,lat:lat};setGeoCache(cache);
  cancelAddrSearch();renderSchools();openDetail(extra[extra.length-1]);
}

// ====== Community Outlines ======
var communityOutlines=[];
function clearCommunityOutlines(){for(var i=0;i<communityOutlines.length;i++)communityOutlines[i].setMap(null);communityOutlines=[];}
function drawCommunities(school){
  clearCommunityOutlines();
  var d=getSchoolData(school),text=d.communities||"";
  if(!text||text==="-")return;
  var parts=text.split(/[,，;；、\s]+/).filter(function(x){return x.length>0;});
  if(!parts.length||typeof AMap=="undefined"||!AMap.Geocoder)return;
  var gc=new AMap.Geocoder({city:"上海"});
  for(var i=0;i<parts.length;i++){
    (function(name){
      gc.getLocation(name,function(status,result){
        if(status==="complete"&&result.geocodes&&result.geocodes.length>0){
          var loc=result.geocodes[0].location;
          // Try DistrictSearch for polygon boundary
          var ds=new AMap.DistrictSearch({level:"biz_area",extensions:"all"});
          ds.search(name,function(ds,dre){
            var hasPoly=false;
            if(ds==="complete"&&dre.districtList&&dre.districtList.length>0&&dre.districtList[0].boundaries){
              var bounds=dre.districtList[0].boundaries;
              for(var b=0;b<bounds.length;b++){
                var poly=new AMap.Polygon({path:bounds[b],fillColor:"#2ecc71",fillOpacity:0.15,strokeColor:"#2ecc71",strokeWeight:2,strokeOpacity:0.6});
                poly.setMap(theMap);communityOutlines.push(poly);hasPoly=true;
              }
            }
            if(!hasPoly){
              var ci=new AMap.CircleMarker({center:[loc.lng,loc.lat],radius:12,fillColor:"#2ecc71",fillOpacity:0.2,strokeColor:"#2ecc71",strokeWeight:2});
              ci.setMap(theMap);communityOutlines.push(ci);
            }
          });
          var lb=new AMap.Text({text:name,position:[loc.lng,loc.lat],offset:new AMap.Pixel(0,-18),style:{"font-size":"9px",color:"#2ecc71",background:"rgba(255,255,255,0.8)",padding:"1px 3px","border-radius":"2px"},zIndex:90});
          lb.setMap(theMap);communityOutlines.push(lb);
        }
      });
    })(parts[i]);
  }
}

// ====== Detail Panel ======
function openDetail(school){
  currentDetail=school;
  var d=getSchoolData(school),tier=d.tier||"",tierClass="t3",isFav=favorites.has(school.id),isHid=hiddenSchools.has(school.id);
  if(tier.indexOf("一梯队")>=0) tierClass="t1";else if(tier.indexOf("二梯队")>=0) tierClass="t2";

  var h='<button onclick="closeDetail()" style="float:right;background:none;color:#aaa;font-size:16px;cursor:pointer">X</button>';
  h+='<h3>'+school.name+' <span class="tier-tag '+tierClass+'">'+tier+'</span>'+(school._extra?' <span style="background:#f39c12;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px">自定义</span>':'')+'</h3>';
  h+='<p>'+school.district+' | '+(school.type||"")+' | '+(school.address||"-")+'</p>';
  h+='<hr><b style="color:#e94560">可编辑</b><br>';
  h+=editField("梯队","tier_",school.id,d.tier);
  h+=editField("市重率2025","r25_",school.id,d.rate25);
  h+=editField("市重率2024","r24_",school.id,d.rate24);
  h+=editField("市重率2023","r23_",school.id,d.rate23);
  h+=editField("入户25","res25_",school.id,d.res25);
  h+=editField("中签率","lot_",school.id,d.lottery);
  h+=editField("对口小学","fd_",school.id,d.feeder);
  h+='<p>学区小区:</p><textarea id="cm_'+school.id+'" style="width:100%;height:60px;margin:3px 0">'+d.communities.replace(/"/g,"&quot;")+'</textarea>';
  h+=editField("亮点","hl_",school.id,d.highlights);
  h+='<p>备注:</p><textarea id="nt_'+school.id+'" style="width:100%;height:50px">'+d.notes.replace(/"/g,"&quot;")+'</textarea>';
  h+='<div style="margin-top:10px">';
  h+='<button onclick="toggleFavorite('+school.id+')" style="background:#f39c12">'+(isFav?"取消收藏":"收藏")+'</button> ';
  h+='<button onclick="toggleHidden('+school.id+')" style="background:'+(isHid?"#2ecc71":"#e74c3c")+'">'+(isHid?"显示":"隐藏")+'</button> ';
  h+='<button onclick="saveSchoolEdit('+school.id+')" style="background:#2ecc71">保存</button> ';
  h+='<button onclick="drawCommunities(allSchools().find(function(x){return x.id==='+school.id+';}))" style="background:#3498db">框选小区</button>';
  if(school._extra) h+=' <button onclick="deleteSchool('+school.id+')" style="background:#e74c3c">删除</button>';
  h+=' <button onclick="closeDetail()">关闭</button></div>';
  var hist=getHistory().filter(function(x){return x.n===school.name;});
  if(hist.length>0){h+="<hr><b>修改记录</b><br>";for(var i=0;i<Math.min(hist.length,5);i++){h+="<div style="font-size:10px;color:#aaa;margin:3px 0;padding:4px;background:rgba(255,255,255,0.03);border-radius:2px">"+hist[i].t+"<br>"+hist[i].c+"</div>";}}
  document.getElementById("detailContent").innerHTML=h;
  document.getElementById("detailPanel").style.display="block";
}
function editField(label,prefix,id,value){
  return '<div style="margin:2px 0;font-size:12px">'+label+': <input id="'+prefix+id+'" value="'+(value||"").replace(/"/g,"&quot;")+'" style="width:100%;padding:3px 6px;background:#16213e;color:#eee;border:1px solid #444;border-radius:3px;font-size:12px"></div>';
}
function closeDetail(){document.getElementById("detailPanel").style.display="none";currentDetail=null;clearCommunityOutlines();}
function getHistory(){try{return JSON.parse(localStorage.getItem("hist41")||"[]");}catch(e){return[];}}
function addHistory(school,changes){var h=getHistory();h.unshift({t:new Date().toLocaleString(),n:school.name,c:changes});if(h.length>200)h=h.slice(0,200);localStorage.setItem("hist41",JSON.stringify(h));}

// ====== Save/Delete ======
function saveSchoolEdit(id){
  var edits=getEdits(),old=edits[id]||{};
  var nd={tier:document.getElementById("tier_"+id).value,rate25:document.getElementById("r25_"+id).value,rate24:document.getElementById("r24_"+id).value,rate23:document.getElementById("r23_"+id).value,res25:document.getElementById("res25_"+id).value,lottery:document.getElementById("lot_"+id).value,feeder:document.getElementById("fd_"+id).value,communities:document.getElementById("cm_"+id).value,highlights:document.getElementById("hl_"+id).value,notes:document.getElementById("nt_"+id).value};
  edits[id]=nd;setEdits(edits);
  // Log changes
  var changes=[];
  for(var k in nd){var ov=old[k]||"无",nv=nd[k]||"";if(ov!==nv)changes.push(k+": "+ov+" -> "+nv);}
  if(changes.length>0){var s=allSchools().find(function(x){return x.id===id;});if(s)addHistory(s,changes.join("; "));}
  renderSchools();
  var s=allSchools().find(function(x){return x.id===id;});
  if(s) openDetail(s);
}
function deleteSchool(id){
  if(!confirm("确定删除？")) return;
  var extra=getExtraSchools().filter(function(x){return x.id!==id;});
  setExtraSchools(extra);closeDetail();renderSchools();
}

// ====== Favorite/Hide/Filter ======
function toggleFavorite(id){if(favorites.has(id)) favorites.delete(id);else favorites.add(id);saveData("fav41",Array.from(favorites));renderSchools();if(currentDetail&&currentDetail.id===id) openDetail(currentDetail);}
function toggleHidden(id){if(hiddenSchools.has(id)) hiddenSchools.delete(id);else hiddenSchools.add(id);saveData("hide41",Array.from(hiddenSchools));renderSchools();if(currentDetail&&currentDetail.id===id) openDetail(currentDetail);}
function toggleFavFilter(){favOnly=!favOnly;var b=document.getElementById("favBtn");b.textContent=favOnly?"⭐ 显示全部":"⭐ 只看收藏";b.style.background=favOnly?"#e94560":"#555";renderSchools();}

// ====== Export ======
function clearGeoAndReload(){localStorage.removeItem("geo41");location.reload();}
function exportCSV(){
  var edits=getEdits(),csv="区域,简称,性质,全称,中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址,自定义\n";
  var all=allSchools();
  for(var i=0;i<all.length;i++){
    var s=all[i],d=getSchoolData(s);
    csv+=['"'+s.district+'"','"'+s.name+'"','"'+s.type+'"','"'+(s.fullName||"")+'"','"'+d.lottery+'"','"'+(s.residency23||"")+'"','"'+(s.residency24||"")+'"','"'+d.res25+'"','"'+d.feeder+'"','"'+d.communities+'"','"'+d.rate23+'"','"'+d.rate24+'"','"'+d.rate25+'"','"'+d.tier+'"','"'+d.highlights+'"','"'+(s.address||"")+'"','"'+(s._extra?"是":"")+'"'].join(",")+"\n";
  }
  var b=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
  var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="初中排名_"+new Date().toISOString().slice(0,10)+".csv";a.click();
}

// ====== Geocoding ======
function startGeocoding(silent){
  if(geoCodingActive) return;
  var cache=getGeoCache(),todo=[],all=allSchools();
  for(var i=0;i<all.length;i++){var s=all[i];if(s.address&&!cache[s.id]) todo.push(s);}
  if(todo.length===0){if(!silent) alert("已全部定位");return;}
  if(typeof AMap=="undefined"||!AMap.Geocoder){if(!silent) alert("Geocoder未加载");return;}
  geoCodingActive=true;var lastProgress=0;renderSchools();
  var geocoder=new AMap.Geocoder({city:"上海"}),idx=0,ok=0;

  function startWatchdog(){
    if(watchdog) clearTimeout(watchdog);
    watchdog=setTimeout(function(){
      if(idx===lastProgress && geoCodingActive){geoCodingActive=false;renderSchools();}
      else{lastProgress=idx;if(geoCodingActive) startWatchdog();}
    },15000);
  }
  startWatchdog();

  function next(){
    if(!geoCodingActive || idx>=todo.length){
      if(idx>=todo.length){setGeoCache(cache);if(watchdog) clearTimeout(watchdog);}
      geoCodingActive=false;renderSchools();return;
    }
    var current=todo[idx],currentId=current.id;
    geocoder.getLocation(current.address,function(status,result){
      if(status==="complete"&&result.geocodes&&result.geocodes.length>0){
        var loc=result.geocodes[0].location;
        cache[currentId]={lng:loc.lng,lat:loc.lat};ok++;
      }
      idx++;
      if(idx%5===0||idx>=todo.length){setGeoCache(cache);renderSchools();}
      setTimeout(next,180);
    });
  }
  next();
}