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

export default function LessonDiagram({ kind, title }: Props) {
  let graphic: ReactNode;
  switch (kind.trim().toLowerCase()) {
    case "coordinate-plane": graphic = <CoordinatePlane />; break;
    case "wave-shape": graphic = <Waves />; break;
    case "force-pairs": graphic = <ForcePairs />; break;
    case "root-bracket": graphic = <RootBracket />; break;
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
