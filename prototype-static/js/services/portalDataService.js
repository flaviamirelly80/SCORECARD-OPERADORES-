/* Leitura centralizada dos dados importados e aplicacao dos filtros do portal. */
(function () {
  'use strict';

  var MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var cachedRaw = null;
  var cachedSnapshot = null;

  function normalizeUsuario(value) {
    return window.EXCEL_IMPORT.normalizeUsuario(value);
  }

  function normalizeArea(value) {
    return String(value == null ? '' : value).trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  function snapshot() {
    var raw = localStorage.getItem('scorecard-prototype-imported-data-v1');
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try { cachedSnapshot = raw ? JSON.parse(raw) : null; }
      catch (error) { cachedSnapshot = null; console.warn('Dados importados inválidos; usando coleções vazias.', error); }
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
      var username = normalizeUsuario(row.usuario || row.username);
      var account = window.USER_SERVICE.getAll().find(function (user) {
        return normalizeUsuario(user.username) === username;
      });
      var role = String(row.perfil || '').toLowerCase().indexOf('coordenador') >= 0 ? 'coordinator' : account ? account.role : 'operator';
      return {
        id: item.userId || (account && account.id) || username,
        username: username,
        name: row.nome || (account && account.name) || username,
        initials: String(row.nome || '').trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase(),
        area: row.area || '',
        function: row.funcao || '',
        jobTitle: row.funcao || '',
        shift: row.turno || '',
        role: role,
        status: row.status || 'Ativo',
        coordinator: row.coordenador || 'Michelle Faria'
      };
    });
    if (imported.length) return imported.filter(function (operator) { return operator.role === 'operator'; });
    if (hasImportedData()) return window.USER_SERVICE.getAll().filter(function (user) {
      return user.role === 'operator';
    }).map(function (user) {
      return { id: user.id, username: normalizeUsuario(user.username), name: user.name, area: user.area || '', role: user.role, status: user.active ? 'Ativo' : 'Inativo', coordinator: user.coordinatorName || 'Michelle Faria' };
    });
    return (window.PROTOTYPE_DATA.operators || []).filter(function (operator) { return operator.role !== 'coordinator' && operator.username !== 'michellefaria'; });
  }

  function rowsOrFallback(sheet, fallback) {
    var records = importedRows(sheet);
    if (hasImportedData()) return records.map(function (item) { return Object.assign({}, item.row, { userId: item.userId || '' }); });
    return fallback || [];
  }

  function getAttendance() {
    return rowsOrFallback('JORNADA', (window.PROTOTYPE_DATA.journey || []).map(function (row) {
      return { data: row.date, status: row.status, horas: row.hours, observacao: row.note };
    }));
  }

  function getLabels() {
    if (hasImportedData()) return rowsOrFallback('ETIQUETAS');
    return (window.PROTOTYPE_DATA.labels || []).map(function (row) {
      var operator = (window.PROTOTYPE_DATA.operators || []).find(function (item) { return item.id === row.userId; });
      return { usuario: operator && operator.username, data: row.date, categoria: row.category, status: row.status, quantidade: row.count, userId: row.userId };
    });
  }

  function getBos() { return rowsOrFallback('BOS'); }
  function getBosq() { return rowsOrFallback('BOSQ'); }

  function getIdeas() {
    if (hasImportedData()) return rowsOrFallback('IDEIAS');
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
      var timestamp = new Date(value);
      return Number.isNaN(timestamp.getTime()) ? null : timestamp;
    }
    if (typeof value !== 'string' || !value.trim()) return null;
    var input = value.trim();
    var br = input.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\s.*)?$/);
    if (br) {
      var brazilian = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
      return brazilian.getFullYear() === Number(br[3]) && brazilian.getMonth() === Number(br[2]) - 1 && brazilian.getDate() === Number(br[1]) ? brazilian : null;
    }
    if (/^\d{5}(?:\.\d+)?$/.test(input)) return parsePortalDate(Number(input));
    if (/^\d{13}$/.test(input)) return new Date(Number(input));
    var iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|T|\s)/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    var parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function monthNumber(value) {
    if (value == null || value === '') return null;
    var numeric = Number(value);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;
    var normalized = String(value).trim().toLocaleLowerCase('pt-BR');
    var month = MONTHS.indexOf(normalized);
    return month >= 0 ? month + 1 : null;
  }

  function selectedUser(filters) {
    return normalizeUsuario(filters.selectedUser);
  }

  function applyFilters(records, filters, operators) {
    filters = filters || {};
    var user = selectedUser(filters);
    var area = normalizeArea(filters.selectedArea);
    var month = filters.selectedMonth;
    var year = filters.selectedYear;
    var usersInArea = Object.create(null);
    var accountsById = Object.create(null);
    window.USER_SERVICE.getAll().forEach(function (account) { accountsById[account.id] = account.username; });
    if (area && area !== 'TODAS') {
      (operators || getOperators()).forEach(function (operator) {
        if (normalizeArea(operator.area) === area) usersInArea[normalizeUsuario(operator.username)] = true;
      });
    }
    return (records || []).filter(function (row) {
      var usuario = normalizeUsuario(row.usuario || row.username);
      if (!usuario && row.userId) {
        usuario = normalizeUsuario(accountsById[row.userId]);
      }
      if (user && usuario !== user) return false;
      if (area && area !== 'TODAS' && !usersInArea[usuario]) return false;
      if (row.ano != null && row.mes != null && !row.data) {
        if (year && year !== 'Todos' && Number(row.ano) !== Number(year)) return false;
        if (month && month !== 'Todos os meses' && monthNumber(row.mes) !== monthNumber(month)) return false;
        return true;
      }
      var date = parsePortalDate(row.data || row.date);
      if (month && month !== 'Todos os meses' && (!date || date.getMonth() + 1 !== monthNumber(month))) return false;
      if (year && year !== 'Todos' && (!date || date.getFullYear() !== Number(year))) return false;
      return true;
    });
  }

  function availableYears() {
    var records = snapshot().records || {};
    var years = Object.keys(records).reduce(function (all, id) {
      var item = records[id], date = item && item.row && parsePortalDate(item.row.data);
      if (date && all.indexOf(String(date.getFullYear())) < 0) all.push(String(date.getFullYear()));
      if (item && item.sheet === 'METAS' && item.row && item.row.ano && all.indexOf(String(item.row.ano)) < 0) all.push(String(item.row.ano));
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
    applyFilters: applyFilters
  };
}());
