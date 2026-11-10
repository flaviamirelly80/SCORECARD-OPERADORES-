/* Leitura centralizada dos dados importados e aplicacao dos filtros do portal. */
(function () {
  'use strict';

  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var IMPORTED_DATA_KEYS = ['scorecard-prototype-imported-data-v1', 'scorecard-imported-data-v1', 'scorecard-imported-data'];
  var cachedRaw = null;
  var cachedSnapshot = null;
  var remoteSnapshot = null;

  function normalizeUsuario(value) {
    return window.EXCEL_IMPORT.normalizeUsuario(value);
  }

  function normalizeArea(value) {
    return String(value == null ? '' : value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function field(row, names) {
    if (!row) return undefined;
    var keys = Object.keys(row);
    for (var index = 0; index < names.length; index += 1) {
      var expected = normalizeText(names[index]).replace(/[^a-z0-9]/g, '');
      for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
        if (normalizeText(keys[keyIndex]).replace(/[^a-z0-9]/g, '') === expected) return row[keys[keyIndex]];
      }
    }
    return undefined;
  }

  function normalizeRow(row) {
    var normalized = {};
    Object.keys(row || {}).forEach(function (key) {
      normalized[normalizeText(key).replace(/[^a-z0-9]/g, '')] = row[key];
    });
    return normalized;
  }

  function readSnapshotFromStorage() {
    for (var index = 0; index < IMPORTED_DATA_KEYS.length; index += 1) {
      var key = IMPORTED_DATA_KEYS[index];
      var raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.records && typeof parsed.records === 'object') return parsed;
        console.warn('Estrutura de dados importados inválida ignorada:', key);
      }
      catch (error) { console.warn('Dados importados inválidos ignorados:', key, error); }
    }
    return null;
  }

  function snapshot() {
    if (window.PORTAL_API && window.PORTAL_API.enabled()) return remoteSnapshot || { records: {} };
    var raw = readSnapshotFromStorage();
    var nextSnapshot = raw && raw.records ? raw : { records: {} };
    var serialized = JSON.stringify(nextSnapshot);
    if (serialized !== cachedRaw) {
      cachedRaw = serialized;
      cachedSnapshot = nextSnapshot;
    }
    return cachedSnapshot || { records: {} };
  }

  function importedRows(sheet) {
    var records = snapshot().records || {};
    return Object.keys(records).map(function (id) {
      return records[id];
    }).filter(function (item) {
      return item && item.sheet === sheet;
    });
  }

  function hasImportedData() {
    return Object.keys(snapshot().records || {}).length > 0;
  }

  function getOperators() {
    var imported = importedRows('OPERADORES').map(function (item) {
      var row = item.row || {};
      var username = normalizeUsuario(field(row, ['Usuario', 'username']));
      var account = window.USER_SERVICE.getAll().find(function (user) {
        return normalizeUsuario(user.externalId || user.username) === username;
      });
      var profile = normalizeText(field(row, ['Perfil', 'role']));
      var role = profile.indexOf('coordenador') >= 0 || profile === 'coordinator' ? 'coordinator' : profile === 'operator' || profile.indexOf('operador') >= 0 ? 'operator' : account ? account.role : 'operator';
      return {
        id: item.userId || (account && account.id) || username,
        username: username,
        name: field(row, ['Nome', 'name']) || (account && account.name) || username,
        initials: String(field(row, ['Nome', 'name']) || '').trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase(),
        area: field(row, ['Area', 'Área', 'area']) || '',
        function: field(row, ['Funcao', 'Função', 'function']) || '',
        jobTitle: field(row, ['Funcao', 'Função', 'jobTitle']) || '',
        shift: field(row, ['Turno', 'shift']) || '',
        role: role,
        status: field(row, ['Status', 'status']) || 'Ativo',
        coordinator: field(row, ['Coordenador', 'coordinator']) || ''
      };
    });
    if (imported.length) return imported.filter(function (operator) { return operator.role === 'operator'; });
    if (window.PORTAL_API && window.PORTAL_API.enabled()) return [];
    if (hasImportedData()) return [];
    return (window.PROTOTYPE_DATA.operators || []).filter(function (operator) { return operator.role !== 'coordinator'; });
  }

  function rowsOrFallback(sheet, fallback) {
    var records = importedRows(sheet);
    if (hasImportedData() || (window.PORTAL_API && window.PORTAL_API.enabled())) return records.map(function (item) { return Object.assign(normalizeRow(item.row), { userId: item.userId || '' }); });
    return fallback || [];
  }

  function getAttendance() {
    return rowsOrFallback('JORNADA', (window.PROTOTYPE_DATA.journey || []).map(function (row) {
      return { data: row.date, status: row.status, horas: row.hours, observacao: row.note };
    }));
  }

  function getLabels() {
    if (hasImportedData() || (window.PORTAL_API && window.PORTAL_API.enabled())) return rowsOrFallback('ETIQUETAS');
    return (window.PROTOTYPE_DATA.labels || []).map(function (row) {
      var operator = (window.PROTOTYPE_DATA.operators || []).find(function (item) { return item.id === row.userId; });
      return { usuario: operator && operator.username, data: row.date, categoria: row.category, status: row.status, quantidade: row.count, userId: row.userId };
    });
  }

  function getBos() { return rowsOrFallback('BOS'); }
  function getBosq() { return rowsOrFallback('BOSQ'); }

  function getIdeas() {
    if (hasImportedData() || (window.PORTAL_API && window.PORTAL_API.enabled())) return rowsOrFallback('IDEIAS');
    var ideas = window.PROTOTYPE_DATA.ideas || {};
    return Array.from({ length: Number(ideas.registered || 0) }, function (_, index) {
      return { id: 'demo-idea-' + index, status: index < Number(ideas.implemented || 0) ? 'IMPLEMENTADA' : 'ABERTA' };
    });
  }

  function getGoals() { return rowsOrFallback('METAS'); }

  function parsePortalDate(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 20000 && value < 70000) {
        var serial = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
        return new Date(serial.getUTCFullYear(), serial.getUTCMonth(), serial.getUTCDate());
      }
      var timestamp = new Date(Math.abs(value) >= 1000000000 && Math.abs(value) < 100000000000 ? value * 1000 : value);
      return Number.isNaN(timestamp.getTime()) ? null : timestamp;
    }
    if (typeof value !== 'string' || !value.trim()) return null;
    var input = value.trim();
    var br = input.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\s.*)?$/);
    if (br) {
      var day = Number(br[1]);
      var month = Number(br[2]);
      var year = Number(br[3]);
      var brazilian = new Date(year, month - 1, day);
      return brazilian.getFullYear() === year && brazilian.getMonth() === month - 1 && brazilian.getDate() === day ? brazilian : null;
    }
    if (/^\d{5}(?:\.\d+)?$/.test(input)) return parsePortalDate(Number(input));
    if (/^\d{10}$/.test(input)) return new Date(Number(input) * 1000);
    if (/^\d{13}$/.test(input)) return new Date(Number(input));
    var iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
    if (iso) {
      var isoDate = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return isoDate.getFullYear() === Number(iso[1]) && isoDate.getMonth() === Number(iso[2]) - 1 && isoDate.getDate() === Number(iso[3]) ? isoDate : null;
    }
    var parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function monthNumber(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return value >= 1 && value <= 12 ? value : null;
    var text = normalizeText(value);
    if (/^\d{1,2}$/.test(text)) {
      var numericMonth = Number(text);
      return numericMonth >= 1 && numericMonth <= 12 ? numericMonth : null;
    }
    var matches = MONTHS.map(function (month, index) { return text === month || text === month.substring(0, 3) ? index + 1 : null; }).filter(function (month) { return month != null; });
    return matches.length ? matches[0] : null;
  }

  function selectedUser(filters) {
    var value = normalizeUsuario(filters && filters.selectedUser);
    return value === 'TODOS' || value === 'TODAS' ? '' : value;
  }

  function resolveAreaUsers(area, operators) {
    if (!area || area === 'TODAS') return null;
    var normalizedArea = normalizeArea(area);
    var users = Object.create(null);
    (operators || getOperators()).forEach(function (operator) {
      var username = normalizeUsuario(operator && (operator.username || operator.usuario || operator.Usuario));
      if (username && normalizeArea(operator && (operator.area || operator.Area)) === normalizedArea) users[username] = true;
    });
    return users;
  }

  function resolveUserFromRow(row, operatorMap, accountsById) {
    var usuario = normalizeUsuario(field(row, ['Usuario', 'username']));
    var userId = field(row, ['userId']);
    if (!usuario && userId) {
      usuario = normalizeUsuario(accountsById[userId] || ((operatorMap[userId] && operatorMap[userId].username) || ''));
    }
    return usuario;
  }

  function applyFilters(records, filters, operators) {
    filters = filters || {};
    var user = selectedUser(filters);
    var area = normalizeArea(filters.selectedArea);
    var month = filters.selectedMonth;
    var year = filters.selectedYear;
    var accountsById = Object.create(null);
    var operatorMap = Object.create(null);
    var filteredOperators = operators || getOperators();
    window.USER_SERVICE.getAll().forEach(function (account) { accountsById[account.id] = account.username; });
    filteredOperators.forEach(function (operator) {
      if (operator && operator.id) operatorMap[operator.id] = operator;
      var username = normalizeUsuario(operator && (operator.username || operator.usuario));
      if (operator && operator.id && !operatorMap[operator.id].username && username) operatorMap[operator.id].username = username;
    });
    var usersInArea = resolveAreaUsers(filters.selectedArea, filteredOperators);

    return (records || []).filter(function (row) {
      var usuario = resolveUserFromRow(row, operatorMap, accountsById);
      if (user && usuario !== user) return false;
      if (area && area !== 'TODAS' && !(usersInArea && usersInArea[usuario])) return false;

      var rowYear = field(row, ['Ano', 'year', 'anoMeta']);
      var rowMonth = field(row, ['Mes', 'month', 'mesMeta']);
      var rawDate = field(row, ['Data', 'date']);

      if (rowYear != null && rowMonth != null && !rawDate) {
        if (year && normalizeText(year) !== 'todos' && Number(rowYear) !== Number(year)) return false;
        if (month && normalizeText(month) !== 'todos os meses' && monthNumber(rowMonth) !== monthNumber(month)) return false;
        return true;
      }

      var date = parsePortalDate(rawDate);
      if (month && normalizeText(month) !== 'todos os meses') {
        if (!date || date.getMonth() + 1 !== monthNumber(month)) return false;
      }
      if (year && normalizeText(year) !== 'todos') {
        if (!date || date.getFullYear() !== Number(year)) return false;
      }
      return true;
    });
  }

  function availableYears() {
    var records = snapshot().records || {};
    var years = Object.keys(records).reduce(function (all, id) {
      var item = records[id];
      var row = item && item.row ? item.row : null;
      var date = row && parsePortalDate(field(row, ['Data', 'date']));
      if (date && all.indexOf(String(date.getFullYear())) < 0) all.push(String(date.getFullYear()));
      if (item && item.sheet === 'METAS' && row && row.ano && all.indexOf(String(row.ano)) < 0) all.push(String(row.ano));
      return all;
    }, []);
    return years.sort(function (left, right) { return Number(right) - Number(left); });
  }

  function collectionCounts() {
    var records = snapshot().records || {};
    return Object.keys(records).reduce(function (counts, id) {
      var item = records[id];
      if (item && item.sheet) counts[item.sheet] = (counts[item.sheet] || 0) + 1;
      return counts;
    }, { OPERADORES: 0, JORNADA: 0, ETIQUETAS: 0, BOS: 0, BOSQ: 0, IDEIAS: 0, METAS: 0 });
  }

  window.PORTAL_DATA_SERVICE = {
    getOperators: getOperators,
    getAttendance: getAttendance,
    getLabels: getLabels,
    getBos: getBos,
    getBosq: getBosq,
    getIdeas: getIdeas,
    getGoals: getGoals,
    hasImportedData: hasImportedData,
    availableYears: availableYears,
    collectionCounts: collectionCounts,
    parsePortalDate: parsePortalDate,
    normalizeUsuario: normalizeUsuario,
    normalizeArea: normalizeArea,
    applyFilters: applyFilters,
    setRemoteSnapshot: function (records) {
      var keyed = {};
      (records || []).forEach(function (item) {
        if (!item || !item.sheet || !item.row) return;
        var id = window.EXCEL_IMPORT.identity({ sheet: item.sheet, row: item.row });
        keyed[id] = { sheet: item.sheet, row: item.row, userId: item.userId || '' };
      });
      remoteSnapshot = { records: keyed };
    },
    getSnapshot: function () { return snapshot(); }
  };
}());
