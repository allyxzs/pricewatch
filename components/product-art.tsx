import type { Kind } from '@/lib/model';
/** Original vector illustrations; no third-party image assets or tracking. */
export default function ProductArt({ kind }: { kind: Kind }) {
  return (
    <svg viewBox="0 0 240 160" className={`product-art art-${kind}`} fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={`metal-${kind}`}
          x1="60"
          y1="10"
          x2="180"
          y2="160"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#606775" />
          <stop offset=".5" stopColor="#222733" />
          <stop offset="1" stopColor="#414959" />
        </linearGradient>
        <linearGradient
          id={`white-${kind}`}
          x1="60"
          y1="10"
          x2="170"
          y2="150"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#cfd4dc" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="143" rx="65" ry="7" fill="#152134" opacity=".1" />
      {kind === 'headphones' ? (
        <g transform="rotate(-14 120 80)">
          <path d="M72 94V65C72 4 168 4 168 65v29" stroke="#272d38" strokeWidth="16" />
          <path d="M78 65C78 15 162 15 162 65" stroke="#69717e" strokeWidth="4" />
          <rect x="57" y="70" width="33" height="66" rx="15" fill={`url(#metal-${kind})`} />
          <rect x="150" y="70" width="33" height="66" rx="15" fill={`url(#metal-${kind})`} />
          <rect x="78" y="76" width="10" height="52" rx="5" fill="#111722" />
          <rect x="152" y="76" width="10" height="52" rx="5" fill="#111722" />
          <path d="M64 83v36M175 83v36" stroke="#717a87" strokeWidth="2" />
        </g>
      ) : kind === 'console' ? (
        <g>
          <path d="M102 15l42 7-6 119-37-2z" fill="#172137" />
          <path d="M99 10l17 9-8 121-20-4c8-44 9-84 11-126Z" fill={`url(#white-${kind})`} />
          <path
            d="M141 14l20 5c-10 38-10 80-6 121l-22 4c-2-44 1-88 8-130Z"
            fill={`url(#white-${kind})`}
          />
          <path d="M117 24l-8 106" stroke="#659bff" strokeWidth="2" />
          <path
            d="M61 106c4-9 27-10 32-2l11 24c2 12-8 14-16 3H66c-11 12-21 8-17-3Z"
            fill="#f7f9fc"
            stroke="#c6cedc"
          />
          <path d="M64 112v12m-6-6h12" stroke="#2e384b" strokeWidth="3" />
          <circle cx="88" cy="114" r="2" fill="#7f8aa0" />
          <circle cx="94" cy="120" r="2" fill="#7f8aa0" />
        </g>
      ) : kind === 'coffee' ? (
        <g>
          <path d="M83 28h61l11 105H74Z" fill={`url(#metal-${kind})`} />
          <rect x="91" y="23" width="47" height="22" rx="8" fill="#1b2028" />
          <path
            d="M136 35h21v80h-11"
            fill="#b5c2c2"
            fillOpacity=".6"
            stroke="#92a3a4"
            strokeWidth="2"
          />
          <rect x="89" y="49" width="45" height="38" rx="5" fill="#121820" />
          <path d="M108 77v13" stroke="#a7adb6" strokeWidth="8" />
          <path d="M94 96h34l-4 27h-25Z" fill="#e9e6db" />
          <path d="M129 101c18-3 14 18-3 14" stroke="#e9e6db" strokeWidth="5" />
          <rect x="70" y="130" width="90" height="9" rx="4" fill="#171f2a" />
          <path d="M85 136h52" stroke="#7c8790" strokeWidth="2" />
          <circle cx="122" cy="31" r="3" fill="#90d9ad" />
        </g>
      ) : kind === 'phone' ? (
        <g transform="rotate(12 120 80)">
          <rect
            x="84"
            y="13"
            width="76"
            height="128"
            rx="15"
            fill="#889ead"
            stroke="#556a7a"
            strokeWidth="2"
          />
          <rect x="91" y="22" width="28" height="49" rx="14" fill="#718695" />
          <circle cx="105" cy="36" r="10" fill="#172331" stroke="#a9bac6" strokeWidth="3" />
          <circle cx="105" cy="57" r="10" fill="#172331" stroke="#a9bac6" strokeWidth="3" />
          <circle cx="130" cy="43" r="4" fill="#f0e9d7" />
          <path
            d="M120 91c-11-8-17 4-11 15 5 8 8 3 11 3s7 5 12-4c-7-4-7-9-2-13-3-4-7-3-10-1Zm1-4c-1-6 3-8 7-9 0 5-3 8-7 9Z"
            fill="#617887"
          />
        </g>
      ) : kind === 'monitor' ? (
        <g>
          <path d="M113 112h14v25h-14" fill="#343b49" />
          <path d="M91 140h59l-22-8h-15Z" fill="#2b3444" />
          <rect x="38" y="22" width="167" height="96" rx="5" fill="#222b39" />
          <rect x="43" y="27" width="157" height="82" rx="1" fill="#182c3c" />
          <path d="M43 109V81l37-26 33 19 46-42 41 31v46Z" fill="#356a77" />
          <path d="M43 109l75-46 43 25 39-16v37Z" fill="#59a49a" />
          <path d="M43 109l80-16 39 7 38-15v24Z" fill="#a0d6bc" />
          <circle cx="122" cy="114" r="1" fill="#b9c4d4" />
        </g>
      ) : (
        <g>
          <path
            d="m120 25 54 29v60l-54 30-54-30V54Z"
            fill="#d7d4ed"
            stroke="#a69ac9"
            strokeWidth="2"
          />
          <path d="m66 54 54 31 54-31M120 85v59M94 39l53 31v19" stroke="#a69ac9" strokeWidth="3" />
        </g>
      )}
    </svg>
  );
}
