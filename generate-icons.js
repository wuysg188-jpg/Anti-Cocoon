// generate-icons.js — 运行此脚本生成 PWA 图标
// 使用方法: node generate-icons.js

const fs = require('fs');

// 创建简单的 SVG 图标
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#0f172a"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#3b82f6" stroke-width="24"/>
  <circle cx="256" cy="256" r="80" fill="#3b82f6"/>
  <text x="256" y="280" font-size="80" fill="white" text-anchor="middle" font-family="Arial">AC</text>
</svg>`;

fs.writeFileSync('public/icon.svg', svgIcon);

console.log('已生成 SVG 图标: public/icon.svg');
console.log('请使用在线工具将 SVG 转换为 192x192 和 512x512 的 PNG');
console.log('或运行: npx svg2png public/icon.svg --output=public/icon-192.png --width=192 --height=192');
