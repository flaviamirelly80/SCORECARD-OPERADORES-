/* Camada temporaria local. Senhas em texto puro existem apenas no modo demonstrativo. */
(function () {
  'use strict';
  var DEFAULT_TEMP_PASSWORD = 'JDE@1234';
  var MICHELLE_PASSWORD_RESET_KEY = 'scorecard-michelle-password-reset-v1';

  function normalizeRole(role) {
    return role === 'coordinator' || role === 'COORDENADOR' ? 'coordinator' : 'operator';
  }

  function normalizeActive(user) {
    if (typeof user.active === 'boolean') return user.active;
    var status = String(user.status || user.active || '').trim().toLowerCase();
    return status !== 'inativo' && status !== 'inactive' && status !== 'false' && status !== '0';
  }

  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, '');
  }

  function normalizeLoginUsername(value) {
    var username = normalizeUsername(value);
    return username === 'michelle.faria' ? 'michellefaria' : username;
  }

  function buildUsernameFromName(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean).map(function (part) {
      return part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    });
    if (!parts.length) return 'usuario';
    if (parts.length === 1) return parts[0];
    return parts[0] + '.' + parts[parts.length - 1];
  }

  function makeUniqueUsername(rawName, ignoreId) {
    var base = normalizeLoginUsername(rawName && rawName.trim() ? rawName : buildUsernameFromName(rawName));
    var users = getAll();
    var username = base || 'usuario';
    var candidate = username;
    var index = 2;
    while (users.some(function (user) { return user.username === candidate && user.id !== ignoreId; })) {
      candidate = username + index;
      index += 1;
    }
    return candidate;
  }

  function initialUsers() {
    var coordinator = {
      id: 'coord-01',
      username: 'michellefaria',
      name: 'Michelle Faria',
      role: 'coordinator',
      jobTitle: 'Coordenadora',
      area: 'CAFÉ CRU',
      shift: '',
      coordinatorId: '',
      active: true,
      mustChangePassword: true,
      password: DEFAULT_TEMP_PASSWORD,
      lastLogin: null
    };

    var operators = [
      { id: 'op-01', username: 'edilson.souza', name: 'Edilson Coimbra de Souza', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-02', username: 'felipe.simoes', name: 'Felipe Justino Simoes', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-03', username: 'fernando.santos', name: 'Fernando Jose dos Santos', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-04', username: 'jose.medeiros', name: 'Jose Roberto de Medeiros', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-05', username: 'luiz.souza', name: 'Luiz Felipe de Souza', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-06', username: 'luiz.nascimento', name: 'Luiz Laurenco do Nascimento', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-07', username: 'nilton.costa', name: 'Nilton Ferreira da Costa', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-08', username: 'thais.souza', name: 'Thais Oliveira Souza', role: 'operator', jobTitle: 'Operador de Processos', area: 'CAFÉ CRU', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-09', username: 'alex.teixeira', name: 'Alex Sandro Alves Teixeira', role: 'operator', jobTitle: 'Operador de Processos', area: 'MOAGEM', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-10', username: 'daniel.madureira', name: 'Daniel Almeida Madureira', role: 'operator', jobTitle: 'Operador de Processos', area: 'MOAGEM', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-11', username: 'deivison.chaves', name: 'Deivison Souza Alves Chaves', role: 'operator', jobTitle: 'Operador de Processos', area: 'MOAGEM', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-12', username: 'rafael.santos', name: 'Rafael da Silva Santos', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-13', username: 'eduardo.candido', name: 'Eduardo Luis Candido', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-14', username: 'edvaldo.silva', name: 'Edvaldo Rener da Silva', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-15', username: 'ivomar.costa', name: 'Ivomar Lopes Costa', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-16', username: 'joao.rodrigues', name: 'Joao Pedro Alves Rodrigues', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-17', username: 'vinicius.oliveira', name: 'Vinicius Ramos de Oliveira', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null },
      { id: 'op-18', username: 'edvan.santos', name: 'Edvan Henrique Pires Santos', role: 'operator', jobTitle: 'Operador de Processos', area: 'TORRADOR', shift: '', coordinatorId: 'coord-01', active: true, mustChangePassword: true, password: DEFAULT_TEMP_PASSWORD, lastLogin: null }
    ];
    return [coordinator].concat(operators);
  }

  function canonicalUsername(user) {
    var name = normalizeUsername(user.name || '');
    if (user.id === 'coord-01' || name === 'michelle.faria' || name === 'michellefaria') return 'michellefaria';
    if (user.id === 'op-01' || name === 'edilson.coimbra.de.souza' || name === 'edilson.souza') return 'edilson.souza';
    return normalizeLoginUsername(user.username || user.email || user.name || '');
  }

  function migrateUsers(rawUsers) {
    var migrated = [], byUsername = {}, byId = {};
    rawUsers.forEach(function (source) {
      if (!source || typeof source !== 'object') return;
      var user = Object.assign({}, source);
      var username = canonicalUsername(user);
      if (!username) return;
      var id = String(user.id || 'u-' + Date.now() + '-' + migrated.length);
      var existing = byUsername[username] || byId[id];
      if (existing) {
        if (!existing.password && user.password) existing.password = user.password;
        if (existing.mustChangePassword == null && user.mustChangePassword != null) existing.mustChangePassword = Boolean(user.mustChangePassword);
        return;
      }
      user.id = id;
      user.username = username;
      user.name = String(user.name || '').trim();
      user.role = normalizeRole(user.role || user.perfil);
      if (username === 'michellefaria') user.role = 'coordinator';
      if (username === 'edilson.souza') user.role = 'operator';
      user.jobTitle = String(user.jobTitle || user.function || user.funcao || '').trim();
      user.area = String(user.area || '').trim();
      user.shift = String(user.shift || user.turno || '').trim();
      user.coordinatorId = String(user.coordinatorId || '').trim();
      if (/^op-\d+$/.test(user.id)) user.coordinatorId = 'coord-01';
      user.active = normalizeActive(user);
      user.password = typeof user.password === 'string' && user.password ? user.password : DEFAULT_TEMP_PASSWORD;
      user.mustChangePassword = user.mustChangePassword == null ? true : Boolean(user.mustChangePassword);
      user.lastLogin = user.lastLogin || null;
      migrated.push(user);
      byUsername[username] = user;
      byId[id] = user;
    });
    return migrated;
  }

  function getAll() {
    var saved = window.DATA_SERVICE && window.DATA_SERVICE.load ? window.DATA_SERVICE.load() : null;
    if (saved && Array.isArray(saved.users) && saved.users.length) {
      var migrated = migrateUsers(saved.users);
      if (migrated.length) {
        var changed = JSON.stringify(migrated) !== JSON.stringify(saved.users);
        if (changed) saveAll(migrated);
        return resetMichellePasswordOnce(migrated);
      }
    }
    return resetMichellePasswordOnce(initialUsers());
  }

  function saveAll(users) {
    var data = window.DATA_SERVICE && window.DATA_SERVICE.load ? window.DATA_SERVICE.load() : {};
    data = data || {};
    data.users = users;
    if (window.DATA_SERVICE && window.DATA_SERVICE.save) window.DATA_SERVICE.save(data);
    return users;
  }

  function resetMichellePasswordOnce(users) {
    if (localStorage.getItem(MICHELLE_PASSWORD_RESET_KEY)) return users;
    var michelle = users.find(function (user) { return user.username === 'michellefaria'; });
    if (!michelle) return users;
    michelle.password = DEFAULT_TEMP_PASSWORD;
    michelle.mustChangePassword = true;
    saveAll(users);
    localStorage.setItem(MICHELLE_PASSWORD_RESET_KEY, 'true');
    return users;
  }

  function getById(id) { return getAll().find(function (user) { return user.id === id; }); }

  function validate(input, editingId) {
    var users = getAll();
    var name = String(input.name || '').trim();
    var username = normalizeLoginUsername(input.username || buildUsernameFromName(name));
    if (!name || !username || !input.role || !String(input.jobTitle || '').trim() || !String(input.area || '').trim() || !input.status) return 'Preencha todos os campos obrigatórios.';
    if (users.some(function (user) { return user.username === username && user.id !== editingId; })) return 'Já existe um usuário com este Usuário/Login.';
    return '';
  }

  function create(input) {
    var safeInput = input || {};
    var error = validate(safeInput);
    if (error) return { error: error };
    var username = normalizeLoginUsername(safeInput.username || buildUsernameFromName(safeInput.name));
    var user = {
      id: 'u-' + Date.now(),
      username: makeUniqueUsername(username),
      name: String(safeInput.name || '').trim(),
      role: normalizeRole(safeInput.role),
      jobTitle: String(safeInput.jobTitle || '').trim(),
      area: String(safeInput.area || '').trim(),
      shift: String(safeInput.shift || '').trim(),
      coordinatorId: String(safeInput.coordinatorId || '').trim(),
      active: safeInput.status !== 'inactive',
      mustChangePassword: true,
      password: DEFAULT_TEMP_PASSWORD,
      lastLogin: null
    };
    saveAll(getAll().concat(user));
    return { user: user };
  }

  function update(id, input) {
    var safeInput = input || {};
    var error = validate(safeInput, id);
    if (error) return { error: error };
    var users = getAll();
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { error: 'Usuário não encontrado.' };
    Object.assign(user, {
      username: normalizeLoginUsername(safeInput.username || buildUsernameFromName(safeInput.name)),
      name: String(safeInput.name || '').trim(),
      role: normalizeRole(safeInput.role),
      jobTitle: String(safeInput.jobTitle || '').trim(),
      area: String(safeInput.area || '').trim(),
      shift: String(safeInput.shift || '').trim(),
      coordinatorId: String(safeInput.coordinatorId || '').trim(),
      active: safeInput.status !== 'inactive'
    });
    saveAll(users);
    return { user: user };
  }

  function setPassword(id, password) {
    var users = getAll();
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { error: 'Usuário não encontrado.' };
    user.password = password;
    user.mustChangePassword = false;
    saveAll(users);
    return { user: user };
  }

  function touchLastLogin(id) {
    var users = getAll();
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { error: 'Usuário não encontrado.' };
    user.lastLogin = new Date().toISOString();
    saveAll(users);
    return { user: user };
  }

  function resetPassword(id) {
    var users = getAll();
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { error: 'Usuário não encontrado.' };
    user.password = DEFAULT_TEMP_PASSWORD;
    user.mustChangePassword = true;
    saveAll(users);
    return { user: user };
  }

  function toggleActive(id) {
    var users = getAll();
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return;
    user.active = !user.active;
    saveAll(users);
    return user;
  }

  function getCoordinators() {
    return getAll().filter(function (user) { return user.role === 'coordinator' && user.active; });
  }

  function syncImportedOperator(input) {
    var users = getAll();
    var username = normalizeLoginUsername(String(input.username || input.name || '').trim() || buildUsernameFromName(input.name));
    var existing = users.find(function (user) { return user.username === username; });
    var coordinator = users.find(function (user) { return user.name.toLowerCase() === String(input.coordinatorName || '').toLowerCase() || user.id === String(input.coordinatorId || ''); });
    if (existing) {
      existing.name = String(input.name || existing.name).trim();
      existing.jobTitle = String(input.jobTitle || existing.jobTitle || '').trim();
      existing.area = String(input.area || existing.area).trim();
      existing.shift = String(input.shift || existing.shift || '').trim();
      existing.coordinatorId = coordinator ? coordinator.id : existing.coordinatorId;
      existing.active = input.active !== false;
    } else {
      users.push({
        id: 'u-' + Date.now() + '-' + users.length,
        username: makeUniqueUsername(username),
        name: String(input.name || '').trim(),
        role: 'operator',
        jobTitle: String(input.jobTitle || '').trim(),
        area: String(input.area || '').trim(),
        shift: String(input.shift || '').trim(),
        coordinatorId: coordinator ? coordinator.id : '',
        active: input.active !== false,
        mustChangePassword: true,
        password: DEFAULT_TEMP_PASSWORD,
        lastLogin: null
      });
    }
    saveAll(users);
    return existing || users[users.length - 1];
  }

  window.USER_SERVICE = {
    DEFAULT_TEMP_PASSWORD: DEFAULT_TEMP_PASSWORD,
    normalizeUsername: normalizeUsername,
    normalizeLoginUsername: normalizeLoginUsername,
    buildUsernameFromName: buildUsernameFromName,
    getAll: getAll,
    getById: getById,
    getCoordinators: getCoordinators,
    validate: validate,
    create: create,
    update: update,
    syncImportedOperator: syncImportedOperator,
    setPassword: setPassword,
    touchLastLogin: touchLastLogin,
    resetPassword: resetPassword,
    toggleActive: toggleActive
  };
}());
