// 경품 응모 번호를 받아 이 스프레드시트의 '응모' 시트에 쌓는다. prototype/promo.html의 ENTRY_URL이 이 웹 앱 주소.
// 설정: 구글 시트 새로 만들기 → 확장 프로그램 > Apps Script → 이 코드 붙여넣기 → 배포 > 새 배포 > 웹 앱
//       (실행: 나, 액세스: 모든 사용자) → 나온 /exec 주소를 ENTRY_URL에 넣는다.
// 엑셀 받기: 시트에서 파일 > 다운로드 > Microsoft Excel(.xlsx)
//
// 방명록 그림(guestbook.html)도 여기로 온다: 구글 드라이브 '남강유향 방명록' 폴더에 이미지로 저장하고 '방명록' 시트에 한 줄 남긴다.
// 이 부분을 추가한 뒤에는 배포 > 배포 관리 > 연필(수정) > 버전: 새 버전 > 배포 (주소는 그대로). 드라이브 권한 승인 창이 뜨면 허용.
function doPost(e) {
  const p = e.parameter;
  if (p.type === 'drawing') return saveDrawing(p);
  const digits = String(p.phone || '').replace(/\D/g, '');
  if (!/^01[016789]\d{7,8}$/.test(digits) || p.agree !== 'Y') return ContentService.createTextOutput('invalid');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('응모') || ss.insertSheet('응모');
    if (sheet.getLastRow() === 0) sheet.appendRow(['응모 시각', '휴대전화', '게임', '개인정보 동의']);
    const phone = digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
    const seen = sheet.getLastRow() > 1 ? sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat() : [];
    if (seen.includes(phone)) return ContentService.createTextOutput('duplicate'); // 1인 1회
    // 앞의 '는 0으로 시작하는 번호가 숫자로 바뀌지 않게 한다
    sheet.appendRow([new Date(), "'" + phone, String(p.game || '').slice(0, 20), 'Y']);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

function saveDrawing(p) {
  const data = String(p.image || '');
  const m = data.match(/^data:image\/(jpeg|png);base64,(.+)$/);
  if (!m || data.length > 3000000) return ContentService.createTextOutput('invalid');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const folders = DriveApp.getFoldersByName('남강유향 방명록');
    const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder('남강유향 방명록');
    const name = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmmss') + '.' + (m[1] === 'png' ? 'png' : 'jpg');
    const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), 'image/' + m[1], name));
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('방명록') || ss.insertSheet('방명록');
    if (sheet.getLastRow() === 0) sheet.appendRow(['남긴 시각', '그림 파일']);
    sheet.appendRow([new Date(), file.getUrl()]);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}
