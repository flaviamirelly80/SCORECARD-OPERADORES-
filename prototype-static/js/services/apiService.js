(function () {
  var TOKEN_KEY = 'portal_token';
  var USER_KEY = 'portal_user';

  function apiRequest(path, options) {
    if (!window.SUPABASE_SERVICE) return Promise.reject(new Error('Serviço Supabase não carregado.'));
    return window.SUPABASE_SERVICE.request(path, options);
  }

  function setSession(session) {
    window.localStorage.setItem(TOKEN_KEY, session.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  }

  function getUser() {
    try { return JSON.parse(window.localStorage.getItem(USER_KEY) || 'null'); }
    catch (error) { console.warn('Sessão local inválida ignorada.', error); return null; }
  }

  function clearSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }

  window.PORTAL_API = {
    request: apiRequest,
    setSession: setSession,
    getUser: getUser,
    clearSession: clearSession,
    enabled: function () { return (window.PORTAL_CONFIG || {}).dataSource === 'supabase'; }
  };
}());