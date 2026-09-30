// 경품 응모 번호를 받아 이 스프레드시트의 '응모' 시트에 쌓는다. prototype/promo.html의 ENTRY_URL이 이 웹 앱 주소.
// 설정: 구글 시트 새로 만들기 → 확장 프로그램 > Apps Script → 이 코드 붙여넣기 → 배포 > 새 배포 > 웹 앱
//       (실행: 나, 액세스: 모든 사용자) → 나온 /exec 주소를 ENTRY_URL에 넣는다.
// 엑셀 받기: 시트에서 파일 > 다운로드 > Microsoft Excel(.xlsx)
function doPost(e) {
  const p = e.parameter;
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
