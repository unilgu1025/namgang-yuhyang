// 구글 Apps Script 웹 앱(apps-script/Code.gs) 주소. 응모 번호와 방명록 그림을 받아 구글 시트·드라이브에 쌓는다.
export const ENTRY_URL = 'https://script.google.com/macros/s/AKfycbxuhepBDbRmRDtxawGGGMRWj-W-JWsFC5Fa2MTo4bbDWXPbrOmY2ZnyBHNulBQqkT8B/exec';

/** 폼 데이터로 보내고 스크립트의 답(ok·duplicate·invalid …)을 돌려준다 */
export async function send(data: Record<string, string>) {
  const res = await fetch(ENTRY_URL, { method: 'POST', body: new URLSearchParams(data) });
  return (await res.text()).trim();
}
