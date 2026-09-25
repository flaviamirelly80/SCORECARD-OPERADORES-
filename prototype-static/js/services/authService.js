/* Adaptador temporario de autenticacao local. Substituir por /api/auth no backend. */
(function () {
  'use strict';
  var SESSION_KEY = 'scorecard-portal-session-v1';
  function normalizeUsername(value) { return window.USER_SERVICE.normalizeLoginUsername(value); }
  function validatePassword(password) { return { length: password.length >= 8, upper: /[A-Z]/.test(password), lower: /[a-z]/.test(password), number: /\d/.test(password) }; }
  function passwordIsValid(password) { var rules = validatePassword(password); return rules.length && rules.upper && rules.lower && rules.number; }
  function login(username, password) {
    var usernameValue = normalizeUsername(username);
    var user = window.USER_SERVICE.getAll().find(function (item) { return item.username === usernameValue; });
    if (!user) { console.warn('[AUTH] Usuário não encontrado:', usernameValue); return { error: 'Usuário ou senha inválidos.' }; }
    if (!user.active) { console.warn('[AUTH] Usuário inativo:', usernameValue); return { error: 'Usuário inativo. Procure sua coordenação.' }; }
    if (user.password !== password) { console.warn('[AUTH] Senha incorreta para:', usernameValue); return { error: 'Usuário ou senha inválidos.' }; }
    window.USER_SERVICE.touchLastLogin(user.id);
    user = window.USER_SERVICE.getById(user.id);
    localStorage.setItem(SESSION_KEY, user.id);
    return { user: user };
  }
  function logout() { localStorage.removeItem(SESSION_KEY); }
  function currentUser() { var id = localStorage.getItem(SESSION_KEY); var user = id ? window.USER_SERVICE.getById(id) : null; if (user && !user.active) { localStorage.removeItem(SESSION_KEY); return null; } return user; }
  function changePassword(userId, currentPassword, newPassword) { var user = window.USER_SERVICE.getById(userId); if (!user || user.password !== currentPassword) return { error: 'A senha atual está incorreta.' }; if (!passwordIsValid(newPassword)) return { error: 'A nova senha não atende aos requisitos.' }; return window.USER_SERVICE.setPassword(userId, newPassword); }
  function firstPassword(userId, newPassword) { if (!passwordIsValid(newPassword)) return { error: 'A nova senha não atende aos requisitos.' }; return window.USER_SERVICE.setPassword(userId, newPassword); }
  window.AUTH_SERVICE = { login: login, logout: logout, currentUser: currentUser, validatePassword: validatePassword, passwordIsValid: passwordIsValid, changePassword: changePassword, firstPassword: firstPassword };
}());
