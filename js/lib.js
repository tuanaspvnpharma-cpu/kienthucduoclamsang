/* ClinPharmAI Portal – hàm thuần (không đụng DOM), dùng chung cho app.js và tests/.
   Mọi hàm ở đây phải có ca kiểm thử trong tests/lib.test.js. */
(function (root) {
  'use strict';

  var REQUIRED = ['version', 'updated', 'source', 'records'];

  /* Chuẩn hóa chuỗi để tìm kiếm không phân biệt dấu tiếng Việt và hoa/thường. */
  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* Kiểm tra schema danh mục (cùng quy tắc với scripts/validate_cdss.py). Trả về mảng lỗi. */
  function validateCatalog(obj) {
    var errs = [];
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return ['Gốc JSON phải là đối tượng'];
    REQUIRED.forEach(function (k) { if (!(k in obj)) errs.push('Thiếu trường "' + k + '"'); });
    if ('version' in obj && !/^\d+\.\d+\.\d+$/.test(String(obj.version))) errs.push('version phải dạng x.y.z');
    if ('updated' in obj && !/^\d{4}-\d{2}-\d{2}$/.test(String(obj.updated))) errs.push('updated phải dạng yyyy-mm-dd');
    if (!String(obj.source || '').trim()) errs.push('source rỗng');
    if (obj.status !== 'verified' && obj.status !== 'unverified') errs.push('status phải là verified hoặc unverified');

    var cats = Array.isArray(obj.categories) ? obj.categories : [];
    if (!cats.length) errs.push('categories phải là mảng không rỗng');
    var catIds = {};
    cats.forEach(function (c) {
      if (!c || !c.id || !c.name) errs.push('Mỗi category cần id và name');
      else if (catIds[c.id]) errs.push('category trùng: ' + c.id);
      else catIds[c.id] = true;
    });

    var recs = obj.records;
    if (!Array.isArray(recs) || !recs.length) { errs.push('records phải là mảng không rỗng'); return errs; }
    var ids = {}, files = {};
    recs.forEach(function (r, i) {
      var at = 'records[' + i + ']';
      if (!r || typeof r !== 'object') { errs.push(at + ' không phải đối tượng'); return; }
      ['id', 'file', 'label', 'title', 'category'].forEach(function (k) {
        if (!String(r[k] || '').trim()) errs.push(at + ' thiếu "' + k + '"');
      });
      if (r.id) { if (ids[r.id]) errs.push('id record trùng: ' + r.id); ids[r.id] = true; }
      if (r.file) {
        if (files[r.file]) errs.push('file trùng: ' + r.file);
        files[r.file] = true;
        if (!/\.html?$/i.test(r.file) || /[\\/]|^\.|:/.test(r.file)) errs.push(at + ' file không hợp lệ: ' + r.file);
      }
      if (r.category && !catIds[r.category]) errs.push(at + ' category không tồn tại: ' + r.category);
      if (r.tags != null && !Array.isArray(r.tags)) errs.push(at + ' tags phải là mảng');
    });
    return errs;
  }

  /* Chuỗi tìm kiếm đã chuẩn hóa của một record. */
  function haystack(r) {
    return norm([r.label, r.title, r.file].concat(r.tags || []).join(' '));
  }

  /* Lọc record: mọi từ trong truy vấn đều phải xuất hiện (AND). Truy vấn rỗng trả về tất cả. */
  function filterRecords(records, query) {
    var terms = norm(query).split(' ').filter(Boolean);
    if (!terms.length) return records.slice();
    return records.filter(function (r) {
      var h = haystack(r);
      return terms.every(function (t) { return h.indexOf(t) !== -1; });
    });
  }

  /* Nhóm record theo category, giữ thứ tự categories và thứ tự record trong tệp. */
  function groupByCategory(categories, records) {
    return categories.map(function (c) {
      return { category: c, items: records.filter(function (r) { return r.category === c.id; }) };
    });
  }

  /* Thứ tự hiển thị phẳng (theo nhóm) – dùng cho nút trước/sau. */
  function orderedRecords(categories, records) {
    return groupByCategory(categories, records).reduce(function (a, g) { return a.concat(g.items); }, []);
  }

  function neighbors(ordered, id) {
    var i = -1;
    for (var k = 0; k < ordered.length; k++) if (ordered[k].id === id) { i = k; break; }
    if (i === -1) return { prev: null, next: null };
    return { prev: i > 0 ? ordered[i - 1] : null, next: i < ordered.length - 1 ? ordered[i + 1] : null };
  }

  /* Định tuyến bằng hash: "#/p/<id>" mở trang, còn lại là trang chủ. */
  function parseRoute(hash) {
    var m = /^#\/p\/(.+)$/.exec(String(hash || ''));
    if (!m) return { view: 'home' };
    var id;
    try { id = decodeURIComponent(m[1]); } catch (e) { return { view: 'home' }; }
    return { view: 'page', id: id };
  }

  function routeFor(id) { return '#/p/' + encodeURIComponent(id); }

  /* Đường dẫn tương đối tới tệp trang (mã hóa dấu cách và ký tự tiếng Việt). */
  function pageUrl(file) { return encodeURIComponent(file); }

  /* Cập nhật danh sách "xem gần đây": đưa id lên đầu, bỏ trùng, giới hạn độ dài. */
  function pushRecent(list, id, max) {
    var out = [id];
    (Array.isArray(list) ? list : []).forEach(function (x) { if (x !== id && out.length < (max || 6)) out.push(x); });
    return out;
  }

  /* Vị trí các đoạn khớp truy vấn trong text gốc (để tô sáng), không phân biệt dấu.
     Trả về [[đầu, cuối), ...] đã gộp; [] nếu không khớp hoặc không ánh xạ được ký tự 1–1. */
  function matchRanges(text, query) {
    text = String(text == null ? '' : text);
    var terms = norm(query).split(' ').filter(Boolean);
    if (!terms.length) return [];
    var folded = '';
    for (var i = 0; i < text.length; i++) {
      var f = text[i].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
      if (f.length !== 1) return [];
      folded += f;
    }
    var ranges = [];
    terms.forEach(function (t) {
      var from = 0, at;
      while ((at = folded.indexOf(t, from)) !== -1) { ranges.push([at, at + t.length]); from = at + t.length; }
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    return merged;
  }

  /* "2026-10-25" -> "25/10/2026" */
  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || '');
  }

  var api = {
    norm: norm, validateCatalog: validateCatalog, filterRecords: filterRecords,
    groupByCategory: groupByCategory, orderedRecords: orderedRecords, neighbors: neighbors,
    parseRoute: parseRoute, routeFor: routeFor, pageUrl: pageUrl, pushRecent: pushRecent,
    matchRanges: matchRanges, formatDate: formatDate
  };
  root.CPA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
