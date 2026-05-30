// v32 Shanghai School Map
var P="shanghai2026",V="v32",map,favIds=new Set,hiddenIds=new Set,favOnly=false,cur,ps,gcActive=false,sm=[],shHidden=false,wd=null;

function lg(){if(document.getElementById("pi").value===P){localStorage.setItem("a32","1");document.getElementById("lp").style.display="none";document.getElementById("mp").style.display="flex";setTimeout(init,100);}else document.getElementById("le").style.display="block";}
if(localStorage.getItem("a32")==="1"){document.getElementById("lp").style.display="none";document.getElementById("mp").style.display="flex";setTimeout(init,100);}
document.getElementById("pi").addEventListener("keydown",function(e){if(e.key==="Enter")lg();});

function ld(k,d){try{return JSON.parse(localStorage.getItem(k)||d);}catch(e){return JSON.parse(d);}}
function sv(k,v){localStorage.setItem(k,JSON.stringify(v));}
function ge(){return ld("e32","{}");}function gg(){return ld("g32","{}");}function gx(){return ld("x32","[]");}
function allS(){return ALL_SCHOOLS.concat(gx());}
function sd(s){var e=ge(),d=e[s.id]||{};return{tier:d.tier!=null?d.tier:s.tier,lot:d.lot!=null?d.lot:(s.lotteryRate||""),fd:d.fd!=null?d.fd:(s.feederSchool||""),cm:d.cm!=null?d.cm:(s.communities||""),s25:d.s25!=null?d.s25:s.srRate25,s24:d.s24!=null?d.s24:s.srRate24,s23:d.s23!=null?d.s23:s.srRate23,r25:d.r25!=null?d.r25:s.residency25,hl:d.hl!=null?d.hl:s.highlights,nt:d.nt!=null?d.nt:""};}
function gc(s){var c=gg();if(c[s.id]&&c[s.id].lng)return c[s.id];var o=ct(s.district);if(!o)return null;return{lng:o[0]+Math.sin(s.id*12.7)*0.02,lat:o[1]+Math.cos(s.id*7.3)*0.02};}
function ct(d){var m={黄浦:[121.48,31.23],徐汇:[121.44,31.19],长宁:[121.42,31.22],静安:[121.45,31.23],普陀:[121.40,31.25],虹口:[121.49,31.26],杨浦:[121.52,31.27],闵行:[121.38,31.12],浦东:[121.55,31.22],宝山:[121.48,31.40],嘉定:[121.25,31.38],松江:[121.23,31.03],青浦:[121.12,31.15],金山:[121.33,30.75],奉贤:[121.47,30.92],崇明:[121.40,31.62]};return m[d]||null;}

function init(){
  favIds=new Set(ld("f32","[]"));hiddenIds=new Set(ld("hd32","[]"));
  map=new AMap.Map("mc",{zoom:11,center:[121.47,31.22],mapStyle:"amap://styles/macaron",viewMode:"3D"});
  if(typeof AMap!=="undefined"&&AMap.PlaceSearch)ps=new AMap.PlaceSearch({city:"上海",pageSize:12});
  var ds=[],seen={},all=allS();
  for(var i=0;i<all.length;i++){var d=all[i].district;if(d&&!seen[d]){ds.push(d);seen[d]=1;}}
  ds.sort();var sel=document.getElementById("df");
  for(i=0;i<ds.length;i++){var o=document.createElement("option");o.value=ds[i];o.textContent=ds[i];sel.appendChild(o);}
  sel.onchange=dr;document.getElementById("tf").onchange=dr;document.getElementById("pf").onchange=dr;
  document.getElementById("ss").addEventListener("input",dr);
  document.getElementById("as").addEventListener("keydown",function(e){if(e.key==="Enter")asr();});
  setTimeout(function(){try{var sw=new AMap.TileLayer.Subway();sw.setMap(map);}catch(e){}},800);
  dr();setTimeout(function(){if(map)sgc(true);},2500);
}

function dr(){
  if(!map||shHidden)return;map.clearMap();
  var df=document.getElementById("df").value,tf=document.getElementById("tf").value,pf=document.getElementById("pf").value;
  var kw=(document.getElementById("ss").value||"").toLowerCase(),all=allS(),list=[];
  for(var i=0;i<all.length;i++){
    var s=all[i];if(df&&s.district!==df)continue;var tier=sd(s).tier||"";
    if(tf&&tier.indexOf(tf)<0)continue;if(pf&&(s.type||"").indexOf(pf)<0)continue;
    if(kw&&!ms(s,kw))continue;if(favOnly&&!favIds.has(s.id))continue;
    list.push(s);
  }
  for(i=0;i<list.length;i++)am(list[i]);
  var el=document.getElementById("sc");
  if(gcActive){el.innerHTML='<span style="color:#f39c12">校正中...</span> 共'+list.length+'所 ('+V+')';}
  else{el.innerHTML='共 '+list.length+' 所 ('+V+') <a href="#" onclick="sgc(false)" style="color:#2ecc71">校正坐标</a> <a href="#" onclick="localStorage.removeItem(\'g32\');location.reload()" style="color:#e94560">清除缓存</a>';}
}

function am(s){
  var c=gc(s);if(!c)return;
  var tier=sd(s).tier||"",fc="#7f8c8d",r=6;
  if(tier.indexOf("一梯队")>=0){fc="#e94560";r=9;}else if(tier.indexOf("二梯队")>=0){fc="#f39c12";r=7;}else if(tier.indexOf("三梯队")>=0){fc="#3498db";r=6;}
  if(hiddenIds.has(s.id)){fc="#ccc";r=4;}
  var cm=new AMap.CircleMarker({center:[c.lng,c.lat],radius:r,fillColor:fc,fillOpacity:0.9,strokeColor:s._extra?"#f39c12":"#fff",strokeWeight:s._extra?3:2});cm.setMap(map);
  cm.on("click",(function(sch){return function(){dt(sch);}})(s));
  var nm=(s.name||"").length>6?(s.name||"").substring(0,5)+"..":(s.name||"");
  new AMap.Text({text:nm,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+8),style:{"font-size":"10px",color:"#222","font-weight":"bold","text-shadow":"0 0 3px #fff","text-align":"center","white-space":"nowrap"},zIndex:101}).setMap(map);
  var tl="";if(tier.indexOf("一梯队")>=0)tl="一梯队";else if(tier.indexOf("二梯队")>=0)tl="二梯队";else if(tier.indexOf("三梯队")>=0)tl="三梯队";
  if(tl)new AMap.Text({text:tl,position:[c.lng,c.lat],offset:new AMap.Pixel(0,r+20),style:{"font-size":"8px",color:fc,"font-weight":"bold","text-shadow":"0 0 3px #fff","text-align":"center","white-space":"nowrap"},zIndex:101}).setMap(map);
  if(favIds.has(s.id))new AMap.Text({text:"★",position:[c.lng,c.lat],offset:new AMap.Pixel(0,-r-8),style:{"font-size":"14px",color:"#f39c12","font-weight":"bold","text-align":"center"},zIndex:102}).setMap(map);
}

function ms(s,kw){
  var al={上实西校:["实验西校","上海实验西校"],华师大二附校:["闵华二"],骏博外国语:["骏博"],兰生复旦:["兰生"],新华初级:["新华初"],迅行初级:["迅行"],五浦汇实验:["五浦汇"],宝山华曜:["华曜宝山"],上外双语:["杨浦双语"]};
  if(al[s.name]){for(var i=0;i<al[s.name].length;i++){if(al[s.name][i].toLowerCase().indexOf(kw)>=0)return true;}}
  var f=[s.name,s.fullName,s.district,s.address,sd(s).tier];for(i=0;i<f.length;i++){if((f[i]||"").toLowerCase().indexOf(kw)>=0)return true;}return false;
}

function csm(){for(var i=0;i<sm.length;i++)sm[i].setMap(null);sm=[];}
function cas(){shHidden=false;csm();dr();}
function asr(){
  var kw=document.getElementById("as").value.trim();if(!kw||!ps){alert("请输入地址");return;}
  ps.search(kw,function(status,result){
    if(status==="complete"&&result.poiList&&result.poiList.pois&&result.poiList.pois.length>0){
      shHidden=true;map.clearMap();csm();var pois=result.poiList.pois;
      for(var i=0;i<pois.length;i++){(function(poi,idx){
        var mk=new AMap.Marker({position:[poi.location.lng,poi.location.lat]});mk.setMap(map);sm.push(mk);
        var lb=new AMap.Text({text:(idx+1)+"."+(poi.name||"").substring(0,10),position:[poi.location.lng,poi.location.lat],offset:new AMap.Pixel(15,-10),style:{"font-size":"12px",color:"#2980b9","font-weight":"bold",background:"rgba(255,255,255,0.9)",padding:"2px 6px","border-radius":"3px"},zIndex:201});lb.setMap(map);sm.push(lb);
        mk.on("click",function(){ssr(poi);});lb.on("click",function(){ssr(poi);});
      })(pois[i],i);}
      map.setFitView(null,false,[80,80,80,80]);
      document.getElementById("sc").innerHTML='找到 <b>'+pois.length+'</b> 个地址 | 点击蓝色标记选择 | <a href="#" onclick="cas()" style="color:#e74c3c">取消</a> ('+V+')';
    }else{alert("未找到");}
  });
}
function ssr(poi){if(confirm("选择: "+poi.name+"\n"+poi.address+"\n\n在此新增学校？")){ash(poi.location.lng,poi.location.lat,poi.name,poi.address);}}
function nsa(){alert("请先在搜索地址框输入地址并回车，地图上显示蓝色标记后点击选择。");}
function ash(lng,lat,name,addr){
  name=prompt("学校简称:",name||"");if(!name)return cas();addr=prompt("地址:",addr||"");
  var d=prompt("区域:","闵行"),tp=prompt("性质:","公办"),tier=prompt("梯队:","");
  var s25=prompt("市重率2025:",""),lot=prompt("中签率:",""),fd=prompt("对口小学:","");
  var cm=prompt("学区小区:",""),hl=prompt("亮点:","");
  var ex=gx(),nid=90000+ex.length+1;
  ex.push({id:nid,district:d||"",name:name,type:tp||"公办",fullName:name,address:addr||"",tier:tier||"",srRate25:s25||"",lotteryRate:lot||"",feederSchool:fd||"",communities:cm||"",residency23:"",residency24:"",residency25:"",srRate23:"",srRate24:"",highlights:hl||"",_extra:true});
  sv("x32",ex);var cache=gg();cache[nid]={lng:lng,lat:lat};sv("g32",cache);
  cas();dr();dt(ex[ex.length-1]);
}

function dt(s){
  cur=s;var t=sd(s),tier=t.tier||"",tc="t3",isF=favIds.has(s.id),isH=hiddenIds.has(s.id);
  if(tier.indexOf("一梯队")>=0)tc="t1";else if(tier.indexOf("二梯队")>=0)tc="t2";
  var h='<button onclick="cd()" style="float:right;background:none;color:#aaa;font-size:16px;cursor:pointer">X</button>';
  h+='<h3>'+s.name+' <span class="tier-tag '+tc+'">'+tier+'</span>'+(s._extra?' <span style="background:#f39c12;color:#fff;font-size:10px;padding:2px 6px;border-radius:8px">自定义</span>':'')+'</h3>';
  h+='<p>'+s.district+' | '+(s.type||"")+' | '+(s.address||"-")+'</p>';
  h+='<hr><b style="color:#e94560">可编辑</b><br>';
  h+=er("梯队","t_"+s.id,tier);h+=er("市重率25","s25_"+s.id,t.s25);h+=er("市重率24","s24_"+s.id,t.s24);h+=er("市重率23","s23_"+s.id,t.s23);
  h+=er("入户25","r25_"+s.id,t.r25);h+=er("中签率","lot_"+s.id,t.lot);h+=er("对口小学","fd_"+s.id,t.fd);
  h+='<p>学区小区:</p><textarea id="cm_'+s.id+'" style="width:100%;height:60px;margin:3px 0">'+t.cm.replace(/"/g,"&quot;")+'</textarea>';
  h+=er("亮点","hl_"+s.id,t.hl);h+='<p>备注:</p><textarea id="nt_'+s.id+'" style="width:100%;height:50px">'+t.nt.replace(/"/g,"&quot;")+'</textarea>';
  h+='<div style="margin-top:10px"><button onclick="tf('+s.id+')" style="background:#f39c12">'+(isF?"取消收藏":"收藏")+'</button> ';
  h+='<button onclick="th('+s.id+')" style="background:'+(isH?"#2ecc71":"#e74c3c")+'">'+(isH?"显示":"隐藏")+'</button> ';
  h+='<button onclick="se('+s.id+')" style="background:#2ecc71">保存</button>';
  if(s._extra)h+=' <button onclick="ds('+s.id+')" style="background:#e74c3c">删除</button>';
  h+=' <button onclick="cd()">关闭</button></div>';
  document.getElementById("dc").innerHTML=h;document.getElementById("dp").style.display="block";
}
function er(l,id,v){return '<div style="margin:2px 0;font-size:12px">'+l+': <input id="'+id+'" value="'+(v||"").replace(/"/g,"&quot;")+'" style="width:100%;padding:3px 6px;background:#16213e;color:#eee;border:1px solid #444;border-radius:3px;font-size:12px"></div>';}
function cd(){document.getElementById("dp").style.display="none";cur=null;}
function se(id){var oe=ge(),od=oe[id]||{};var nd={tier:document.getElementById("t_"+id).value,s25:document.getElementById("s25_"+id).value,s24:document.getElementById("s24_"+id).value,s23:document.getElementById("s23_"+id).value,r25:document.getElementById("r25_"+id).value,lot:document.getElementById("lot_"+id).value,fd:document.getElementById("fd_"+id).value,cm:document.getElementById("cm_"+id).value,hl:document.getElementById("hl_"+id).value,nt:document.getElementById("nt_"+id).value};oe[id]=nd;sv("e32",oe);dr();var s=allS().find(function(x){return x.id===id;});if(s)dt(s);}
function ds(id){if(!confirm("确定删除？"))return;var ex=gx().filter(function(x){return x.id!==id;});sv("x32",ex);cd();dr();}
function tf(id){if(favIds.has(id))favIds.delete(id);else favIds.add(id);sv("f32",Array.from(favIds));dr();if(cur&&cur.id===id)dt(cur);}
function th(id){if(hiddenIds.has(id))hiddenIds.delete(id);else hiddenIds.add(id);sv("hd32",Array.from(hiddenIds));dr();if(cur&&cur.id===id)dt(cur);}
function ff(){favOnly=!favOnly;var b=document.getElementById("fb");b.textContent=favOnly?"⭐ 显示全部":"⭐ 只看收藏";b.style.background=favOnly?"#e94560":"#555";dr();}

function ec(){
  var e=ge(),csv="区域,简称,性质,全称,中签率,入户23,入户24,入户25,对口小学,学区小区,市重率23,市重率24,市重率25,梯队,亮点,地址,自定义\n",all=allS();
  for(var i=0;i<all.length;i++){var s=all[i],d=sd(s);csv+=['"'+s.district+'"','"'+s.name+'"','"'+s.type+'"','"'+(s.fullName||"")+'"','"'+d.lot+'"','"'+(s.residency23||"")+'"','"'+(s.residency24||"")+'"','"'+d.r25+'"','"'+d.fd+'"','"'+d.cm+'"','"'+d.s23+'"','"'+d.s24+'"','"'+d.s25+'"','"'+d.tier+'"','"'+d.hl+'"','"'+(s.address||"")+'"','"'+(s._extra?"是":"")+'"'].join(",")+"\n";}
  var b=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="初中排名_"+new Date().toISOString().slice(0,10)+".csv";a.click();
}

function sgc(silent){
  if(gcActive)return;var cache=gg(),todo=[],all=allS();
  for(var i=0;i<all.length;i++){var s=all[i];if(s.address&&!cache[s.id])todo.push(s);}
  if(todo.length===0){if(!silent)alert("已全部定位");return;}
  if(typeof AMap=="undefined"||!AMap.Geocoder){if(!silent)alert("Geocoder未加载");return;}
  gcActive=true;var lp=0;dr();var gc=new AMap.Geocoder({city:"上海"}),idx=0,ok=0;
  function watchdog(){if(wd)clearTimeout(wd);wd=setTimeout(function(){if(idx===lp&&gcActive){gcActive=false;dr();}else{lp=idx;if(gcActive)watchdog();}},15000);}
  watchdog();
  function next(){
    if(!gcActive||idx>=todo.length){if(idx>=todo.length){sv("g32",cache);if(wd)clearTimeout(wd);}gcActive=false;dr();return;}
    var cur=todo[idx],cid=cur.id;
    gc.getLocation(cur.address,function(status,result){
      if(status==="complete"&&result.geocodes&&result.geocodes.length>0){var loc=result.geocodes[0].location;cache[cid]={lng:loc.lng,lat:loc.lat};ok++;}
      idx++;if(idx%5===0||idx>=todo.length){sv("g32",cache);dr();}
      setTimeout(next,180);
    });
  }
  next();
}