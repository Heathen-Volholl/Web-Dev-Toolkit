const $$ = (sel, root=document) => root.querySelector(sel);
const $$$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// -------- PWA Install --------
let deferredPrompt;
const btnInstall = $$('#btnInstall');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnInstall) btnInstall.disabled = false;
});
btnInstall?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  btnInstall.disabled = true;
});

// -------- Tabs --------
$$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$$('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    $$$('.panel').forEach(p => p.classList.remove('active'));
    $$('#panel-' + which).classList.add('active');
  });
});

// -------- Theme --------
const root = document.documentElement;
const themeToggle = $$('#themeToggle');
const savedTheme = localStorage.getItem('wd_theme') || 'dark';
if (savedTheme === 'light') root.classList.add('light');
if (themeToggle) {
  themeToggle.checked = savedTheme !== 'light';
  themeToggle.addEventListener('change', () => {
    const dark = themeToggle.checked;
    root.classList.toggle('light', !dark);
    localStorage.setItem('wd_theme', dark ? 'dark' : 'light');
  });
}

// =================== Colors ===================
const picker = $$('#colorPicker');
const hexInput = $$('#hexInput');
const rgbInput = $$('#rgbInput');
const hslInput = $$('#hslInput');
const swatch = $$('#swatch');
const paletteEl = $$('#palette');

function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }
function hexToRgb(hex){
  const m = (hex||'').trim().replace(/^#/, '');
  if (![3,6].includes(m.length)) return null;
  const s = m.length === 3 ? m.split('').map(c => c + c).join('') : m;
  const n = parseInt(s, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function rgbToHex(r,g,b){
  return '#' + [r,g,b].map(v => clamp(v,0,255).toString(16).padStart(2,'0')).join('');
}
function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l=(max+min)/2;
  if (max === min) { h=s=0; }
  else {
    const d = max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h*=60;
  }
  return { h:Math.round(h), s:Math.round(s*100), l:Math.round(l*100) };
}
function hslToRgb(h,s,l){
  s/=100; l/=100;
  const k = n => (n + h/30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
  return { r:Math.round(255*f(0)), g:Math.round(255*f(8)), b:Math.round(255*f(4)) };
}
function updateFromHex(){
  const rgb = hexToRgb(hexInput.value);
  if (!rgb) return;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  picker && (picker.value = rgbToHex(rgb.r, rgb.g, rgb.b));
  rgbInput && (rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  hslInput && (hslInput.value = `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`);
  swatch && (swatch.style.background = picker.value);
}
function updateFromPicker(){ hexInput.value = picker.value; updateFromHex(); }
function updateFromRgb(){
  const m = rgbInput.value.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if(!m) return;
  const [_, r,g,b] = m.map(Number);
  hexInput.value = rgbToHex(r,g,b); updateFromHex();
}
function updateFromHsl(){
  const m = hslInput.value.match(/(\d+)[,\s]+(\d+)%[,\s]+(\d+)%/);
  if(!m) return;
  const [_, h,s,l] = m.map(Number);
  const rgb = hslToRgb(h,s,l);
  hexInput.value = rgbToHex(rgb.r, rgb.g, rgb.b); updateFromHex();
}
picker && picker.addEventListener('input', updateFromPicker);
hexInput && hexInput.addEventListener('input', updateFromHex);
rgbInput && rgbInput.addEventListener('input', updateFromRgb);
hslInput && hslInput.addEventListener('input', updateFromHsl);
$$('#btnCopyColor')?.addEventListener('click', () => navigator.clipboard.writeText(hexInput.value));
$$('#btnPalette')?.addEventListener('click', () => {
  const base = hexToRgb(hexInput.value);
  if(!base) return;
  const hsl = rgbToHsl(base.r, base.g, base.b);
  const variants = [
    { h: (hsl.h+0)%360, s:hsl.s, l: clamp(hsl.l+20, 0,100) },
    { h: (hsl.h+180)%360, s:hsl.s, l: hsl.l },
    { h: (hsl.h+120)%360, s:hsl.s, l: hsl.l },
    { h: (hsl.h+240)%360, s:hsl.s, l: hsl.l },
    { h: (hsl.h+0)%360, s: clamp(hsl.s-20,0,100), l:hsl.l },
    { h: (hsl.h+0)%360, s: clamp(hsl.s+20,0,100), l:hsl.l },
  ];
  paletteEl.innerHTML='';
  for(const v of variants){
    const rgb = hslToRgb(v.h, v.s, v.l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const el = document.createElement('button');
    el.className='swatch'; el.style.height='60px'; el.style.background=hex;
    el.title = `${hex} | hsl(${v.h} ${v.s}% ${v.l}%)`;
    el.addEventListener('click', ()=>{ hexInput.value = hex; updateFromHex(); });
    paletteEl.appendChild(el);
  }
});

// =================== Minifier ===================
function minifyJS(src){
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  src = src.replace(/(^|[^:\\\\'"])(\/\/).*?$/gm, '$1'); // remove //
  src = src.replace(/\s+/g, ' ');
  src = src.replace(/\s*([{}\[\]\(\);,:<>\+\-\*\/%=&\|\!\?])\s*/g, '$1');
  return src.trim();
}
function minifyCSS(src){
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  src = src.replace(/\s+/g,' ');
  src = src.replace(/\s*([{}:;,>+\~\(\)])\s*/g,'$1');
  src = src.replace(/;}/g,'}');
  return src.trim();
}
function minifyHTML(src){
  src = src.replace(/<!--(?!\[if).*?-->/gs, '');
  src = src.replace(/>\s+</g, '><');
  src = src.replace(/\s{2,}/g, ' ');
  return src.trim();
}
$$('#btnMinify')?.addEventListener('click', ()=>{
  const type = $$('#minifyType').value;
  const input = $$('#minifyIn').value;
  let out = '';
  try{
    if(type==='js') out = minifyJS(input);
    else if(type==='css') out = minifyCSS(input);
    else out = minifyHTML(input);
  }catch(e){ out = 'Error: ' + e.message; }
  $$('#minifyOut').value = out;
});
$$('#btnCopyMin')?.addEventListener('click', ()=> navigator.clipboard.writeText($$('#minifyOut').value));

// =================== Lint / Check ===================
function addIssue(list, msg, ok=false){
  const li = document.createElement('li');
  if(ok) li.classList.add('ok');
  li.textContent = msg;
  list.appendChild(li);
}
// HTML
$$('#btnLintHTML')?.addEventListener('click', ()=>{
  const code = $$('#htmlLint').value;
  const list = $$('#htmlIssues'); list.innerHTML='';
  const parser = new DOMParser();
  const doc = parser.parseFromString(code, 'text/html');
  if(!/^<!doctype html>/i.test(code.trim())) addIssue(list,'Missing <!doctype html>');
  const deprecated = ['font','center','marquee','blink','big','small','u','b','i'];
  deprecated.forEach(tag=>{
    const els = doc.getElementsByTagName(tag);
    if(els.length) addIssue(list,`Deprecated <${tag}> used ${els.length}×`);
  });
  doc.querySelectorAll('img:not([alt])').forEach(()=> addIssue(list,'Image without alt attribute'));
  doc.querySelectorAll('a[target="_blank"]:not([rel*="noopener"]):not([rel*="noreferrer"])').forEach(()=> addIssue(list,'target="_blank" without rel="noopener noreferrer"'));
  const idMap = {};
  doc.querySelectorAll('[id]').forEach(el=>{ idMap[el.id] = (idMap[el.id]||0)+1; });
  Object.entries(idMap).forEach(([id,count])=>{ if(count>1) addIssue(list,`Duplicate id="${id}" (${count}×)`); });
  if(!doc.documentElement.getAttribute('lang')) addIssue(list,'<html> missing lang attribute');
  if(!list.children.length) addIssue(list,'No obvious issues found ✅', true);
});
// JS (ESLint-style lite)
function lintJS(src, rules){
  const issues = [];
  if(rules.noVar && /(^|\W)var\s+/.test(src)) issues.push('no-var: Use let/const instead of var.');
  if(rules.eqeqeq){
    const loose = /(^|[^=])==([^=]|$)/.test(src);
    if(loose) issues.push('eqeqeq: Use ===/!== instead of ==/!= when appropriate.');
  }
  if(rules.noEval && /(^|\W)eval\s*\(/.test(src)) issues.push('no-eval: Avoid eval().');
  if(rules.noConsole && /(^|\W)console\./.test(src)) issues.push('no-console: Remove console.* in production.');
  if(rules.requireSemi){
    const lines = src.split(/\n/);
    const missing = lines.filter(ln => /[\w\)\]]\s*$/.test(ln) && !/[;{}\s]$/.test(ln)).length;
    if(missing>0) issues.push(`require-semi: Possible missing semicolons on ~${missing} lines.`);
  }
  try{ new Function(src); }catch(e){ issues.unshift('Syntax error: ' + e.message); }
  return issues;
}
$$('#btnLintJS')?.addEventListener('click', ()=>{
  const code = $$('#jsLint').value;
  const list = $$('#jsIssues'); list.innerHTML='';
  const rules = {
    noVar: $$('#ruleNoVar').checked,
    eqeqeq: $$('#ruleEqeqeq').checked,
    noEval: $$('#ruleNoEval').checked,
    noConsole: $$('#ruleNoConsole').checked,
    requireSemi: $$('#ruleSemicolons').checked
  };
  const issues = lintJS(code, rules);
  if(issues.length===0) addIssue(list,'No obvious issues found ✅', true);
  else issues.forEach(m => addIssue(list, m));
});
// CSS
$$('#btnLintCSS')?.addEventListener('click', ()=>{
  const code = $$('#cssLint').value;
  const list = $$('#cssIssues'); list.innerHTML='';
  let ok = true;
  const style = document.createElement('style'); document.head.appendChild(style);
  const sheet = style.sheet;
  const blocks = code.split('}').map(b=>b.trim()).filter(Boolean);
  blocks.forEach(b=>{
    const block = b + '}';
    try{
      const i = block.indexOf('{');
      if(i<0) throw new Error('Missing "{"');
      const sel = block.slice(0,i).trim();
      const body = block.slice(i);
      sheet.insertRule(sel+' '+body, sheet.cssRules.length);
    }catch(e){
      ok = false;
      addIssue(list,'Parse error: ' + e.message + ' in block: ' + block.slice(0,80));
    }
  });
  document.head.removeChild(style);
  if($$('#ruleNoImp')?.checked && /!important/.test(code)) addIssue(list,'Avoid !important when possible.');
  // Lookbehind-free regex:
  if($$('#ruleZeroUnit')?.checked && /\b0(px|em|rem|%|vh|vw)\b/.test(code)) addIssue(list,'Use unitless 0 (e.g., 0 instead of 0px).');
  if(ok && list.children.length===0) addIssue(list,'No obvious issues found ✅', true);
});

// =================== Prettify ===================
// JSON
$$('#btnJsonPretty')?.addEventListener('click', ()=>{
  try{
    const obj = JSON.parse($$('#jsonIn').value);
    $$('#jsonOut').value = JSON.stringify(obj, null, 2);
  }catch(e){ $$('#jsonOut').value = 'Error: ' + e.message; }
});
$$('#btnJsonMin')?.addEventListener('click', ()=>{
  try{
    const obj = JSON.parse($$('#jsonIn').value);
    $$('#jsonOut').value = JSON.stringify(obj);
  }catch(e){ $$('#jsonOut').value = 'Error: ' + e.message; }
});
// YAML (basic, JS-only)
function parseYamlScalar(s){
  if(/^['"].*['"]$/.test(s)) return s.slice(1,-1);
  if(/^(true|false)$/i.test(s)) return /^true$/i.test(s);
  if(/^null$/i.test(s)) return null;
  if(/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}
function yamlToJson(yaml){
  const lines = yaml.replace(/\t/g,'  ').split(/\r?\n/);
  const stack = [{indent:-1, value:{}}];
  for(const raw of lines){
    const line = raw.replace(/#.*$/,'').trimEnd();
    if(!line.trim()) continue;
    const indent = (raw.match(/^ */)||[''])[0].length;
    while(stack.length && indent <= stack[stack.length-1].indent) stack.pop();
    let parent = stack[stack.length-1].value;
    if(line.trimStart().startsWith('- ')){
      const content = line.trimStart().slice(2);
      if(!Array.isArray(parent)){
        const keys = Object.keys(parent);
        const lastKey = keys[keys.length-1];
        parent[lastKey] = parent[lastKey] && typeof parent[lastKey]==='object' ? [] : [];
        parent = parent[lastKey];
        stack.push({indent, value: parent});
      }
      const m = content.match(/^([\w-]+):\s*(.*)$/);
      if(m){
        const obj = {}; parent.push(obj);
        const key = m[1]; const rest = m[2];
        obj[key] = rest ? parseYamlScalar(rest) : {};
        if(!rest) stack.push({indent, value: obj[key]});
      }else{
        parent.push(parseYamlScalar(content));
      }
      continue;
    }
    const kv = line.trim().match(/^([\w-]+):\s*(.*)$/);
    if(kv){
      const key = kv[1]; const rest = kv[2];
      if(rest===''){
        parent[key] = {};
        stack.push({indent, value: parent[key]});
      }else{
        parent[key] = parseYamlScalar(rest);
      }
    }
  }
  return stack[0].value;
}
function jsonToYaml(obj, indent=0){
  const pad = '  '.repeat(indent);
  if (Array.isArray(obj)){
    return obj.map(v => pad + '- ' + (typeof v==='object' && v!==null ? '\n' + jsonToYaml(v, indent+1) : scalarToYaml(v))).join('\n');
  } else if (obj && typeof obj === 'object'){
    return Object.keys(obj).map(k => {
      const v = obj[k];
      if (v && typeof v === 'object'){
        return pad + k + ':\n' + jsonToYaml(v, indent+1);
      } else {
        return pad + k + ': ' + scalarToYaml(v);
      }
    }).join('\n');
  } else {
    return pad + scalarToYaml(obj);
  }
}
function scalarToYaml(v){
  if (typeof v === 'string'){
    if (/[:#\-\n]/.test(v)) return JSON.stringify(v);
    return v;
  }
  if (v === null) return 'null';
  return String(v);
}
$$('#btnYamlToJson')?.addEventListener('click', ()=>{
  try{
    const out = yamlToJson($$('#yamlIn').value);
    $$('#yamlOut').value = JSON.stringify(out, null, 2);
  }catch(e){ $$('#yamlOut').value = 'Error: ' + e.message; }
});
$$('#btnJsonToYaml')?.addEventListener('click', ()=>{
  try{
    const obj = JSON.parse($$('#yamlIn').value);
    $$('#yamlOut').value = jsonToYaml(obj);
  }catch(e){ $$('#yamlOut').value = 'Error: ' + e.message + ' (expects JSON in left box)'; }
});
// XML
function formatXml(xml){
  xml = xml.replace(/>\s+</g, '><').trim();
  let formatted = '', pad = 0;
  xml.replace(/(<\/?[^>]+>)/g, (m)=>{
    if(/^<\//.test(m)) pad = Math.max(pad-1,0);
    formatted += '  '.repeat(pad) + m + '\n';
    if(/^<[^!?][^>]*[^\/]>$/.test(m)) pad++;
  });
  return formatted.trim();
}
$$('#btnXmlPretty')?.addEventListener('click', ()=>{
  try{
    const parser = new DOMParser();
    const doc = parser.parseFromString($$('#xmlIn').value, 'text/xml');
    if(doc.getElementsByTagName('parsererror').length){
      $$('#xmlOut').value = 'XML parse error';
      return;
    }
    const xml = new XMLSerializer().serializeToString(doc);
    $$('#xmlOut').value = formatXml(xml);
  }catch(e){ $$('#xmlOut').value = 'Error: ' + e.message; }
});
$$('#btnXmlMin')?.addEventListener('click', ()=>{
  const xml = $$('#xmlIn').value.replace(/>\s+</g,'><').trim();
  $$('#xmlOut').value = xml;
});

// =================== Responsive Tester ===================
function setFrameSize(size){
  const [w,h] = size.split('x').map(Number);
  const frame = $$('#previewFrame');
  frame.style.width = w+'px';
  frame.style.height = h+'px';
}
$$('#deviceSel')?.addEventListener('change', (e)=> setFrameSize(e.target.value));
setFrameSize($$('#deviceSel')?.value || '375x667');
$$('#btnLoadURL')?.addEventListener('click', ()=>{
  const url = $$('#previewUrl').value.trim();
  if(!url) return;
  $$('#previewFrame').src = url; // may be blocked by X-Frame-Options
});
$$('#btnLoadHTML')?.addEventListener('click', ()=>{
  const html = $$('#previewHtml').value;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  $$('#previewFrame').src = url;
});

// =================== Contrast Checker ===================
function parseColor(s){
  if(!s) return null;
  if(s.startsWith('#')) return hexToRgb(s);
  const m = s.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if(m) return {r:+m[1], g:+m[2], b:+m[3]};
  return hexToRgb(s);
}
function relLuminance({r,g,b}){
  const srgb = [r,g,b].map(v=>v/255).map(u=> u<=0.03928 ? u/12.92 : Math.pow((u+0.055)/1.055, 2.4));
  return 0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2];
}
function contrastRatio(fg,bg){
  const L1 = relLuminance(fg), L2 = relLuminance(bg);
  const [a,b] = L1 > L2 ? [L1,L2] : [L2,L1];
  return (a+0.05)/(b+0.05);
}
function updateContrast(){
  const fg = parseColor($$('#fgText').value);
  const bg = parseColor($$('#bgText').value);
  if(!fg||!bg) return;
  const ratio = contrastRatio(fg,bg);
  $$('#ratioVal').textContent = ratio.toFixed(2)+':1';
  const passAA = ratio>=4.5, passAAA = ratio>=7;
  const passLargeAA = ratio>=3, passLargeAAA = ratio>=4.5;
  $$('#scoreNormal').textContent = (passAA?'AA ✅':'AA ❌')+' | '+(passAAA?'AAA ✅':'AAA ❌');
  $$('#scoreLarge').textContent = (passLargeAA?'AA ✅':'AA ❌')+' | '+(passLargeAAA?'AAA ✅':'AAA ❌');
  const prev = $$('#contrastPreview');
  prev.style.color = rgbToHex(fg.r,fg.g,fg.b);
  prev.style.background = rgbToHex(bg.r,bg.g,bg.b);
}
['fgColor','bgColor'].forEach(id=> $$('#'+id)?.addEventListener('input', (e)=>{
  const hex = e.target.value;
  if(id==='fgColor'){ $$('#fgText').value = hex; } else { $$('#bgText').value = hex; }
  updateContrast();
}));
['fgText','bgText'].forEach(id=> $$('#'+id)?.addEventListener('input', updateContrast));
$$('#btnSwap')?.addEventListener('click', ()=>{
  const f = $$('#fgText').value; const b = $$('#bgText').value;
  $$('#fgText').value=b; $$('#bgText').value=f;
  $$('#fgColor').value=b; $$('#bgColor').value=f;
  updateContrast();
});
function adjustTowardsContrast(fg,bg,target){
  const hsl = rgbToHsl(fg.r,fg.g,fg.b);
  for(let step=0; step<200; step++){
    const delta = step%2===0 ? step : -step;
    const nl = clamp(hsl.l + delta, 0, 100);
    const nrgb = hslToRgb(hsl.h,hsl.s,nl);
    if(contrastRatio(nrgb,bg)>=target) return nrgb;
  }
  return fg;
}
$$('#btnSuggestAA')?.addEventListener('click', ()=>{
  const fg = parseColor($$('#fgText').value), bg = parseColor($$('#bgText').value);
  const suggested = adjustTowardsContrast(fg,bg,4.5);
  $$('#fgText').value = rgbToHex(suggested.r,suggested.g,suggested.b);
  $$('#fgColor').value = $$('#fgText').value; updateContrast();
});
$$('#btnSuggestAAA')?.addEventListener('click', ()=>{
  const fg = parseColor($$('#fgText').value), bg = parseColor($$('#bgText').value);
  const suggested = adjustTowardsContrast(fg,bg,7);
  $$('#fgText').value = rgbToHex(suggested.r,suggested.g,suggested.b);
  $$('#fgColor').value = $$('#fgText').value; updateContrast();
});
updateContrast();

// =================== Open Graph Preview ===================
$$('#btnRenderOG')?.addEventListener('click', ()=>{
  const card = $$('#ogCard');
  const title = $$('#ogTitle').value || 'Example Title';
  const desc = $$('#ogDesc').value || 'Example description text for preview.';
  const img = $$('#ogImage').value;
  const site = $$('#ogSite').value || 'Site Name';
  const url = $$('#ogUrl').value || 'https://example.com/page';
  const imgDiv = card.querySelector('.og-img');
  imgDiv.innerHTML = img ? `<img src="${img}" alt="">` : '<div style="height:100%;display:grid;place-items:center;color:#888">No image</div>';
  card.querySelector('.og-site').textContent = site;
  card.querySelector('.og-title').textContent = title;
  card.querySelector('.og-desc').textContent = desc;
  card.querySelector('.og-url').textContent = url;
});

// =================== Sprite Sheet Maker ===================
const drop = $$('#dropZone');
const filePicker = $$('#filePicker');
let spriteImages = [];
drop?.addEventListener('click', ()=> filePicker.click());
drop?.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('drag'); });
drop?.addEventListener('dragleave', ()=> drop.classList.remove('drag'));
drop?.addEventListener('drop', e=>{
  e.preventDefault(); drop.classList.remove('drag');
  const files = Array.from(e.dataTransfer.files || []);
  loadSpriteFiles(files);
});
filePicker?.addEventListener('change', e=> loadSpriteFiles(Array.from(e.target.files || [])));
function loadSpriteFiles(files){
  spriteImages = [];
  const promises = files.filter(f=>/^image\//.test(f.type)).map(f => new Promise(res=>{
    const img = new Image();
    img.onload = ()=> res({name: f.name.replace(/\.[^.]+$/,''), img, w: img.width, h: img.height});
    img.src = URL.createObjectURL(f);
  }));
  Promise.all(promises).then(list => { spriteImages = list; });
}
$$('#btnBuildSprites')?.addEventListener('click', ()=>{
  if(!spriteImages.length) return;
  const padding = parseInt($$('#spritePadding').value,10)||0;
  const cellW = Math.max(...spriteImages.map(s=>s.w)) + padding*2;
  const cellH = Math.max(...spriteImages.map(s=>s.h)) + padding*2;
  const cols = Math.ceil(Math.sqrt(spriteImages.length));
  const rows = Math.ceil(spriteImages.length / cols);
  const W = cols * cellW, H = rows * cellH;
  const canvas = $$('#spriteCanvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,W,H);
  const prefix = ($$('#spritePrefix').value || 'icon-');
  const css = [];
  const map = {};
  spriteImages.forEach((s, i)=>{
    const x = (i % cols) * cellW + padding;
    const y = Math.floor(i / cols) * cellH + padding;
    ctx.drawImage(s.img, x, y);
    const cls = prefix + s.name.replace(/[^a-z0-9_-]+/gi,'-');
    css.push(`.${cls}{background-image:url('sprites.png');background-repeat:no-repeat;background-position:-${x}px -${y}px;width:${s.w}px;height:${s.h}px}`);
    map[cls] = {x, y, w:s.w, h:s.h};
  });
  $$('#btnDownloadSprite').href = canvas.toDataURL('image/png');
  const cssBlob = new Blob([css.join('\n')], {type:'text/css'});
  $$('#btnDownloadCSS').href = URL.createObjectURL(cssBlob);
  const jsonBlob = new Blob([JSON.stringify(map,null,2)], {type:'application/json'});
  $$('#btnDownloadJSON').href = URL.createObjectURL(jsonBlob);
  $$('#spriteCSS').textContent = css.join('\n');
});

// =================== License Header Injector ===================
const commentStyles = {
  js: { open: '/*', close: '*/' },
  css: { open: '/*', close: '*/' },
  html: { open: '<!--', close: '-->' },
  py: { open: '"""', close: '"""' },
  c: { open: '/*', close: '*/' },
  cpp: { open: '/*', close: '*/' },
  cs: { open: '/*', close: '*/' },
  java: { open: '/*', close: '*/' }
};
function makeHeader(text, lang){
  const {open, close} = commentStyles[lang] || commentStyles.js;
  const lines = (text||'').split(/\r?\n/).map(l => ' ' + l);
  return `${open}\n${lines.join('\n')}\n${close}\n`;
}
$$('#btnInjectTop')?.addEventListener('click', ()=>{
  const lang = $$('#licenseLang').value;
  const header = makeHeader($$('#licenseText').value, lang);
  $$('#licenseCodeOut').value = header + ($$('#licenseCodeIn').value || '');
});
$$('#btnInjectBlock')?.addEventListener('click', ()=>{
  const lang = $$('#licenseLang').value;
  const header = makeHeader($$('#licenseText').value, lang);
  $$('#licenseCodeOut').value = ($$('#licenseCodeIn').value || '') + '\n' + header;
});

// =================== Export/Import & Autosave (File System Access) ===================
function workspaceState(){
  return {
    theme: localStorage.getItem('wd_theme') || 'dark',
    colors: { hex: $$('#hexInput')?.value, rgb: $$('#rgbInput')?.value, hsl: $$('#hslInput')?.value },
    minify: { type: $$('#minifyType')?.value, in: $$('#minifyIn')?.value, out: $$('#minifyOut')?.value }
  };
}
$$('#btnExport')?.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(workspaceState(), null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'webdev-toolbox-workspace.json'; a.click(); URL.revokeObjectURL(a.href);
});
$$('#btnImport')?.addEventListener('click', ()=> $$('#importFile').click());
$$('#importFile')?.addEventListener('change', async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(data.theme){ localStorage.setItem('wd_theme', data.theme); root.classList.toggle('light', data.theme==='light'); themeToggle && (themeToggle.checked = data.theme!=='light'); }
    if(data.colors){ $$('#hexInput') && ($$('#hexInput').value = data.colors.hex || '#4f46e5'); $$('#rgbInput') && ($$('#rgbInput').value = data.colors.rgb || ''); $$('#hslInput') && ($$('#hslInput').value = data.colors.hsl || ''); updateFromHex(); }
    if(data.minify){ $$('#minifyType') && ($$('#minifyType').value = data.minify.type || 'js'); $$('#minifyIn') && ($$('#minifyIn').value = data.minify.in || ''); $$('#minifyOut') && ($$('#minifyOut').value = data.minify.out || ''); }
  }catch(e){ alert('Import failed: ' + e.message); }
});

let autosaveHandle = null;
async function chooseAutosaveFile(){
  if(!('showSaveFilePicker' in window)){ alert('File System Access API not supported in this browser.'); return; }
  autosaveHandle = await window.showSaveFilePicker({
    suggestedName: 'webdev-toolbox-workspace.json',
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
  });
  await saveHandle(autosaveHandle);
}
async function saveHandle(handle){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wd-toolbox-db', 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore('fs', {keyPath:'k'}); };
    req.onsuccess = ()=>{
      const tx = req.result.transaction('fs','readwrite');
      tx.objectStore('fs').put({k:'autosave', handle});
      tx.oncomplete = ()=> resolve();
      tx.onerror = e => reject(e);
    };
    req.onerror = e => reject(e);
  });
}
async function loadHandle(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('wd-toolbox-db', 1);
    req.onupgradeneeded = ()=>{ req.result.createObjectStore('fs', {keyPath:'k'}); };
    req.onsuccess = ()=>{
      const tx = req.result.transaction('fs','readonly');
      const g = tx.objectStore('fs').get('autosave');
      g.onsuccess = ()=> resolve(g.result?.handle || null);
      g.onerror = e => reject(e);
    };
    req.onerror = e => reject(e);
  });
}
async function doAutosave(){
  if(!autosaveHandle) autosaveHandle = await loadHandle();
  if(!autosaveHandle) return;
  const perm = await autosaveHandle.queryPermission({mode:'readwrite'});
  if(perm !== 'granted'){
    const req = await autosaveHandle.requestPermission({mode:'readwrite'});
    if(req !== 'granted'){ console.warn('Autosave permission denied'); return; }
  }
  const writable = await autosaveHandle.createWritable();
  await writable.write(new Blob([JSON.stringify(workspaceState(), null, 2)], {type:'application/json'}));
  await writable.close();
}
$$('#btnChooseAutosave')?.addEventListener('click', chooseAutosaveFile);
$$('#autosaveToggle')?.addEventListener('change', (e)=>{
  if(e.target.checked){
    document.addEventListener('input', doAutosave);
    doAutosave();
  }else{
    document.removeEventListener('input', doAutosave);
  }
});

// ---- Service Worker ----
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}
