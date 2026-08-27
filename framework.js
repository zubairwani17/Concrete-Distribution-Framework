/* Decision framework — question definitions, recommendation engine,
   illustrative reference curves. Plain JavaScript, no JSX. */

/* ══════════ QUESTIONS ══════════ */
const QS=[
  {id:"src",ph:0,q:"Where does your strength data originate?",
    opts:[{v:"lab",l:"Laboratory specimens"},{v:"field",l:"Field-cast / site-cured"},{v:"core",l:"In-situ cores / NDT"},{v:"mixed",l:"Mixed / multi-source"}]},
  {id:"mat",ph:0,q:"What type of concrete are you modelling?",
    opts:[{v:"normal",l:"Normal-strength"},{v:"high",l:"High-strength / UHPC"},{v:"recycled",l:"Recycled aggregate"},{v:"alt",l:"Alternative"}]},
  {id:"cov",ph:1,q:"Coefficient of variation",special:1,
    opts:[{v:"low",l:"< 10%"},{v:"mod",l:"10 – 20%"},{v:"high",l:"20 – 35%"},{v:"vhigh",l:"> 35%"}]},
  {id:"n",ph:1,q:"How many specimens in your dataset?",
    opts:[{v:"small",l:"< 50"},{v:"med",l:"50 – 200"},{v:"large",l:"> 200"}]},
  {id:"obj",ph:2,q:"What is the modelling objective?",
    opts:[{v:"design",l:"Code-based design / QC"},{v:"reliability",l:"Reliability / fragility"},{v:"seismic",l:"Seismic / collapse"},{v:"durability",l:"Durability / service-life"}]},
  {id:"tail",ph:2,q:"Which tail region is critical for your analysis?",
    opts:[{v:"none",l:"Neither tail critical"},{v:"lower",l:"Lower tail (failure)"},{v:"upper",l:"Upper tail (extremes)"},{v:"both",l:"Both tails"}]},
];
const PH=[{t:"Context",a:"#185FA5"},{t:"Variability",a:"#0F6E56"},{t:"Objective",a:"#854F0B"}];

/* ══════════ RECOMMENDATION ══════════ */
function recommend(s){
  const lt=s.tail==="lower"||s.tail==="both",ut=s.tail==="upper"||s.tail==="both";
  const rel=["reliability","seismic","durability"].includes(s.obj);
  const lo=s.cov==="low",hi=s.cov==="high"||s.cov==="vhigh";
  let dist,keys,reason,tags=[],alts=[],notes=[];
  if(lt&&hi){
    dist="Burr Type XII";keys=["burr"];
    reason="Heavy-tailed distribution validated for in-structure concrete with high dispersion. Captures left-tail probability more accurately than Normal or Lognormal — critical when failure probability governs design (He et al., 2024).";
    tags=[{t:"Lower-tail sensitive",c:"g"},{t:"Heavy-tail capable",c:"g"}];
    if(ut){tags.push({t:"Upper tail via Gumbel/Fréchet",c:"b"});notes.push("For upper-tail extreme events, supplement Burr XII with a Gumbel or Fréchet extreme value model.")}
    alts=[{n:"3P Weibull",d:"If weakest-link fracture mechanics is justified and a threshold strength γ exists."},{n:"Lognormal",d:"Only if GoF confirms and CoV can be reduced below ~20% by filtering."}];
  }else if(lt&&!lo){
    dist="2-parameter Weibull";keys=["weibull"];
    reason="Grounded in weakest-link fracture theory for quasi-brittle materials. Superior lower-tail fit for core specimens and moderate-to-high variability (Chen et al., 2013; Vu et al., 2022).";
    tags=[{t:"Fracture-consistent",c:"g"},{t:"Lower-tail sensitive",c:"g"}];
    if(ut){tags.push({t:"Upper tail needs separate model",c:"a"});notes.push("Weibull is light-tailed on the right — for upper-tail extremes use Gumbel or Fréchet separately.")}
    alts=[{n:"Burr XII",d:"If skewness exceeds what Weibull can capture."},{n:"3P Weibull",d:"If QC guarantees a minimum threshold strength."}];
  }else if(ut&&!lt){
    dist="Lognormal + Gumbel";keys=["lognormal","gumbel"];
    reason=s.obj==="durability"
      ?"Lognormal for bulk strength; Gumbel for extreme deterioration events — maximum pit depth, peak chloride penetration. Gumbel's unbounded right tail captures worst-case service-life scenarios (Li et al., 2023)."
      :"Lognormal captures the bulk distribution; Gumbel models upper-tail extreme values — peak structural response, extreme load effects, maximum deterioration.";
    tags=[{t:"Upper-tail via EVD",c:"g"},{t:"Dual-model",c:"b"}];
    alts=[{n:"Fréchet",d:"Heavier right tail than Gumbel — for rare extremes with high consequence."}];
  }else if(s.tail==="both"&&!hi){
    dist="Weibull + Burr XII";keys=["weibull","burr"];
    reason="Combined strategy: Weibull captures lower-tail fracture-driven behaviour; Burr XII provides flexible heavy-tail modelling at both extremes. Compare fits and select on GoF performance within each tail region.";
    tags=[{t:"Both tails covered",c:"g"},{t:"Compare via GoF",c:"b"}];
    alts=[{n:"Lognormal + Gumbel",d:"If the upper tail arises from environmental actions rather than material variability."}];
  }else if(rel&&!lo){
    dist="Lognormal";keys=["lognormal"];
    reason="Enforces non-negativity and accommodates right-skewed behaviour seen in field and core data (Wiśniewski et al., 2012; Nguyen et al., 2022). Standard choice for reliability-based assessment.";
    tags=[{t:"Non-negative",c:"g"},{t:"Right-skew capable",c:"g"}];
    if(hi)tags.push({t:"Verify lower tail",c:"a"});
    alts=[{n:"Weibull",d:"If GoF shows lognormal underestimates the lower tail."},{n:"Burr XII",d:"For CoV > 35% where the lognormal tail is insufficient."}];
  }else if(lo&&s.tail==="none"){
    dist="Normal (Gaussian)";keys=["normal"];
    reason="For well-controlled data with CoV < 10% and near-symmetric histograms, Normal and Lognormal are statistically indistinguishable (Pacheco et al., 2019). Normal is simpler and FORM/SORM compatible.";
    tags=[{t:"Simple",c:"b"},{t:"Code-compatible",c:"b"}];
    if(s.src!=="lab")tags.push({t:"Verify symmetry",c:"a"});
    alts=[{n:"Lognormal",d:"Preferred if any skewness is detected."}];
    notes.push("Normal assigns nonzero probability to negative strengths — negligible at low CoV but check if tail values propagate.");
  }else if(s.obj==="design"&&!hi){
    dist="Normal (Gaussian)";keys=["normal"];
    reason="Design codes (ACI 214R, IS 456, Eurocode, GB 50010) assume normality for characteristic strength and acceptance criteria. Appropriate for routine QC with controlled production.";
    tags=[{t:"Code-aligned",c:"b"},{t:"Simple",c:"b"}];
    alts=[{n:"Lognormal",d:"If the histogram shows positive skew."}];
    notes.push("Verify normality with χ² or K–S tests when n > 50.");
  }else if(s.obj==="durability"){
    dist="Lognormal + Gumbel";keys=["lognormal","gumbel"];
    reason="Lognormal for bulk variability; Gumbel for extreme deterioration events. Captures worst-case scenarios governing service-life failure.";
    tags=[{t:"Dual-model",c:"b"},{t:"EVD capable",c:"g"}];
    alts=[{n:"Fréchet",d:"For heavier right-tail phenomena."}];
  }else{
    dist="Lognormal";keys=["lognormal"];
    reason="Default general-purpose choice. Physically motivated by multiplicative processes, non-negative, and validated across normal, high-strength, and recycled aggregate concretes.";
    tags=[{t:"General purpose",c:"b"},{t:"Non-negative",c:"g"}];
    alts=[{n:"Weibull",d:"If fracture mechanics governs failure."},{n:"Normal",d:"If CoV < 10% and symmetry is confirmed."}];
  }
  if(s.n==="small")notes.push("Sample size < 50: parameter estimates may be unstable and GoF tests have low power. Consider Bayesian updating or bootstrap confidence intervals.");
  if(s.src==="mixed")notes.push("Mixed-source data: apply cluster analysis to identify homogeneous sub-populations before fitting (Croce et al., 2018).");
  if((s.src==="core"||s.src==="mixed")&&!hi)notes.push("In-situ data typically shows higher variability than reported. Verify NDT smoothing has not artificially reduced CoV.");
  if(s.mat==="alt")notes.push("Alternative concretes show non-standard dispersion. Validate with multiple GoF tests.");
  if(s.mat==="recycled")notes.push("RAC variability peaks near 50% replacement ratio, then decreases at full replacement (Zhou et al., 2025).");
  return{dist,keys,reason,tags,alts,notes};
}

/* ══════════ ILLUSTRATIVE CURVES ══════════ */
const IL={
  normal:{name:"Normal",color:"#185FA5",pdf:t=>(1/(4*Math.sqrt(2*Math.PI)))*Math.exp(-.5*((t-35)/4)**2),rng:[15,55]},
  lognormal:{name:"Lognormal",color:"#0F6E56",pdf:t=>t<=0?0:(1/(t*.3*Math.sqrt(2*Math.PI)))*Math.exp(-.5*((Math.log(t)-3.5)/.3)**2),rng:[5,70]},
  weibull:{name:"Weibull (2P)",color:"#534AB7",pdf:t=>t<=0?0:(6/36)*Math.pow(t/36,5)*Math.exp(-Math.pow(t/36,6)),rng:[.5,55]},
  burr:{name:"Burr XII",color:"#B0407A",pdf:t=>t<=0?0:(4.5*2/32)*Math.pow(t/32,3.5)*Math.pow(1+Math.pow(t/32,4.5),-3),rng:[.5,70]},
  gumbel:{name:"Gumbel",color:"#D85A30",pdf:t=>{const z=(t-38)/7;return(1/7)*Math.exp(-z-Math.exp(-z))},rng:[5,75]},
};
