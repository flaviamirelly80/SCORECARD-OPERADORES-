(function () {
  function apiRequest(path, options) {
    var config = window.PORTAL_CONFIG || {};
    var requestOptions = options || {};
    var headers = Object.assign({ 'Content-Type': 'application/json' }, requestOptions.headers || {});
    var token = window.localStorage.getItem('portal_token');
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch((config.apiBaseUrl || '') + path, Object.assign({}, requestOptions, { headers: headers })).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.message || 'Falha na API.');
        return body;
      });
    });
  }

  window.PORTAL_API = { request: apiRequest, enabled: function () { return (window.PORTAL_CONFIG || {}).dataSource === 'api'; } };
}());