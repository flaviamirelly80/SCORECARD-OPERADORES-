/* Usuários remotos em modo API; armazenamento local apenas no modo demonstrativo. */
(function () {
  'use strict';
  var remoteUsers = null;
  function apiMode() { return window.PORTAL_API && window.PORTAL_API.enabled(); }

  function normalizeUsuario(value) {
    if (value == null) return '';
    var usuario = String(value).trim();
    if (/^\d+\.0+$/.test(usuario)) usuario = usuario.replace(/\.0+$/, '');
    return usuario.toUpperCase();
  }

  function normalizeRole(role) {
    var normalized = String(role || '').trim().toLowerCase();
    return normalized.indexOf('coordenador') >= 0 || normalized === 'coordinator' || normalized === 'admin' ? 'coordinator' : 'operator';
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
    return normalizeUsername(value);
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
    while (users.some(function (user) { return normalizeUsuario(user.username) === normalizeUsuario(candidate) && user.id !== ignoreId; })) {
      candidate = username + index;
      index += 1;
    }
    return candidate;
  }

  function initialUsers() {
    return [
      { id: 'coord-demo', username: 'coordinator.demo', name: 'Coordenador de demonstração', role: 'coordinator', jobTitle: 'Coordenação', area: 'ÁREA DEMO', shift: '', coordinatorId: '', active: true, mustChangePassword: true, lastLogin: null },
      { id: 'op-demo', username: 'operator.demo', name: 'Operador de demonstração', role: 'operator', jobTitle: 'Operador', area: 'ÁREA DEMO', shift: '', coordinatorId: 'coord-demo', active: true, mustChangePassword: true, lastLogin: null }
    ];
  }

  function canonicalUsername(user) {
    return user.username ? String(user.username).trim() : normalizeLoginUsername(user.email || user.name || '');
  }

  function migrateUsers(rawUsers) {
    var migrated = [], byUsername = {}, byId = {};
    rawUsers.forEach(function (source) {
      if (!source || typeof source !== 'object') return;
      var user = Object.assign({}, source);
      delete user.password;
      var username = canonicalUsername(user);
      if (!username) return;
      var id = String(user.id || 'u-' + Date.now() + '-' + migrated.length);
      var usernameKey = normalizeUsuario(username);
      var existing = byUsername[usernameKey] || byId[id];
      if (existing) {
        if (existing.mustChangePassword == null && user.mustChangePassword != null) existing.mustChangePassword = Boolean(user.mustChangePassword);
        return;
      }
      user.id = id;
      user.username = username;
      user.name = String(user.name || '').trim();
      user.role = normalizeRole(user.role || user.perfil);
      user.jobTitle = String(user.jobTitle || user.function || user.funcao || '').trim();
      user.area = String(user.area || '').trim();
      user.shift = String(user.shift || user.turno || '').trim();
      user.coordinatorId = String(user.coordinatorId || '').trim();
      user.active = normalizeActive(user);
      user.mustChangePassword = user.mustChangePassword == null ? true : Boolean(user.mustChangePassword);
      user.lastLogin = user.lastLogin || null;
      migrated.push(user);
      byUsername[usernameKey] = user;
      byId[id] = user;
    });
    return migrated;
  }

  function getAll() {
    if (apiMode()) return remoteUsers || [];
    var saved = window.DATA_SERVICE && window.DATA_SERVICE.load ? window.DATA_SERVICE.load() : null;
    if (saved && Array.isArray(saved.users) && saved.users.length) {
      var migrated = migrateUsers(saved.users);
      if (migrated.length) {
        var changed = JSON.stringify(migrated) !== JSON.stringify(saved.users);
        if (changed) saveAll(migrated);
        return migrated;
      }
    }
    return initialUsers();
  }

  function saveAll(users) {
    if (apiMode()) { remoteUsers = users; return users; }
    var data = window.DATA_SERVICE && window.DATA_SERVICE.load ? window.DATA_SERVICE.load() : {};
    data = data || {};
    data.users = users;
    if (window.DATA_SERVICE && window.DATA_SERVICE.save) window.DATA_SERVICE.save(data);
    return users;
  }

  function getById(id) { return getAll().find(function (user) { return user.id === id; }); }

  function validate(input, editingId) {
    var users = getAll();
    var name = String(input.name || '').trim();
    var username = normalizeLoginUsername(input.username || buildUsernameFromName(name));
    if (!name || !username || !input.role || !String(input.jobTitle || '').trim() || !String(input.area || '').trim() || !input.status) return 'Preencha todos os campos obrigatórios.';
    if (users.some(function (user) { return normalizeUsuario(user.username) === normalizeUsuario(username) && user.id !== editingId; })) return 'Já existe um usuário com este Usuário/Login.';
    return '';
  }

  function create(input) {
    var safeInput = input || {};
    var error = validate(safeInput);
    if (error) return { error: error };
    var username = normalizeLoginUsername(safeInput.username || buildUsernameFromName(safeInput.name));
    if (apiMode()) {
      return window.PORTAL_API.request('/users', { method: 'POST', body: JSON.stringify({
        username: username, externalId: safeInput.externalId || null, name: String(safeInput.name || '').trim(),
        role: normalizeRole(safeInput.role), jobTitle: String(safeInput.jobTitle || '').trim(),
        area: String(safeInput.area || '').trim(), shift: String(safeInput.shift || '').trim(),
        coordinatorId: String(safeInput.coordinatorId || '').trim(), active: safeInput.status !== 'inactive'
      }) }).then(function (result) {
        remoteUsers = (remoteUsers || []).concat(result);
        return { user: result };
      });
    }
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
      lastLogin: null
    };
    saveAll(getAll().concat(user));
    return { user: user };
  }

  function update(id, input) {
    var safeInput = input || {};
    var error = validate(safeInput, id);
    if (error) return { error: error };
    if (apiMode()) {
      return window.PORTAL_API.request('/users/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({
        username: normalizeLoginUsername(safeInput.username || buildUsernameFromName(safeInput.name)),
        name: String(safeInput.name || '').trim(),
        jobTitle: String(safeInput.jobTitle || '').trim(), area: String(safeInput.area || '').trim(),
        shift: String(safeInput.shift || '').trim(), active: safeInput.status !== 'inactive'
      }) }).then(function (result) {
        remoteUsers = (remoteUsers || []).map(function (user) { return user.id === id ? result : user; });
        return { user: result };
      });
    }
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
    if (apiMode()) {
      return window.PORTAL_API.request('/users/' + encodeURIComponent(id) + '/reset-password', { method: 'POST' }).then(function () {
        var user = getById(id);
        if (user) user.mustChangePassword = true;
        return { user: user };
      });
    }
    var users = getAll();
    var user = users.find(function (item) { return item.id === id; });
    if (!user) return { error: 'Usuário não encontrado.' };
    user.mustChangePassword = true;
    saveAll(users);
    return { user: user };
  }

  function toggleActive(id) {
    if (apiMode()) {
      var remote = getById(id);
      if (!remote) return Promise.reject(new Error('Usuário não encontrado.'));
      return window.PORTAL_API.request('/users/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ active: !remote.active }) }).then(function (result) {
        remoteUsers = (remoteUsers || []).map(function (user) { return user.id === id ? result : user; });
        return result;
      });
    }
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
    var username = normalizeUsuario(input.username);
    if (!username) return { error: 'Usuario é obrigatório.' };
    var existing = users.find(function (user) { return normalizeUsuario(user.username) === username; });
    var coordinator = users.find(function (user) { return user.name.toLowerCase() === String(input.coordinatorName || '').toLowerCase() || user.id === String(input.coordinatorId || ''); });
    var role = normalizeRole(input.role);
    if (existing) {
      existing.username = username;
      existing.name = String(input.name || existing.name).trim();
      existing.jobTitle = String(input.jobTitle || existing.jobTitle || '').trim();
      existing.area = String(input.area || existing.area).trim();
      existing.shift = String(input.shift || existing.shift || '').trim();
      existing.coordinatorId = coordinator ? coordinator.id : existing.coordinatorId;
      existing.active = input.active !== false;
      existing.role = role;
      saveAll(users);
      return existing;
    } else {
      var user = {
        id: 'u-' + Date.now() + '-' + users.length,
        username: username,
        name: String(input.name || '').trim(),
        role: role,
        jobTitle: String(input.jobTitle || '').trim(),
        area: String(input.area || '').trim(),
        shift: String(input.shift || '').trim(),
        coordinatorId: role === 'coordinator' ? '' : coordinator ? coordinator.id : '',
        active: input.active !== false,
        mustChangePassword: true,
        lastLogin: null
      };
      users.push(user);
      saveAll(users);
      return user;
    }
  }

  window.USER_SERVICE = {
    normalizeUsuario: normalizeUsuario,
    normalizeUsername: normalizeUsername,
    normalizeLoginUsername: normalizeLoginUsername,
    buildUsernameFromName: buildUsernameFromName,
    getAll: getAll,
    setRemoteUsers: function (users) { remoteUsers = Array.isArray(users) ? users : []; },
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
