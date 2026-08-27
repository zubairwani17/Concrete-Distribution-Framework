/* React UI — chart, data panel, and main application component.
   Contains JSX; transpiled by Babel at runtime. */

const {useState,useRef,useMemo,useEffect}=React;

/* ══════════ CHART ══════════ */
function Chart({curves,hist,tailMode,xRange,label}){
  if(!curves||!curves.length)return null;
  const W=520,H=200,pl=36,pr=14,pt=20,pb=32,cw=W-pl-pr,ch=H-pt-pb;
  const[xMn,xMx]=xRange;
  const yMx=Math.max(...curves.flatMap(c=>c.pts.map(p=>p.y)),...(hist?hist.map(b=>b.d):[0]))*1.14;
  const sx=x=>pl+((x-xMn)/(xMx-xMn))*cw, sy=y=>pt+ch-(y/yMx)*ch;
  const path=p=>p.map((q,i)=>`${i?"L":"M"}${sx(q.x).toFixed(1)},${sy(q.y).toFixed(1)}`).join("");
  const area=p=>p.length<2?"":path(p)+`L${sx(p[p.length-1].x).toFixed(1)},${pt+ch}L${sx(p[0].x).toFixed(1)},${pt+ch}Z`;
  const showL=tailMode==="lower"||tailMode==="both",showU=tailMode==="upper"||tailMode==="both";
  const tails=curves.map(c=>{
    const p=[...c.pts].sort((a,b)=>a.x-b.x);
    let tot=0;for(let i=1;i<p.length;i++)tot+=(p[i].x-p[i-1].x)*(p[i].y+p[i-1].y)/2;
    let cum=0,lX=null,uX=null;
    for(let i=1;i<p.length;i++){
      cum+=(p[i].x-p[i-1].x)*(p[i].y+p[i-1].y)/2;
      if(lX===null&&cum/tot>=.10)lX=p[i].x;
      if(uX===null&&cum/tot>=.90)uX=p[i].x;
    }
    lX=lX??p[0].x;uX=uX??p[p.length-1].x;
    return{lX,uX,lPts:p.filter(q=>q.x<=lX),uPts:p.filter(q=>q.x>=uX)};
  });
  return(
    <div className="chart">
      <div className="chdr">
        <span className="ctitle">{label}</span>
        <div className="leg">{curves.map((c,i)=><span key={i} className="li" style={{color:c.color}}><span className="ll" style={{background:c.color}}/>{c.name}</span>)}</div>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
        {[0,1,2,3].map(i=><line key={i} x1={pl} y1={pt+(i/3)*ch} x2={W-pr} y2={pt+(i/3)*ch} stroke="var(--bd)" strokeWidth=".5"/>)}
        {hist&&hist.map((b,i)=>{const x0=sx(b.lo),x1=sx(b.hi);
          return <rect key={i} x={x0} y={sy(b.d)} width={Math.max(.5,x1-x0-.7)} height={pt+ch-sy(b.d)} fill="var(--t3)" fillOpacity=".22"/>})}
        {curves.map((c,ci)=><g key={`t${ci}`}>
          {showL&&tails[ci].lPts.length>2&&<path d={area(tails[ci].lPts)} fill={c.color} fillOpacity=".2"/>}
          {showU&&tails[ci].uPts.length>2&&<path d={area(tails[ci].uPts)} fill={c.color} fillOpacity=".2"/>}
        </g>)}
        {curves.map((c,ci)=><path key={ci} d={path(c.pts)} fill="none" stroke={c.color} strokeWidth="1.9" strokeLinejoin="round"/>)}
        {curves.map((c,ci)=><g key={`d${ci}`}>
          {showL&&<line x1={sx(tails[ci].lX)} y1={pt} x2={sx(tails[ci].lX)} y2={pt+ch} stroke={c.color} strokeWidth=".8" strokeDasharray="3 3" opacity=".55"/>}
          {showU&&<line x1={sx(tails[ci].uX)} y1={pt} x2={sx(tails[ci].uX)} y2={pt+ch} stroke={c.color} strokeWidth=".8" strokeDasharray="3 3" opacity=".55"/>}
        </g>)}
        {showL&&<text x={sx(tails[0].lX)-3} y={pt+9} textAnchor="end" fontSize="8" fill={curves[0].color} fontWeight="600" opacity=".8">Lower tail (Pf)</text>}
        {showU&&<text x={sx(tails[curves.length-1].uX)+3} y={pt+9} textAnchor="start" fontSize="8" fill={curves[curves.length-1].color} fontWeight="600" opacity=".8">Upper tail</text>}
        <line x1={pl} y1={pt+ch} x2={W-pr} y2={pt+ch} stroke="var(--bd2)" strokeWidth=".5"/>
        {Array.from({length:7},(_,i)=>{const v=xMn+(i/6)*(xMx-xMn);
          return <text key={i} x={pl+(i/6)*cw} y={H-11} textAnchor="middle" fontSize="9" fill="var(--t3)">{v>=100?Math.round(v):v.toFixed(v<20?1:0)}</text>})}
        <text x={W/2} y={H-1} textAnchor="middle" fontSize="9" fill="var(--t3)">Compressive strength (MPa)</text>
        <text x={9} y={pt+ch/2} textAnchor="middle" fontSize="9" fill="var(--t3)" transform={`rotate(-90,9,${pt+ch/2})`}>f(x)</text>
      </svg>
    </div>
  );
}

const TC={g:{bg:"var(--ok-bg)",c:"var(--ok-c)"},b:{bg:"var(--info-bg)",c:"var(--info-c)"},a:{bg:"var(--warn-bg)",c:"var(--warn-c)"}};
const TAIL_TXT={
  lower:"The shaded lower-tail region governs failure probability Pf. Underestimating it produces unconservative reliability predictions. Weibull and Burr XII capture this region more accurately than Normal or Lognormal.",
  upper:"The shaded upper-tail region captures extreme events — peak loading, maximum deterioration, or rare high-strength realizations. Gumbel and Fréchet extreme value distributions are designed for this behaviour.",
  both:"Both tails are critical. The lower tail governs structural failure probability; the upper tail governs extreme event likelihood. A dual-model or flexible heavy-tailed distribution avoids bias in either direction.",
  none:"Neither tail dominates — central tendency and overall dispersion are the primary concerns. Standard distributions are adequate.",
};
const Sec=({label,right,children})=><div className="sec"><div className="sec-l"><span>{label}</span>{right}</div>{children}</div>;

/* ══════════ DATA PANEL ══════════ */
function DataPanel({data,setData,err,setErr}){
  const[over,setOver]=useState(false);
  const inp=useRef(null);
  const parse=(wb,sheetName,colIdx,outlier)=>{
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,blankrows:false});
    if(!rows.length)throw new Error("Sheet is empty.");
    const hdr=rows[0]||[],nc=Math.max(...rows.map(r=>r.length));
    const num=v=>{
      if(typeof v==="number"&&isFinite(v))return v;
      if(typeof v==="string"){const t=parseFloat(v.replace(/,/g,"").trim());return isFinite(t)?t:null}
      return null;
    };
    const hdrText=hdr.some(c=>typeof c==="string"&&num(c)===null);
    const body=hdrText?rows.slice(1):rows,cols=[];
    for(let c=0;c<nc;c++){
      const vals=body.map(r=>num(r[c])).filter(v=>v!==null&&v>0);
      if(vals.length>=5)cols.push({idx:c,name:(hdrText&&hdr[c]!=null&&String(hdr[c]).trim())||`Column ${String.fromCharCode(65+c)}`,count:vals.length,vals});
    }
    if(!cols.length)throw new Error("No numeric column with at least 5 positive values found.");
    const ch=cols.find(c=>c.idx===colIdx)||cols[0];
    let v=ch.vals;
    if(outlier==="sd3"){const m=S(v)/v.length,s=Math.sqrt(S(v.map(t=>(t-m)**2))/(v.length-1));v=v.filter(t=>Math.abs(t-m)<=3*s)}
    else if(outlier==="iqr"){const st=[...v].sort((a,b)=>a-b),q=p=>st[Math.floor(p*(st.length-1))],q1=q(.25),q3=q(.75),ir=q3-q1;v=v.filter(t=>t>=q1-1.5*ir&&t<=q3+1.5*ir)}
    if(v.length<5)throw new Error("Fewer than 5 valid values remain after filtering.");
    return{wb,sheets:wb.SheetNames,sheet:sheetName,cols,col:ch.idx,colName:ch.name,values:v,removed:ch.vals.length-v.length,outlier,stats:describe(v)};
  };
  const load=file=>{
    setErr("");
    const rd=new FileReader();
    rd.onload=e=>{try{const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});setData(parse(wb,wb.SheetNames[0],-1,"none"))}
      catch(ex){setErr(ex.message||"Could not read this file.");setData(null)}};
    rd.onerror=()=>setErr("File could not be read.");
    rd.readAsArrayBuffer(file);
  };
  const change=(k,val)=>{try{setErr("");
    setData(parse(data.wb,k==="sheet"?val:data.sheet,k==="col"?val:(k==="sheet"?-1:data.col),k==="out"?val:data.outlier))}
    catch(ex){setErr(ex.message)}};
  const template=()=>{
    const b=new Blob(["fc_MPa\n32.4\n29.8\n35.1\n31.0\n33.7\n28.6\n34.2\n30.9\n"],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="strength_data_template.csv";a.click();
  };
  if(!data)return(
    <div>
      {err&&<div className="err">{err}</div>}
      <div className={`drop${over?" over":""}`} onClick={()=>inp.current.click()}
        onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)}
        onDrop={e=>{e.preventDefault();setOver(false);if(e.dataTransfer.files[0])load(e.dataTransfer.files[0])}}>
        <div className="drop-t">Upload strength data</div>
        <div className="drop-s">Excel (.xlsx, .xls) or CSV — tap or drag a file here</div>
      </div>
      <input ref={inp} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>e.target.files[0]&&load(e.target.files[0])}/>
      <div style={{marginTop:8,textAlign:"center"}}><button className="lnk" onClick={template}>Download CSV template</button></div>
    </div>
  );
  const st=data.stats;
  return(
    <div>
      {err&&<div className="err">{err}</div>}
      <div className="sel-row">
        {data.sheets.length>1&&<div><label>Sheet</label>
          <select value={data.sheet} onChange={e=>change("sheet",e.target.value)}>{data.sheets.map(s=><option key={s} value={s}>{s}</option>)}</select></div>}
        <div><label>Column</label>
          <select value={data.col} onChange={e=>change("col",+e.target.value)}>{data.cols.map(c=><option key={c.idx} value={c.idx}>{c.name} ({c.count})</option>)}</select></div>
        <div><label>Outliers</label>
          <select value={data.outlier} onChange={e=>change("out",e.target.value)}>
            <option value="none">Keep all</option><option value="sd3">Remove &gt;3σ</option><option value="iqr">Remove IQR 1.5×</option>
          </select></div>
      </div>
      <div className="stats">
        <div className="stat"><div className="stat-v">{st.n}</div><div className="stat-l">n</div></div>
        <div className="stat"><div className="stat-v">{st.mean.toFixed(2)}</div><div className="stat-l">Mean</div></div>
        <div className="stat"><div className="stat-v">{st.sd.toFixed(2)}</div><div className="stat-l">SD</div></div>
        <div className="stat"><div className="stat-v" style={{color:"#0F6E56"}}>{st.cov.toFixed(2)}%</div><div className="stat-l">CoV</div></div>
        <div className="stat"><div className="stat-v">{st.skew.toFixed(2)}</div><div className="stat-l">Skew</div></div>
        <div className="stat"><div className="stat-v">{st.min.toFixed(1)}–{st.max.toFixed(1)}</div><div className="stat-l">Range</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <span style={{fontSize:10.5,color:"var(--t3)"}}>
          {data.colName}{data.removed>0?` · ${data.removed} excluded`:""} · CoV → {covLabel(covBucket(st.cov))} · n → {nLabel(nBucket(st.n))}
        </span>
        <button className="lnk" onClick={()=>{setData(null);setErr("")}}>Remove file</button>
      </div>
    </div>
  );
}

/* ══════════ APP ══════════ */
function App(){
  const[ans,setAns]=useState({});
  const[mode,setMode]=useState("upload");
  const[data,setData]=useState(null);
  const[err,setErr]=useState("");
  const[B,setB]=useState(500);
  const[boot,setBoot]=useState(null);
  const[booting,setBooting]=useState(false);
  const refs=useRef({}),resRef=useRef(null);

  const eff=useMemo(()=>{
    const o={...ans};
    if(mode==="upload"&&data){o.cov=covBucket(data.stats.cov);o.n=nBucket(data.stats.n)}
    return o;
  },[ans,mode,data]);

  const filled=QS.filter(q=>eff[q.id]).length,done=filled===6;
  const rec=done?recommend(eff):null;

  const fits=useMemo(()=>{
    if(!data)return null;
    try{
      const v=data.values;
      return Object.keys(FITTERS).map(k=>{const f=FITTERS[k](v);return{...f,g:gof(v,f)}}).sort((a,b)=>a.g.ad-b.g.ad);
    }catch(e){return null}
  },[data]);

  // Bootstrap, chunked one distribution per tick so the UI stays responsive
  useEffect(()=>{
    if(!fits||!data){setBoot(null);return}
    let cancelled=false;
    setBoot(null);setBooting(true);
    const acc={},queue=fits.map(f=>f.key);
    const step=()=>{
      if(cancelled)return;
      const k=queue.shift();
      if(k===undefined){setBooting(false);return}
      const f=fits.find(x=>x.key===k);
      acc[k]=bootstrapP(data.values,k,f.g.ad,f.g.ks,B);
      if(cancelled)return;
      setBoot({...acc});
      setTimeout(step,0);
    };
    const id=setTimeout(step,60);
    return()=>{cancelled=true;clearTimeout(id)};
  },[fits,data,B]);

  const pick=(id,v)=>{
    const next={...ans,[id]:v};setAns(next);
    const merged={...next};
    if(mode==="upload"&&data){merged.cov=covBucket(data.stats.cov);merged.n=nBucket(data.stats.n)}
    setTimeout(()=>{
      const nx=QS.find(q=>!merged[q.id]);
      if(nx&&refs.current[nx.id])refs.current[nx.id].scrollIntoView({behavior:"smooth",block:"center"});
      else if(resRef.current)setTimeout(()=>resRef.current.scrollIntoView({behavior:"smooth",block:"start"}),120);
    },80);
  };
  const reset=()=>{setAns({});setData(null);setErr("");setBoot(null);window.scrollTo({top:0,behavior:"smooth"})};

  const chart=useMemo(()=>{
    if(!rec)return null;
    const N=250;
    if(data&&fits){
      const v=data.values;
      const sel=rec.keys.map(k=>fits.find(f=>f.key===k)).filter(Boolean);
      const use=sel.length?sel:[fits[0]];
      const lo=Math.max(.01,Math.min(...v)*.75),hi=Math.max(...v)*1.25;
      const curves=use.map(f=>({name:f.name,color:f.color,pts:Array.from({length:N+1},(_,i)=>{const x=lo+(i/N)*(hi-lo);return{x,y:f.pdf(x)}})}));
      const nb=Math.min(24,Math.max(7,Math.ceil(Math.sqrt(v.length))));
      const mn=Math.min(...v),bw=(Math.max(...v)-mn)/nb;
      const hist=Array.from({length:nb},(_,i)=>{const l=mn+i*bw,h=l+bw;
        return{lo:l,hi:h,d:v.filter(t=>i===nb-1?t>=l&&t<=h:t>=l&&t<h).length/(v.length*bw)}});
      return{curves,hist,xRange:[lo,hi],label:"Empirical histogram + fitted PDF"};
    }
    const use=rec.keys.map(k=>IL[k]).filter(Boolean);
    const lo=Math.min(...use.map(u=>u.rng[0])),hi=Math.max(...use.map(u=>u.rng[1]));
    return{curves:use.map(u=>({name:u.name,color:u.color,pts:Array.from({length:N+1},(_,i)=>{const x=lo+(i/N)*(hi-lo);return{x,y:u.pdf(x)}})})),
      hist:null,xRange:[lo,hi],label:"Illustrative PDF shape + tail regions"};
  },[rec,data,fits]);

  // Admissibility & reconciliation
  const analysis=useMemo(()=>{
    if(!fits||!rec||!boot)return null;
    const rows=fits.map(f=>({...f,b:boot[f.key]||{}}));
    const complete=rows.every(r=>r.b.pAD!==undefined);
    if(!complete)return null;
    const adm=rows.filter(r=>r.b.pAD!==null&&r.b.pAD>0.05);
    const recFits=rec.keys.map(k=>rows.find(r=>r.key===k)).filter(Boolean);
    const recAdmissible=recFits.length>0&&recFits.every(r=>r.b.pAD!==null&&r.b.pAD>0.05);
    const best=rows[0];
    const agree=rec.keys.includes(best.key);
    return{rows,adm,recFits,recAdmissible,best,agree};
  },[fits,rec,boot]);

  const fractiles=useMemo(()=>{
    if(!fits)return null;
    return fits.map(f=>({key:f.key,name:f.name,f5:f.q(.05),f1:f.q(.01),f95:f.q(.95)}));
  },[fits]);

  return(
    <div className="app">
      <div className="hdr">
        <h1>Probability distribution selection framework</h1>
        <div className="sub">Concrete compressive strength — uncertainty-aware modelling guidance</div>
      </div>

      <div className="prog">{QS.map(q=><div key={q.id} className="pseg" style={eff[q.id]?{background:PH[q.ph].a}:{}}/>)}</div>

      {[0,1,2].map(gi=>(
        <div key={gi} className="phase">
          <div className="plab"><div className="pnum" style={{background:PH[gi].a}}>{gi+1}</div><span className="ptitle">{PH[gi].t}</span></div>
          {QS.filter(q=>q.ph===gi).map(q=>{
            const auto=mode==="upload"&&data&&(q.id==="cov"||q.id==="n"),on=!!eff[q.id];
            return(
              <div key={q.id} ref={el=>refs.current[q.id]=el} className="card" style={on?{boxShadow:`0 0 0 1.5px ${PH[q.ph].a}30`,borderColor:"transparent"}:{}}>
                <div className="q"><span>{q.q}</span>{auto&&<span className="badge">from data</span>}</div>
                {q.special?(
                  <div>
                    <div className="tabs">
                      <button className={`tab${mode==="upload"?" on":""}`} onClick={()=>setMode("upload")}>Upload raw data</button>
                      <button className={`tab${mode==="manual"?" on":""}`} onClick={()=>setMode("manual")}>I know the CoV</button>
                    </div>
                    {mode==="upload"?<DataPanel data={data} setData={setData} err={err} setErr={setErr}/>
                      :<div className="opts">{q.opts.map(o=>(
                        <button key={o.v} className="opt" onClick={()=>pick(q.id,o.v)}
                          style={ans[q.id]===o.v?{borderColor:PH[q.ph].a,background:PH[q.ph].a+"18",color:PH[q.ph].a,fontWeight:500}:{}}>{o.l}</button>))}
                      </div>}
                  </div>
                ):(
                  <div className="opts">{q.opts.map(o=>{const sel=eff[q.id]===o.v;
                    return <button key={o.v} className="opt" disabled={auto} onClick={()=>pick(q.id,o.v)}
                      style={sel?{borderColor:PH[q.ph].a,background:PH[q.ph].a+"18",color:PH[q.ph].a,fontWeight:500,opacity:1}:{}}>{o.l}</button>})}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div ref={resRef}>
        <div className="plab"><div className="pnum" style={{background:"#534AB7"}}>4</div><span className="ptitle">Recommendation</span></div>
        {!done?(
          <div className="res-ph">
            {mode==="upload"&&!data?"Upload a data file, then complete the remaining selections":"Complete all selections above"}
            <div style={{marginTop:7,fontSize:19,opacity:.25}}>{filled}/6</div>
          </div>
        ):(
          <div className="res">
            {fits?(
              <div className="split">
                <div className="sp">
                  <div className="sp-l">Context recommends</div>
                  <div className="sp-v">{rec.dist}</div>
                  <div className="sp-s">from your six selections</div>
                </div>
                <div className="sp">
                  <div className="sp-l">Best fit on your data</div>
                  <div className="sp-v">{fits[0].name}</div>
                  <div className="sp-s">lowest A–D statistic</div>
                </div>
              </div>
            ):(<>
              <div className="rlab">Framework recommendation</div>
              <div className="rdist">{rec.dist}</div>
            </>)}

            {analysis&&(
              <div className={`verdict ${analysis.agree?"v-ok":analysis.recAdmissible?"v-info":"v-warn"}`}>
                {analysis.agree?<>
                  <b>Context and data agree.</b> {rec.dist} both fits your sample best and matches your modelling context. {analysis.adm.length>1&&`Note that ${analysis.adm.length} of ${analysis.rows.length} candidates are statistically admissible (p > 0.05), so the ranking margin is modest.`}
                </>:analysis.recAdmissible?<>
                  <b>Keep {rec.dist}.</b> It is statistically admissible on your data (bootstrap p<sub>AD</sub> = {analysis.recFits.map(r=>r.b.pAD.toFixed(3)).join(", ")}), meaning your sample provides no evidence against it. {analysis.best.name} ranks first, but {analysis.adm.length} of {analysis.rows.length} candidates pass the test — at n = {data.stats.n} the ranking separates models that are statistically indistinguishable. Rank order is not a selection criterion; choose on tail behaviour and physical mechanism.
                </>:<>
                  <b>Reconsider {rec.dist}.</b> Your data rejects it (bootstrap p<sub>AD</sub> = {analysis.recFits.map(r=>r.b.pAD===null?"n/a":r.b.pAD.toFixed(3)).join(", ")} ≤ 0.05). Among admissible candidates, {analysis.adm.length?analysis.adm[0].name:"none"} gives the best fit. Here the empirical evidence should override the contextual default — report both and justify the departure.
                </>}
              </div>
            )}

            <div className="rreason">{rec.reason}</div>
            <div className="tags">{rec.tags.map((t,i)=><span key={i} className="tag" style={{background:TC[t.c].bg,color:TC[t.c].c}}>{t.t}</span>)}</div>

            <Chart curves={chart.curves} hist={chart.hist} tailMode={eff.tail} xRange={chart.xRange} label={chart.label}/>

            {fits&&(
              <Sec label="Goodness of fit on your data"
                right={<select value={B} onChange={e=>setB(+e.target.value)} style={{fontSize:10,padding:"2px 5px",maxWidth:110}}>
                  <option value={200}>B = 200</option><option value={500}>B = 500</option><option value={1000}>B = 1000</option><option value={2000}>B = 2000</option>
                </select>}>
                <table>
                  <thead><tr><th>Distribution</th><th>A–D</th><th>p<sub>AD</sub></th><th>K–S</th><th>p<sub>KS</sub></th><th>AIC</th><th>BIC</th></tr></thead>
                  <tbody>
                    {fits.map(f=>{
                      const b=boot?boot[f.key]:null;
                      const rej=b&&b.pAD!==null&&b.pAD<=.05;
                      const isRec=rec.keys.includes(f.key);
                      return(
                        <tr key={f.key} className={`${rej?"rej":""} ${isRec?"recd":""}`}>
                          <td><span className="dot" style={{background:b?(rej?"var(--err-c)":"var(--ok-c)"):"var(--bd2)"}}/>{f.name}</td>
                          <td>{f.g.ad.toFixed(3)}</td>
                          <td>{b?(b.pAD===null?"—":b.pAD.toFixed(3)):<span className="spin"/>}</td>
                          <td>{f.g.ks.toFixed(4)}</td>
                          <td>{b?(b.pKS===null?"—":b.pKS.toFixed(3)):""}</td>
                          <td>{f.g.aic.toFixed(1)}</td>
                          <td>{f.g.bic.toFixed(1)}</td>
                        </tr>);
                    })}
                  </tbody>
                </table>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:7,lineHeight:1.55}}>
                  {booting&&<><span className="spin"/>Running parametric bootstrap… </>}
                  p-values are parametric-bootstrap calibrated with parameter re-estimation on each resample. Green = admissible (p &gt; 0.05); red = rejected. Bold marks the framework recommendation. Sorted by A–D, but <b>rank order alone is not a selection criterion</b> — see the design-value spread below.
                </div>
              </Sec>
            )}

            {fractiles&&(
              <Sec label="Design-value consequence of the choice">
                <table>
                  <thead><tr><th>Distribution</th><th>f<sub>5%</sub></th><th>f<sub>1%</sub></th><th>f<sub>95%</sub></th></tr></thead>
                  <tbody>
                    {fractiles.map(f=>(
                      <tr key={f.key} className={rec.keys.includes(f.key)?"recd":""}>
                        <td>{f.name}</td><td>{f.f5.toFixed(2)}</td><td>{f.f1.toFixed(2)}</td><td>{f.f95.toFixed(2)}</td>
                      </tr>))}
                    <tr><td style={{color:"var(--t3)",fontWeight:400}}>Empirical (order stat.)</td>
                      <td style={{color:"var(--t3)"}}>{data.stats.emp5.toFixed(2)}</td><td style={{color:"var(--t3)"}}>—</td><td style={{color:"var(--t3)"}}>—</td></tr>
                  </tbody>
                </table>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:7,lineHeight:1.55}}>
                  Fractiles in MPa. The 1% fractile spans {(Math.min(...fractiles.map(f=>f.f1))).toFixed(1)}–{(Math.max(...fractiles.map(f=>f.f1))).toFixed(1)} MPa
                  ({(100*(Math.max(...fractiles.map(f=>f.f1))-Math.min(...fractiles.map(f=>f.f1)))/Math.min(...fractiles.map(f=>f.f1))).toFixed(0)}% spread) across candidates that the GoF test cannot separate. This divergence — not the A–D ranking — is what the distribution choice actually controls, and it is why the contextual recommendation carries weight.
                </div>
              </Sec>
            )}

            {fits&&(
              <Sec label={`Fitted parameters (MLE, n = ${data.stats.n})`}>
                <div className="mono">{rec.keys.map(k=>{const f=fits.find(x=>x.key===k);
                  return f?`${f.name}:  ${Object.keys(f.p).map(a=>`${f.lab[a]} = ${f.p[a].toFixed(5)}`).join(",  ")}\n${f.eq}`:""}).filter(Boolean).join("\n\n")}</div>
                <div style={{fontSize:10,color:"var(--t3)",marginTop:6}}>Equations use <code>x</code> as the strength variable — substitute <code>col(B)</code> for OriginPro.</div>
              </Sec>
            )}

            <Sec label="Tail behavior"><div className="sec-b">{TAIL_TXT[eff.tail]}</div></Sec>

            {!fits&&(
              <Sec label="PDF formulation">
                <div className="mono">{rec.keys.map(k=>({
                  normal:"Normal:     f(x) = 1/(σ√(2π)) · exp[−(x−μ)²/(2σ²)]",
                  lognormal:"Lognormal:  f(x) = 1/(xσ_Y√(2π)) · exp[−(ln x−μ_Y)²/(2σ_Y²)]",
                  weibull:"Weibull:    f(x) = (m/λ)(x/λ)^(m−1) · exp[−(x/λ)^m]",
                  burr:"Burr XII:   f(x) = (ak/c)(x/c)^(a−1) · [1+(x/c)^a]^(−(k+1))",
                  gumbel:"Gumbel:     f(x) = (1/s)·exp[−z−exp(−z)],  z=(x−m)/s",
                }[k])).join("\n")}</div>
              </Sec>
            )}

            {rec.alts.length>0&&<Sec label="Alternatives to consider">{rec.alts.map((a,i)=><div key={i} className="alt"><b>{a.n}</b> — {a.d}</div>)}</Sec>}

            <Sec label="Required validation">
              {[fits?"Report bootstrap p-values alongside the raw statistics — asymptotic critical values are invalid with estimated parameters":"Apply ≥ 2 GoF tests (K–S + Anderson–Darling) with bootstrap calibration",
                "Treat all admissible candidates as a set; do not select on rank margin alone",
                "Compare fractiles at the exceedance level your limit state actually uses",
                "Verify consistency with the physical failure mechanism"].map((s,i)=>(
                <div key={i} className="vs"><span className="vn">{i+1}.</span><span style={{color:"var(--t2)"}}>{s}</span></div>))}
            </Sec>

            {rec.notes.length>0&&<div style={{marginTop:10}}>{rec.notes.map((n,i)=><div key={i} className="note">{n}</div>)}</div>}
            <button className="btn" style={{marginTop:13}} onClick={reset}>Reset</button>
          </div>
        )}
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
