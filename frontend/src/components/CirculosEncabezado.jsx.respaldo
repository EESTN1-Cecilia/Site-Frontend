import { useId } from "react";

export default function CirculosEncabezado({ variante = "inscripcion" }) {
  const id = useId();
  const disco = `${id}-disco`;
  const rayas = `${id}-rayas`;

  return (
    <svg className="pagina__circulos" viewBox="0 0 311 138" aria-hidden="true">
      <defs>
        <linearGradient id={disco} x2="1" y2="1">
          <stop stopColor="var(--rojo-suave)" />
          <stop offset=".48" stopColor="var(--rojo-secundario)" />
          <stop offset="1" stopColor="var(--bordo-oscuro)" />
        </linearGradient>
        <pattern id={rayas} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M2 0v8" stroke="var(--rojo-suave)" strokeWidth="4" />
        </pattern>
      </defs>
      {variante === "evaluacion" && (
        <>
          <g fill="none" stroke="var(--rojo-suave)" strokeWidth=".65">
            <circle cx="169" cy="85" r="46" />
            <circle cx="258" cy="52" r="38" strokeDasharray="2 3" />
            <circle cx="113" cy="110" r="19" />
            <circle cx="223" cy="12" r="17" />
            <circle cx="306" cy="78" r="10" strokeDasharray="1 2" />
          </g>
          <circle cx="291" cy="122" r="21" fill={`url(#${rayas})`} />
          <circle cx="123" cy="34" r="5" fill={`url(#${disco})`} />
          <circle cx="225" cy="108" r="4" fill="var(--rojo-suave)" />
          <circle cx="205" cy="129" r="6" fill={`url(#${disco})`} />
          <circle cx="300" cy="27" r="3" fill="var(--rojo-suave)" />
          <g stroke="var(--rojo-claro)" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round">
            <g transform="translate(169 85) rotate(-23)">
              <path d="M-33 2 16-15 36-5 29 12-21 26-36 17Z" fill="var(--bordo-oscuro)" />
              <circle cx="-19" cy="20" r="10" fill="var(--bordo-oscuro)" />
              <circle cx="18" cy="12" r="9" fill="var(--bordo-oscuro)" />
              <circle cx="-19" cy="20" r="5" fill="var(--rojo-suave)" />
              <circle cx="18" cy="12" r="4" fill="var(--rojo-suave)" />
              <path d="M-36 0-19-18 23-21 39-9 25 1-21 15Z" fill={`url(#${disco})`} />
              <path d="m20-20 19 11-9 13-11-5 6-7-12-9z" fill="var(--rojo-secundario)" />
              <path d="m-15-10 21-6 8 5-20 7z" fill="var(--bordo-oscuro)" />
              <path d="m-10-10 7 4m-1-6 7 4m-1-6 7 4M-20 4q8 3 14-7m14-9q8-6 15 0" fill="none" />
            </g>
            <g transform="translate(258 52)">
              <path d="M-12-7 4 9l-7 24h16l-6-4 5-21L0-10Z" fill={`url(#${disco})`} />
              <path d="M-19 32h35v6h-35zM-24-8l9-16 22 9-4 17z" fill={`url(#${disco})`} />
              <path d="M-24-8 3 2l-4 6-23-10z" fill="var(--bordo-oscuro)" />
              <path d="m-21 3-3 5m11-2-3 5m11-2-3 5" fill="none" />
            </g>
          </g>
        </>
      )}
      {variante === "trayectorias" && (
        <>
          <circle cx="263" cy="29" r="53" fill={`url(#${disco})`} />
          <g fill="none" stroke="var(--rojo-suave)" strokeWidth=".7">
            <circle cx="256" cy="34" r="58" />
            <circle cx="156" cy="98" r="33" />
            <circle cx="156" cy="98" r="29" />
            <circle cx="303" cy="116" r="12" strokeDasharray="2 2" />
          </g>
          <circle cx="219" cy="125" r="24" fill={`url(#${rayas})`} />
          <circle cx="187" cy="28" r="9" fill={`url(#${disco})`} />
          <circle cx="125" cy="46" r="4" fill="var(--rojo-suave)" />
          <circle cx="202" cy="76" r="5" fill="var(--rojo-suave)" />
        </>
      )}
      {variante === "comunidad" && (
        <>
          <g fill="none" stroke="var(--rojo-suave)" strokeWidth=".7">
            <circle cx="277" cy="106" r="48" />
            <circle cx="277" cy="106" r="38" />
            <circle cx="277" cy="106" r="27" strokeDasharray="1 3" />
            <circle cx="137" cy="112" r="26" strokeDasharray="3 3" />
            <circle cx="221" cy="39" r="13" />
          </g>
          <circle cx="177" cy="21" r="28" fill={`url(#${disco})`} />
          <circle cx="177" cy="21" r="19" fill="none" stroke="var(--rojo-claro)" strokeOpacity=".35" />
          <circle cx="206" cy="100" r="17" fill={`url(#${rayas})`} />
          <circle cx="109" cy="59" r="7" fill="var(--rojo-suave)" />
          <circle cx="249" cy="28" r="5" fill={`url(#${disco})`} />
          <circle cx="163" cy="76" r="3" fill="var(--rojo-claro)" />
          <circle cx="238" cy="62" r="3.5" fill="var(--rojo-suave)" />
        </>
      )}
      {variante === "inscripcion" && (
        <>
          <g fill="none" stroke="var(--rojo-suave)" strokeWidth=".65">
          <circle cx="74" cy="149" r="65" />
          <circle cx="258" cy="130" r="65" />
            <circle cx="247" cy="-1" r="45" />
            <circle cx="172" cy="65" r="16" />
        </g>
          <circle cx="244" cy="-1" r="39" fill={`url(#${rayas})`} />
        <g fill={`url(#${disco})`}>
          <circle cx="92" cy="0" r="21" />
          <circle cx="269" cy="127" r="64" />
            <circle cx="169" cy="67" r="15" />
          <circle cx="130" cy="43" r="6" />
          <circle cx="85" cy="85" r="3.5" />
          <circle cx="171" cy="120" r="4.5" />
          <circle cx="184" cy="19" r="3.5" />
          <circle cx="221" cy="47" r="3.5" />
          <circle cx="152" cy="11" r="2" />
          <circle cx="304" cy="45" r="2" />
        </g>
        </>
      )}
    </svg>
  );
}
