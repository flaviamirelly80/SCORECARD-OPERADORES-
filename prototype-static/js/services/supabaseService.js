(function () {
  'use strict';

  var config = window.PORTAL_CONFIG || {};
  var authDomain = 'portal-desempenho.invalid';
  var tables = {
    JORNADA: { name: 'jornada', fields: { data: 'data', status: 'status', horas: 'horas', observacao: 'observacao' } },
    ETIQUETAS: { name: 'etiquetas', fields: { data: 'data', numeroetiqueta: 'numero_etiqueta', categoria: 'categoria', descricao: 'descricao', status: 'status' } },
    BOS: { name: 'bos', fields: { data: 'data', numerobos: 'numero_bos', descricao: 'descricao', status: 'status' } },
    BOSQ: { name: 'bosq', fields: { data: 'data', numerobosq: 'numero_bosq', descricao: 'descricao', status: 'status' } },
    IDEIAS: { name: 'ideias', fields: { data: 'data', titulo: 'titulo', descricao: 'descricao', status: 'status', resultado: 'resultado' } },
    METAS: { name: 'metas', fields: { ano: 'ano', mes: 'mes', indicador: 'indicador', meta: 'meta' } }
  };
  var resourcesBySheet = {
    JORNADA: 'journey',
    ETIQUETAS: 'labels',
    BOS: 'bos',
    BOSQ: 'bosq',
    IDEIAS: 'ideas',
    METAS: 'goals'
  };
  var client = null;
  function failure(error) {
    if (error) throw new Error(error.message || 'Falha na operação Supabase.');
  }

  function requireClient() {
    if (client) return client;
    if (!config.supabaseUrl || !config.supabaseAnonKey) throw new Error('Configure PORTAL_SUPABASE_URL e PORTAL_SUPABASE_ANON_KEY para conectar o portal ao Supabase.');
    if (!window.supabase || typeof window.supabase.createClient !== 'function') throw new Error('A biblioteca Supabase não foi carregada. Verifique a conexão e o bloqueador de conteúdo.');
    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return client;
  }

  function accountEmail(username) {
    var normalized = window.USER_SERVICE.normalizeLoginUsername(username);
    if (!normalized) throw new Error('Informe um usuário válido.');
    return normalized + '@' + authDomain;
  }

  function publicProfile(profile) {
    var profileRole = String(profile.perfil || '').trim().toLowerCase();
    var user = {
      id: profile.id,
      authUserId: profile.auth_user_id,
      username: profile.username,
      externalId: profile.usuario,
      name: profile.nome,
      role: profileRole === 'admin' || profileRole === 'coordinator' || profileRole === 'coordenador' ? 'coordinator' : 'operator',
      jobTitle: profile.funcao || '',
      area: profile.area || '',
      shift: profile.turno || '',
      coordinatorId: profile.coordinator_id || '',
      active: profile.status === 'Ativo',
      mustChangePassword: Boolean(profile.must_change_password),
      lastLogin: profile.last_login || null
    };
    return user;
  }

  async function currentProfile() {
    var supabase = requireClient();
    var auth = await supabase.auth.getUser();
    failure(auth.error);
    if (!auth.data.user) return null;
    var result = await supabase.from('portal_users').select('*').eq('auth_user_id', auth.data.user.id).maybeSingle();
    failure(result.error);
    if (!result.data || result.data.status !== 'Ativo') throw new Error('Não há um perfil ativo associado a esta conta. Solicite a configuração do seu usuário ao administrador.');
    return { authUser: auth.data.user, profile: result.data };
  }

  function mapRecord(sheet, item) {
    var row = { usuario: item.usuario };
    var fields = tables[sheet].fields;
    Object.keys(fields).forEach(function (source) {
      var value = item[fields[source]];
      row[source] = value == null ? '' : String(value);
    });
    return { sheet: sheet, userId: item.operator_id || '', row: row };
  }

  async function snapshot() {
    var supabase = requireClient();
    var profile = await currentProfile();
    if (!profile) throw new Error('Sua sessão expirou. Entre novamente.');
    var requests = [
      { resource: 'users', promise: fetchAll('portal_users', 'nome') },
      { resource: 'operators', promise: fetchAll('operators', 'nome') }
    ];
    Object.keys(tables).forEach(function (sheet) {
      requests.push({ resource: resourcesBySheet[sheet], promise: fetchAll(tables[sheet].name) });
    });
    var results = await Promise.all(requests.map(function (request) {
      return request.promise.then(function (rows) {
        return { resource: request.resource, rows: rows, error: null };
      }, function (error) {
        return { resource: request.resource, rows: [], error: error };
      });
    }));
    var rowsByResource = {};
    var errors = [];
    results.forEach(function (result) {
      rowsByResource[result.resource] = result.rows;
      if (result.error) errors.push({ resource: result.resource, message: result.error.message || 'Falha ao consultar dados.' });
    });
    var users = rowsByResource.users.map(publicProfile);
    var operators = rowsByResource.operators.map(function (item) {
      return {
        sheet: 'OPERADORES',
        userId: item.id,
        row: {
          usuario: item.usuario,
          nome: item.nome,
          perfil: item.perfil,
          funcao: item.funcao || '',
          area: item.area || '',
          turno: item.turno || '',
          coordenador: item.coordenador || '',
          status: item.status
        }
      };
    });
    var records = operators;
    Object.keys(tables).forEach(function (sheet) {
      records = records.concat(rowsByResource[resourcesBySheet[sheet]].map(function (item) { return mapRecord(sheet, item); }));
    });
    return { user: publicProfile(profile.profile), users: users, records: records, errors: errors };
  }

  async function fetchAll(table, orderColumn) {
    var supabase = requireClient();
    var rows = [];
    for (var start = 0; ; start += 1000) {
      var query = supabase.from(table).select('*').order(orderColumn || 'id').order('id').range(start, start + 999);
      var result = await query;
      failure(result.error);
      rows = rows.concat(result.data || []);
      if (!result.data || result.data.length < 1000) return rows;
    }
  }

  async function importRecords(body) {
    var supabase = requireClient();
    var profile = await currentProfile();
    if (!profile || !['coordinator', 'admin'].includes(profile.profile.perfil.toLowerCase())) throw new Error('Somente coordenadores podem importar dados.');
    var records = Array.isArray(body.records) ? body.records : [];
    var seen = Object.create(null);
    var unique = [];
    records.forEach(function (item) {
      if (!item || !item.importKey || seen[item.importKey]) return;
      seen[item.importKey] = true;
      unique.push(item);
    });
    var result = await supabase.rpc('import_portal_data', {
      p_file_name: String(body.fileName || '').split(/[\\/]/).pop().slice(0, 180),
      p_records: unique,
      p_rejected: Number(body.rejected || 0),
      p_duplicates: records.length - unique.length,
      p_errors: Array.isArray(body.errors) ? body.errors : []
    });
    failure(result.error);
    return result.data;
  }

  async function request(path, options) {
    var supabase = requireClient();
    var requestOptions = options || {};
    var method = String(requestOptions.method || 'GET').toUpperCase();
    var body = requestOptions.body ? JSON.parse(requestOptions.body) : {};
    var route = String(path || '').replace(/^\/+/, '');

    if (route === 'auth/login' && method === 'POST') {
      var signIn = await supabase.auth.signInWithPassword({ email: accountEmail(body.username), password: String(body.password || '') });
      failure(signIn.error);
      var profile = await supabase.from('portal_users').select('*').eq('auth_user_id', signIn.data.user.id).maybeSingle();
      if (profile.error || !profile.data || profile.data.status !== 'Ativo') {
        await supabase.auth.signOut();
        failure(profile.error);
        throw new Error('Conta sem perfil ativo no portal. Solicite a configuração ao administrador.');
      }
      return { token: signIn.data.session.access_token, user: publicProfile(profile.data) };
    }

    if (route === 'auth/me' && method === 'GET') {
      var current = await currentProfile();
      if (!current) throw new Error('Sua sessão expirou. Entre novamente.');
      return { user: publicProfile(current.profile) };
    }

    if (route === 'auth/change-password' && method === 'POST') {
      var session = await supabase.auth.getSession();
      failure(session.error);
      if (!session.data.session) throw new Error('Sua sessão expirou. Entre novamente.');
      var existingProfile = await currentProfile();
      if (!existingProfile.authUser.user_metadata.must_change_password && body.currentPassword) {
        var verified = await supabase.auth.signInWithPassword({ email: accountEmail(existingProfile.profile.username), password: String(body.currentPassword) });
        failure(verified.error);
      }
      var updatePassword = await supabase.auth.updateUser({ password: String(body.password || ''), data: { must_change_password: false } });
      failure(updatePassword.error);
      var currentUser = await currentProfile();
      var profileUpdate = await supabase.rpc('mark_own_password_changed');
      failure(profileUpdate.error);
      var updateProfile = await supabase.from('portal_users').select('*').eq('auth_user_id', currentUser.authUser.id).single();
      failure(updateProfile.error);
      var refreshed = await supabase.auth.getSession();
      failure(refreshed.error);
      return { token: refreshed.data.session.access_token, user: publicProfile(updateProfile.data) };
    }

    if (route === 'portal/snapshot' && method === 'GET') return snapshot();

    if (route === 'import' && method === 'POST') return importRecords(body);

    if (route === 'users' && method === 'GET') {
      return (await fetchAll('portal_users', 'nome')).map(publicProfile);
    }

    if (route === 'users' && method === 'POST') {
      var coordinator = await currentProfile();
      if (!coordinator || !['coordinator', 'admin'].includes(coordinator.profile.perfil.toLowerCase())) throw new Error('Acesso não permitido.');
      var newProfile = await supabase.from('portal_users').insert({
        usuario: String(body.externalId || body.username).trim().toUpperCase(),
        username: window.USER_SERVICE.normalizeLoginUsername(body.username),
        nome: String(body.name || '').trim(),
        perfil: body.role,
        funcao: body.jobTitle || '',
        area: body.area || '',
        turno: body.shift || '',
        coordinator_id: body.role === 'operator' ? (body.coordinatorId || coordinator.profile.id) : null,
        status: body.active === false ? 'Inativo' : 'Ativo'
      }).select('*').single();
      failure(newProfile.error);
      return publicProfile(newProfile.data);
    }

    var userRoute = route.match(/^users\/([^/]+)$/);
    if (userRoute && method === 'PUT') {
      var id = decodeURIComponent(userRoute[1]);
      var changes = {};
      if (body.username !== undefined) changes.username = window.USER_SERVICE.normalizeLoginUsername(body.username);
      if (body.externalId !== undefined) changes.usuario = String(body.externalId || '').trim().toUpperCase();
      if (body.name !== undefined) changes.nome = String(body.name).trim();
      if (body.role !== undefined) changes.perfil = body.role;
      if (body.jobTitle !== undefined) changes.funcao = body.jobTitle;
      if (body.area !== undefined) changes.area = body.area;
      if (body.shift !== undefined) changes.turno = body.shift;
      if (body.active !== undefined) changes.status = body.active ? 'Ativo' : 'Inativo';
      var updatedProfile = await supabase.from('portal_users').update(changes).eq('id', id).select('*').single();
      failure(updatedProfile.error);
      return publicProfile(updatedProfile.data);
    }

    if (/^users\/[^/]+\/reset-password$/.test(route) && method === 'POST') {
      throw new Error('Por segurança, redefina a senha no Supabase Authentication. A chave administrativa não é disponibilizada no navegador.');
    }

    throw new Error('Operação Supabase não suportada: ' + method + ' ' + route);
  }

  window.SUPABASE_SERVICE = {
    request: request,
    hasSession: async function () {
      var result = await requireClient().auth.getSession();
      failure(result.error);
      return Boolean(result.data.session);
    },
    signOut: async function () {
      if (!client) return;
      var result = await client.auth.signOut();
      failure(result.error);
    },
    isConfigured: function () { return Boolean(config.supabaseUrl && config.supabaseAnonKey); },
  };
}());
