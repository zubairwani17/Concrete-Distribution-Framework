import { useState, useRef } from "react";

/* ─── Data ─── */
const QS = [
  { id:"src", ph:0, label:"Data source", q:"Where does your strength data originate?",
    opts:[
      {v:"lab",l:"Laboratory specimens"},
      {v:"field",l:"Field-cast / site-cured"},
      {v:"core",l:"In-situ cores / NDT"},
      {v:"mixed",l:"Mixed / multi-source"},
    ]},
  { id:"mat", ph:0, label:"Concrete type", q:"What type of concrete are you modelling?",
    opts:[
      {v:"normal",l:"Normal-strength"},
      {v:"high",l:"High-strength / UHPC"},
      {v:"recycled",l:"Recycled aggregate"},
      {v:"alt",l:"Alternative"},
    ]},
  { id:"cov", ph:1, label:"CoV range", q:"What is the observed coefficient of variation?",
    opts:[
      {v:"low",l:"< 10%"},
      {v:"mod",l:"10 – 20%"},
      {v:"high",l:"20 – 35%"},
      {v:"vhigh",l:"> 35%"},
    ]},
  { id:"n", ph:1, label:"Sample size", q:"How many specimens in your dataset?",
    opts:[
      {v:"small",l:"< 50"},
      {v:"med",l:"50 – 200"},
      {v:"large",l:"> 200"},
    ]},
  { id:"obj", ph:2, label:"Application", q:"What is the modelling objective?",
    opts:[
      {v:"design",l:"Code-based design / QC"},
      {v:"reliability",l:"Reliability / fragility"},
      {v:"seismic",l:"Seismic / collapse"},
      {v:"durability",l:"Durability / service-life"},
    ]},
  { id:"tail", ph:2, label:"Tail criticality", q:"Which tail region is critical for your analysis?",
    opts:[
      {v:"none",l:"Neither tail critical"},
      {v:"lower",l:"Lower tail (failure)"},
      {v:"upper",l:"Upper tail (extremes)"},
      {v:"both",l:"Both tails"},
    ]},
];

const PHASES = [
  { title:"Context", accent:"#185FA5" },
  { title:"Variability", accent:"#0F6E56" },
  { title:"Objective", accent:"#854F0B" },
];

/* ─── Distribution math ─── */
function normalPdf(x,mu,sig){return(1/(sig*Math.sqrt(2*Math.PI)))*Math.exp(-0.5*((x-mu)/sig)**2)}
function lognormalPdf(x,muY,sigY){if(x<=0)return 0;return(1/(x*sigY*Math.sqrt(2*Math.PI)))*Math.exp(-0.5*((Math.log(x)-muY)/sigY)**2)}
function weibullPdf(x,m,lam){if(x<=0)return 0;return(m/lam)*Math.pow(x/lam,m-1)*Math.exp(-Math.pow(x/lam,m))}
function burrPdf(x,a,k,c){if(x<=0)return 0;return(a*k/c)*Math.pow(x/c,a-1)*Math.pow(1+Math.pow(x/c,a),-(k+1))}
function gumbelPdf(x,mu,s){const z=(x-mu)/s;return(1/s)*Math.exp(-(z+Math.exp(-z)))}

function getCurves(key){
  const N=300;
  const r=(a,b)=>Array.from({length:N+1},(_,i)=>a+(i/N)*(b-a));
  if(key==="normal"){const xs=r(15,55);return[{label:"Normal",color:"#185FA5",pts:xs.map(x=>({x,y:normalPdf(x,35,4)}))}]}
  if(key==="lognormal"){const xs=r(5,70);return[{label:"Lognormal",color:"#0F6E56",pts:xs.map(x=>({x,y:lognormalPdf(x,3.5,0.3)}))}]}
  if(key==="weibull"){const xs=r(0.5,55);return[{label:"Weibull (2P)",color:"#534AB7",pts:xs.map(x=>({x,y:weibullPdf(x,6,36)}))}]}
  if(key==="burr"){const xs=r(0.5,70);return[{label:"Burr XII",color:"#D85A30",pts:xs.map(x=>({x,y:burrPdf(x,4.5,2,32)}))}]}
  if(key==="ln_gumbel"){const xs=r(5,75);return[
    {label:"Lognormal",color:"#0F6E56",pts:xs.map(x=>({x,y:lognormalPdf(x,3.5,0.25)}))},
    {label:"Gumbel",color:"#D85A30",pts:xs.map(x=>({x,y:gumbelPdf(x,38,7)}))}]}
  if(key==="weibull_burr"){const xs=r(0.5,65);return[
    {label:"Weibull",color:"#534AB7",pts:xs.map(x=>({x,y:weibullPdf(x,5,34)}))},
    {label:"Burr XII",color:"#D85A30",pts:xs.map(x=>({x,y:burrPdf(x,4,2,30)}))}]}
  return[];
}

/* ─── Recommendation engine ─── */
function recommend(s){
  const lt=s.tail==="lower"||s.tail==="both";
  const ut=s.tail==="upper"||s.tail==="both";
  const rel=["reliability","seismic","durability"].includes(s.obj);
  const lo=s.cov==="low";
  const hi=s.cov==="high"||s.cov==="vhigh";

  let dist,ck,reason,tags=[],alts=[],notes=[];

  if(lt&&hi){
    dist="Burr Type XII";ck="burr";
    reason="Heavy-tailed distribution validated for in-structure concrete with high dispersion. Captures left-tail probability more accurately than Normal or Lognormal — critical when failure probability governs design (He et al., 2024).";
    tags=[{t:"Lower-tail sensitive",c:"g"},{t:"Heavy-tail capable",c:"g"}];
    if(ut){tags.push({t:"Upper tail via Gumbel/Fréchet",c:"b"});notes.push("For upper-tail extreme events, supplement with Gumbel or Fréchet extreme value distribution.")}
    alts=[{n:"3P Weibull",d:"If weakest-link fracture mechanics is justified and threshold strength γ exists."},{n:"Lognormal",d:"Only if GoF tests confirm and CoV < ~20%."}];
  } else if(lt&&!lo){
    dist="2-parameter Weibull";ck="weibull";
    reason="Grounded in weakest-link fracture theory for quasi-brittle materials. Superior lower-tail fit for core specimens and moderate-to-high variability (Chen et al., 2013; Vu et al., 2022).";
    tags=[{t:"Fracture-consistent",c:"g"},{t:"Lower-tail sensitive",c:"g"}];
    if(ut){tags.push({t:"Upper tail needs separate model",c:"a"});notes.push("Weibull is bounded on the right — for upper-tail extremes, use Gumbel or Fréchet separately.")}
    alts=[{n:"Burr XII",d:"If extreme skewness beyond what Weibull captures."},{n:"3P Weibull",d:"If QC guarantees a minimum threshold strength."}];
  } else if(ut&&!lt){
    dist="Lognormal + Gumbel (dual model)";ck="ln_gumbel";
    reason=s.obj==="durability"
      ?"Lognormal for bulk strength; Gumbel for extreme deterioration events — max corrosion pit depth, peak chloride penetration. Gumbel's unbounded right tail captures worst-case service-life scenarios (Li et al., 2023)."
      :"Lognormal captures bulk distribution; Gumbel models upper-tail extreme values — peak structural response, extreme load effects, maximum deterioration.";
    tags=[{t:"Upper-tail via EVD",c:"g"},{t:"Dual-model",c:"b"}];
    alts=[{n:"Fréchet",d:"Heavier right tail than Gumbel — for rare extreme events with high consequence."}];
  } else if(s.tail==="both"&&!hi){
    dist="Weibull + Burr XII (compare)";ck="weibull_burr";
    reason="Combined strategy: Weibull captures lower-tail fracture-driven behaviour; Burr XII provides flexible heavy-tail modelling for both extremes. Compare fits and select based on GoF in each tail region.";
    tags=[{t:"Both tails covered",c:"g"},{t:"Compare via GoF",c:"b"}];
    alts=[{n:"Lognormal + Gumbel",d:"If upper tail is from extreme environmental actions rather than material variability."}];
  } else if(rel&&!lo){
    dist="Lognormal";ck="lognormal";
    reason="Enforces non-negativity and accommodates right-skewed behavior in field and core data (Wiśniewski et al., 2012; Nguyen et al., 2022). Standard for reliability-based assessment.";
    tags=[{t:"Non-negative",c:"g"},{t:"Right-skew capable",c:"g"}];
    if(hi) tags.push({t:"Verify lower tail",c:"a"});
    alts=[{n:"Weibull",d:"If GoF shows lognormal underestimates lower tail."},{n:"Burr XII",d:"For CoV > 35% where lognormal tail insufficient."}];
  } else if(lo&&s.tail==="none"){
    dist="Normal (Gaussian)";ck="normal";
    reason="For well-controlled data with CoV < 10% and near-symmetric histograms, Normal and Lognormal are indistinguishable (Pacheco et al., 2019). Simpler and FORM/SORM compatible.";
    tags=[{t:"Simple",c:"b"},{t:"Code-compatible",c:"b"}];
    if(s.src!=="lab") tags.push({t:"Verify symmetry",c:"a"});
    alts=[{n:"Lognormal",d:"Preferred if any skewness detected."}];
    notes.push("Normal assigns nonzero probability to negative strengths — negligible at low CoV.");
  } else if(s.obj==="design"&&!hi){
    dist="Normal (Gaussian)";ck="normal";
    reason="Design codes (ACI 214R, IS 456, Eurocode, GB 50010) assume normality for characteristic strength. Appropriate for routine QC.";
    tags=[{t:"Code-aligned",c:"b"},{t:"Simple",c:"b"}];
    alts=[{n:"Lognormal",d:"If histogram shows positive skew."}];
    notes.push("Verify normality with χ² or K-S when n > 50.");
  } else if(s.obj==="durability"){
    dist="Lognormal + Gumbel (dual model)";ck="ln_gumbel";
    reason="Lognormal for bulk variability; Gumbel for extreme deterioration. Captures worst-case service-life scenarios.";
    tags=[{t:"Dual-model",c:"b"},{t:"EVD capable",c:"g"}];
    alts=[{n:"Fréchet",d:"For heavy right-tail phenomena."}];
  } else {
    dist="Lognormal";ck="lognormal";
    reason="Default general-purpose choice. Physically motivated (multiplicative process), non-negative, validated across concrete types.";
    tags=[{t:"General purpose",c:"b"},{t:"Non-negative",c:"g"}];
    alts=[{n:"Weibull",d:"If fracture mechanics governs."},{n:"Normal",d:"If CoV < 10% and symmetry confirmed."}];
  }

  if(s.n==="small") notes.push("Sample size < 50: parameters may be unstable. Consider Bayesian updating or bootstrap CI.");
  if(s.src==="mixed") notes.push("Mixed-source data: apply cluster analysis before fitting (Croce et al., 2018).");
  if((s.src==="core"||s.src==="mixed")&&!hi) notes.push("In-situ data often shows higher variability than reported. Verify NDT smoothing.");
  if(s.mat==="alt") notes.push("Alternative concretes: validate with multiple GoF tests (K-S, A-D, χ²).");
  if(s.mat==="recycled") notes.push("RAC variability peaks at ~50% replacement, then decreases at full replacement.");

  return{dist,ck,reason,tags,alts,notes};
}

/* ─── Chart ─── */
function PdfChart({curveKey,tailMode}){
  const curves=getCurves(curveKey);
  if(!curves.length) return null;
  const all=curves.flatMap(c=>c.pts);
  const xMn=Math.min(...all.map(p=>p.x)), xMx=Math.max(...all.map(p=>p.x));
  const yMx=Math.max(...all.map(p=>p.y))*1.12;
  const W=520,H=190,pl=34,pr=14,pt=20,pb=30;
  const cw=W-pl-pr,ch=H-pt-pb;
  const sx=p=>pl+((p.x-xMn)/(xMx-xMn))*cw;
  const sy=p=>pt+ch-(p.y/yMx)*ch;
  const ln=pts=>pts.map((p,i)=>`${i?'L':'M'}${sx(p).toFixed(1)},${sy(p).toFixed(1)}`).join('');
  const ar=pts=>{const f=pts[0],la=pts[pts.length-1];return ln(pts)+`L${sx(la).toFixed(1)},${pt+ch}L${sx(f).toFixed(1)},${pt+ch}Z`};

  const showL=tailMode==="lower"||tailMode==="both";
  const showU=tailMode==="upper"||tailMode==="both";

  const tails=curves.map(c=>{
    const s=[...c.pts].sort((a,b)=>a.x-b.x);
    let tot=0;for(let i=1;i<s.length;i++) tot+=(s[i].x-s[i-1].x)*(s[i].y+s[i-1].y)/2;
    let cum=0,lX=s[0].x,uX=s[s.length-1].x;
    for(let i=1;i<s.length;i++){
      cum+=(s[i].x-s[i-1].x)*(s[i].y+s[i-1].y)/2;
      if(cum/tot>=0.10&&lX===s[0].x) lX=s[i].x;
      if(cum/tot>=0.90&&uX===s[s.length-1].x) uX=s[i].x;
    }
    return{lPts:s.filter(p=>p.x<=lX),uPts:s.filter(p=>p.x>=uX),lX,uX};
  });

  return(
    <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",padding:"10px 6px 4px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,padding:"0 6px"}}>
        <span style={{fontSize:10,color:"var(--color-text-tertiary)"}}>PDF shape + tail regions</span>
        <div style={{display:"flex",gap:10}}>
          {curves.map((c,i)=>(
            <span key={i} style={{fontSize:10,fontWeight:500,color:c.color,display:"flex",alignItems:"center",gap:3}}>
              <span style={{width:10,height:2,background:c.color,borderRadius:1,display:"inline-block"}}/>
              {c.label}
            </span>
          ))}
        </div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
        {[0,1,2,3].map(i=><line key={i} x1={pl} y1={pt+(i/3)*ch} x2={W-pr} y2={pt+(i/3)*ch} stroke="var(--color-border-tertiary)" strokeWidth="0.5"/>)}

        {curves.map((c,ci)=>(
          <g key={`t${ci}`}>
            {showL&&tails[ci].lPts.length>2&&<path d={ar(tails[ci].lPts)} fill={c.color} fillOpacity="0.22"/>}
            {showU&&tails[ci].uPts.length>2&&<path d={ar(tails[ci].uPts)} fill={c.color} fillOpacity="0.22"/>}
          </g>
        ))}
        {curves.map((c,ci)=>(
          <g key={ci}>
            <path d={ar(c.pts)} fill={c.color} fillOpacity="0.04"/>
            <path d={ln(c.pts)} fill="none" stroke={c.color} strokeWidth="1.8" strokeLinejoin="round"/>
          </g>
        ))}
        {curves.map((c,ci)=>(
          <g key={`dl${ci}`}>
            {showL&&<line x1={sx({x:tails[ci].lX})} y1={pt} x2={sx({x:tails[ci].lX})} y2={pt+ch} stroke={c.color} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.55"/>}
            {showU&&<line x1={sx({x:tails[ci].uX})} y1={pt} x2={sx({x:tails[ci].uX})} y2={pt+ch} stroke={c.color} strokeWidth="0.8" strokeDasharray="3 3" opacity="0.55"/>}
          </g>
        ))}
        {showL&&<text x={sx({x:tails[0].lX})-3} y={pt+9} textAnchor="end" fontSize="8" fill={curves[0].color} fontFamily="var(--font-sans)" fontWeight="500" opacity="0.75">Lower tail (P_f)</text>}
        {showU&&<text x={sx({x:tails[curves.length-1].uX})+3} y={pt+9} textAnchor="start" fontSize="8" fill={curves[curves.length-1].color} fontFamily="var(--font-sans)" fontWeight="500" opacity="0.75">Upper tail</text>}

        <line x1={pl} y1={pt+ch} x2={W-pr} y2={pt+ch} stroke="var(--color-border-secondary)" strokeWidth="0.5"/>
        {Array.from({length:7},(_,i)=>{
          const v=xMn+(i/6)*(xMx-xMn);
          return <text key={i} x={pl+(i/6)*cw} y={H-10} textAnchor="middle" fontSize="9" fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">{Math.round(v)}</text>;
        })}
        <text x={W/2} y={H-1} textAnchor="middle" fontSize="9" fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)">f_c (MPa)</text>
        <text x={8} y={pt+ch/2} textAnchor="middle" fontSize="9" fill="var(--color-text-tertiary)" fontFamily="var(--font-sans)" transform={`rotate(-90,8,${pt+ch/2})`}>f(x)</text>
      </svg>
    </div>
  );
}

/* ─── Tag colors ─── */
const TC={g:{bg:"#E1F5EE",c:"#085041"},b:{bg:"#E6F1FB",c:"#0C447C"},a:{bg:"#FAEEDA",c:"#633806"}};

/* ─── Section card ─── */
function Sec({label,children}){
  return(
    <div style={{background:"var(--color-background-primary)",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-tertiary)",padding:"10px 12px",marginBottom:10}}>
      <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:5,textTransform:"uppercase",letterSpacing:0.3,fontWeight:500}}>{label}</div>
      {children}
    </div>
  );
}

/* ─── Main ─── */
export default function App(){
  const[ans,setAns]=useState({});
  const refs=useRef({});
  const resRef=useRef(null);
  const done=Object.keys(ans).length===6;
  const rec=done?recommend(ans):null;
  const grouped=[0,1,2].map(ph=>QS.filter(q=>q.ph===ph));

  const pick=(id,v)=>{
    const next={...ans,[id]:v};setAns(next);
    setTimeout(()=>{
      const nxt=QS.find(q=>!next[q.id]);
      if(nxt&&refs.current[nxt.id]) refs.current[nxt.id].scrollIntoView({behavior:"smooth",block:"center"});
      else if(Object.keys(next).length>=6&&resRef.current) setTimeout(()=>resRef.current.scrollIntoView({behavior:"smooth",block:"start"}),120);
    },80);
  };

  const reset=()=>{setAns({});window.scrollTo({top:0,behavior:"smooth"})};

  const FORMULAS={
    normal:"f(x) = [1/(σ√(2π))] exp[−(x − μ)² / (2σ²)]",
    lognormal:"f(x) = [1/(xσ_Y√(2π))] exp[−(ln x − μ_Y)² / (2σ_Y²)]",
    weibull:"f(x) = (m/λ)(x/λ)^(m−1) exp[−(x/λ)^m]",
    burr:"f(x) = (ak/c)(x/c)^(a−1) [1+(x/c)^a]^(−(k+1))",
    ln_gumbel:"Lognormal: f(x) = [1/(xσ√(2π))] exp[−(ln x−μ)²/(2σ²)]\nGumbel: f(x) = (1/s) exp[−z − exp(−z)], z = (x−m)/s",
    weibull_burr:"Weibull: f(x) = (m/λ)(x/λ)^(m−1) exp[−(x/λ)^m]\nBurr: f(x) = (ak/c)(x/c)^(a−1)[1+(x/c)^a]^(−(k+1))",
  };

  const TAIL_TEXT={
    lower:"The shaded lower-tail region governs failure probability P_f. Underestimating this region leads to unconservative reliability predictions. Weibull and Burr distributions capture this region more accurately than Normal or Lognormal.",
    upper:"The shaded upper-tail region captures extreme events — peak loading, maximum deterioration, or rare high-strength realizations. Gumbel and Fréchet extreme value distributions are designed for this behaviour.",
    both:"Both tails are critical. The lower tail governs structural failure probability; the upper tail governs extreme event likelihood. A dual-model or flexible heavy-tailed distribution is needed to avoid bias in either direction.",
    none:"Neither tail dominates — the central tendency and overall dispersion are the primary concerns. Standard distributions (Normal, Lognormal) are adequate.",
  };

  return(
    <div style={{maxWidth:560,margin:"0 auto",padding:"0.75rem 0.5rem 3rem",fontFamily:"var(--font-sans)"}}>
      {/* Header */}
      <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
        <div style={{fontSize:17,fontWeight:500,lineHeight:1.35,marginBottom:3}}>Probability distribution selection framework</div>
        <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>Concrete compressive strength — uncertainty-aware modelling</div>
      </div>

      {/* Progress bar */}
      <div style={{display:"flex",gap:3,marginBottom:"1.25rem"}}>
        {QS.map(q=><div key={q.id} style={{flex:1,height:3,borderRadius:2,background:ans[q.id]?PHASES[q.ph].accent:"var(--color-border-tertiary)",transition:"background 0.3s"}}/>)}
      </div>

      {/* Questions */}
      {grouped.map((qs,gi)=>(
        <div key={gi} style={{marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
            <div style={{width:20,height:20,borderRadius:"50%",fontSize:10,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",background:PHASES[gi].accent,color:"#fff"}}>{gi+1}</div>
            <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>{PHASES[gi].title}</span>
          </div>
          {qs.map(q=>(
            <div key={q.id} ref={el=>refs.current[q.id]=el} style={{
              background:"var(--color-background-primary)",
              border:ans[q.id]?`1px solid ${PHASES[q.ph].accent}25`:"0.5px solid var(--color-border-tertiary)",
              borderRadius:"var(--border-radius-lg)",padding:"0.75rem 0.875rem",marginBottom:7,transition:"all 0.2s",
            }}>
              <div style={{fontSize:12,fontWeight:500,marginBottom:7}}>{q.q}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {q.opts.map(o=>{
                  const sel=ans[q.id]===o.v;
                  return <button key={o.v} onClick={()=>pick(q.id,o.v)} style={{
                    padding:"5px 11px",fontSize:11,borderRadius:5,
                    border:sel?`1.5px solid ${PHASES[q.ph].accent}`:"0.5px solid var(--color-border-secondary)",
                    background:sel?`${PHASES[q.ph].accent}14`:"transparent",
                    color:sel?PHASES[q.ph].accent:"var(--color-text-primary)",
                    fontWeight:sel?500:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",
                  }}>{o.l}</button>
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Result */}
      <div ref={resRef}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
          <div style={{width:20,height:20,borderRadius:"50%",fontSize:10,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",background:"#534AB7",color:"#fff"}}>4</div>
          <span style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>Recommendation</span>
        </div>

        {!done?(
          <div style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-lg)",padding:"2rem 1rem",textAlign:"center",color:"var(--color-text-tertiary)",fontSize:11}}>
            Complete all selections above
            <div style={{marginTop:6,fontSize:18,opacity:0.25}}>{Object.keys(ans).length}/6</div>
          </div>
        ):(
          <div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-lg)",padding:"1rem 0.875rem"}}>
            <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:2}}>Recommended</div>
            <div style={{fontSize:19,fontWeight:500,marginBottom:5,lineHeight:1.3}}>{rec.dist}</div>
            <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.6,marginBottom:10}}>{rec.reason}</div>

            <div style={{marginBottom:10,display:"flex",flexWrap:"wrap",gap:4}}>
              {rec.tags.map((t,i)=><span key={i} style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:500,background:TC[t.c].bg,color:TC[t.c].c}}>{t.t}</span>)}
            </div>

            <PdfChart curveKey={rec.ck} tailMode={ans.tail}/>

            <Sec label="Tail behavior">
              <div style={{fontSize:11,color:"var(--color-text-secondary)",lineHeight:1.55}}>{TAIL_TEXT[ans.tail]}</div>
            </Sec>

            <Sec label="PDF formulation">
              <div style={{fontSize:10,fontFamily:"var(--font-mono)",lineHeight:1.6,whiteSpace:"pre-wrap",color:"var(--color-text-primary)"}}>{FORMULAS[rec.ck]}</div>
            </Sec>

            {rec.alts.length>0&&(
              <Sec label="Alternatives to consider">
                {rec.alts.map((a,i)=><div key={i} style={{fontSize:11,marginBottom:3,lineHeight:1.5}}><span style={{fontWeight:500}}>{a.n}</span><span style={{color:"var(--color-text-secondary)"}}> — {a.d}</span></div>)}
              </Sec>
            )}

            <Sec label="Required validation">
              {["Apply ≥ 2 GoF tests (K-S + Anderson-Darling)","Compare candidates via AIC / BIC","Inspect tail fit on log-probability plot","Verify consistency with physical failure mechanism"].map((s,i)=>(
                <div key={i} style={{fontSize:11,marginBottom:2,display:"flex",gap:6,lineHeight:1.5}}>
                  <span style={{color:"var(--color-text-tertiary)",flexShrink:0,width:14,textAlign:"right"}}>{i+1}.</span>
                  <span style={{color:"var(--color-text-secondary)"}}>{s}</span>
                </div>
              ))}
            </Sec>

            {rec.notes.length>0&&(
              <div style={{padding:"0 2px",marginTop:8}}>
                {rec.notes.map((n,i)=><div key={i} style={{fontSize:10,color:"var(--color-text-tertiary)",fontStyle:"italic",marginBottom:3,lineHeight:1.5}}>{n}</div>)}
              </div>
            )}

            <button onClick={reset} style={{marginTop:12,padding:"7px 18px",border:"0.5px solid var(--color-border-secondary)",borderRadius:5,fontSize:11,cursor:"pointer",background:"transparent",color:"var(--color-text-primary)",fontFamily:"inherit"}}>Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}
