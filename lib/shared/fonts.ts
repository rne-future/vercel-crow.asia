import localFont from "next/font/local";

export const crowSans = localFont({
  src: [
    { path: "../../public/fonts/crow/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2", weight: "400 800", style: "normal" },
    { path: "../../public/fonts/crow/LDIuaomQNQcsA88c7O9yZ4KMCoOg4Koz4y6qhA.woff2", weight: "400 800", style: "italic" },
  ], variable: "--font-crow-sans", display: "swap", adjustFontFallback: "Arial", fallback: ["Plus Jakarta Sans", "sans-serif"],
});
export const crowSerif = localFont({
  src: [
    { path: "../../public/fonts/crow/cY9AfjOCX1hbuyalUrK4397yjA.woff2", weight: "400 700", style: "normal" },
    { path: "../../public/fonts/crow/cY9CfjOCX1hbuyalUrK439vCjohC.woff2", weight: "400 700", style: "italic" },
  ], variable: "--font-crow-serif", display: "swap", preload: false, adjustFontFallback: "Times New Roman", fallback: ["Newsreader", "serif"],
});
export const crowMono = localFont({
  src: "../../public/fonts/crow/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwg.woff2",
  weight: "400 700", variable: "--font-crow-mono", display: "swap", preload: false, fallback: ["JetBrains Mono", "monospace"],
});
export const crowHand = localFont({
  src: "../../public/fonts/crow/LDI1apSQOAYtSuYWp8ZhfYe8XsLL.woff2",
  weight: "400", variable: "--font-crow-hand", display: "swap", preload: false, fallback: ["Patrick Hand", "cursive"],
});
