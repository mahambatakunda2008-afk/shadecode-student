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
    <path d="M350 145 L320 88" stroke={colors.point} strokeWidth="2.5"/>
    <path d="M350 145 V145 H320 V88" stroke={colors.muted} strokeWidth="1.8" strokeDasharray="5 4" fill="none"/>
    <path d="M286 145 A31 31 0 0 0 270 118" stroke={colors.point} strokeWidth="2" fill="none"/>
    <circle cx="320" cy="88" r="5" fill={colors.point}/>
    <text x="287" y="124" fontSize="14" fill={colors.point}>θ</text>
    <text x="326" y="82" fontSize="13" fill="currentColor">(cos θ, sin θ)</text>
    <text x="331" y="164" fontSize="13" fill={colors.muted}>cos θ</text>
    <text x="263" y="106" fontSize="13" fill={colors.muted}>sin θ</text>
    <text x="400" y="139" fontSize="13" fill="currentColor">x</text><text x="263" y="22" fontSize="13" fill="currentColor">y</text>
    <text x="255" y="288" textAnchor="middle" fontSize="13" fill={colors.muted}>For a unit circle: x² + y² = 1</text>
  </svg>;
}
function BinaryPlaceValues() {
  const powers = [7,6,5,4,3,2,1,0];
  const bits = [1,0,1,1,0,1,1,0];
  return <svg viewBox="0 0 560 210" role="img" aria-label="Binary place value table showing powers of two and the example bits 10110101" className="lesson-diagram-svg">
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
    case "root-bracket": graphic = <RootBracket />; break;\n    case "unit-circle": graphic = <UnitCircle />; break;\n    case "binary-place-values": graphic = <BinaryPlaceValues />; break;
    default: return <div className="lesson-diagram-fallback">Visual aid: {title || kind}. Use the labelled relationships in the section above to interpret the diagram.</div>;
  }
  return <figure className="lesson-diagram"><div className="lesson-diagram-frame">{graphic}</div>{title && <figcaption>{title}</figcaption>}</figure>;
}
