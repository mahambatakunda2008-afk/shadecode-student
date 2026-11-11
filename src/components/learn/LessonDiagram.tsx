"use client";

import type { ReactNode } from "react";

type Props = { kind: string; title?: string };

const colors = { axis: "currentColor", line: "#0f766e", point: "#b45309", muted: "#64748b", fill: "#ccfbf1" };

function CoordinatePlane() {
  return <svg viewBox="0 0 520 300" role="img" aria-label="Coordinate plane showing a straight line through two points and the horizontal and vertical changes used to calculate gradient" className="lesson-diagram-svg">
    <defs><marker id="coord-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={colors.axis}/></marker></defs>
    <g stroke="currentColor" opacity=".12">{Array.from({length:9},(_,i)=><line key={"v"+i} x1={70+i*45} y1="25" x2={70+i*45} y2="250"/>)}{Array.from({length:5},(_,i)=><line key={"h"+i} x1="55" y1={40+i*45} x2="450" y2={40+i*45}/>)}</g>
    <path d="M55 250 H465 M70 265 V20" stroke={colors.axis} strokeWidth="1.5" markerEnd="url(#coord-arrow)"/>
    <path d="M115 220 L385 58" stroke={colors.line} strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M160 193 L340 85" stroke={colors.point} strokeWidth="2" strokeDasharray="6 5"/>
    <path d="M160 193 V85 H340" stroke={colors.muted} strokeWidth="2" strokeDasharray="5 4" fill="none"/>
    <circle cx="160" cy="193" r="5.5" fill={colors.point}/><circle cx="340" cy="85" r="5.5" fill={colors.point}/>
    <text x="132" y="216" fontSize="13" fill="currentColor">A(x₁,y₁)</text><text x="347" y="78" fontSize="13" fill="currentColor">B(x₂,y₂)</text>
    <text x="230" y="108" fontSize="13" fill={colors.muted}>Δx</text><text x="173" y="142" fontSize="13" fill={colors.muted}>Δy</text>
    <text x="462" y="272" fontSize="13" fill="currentColor">x</text><text x="51" y="24" fontSize="13" fill="currentColor">y</text>
    <text x="70" y="286" fontSize="12" fill={colors.muted}>Gradient m = change in y ÷ change in x</text>
  </svg>;
}
function Waves() {
  const points = Array.from({length:181},(_,i)=>{const x=28+i*2.55;const y=115-53*Math.sin(i*Math.PI/45);return `${i===0?"M":"L"}${x.toFixed(1)},${y.toFixed(1)}`;}).join(" ");
  return <svg viewBox="0 0 520 230" role="img" aria-label="Transverse wave showing amplitude from equilibrium to crest and wavelength between crests" className="lesson-diagram-svg">
    <path d="M20 115 H500" stroke={colors.muted} strokeDasharray="5 5" strokeWidth="1.5"/><path d={points} fill="none" stroke={colors.line} strokeWidth="3.5" strokeLinecap="round"/>
    <path d="M85 115 V62 M79 68 L85 60 L91 68 M79 109 L85 117 L91 109" stroke={colors.point} strokeWidth="2" fill="none"/>
    <text x="95" y="78" fontSize="13" fill={colors.point}>Amplitude</text>
    <path d="M85 181 H315 M85 174 V188 M315 174 V188" stroke={colors.point} strokeWidth="2" fill="none"/>
    <text x="164" y="202" fontSize="14" fill={colors.point}>Wavelength λ</text>
    <text x="23" y="135" fontSize="12" fill={colors.muted}>Equilibrium</text><text x="22" y="22" fontSize="13" fill="currentColor">Displacement</text><text x="427" y="219" fontSize="13" fill="currentColor">Distance →</text>
  </svg>;
}
function ForcePairs() {
  return <svg viewBox="0 0 520 245" role="img" aria-label="Newton's third law diagram showing equal and opposite forces acting on two different objects" className="lesson-diagram-svg">
    <rect x="48" y="75" width="150" height="82" rx="12" fill={colors.fill} stroke={colors.line} strokeWidth="2"/><rect x="322" y="75" width="150" height="82" rx="12" fill="#ffedd5" stroke={colors.point} strokeWidth="2"/>
    <text x="123" y="111" textAnchor="middle" fontSize="16" fill="#134e4a" fontWeight="700">Object A</text><text x="123" y="133" textAnchor="middle" fontSize="12" fill="#134e4a">pushes B →</text>
    <text x="397" y="111" textAnchor="middle" fontSize="16" fill="#7c2d12" fontWeight="700">Object B</text><text x="397" y="133" textAnchor="middle" fontSize="12" fill="#7c2d12">← pushes A</text>
    <path d="M205 61 H310 M301 54 L311 61 L301 68" stroke={colors.line} strokeWidth="3" fill="none"/><path d="M315 178 H210 M219 171 L209 178 L219 185" stroke={colors.point} strokeWidth="3" fill="none"/>
    <text x="258" y="43" textAnchor="middle" fontSize="12" fill={colors.line}>Force on B</text><text x="260" y="203" textAnchor="middle" fontSize="12" fill={colors.point}>Force on A</text>
    <text x="260" y="230" textAnchor="middle" fontSize="13" fill="currentColor">Equal magnitude • opposite directions • different objects</text>
  </svg>;
}
function UnitCircle() {
  return <svg viewBox="0 0 520 300" role="img" aria-label="Unit circle showing a point at angle theta with horizontal coordinate cosine theta and vertical coordinate sine theta" className="lesson-diagram-svg">
    <circle cx="255" cy="145" r="95" fill="none" stroke={colors.line} strokeWidth="3"/>
    <path d="M115 145 H395 M255 265 V25" stroke={colors.axis} strokeWidth="1.5"/>
    <path d="M255 145 L327 83" stroke={colors.point} strokeWidth="2.5"/>
    <path d="M255 145 H327 V83" stroke={colors.muted} strokeWidth="1.8" strokeDasharray="5 4" fill="none"/>
    <path d="M286 145 A31 31 0 0 0 278 125" stroke={colors.point} strokeWidth="2" fill="none"/>
    <circle cx="327" cy="83" r="5" fill={colors.point}/>
    <text x="287" y="124" fontSize="14" fill={colors.point}>θ</text>
    <text x="337" y="74" fontSize="13" fill="currentColor">(cos θ, sin θ)</text>
    <text x="281" y="164" fontSize="13" fill={colors.muted}>cos θ</text>
    <text x="326" y="120" fontSize="13" fill={colors.muted}>sin θ</text>
    <text x="400" y="139" fontSize="13" fill="currentColor">x</text><text x="263" y="22" fontSize="13" fill="currentColor">y</text>
    <text x="255" y="288" textAnchor="middle" fontSize="13" fill={colors.muted}>For a unit circle: x² + y² = 1</text>
  </svg>;
}
function BinaryPlaceValues() {
  const powers = [7,6,5,4,3,2,1,0];
  const bits = [1,0,1,1,0,1,1,0];
  return <svg viewBox="0 0 560 210" role="img" aria-label="Binary place value table showing powers of two and the example bits 10110110" className="lesson-diagram-svg">
    <text x="24" y="28" fontSize="14" fill="currentColor">Place value</text>
    {powers.map((p,i)=><g key={p}>
      <rect x={20+i*65} y="42" width="60" height="48" rx="7" fill={colors.fill} stroke={colors.line}/>
      <text x={50+i*65} y="71" textAnchor="middle" fontSize="14" fill="#134e4a">{2**p}</text>
      <rect x={20+i*65} y="100" width="60" height="40" rx="7" fill={bits[i] ? "#ffedd5" : "transparent"} stroke={bits[i] ? colors.point : colors.muted}/>
      <text x={50+i*65} y="126" textAnchor="middle" fontSize="17" fill={bits[i] ? "#7c2d12" : "currentColor"} fontWeight="700">{bits[i]}</text>
    </g>)}
    <text x="24" y="166" fontSize="13" fill={colors.muted}>Binary number: 10110110₂</text>
    <text x="24" y="190" fontSize="13" fill="currentColor">128 + 32 + 16 + 4 + 2 = 182₁₀</text>
  </svg>;
}

function ParticleModel() {
  const states = [
    { title: "Solid", points: [[35,50],[60,50],[85,50],[35,75],[60,75],[85,75],[35,100],[60,100],[85,100]] },
    { title: "Liquid", points: [[190,47],[220,56],[245,43],[202,78],[232,82],[252,72],[188,103],[219,110],[248,101]] },
    { title: "Gas", points: [[345,35],[405,63],[460,39],[370,92],[445,110],[395,125]] },
  ];
  return <svg viewBox="0 0 520 180" role="img" aria-label="Particle model comparing closely packed ordered particles in a solid, close but irregular particles in a liquid, and widely spaced particles in a gas" className="lesson-diagram-svg">
    {states.map((state,i)=><g key={state.title}>
      <rect x={10+i*165} y="18" width="150" height="125" rx="12" fill="none" stroke="currentColor" opacity=".28"/>
      <text x={85+i*165} y="165" textAnchor="middle" fontSize="14" fill="currentColor" fontWeight="700">{state.title}</text>
      {state.points.map(([x,y],j)=><circle key={j} cx={x+i*165} cy={y} r="6" fill={i===0?colors.line:i===1?colors.point:colors.muted} opacity=".9"/>)}
    </g>)}
  </svg>;
}
function CellStructure() {
  return <svg viewBox="0 0 540 280" role="img" aria-label="Simplified plant cell diagram with cell wall, cell membrane, nucleus, chloroplasts and large central vacuole labelled" className="lesson-diagram-svg">
    <rect x="36" y="28" width="330" height="220" rx="28" fill="#dcfce7" stroke="#166534" strokeWidth="5"/>
    <rect x="48" y="40" width="306" height="196" rx="22" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2"/>
    <rect x="122" y="68" width="150" height="140" rx="25" fill="#bfdbfe" stroke="#2563eb" strokeWidth="2"/>
    <circle cx="92" cy="91" r="22" fill="#ddd6fe" stroke="#7c3aed" strokeWidth="2"/><circle cx="92" cy="91" r="7" fill="#7c3aed"/>
    {[0,1,2,3].map(i=><g key={i}><ellipse cx={72+i*65} cy={207-(i%2)*26} rx="17" ry="8" fill="#86efac" stroke="#15803d" strokeWidth="1.5"/><path d={`M${60+i*65} ${207-(i%2)*26} q12 -9 24 0 q-12 9 -24 0`} fill="none" stroke="#15803d"/></g>)}
    <path d="M36 53 H8 V44" stroke="currentColor" strokeWidth="1.5" fill="none"/><text x="8" y="35" fontSize="12" fill="currentColor">Cell wall</text>
    <path d="M52 63 H14 V83" stroke="currentColor" strokeWidth="1.5" fill="none"/><text x="8" y="98" fontSize="12" fill="currentColor">Membrane</text>
    <path d="M92 69 V22 H135" stroke="currentColor" strokeWidth="1.5" fill="none"/><text x="140" y="26" fontSize="12" fill="currentColor">Nucleus</text>
    <path d="M272 118 H395 V92" stroke="currentColor" strokeWidth="1.5" fill="none"/><text x="400" y="88" fontSize="12" fill="currentColor">Vacuole</text>
    <path d="M267 203 H395 V190" stroke="currentColor" strokeWidth="1.5" fill="none"/><text x="400" y="186" fontSize="12" fill="currentColor">Chloroplasts</text>
    <text x="200" y="141" textAnchor="middle" fontSize="14" fill="#1e40af" fontWeight="700">Large vacuole</text>
  </svg>;
}
function Flowchart() {
  return <svg viewBox="0 0 520 300" role="img" aria-label="Algorithm flowchart with start, input, process, decision, and output steps connected by directional arrows" className="lesson-diagram-svg">
    <defs><marker id="flow-arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill={colors.axis}/></marker></defs>
    <rect x="190" y="10" width="140" height="34" rx="17" fill={colors.fill} stroke={colors.line} strokeWidth="2"/>
    <text x="260" y="32" textAnchor="middle" fontSize="13" fill="#134e4a">START</text>
    <path d="M260 44 V64" stroke={colors.axis} strokeWidth="1.8" markerEnd="url(#flow-arrow)"/>
    <path d="M205 66 H315 L330 92 L315 118 H205 L190 92 Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="2"/>
    <text x="260" y="96" textAnchor="middle" fontSize="13" fill="#1e40af">INPUT value</text>
    <path d="M260 118 V139" stroke={colors.axis} strokeWidth="1.8" markerEnd="url(#flow-arrow)"/>
    <rect x="185" y="141" width="150" height="38" rx="4" fill="#ffedd5" stroke={colors.point} strokeWidth="2"/>
    <text x="260" y="165" textAnchor="middle" fontSize="13" fill="#7c2d12">PROCESS value</text>
    <path d="M260 179 V195" stroke={colors.axis} strokeWidth="1.8" markerEnd="url(#flow-arrow)"/>
    <path d="M260 196 L322 226 L260 256 L198 226 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="2"/>
    <text x="260" y="230" textAnchor="middle" fontSize="12" fill="#78350f">Condition?</text>
    <path d="M322 226 H400 V266" stroke={colors.axis} strokeWidth="1.8" markerEnd="url(#flow-arrow)" fill="none"/>
    <text x="345" y="216" fontSize="12" fill="currentColor">Yes</text>
    <path d="M198 226 H120 V266" stroke={colors.axis} strokeWidth="1.8" markerEnd="url(#flow-arrow)" fill="none"/>
    <text x="150" y="216" fontSize="12" fill="currentColor">No</text>
    <rect x="65" y="267" width="110" height="27" rx="13" fill="none" stroke={colors.line} strokeWidth="2"/><text x="120" y="285" textAnchor="middle" fontSize="11" fill="currentColor">OUTPUT / END</text>
    <rect x="345" y="267" width="110" height="27" rx="13" fill="none" stroke={colors.line} strokeWidth="2"/><text x="400" y="285" textAnchor="middle" fontSize="11" fill="currentColor">OUTPUT / END</text>
  </svg>;
}
function SeriesCircuit() {
  return <svg viewBox="0 0 520 250" role="img" aria-label="Simple series circuit with a battery and two lamps in one closed loop, showing that the same current passes through both lamps" className="lesson-diagram-svg">
    <path d="M100 55 H205 M255 55 H365 V190 H100 V55" stroke={colors.axis} strokeWidth="3" fill="none"/>
    <circle cx="230" cy="55" r="25" fill="#fef3c7" stroke={colors.point} strokeWidth="2.5"/><path d="M213 38 L247 72 M247 38 L213 72" stroke={colors.point} strokeWidth="2"/>
    <circle cx="365" cy="122" r="25" fill="#fef3c7" stroke={colors.point} strokeWidth="2.5"/><path d="M348 105 L382 139 M382 105 L348 139" stroke={colors.point} strokeWidth="2"/>
    <path d="M100 55 V107 M100 139 V190" stroke={colors.axis} strokeWidth="3"/>
    <path d="M80 107 H120 M88 139 H112" stroke={colors.line} strokeWidth="4"/>
    <text x="132" y="32" fontSize="13" fill="currentColor">Lamp 1</text><text x="397" y="126" fontSize="13" fill="currentColor">Lamp 2</text><text x="38" y="128" fontSize="12" fill="currentColor">Cell</text>
    <path d="M150 55 H182 M175 48 L183 55 L175 62 M365 155 V176 M358 168 L365 177 L372 168" stroke={colors.line} strokeWidth="2" fill="none"/>
    <text x="245" y="224" textAnchor="middle" fontSize="14" fill={colors.muted}>One path: current is the same at every point in series</text>
  </svg>;
}

function RootBracket() {
  const f = (x:number) => x*x*x-x-2;
  const pts = Array.from({length:101},(_,i)=>{const x=1+i/100;const y=f(x);const px=50+i*4.2;const py=178-y*23;return `${i===0?"M":"L"}${px.toFixed(1)},${py.toFixed(1)}`;}).join(" ");
  return <svg viewBox="0 0 520 250" role="img" aria-label="Graph of a continuous function crossing the x-axis between x equals one and x equals two, illustrating root bracketing" className="lesson-diagram-svg">
    <path d="M35 180 H490 M50 220 V28" stroke={colors.axis} strokeWidth="1.5"/>
    <path d={pts} fill="none" stroke={colors.line} strokeWidth="3.5"/>
    <path d="M50 180 V196 M470 180 V196" stroke={colors.point} strokeWidth="2"/>
    <path d="M50 212 H470 M50 206 V218 M470 206 V218" stroke={colors.point} strokeWidth="2"/>
    <text x="50" y="198" textAnchor="middle" fontSize="13" fill="currentColor">1</text><text x="470" y="198" textAnchor="middle" fontSize="13" fill="currentColor">2</text>
    <text x="260" y="235" textAnchor="middle" fontSize="14" fill={colors.point}>Root is bracketed in (1, 2)</text><text x="62" y="35" fontSize="13" fill="currentColor">f(x)</text><text x="482" y="174" fontSize="13" fill="currentColor">x</text>
  </svg>;
}


function ScarcityChoiceFlow() {
  return <svg viewBox="0 0 600 250" role="img" aria-label="Flow diagram: limited resources relative to competing wants create scarcity; scarcity requires choice; choosing one option means giving up the next best alternative, which is the opportunity cost." className="lesson-diagram-svg">
    <defs><marker id="scarcity-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill={colors.line}/></marker></defs>
    {[[18,"Scarce resources"],[218,"Choice"],[418,"Opportunity cost"]].map(([x,label],i)=><g key={String(label)}><rect x={Number(x)} y="65" width="164" height="86" rx="14" fill={i===2?"#ffedd5":"#ccfbf1"} stroke={i===2?colors.point:colors.line} strokeWidth="2"/><text x={Number(x)+82} y="101" textAnchor="middle" fontSize="15" fontWeight="700" fill={i===2?"#7c2d12":"#134e4a"}>{String(label)}</text><text x={Number(x)+82} y="124" textAnchor="middle" fontSize="11" fill={i===2?"#7c2d12":"#134e4a"}>{["Resources are limited","Select an option","Next best forgone"][i]}</text></g>)}
    <path d="M184 108 H208 M201 101 L209 108 L201 115 M384 108 H408 M401 101 L409 108 L401 115" stroke={colors.line} strokeWidth="2.5" fill="none"/>
    <text x="300" y="202" textAnchor="middle" fontSize="13" fill="currentColor">Scarcity → choice → the value of the next best alternative forgone</text>
  </svg>;
}
function ProductionPossibilityCurve() {
  return <svg viewBox="0 0 600 340" role="img" aria-label="Illustrative production possibility curve bowed outward between consumer goods and capital goods. A point on the curve is productively efficient, a point inside is inefficient or underused resources, and a point outside is currently unattainable." className="lesson-diagram-svg">
    <path d="M76 278 H550 M76 278 V28" stroke={colors.axis} strokeWidth="2"/>
    <path d="M105 70 C175 125 290 218 495 258" stroke={colors.line} strokeWidth="4" fill="none"/>
    <path d="M105 70 C175 125 290 218 495 258 L495 278 L105 278 Z" fill="#ccfbf1" opacity=".22"/>
    <circle cx="286" cy="188" r="6" fill={colors.point}/><text x="299" y="185" fontSize="13" fill="currentColor">A: on curve</text>
    <circle cx="260" cy="238" r="6" fill={colors.point}/><text x="273" y="243" fontSize="13" fill="currentColor">B: inside</text>
    <circle cx="420" cy="125" r="6" fill="#b91c1c"/><text x="432" y="128" fontSize="13" fill="currentColor">C: outside</text>
    <text x="300" y="321" textAnchor="middle" fontSize="14" fill="currentColor">Consumer goods →</text><text x="22" y="25" fontSize="13" fill="currentColor">Capital goods</text>
    <text x="330" y="55" fontSize="11" fill={colors.muted}>Illustrative curve, not measured data</text>
  </svg>;
}
function CeterisParibusModel() {
  return <svg viewBox="0 0 600 300" role="img" aria-label="Ceteris paribus model: change one variable, hold other relevant influences constant, then isolate the predicted relationship. Example: price rises, other demand determinants held constant, quantity demanded falls." className="lesson-diagram-svg">
    <rect x="20" y="72" width="160" height="104" rx="12" fill="#ccfbf1" stroke={colors.line} strokeWidth="2"/>
    <rect x="220" y="72" width="160" height="104" rx="12" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="2"/>
    <rect x="420" y="72" width="160" height="104" rx="12" fill="#ffedd5" stroke={colors.point} strokeWidth="2"/>
    <text x="100" y="104" textAnchor="middle" fontSize="15" fontWeight="700" fill="#134e4a">Change one</text><text x="100" y="128" textAnchor="middle" fontSize="12" fill="#134e4a">Price of the good</text>
    <text x="300" y="104" textAnchor="middle" fontSize="15" fontWeight="700" fill="#312e81">Hold others</text><text x="300" y="128" textAnchor="middle" fontSize="12" fill="#312e81">Income, tastes, etc.</text>
    <text x="500" y="104" textAnchor="middle" fontSize="15" fontWeight="700" fill="#7c2d12">Isolate effect</text><text x="500" y="128" textAnchor="middle" fontSize="12" fill="#7c2d12">Quantity demanded</text>
    <path d="M182 124 H212 M205 117 L213 124 L205 131 M382 124 H412 M405 117 L413 124 L405 131" stroke={colors.axis} strokeWidth="2.5" fill="none"/>
    <text x="300" y="224" textAnchor="middle" fontSize="13" fill="currentColor">Example: price rises → quantity demanded falls</text>
    <text x="300" y="248" textAnchor="middle" fontSize="12" fill={colors.muted}>Prediction assumes other relevant demand determinants are unchanged.</text>
  </svg>;
}
function FactorsOfProductionModel() {
  return <svg viewBox="0 0 600 340" role="img" aria-label="Four factors of production feed into goods and services: land is natural resources and earns rent; labour is human effort and earns wages; capital is man-made productive assets and earns interest; enterprise organises resources and bears risk, earning profit." className="lesson-diagram-svg">
    {[[18,35,"LAND","Natural resources","Rent"],[310,35,"LABOUR","Human effort","Wages"],[18,185,"CAPITAL","Produced assets","Interest"],[310,185,"ENTERPRISE","Organises and bears risk","Profit"]].map(([x,y,h,b,r])=><g key={String(h)}><rect x={Number(x)} y={Number(y)} width="260" height="105" rx="12" fill={h==="ENTERPRISE"?"#ffedd5":"#ccfbf1"} stroke={h==="ENTERPRISE"?colors.point:colors.line} strokeWidth="2"/><text x={Number(x)+130} y={Number(y)+28} textAnchor="middle" fontSize="15" fontWeight="700" fill={h==="ENTERPRISE"?"#7c2d12":"#134e4a"}>{String(h)}</text><text x={Number(x)+130} y={Number(y)+53} textAnchor="middle" fontSize="12" fill={h==="ENTERPRISE"?"#7c2d12":"#134e4a"}>{String(b)}</text><text x={Number(x)+130} y={Number(y)+80} textAnchor="middle" fontSize="12" fill={h==="ENTERPRISE"?"#7c2d12":"#134e4a"}>Reward: {String(r)}</text></g>)}
    <path d="M150 142 V163 H300 M440 142 V163 H300 M150 185 V163 M440 185 V163" stroke={colors.axis} strokeWidth="1.8" fill="none"/>
    <text x="300" y="325" textAnchor="middle" fontSize="14" fill="currentColor">Combined inputs produce goods and services</text>
  </svg>;
}

function EconomicTimeHorizons() {
  return <svg viewBox="0 0 600 250" role="img" aria-label="Three economic time horizons shown from narrow to broad adjustment: short run has at least one fixed factor; long run allows all factors to vary; very long run also allows technology and wider productive conditions to change. No fixed calendar durations are implied." className="lesson-diagram-svg">
    <path d="M42 126 H558" stroke={colors.axis} strokeWidth="2"/>
    {[[42,130,"SHORT RUN","At least one factor fixed"],[230,150,"LONG RUN","All factors can vary"],[450,108,"VERY LONG RUN","Technology and structural conditions can change"]].map(([x,w,title,desc])=><g key={String(title)}><rect x={Number(x)} y="52" width={Number(w)} height="148" rx="12" fill={title==="VERY LONG RUN"?"#ffedd5":"#ccfbf1"} stroke={title==="VERY LONG RUN"?colors.point:colors.line} strokeWidth="2"/><text x={Number(x)+Number(w)/2} y="91" textAnchor="middle" fontSize="14" fontWeight="700" fill={title==="VERY LONG RUN"?"#7c2d12":"#134e4a"}>{String(title)}</text><text x={Number(x)+Number(w)/2} y="122" textAnchor="middle" fontSize="11" fill={title==="VERY LONG RUN"?"#7c2d12":"#134e4a"}>{String(desc)}</text></g>)}
    <text x="300" y="232" textAnchor="middle" fontSize="12" fill={colors.muted}>Conceptual sequence, not a scale of fixed calendar time</text>
  </svg>;
}

function ResourceAllocationQuestions() {
  return <svg viewBox="0 0 600 240" role="img" aria-label="Three connected economic resource allocation questions: what to produce, how to produce, and for whom to produce." className="lesson-diagram-svg">
    {[[15,"WHAT?","Which goods and services?"],[215,"HOW?","Which methods and inputs?"],[415,"FOR WHOM?","How is output distributed?"]].map(([x,h,b])=><g key={String(h)}><rect x={Number(x)} y="50" width="170" height="115" rx="14" fill="#ccfbf1" stroke={colors.line} strokeWidth="2"/><text x={Number(x)+85} y="92" textAnchor="middle" fontSize="17" fontWeight="700" fill="#134e4a">{String(h)}</text><text x={Number(x)+85} y="122" textAnchor="middle" fontSize="12" fill="#134e4a">{String(b)}</text></g>)}
    <path d="M185 108 H208 M201 101 L209 108 L201 115 M385 108 H408 M401 101 L409 108 L401 115" stroke={colors.line} strokeWidth="2.5" fill="none"/>
    <text x="300" y="208" textAnchor="middle" fontSize="13" fill="currentColor">Every economic system must address all three.</text>
  </svg>;
}
function PositiveNormativeClaims() {
  return <svg viewBox="0 0 600 260" role="img" aria-label="Comparison of positive statements, which are testable against evidence, and normative statements, which express what ought to happen and depend on value judgements." className="lesson-diagram-svg">
    <rect x="18" y="35" width="270" height="170" rx="14" fill="#ccfbf1" stroke={colors.line} strokeWidth="2"/>
    <rect x="312" y="35" width="270" height="170" rx="14" fill="#ffedd5" stroke={colors.point} strokeWidth="2"/>
    <text x="153" y="72" textAnchor="middle" fontSize="17" fontWeight="700" fill="#134e4a">POSITIVE</text>
    <text x="153" y="104" textAnchor="middle" fontSize="13" fill="#134e4a">What is / what may happen</text>
    <text x="153" y="137" textAnchor="middle" fontSize="12" fill="#134e4a">Can be tested with evidence</text>
    <text x="153" y="169" textAnchor="middle" fontSize="11" fill="#134e4a">Example: A tax cut raises disposable income.</text>
    <text x="447" y="72" textAnchor="middle" fontSize="17" fontWeight="700" fill="#7c2d12">NORMATIVE</text>
    <text x="447" y="104" textAnchor="middle" fontSize="13" fill="#7c2d12">What ought to happen</text>
    <text x="447" y="137" textAnchor="middle" fontSize="12" fill="#7c2d12">Depends on value judgements</text>
    <text x="447" y="169" textAnchor="middle" fontSize="11" fill="#7c2d12">Example: The tax cut is fair.</text>
    <text x="300" y="238" textAnchor="middle" fontSize="12" fill={colors.muted}>Positive does not mean true or good; normative does not mean unsupported.</text>
  </svg>;
}
function EconomicsInquiryCycle() {
  return <svg viewBox="0 0 600 260" role="img" aria-label="Economics as a social science: observe economic behaviour and data, form a hypothesis or model, compare predictions with evidence, then revise the explanation." className="lesson-diagram-svg">
    {[[15,"OBSERVE","People, firms and data"],[215,"MODEL","Hypothesis and assumptions"],[415,"TEST","Compare with evidence"]].map(([x,h,b])=><g key={String(h)}><rect x={Number(x)} y="55" width="170" height="105" rx="14" fill="#ccfbf1" stroke={colors.line} strokeWidth="2"/><text x={Number(x)+85} y="96" textAnchor="middle" fontSize="16" fontWeight="700" fill="#134e4a">{String(h)}</text><text x={Number(x)+85} y="124" textAnchor="middle" fontSize="11" fill="#134e4a">{String(b)}</text></g>)}
    <path d="M185 108 H208 M201 101 L209 108 L201 115 M385 108 H408" stroke={colors.line} strokeWidth="2.5" fill="none"/>
    <path d="M500 165 V207 H100 V166 M107 174 L100 165 L93 174" stroke={colors.point} strokeWidth="2" fill="none"/>
    <text x="300" y="232" textAnchor="middle" fontSize="12" fill={colors.muted}>Revise the explanation when evidence challenges the model.</text>
  </svg>;
}

function PpcShifts() {
  return <svg viewBox="0 0 560 270" role="img" aria-label="Two production possibility frontiers. Moving from point A to B along the original frontier changes the output mix without changing productive capacity. An outward frontier shows increased productive capacity; an inward frontier shows reduced capacity." className="lesson-diagram-svg">
    <path d="M55 220 H510 M55 220 V22" stroke={colors.axis} strokeWidth="1.5" fill="none"/>
    <path d="M75 205 Q145 52 270 45" stroke={colors.muted} strokeWidth="3" fill="none" strokeDasharray="7 5"/>
    <path d="M75 205 Q190 28 390 20" stroke={colors.line} strokeWidth="4" fill="none"/>
    <path d="M75 205 Q125 102 205 85" stroke={colors.point} strokeWidth="3" fill="none" strokeDasharray="6 5"/>
    <circle cx="145" cy="117" r="5" fill={colors.line}/><circle cx="245" cy="57" r="5" fill={colors.line}/>
    <path d="M151 111 L237 64" stroke={colors.line} strokeWidth="2" strokeDasharray="4 4"/>
    <text x="130" y="139" fontSize="12" fill="currentColor">A</text><text x="250" y="53" fontSize="12" fill="currentColor">B</text>
    <text x="310" y="45" fontSize="13" fill={colors.line}>Outward: capacity rises</text>
    <text x="80" y="183" fontSize="12" fill={colors.point}>Inward: capacity falls</text>
    <text x="320" y="248" fontSize="13" fill="currentColor">Good X →</text><text x="12" y="24" fontSize="13" fill="currentColor">Good Y</text>
    <text x="65" y="263" fontSize="11" fill={colors.muted}>Illustrative frontier shapes, not measured data</text>
  </svg>;
}

function EconomicSystemsComparison() {
  const columns = [
    { x: 14, title: "MARKET", decision: "Consumers and firms", method: "Prices, demand and supply", distribution: "Purchasing power", fill: "#ccfbf1", stroke: colors.line, ink: "#134e4a" },
    { x: 210, title: "PLANNED", decision: "Central authority", method: "Plans and directives", distribution: "Administrative priorities", fill: "#dbeafe", stroke: "#2563eb", ink: "#1e40af" },
    { x: 406, title: "MIXED", decision: "Markets and government", method: "Prices plus public policy", distribution: "Purchasing power and public provision", fill: "#ffedd5", stroke: colors.point, ink: "#7c2d12" },
  ];
  return <svg viewBox="0 0 600 290" role="img" aria-label="Comparison of market, planned and mixed economies: market decisions are made mainly by consumers and firms and coordinated by prices; planned decisions are directed by a central authority using plans; mixed economies combine market decisions with government policy. Distribution mechanisms also differ." className="lesson-diagram-svg">
    {columns.map((item) => <g key={item.title}>
      <rect x={item.x} y="18" width="180" height="226" rx="12" fill={item.fill} stroke={item.stroke} strokeWidth="2"/>
      <text x={item.x+90} y="49" textAnchor="middle" fontSize="15" fontWeight="700" fill={item.ink}>{item.title}</text>
      <text x={item.x+90} y="84" textAnchor="middle" fontSize="11" fontWeight="700" fill={item.ink}>WHO DECIDES?</text>
      <text x={item.x+90} y="105" textAnchor="middle" fontSize="11" fill={item.ink}>{item.decision}</text>
      <text x={item.x+90} y="143" textAnchor="middle" fontSize="11" fontWeight="700" fill={item.ink}>HOW COORDINATED?</text>
      <text x={item.x+90} y="164" textAnchor="middle" fontSize="11" fill={item.ink}>{item.method}</text>
      <text x={item.x+90} y="202" textAnchor="middle" fontSize="11" fontWeight="700" fill={item.ink}>FOR WHOM?</text>
      <text x={item.x+90} y="222" textAnchor="middle" fontSize="10" fill={item.ink}>{item.distribution}</text>
    </g>)}
    <text x="300" y="273" textAnchor="middle" fontSize="12" fill={colors.muted}>Ideal types for comparison; real economies can combine mechanisms.</text>
  </svg>;
}

export default function LessonDiagram({ kind, title }: Props) {
  let graphic: ReactNode;
  switch (kind.trim().toLowerCase()) {
    case "coordinate-plane": graphic = <CoordinatePlane />; break;
    case "wave-shape": graphic = <Waves />; break;
    case "force-pairs": graphic = <ForcePairs />; break;
    case "root-bracket": graphic = <RootBracket />; break;
    case "scarcity-choice-flow": graphic = <ScarcityChoiceFlow />; break;
    case "production-possibility-curve": graphic = <ProductionPossibilityCurve />; break;
    case "ceteris-paribus-model": graphic = <CeterisParibusModel />; break;
    case "factors-of-production-model": graphic = <FactorsOfProductionModel />; break;
    case "economic-time-horizons": graphic = <EconomicTimeHorizons />; break;
    case "resource-allocation-questions": graphic = <ResourceAllocationQuestions />; break;
    case "positive-normative-claims": graphic = <PositiveNormativeClaims />; break;
    case "economics-inquiry-cycle": graphic = <EconomicsInquiryCycle />; break;
    case "economic-systems-comparison": graphic = <EconomicSystemsComparison />; break;
    case "ppc-shifts": graphic = <PpcShifts />; break;
    case "unit-circle": graphic = <UnitCircle />; break;
    case "binary-place-values": graphic = <BinaryPlaceValues />; break;
    case "particle-model": graphic = <ParticleModel />; break;
    case "cell-structure": graphic = <CellStructure />; break;
    case "flowchart": graphic = <Flowchart />; break;
    case "series-circuit": graphic = <SeriesCircuit />; break;
    default: return <div className="lesson-diagram-fallback">Visual aid: {title || kind}. Use the labelled relationships in the section above to interpret the diagram.</div>;
  }
  return <figure className="lesson-diagram"><div className="lesson-diagram-frame">{graphic}</div>{title && <figcaption>{title}</figcaption>}</figure>;
}
