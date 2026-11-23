const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const BASE = 'https://www.albumaty.com';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
};
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=180, s-maxage=300' };

const ARTISTS = {
  'amr diab': { ar:'عمرو دياب', aliases:['amr diab','عمرو دياب','عمرو دياب'] },
  'tamer hosny': { ar:'تامر حسني', aliases:['tamer hosny','تامر حسني'] },
  'sherine': { ar:'شيرين', aliases:['sherine','shereen','شيرين','شيرين عبد الوهاب'] },
  'angham': { ar:'أنغام', aliases:['angham','انغام','أنغام'] },
  'assala': { ar:'أصالة', aliases:['assala','asala','أصالة','اصالة'] },
  'tamer ashour': { ar:'تامر عاشور', aliases:['tamer ashour','تامر عاشور'] },
  'ramy sabry': { ar:'رامي صبري', aliases:['ramy sabry','رامي صبري'] },
  'bahaa sultan': { ar:'بهاء سلطان', aliases:['bahaa sultan','بهاء سلطان'] },
  'wael kfoury': { ar:'وائل كفوري', aliases:['wael kfoury','وائل كفوري'] },
  'elissa': { ar:'إليسا', aliases:['elissa','elisa','إليسا','اليسا'] },
  'ruby': { ar:'روبي', aliases:['ruby','روبي'] },
  'mohamed hamaki': { ar:'محمد حماقي', aliases:['mohamed hamaki','hamaki','محمد حماقي'] },
  'ahmed saad': { ar:'أحمد سعد', aliases:['ahmed saad','احمد سعد','أحمد سعد'] },
  'hamza namira': { ar:'حمزة نمرة', aliases:['hamza namira','حمزة نمرة'] },
  'wegz': { ar:'ويجز', aliases:['wegz','ويجز'] },
  'marwan pablo': { ar:'مروان بابلو', aliases:['marwan pablo','مروان بابلو'] },
  'marwan moussa': { ar:'مروان موسى', aliases:['marwan moussa','مروان موسى'] },
  'afroto': { ar:'أفروتو', aliases:['afroto','أفروتو'] },
  'abyusif': { ar:'أبيوسف', aliases:['abyusif','abyoussef','أبيوسف'] },
  'tul8te': { ar:'توليت', aliases:['tul8te','toul8te','توليت'] },
  'muslim': { ar:'مسلم', aliases:['muslim','مسلم'] },
  'hassan shakosh': { ar:'حسن شاكوش', aliases:['hassan shakosh','حسن شاكوش'] },
  'essam sasa': { ar:'عصام صاصا', aliases:['essam sasa','عصام صاصا'] },
  'omar kamal': { ar:'عمر كمال', aliases:['omar kamal','عمر كمال'] },
  'mohamed ramadan': { ar:'محمد رمضان', aliases:['mohamed ramadan','محمد رمضان'] },
  'cairokee': { ar:'كايروكي', aliases:['cairokee','كايروكي'] },
  'cairokee band': { ar:'كايروكي', aliases:['cairokee','كايروكي'] },
  'maha ftouni': { ar:'مها فتوني', aliases:['maha ftouni','مها فتوني'] },
  'nawal': { ar:'نوال', aliases:['nawal','نوال'] },
  'fairuz': { ar:'فيروز', aliases:['fairuz','فيروز'] },
  'umm kulthum': { ar:'أم كلثوم', aliases:['umm kulthum','om kalthoum','أم كلثوم'] },
  'abdel halim hafez': { ar:'عبد الحليم حافظ', aliases:['abdel halim hafez','عبد الحليم حافظ'] },
  'warda': { ar:'وردة', aliases:['warda','وردة'] }
};
const SIMILAR = {
  'sherine':['Angham','Assala','Ruby','Elissa','Mai Farouk','Ramy Sabry','Tamer Ashour'],
  'amr diab':['Ramy Sabry','Tamer Hosny','Bahaa Sultan','Mohamed Hamaki','Ahmed Saad'],
  'tamer hosny':['Amr Diab','Ramy Sabry','Tamer Ashour','Ahmed Saad','Mohamed Hamaki'],
  'angham':['Sherine','Assala','Elissa','Ramy Sabry','Tamer Ashour'],
  'assala':['Sherine','Angham','Elissa','Wael Kfoury'],
  'tamer ashour':['Ramy Sabry','Sherine','Angham','Bahaa Sultan','Wael Kfoury'],
  'ramy sabry':['Tamer Ashour','Amr Diab','Sherine','Bahaa Sultan','Tamer Hosny'],
  'wegz':['Marwan Pablo','Afroto','Abyusif','TUL8TE','Marwan Moussa'],
  'marwan pablo':['Wegz','Afroto','Abyusif','Marwan Moussa'],
  'ahmed saad':['Mohamed Hamaki','Tamer Hosny','Muslim','Ruby'],
  'mohamed hamaki':['Amr Diab','Tamer Hosny','Ramy Sabry','Ahmed Saad'],
  'tul8te':['Wegz','Marwan Pablo','Marwan Moussa','Afroto'], 'marwan moussa':['Wegz','Marwan Pablo','Afroto','Abyusif'],
  'afroto':['Wegz','Marwan Pablo','Marwan Moussa','Abyusif'], 'abyusif':['Wegz','Marwan Pablo','Afroto','Marwan Moussa'],
  'muslim':['Ahmed Saad','Omar Kamal','Hassan Shakosh','Essam Sasa'], 'essam sasa':['Hassan Shakosh','Omar Kamal','Hamo Bika','Muslim'],
  'hassan shakosh':['Essam Sasa','Omar Kamal','Muslim','Hamo Bika'], 'hamza namira':['Cairokee','Massar Egbari','Sharmoofers'],
  'cairokee':['Hamza Namira','Massar Egbari','Sharmoofers'], 'mohamed ramadan':['Ahmed Saad','Wegz','Hassan Shakosh','Tamer Hosny'],
  'elissa':['Sherine','Angham','Assala','Wael Kfoury'], 'wael kfoury':['Elissa','Assala','Fadel Chaker','Tamer Ashour']
};
const GENRES = {
  'romantic':['Tamer Ashour','Sherine','Angham','Assala','Ramy Sabry','Wael Kfoury','Elissa','Bahaa Sultan','Fadel Chaker','Majid Al Mohandis'],
  'party':['Ahmed Saad','Mohamed Ramadan','Tamer Hosny','Ruby','Wegz','Hassan Shakosh','Muslim','Omar Kamal'],
  'rap':['Wegz','Marwan Pablo','Marwan Moussa','Afroto','Abyusif','TUL8TE','Shahyn','L5VAV'],
  'mahraganat':['Essam Sasa','Hassan Shakosh','Omar Kamal','Hamo Bika','Oka Ortega','Muslim'],
  'tarab':['Umm Kulthum','Abdel Halim Hafez','Warda','Fairuz','Mohamed Abdel Wahab','Najاة الصغيرة'],
  'egypt-pop':['Amr Diab','Tamer Hosny','Sherine','Ahmed Saad','Ruby','Mohamed Hamaki','Ramy Sabry','Angham','Bahaa Sultan'],
  'indie':['Cairokee','Massar Egbari','Sharmoofers','Hamza Namira','Autostrad','Abo Sahar']
};
function norm(s='') {
  return String(s).toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/[ؤئ]/g,'ء')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g,' ').trim().replace(/\s+/g,' ');
}
function artistKey(name='') {
  const n=norm(name);
  for (const [key,v] of Object.entries(ARTISTS)) if (v.aliases.some(a=>norm(a)===n)) return key;
  return n;
}
function artistMatches(actual,wanted) {
  const a=norm(actual), key=artistKey(wanted), v=ARTISTS[key];
  if (!a || !key) return false;
  if (v) return v.aliases.some(x=>norm(x)===a);
  return a===key;
}
function decode(s='') {
  return String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
}
async function cachedFetch(url, init={}, ttl=300) {
  try {
    const cache=caches.default;
    const key=new Request(url,{method:'GET'});
    const hit=await cache.match(key);
    if(hit)return hit;
    const response=await fetch(url,init);
    if(response.ok){
      const headers=new Headers(response.headers);
      headers.set('Cache-Control',`public, max-age=${ttl}`);
      const copy=new Response(response.clone().body,{status:response.status,statusText:response.statusText,headers});
      await cache.put(key,copy);
    }
    return response;
  } catch { return fetch(url,init); }
}
async function fetchText(url, headers={}) {
  const r=await cachedFetch(url,{headers:{'User-Agent':UA,'Referer':BASE,...headers},signal:AbortSignal.timeout(14000)},300);
  if(!r.ok) throw new Error(`Upstream HTTP ${r.status}`);
  return r.text();
}
function meta(html,key) {
  const tags=html.match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    const attr=n=>{const m=tag.match(new RegExp(`${n}\\s*=\\s*[\"']([^\"']*)[\"']`,'i'));return m?m[1]:'';};
    if(attr('property').toLowerCase()===key.toLowerCase()||attr('name').toLowerCase()===key.toLowerCase()) return decode(attr('content')).trim()||null;
  }
  return null;
}
function idsFrom(html,type='song') {
  const out=new Set(),re=new RegExp("href=[\"\']([^\"\']*\\/"+type+"\\/(\\d+)\\.html)[\"\']", "gi");let m;
  while((m=re.exec(html))) out.add(Number(m[2])); return [...out];
}
function getArtistName(html) {
  const m=meta(html,'og:audio:artist')||meta(html,'music:musician'); if(m)return m;
  const a=html.match(/<a\b[^>]*href=["'][^"']*\/singer\/\d+[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
  return a?decode(a[1].replace(/<[^>]+>/g,' ').trim()):'';
}
async function parseSong(id,origin) {
  try {
    const html=await fetchText(`${BASE}/song/${id}.html`);
    const audio=meta(html,'og:audio')||(html.match(/<audio\b[^>]*src=["']([^"']+)["']/i)||[])[1];
    if(!audio)return null;
    const singer=(html.match(/href=["'][^"']*\/singer\/(\d+)[^"']*["']/i)||[])[1]||null;
    const title=meta(html,'og:audio:title')||meta(html,'og:title')||'';
    return {id:Number(id),title:decode(title).replace(/\s*[|–-]\s*(?:البوماتي|Albumaty).*$/i,'').trim(),artist:getArtistName(html),album:meta(html,'og:audio:album')||'',cover:meta(html,'og:image')||'',duration:Number(meta(html,'music:duration')||0),mp3:`${origin}/stream?id=${Number(id)}`,singerId:singer};
  } catch { return null; }
}
async function mapLimit(items,limit,fn) {
  const out=new Array(items.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(cursor<items.length){const i=cursor++;try{out[i]=await fn(items[i],i);}catch{out[i]=null;}}}));
  return out.filter(Boolean);
}
async function itunesTracks(artist) {
  const key=artistKey(artist), entry=ARTISTS[key], term=entry?.ar||artist;
  const url=`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=200&country=eg`;
  const r=await cachedFetch(url,{signal:AbortSignal.timeout(12000)},21600);if(!r.ok)return [];
  const data=await r.json(),rows=Array.isArray(data.results)?data.results:[];
  return rows.filter(x=>artistMatches(x.artistName||'',artist)).map(x=>x.trackName).filter(Boolean)
    .filter((x,i,a)=>a.findIndex(y=>norm(y)===norm(x))===i);
}
function titleMatches(actual,wanted) {
  const a=norm(actual),w=norm(wanted);if(!a||!w)return false;
  if(a===w)return true;
  if(Math.min(a.length,w.length)>=7&&(a.includes(w)||w.includes(a)))return true;
  const strip=s=>s.replace(/\b(feat|ft|featuring|with)\b.*$/,'').trim();
  return strip(a)===strip(w);
}
async function exactAlbumatyTrack(title,artist,origin) {
  try {
    const ar=ARTISTS[artistKey(artist)]?.ar||artist;
    const html=await fetchText(`${BASE}/search.php?q=${encodeURIComponent(`${title} ${ar}`)}`);
    const ids=idsFrom(html).slice(0,12);
    const tracks=await mapLimit(ids,2,id=>parseSong(id,origin));
    return tracks.find(t=>t&&titleMatches(t.title,title)&&artistMatches(t.artist,artist))||null;
  } catch { return null; }
}
async function artistRadio(artist,origin) {
  const titles=await itunesTracks(artist);
  let tracks=await mapLimit(titles.slice(0,12),4,title=>exactAlbumatyTrack(title,artist,origin));
  if(tracks.length<4){
    const term=ARTISTS[artistKey(artist)]?.ar||artist;
    try{const page=await fetchText(`${BASE}/search.php?q=${encodeURIComponent(term)}`);const fallback=await mapLimit(idsFrom(page).slice(0,12),5,id=>parseSong(id,origin));tracks=tracks.concat(fallback.filter(t=>artistMatches(t.artist,artist)));}catch{}
  }
  const seen=new Set();
  return tracks.filter(t=>{if(!t||!artistMatches(t.artist,artist))return false;const k=norm(t.title)+'|'+norm(t.artist);if(seen.has(k))return false;seen.add(k);return true;});
}
async function searchAlbumaty(q,origin,limit=45) {
  let query=q;
  const key=artistKey(q);if(ARTISTS[key])query=ARTISTS[key].ar;
  else if(/^[a-z0-9\s]+$/i.test(q)){
    try{const r=await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(q)}`,{signal:AbortSignal.timeout(7000)});const d=await r.json();if(d?.[0]?.[0]?.[0])query=d[0][0][0];}catch{}
  }
  let ids=[];
  try{ids=idsFrom(await fetchText(`${BASE}/search.php?q=${encodeURIComponent(query)}`));}catch{}
  if(!ids.length){const short=query.split(/\s+/).slice(0,2).join(' ');if(short)try{ids=idsFrom(await fetchText(`${BASE}/search.php?q=${encodeURIComponent(short)}`));}catch{}}
  return mapLimit(ids.slice(0,limit),7,id=>parseSong(id,origin));
}
async function appleChart(country='eg',limit=100) {
  const cc=/^[a-z]{2}$/i.test(country)?country.toLowerCase():'eg';
  const url=`https://rss.applemarketingtools.com/api/v2/${cc}/music/most-played/${Math.min(100,Math.max(1,limit))}/songs.json`;
  const r=await cachedFetch(url,{signal:AbortSignal.timeout(12000)},900);if(!r.ok)throw new Error(`Chart HTTP ${r.status}`);
  const d=await r.json();const rows=d?.feed?.results||[];
  return rows.map((x,i)=>({title:x.name||'',artist:x.artistName||'',album:x.collectionName||'',cover:x.artworkUrl100||'',chartRank:i+1,storeUrl:x.url||'',chartSource:`Apple Music ${cc.toUpperCase()} Top Songs`})).filter(x=>x.title&&x.artist);
}
function json(items,status=200){return new Response(JSON.stringify({items}),{status,headers:JSON_HEADERS});}
export default {
 async fetch(request,env={}){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:CORS});
  const u=new URL(request.url),origin=u.origin;
  try{
   if(u.pathname==='/health')return new Response(JSON.stringify({ok:true,service:'BODO Albumaty Worker',version:'3.0'}),{headers:JSON_HEADERS});
   if(u.pathname==='/charts'){
    const country=(u.searchParams.get('country')||'eg').toLowerCase();
    const limit=Number(u.searchParams.get('limit')||100);
    return json(await appleChart(country,limit));
   }
   if(u.pathname==='/similar'){
    const artist=(u.searchParams.get('artist')||'').trim();
    if(!artist)return new Response(JSON.stringify({artists:[]}),{headers:JSON_HEADERS});
    let names=[];
    if(env.LASTFM_API_KEY){
      try{
        const api=`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&api_key=${encodeURIComponent(env.LASTFM_API_KEY)}&format=json&limit=10&autocorrect=1`;
        const response=await cachedFetch(api,{signal:AbortSignal.timeout(9000)},21600);
        if(response.ok){const data=await response.json();names=(data?.similarartists?.artist||[]).map(x=>x.name).filter(Boolean);}
      }catch{}
    }
    if(!names.length)names=SIMILAR[artistKey(artist)]||[];
    if(!names.length){
      const groups=[['Amr Diab','Tamer Hosny','Mohamed Hamaki','Ramy Sabry','Ahmed Saad'],['Sherine','Angham','Assala','Elissa','Ruby'],['Wegz','Marwan Pablo','Afroto','Abyusif','TUL8TE']];
      const flat=groups.flat();names=flat.filter(x=>artistKey(x)!==artistKey(artist)).slice(0,6);
    }
    const unique=[...new Set(names.map(x=>String(x).trim()).filter(Boolean))].filter(x=>artistKey(x)!==artistKey(artist)).slice(0,8);
    return new Response(JSON.stringify({artists:unique}),{headers:JSON_HEADERS});
   }
   if(u.pathname==='/search'){
    const q=(u.searchParams.get('q')||'').trim();if(!q)return json([]);
    if(/^MIX:/i.test(q)){
      const artists=q.slice(4).split(',').map(x=>x.trim()).filter(Boolean).slice(0,1);
      const groups=await Promise.all(artists.map(a=>artistRadio(a,origin)));
      const seen=new Set();return json(groups.flat().filter(t=>{const k=norm(t.title)+'|'+norm(t.artist);if(seen.has(k))return false;seen.add(k);return true;}));
    }
    if(/^RECOMMEND:/i.test(q)){
      const seeds=q.slice(9).split(',').map(x=>x.trim()).filter(Boolean).slice(0,6);
      const names=[...new Set(seeds.flatMap(a=>SIMILAR[artistKey(a)]||[]))].slice(0,1);
      const groups=await Promise.all(names.map(a=>artistRadio(a,origin)));
      const seen=new Set();return json(groups.flat().filter(t=>{const k=norm(t.title)+'|'+norm(t.artist);if(seen.has(k))return false;seen.add(k);return true;}));
    }
    return json(await searchAlbumaty(q,origin));
   }
   if(u.pathname==='/trending'){
    const chart=await appleChart('eg',100);
    const tracks=await mapLimit(chart.slice(0,12),4,x=>exactAlbumatyTrack(x.title,x.artist,origin));
    const seen=new Set();return json(tracks.filter(t=>{if(!t)return false;const k=norm(t.title)+'|'+norm(t.artist);if(seen.has(k))return false;seen.add(k);return true;}));
   }
   if(u.pathname==='/artist'){
    const id=u.searchParams.get('id');if(!/^\d+$/.test(id||''))return json([],400);
    const html=await fetchText(`${BASE}/singer/${id}.html`),ids=idsFrom(html).slice(0,45);
    return json(await mapLimit(ids,7,id=>parseSong(id,origin)));
   }
   if(u.pathname==='/stream'){
    const id=u.searchParams.get('id');if(!/^\d+$/.test(id||''))return new Response('Bad request',{status:400,headers:CORS});
    const html=await fetchText(`${BASE}/song/${id}.html`);
    const raw=meta(html,'og:audio')||(html.match(/<audio\b[^>]*src=["']([^"']+)["']/i)||[])[1];
    if(!raw)return new Response('Not found',{status:404,headers:CORS});
    const audio=new URL(raw,BASE);if(!['https:','http:'].includes(audio.protocol)||audio.hostname!==new URL(BASE).hostname&&!audio.hostname.endsWith('.albumaty.com'))return new Response('Invalid media host',{status:502,headers:CORS});
    const headers={'User-Agent':UA,'Referer':BASE};const range=request.headers.get('Range');if(range)headers.Range=range;
    const upstream=await fetch(audio.href,{headers,signal:AbortSignal.timeout(30000)});
    if(!upstream.ok&&upstream.status!==206)return new Response('Audio unavailable',{status:upstream.status,headers:CORS});
    const h=new Headers(CORS);h.set('Content-Type',upstream.headers.get('Content-Type')||'audio/mpeg');h.set('Accept-Ranges',upstream.headers.get('Accept-Ranges')||'bytes');
    for(const k of ['Content-Length','Content-Range'])if(upstream.headers.has(k))h.set(k,upstream.headers.get(k));
    return new Response(upstream.body,{status:upstream.status,headers:h});
   }
   return new Response('Not found',{status:404,headers:CORS});
  }catch(e){return new Response(JSON.stringify({error:e?.message||'Worker error'}),{status:502,headers:JSON_HEADERS});}
 }
};
