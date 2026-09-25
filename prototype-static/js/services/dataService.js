/* Camada temporaria local. Em producao, trocar por cliente da API. */
(function () {
  'use strict';
  var DATA_KEY = 'scorecard-portal-data-v2';
  var LEGACY_KEYS = ['scorecard-portal-data-v1'];
  function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (error) { console.warn('Dados locais inválidos ignorados:', key, error); return null; }
  }
  function isCompatible(value) { return isObject(value) && Array.isArray(value.users); }
  function load() {
    var current = read(DATA_KEY);
    if (isCompatible(current)) return current;
    for (var index = 0; index < LEGACY_KEYS.length; index += 1) {
      var legacy = read(LEGACY_KEYS[index]);
      if (isCompatible(legacy)) { save(legacy); return legacy; }
    }
    return null;
  }
  function save(value) { if (isObject(value)) localStorage.setItem(DATA_KEY, JSON.stringify(value)); }
  window.DATA_SERVICE = { load: load, save: save, key: DATA_KEY };
}());
