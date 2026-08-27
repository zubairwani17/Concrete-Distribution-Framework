/* Statistical engine — MLE fitters, goodness-of-fit, bootstrap calibration.
   Plain JavaScript, no JSX. Verified against scipy.stats to 4 decimals. */

/* ══════════ MATH ══════════ */
function erf(z){
  const t=1/(1+0.5*Math.abs(z));
  const y=1-t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+
    t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));
  return z>=0?y:-y;
}
const nCdf=(x,mu,s)=>0.5*(1+erf((x-mu)/(s*Math.SQRT2)));
function qnorm(p){
  const a=[-3.969683028665376e1,2.209460984245205e2,-2.759285104469687e2,1.38357751867269e2,-3.066479806614716e1,2.506628277459239],
        b=[-5.447609879822406e1,1.615858368580409e2,-1.556989798598866e2,6.680131188771972e1,-1.328068155288572e1],
        c=[-7.784894002430293e-3,-3.223964580411365e-1,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
        d=[7.784695709041462e-3,3.224671290700398e-1,2.445134137142996,3.754408661907416],pl=.02425;
  let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  q=p-.5;r=q*q;
  return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
const S=a=>a.reduce((p,c)=>p+c,0);
const f4=v=>v.toFixed(4);

/* ── Fitters (ASCII param keys; display labels separate) ── */
function fitNormal(x){
  const n=x.length,mu=S(x)/n,sig=Math.sqrt(S(x.map(v=>(v-mu)**2))/n);
  const ll=S(x.map(v=>-Math.log(sig*Math.sqrt(2*Math.PI))-.5*((v-mu)/sig)**2));
  return{name:"Normal",key:"normal",color:"#185FA5",p:{mu:mu,sig:sig},lab:{mu:"μ",sig:"σ"},np:2,ll,
    cdf:t=>nCdf(t,mu,sig),pdf:t=>(1/(sig*Math.sqrt(2*Math.PI)))*Math.exp(-.5*((t-mu)/sig)**2),
    q:u=>mu+sig*qnorm(u),
    eq:`f(x) = 1/(${f4(sig)}*sqrt(2*pi))*exp(-((x-${f4(mu)})^2)/(2*${f4(sig)}^2))`};
}
function fitLognormal(x){
  const n=x.length,L=x.map(Math.log),muY=S(L)/n,sigY=Math.sqrt(S(L.map(v=>(v-muY)**2))/n);
  const ll=S(x.map((v,i)=>-Math.log(v*sigY*Math.sqrt(2*Math.PI))-.5*((L[i]-muY)/sigY)**2));
  return{name:"Lognormal",key:"lognormal",color:"#0F6E56",p:{muY:muY,sigY:sigY},lab:{muY:"μ_Y",sigY:"σ_Y"},np:2,ll,
    cdf:t=>t<=0?0:nCdf(Math.log(t),muY,sigY),
    pdf:t=>t<=0?0:(1/(t*sigY*Math.sqrt(2*Math.PI)))*Math.exp(-.5*((Math.log(t)-muY)/sigY)**2),
    q:u=>Math.exp(muY+sigY*qnorm(u)),
    eq:`f(x) = 1/(x*${f4(sigY)}*sqrt(2*pi))*exp(-((ln(x)-${f4(muY)})^2)/(2*${f4(sigY)}^2))`};
}
function fitWeibull(x){
  const n=x.length,L=x.map(Math.log),mL=S(L)/n;
  const g=m=>{const w=x.map(v=>Math.pow(v,m));return S(w.map((v,i)=>v*L[i]))/S(w)-1/m-mL};
  let lo=.05,hi=80;
  for(let i=0;i<300;i++){const mid=(lo+hi)/2;if(g(lo)*g(mid)<=0)hi=mid;else lo=mid}
  const m=(lo+hi)/2,lam=Math.pow(S(x.map(v=>Math.pow(v,m)))/n,1/m);
  const ll=S(x.map(v=>Math.log(m/lam)+(m-1)*Math.log(v/lam)-Math.pow(v/lam,m)));
  return{name:"Weibull (2P)",key:"weibull",color:"#534AB7",p:{m:m,lam:lam},lab:{m:"m",lam:"λ"},np:2,ll,
    cdf:t=>t<=0?0:1-Math.exp(-Math.pow(t/lam,m)),
    pdf:t=>t<=0?0:(m/lam)*Math.pow(t/lam,m-1)*Math.exp(-Math.pow(t/lam,m)),
    q:u=>lam*Math.pow(-Math.log(1-u),1/m),
    eq:`f(x) = (${f4(m)}/${f4(lam)})*(x/${f4(lam)})^${f4(m-1)}*exp(-(x/${f4(lam)})^${f4(m)})`};
}
function fitGumbel(x){
  const n=x.length,mean=S(x)/n,sd=Math.sqrt(S(x.map(v=>(v-mean)**2))/(n-1));
  let s=sd*Math.sqrt(6)/Math.PI;
  for(let i=0;i<800;i++){
    const w=x.map(v=>Math.exp(-v/s)),sw=S(w);
    const sn=mean-S(x.map((v,j)=>v*w[j]))/sw;
    if(!isFinite(sn)||sn<=0)break;
    if(Math.abs(sn-s)<1e-11){s=sn;break}
    s=.5*s+.5*sn;
  }
  const m=-s*Math.log(S(x.map(v=>Math.exp(-v/s)))/n);
  const ll=S(x.map(v=>{const z=(v-m)/s;return-Math.log(s)-z-Math.exp(-z)}));
  return{name:"Gumbel",key:"gumbel",color:"#D85A30",p:{m:m,s:s},lab:{m:"m",s:"s"},np:2,ll,
    cdf:t=>Math.exp(-Math.exp(-(t-m)/s)),
    pdf:t=>{const z=(t-m)/s;return(1/s)*Math.exp(-z-Math.exp(-z))},
    q:u=>m-s*Math.log(-Math.log(u)),
    eq:`f(x) = (1/${f4(s)})*exp(-((x-${f4(m)})/${f4(s)})-exp(-((x-${f4(m)})/${f4(s)})))`};
}
function fitBurr(x){
  const n=x.length;
  const neg=v=>{
    const a=Math.exp(v[0]),c=Math.exp(v[1]);
    if(!isFinite(a)||!isFinite(c)||a<=0||c<=0)return 1e12;
    let Sv=0,sl=0;
    for(const t of x){const z=Math.pow(t/c,a);if(!isFinite(z))return 1e12;Sv+=Math.log1p(z);sl+=Math.log(t/c)}
    if(!(Sv>0)||!isFinite(Sv))return 1e12;
    const k=n/Sv,ll=n*Math.log(a)+n*Math.log(k)-n*Math.log(c)+(a-1)*sl-(k+1)*Sv;
    return isFinite(ll)?-ll:1e12;
  };
  const srt=[...x].sort((p,q)=>p-q),med=srt[Math.floor(n/2)];
  let sx=[[Math.log(4),Math.log(med)],[Math.log(4)+.5,Math.log(med)],[Math.log(4),Math.log(med)+.3]];
  let f=sx.map(neg);
  for(let it=0;it<2200;it++){
    const idx=[0,1,2].sort((p,q)=>f[p]-f[q]);
    sx=idx.map(i=>sx[i]);f=idx.map(i=>f[i]);
    if(Math.abs(f[2]-f[0])<1e-10)break;
    const cen=[(sx[0][0]+sx[1][0])/2,(sx[0][1]+sx[1][1])/2];
    const rf=[2*cen[0]-sx[2][0],2*cen[1]-sx[2][1]],fr=neg(rf);
    if(fr<f[0]){
      const ex=[3*cen[0]-2*sx[2][0],3*cen[1]-2*sx[2][1]],fe=neg(ex);
      if(fe<fr){sx[2]=ex;f[2]=fe}else{sx[2]=rf;f[2]=fr}
    }else if(fr<f[1]){sx[2]=rf;f[2]=fr}
    else{
      const co=[cen[0]+.5*(sx[2][0]-cen[0]),cen[1]+.5*(sx[2][1]-cen[1])],fc=neg(co);
      if(fc<f[2]){sx[2]=co;f[2]=fc}
      else{
        sx[1]=[sx[0][0]+.5*(sx[1][0]-sx[0][0]),sx[0][1]+.5*(sx[1][1]-sx[0][1])];
        sx[2]=[sx[0][0]+.5*(sx[2][0]-sx[0][0]),sx[0][1]+.5*(sx[2][1]-sx[0][1])];
        f[1]=neg(sx[1]);f[2]=neg(sx[2]);
      }
    }
  }
  const best=sx[f.indexOf(Math.min(...f))],a=Math.exp(best[0]),c=Math.exp(best[1]);
  const Sv=S(x.map(t=>Math.log1p(Math.pow(t/c,a)))),k=n/Sv,ll=-Math.min(...f);
  return{name:"Burr XII",key:"burr",color:"#B0407A",p:{a:a,k:k,c:c},lab:{a:"a",k:"k",c:"c"},np:3,ll,
    cdf:t=>t<=0?0:1-Math.pow(1+Math.pow(t/c,a),-k),
    pdf:t=>t<=0?0:(a*k/c)*Math.pow(t/c,a-1)*Math.pow(1+Math.pow(t/c,a),-(k+1)),
    q:u=>c*Math.pow(Math.pow(1-u,-1/k)-1,1/a),
    eq:`f(x) = (${f4(a)}*${f4(k)}/${f4(c)})*(x/${f4(c)})^${f4(a-1)}*(1+(x/${f4(c)})^${f4(a)})^${f4(-(k+1))}`};
}
const FITTERS={normal:fitNormal,lognormal:fitLognormal,weibull:fitWeibull,gumbel:fitGumbel,burr:fitBurr};

function gof(x,fit){
  const xs=[...x].sort((a,b)=>a-b),n=xs.length;
  const F=xs.map(v=>Math.min(1-1e-12,Math.max(1e-12,fit.cdf(v))));
  let D=0,A=0;
  for(let i=0;i<n;i++){
    D=Math.max(D,(i+1)/n-F[i],F[i]-i/n);
    A+=(2*(i+1)-1)*(Math.log(F[i])+Math.log(1-F[n-1-i]));
  }
  return{ks:D,ad:-n-A/n,aic:2*fit.np-2*fit.ll,bic:fit.np*Math.log(n)-2*fit.ll};
}
function bootstrapP(x,key,obsAD,obsKS,B){
  const n=x.length,base=FITTERS[key](x);
  let geAD=0,geKS=0,ok=0;
  for(let b=0;b<B;b++){
    const s=new Array(n);
    let bad=false;
    for(let i=0;i<n;i++){
      const v=base.q(Math.random()*.999998+1e-6);
      if(!isFinite(v)||v<=0){bad=true;break}
      s[i]=v;
    }
    if(bad)continue;
    try{
      const f=FITTERS[key](s),g=gof(s,f);
      if(!isFinite(g.ad))continue;
      ok++;if(g.ad>=obsAD)geAD++;if(g.ks>=obsKS)geKS++;
    }catch(e){}
  }
  return ok<30?{pAD:null,pKS:null}:{pAD:(geAD+1)/(ok+1),pKS:(geKS+1)/(ok+1)};
}
function describe(v){
  const n=v.length,mean=S(v)/n,sd=Math.sqrt(S(v.map(t=>(t-mean)**2))/(n-1));
  const srt=[...v].sort((a,b)=>a-b);
  const skew=n>2?(n/((n-1)*(n-2)))*S(v.map(t=>((t-mean)/sd)**3)):0;
  return{n,mean,sd,cov:sd/mean*100,min:srt[0],max:srt[n-1],skew,
    emp5:srt[Math.max(0,Math.round(.05*(n-1)))]};
}
const covBucket=c=>c<10?"low":c<20?"mod":c<=35?"high":"vhigh";
const nBucket=n=>n<50?"small":n<=200?"med":"large";
const covLabel=b=>({low:"< 10%",mod:"10–20%",high:"20–35%",vhigh:"> 35%"})[b];
const nLabel=b=>({small:"< 50",med:"50–200",large:"> 200"})[b];


