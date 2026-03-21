/* ═══════════════════════════════════════════
   T-MIRIM | MODULE: core/utils
   ═══════════════════════════════════════════ */

/* ╔═══════════════════════════════════════════════════════════
   ║ MODULE: core/utils
   ╚═══════════════════════════════════════════════════════════ */
// ── UTILITIES ──────────────────────────────────────────────
function notify(msg, err=false) {
  const n = document.getElementById('notif');
  n.textContent = msg; n.className = 'notif show' + (err?' err':'');
  clearTimeout(n._t); n._t = setTimeout(()=>n.classList.remove('show'), 3000);
}
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmt(val, dec=2) { if(val===null||val===undefined||isNaN(val)) return '—'; return Number(val).toFixed(dec); }

// Returns display name — real or anonymized depending on checkbox
function displayName(realName) {
  const anon = document.getElementById('chk-anonymize')?.checked;
  if (!anon) return realName;
  return STATE.anonMap[realName] || realName;
}

function mean(arr) {
  const v = arr.filter(x => x !== null && !isNaN(x));
  return v.length ? v.reduce((a,b)=>a+b,0)/v.length : NaN;
}
function std(arr) {
  const m = mean(arr);
  const v = arr.filter(x=>!isNaN(x));
  if (v.length < 2) return NaN;
  return Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(v.length-1));
}
function median(arr) {
  const v = arr.filter(x=>!isNaN(x)).sort((a,b)=>a-b);
  if (!v.length) return NaN;
  const m = Math.floor(v.length/2);
  return v.length%2 ? v[m] : (v[m-1]+v[m])/2;
}
function pearsonR(xs, ys) {
  const n = xs.length;
  if (n < 3) return {r: NaN, p: NaN};
  const mx = mean(xs), my = mean(ys);
  let num=0, dx2=0, dy2=0;
  for (let i=0; i<n; i++) {
    num += (xs[i]-mx)*(ys[i]-my);
    dx2 += (xs[i]-mx)**2;
    dy2 += (ys[i]-my)**2;
  }
  const r = num / Math.sqrt(dx2*dy2);
  // t-distribution approx
  const t = r * Math.sqrt((n-2)/(1-r*r));
  const p = 2*(1 - tCDF(Math.abs(t), n-2));
  return {r, p};
}
function tCDF(t, df) {
  // Approximation for two-tailed p
  const x = df/(df+t*t);
  return 1 - 0.5*betaInc(df/2, 0.5, x);
}
function betaInc(a, b, x) {
  // Regularized incomplete beta (simple continued fraction)
  if (x <= 0) return 0; if (x >= 1) return 1;
  let bt = Math.exp(a*Math.log(x)+b*Math.log(1-x)-logBeta(a,b));
  if (x < (a+1)/(a+b+2)) return bt*betaCF(a,b,x)/a;
  return 1-bt*betaCF(b,a,1-x)/b;
}
function betaCF(a,b,x,max=200,eps=3e-7) {
  let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-(qab*x/qap);
  if (Math.abs(d)<1e-30) d=1e-30; d=1/d;
  let h=d;
  for (let m=1;m<=max;m++) {
    let m2=2*m,aa=m*(b-m)*x/((qam+m2)*(a+m2));
    d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;
    c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;
    d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));
    d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;
    c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;
    d=1/d;let del=d*c;h*=del;
    if(Math.abs(del-1)<eps)break;
  }
  return h;
}
function logBeta(a,b) {
  return lgamma(a)+lgamma(b)-lgamma(a+b);
}
function lgamma(x) {
  const c=[76.18009172947146,-86.50532032941677,24.01409824083091,
           -1.231739572450155,.1208650973866179e-2,-.5395239384953e-5];
  let y=x,tmp=x+5.5,ser=1.000000000190015;
  tmp-=(x+.5)*Math.log(tmp);
  for(let j=0;j<6;j++) ser+=c[j]/++y;
  return -tmp+Math.log(2.5066282746310005*ser/x);
}

function linReg(xs, ys) {
  const n=xs.length, mx=mean(xs), my=mean(ys);
  let num=0,den=0;
  for(let i=0;i<n;i++){num+=(xs[i]-mx)*(ys[i]-my);den+=(xs[i]-mx)**2;}
  const slope=den?num/den:0, intercept=my-slope*mx;
  return {slope, intercept};
}

function quantile(arr, q) {
  const s = arr.filter(x=>!isNaN(x)).sort((a,b)=>a-b);
  if (!s.length) return NaN;
  const pos = (s.length-1)*q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi]-s[lo])*(pos-lo);
}

function clipOutliers(arr, pct=0.5) {
  if (pct === 0) return arr;
  const lo = quantile(arr, pct/2/100);
  const hi = quantile(arr, 1-pct/2/100);
  return arr.map(v => Math.min(Math.max(v, lo), hi));
}

function readCSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ' ');
  const headers = lines[0].split(sep).map(h=>h.trim().replace(/"/g,''));
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v=>v.trim().replace(/"/g,''));
    const row = {};
    headers.forEach((h,i)=>{ row[h] = isNaN(vals[i]) ? vals[i] : parseFloat(vals[i]); });
    return row;
  }).filter(r => Object.keys(r).length === headers.length);
}

async function readFileText(file) {
  return new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsText(file,'UTF-8'); });
}
async function readFileBuffer(file) {
  return new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsArrayBuffer(file); });
}


async function readFileText(file) {
  return new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsText(file,'UTF-8'); });
}
async function readFileBuffer(file) {
  return new Promise(res => { const r=new FileReader(); r.onload=e=>res(e.target.result); r.readAsArrayBuffer(file); });
}

function readCSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const sep = lines[0].includes('\t')?'\t':(lines[0].includes(';')?';':' ');
  const headers = lines[0].split(sep).map(h=>h.trim().replace(/"/g,''));
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v=>v.trim().replace(/"/g,''));
    const row = {};
    headers.forEach((h,i)=>{ row[h] = isNaN(vals[i]) ? vals[i] : parseFloat(vals[i]); });
    return row;
  }).filter(r => Object.keys(r).length === headers.length);
}
