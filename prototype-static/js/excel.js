/*
 * Importacao/exportacao local do prototipo.
 * A persistencia em localStorage e TEMPORARIA e LOCAL.
 * Na aplicacao definitiva, este modulo deve ser substituido por chamadas a API.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'scorecard-prototype-imported-data-v1';
  var STATUS = ['Dia compensado', 'Falta Injustificada', 'Falta justificada', 'Férias', 'Afastado', 'Folga', 'Hora extra', 'Saiu mais cedo', 'Atraso', 'Banco de horas', 'Horário administrativo', 'Folga aniversariante', 'Aula Teórica (Jovem Aprendiz)'];
  var SHEETS = {
    OPERADORES: ['Usuario', 'Nome', 'Perfil', 'Funcao', 'Area', 'Turno', 'Coordenador', 'Status'],
    JORNADA: ['Usuario', 'Data', 'Status', 'Horas', 'Observacao'],
    ETIQUETAS: ['Usuario', 'Data', 'NumeroEtiqueta', 'Categoria', 'Descricao', 'Status'],
    BOS: ['Usuario', 'Data', 'NumeroBOS', 'Descricao', 'Status'],
    BOSQ: ['Usuario', 'Data', 'NumeroBOSQ', 'Descricao', 'Status'],
    IDEIAS: ['Usuario', 'Data', 'Titulo', 'Descricao', 'Status', 'Resultado'],
    METAS: ['Usuario', 'Ano', 'Mes', 'Indicador', 'Meta'],
  };

  function clean(value) { return String(value == null ? '' : value).trim(); }
  function key(value) { return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function canonicalHeader(value) { return key(value).replace(/[^a-z0-9]/g, ''); }
  function normalizeRows(rows) { return rows.filter(function (row) { return row.some(function (cell) { return clean(cell) !== ''; }); }); }
  function normalizeUsername(value) { return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, ''); }

  function csvRows(text) {
    var rows = [], row = [], cell = '', quoted = false;
    for (var i = 0; i < text.length; i += 1) {
      var character = text[i], next = text[i + 1];
      if (character === '"' && quoted && next === '"') { cell += '"'; i += 1; }
      else if (character === '"') quoted = !quoted;
      else if (character === ';' && !quoted) { row.push(cell); cell = ''; }
      else if ((character === '\n' || character === '\r') && !quoted) { if (character === '\r' && next === '\n') i += 1; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += character;
    }
    row.push(cell); rows.push(row);
    return normalizeRows(rows);
  }

  function readText(file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = reject; reader.readAsText(file, 'UTF-8'); }); }
  function readBuffer(file) { return new Promise(function (resolve, reject) { var reader = new FileReader(); reader.onload = function () { resolve(reader.result); }; reader.onerror = reject; reader.readAsArrayBuffer(file); }); }

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }

  async function unzip(buffer) {
    var view = new DataView(buffer), end = Math.max(0, buffer.byteLength - 65557), eocd = -1;
    for (var i = buffer.byteLength - 22; i >= end; i -= 1) if (u32(view, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('O arquivo não possui uma estrutura XLSX válida.');
    var count = u16(view, eocd + 10), offset = u32(view, eocd + 16), files = {};
    for (var entry = 0; entry < count; entry += 1) {
      if (u32(view, offset) !== 0x02014b50) throw new Error('Índice ZIP do XLSX inválido.');
      var method = u16(view, offset + 10), compressedSize = u32(view, offset + 20), nameLength = u16(view, offset + 28), extraLength = u16(view, offset + 30), commentLength = u16(view, offset + 32), name = new TextDecoder().decode(new Uint8Array(buffer, offset + 46, nameLength)), localOffset = u32(view, offset + 42), localNameLength = u16(view, localOffset + 26), localExtraLength = u16(view, localOffset + 28), start = localOffset + 30 + localNameLength + localExtraLength, raw = new Uint8Array(buffer, start, compressedSize);
      if (method === 0) files[name] = new TextDecoder().decode(raw);
      else if (method === 8 && window.DecompressionStream) files[name] = new TextDecoder().decode(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      else throw new Error('Este navegador não consegue descompactar este XLSX.');
      offset += 46 + nameLength + extraLength + commentLength;
    }
    return files;
  }

  function xmlText(node) { return node ? node.textContent || '' : ''; }
  function columnNumber(reference) { var letters = reference.replace(/\d/g, ''), result = 0; for (var i = 0; i < letters.length; i += 1) result = result * 26 + letters.charCodeAt(i) - 64; return result - 1; }
  function serialDate(value) { var number = Number(value); if (!Number.isNaN(number) && number > 20000 && number < 70000) { var date = new Date(Date.UTC(1899, 11, 30) + number * 86400000); return String(date.getUTCDate()).padStart(2, '0') + '/' + String(date.getUTCMonth() + 1).padStart(2, '0') + '/' + date.getUTCFullYear(); } return clean(value); }

  function parseSheet(xml, sharedStrings) {
    var doc = new DOMParser().parseFromString(xml, 'application/xml'), rows = [];
    doc.querySelectorAll('sheetData > row').forEach(function (rowNode) {
      var row = [];
      rowNode.querySelectorAll(':scope > c').forEach(function (cell) {
        var ref = cell.getAttribute('r') || '', valueNode = cell.querySelector('v'), value = xmlText(valueNode), type = cell.getAttribute('t');
        if (type === 's') value = sharedStrings[Number(value)] || '';
        else if (type === 'inlineStr') value = xmlText(cell.querySelector('t'));
        else if (type === 'b') value = value === '1' ? 'TRUE' : 'FALSE';
        else if (valueNode && cell.getAttribute('s')) value = serialDate(value);
        row[columnNumber(ref)] = value;
      });
      rows.push(row.map(function (item) { return clean(item); }));
    });
    return normalizeRows(rows);
  }

  async function parseXlsx(buffer) {
    var files = await unzip(buffer), workbook = new DOMParser().parseFromString(files['xl/workbook.xml'], 'application/xml'), rels = new DOMParser().parseFromString(files['xl/_rels/workbook.xml.rels'], 'application/xml'), relationMap = {};
    rels.querySelectorAll('Relationship').forEach(function (item) { relationMap[item.getAttribute('Id')] = item.getAttribute('Target'); });
    var shared = files['xl/sharedStrings.xml'] ? Array.from(new DOMParser().parseFromString(files['xl/sharedStrings.xml'], 'application/xml').querySelectorAll('si')).map(function (item) { return xmlText(item); }) : [];
    var result = {};
    workbook.querySelectorAll('sheets > sheet').forEach(function (sheet) {
      var target = relationMap[sheet.getAttribute('r:id')];
      if (target && target[0] !== '/') target = 'xl/' + target.replace(/^\//, '');
      result[sheet.getAttribute('name').toUpperCase()] = parseSheet(files[target], shared);
    });
    return result;
  }

  async function parseFile(file) {
    if (/\.csv$/i.test(file.name)) return { OPERADORES: csvRows(await readText(file)) };
    if (/\.xls$/i.test(file.name)) return parseHtmlWorkbook(await readText(file));
    if (!/\.xlsx$/i.test(file.name)) throw new Error('Selecione um arquivo .xlsx, .xls ou .csv.');
    return parseXlsx(await readBuffer(file));
  }

  function parseHtmlWorkbook(text) {
    var doc = new DOMParser().parseFromString(text, 'text/html'), result = {};
    doc.querySelectorAll('table').forEach(function (table, index) { result['PLANILHA_' + (index + 1)] = Array.from(table.rows).map(function (row) { return Array.from(row.cells).map(function (cell) { return cell.textContent.trim(); }); }); });
    if (!Object.keys(result).length) throw new Error('Não foi possível ler as tabelas do arquivo Excel.');
    return result;
  }

  function validate(workbook, operators) {
    var errors = [], valid = [], counts = { total: 0, valid: 0, errors: 0, newRecords: 0, updates: 0, duplicates: 0 }, operatorNames = {};
    (operators || []).forEach(function (item) { if (item.username) operatorNames[normalizeUsername(item.username)] = true; });
    Object.keys(SHEETS).forEach(function (sheetName) {
      var rows = workbook[sheetName];
      if (!rows) return;
      if (!rows.length) return;
      var headers = rows[0].map(canonicalHeader), expected = SHEETS[sheetName].map(canonicalHeader);
      expected.forEach(function (header) { if (!headers.includes(header)) errors.push({ sheet: sheetName, line: 1, message: 'Coluna obrigatória ausente: ' + header }); });
      rows.slice(1).forEach(function (cells, index) {
        var line = index + 2, row = {}; headers.forEach(function (header, position) { row[header] = clean(cells[position]); }); counts.total += 1;
        if (!row.usuario && !row.username) errors.push({ sheet: sheetName, line: line, message: 'Usuário não informado.' });
        else if (sheetName !== 'OPERADORES' && Object.keys(operatorNames).length) {
          var normalizedUser = normalizeUsername(row.usuario || row.username || '');
          if (!normalizedUser || !operatorNames[normalizedUser]) errors.push({ sheet: sheetName, line: line, message: 'Usuário não encontrado: ' + (row.usuario || row.username) + '.' });
        }
        if (sheetName === 'JORNADA' && !STATUS.includes(row.status)) errors.push({ sheet: sheetName, line: line, message: 'Status "' + row.status + '" não é válido.' });
        if (['JORNADA', 'ETIQUETAS', 'BOS', 'BOSQ', 'IDEIAS'].includes(sheetName) && !validDate(row.data)) errors.push({ sheet: sheetName, line: line, message: 'Data inválida.' });
        if (sheetName === 'METAS' && !['ETIQUETAS', 'BOS', 'BOSQ', 'IDEIAS'].includes((row.indicador || '').toUpperCase())) errors.push({ sheet: sheetName, line: line, message: 'Indicador de meta não reconhecido.' });
        var rowErrors = errors.filter(function (error) { return error.sheet === sheetName && error.line === line; });
        if (!rowErrors.length) { valid.push({ sheet: sheetName, row: row, line: line }); counts.valid += 1; }
      });
    });
    counts.errors = errors.length;
    return { valid: valid, errors: errors, counts: counts };
  }

  function validDate(value) { if (!value) return false; if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return true; return !Number.isNaN(Date.parse(value)); }
  function identity(item) {
    var row = item.row, sheet = item.sheet;
    if (sheet === 'OPERADORES') return 'OPERADORES|' + normalizeUsername(row.usuario || row.username || row.nome || '');
    if (sheet === 'JORNADA') return sheet + '|' + normalizeUsername(row.usuario || row.username || '') + '|' + row.data + '|' + row.status;
    if (sheet === 'ETIQUETAS') return sheet + '|' + normalizeUsername(row.usuario || row.username || '') + '|' + row.data + '|' + row.numeroetiqueta;
    if (sheet === 'BOS') return sheet + '|' + normalizeUsername(row.usuario || row.username || '') + '|' + row.data + '|' + row.numerobos;
    if (sheet === 'BOSQ') return sheet + '|' + normalizeUsername(row.usuario || row.username || '') + '|' + row.data + '|' + row.numerobosq;
    if (sheet === 'IDEIAS') return sheet + '|' + normalizeUsername(row.usuario || row.username || '') + '|' + row.data + '|' + row.titulo;
    return sheet + '|' + normalizeUsername(row.usuario || row.username || '') + '|' + row.ano + '|' + row.mes + '|' + row.indicador;
  }

  function preview(workbook, operators, existingKeys) { var result = validate(workbook, operators), seen = {}; result.valid.forEach(function (item) { var id = identity(item); if (seen[id] || (existingKeys && existingKeys[id])) { result.counts.updates += 1; result.counts.duplicates += seen[id] ? 1 : 0; } else result.counts.newRecords += 1; seen[id] = true; }); return result; }
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { return null; } }
  function save(snapshot) { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); }

  function commit(result, target) {
    var snapshot = load() || { records: {} }, added = 0, updated = 0;
    result.valid.forEach(function (item) { var id = identity(item), wasExisting = Boolean(snapshot.records[id]); snapshot.records[id] = item; if (wasExisting) updated += 1; else added += 1; });
    save(snapshot);
    return { added: added, updated: updated, ignored: result.errors.length, errors: result.errors.length, importedAt: new Date().toLocaleString('pt-BR'), snapshot: snapshot };
  }

  function applyToData(report, target) {
    var imported = Object.keys(report.snapshot.records).map(function (id) { return report.snapshot.records[id]; });
    var importedOperators = imported.filter(function (item) { return item.sheet === 'OPERADORES'; });
    importedOperators.forEach(function (item, index) {
      var row = item.row;
      var username = normalizeUsername(row.usuario || row.username || row.nome || '');
      var operator = target.operators.find(function (current) {
        return normalizeUsername(current.username || current.name || '') === username || normalizeUsername(current.name || '') === normalizeUsername(row.nome || '');
      });
      var normalized = { id: operator ? operator.id : 'op-' + (target.operators.length + index + 1), username: username, name: row.nome, initials: clean(row.nome).split(' ').slice(0, 2).map(function (part) { return part[0]; }).join('').toUpperCase(), area: row.area, function: row.funcao, shift: row.turno, status: row.status || (operator ? operator.status : 'Ativo'), coordinator: row.coordenador || 'Michelle Faria' };
      if (operator) Object.assign(operator, normalized); else target.operators.push(normalized);
    });
    ['ETIQUETAS', 'BOS', 'BOSQ', 'IDEIAS'].forEach(function (sheet) {
      var metric = target.metrics.find(function (item) { return item.id.toUpperCase() === sheet.toLowerCase().toUpperCase(); });
      var records = imported.filter(function (item) { return item.sheet === sheet; });
      if (metric && records.length) { metric.value = String(records.length); metric.values[metric.values.length - 1] = Math.min(100, records.length); }
    });
    var importedJourney = imported.filter(function (item) { return item.sheet === 'JORNADA'; });
    if (importedJourney.length) target.journey = importedJourney.map(function (item) { return { date: item.row.data, day: '', status: item.row.status, hours: item.row.horas, note: item.row.observacao }; });
    target.importedRecords = Object.keys(report.snapshot.records).length;
  }

  function hydrate(target) {
    var snapshot = load();
    if (snapshot) applyToData({ snapshot: snapshot }, target);
  }

  function templateRows() { return Object.keys(SHEETS).map(function (name) { return '<h2>' + name + '</h2><table><tr>' + SHEETS[name].map(function (header) { return '<th>' + header + '</th>'; }).join('') + '</tr><tr>' + SHEETS[name].map(function () { return '<td></td>'; }).join('') + '</tr></table>'; }).join(''); }
  function exportExcel(name, rows) { var html = '<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:6px}th{background:#eee}</style></head><body><h1>' + name + '</h1>' + rows + '</body></html>', blob = new Blob([html], { type: 'application/vnd.ms-excel' }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = name + '.xls'; link.click(); URL.revokeObjectURL(url); }
  function downloadTemplate() { exportExcel('modelo-importacao-scorecard', templateRows()); }
  function exportSheet(sheetName) {
    var snapshot = load() || { records: {} }, headers = SHEETS[sheetName] || [], records = Object.keys(snapshot.records).map(function (id) { return snapshot.records[id]; }).filter(function (item) { return item.sheet === sheetName; });
    var rows = '<table><tr>' + headers.map(function (header) { return '<th>' + header + '</th>'; }).join('') + '</tr>' + records.map(function (item) { return '<tr>' + headers.map(function (header) { var field = canonicalHeader(header); return '<td>' + clean(item.row[field]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    exportExcel('exportacao-' + sheetName.toLowerCase(), '<h1>' + sheetName + '</h1>' + rows);
  }
  function exportAll() { var rows = '<h2>OPERADORES</h2><table><tr><th>Usuario</th><th>Nome</th><th>Área</th><th>Turno</th><th>Perfil</th></tr>' + PROTOTYPE_DATA.operators.map(function (item) { return '<tr><td>' + (item.username || '') + '</td><td>' + item.name + '</td><td>' + item.area + '</td><td>' + (item.shift || '') + '</td><td>' + (item.function || item.jobTitle || 'Operador de Processos') + '</td></tr>'; }).join('') + '</table>'; exportExcel('exportacao-scorecard', rows); }

  window.EXCEL_IMPORT = { SHEETS: SHEETS, STATUS: STATUS, parseFile: parseFile, validate: validate, preview: preview, commit: commit, applyToData: applyToData, hydrate: hydrate, load: load, downloadTemplate: downloadTemplate, exportAll: exportAll, exportSheet: exportSheet };
}());
