const paths={
 play:'m8 5 11 7-11 7z',pause:'M8 5v14M16 5v14',stop:'M6 6h12v12H6z',step:'m5 5 10 7-10 7zM19 5v14',
 plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',close:'m6 6 12 12M18 6 6 18',
 cube:'m12 3 9 5v8l-9 5-9-5V8zM3 8l9 5 9-5M12 13v8',scene:'M4 4h16v16H4zM4 15l5-5 5 5 3-3 3 3M15 8h.01',
 code:'m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 grid:'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',magnet:'M5 4v9a7 7 0 0 0 14 0V4h-5v9a2 2 0 0 1-4 0V4zM5 8h5M14 8h5',
 target:'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M8 8h8v8H8z',move:'M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4',
 undo:'M9 4 4 9l5 5M4 9h9a7 7 0 0 1 7 7',redo:'m15 4 5 5-5 5M20 9h-9a7 7 0 0 0-7 7',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
 folder:'M3 7V4h7l2 3h9v13H3z',file:'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6',
 book:'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zm0 0v15',
 help:'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 check:'m5 12 4 4L19 6',trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',copy:'M8 8h13v13H8zM16 8V3H3v13h5',
 more:'M5 12h.01M12 12h.01M19 12h.01',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 physics:'M12 3v18M3 12h18m-6-6 3 3-3 3m-6 6-3-3 3-3',collider:'M4 4h16v16H4zM4 8V4h4M16 20h4v-4',
 camera:'M3 6h12v12H3zM15 10l6-4v12l-6-4',image:'M3 3h18v18H3zM3 16l6-6 5 5 3-3 4 4M16 7h.01',
 terminal:'m4 6 6 6-6 6M13 18h7',warning:'m12 3 10 18H2zM12 9v5M12 17h.01',info:'M12 10v7M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 arrow:'M4 12h16m-6-6 6 6-6 6',spark:'m12 3 2 6 7 3-7 3-2 6-2-6-7-3 7-3z',settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
 circle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',flag:'M5 21V3l14 3-4 5-10-2',bolt:'m13 2-9 12h7l-1 8L21 9h-8z',
 external:'M14 3h7v7M10 14 21 3M10 3H3v18h18v-7',reset:'M3 11a9 9 0 1 1 2 7M3 4v7h7'
};
export const icon=(name,size=16)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.cube}"/></svg>`;
