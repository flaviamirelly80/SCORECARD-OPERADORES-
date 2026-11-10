/* Adaptador de autenticação Supabase em produção e sessão local apenas no modo demonstrativo. */
(function () {
  'use strict';
  var SESSION_KEY = 'scorecard-portal-session-v1';
  function normalizeUsername(value) { return window.USER_SERVICE.normalizeLoginUsername(value); }
  function validatePassword(password) { return { length: password.length >= 8, upper: /[A-Z]/.test(password), lower: /[a-z]/.test(password), number: /\d/.test(password) }; }
  function passwordIsValid(password) { var rules = validatePassword(password); return rules.length && rules.upper && rules.lower && rules.number; }
  function login(username, password) {
    if (window.PORTAL_API.enabled()) {
      return window.PORTAL_API.request('/auth/login', { method: 'POST', body: JSON.stringify({ username: username, password: password }) }).then(function (session) {
        window.PORTAL_API.setSession(session);
        return session;
      });
    }
    var usernameValue = normalizeUsername(username);
    var usuario = window.USER_SERVICE.normalizeUsuario(usernameValue);
    var user = window.USER_SERVICE.getAll().find(function (item) { return window.USER_SERVICE.normalizeUsuario(item.username) === usuario; });
    if (!user) { console.warn('[AUTH] Usuário não encontrado:', usernameValue); return { error: 'Usuário ou senha inválidos.' }; }
    if (!user.active) { console.warn('[AUTH] Usuário inativo:', usernameValue); return { error: 'Usuário inativo. Procure sua coordenação.' }; }
    if (!password) return { error: 'Informe uma senha para entrar no modo local de demonstração.' };
    window.USER_SERVICE.touchLastLogin(user.id);
    user = window.USER_SERVICE.getById(user.id);
    localStorage.setItem(SESSION_KEY, user.id);
    return { user: user };
  }
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    if (window.PORTAL_API.enabled()) {
      window.PORTAL_API.clearSession();
      window.SUPABASE_SERVICE.signOut().catch(function (error) { console.error('Não foi possível encerrar a sessão Supabase.', error); });
    }
  }
  function currentUser() {
    if (window.PORTAL_API.enabled()) return window.PORTAL_API.getUser();
    var id = localStorage.getItem(SESSION_KEY);
    var user = id ? window.USER_SERVICE.getById(id) : null;
    if (user && !user.active) { localStorage.removeItem(SESSION_KEY); return null; }
    return user;
  }
  function changePassword(userId, currentPassword, newPassword) {
    if (!passwordIsValid(newPassword)) return { error: 'A nova senha não atende aos requisitos.' };
    if (window.PORTAL_API.enabled()) {
      return window.PORTAL_API.request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword: currentPassword, password: newPassword, confirmation: newPassword }) }).then(function (session) {
        window.PORTAL_API.setSession(session);
        return session;
      });
    }
    var user = window.USER_SERVICE.getById(userId);
    if (!user) return { error: 'Usuário não encontrado.' };
    return window.USER_SERVICE.setPassword(userId, newPassword);
  }
  function firstPassword(userId, newPassword) {
    if (!passwordIsValid(newPassword)) return { error: 'A nova senha não atende aos requisitos.' };
    if (window.PORTAL_API.enabled()) return changePassword(userId, '', newPassword);
    return window.USER_SERVICE.setPassword(userId, newPassword);
  }
  window.AUTH_SERVICE = { login: login, logout: logout, currentUser: currentUser, validatePassword: validatePassword, passwordIsValid: passwordIsValid, changePassword: changePassword, firstPassword: firstPassword };
}());
