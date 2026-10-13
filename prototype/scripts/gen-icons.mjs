// 홈 화면 앱(PWA) 아이콘: 타이틀 키아트에서 '남강유향' 글씨 부분을 정사각형으로 잘라 만든다. 실행: node scripts/gen-icons.mjs
import sharp from 'sharp';
const src = 'public/assets/title.jpg'; // 1600×900
const square = () => sharp(src).extract({ left: 400, top: 100, width: 800, height: 800 });
await square().resize(512).png().toFile('public/icon-512.png');
await square().resize(192).png().toFile('public/icon-192.png');
await square().resize(180).png().toFile('public/apple-touch-icon.png');
// 마스커블: 둥글게 잘려도 글씨가 남도록 가운데 80%에 넣는다
const inner = await square().resize(410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 3, background: '#040506' } })
  .composite([{ input: inner, gravity: 'center' }]).png().toFile('public/icon-maskable-512.png');
console.log('icons ok');
