/* Ca kiểm thử cho js/lib.js.
   Chạy trong trình duyệt: mở tests/index.html qua máy chủ (serve.ps1).
   Chạy bằng Node (nếu có): node tests/lib.test.js */
(function (root) {
  'use strict';
  var C = root.CPA || (typeof require === 'function' ? require('../js/lib.js') : null);
  var results = [];
  function eq(name, actual, expected) {
    var a = JSON.stringify(actual), e = JSON.stringify(expected);
    results.push({ name: name, ok: a === e, detail: a === e ? '' : 'nhận ' + a + ', mong đợi ' + e });
  }

  // --- norm: không dấu, không phân biệt hoa/thường ---
  eq('norm bỏ dấu tiếng Việt', C.norm('Đái Tháo Đường'), 'dai thao duong');
  eq('norm gộp khoảng trắng, cắt hai đầu', C.norm('  kháng   sinh '), 'khang sinh');
  eq('norm null/undefined -> rỗng', [C.norm(null), C.norm(undefined)], ['', '']);
  eq('norm tổ hợp dấu rời (NFD) giống dựng sẵn (NFC)', C.norm('hồ'), C.norm('hồ'));

  // --- filterRecords ---
  var recs = [
    { id: 'a', label: 'Statin (7 thuốc)', title: 'So sánh statin', file: 'a.html', tags: ['lipid'] },
    { id: 'b', label: 'GINA 2026 · Hen', title: 'Điều trị hen', file: 'b.html', tags: ['hô hấp'] },
    { id: 'c', label: 'Meronem IV', title: 'Meronem', file: 'c.html', tags: ['kháng sinh', 'carbapenem'] }
  ];
  eq('lọc rỗng trả về tất cả', C.filterRecords(recs, '').length, 3);
  eq('lọc chỉ khoảng trắng trả về tất cả', C.filterRecords(recs, '   ').length, 3);
  eq('lọc không dấu khớp có dấu (ho hap)', C.filterRecords(recs, 'ho hap').map(function (r) { return r.id; }), ['b']);
  eq('lọc theo tag', C.filterRecords(recs, 'carbapenem').map(function (r) { return r.id; }), ['c']);
  eq('lọc nhiều từ là AND', C.filterRecords(recs, 'khang carbapenem').length, 1);
  eq('lọc nhiều từ không cùng record -> rỗng', C.filterRecords(recs, 'statin hen').length, 0);
  eq('lọc hoa/thường', C.filterRecords(recs, 'STATIN').length, 1);
  eq('lọc không làm đổi mảng gốc', recs.length, 3);

  // --- groupByCategory / orderedRecords / neighbors ---
  var cats = [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }];
  var rs = [{ id: '1', category: 'y' }, { id: '2', category: 'x' }, { id: '3', category: 'y' }];
  eq('nhóm giữ thứ tự category', C.groupByCategory(cats, rs).map(function (g) { return g.category.id + ':' + g.items.length; }), ['x:1', 'y:2']);
  var ord = C.orderedRecords(cats, rs);
  eq('thứ tự phẳng theo nhóm', ord.map(function (r) { return r.id; }), ['2', '1', '3']);
  eq('neighbors đầu danh sách', [C.neighbors(ord, '2').prev, C.neighbors(ord, '2').next.id], [null, '1']);
  eq('neighbors cuối danh sách', [C.neighbors(ord, '3').prev.id, C.neighbors(ord, '3').next], ['1', null]);
  eq('neighbors id không tồn tại', C.neighbors(ord, 'zz'), { prev: null, next: null });

  // --- định tuyến ---
  eq('route rỗng -> home', C.parseRoute(''), { view: 'home' });
  eq('route "#/" -> home', C.parseRoute('#/'), { view: 'home' });
  eq('route trang', C.parseRoute('#/p/gina-2026-hen'), { view: 'page', id: 'gina-2026-hen' });
  eq('route mã hóa hai chiều', C.parseRoute(C.routeFor('a b/ç')), { view: 'page', id: 'a b/ç' });
  eq('route mã hóa hỏng -> home (không ném lỗi)', C.parseRoute('#/p/%E0%A4%A'), { view: 'home' });
  eq('pageUrl mã hóa dấu cách và tiếng Việt', C.pageUrl('Guideline đái tháo.html'), 'Guideline%20%C4%91%C3%A1i%20th%C3%A1o.html');

  // --- pushRecent ---
  eq('recent đưa lên đầu và bỏ trùng', C.pushRecent(['a', 'b', 'c'], 'b', 6), ['b', 'a', 'c']);
  eq('recent giới hạn độ dài', C.pushRecent(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
  eq('recent từ giá trị hỏng', C.pushRecent(null, 'a', 6), ['a']);

  // --- matchRanges (tô sáng) ---
  eq('tô sáng không dấu', C.matchRanges('Đái tháo đường', 'thao'), [[4, 8]]);
  eq('tô sáng nhiều từ, gộp đoạn chồng', C.matchRanges('statin statin', 'stat tatin'), [[0, 6], [7, 13]]);
  eq('tô sáng truy vấn rỗng', C.matchRanges('abc', ''), []);
  eq('tô sáng không khớp', C.matchRanges('abc', 'x'), []);

  // --- formatDate ---
  eq('định dạng ngày', C.formatDate('2026-10-25'), '25/10/2026');
  eq('ngày sai định dạng giữ nguyên', C.formatDate('25/10/2026'), '25/10/2026');

  // --- validateCatalog ---
  var good = {
    version: '1.0.0', updated: '2026-10-25', source: '1. Nguồn.', status: 'unverified',
    categories: [{ id: 'g', name: 'G' }],
    records: [{ id: 'r1', category: 'g', file: 'a b.html', label: 'L', title: 'T', tags: [] }]
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  eq('catalog hợp lệ -> không lỗi', C.validateCatalog(good), []);
  var bad1 = clone(good); delete bad1.source;
  eq('thiếu source -> lỗi', C.validateCatalog(bad1).length > 0, true);
  var bad2 = clone(good); bad2.version = '1.0';
  eq('version sai -> lỗi', C.validateCatalog(bad2).length > 0, true);
  var bad3 = clone(good); bad3.records.push(clone(good.records[0])); bad3.records[1].file = 'x.html';
  eq('id trùng -> lỗi', C.validateCatalog(bad3).some(function (e) { return e.indexOf('trùng') !== -1; }), true);
  var bad4 = clone(good); bad4.records[0].file = '../secret.html';
  eq('file có đường dẫn -> lỗi', C.validateCatalog(bad4).length > 0, true);
  var bad5 = clone(good); bad5.records[0].category = 'zz';
  eq('category không tồn tại -> lỗi', C.validateCatalog(bad5).length > 0, true);
  var bad6 = clone(good); bad6.records = [];
  eq('records rỗng -> lỗi', C.validateCatalog(bad6).length > 0, true);
  var bad7 = clone(good); bad7.status = 'ok';
  eq('status lạ -> lỗi', C.validateCatalog(bad7).length > 0, true);
  eq('gốc không phải đối tượng -> lỗi', C.validateCatalog([]).length > 0, true);

  root.LIB_TEST_RESULTS = results;
  if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') {
    var fail = results.filter(function (r) { return !r.ok; });
    results.forEach(function (r) { console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' | ' + r.detail)); });
    console.log('\nTổng: ' + (results.length - fail.length) + ' đạt, ' + fail.length + ' lỗi');
    process.exitCode = fail.length ? 1 : 0;
  }
})(typeof window !== 'undefined' ? window : globalThis);
