(function () {
  'use strict';

  var data = window.PROTOTYPE_DATA;
  var config = window.PORTAL_CONFIG;
  var portalData = window.PORTAL_DATA_SERVICE;
  window.EXCEL_IMPORT.hydrate(data);
  var persistedUsers = window.USER_SERVICE.getAll();
  data.operators.forEach(function (operator) {
    var account = persistedUsers.find(function (user) { return window.USER_SERVICE.normalizeUsername(user.username) === window.USER_SERVICE.normalizeUsername(operator.username); });
    operator.role = account ? account.role : operator.id === 'coord-01' ? 'coordinator' : 'operator';
  });
  var app = document.getElementById('app');
  var state = {
    user: window.AUTH_SERVICE.currentUser() || null,
    view: 'overview',
    selectedOperator: null,
    month: 'Todos os meses',
    year: 'Todos',
    area: 'Todas',
    labelCategory: 'SHE',
    usersQuery: '',
    userRoleFilter: 'Todos',
    userStatusFilter: 'Todos',
    userAreaFilter: 'Todas',
    userShiftFilter: 'Todos',
    userCoordinatorFilter: 'Todos',
    metricOperator: 'Todos',
    editingUserId: null,
    viewingUserId: null,
    importPreview: null,
    profileMessage: '',
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (character) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character];
    });
  }

  function options(values, selected) {
    return values.map(function (value) { return '<option value="' + escapeHtml(value) + '"' + (value === selected ? ' selected' : '') + '>' + escapeHtml(value) + '</option>'; }).join('');
  }

  function monthOptions(includeAll) {
    var months = ['Todos os meses'].concat(config.months);
    return options(months, state.month);
  }

  function yearOptions() {
    var years = portalData.availableYears();
    if (!years.length) years = config.years;
    return options(['Todos'].concat(years), state.year);
  }

  function logoMarkup(className) {
    return '<div class="' + className + '"><img src="' + config.logoPath + '" alt="Logo da empresa" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\';"><span class="brand-mark">Portal</span></div>';
  }

  function icon(name) {
    var icons = {
      overview: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>',
      journey: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>',
      tag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 5 8-1 8 8-8 8-8-8V5Zm4 4h.01"/></svg>',
      bos: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h4"/></svg>',
      ideas: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3Z"/></svg>',
      team: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 20c0-3 2-5 6-5s6 2 6 5M15 15c3 0 5 2 5 5"/></svg>',
      upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"/></svg>',
      download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
      logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>',
      arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
    };
    return icons[name] || '';
  }

  function render() {
    if (!state.user) {
      renderLogin();
      app.dataset.rendered = 'true';
      return;
    }
    if (state.user.mustChangePassword) {
      renderPasswordChange(true);
      app.dataset.rendered = 'true';
      return;
    }
    renderShell();
    app.dataset.rendered = 'true';
  }

  function renderPasswordChange(firstAccess) {
    app.innerHTML = '<main class="password-page"><div class="password-card">' + logoMarkup('password-logo') + '<p class="overline red">Segurança da conta</p><h1>Defina sua nova senha</h1><p class="muted">' + (firstAccess ? 'Esta é sua primeira entrada no Portal de Desempenho. Para continuar, defina uma nova senha.' : 'Atualize sua senha para manter o acesso protegido.') + '</p><form id="password-form"><label for="new-password">Nova senha</label><input id="new-password" type="password" required><div class="password-rules" id="password-rules"><span data-rule="length">○ 8 caracteres</span><span data-rule="upper">○ Letra maiúscula</span><span data-rule="lower">○ Letra minúscula</span><span data-rule="number">○ Número</span></div><label for="confirm-password">Confirmar nova senha</label><input id="confirm-password" type="password" required><p id="password-error" class="form-error"></p><button class="primary-button" type="submit">Salvar nova senha ' + icon('arrow') + '</button></form></div></main>';
    var newInput = document.getElementById('new-password');
    function updateRules() { var rules = window.AUTH_SERVICE.validatePassword(newInput.value); Object.keys(rules).forEach(function (rule) { var element = document.querySelector('[data-rule="' + rule + '"]'); element.textContent = (rules[rule] ? '✓ ' : '○ ') + element.textContent.slice(2); element.classList.toggle('passed', rules[rule]); }); }
    newInput.addEventListener('input', updateRules);
    document.getElementById('password-form').addEventListener('submit', function (event) { event.preventDefault(); var password = newInput.value; var confirmation = document.getElementById('confirm-password').value; var error = document.getElementById('password-error'); if (password !== confirmation) { error.textContent = 'As senhas não conferem.'; return; } var result = firstAccess ? window.AUTH_SERVICE.firstPassword(state.user.id, password) : window.AUTH_SERVICE.changePassword(state.user.id, state.user.password, password); if (result.error) { error.textContent = result.error; return; } state.user = result.user; state.view = 'overview'; render(); });
  }

  function renderLogin() {
    var logoPath = config.logoPath;
    app.innerHTML = '<main class="login-page">' +
      '<section class="login-brand"><div class="brand-logo"><img src="' + logoPath + '" alt="Logo da empresa" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\';"><span class="brand-mark">Portal</span></div><div class="brand-rule"></div><small>Portal de desempenho</small></section>' +
      '<section class="login-form-panel"><div class="login-card"><p class="overline red">Acesso corporativo</p><h2>Olá, que bom ter você aqui.</h2><p class="muted">Entre para acompanhar sua jornada e seus resultados.</p>' +
      '<form id="login-form"><label for="username">Usuário</label><input id="username" name="username" type="text" placeholder="Digite seu usuário" autocomplete="username" required><label for="password">Senha</label><input id="password" name="password" type="password" placeholder="Digite sua senha" autocomplete="current-password" required><button class="primary-button" type="submit">Entrar ' + icon('arrow') + '</button><button class="text-button" id="forgot-password" type="button">Esqueci minha senha</button><p id="login-error" class="form-error" role="alert"></p></form>' +
      '</div></section></main>';
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('forgot-password').addEventListener('click', function () { document.getElementById('login-error').textContent = 'A recuperação automática de senha será disponibilizada após a integração do portal ao ambiente corporativo.'; });
  }

  function handleLogin(event) {
    event.preventDefault();
    var form = new FormData(event.target);
    var username = form.get('username');
    var password = form.get('password');
    var error = document.getElementById('login-error');
    var result = window.AUTH_SERVICE.login(username, password);
    if (result.error) {
      error.textContent = result.error;
      return;
    }
    state.user = result.user;
    state.view = result.user.mustChangePassword ? 'change-password' : result.user.role === 'coordinator' ? 'team' : 'overview';
    render();
  }

  function renderShell() {
    var isCoordinator = state.user.role === 'coordinator';
    var nav = isCoordinator ? coordinatorNav() : operatorNav();
    var logoPath = config.logoPath;
    app.innerHTML = '<div class="app-shell"><aside class="sidebar"><div class="sidebar-brand"><div class="brand-logo small"><img src="' + logoPath + '" alt="Logo da empresa" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\';"><span class="brand-mark small">Portal</span></div></div><div class="profile-mini"><div class="avatar">' + initials(state.user.name) + '</div><div><strong>' + escapeHtml(state.user.name) + '</strong><span>' + (state.user.role === 'coordinator' ? 'COORDENADOR' : 'OPERADOR') + '</span></div></div><nav class="main-nav"><p class="nav-label">Menu principal</p>' + nav + '</nav><button class="logout-button" id="logout-button">' + icon('logout') + ' Sair</button></aside><main class="content"><header class="topbar"><button class="mobile-menu" id="mobile-menu" aria-label="Abrir menu">☰</button><div><p class="breadcrumb">Portal <span>/</span> ' + pageTitle() + '</p><h1>' + pageTitle() + '</h1></div><div class="topbar-date">' + state.month + ' ' + state.year + '<span>Dados locais de desenvolvimento</span></div></header><div class="page-content">' + pageContent() + '</div></main></div>';
    document.getElementById('logout-button').addEventListener('click', function () { window.AUTH_SERVICE.logout(); state.user = null; render(); });
    bindNav();
    bindPageActions();
  }

  function operatorNav() {
    return navItem('overview', 'Início', 'overview') + navItem('overview', 'Meu desempenho', 'overview') + navItem('journey', 'Minha jornada', 'journey') + navItem('etiquetas', 'Etiquetas', 'tag') + navItem('metas-area', 'Metas da área', 'team') + navItem('bos', 'BOS', 'bos') + navItem('bosq', 'BOSQ', 'bos') + navItem('ideias', 'Ideias de melhoria', 'ideas') + navItem('evolution', 'Minha evolução', 'overview') + navItem('profile', 'Meu perfil', 'team');
  }

  function coordinatorNav() {
    return navItem('overview', 'Visão geral', 'overview') + navItem('team', 'Minha equipe', 'team') + navItem('overview', 'Visão individual', 'overview') + navItem('journey', 'Jornada', 'journey') + navItem('etiquetas', 'Etiquetas', 'tag') + navItem('metas-area', 'Metas da área', 'team') + navItem('bos', 'BOS', 'bos') + navItem('bosq', 'BOSQ', 'bos') + navItem('ideias', 'Ideias', 'ideas') + navItem('import', 'Importar dados', 'upload') + navItem('export', 'Exportar dados', 'download') + navItem('users', 'Gestão de usuários', 'team') + navItem('profile', 'Meu perfil', 'team');
  }

  function navItem(view, label, iconName) {
    return '<button class="nav-item ' + (state.view === view ? 'active' : '') + '" data-view="' + view + '">' + icon(iconName) + '<span>' + label + '</span></button>';
  }

  function bindNav() {
    document.querySelectorAll('[data-view]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.view = button.dataset.view;
        renderShell();
      });
    });
    var mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) mobileMenu.addEventListener('click', function () { document.querySelector('.sidebar').classList.toggle('open'); });
  }

  function bindPageActions() {
    document.querySelectorAll('[data-select-operator]').forEach(function (button) {
      button.addEventListener('click', function () {
        var operator = data.operators.find(function (item) { return String(item.id) === String(button.dataset.selectOperator); });
        if (operator) { state.selectedOperator = operator; state.view = 'overview'; renderShell(); }
      });
    });
    ['month-filter', 'year-filter', 'area-filter'].forEach(function (id) {
      var select = document.getElementById(id);
      if (select) select.addEventListener('change', function () { state[id.replace('-filter', '')] = select.value; renderShell(); });
    });
    var monthSelect = document.getElementById('month-filter');
    if (monthSelect) { monthSelect.innerHTML = monthOptions(true); monthSelect.value = state.month; }
    var yearSelect = document.getElementById('year-filter');
    if (yearSelect) { yearSelect.innerHTML = yearOptions(); yearSelect.value = state.year; }
    var metricOperatorSelect = document.getElementById('metric-operator-filter');
    if (metricOperatorSelect) metricOperatorSelect.addEventListener('change', function () { state.metricOperator = metricOperatorSelect.value; state.selectedOperator = metricOperatorSelect.value === 'Todos' ? null : portalData.getOperators().find(function (operator) { return operator.id === metricOperatorSelect.value && operator.role === 'operator'; }) || null; renderShell(); });
    document.querySelectorAll('[data-label-category]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.labelCategory = button.dataset.labelCategory;
        renderShell();
      });
    });
    var backToTeam = document.getElementById('back-to-team');
    if (backToTeam) backToTeam.addEventListener('click', function () { state.selectedOperator = null; state.metricOperator = 'Todos'; state.area = 'Todas'; renderShell(); });
    var search = document.getElementById('operator-search');
    if (search) search.addEventListener('input', filterOperators);
    var excelFile = document.getElementById('excel-file');
    if (excelFile) excelFile.addEventListener('change', handleExcelFile);
    var confirmImport = document.getElementById('confirm-import');
    if (confirmImport) confirmImport.addEventListener('click', confirmExcelImport);
    var cancelImport = document.getElementById('cancel-import');
    if (cancelImport) cancelImport.addEventListener('click', function () { state.importPreview = null; renderShell(); });
    var templateButton = document.getElementById('download-template');
    if (templateButton) templateButton.addEventListener('click', window.EXCEL_IMPORT.downloadTemplate);
    var exportButton = document.getElementById('export-excel');
    if (exportButton) exportButton.addEventListener('click', window.EXCEL_IMPORT.exportAll);
    document.querySelectorAll('[data-export-sheet]').forEach(function (button) { button.addEventListener('click', function () { window.EXCEL_IMPORT.exportSheet(button.dataset.exportSheet); }); });
    var profileForm = document.getElementById('profile-password-form');
    if (profileForm) profileForm.addEventListener('submit', function (event) { event.preventDefault(); var current = document.getElementById('current-profile-password').value; var password = document.getElementById('new-profile-password').value; var confirmation = document.getElementById('confirm-profile-password').value; var error = document.getElementById('profile-password-error'); if (password !== confirmation) { error.textContent = 'As senhas não conferem.'; return; } var result = window.AUTH_SERVICE.changePassword(state.user.id, current, password); if (result.error) error.textContent = result.error; else { state.user = result.user; error.textContent = 'Senha alterada com sucesso.'; } });
    var saveUser = document.getElementById('save-user');
    if (saveUser) saveUser.addEventListener('click', saveUserForm);
    var roleInput = document.getElementById('user-role');
    var coordinatorField = document.getElementById('coordinator-field');
    function updateCoordinatorField() { if (roleInput && coordinatorField) coordinatorField.style.display = roleInput.value === 'coordinator' ? 'none' : 'grid'; }
    if (roleInput) { roleInput.addEventListener('change', updateCoordinatorField); updateCoordinatorField(); }
    var nameInput = document.getElementById('user-name');
    var usernameInput = document.getElementById('user-username');
    if (nameInput && usernameInput) {
      nameInput.addEventListener('input', function () {
        if (!usernameInput.value || usernameInput.dataset.isManual === 'true') return;
        usernameInput.value = window.USER_SERVICE.buildUsernameFromName(nameInput.value);
      });
      usernameInput.addEventListener('focus', function () { usernameInput.dataset.isManual = 'true'; });
      usernameInput.addEventListener('input', function () { usernameInput.dataset.isManual = 'true'; });
    }
    document.querySelectorAll('[data-user-action]').forEach(function (button) { button.addEventListener('click', handleUserAction); });
    var userSearch = document.getElementById('user-search');
    if (userSearch) userSearch.addEventListener('input', function () { state.usersQuery = userSearch.value; renderShell(); });
    ['user-role-filter', 'user-status-filter', 'user-area-filter', 'user-shift-filter', 'user-coordinator-filter'].forEach(function (id) {
      var filter = document.getElementById(id);
      if (!filter) return;
      var stateKey = { 'user-role-filter': 'userRoleFilter', 'user-status-filter': 'userStatusFilter', 'user-area-filter': 'userAreaFilter', 'user-shift-filter': 'userShiftFilter', 'user-coordinator-filter': 'userCoordinatorFilter' }[id];
      filter.value = state[stateKey];
      filter.addEventListener('change', function () { state[stateKey] = filter.value; renderShell(); });
    });
  }

  function filterOperators(event) {
    var term = event.target.value.toLowerCase();
    document.querySelectorAll('[data-operator-row]').forEach(function (row) { row.hidden = !row.dataset.operatorRow.toLowerCase().includes(term); });
  }

  function pageTitle() {
    var titles = { overview: 'Visão geral', journey: 'Minha jornada', etiquetas: 'Etiquetas', 'metas-area': 'Metas da área', bos: 'BOS', bosq: 'BOSQ', ideias: 'Ideias de melhoria', evolution: 'Minha evolução', team: 'Minha equipe', import: 'Importar dados', export: 'Exportar dados', users: 'Gestão de usuários', profile: 'Meu perfil' };
    return titles[state.view] || 'Visão geral';
  }

  function pageContent() {
    if (['import', 'export'].includes(state.view) && state.user.role !== 'coordinator') return '<section class="page-intro"><h2>Acesso restrito</h2><p class="muted">Somente coordenadores podem gerenciar dados.</p></section>';
    if (['users', 'new-user', 'edit-user', 'view-user'].includes(state.view) && state.user.role !== 'coordinator') return '<section class="page-intro"><h2>Acesso restrito</h2><p class="muted">Somente coordenadores podem gerir usuários.</p></section>';
    if (state.view === 'team') return teamPage();
    if (state.view === 'users') return usersPage();
    if (state.view === 'new-user' || state.view === 'edit-user') return userForm();
    if (state.view === 'view-user') return viewUserPage();
    if (state.view === 'profile') return profilePage();
    if (state.view === 'import') return importPage();
    if (state.view === 'export') return exportPage();
    if (state.view === 'journey') return journeyPage();
    if (state.view === 'ideias') return ideasPage();
    if (state.view === 'evolution') return overviewPage();
    if (state.view === 'etiquetas') return labelsPage();
    if (state.view === 'metas-area') return areaGoalsPage();
    if (['bos', 'bosq'].includes(state.view)) return metricPage(state.view);
    return overviewPage();
  }

  function teamOperators() {
    return portalData.getOperators().filter(function (operator) {
      var coordinator = portalData.normalizeArea(operator.coordinator);
      return operator.role === 'operator' && (!state.user || state.user.role !== 'coordinator' || !coordinator || coordinator === portalData.normalizeArea(state.user.name) || coordinator === 'MICHELLE FARIA');
    });
  }

  function visibleOperators() {
    var operators = teamOperators();
    if (state.selectedOperator && state.selectedOperator.role === 'operator') {
      operators = operators.filter(function (operator) { return operator.username === state.selectedOperator.username; });
    } else if (state.user.role !== 'coordinator') {
      operators = operators.filter(function (operator) { return operator.username === state.user.username; });
      if (!operators.length) operators = [state.user];
    }
    return operators.filter(function (operator) { return state.area === 'Todas' || portalData.normalizeArea(operator.area) === portalData.normalizeArea(state.area); });
  }

  function selectedOperatorValue() {
    return state.selectedOperator && state.selectedOperator.role === 'operator' ? state.selectedOperator.id : 'Todos';
  }

  function portalFilters(overrides) {
    var selected = state.selectedOperator;
    if (!selected && state.user && state.user.role !== 'coordinator') selected = state.user;
    return Object.assign({
      selectedUser: selected && selected.username,
      selectedArea: state.area,
      selectedMonth: state.month,
      selectedYear: state.year
    }, overrides || {});
  }

  function getRecords(sheet) {
    if (sheet === 'OPERADORES') return portalData.getOperators();
    if (sheet === 'JORNADA') return portalData.getAttendance();
    if (sheet === 'ETIQUETAS') return portalData.getLabels();
    if (sheet === 'BOS') return portalData.getBos();
    if (sheet === 'BOSQ') return portalData.getBosq();
    if (sheet === 'IDEIAS') return portalData.getIdeas();
    if (sheet === 'METAS') return portalData.getGoals();
    return [];
  }

  function filteredRecords(sheet, overrides) {
    return portalData.applyFilters(getRecords(sheet), portalFilters(overrides), portalData.getOperators());
  }

  function operatorForId(operatorId) {
    return portalData.getOperators().find(function (operator) { return operator.id === operatorId; }) ||
      data.operators.find(function (operator) { return operator.id === operatorId; });
  }

  function goalConfig() {
    return (window.PORTAL_CONFIG && window.PORTAL_CONFIG.goalConfig) || {
      monthly: { BOS: 5, BOSQ: 5, SHE_ABERTAS: 2, SHE_FECHADAS: 2, IDEIAS_ABERTAS: 1 },
      required: ['BOS', 'BOSQ', 'SHE_ABERTAS', 'SHE_FECHADAS', 'IDEIAS_ABERTAS']
    };
  }

  function getOperatorGoalValue(operatorId, metricKey, year, month) {
    if (portalData.hasImportedData()) {
      var operator = operatorForId(operatorId);
      if (!operator) return 0;
      var aliases = { IDEIAS_ABERTAS: 'IDEIAS' };
      var indicator = aliases[metricKey] || metricKey;
      var goalRows = portalData.applyFilters(getRecords('METAS'), {
        selectedUser: operator.username, selectedArea: state.area, selectedMonth: month, selectedYear: year
      }, portalData.getOperators()).filter(function (row) {
        return String(row.indicador || '').trim().toUpperCase().replace(/\s+/g, '_') === indicator;
      });
      if (goalRows.length) return goalRows.reduce(function (sum, row) { return sum + Number(String(row.meta || 0).replace(',', '.')); }, 0);
      var sheet = metricKey === 'BOS' ? 'BOS' : metricKey === 'BOSQ' ? 'BOSQ' : metricKey.indexOf('SHE_') === 0 ? 'ETIQUETAS' : metricKey === 'IDEIAS_ABERTAS' ? 'IDEIAS' : '';
      var periods = Object.create(null);
      if (sheet) portalData.applyFilters(getRecords(sheet), {
        selectedUser: operator.username, selectedArea: state.area, selectedMonth: 'Todos os meses', selectedYear: year
      }, portalData.getOperators()).forEach(function (row) {
        var date = portalData.parsePortalDate(row.data);
        if (date) periods[date.getFullYear() + '-' + (date.getMonth() + 1)] = true;
      });
      var periodCount = month === 'Todos os meses' ? Math.max(Object.keys(periods).length, 1) : 1;
      return Number(goalConfig().monthly[metricKey] || 0) * periodCount;
    }
    var matrix = (window.PROTOTYPE_DATA && window.PROTOTYPE_DATA.monthlyGoals) || {};
    var record = matrix[operatorId] && matrix[operatorId][year] && matrix[operatorId][year][month];
    if (record && typeof record[metricKey] !== 'undefined') return Number(record[metricKey] || 0);
    if (metricKey === 'BOS') return Number((window.PROTOTYPE_DATA && window.PROTOTYPE_DATA.bos && window.PROTOTYPE_DATA.bos[operatorId]) || 0);
    if (metricKey === 'BOSQ') return Number((window.PROTOTYPE_DATA && window.PROTOTYPE_DATA.bosq && window.PROTOTYPE_DATA.bosq[operatorId]) || 0);
    if (metricKey === 'IDEIAS_ABERTAS') return Number((window.PROTOTYPE_DATA && window.PROTOTYPE_DATA.ideas && window.PROTOTYPE_DATA.ideas[operatorId]) || 0);
    return 0;
  }

  function countLabelEntries(operatorId, category, status, year, month) {
    var operator = operatorForId(operatorId);
    if (portalData.hasImportedData()) {
      if (!operator) return 0;
      return portalData.applyFilters(getRecords('ETIQUETAS'), {
        selectedUser: operator.username, selectedArea: state.area, selectedMonth: month, selectedYear: year
      }, portalData.getOperators()).filter(function (entry) {
        return String(entry.categoria || '').trim().toUpperCase() === category &&
          String(entry.status || '').trim().toUpperCase() === status;
      }).length;
    }
    var labels = (window.PROTOTYPE_DATA && window.PROTOTYPE_DATA.labels) || [];
    return labels.filter(function (entry) { return entry.userId === operatorId && entry.year === year && entry.month === month && entry.category === category && entry.status === status; })
      .reduce(function (sum, entry) { return sum + Number(entry.count || 0); }, 0);
  }

  function getMetricRealized(operatorId, metricKey) {
    var year = state.year;
    var month = state.month;
    var operator = operatorForId(operatorId);
    if (portalData.hasImportedData()) {
      if (!operator) return 0;
      var filters = { selectedUser: operator.username, selectedArea: state.area, selectedMonth: month, selectedYear: year };
      if (metricKey === 'SHE_ABERTAS') return countLabelEntries(operatorId, 'SHE', 'ABERTA', year, month);
      if (metricKey === 'SHE_FECHADAS') return countLabelEntries(operatorId, 'SHE', 'FECHADA', year, month);
      if (metricKey === 'BOS') return portalData.applyFilters(getRecords('BOS'), filters, portalData.getOperators()).length;
      if (metricKey === 'BOSQ') return portalData.applyFilters(getRecords('BOSQ'), filters, portalData.getOperators()).length;
      if (metricKey === 'IDEIAS_ABERTAS') return portalData.applyFilters(getRecords('IDEIAS'), filters, portalData.getOperators()).length;
      if (metricKey === 'MA') return portalData.applyFilters(getRecords('ETIQUETAS'), filters, portalData.getOperators()).filter(function (entry) { return String(entry.categoria || '').toUpperCase() === 'MA'; }).length;
      return 0;
    }
    if (metricKey === 'SHE_ABERTAS') return countLabelEntries(operatorId, 'SHE', 'ABERTA', year, month) || getOperatorGoalValue(operatorId, 'SHE_ABERTAS', year, month);
    if (metricKey === 'SHE_FECHADAS') return countLabelEntries(operatorId, 'SHE', 'FECHADA', year, month) || getOperatorGoalValue(operatorId, 'SHE_FECHADAS', year, month);
    if (metricKey === 'MA') return countLabelEntries(operatorId, 'MA', 'TOTAL', year, month) || getOperatorGoalValue(operatorId, 'MA', year, month);
    return getOperatorGoalValue(operatorId, metricKey, year, month);
  }

  function goalStatusText(actual, goal) {
    return actual >= goal ? 'OK' : 'NÃO OK';
  }

  function goalStatusClass(actual, goal) {
    return actual >= goal ? 'positive' : 'warning';
  }

  function getMonthlyGoalSummary(operatorId) {
    var bosGoal = portalData.hasImportedData() ? getOperatorGoalValue(operatorId, 'BOS', state.year, state.month) : goalConfig().monthly.BOS;
    var bosqGoal = portalData.hasImportedData() ? getOperatorGoalValue(operatorId, 'BOSQ', state.year, state.month) : goalConfig().monthly.BOSQ;
    var sheOpenGoal = portalData.hasImportedData() ? getOperatorGoalValue(operatorId, 'SHE_ABERTAS', state.year, state.month) : goalConfig().monthly.SHE_ABERTAS;
    var sheClosedGoal = portalData.hasImportedData() ? getOperatorGoalValue(operatorId, 'SHE_FECHADAS', state.year, state.month) : goalConfig().monthly.SHE_FECHADAS;
    var ideasGoal = portalData.hasImportedData() ? getOperatorGoalValue(operatorId, 'IDEIAS_ABERTAS', state.year, state.month) : goalConfig().monthly.IDEIAS_ABERTAS;
    var summary = {
      BOS: { meta: bosGoal, realizado: getMetricRealized(operatorId, 'BOS'), status: goalStatusText(getMetricRealized(operatorId, 'BOS'), bosGoal) },
      BOSQ: { meta: bosqGoal, realizado: getMetricRealized(operatorId, 'BOSQ'), status: goalStatusText(getMetricRealized(operatorId, 'BOSQ'), bosqGoal) },
      SHE_ABERTAS: { meta: sheOpenGoal, realizado: getMetricRealized(operatorId, 'SHE_ABERTAS'), status: goalStatusText(getMetricRealized(operatorId, 'SHE_ABERTAS'), sheOpenGoal) },
      SHE_FECHADAS: { meta: sheClosedGoal, realizado: getMetricRealized(operatorId, 'SHE_FECHADAS'), status: goalStatusText(getMetricRealized(operatorId, 'SHE_FECHADAS'), sheClosedGoal) },
      IDEIAS_ABERTAS: { meta: ideasGoal, realizado: getMetricRealized(operatorId, 'IDEIAS_ABERTAS'), status: goalStatusText(getMetricRealized(operatorId, 'IDEIAS_ABERTAS'), ideasGoal) }
    };
    summary.GERAL = {
      status: goalConfig().required.every(function (key) {
        var metric = summary[key];
        return metric && metric.status === 'OK';
      }) ? 'OK' : 'NÃO OK'
    };
    return summary;
  }

  function formatGoalMetricCell(metricKey, operator) {
    var summary = getMonthlyGoalSummary(operator.id);
    var metric = summary[metricKey];
    if (!metric) return '<span class="status neutral">-</span>';
    var statusText = metric.status === 'OK' ? 'OK' : 'NÃO OK';
    return '<div><span class="status ' + goalStatusClass(metric.realizado, metric.meta) + '">' + statusText + '</span><small>' + metric.realizado + '/' + metric.meta + '</small></div>';
  }

  function formatMetricForScope(metric, operators) {
    if (portalData.hasImportedData()) return metric.value;
    if (state.user.role !== 'coordinator' || state.selectedOperator || operators.length === teamOperators().length) return metric.value;
    var ratio = operators.length / Math.max(teamOperators().length, 1);
    if (metric.id === 'etiquetas' || metric.id === 'bos' || metric.id === 'ideias') {
      var numeric = Number(String(metric.value).replace(/\./g, '').replace(',', '.'));
      return Math.round(numeric * ratio).toLocaleString('pt-BR');
    }
    return metric.value;
  }

  function teamContextCard(operators) {
    var counts = { 'CAFÉ CRU': 0, MOAGEM: 0, TORRADOR: 0 };
    operators.forEach(function (operator) { if (counts[operator.area] != null) counts[operator.area] += 1; });
    return '<div class="person-strip"><div class="avatar large">EQ</div><div><strong>Equipe de processos</strong><span>' + operators.length + ' operador' + (operators.length === 1 ? '' : 'es') + ' analisado' + (operators.length === 1 ? '' : 's') + '</span></div><div class="person-meta"><span>Áreas</span><strong>Café Cru: ' + counts['CAFÉ CRU'] + ' · Moagem: ' + counts.MOAGEM + ' · Torrador: ' + counts.TORRADOR + '</strong><small>Coordenadora: ' + escapeHtml(state.user.name) + '</small></div></div>';
  }

  function coordinatorFilters() {
    var operators = teamOperators();
    var areas = operators.map(function (operator) { return operator.area; }).filter(function (area, index, all) { return area && all.indexOf(area) === index; }).sort();
    return '<div class="filters metric-filters"><label>Operador<select id="metric-operator-filter"><option value="Todos"' + (selectedOperatorValue() === 'Todos' ? ' selected' : '') + '>Todos os operadores</option>' + operators.map(function (operator) { return '<option value="' + operator.id + '"' + (selectedOperatorValue() === operator.id ? ' selected' : '') + '>' + escapeHtml(operator.name) + '</option>'; }).join('') + '</select></label><label>Área / Processo<select id="area-filter"><option value="Todas">Todas (' + operators.length + ')</option>' + areas.map(function (area) { return '<option value="' + escapeHtml(area) + '"' + (state.area === area ? ' selected' : '') + '>' + escapeHtml(area) + '</option>'; }).join('') + '</select></label><label>Mês<select id="month-filter">' + monthOptions(true) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></label></div>';
  }

  function countRows(sheet, filters, predicate) {
    return portalData.applyFilters(getRecords(sheet), filters || portalFilters(), portalData.getOperators()).filter(predicate || function () { return true; }).length;
  }

  function dashboardMetrics() {
    if (!portalData.hasImportedData()) {
      return data.metrics.map(function (metric) { return Object.assign({}, metric, { value: formatMetricForScope(metric, visibleOperators()) }); });
    }
    var filters = portalFilters();
    var journey = countRows('JORNADA', filters);
    var labels = portalData.applyFilters(getRecords('ETIQUETAS'), filters, portalData.getOperators());
    var sheOpen = labels.filter(function (row) { return String(row.categoria || '').toUpperCase() === 'SHE' && String(row.status || '').toUpperCase() === 'ABERTA'; }).length;
    var sheClosed = labels.filter(function (row) { return String(row.categoria || '').toUpperCase() === 'SHE' && String(row.status || '').toUpperCase() === 'FECHADA'; }).length;
    var maCount = labels.filter(function (row) { return String(row.categoria || '').toUpperCase() === 'MA'; }).length;
    var bos = countRows('BOS', filters);
    var bosq = countRows('BOSQ', filters);
    var ideas = countRows('IDEIAS', filters);
    return data.metrics.map(function (metric) {
      var copy = Object.assign({}, metric);
      var actual = 0, target = goalConfig().monthly.BOS * Math.max(visibleOperators().length, 1);
      if (metric.id === 'jornada') {
        actual = journey;
        copy.value = String(journey);
        copy.detail = 'registros no período';
      } else if (metric.id === 'etiquetas') {
        actual = sheOpen + sheClosed + maCount;
        target = (goalConfig().monthly.SHE_ABERTAS + goalConfig().monthly.SHE_FECHADAS) * Math.max(visibleOperators().length, 1);
        copy.value = 'SHE ' + (sheOpen + sheClosed) + ' · MA ' + maCount;
        copy.detail = 'Abertas ' + sheOpen + ' · Fechadas ' + sheClosed;
      } else if (metric.id === 'bos') {
        actual = bos;
        copy.value = String(bos);
        copy.detail = 'registros no período';
      } else if (metric.id === 'bosq') {
        actual = bosq;
        target = goalConfig().monthly.BOSQ * Math.max(visibleOperators().length, 1);
        copy.value = String(bosq);
        copy.detail = 'registros no período';
      } else if (metric.id === 'ideias') {
        actual = ideas;
        target = goalConfig().monthly.IDEIAS_ABERTAS * Math.max(visibleOperators().length, 1);
        copy.value = String(ideas);
        copy.detail = 'ideias criadas no período';
      }
      copy.values = [Math.min(100, Math.round(actual / Math.max(target, 1) * 100))];
      copy.trend = 'No período selecionado';
      return copy;
    });
  }

  function monthlyActivitySeries() {
    var months = state.month === 'Todos os meses' ? config.months : [state.month];
    var series = months.map(function (month) {
      var filters = portalFilters({ selectedMonth: month });
      var total = ['JORNADA', 'ETIQUETAS', 'BOS', 'BOSQ', 'IDEIAS'].reduce(function (sum, sheet) { return sum + countRows(sheet, filters); }, 0);
      return { label: month.slice(0, 3), value: total };
    });
    var max = series.reduce(function (value, item) { return Math.max(value, item.value); }, 0);
    return series.map(function (item) { return { label: item.label, value: max ? Math.round(item.value / max * 100) : 0, count: item.value }; });
  }

  async function handleExcelFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    var status = document.getElementById('import-status');
    status.textContent = 'Lendo abas e validando registros...';
    try {
      var workbook = await window.EXCEL_IMPORT.parseFile(file);
      var existingSnapshot = window.EXCEL_IMPORT.load();
      state.importPreview = { file: file.name, workbook: workbook, result: window.EXCEL_IMPORT.preview(workbook, window.USER_SERVICE.getAll(), existingSnapshot && existingSnapshot.records) };
      renderShell();
    } catch (error) {
      status.textContent = error.message || 'Não foi possível ler o arquivo.';
      status.className = 'form-error';
    }
  }

  function confirmExcelImport() {
    if (!state.importPreview) return;
    try {
      var result = state.importPreview.result;
      var importedOperators = result.valid.filter(function (item) { return item.sheet === 'OPERADORES'; });
      var userIds = {};
      importedOperators.forEach(function (item) {
        var row = item.row;
        var status = String(row.status || '').trim().toUpperCase();
        var user = window.USER_SERVICE.syncImportedOperator({
          username: window.EXCEL_IMPORT.normalizeUsuario(row.usuario),
          name: row.nome,
          role: row.perfil,
          jobTitle: row.funcao,
          area: row.area,
          shift: row.turno,
          coordinatorName: row.coordenador,
          active: status !== 'INATIVO' && status !== 'INACTIVE' && status !== '0' && status !== 'FALSE'
        });
        if (user.error) throw new Error(user.error);
        userIds[window.EXCEL_IMPORT.normalizeUsuario(row.usuario)] = user.id;
        item.userId = user.id;
      });
      var availableUsers = window.USER_SERVICE.getAll();
      result.valid.filter(function (item) { return item.sheet !== 'OPERADORES'; }).forEach(function (item) {
        var usuario = window.EXCEL_IMPORT.normalizeUsuario(item.row.usuario);
        var existingUser = availableUsers.find(function (user) { return window.EXCEL_IMPORT.normalizeUsuario(user.username) === usuario; });
        item.userId = userIds[usuario] || (existingUser && existingUser.id);
        if (!item.userId) throw new Error('Não foi possível associar Usuario ' + usuario + ' ao ID interno do usuário.');
      });
      var report = window.EXCEL_IMPORT.commit(result, data);
      window.EXCEL_IMPORT.applyToData(report, data);
      state.importPreview.report = report;
      state.importPreview.confirmed = true;
    } catch (error) {
      state.importPreview.importError = error instanceof Error ? error.message : 'Não foi possível confirmar a importação.';
    }
    renderShell();
  }

  function importPage() {
    var preview = state.importPreview;
    var result = preview && preview.result;
    var report = preview && preview.report;
    var summary = result ? '<div class="import-summary"><div><span>Registros encontrados</span><strong>' + result.counts.total + '</strong></div><div class="valid"><span>Registros válidos</span><strong>' + result.counts.valid + '</strong></div><div class="new"><span>Novos registros</span><strong>' + result.counts.newRecords + '</strong></div><div class="updated"><span>Serão atualizados</span><strong>' + result.counts.updates + '</strong></div><div class="invalid"><span>Registros com erro</span><strong>' + result.counts.errors + '</strong></div><div class="invalid"><span>Possíveis duplicidades</span><strong>' + result.counts.duplicates + '</strong></div></div>' : '';
    var errors = result && result.errors.length ? '<div class="import-errors"><h4>Erros encontrados</h4>' + result.errors.slice(0, 12).map(function (error) { return '<p><strong>' + error.sheet + ', linha ' + error.line + ':</strong> ' + error.message + '</p>'; }).join('') + (result.errors.length > 12 ? '<p>+' + (result.errors.length - 12) + ' erros adicionais.</p>' : '') + '</div>' : '';
    if (preview && preview.importError) errors += '<div class="import-errors"><p>' + escapeHtml(preview.importError) + '</p></div>';
    var finished = report ? '<div class="import-success"><strong>IMPORTAÇÃO CONCLUÍDA</strong><span>Registros adicionados: ' + report.added + '</span><span>Registros atualizados: ' + report.updated + '</span><span>Registros ignorados: ' + report.ignored + '</span><span>Registros com erro: ' + report.errors + '</span><small>Atualizado em ' + report.importedAt + '. Persistência temporária local.</small></div>' : '';
    return '<section class="page-intro"><p class="overline red">Gestão de dados</p><h2>Importar dados</h2><p class="muted">Atualize o portal a partir de um único arquivo Excel com as abas padronizadas.</p></section><div class="notice-banner"><span class="notice-icon">i</span><div><strong>Excel → Site</strong><p>Esta é uma importação demonstrativa. Os dados ficam somente neste navegador, em localStorage, até a integração futura com a API e o banco de dados.</p></div></div><section class="import-panel"><div class="import-panel-heading"><div><p class="overline">Etapa 1</p><h3>Selecione o arquivo Excel</h3><p class="muted">Use .xlsx, .xls ou .csv. O arquivo pode conter as abas OPERADORES, JORNADA, ETIQUETAS, BOS, BOSQ, IDEIAS e METAS.</p></div><div class="import-tools"><button class="outline-button" id="download-template">' + icon('download') + ' Baixar modelo de Excel</button><button class="outline-button" id="export-excel">' + icon('download') + ' Exportar dados atuais</button></div></div><label class="file-drop" for="excel-file"><span class="upload-circle">' + icon('upload') + '</span><strong>Escolha um arquivo para importar</strong><small>Depois da leitura você verá a prévia antes de confirmar.</small><input id="excel-file" type="file" accept=".xlsx,.xls,.csv"></label><p id="import-status" class="import-status"></p></section>' + (summary ? '<section class="import-panel preview-panel"><div class="table-heading"><div><p class="overline">Etapas 2 a 7</p><h3>Prévia da importação</h3></div><strong class="file-name">' + escapeHtml(preview.file) + '</strong></div>' + summary + errors + (report ? finished : '<div class="import-actions"><button class="outline-button" id="cancel-import">Cancelar</button><button class="primary-button" id="confirm-import">Confirmar importação ' + icon('arrow') + '</button></div>') + '</section>' : '') + '<section class="import-panel schema-panel"><div><p class="overline">Estrutura esperada</p><h3>Abas e identificadores</h3><p class="muted">O campo Usuario é a chave principal para identificar cada colaborador. Os registros das demais abas são associados ao colaborador através desse identificador. Registros repetidos usam a combinação de identificação de cada aba para atualizar, não duplicar.</p></div><div class="schema-list">' + Object.keys(window.EXCEL_IMPORT.SHEETS).map(function (sheet) { return '<span><strong>' + sheet + '</strong>' + window.EXCEL_IMPORT.SHEETS[sheet].join(' · ') + '</span>'; }).join('') + '</div></section>';
  }

  function exportPage() {
    return '<section class="page-intro"><p class="overline red">Gestão de dados</p><h2>Exportar dados</h2><p class="muted">Baixe cada indicador em uma planilha independente, sem misturar BOS e BOSQ.</p></section><section class="import-panel"><p class="overline">Site → Excel</p><h3>Exportação por indicador</h3><p class="muted">Escolha qual conjunto de registros deseja exportar.</p><div class="import-tools"><button class="outline-button" data-export-sheet="BOS">' + icon('download') + ' Exportar BOS</button><button class="outline-button" data-export-sheet="BOSQ">' + icon('download') + ' Exportar BOSQ</button><button class="primary-button" id="export-excel">' + icon('download') + ' Exportar dados atuais</button></div></section>';
  }

  function usersPage() {
    var allUsers = window.USER_SERVICE.getAll();
    var coordinators = window.USER_SERVICE.getCoordinators();
    var areas = allUsers.map(function (user) { return user.area; }).filter(Boolean).filter(function (value, index, values) { return values.indexOf(value) === index; });
    var shifts = allUsers.map(function (user) { return user.shift; }).filter(Boolean).filter(function (value, index, values) { return values.indexOf(value) === index; });
    var users = allUsers.filter(function (user) {
      var query = state.usersQuery.toLowerCase();
      var coordinator = coordinators.find(function (item) { return item.id === user.coordinatorId; });
      return (!query || (user.name + ' ' + user.username).toLowerCase().includes(query) || window.USER_SERVICE.normalizeUsuario(user.username).includes(window.USER_SERVICE.normalizeUsuario(query))) &&
        (state.userRoleFilter === 'Todos' || user.role === state.userRoleFilter) &&
        (state.userStatusFilter === 'Todos' || (user.active ? 'active' : 'inactive') === state.userStatusFilter) &&
        (state.userAreaFilter === 'Todas' || user.area === state.userAreaFilter) &&
        (state.userShiftFilter === 'Todos' || user.shift === state.userShiftFilter) &&
        (state.userCoordinatorFilter === 'Todos' || (coordinator && coordinator.id === state.userCoordinatorFilter));
    });
    var message = state.profileMessage ? '<p class="form-success">' + escapeHtml(state.profileMessage) + '</p>' : '';
    state.profileMessage = '';
    return '<section class="page-intro"><p class="overline red">Administração</p><h2>Gestão de usuários</h2><p class="muted">Cadastre e mantenha usuários diretamente pelo portal.</p></section>' + message + '<div class="users-toolbar"><input id="user-search" type="search" value="' + escapeHtml(state.usersQuery) + '" placeholder="Pesquisar por nome ou usuário"><button class="primary-button" data-view="new-user">+ Cadastrar usuário</button></div><div class="filters user-filters"><label>Perfil<select id="user-role-filter"><option value="Todos">Todos</option><option value="operator">Operador</option><option value="coordinator">Coordenador</option></select></label><label>Área / Processo<select id="user-area-filter"><option value="Todas">Todas</option>' + areas.map(function (item) { return '<option>' + escapeHtml(item) + '</option>'; }).join('') + '</select></label><label>Turno<select id="user-shift-filter"><option>Todos</option>' + shifts.map(function (item) { return '<option>' + escapeHtml(item) + '</option>'; }).join('') + '</select></label><label>Coordenador<select id="user-coordinator-filter"><option value="Todos">Todos</option>' + coordinators.map(function (item) { return '<option value="' + item.id + '">' + escapeHtml(item.name) + '</option>'; }).join('') + '</select></label><label>Status<select id="user-status-filter"><option value="Todos">Todos</option><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label></div><section class="table-panel team-panel"><div class="table-heading"><div><p class="overline">' + users.length + ' usuários</p><h3>Lista de usuários</h3></div><span class="updated">Sem exclusão definitiva</span></div><div class="table-scroll"><table><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Função</th><th>Área / Processo</th><th>Turno</th><th>Coordenador</th><th>Status</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>' + users.map(function (user) { var coordinator = coordinators.find(function (item) { return item.id === user.coordinatorId; }); return '<tr><td><strong>' + escapeHtml(user.name) + '</strong></td><td>' + escapeHtml(user.username) + '</td><td>' + (user.role === 'coordinator' ? 'COORDENADOR' : 'OPERADOR') + '</td><td>' + escapeHtml(user.jobTitle) + '</td><td>' + escapeHtml(user.area) + '</td><td>' + escapeHtml(user.shift || '-') + '</td><td>' + (coordinator ? escapeHtml(coordinator.name) : '-') + '</td><td><span class="status ' + (user.active ? 'on-track' : 'warning') + '">' + (user.active ? 'Ativo' : 'Inativo') + '</span></td><td>' + (user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('pt-BR') : '-') + '</td><td><div class="user-actions"><button data-user-action="view" data-user-id="' + user.id + '">Visualizar</button><button data-user-action="edit" data-user-id="' + user.id + '">Editar</button><button data-user-action="reset" data-user-id="' + user.id + '">Resetar senha</button><button data-user-action="toggle" data-user-id="' + user.id + '">' + (user.active ? 'Desativar' : 'Ativar') + '</button></div></td></tr>'; }).join('') + '</tbody></table></div></section>';
  }

  function userForm() {
    var coordinators = window.USER_SERVICE.getCoordinators();
    var areaOptions = ['CAFÉ CRU', 'MOAGEM', 'TORRADOR', 'Processos'];
    var editing = state.view === 'edit-user' ? window.USER_SERVICE.getById(state.editingUserId) : null;
    var value = function (key) { return editing ? escapeHtml(editing[key] || '') : ''; };
    var selected = function (key, option) { return editing && editing[key] === option ? ' selected' : ''; };
      return '<section class="page-intro"><p class="overline red">Administração</p><h2>' + (editing ? 'Editar usuário' : 'Cadastrar usuário') + '</h2><p class="muted">' + (editing ? 'Atualize o cadastro diretamente pelo portal.' : 'O novo usuário receberá uma senha temporária e deverá alterá-la no primeiro acesso.') + '</p></section><section class="import-panel user-form"><div class="form-grid"><label>Nome completo *<input id="user-name" value="' + value('name') + '" required></label><label>Usuário / Login *<input id="user-username" value="' + value('username') + '" placeholder="Ex.: michelle.faria" required></label><label>Perfil *<select id="user-role"><option value="operator"' + selected('role', 'operator') + '>OPERADOR</option><option value="coordinator"' + selected('role', 'coordinator') + '>COORDENADOR</option></select></label><label>Função *<input id="user-job" value="' + value('jobTitle') + '" placeholder="Ex.: Operador de Processos" required></label><label>Área / Processo *<select id="user-area"><option value="">Selecione</option>' + areaOptions.map(function (item) { return '<option value="' + item + '"' + selected('area', item) + '>' + item + '</option>'; }).join('') + '</select></label><label>Turno<input id="user-shift" value="' + value('shift') + '" placeholder="Opcional"></label><label id="coordinator-field">Coordenador responsável<select id="user-coordinator"><option value="">Selecione</option>' + coordinators.map(function (item) { return '<option value="' + item.id + '"' + selected('coordinatorId', item.id) + '>' + escapeHtml(item.name) + '</option>'; }).join('') + '</select></label><label>Status *<select id="user-status"><option value="active"' + (!editing || editing.active ? ' selected' : '') + '>ATIVO</option><option value="inactive"' + (editing && !editing.active ? ' selected' : '') + '>INATIVO</option></select></label></div><p id="user-form-error" class="form-error"></p><div class="import-actions"><button class="outline-button" data-view="users">Cancelar</button><button class="primary-button" id="save-user">' + (editing ? 'Salvar alterações' : 'Salvar usuário') + ' ' + icon('arrow') + '</button></div></section>';
  }

  function viewUserPage() {
    var user = window.USER_SERVICE.getById(state.viewingUserId);
    if (!user) return '<section class="page-intro"><h2>Usuário não encontrado</h2><button class="outline-button" data-view="users">Voltar</button></section>';
    var coordinator = window.USER_SERVICE.getById(user.coordinatorId);
    return '<section class="page-intro"><p class="overline red">Administração</p><h2>Visualizar usuário</h2><p class="muted">Dados cadastrais e status de acesso.</p></section><section class="import-panel profile-card"><div class="avatar large">' + initials(user.name) + '</div><div><h3>' + escapeHtml(user.name) + '</h3><p class="muted">' + escapeHtml(user.username) + ' · ' + (user.role === 'coordinator' ? 'Coordenador' : 'Operador') + '</p></div></section><section class="import-panel detail-grid"><div class="detail-card"><span>Função</span><strong>' + escapeHtml(user.jobTitle) + '</strong></div><div class="detail-card"><span>Área / Processo</span><strong>' + escapeHtml(user.area) + '</strong></div><div class="detail-card"><span>Turno</span><strong>' + escapeHtml(user.shift || '-') + '</strong></div><div class="detail-card"><span>Coordenador responsável</span><strong>' + (coordinator ? escapeHtml(coordinator.name) : '-') + '</strong></div><div class="detail-card"><span>Status</span><strong>' + (user.active ? 'Ativo' : 'Inativo') + '</strong></div><div class="detail-card"><span>Último acesso</span><strong>' + (user.lastLogin ? new Date(user.lastLogin).toLocaleString('pt-BR') : 'Ainda não acessou') + '</strong></div></section><div class="import-actions"><button class="outline-button" data-view="users">Voltar</button><button class="primary-button" data-user-action="edit" data-user-id="' + user.id + '">Editar usuário</button></div>';
  }

  function profilePage() {
    return '<section class="page-intro"><p class="overline red">Minha conta</p><h2>Meu perfil</h2><p class="muted">Dados cadastrais e segurança da sua conta.</p></section><section class="import-panel profile-card"><div class="avatar large">' + initials(state.user.name) + '</div><div><h3>' + escapeHtml(state.user.name) + '</h3><p class="muted">' + escapeHtml(state.user.username) + ' · ' + (state.user.role === 'coordinator' ? 'COORDENADORA' : 'OPERADOR') + '</p><p class="muted">' + escapeHtml(state.user.jobTitle) + ' · ' + escapeHtml(state.user.area) + '</p><p class="muted">Status: ' + (state.user.active ? 'Ativo' : 'Inativo') + '</p></div></section><section class="import-panel"><p class="overline">Segurança</p><h3>Alterar senha</h3><p class="muted">A nova senha deve ter 8 caracteres, maiúscula, minúscula e número.</p><form id="profile-password-form" class="profile-password"><label>Senha atual<input id="current-profile-password" type="password" required></label><label>Nova senha<input id="new-profile-password" type="password" required></label><label>Confirmar nova senha<input id="confirm-profile-password" type="password" required></label><p id="profile-password-error" class="form-error"></p><button class="primary-button" type="submit">Alterar senha</button></form></section>';
  }

  function saveUserForm() { var input = { name: document.getElementById('user-name').value, username: document.getElementById('user-username').value, role: document.getElementById('user-role').value, jobTitle: document.getElementById('user-job').value, area: document.getElementById('user-area').value, shift: document.getElementById('user-shift').value, coordinatorId: document.getElementById('user-coordinator').value, status: document.getElementById('user-status').value }; var result = state.view === 'edit-user' ? window.USER_SERVICE.update(state.editingUserId, input) : window.USER_SERVICE.create(input); if (result.error) { document.getElementById('user-form-error').textContent = result.error; return; } state.profileMessage = state.view === 'edit-user' ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso. Senha temporária configurada para o primeiro acesso.'; state.editingUserId = null; state.view = 'users'; renderShell(); }
  function handleUserAction(event) { var action = event.currentTarget.dataset.userAction; var id = event.currentTarget.dataset.userId; if (action === 'view') { state.viewingUserId = id; state.view = 'view-user'; renderShell(); return; } if (action === 'edit') { state.editingUserId = id; state.view = 'edit-user'; renderShell(); return; } if (action === 'reset') { if (window.confirm('Resetar a senha deste usuário? Ele deverá trocar a senha no próximo login.')) { window.USER_SERVICE.resetPassword(id); state.profileMessage = 'Senha resetada. O usuário deverá trocar a senha no próximo login.'; } } else if (action === 'toggle') { window.USER_SERVICE.toggleActive(id); state.profileMessage = 'Status do usuário atualizado.'; } renderShell(); }

  function overviewPage() {
    var isTeam = state.user.role === 'coordinator' && !state.selectedOperator;
    var operators = visibleOperators();
    var user = isTeam ? null : (state.selectedOperator || state.user);
    var metrics = dashboardMetrics();
    var filters = state.user.role === 'coordinator' ? coordinatorFilters() : '<div class="period-picker"><label for="month-filter">Período</label><select id="month-filter">' + monthOptions(false) + '</select></div>';
    var heading = isTeam ? '<p class="overline red">Visão consolidada da equipe</p><h2>Olá, ' + escapeHtml(state.user.name.split(' ')[0]) + '. <span>Veja o desempenho da sua equipe.</span></h2><p class="muted">Resumo dos indicadores dos ' + operators.length + ' operadores no período selecionado.</p>' : '<p class="overline red">Visão individual</p><h2>' + escapeHtml(user.name) + '</h2><p class="muted">Resumo dos indicadores do operador no período selecionado.</p>';
    var period = state.month === 'Todos os meses' ? 'Todos os meses de ' + state.year : state.month + ' de ' + state.year;
    var context = isTeam ? teamContextCard(operators) : '<div class="person-strip"><div class="avatar large">' + initials(user.name) + '</div><div><strong>' + escapeHtml(user.name) + '</strong><span>' + escapeHtml(user.area || 'Operações') + ' · ' + escapeHtml(user.function || user.jobTitle || 'Operadora de Produção') + '</span></div><div class="person-meta"><span>Período</span><strong>' + escapeHtml(period) + '</strong></div></div>';
    var back = !isTeam && state.user.role === 'coordinator' ? '<button class="outline-button" id="back-to-team">← Voltar para visão consolidada</button>' : '';
    var activity = monthlyActivitySeries();
    return '<section class="welcome-row"><div>' + heading + '</div>' + filters + '</section>' + context + back + '<div class="section-heading"><div><p class="overline">Resumo de performance</p><h3>' + (isTeam ? 'Indicadores consolidados da equipe' : 'Indicadores principais') + '</h3></div><span class="updated">Atualizado com dados do período</span></div><div class="metric-grid">' + metrics.map(metricCard).join('') + '</div><section class="chart-panel"><div class="section-heading"><div><p class="overline">Evolução mensal</p><h3>' + (isTeam ? 'Registros da equipe' : 'Registros de ' + escapeHtml(user.name)) + '</h3></div><span class="legend"><i></i> Registros importados</span></div>' + barChart(activity.map(function (item) { return item.value; }), activity.map(function (item) { return item.label; })) + '</section>';
  }

  function metricCard(metric) {
    return '<article class="metric-card"><div class="metric-top"><span class="metric-icon ' + metric.tone + '">' + metric.icon + '</span><span class="metric-trend ' + metric.tone + '">' + metric.trend + '</span></div><h4>' + metric.title + '</h4><div class="metric-value">' + metric.value + '</div><div class="metric-detail"><span>' + metric.detail + '</span><span class="mini-progress"><i style="width:' + metric.values[metric.values.length - 1] + '%"></i></span></div></article>';
  }

  function barChart(values, labels) {
    return '<div class="bar-chart">' + values.map(function (value, index) { return '<div class="bar-column"><span>' + value + '%</span><div class="bar-track"><i style="height:' + value + '%"></i></div><small>' + (labels ? labels[index] : data.months[index]) + '</small></div>'; }).join('') + '</div>';
  }

  function journeyPage() {
    var isTeam = state.user.role === 'coordinator' && !state.selectedOperator;
    var operators = visibleOperators();
    var journey = filteredRecords('JORNADA');
    var title = isTeam ? 'Jornada consolidada da equipe' : 'Minha jornada';
    var description = isTeam ? 'Total de jornada dos ' + operators.length + ' operadores no período selecionado.' : 'Acompanhe seus registros de ponto, folgas e ocorrências.';
    var filters = state.user.role === 'coordinator' ? coordinatorFilters() : '';
    var hours = journey.reduce(function (sum, row) { var match = String(row.horas || row.hours || '').match(/^(\d{1,2}):(\d{2})/); return sum + (match ? Number(match[1]) + Number(match[2]) / 60 : 0); }, 0);
    var period = state.month === 'Todos os meses' ? state.year : state.month + ' de ' + state.year;
    var rows = journey.map(function (item) { var date = item.data || item.date || ''; var displayDate = date instanceof Date ? date.toLocaleDateString('pt-BR') : String(date); return '<tr><td><strong>' + escapeHtml(displayDate) + '</strong></td><td><span class="status ' + statusClass(item.status) + '">' + escapeHtml(item.status || '') + '</span></td><td>' + escapeHtml(item.horas || item.hours || '') + '</td><td class="note">' + escapeHtml(item.observacao || item.note || '') + '</td></tr>'; }).join('');
    return '<section class="page-intro"><p class="overline red">Controle de presença</p><h2>' + title + '</h2><p class="muted">' + description + '</p></section>' + filters + '<div class="summary-grid"><div><span>Registros de jornada</span><strong>' + journey.length + '</strong><small>' + escapeHtml(period) + '</small></div><div><span>Horas registradas</span><strong>' + Math.floor(hours) + 'h</strong><small>período selecionado</small></div><div><span>Ocorrências</span><strong>' + journey.filter(function (row) { return /atraso|falta|saiu mais cedo/i.test(row.status || ''); }).length + '</strong><small>atrasos e ausências</small></div><div><span>Operadores</span><strong>' + operators.length + '</strong><small>no escopo atual</small></div></div><section class="table-panel"><div class="table-heading"><div><p class="overline">' + escapeHtml(period) + '</p><h3>' + (isTeam ? 'Resumo de jornada da equipe' : 'Histórico de jornada') + '</h3></div><button class="outline-button">Exportar relatório</button></div><div class="table-scroll"><table><thead><tr><th>Data</th><th>Status</th><th>Horas</th><th>Observação</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4">Nenhum registro no período selecionado.</td></tr>') + '</tbody></table></div></section>';
  }

  function metricPage(type) {
    if (portalData.hasImportedData()) return importedMetricPage(type);
    var metric = data.metrics.find(function (item) { return item.id === type; }) || data.metrics[1];
    var goal = type === 'bos' ? '40' : '90%';
    var annual = state.month === 'Todos os meses';
    var periodLabel = annual ? 'Acumulado de ' + state.year : state.month + ' de ' + state.year;
    var operators = teamOperators();
    var scopedOperators = visibleOperators();
    var scopedMetric = Object.assign({}, metric, { value: formatMetricForScope(metric, scopedOperators) });
    var filter = state.user.role === 'coordinator' ? coordinatorFilters() : '<div class="filters metric-filters"><label>Mês<select id="month-filter">' + monthOptions(false) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></div>';
    var scopeLabel = state.user.role === 'coordinator' && !state.selectedOperator ? 'Resultado consolidado de ' + scopedOperators.length + ' operadores' : 'Resultado no período';
    return '<section class="page-intro"><p class="overline red">Indicador operacional</p><h2>' + metric.title + '</h2><p class="muted">BOS e BOSQ possuem acompanhamento independente.</p></section>' + filter + '<div class="indicator-hero"><div class="metric-icon large-icon ' + metric.tone + '">' + metric.icon + '</div><div><span>' + scopeLabel + '</span><strong>' + scopedMetric.value + '</strong><small>' + scopedMetric.detail + ' · <b class="positive">' + scopedMetric.trend + '</b></small></div><div class="hero-goal"><span>' + (annual ? 'Meta anual' : 'Meta mensal') + '</span><strong>' + goal + '</strong><small>' + periodLabel + '</small></div></div><section class="chart-panel"><div class="section-heading"><div><p class="overline">Evolução mensal de ' + metric.title + '</p><h3>' + (state.user.role === 'coordinator' && !state.selectedOperator ? 'Resultado consolidado x meta' : 'Resultado x meta') + '</h3></div><span class="legend"><i class="coffee-dot"></i> ' + metric.title + '</span></div>' + barChart(metric.values) + '</section><div class="detail-grid"><div class="detail-card"><span>Meta</span><strong>' + goal + '</strong><small>' + (annual ? 'Objetivo anual' : 'Objetivo do mês') + '</small></div><div class="detail-card"><span>Realizado</span><strong>' + scopedMetric.value + '</strong><small>' + periodLabel + '</small></div><div class="detail-card"><span>% atingido</span><strong>' + metric.values[metric.values.length - 1] + '%</strong><small class="positive">Indicador exclusivo de ' + metric.title + '</small></div></div><section class="table-panel"><div class="table-heading"><div><p class="overline">Histórico de registros</p><h3>' + metric.title + '</h3></div><span class="updated">Sem mistura com ' + (type === 'bos' ? 'BOSQ' : 'BOS') + '</span></div><p class="muted metric-empty">Os registros detalhados serão exibidos aqui após a importação da aba ' + type.toUpperCase() + '.</p></section>';
  }

  function importedMetricPage(type) {
    var sheet = type.toUpperCase();
    var metric = data.metrics.find(function (item) { return item.id === type; }) || data.metrics[1];
    var records = filteredRecords(sheet);
    var operators = visibleOperators();
    var goal = Number(goalConfig().monthly[sheet] || 5) * Math.max(operators.length, 1);
    var attainment = Math.min(100, Math.round(records.length / Math.max(goal, 1) * 100));
    var period = state.month === 'Todos os meses' ? state.year : state.month + ' de ' + state.year;
    var months = state.month === 'Todos os meses' ? config.months : [state.month];
    var totals = months.map(function (month) {
      return countRows(sheet, portalFilters({ selectedMonth: month }));
    });
    var max = totals.reduce(function (value, count) { return Math.max(value, count); }, 0);
    var chart = barChart(totals.map(function (count) { return max ? Math.round(count / max * 100) : 0; }), months.map(function (month) { return month.slice(0, 3); }));
    var rows = records.map(function (row) {
      var operator = operators.find(function (item) { return item.username === portalData.normalizeUsuario(row.usuario); });
      return '<tr><td>' + escapeHtml(operator ? operator.name : row.usuario || '') + '</td><td>' + escapeHtml(String(row.data || '')) + '</td><td>' + escapeHtml(String(row.numerobos || row.numerobosq || '')) + '</td><td>' + escapeHtml(String(row.descricao || row.status || '')) + '</td></tr>';
    }).join('');
    var filter = state.user.role === 'coordinator' ? coordinatorFilters() : '<div class="filters metric-filters"><label>Mês<select id="month-filter">' + monthOptions(true) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></label></div>';
    return '<section class="page-intro"><p class="overline red">Indicador operacional</p><h2>' + metric.title + '</h2><p class="muted">BOS e BOSQ possuem acompanhamento independente.</p></section>' + filter + '<div class="indicator-hero"><div class="metric-icon large-icon ' + metric.tone + '">' + metric.icon + '</div><div><span>Resultado do período</span><strong>' + records.length + '</strong><small>registros importados</small></div><div class="hero-goal"><span>Meta mensal por operador</span><strong>' + goalConfig().monthly[sheet] + '</strong><small>' + escapeHtml(period) + '</small></div></div><section class="chart-panel"><div class="section-heading"><div><p class="overline">Evolução mensal de ' + metric.title + '</p><h3>Registros por mês</h3></div><span class="legend"><i class="coffee-dot"></i> ' + metric.title + '</span></div>' + chart + '</section><div class="detail-grid"><div class="detail-card"><span>Meta do escopo</span><strong>' + goal + '</strong><small>por operador no período</small></div><div class="detail-card"><span>Realizado</span><strong>' + records.length + '</strong><small>' + escapeHtml(period) + '</small></div><div class="detail-card"><span>Atingimento</span><strong>' + attainment + '%</strong><small>' + metric.title + '</small></div></div><section class="table-panel"><div class="table-heading"><div><p class="overline">Histórico de registros</p><h3>' + metric.title + '</h3></div><span class="updated">Sem mistura com ' + (type === 'bos' ? 'BOSQ' : 'BOS') + '</span></div><div class="table-scroll"><table><thead><tr><th>Operador</th><th>Data</th><th>Identificador</th><th>Descrição / Status</th></tr></thead><tbody>' + (rows || '<tr><td colspan="4">Nenhum registro no período selecionado.</td></tr>') + '</tbody></table></div></section>';
  }

  function ideasPage() {
    if (portalData.hasImportedData()) return importedIdeasPage();
    var ideas = data.ideas;
    var isTeam = state.user.role === 'coordinator' && !state.selectedOperator;
    var operators = visibleOperators();
    var ratio = isTeam ? operators.length / 18 : 1;
    var registered = isTeam ? Math.round(ideas.registered * ratio) : ideas.registered;
    var goal = isTeam ? Math.round(ideas.goal * ratio) : ideas.goal;
    var filters = state.user.role === 'coordinator' ? coordinatorFilters() : '';
    return '<section class="page-intro"><p class="overline red">Cultura de melhoria</p><h2>' + (isTeam ? 'Ideias de melhoria da equipe' : 'Ideias de melhoria') + '</h2><p class="muted">' + (isTeam ? 'Resumo consolidado dos ' + operators.length + ' operadores.' : 'Transforme boas observações em melhorias para o nosso trabalho.') + '</p></section>' + filters + '<div class="ideas-grid"><div class="idea-main"><span class="idea-symbol">✦</span><span>Quantidade cadastrada</span><strong>' + registered + '</strong><small>Meta de ' + goal + ' ideias no período</small><div class="goal-progress"><i style="width:' + (registered / Math.max(goal, 1) * 100) + '%"></i></div><b>' + Math.round(registered / Math.max(goal, 1) * 100) + '% da meta atingida</b></div><div class="idea-stat"><span>Em análise</span><strong>' + (isTeam ? Math.round(ideas.analysis * ratio) : ideas.analysis) + '</strong><small>Aguardando avaliação</small></div><div class="idea-stat"><span>Aprovadas</span><strong>' + (isTeam ? Math.round(ideas.approved * ratio) : ideas.approved) + '</strong><small>Boas ideias reconhecidas</small></div><div class="idea-stat"><span>Implementadas</span><strong>' + (isTeam ? Math.round(ideas.implemented * ratio) : ideas.implemented) + '</strong><small>Já geraram impacto</small></div></div><section class="quote-panel"><span>“</span><p>Uma melhoria começa quando alguém decide observar com atenção.</p><small>Programa Ideias de Melhoria</small></section>';
  }

  function importedIdeasPage() {
    var ideas = filteredRecords('IDEIAS');
    var open = ideas.filter(function (item) { return !item.status || String(item.status).toUpperCase() === 'ABERTA'; }).length;
    var analysis = ideas.filter(function (item) { return /ANALISE|ANÁLISE|ANDAMENTO/i.test(item.status || ''); }).length;
    var approved = ideas.filter(function (item) { return /APROVAD|RESOLVID/i.test(item.status || ''); }).length;
    var implemented = ideas.filter(function (item) { return /IMPLEMENTAD|CONCLU[IÍ]D/i.test(item.status || ''); }).length;
    var goal = goalConfig().monthly.IDEIAS_ABERTAS * Math.max(visibleOperators().length, 1);
    var percent = Math.round(open / Math.max(goal, 1) * 100);
    var filters = state.user.role === 'coordinator' ? coordinatorFilters() : '';
    var rows = ideas.map(function (item) {
      var operator = portalData.getOperators().find(function (entry) { return entry.username === portalData.normalizeUsuario(item.usuario); });
      return '<tr><td>' + escapeHtml(operator ? operator.name : item.usuario || '') + '</td><td>' + escapeHtml(String(item.data || '')) + '</td><td>' + escapeHtml(String(item.titulo || '')) + '</td><td>' + escapeHtml(String(item.status || '')) + '</td><td>' + escapeHtml(String(item.resultado || '')) + '</td></tr>';
    }).join('');
    return '<section class="page-intro"><p class="overline red">Cultura de melhoria</p><h2>Ideias de melhoria</h2><p class="muted">Contagem pelo mês de criação registrado na importação.</p></section>' + filters + '<div class="ideas-grid"><div class="idea-main"><span class="idea-symbol">✦</span><span>Quantidade cadastrada</span><strong>' + ideas.length + '</strong><small>Meta de ' + goal + ' ideias no período</small><div class="goal-progress"><i style="width:' + Math.min(percent, 100) + '%"></i></div><b>' + percent + '% da meta atingida</b></div><div class="idea-stat"><span>Em análise</span><strong>' + analysis + '</strong><small>Aguardando avaliação</small></div><div class="idea-stat"><span>Aprovadas / resolvidas</span><strong>' + approved + '</strong><small>Boas ideias reconhecidas</small></div><div class="idea-stat"><span>Implementadas</span><strong>' + implemented + '</strong><small>Já geraram impacto</small></div></div><section class="table-panel"><div class="table-heading"><div><p class="overline">Registros importados</p><h3>Ideias</h3></div></div><div class="table-scroll"><table><thead><tr><th>Operador</th><th>Data de criação</th><th>Título</th><th>Status atual</th><th>Resultado</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5">Nenhuma ideia no período selecionado.</td></tr>') + '</tbody></table></div></section>';
  }

  function labelsPage() {
    if (portalData.hasImportedData()) return importedLabelsPage();
    var category = state.labelCategory === 'MA' ? 'MA' : 'SHE';
    var rows = data.operators.filter(function (operator) { return operator.role === 'operator' && (state.area === 'Todas' || operator.area === state.area); });
    var summary = rows.map(function (operator) {
      var sheOpen = countLabelEntries(operator.id, 'SHE', 'ABERTA', state.year, state.month);
      var sheClosed = countLabelEntries(operator.id, 'SHE', 'FECHADA', state.year, state.month);
      var maTotal = countLabelEntries(operator.id, 'MA', 'TOTAL', state.year, state.month);
      return { operator: operator, sheOpen: sheOpen, sheClosed: sheClosed, maTotal: maTotal };
    });
    var categoryTitle = category === 'MA' ? 'Etiquetas MA' : 'Etiquetas SHE';
    var totals = category === 'SHE'
      ? { value: summary.reduce(function (sum, item) { return sum + item.sheOpen; }, 0), label: 'Abertas', secondary: summary.reduce(function (sum, item) { return sum + item.sheClosed; }, 0), secondaryLabel: 'Fechadas' }
      : { value: summary.reduce(function (sum, item) { return sum + item.maTotal; }, 0), label: 'Total', secondary: 0, secondaryLabel: 'Variação' };
    return '<section class="page-intro"><p class="overline red">Indicadores de qualidade</p><h2>Etiquetas</h2><p class="muted">Separe as etiquetas por categoria para acompanhar o volume e o status operacional.</p></section><div class="filters"><div><label>Categoria</label><div class="tab-group">' + ['SHE', 'MA'].map(function (item) { return '<button class="outline-button" data-label-category="' + item + '" ' + (category === item ? 'style="background:#f5efe8;border-color:#ceb8a7;"' : '') + '>' + item + '</button>'; }).join('') + '</div></div><label>Área / Processo<select id="area-filter"><option value="Todas">Todas</option><option value="CAFÉ CRU">CAFÉ CRU</option><option value="MOAGEM">MOAGEM</option><option value="TORRADOR">TORRADOR</option></select></label><label>Mês<select id="month-filter">' + monthOptions(true) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></label></div><div class="summary-grid"><div><span>Etiquetas ' + category + '</span><strong>' + totals.value + '</strong><small>' + totals.label + '</small></div><div><span>' + (category === 'SHE' ? 'Etiquetas SHE fechadas' : 'Categoria') + '</span><strong>' + (category === 'SHE' ? totals.secondary : 'MA') + '</strong><small>' + (category === 'SHE' ? 'Fechadas' : 'Separada da SHE') + '</small></div><div><span>Meta mensal</span><strong>' + (category === 'SHE' ? '2 / 2' : 'N/D') + '</strong><small>' + (category === 'SHE' ? 'Abertas e fechadas' : 'Estrutura pronta') + '</small></div><div><span>Operadores</span><strong>' + rows.length + '</strong><small>Visão por área</small></div></div><section class="table-panel"><div class="table-heading"><div><p class="overline">' + categoryTitle + '</p><h3>' + category + '</h3></div></div><div class="table-scroll"><table><thead><tr><th>Operador</th><th>Área</th><th>' + (category === 'SHE' ? 'Abertas' : 'MA') + '</th><th>' + (category === 'SHE' ? 'Fechadas' : 'Quantidade') + '</th><th>Status</th></tr></thead><tbody>' + summary.map(function (item) {
      var primary = category === 'SHE' ? item.sheOpen : item.maTotal;
      var secondary = category === 'SHE' ? item.sheClosed : 0;
      var status = category === 'SHE' ? (item.sheOpen >= 2 && item.sheClosed >= 2 ? 'OK' : 'NÃO OK') : (item.maTotal > 0 ? 'OK' : 'NÃO OK');
      return '<tr><td><strong>' + escapeHtml(item.operator.name) + '</strong></td><td>' + escapeHtml(item.operator.area) + '</td><td>' + primary + '</td><td>' + secondary + '</td><td><span class="status ' + (status === 'OK' ? 'positive' : 'warning') + '">' + status + '</span></td></tr>';
    }).join('') + '</tbody></table></div></section>';
  }

  function importedLabelsPage() {
    var category = state.labelCategory === 'MA' ? 'MA' : 'SHE';
    var operators = visibleOperators();
    var filtered = filteredRecords('ETIQUETAS');
    var summary = operators.map(function (operator) {
      var records = filtered.filter(function (row) { return portalData.normalizeUsuario(row.usuario) === portalData.normalizeUsuario(operator.username); });
      var sheOpen = records.filter(function (row) { return String(row.categoria || '').toUpperCase() === 'SHE' && String(row.status || '').toUpperCase() === 'ABERTA'; }).length;
      var sheClosed = records.filter(function (row) { return String(row.categoria || '').toUpperCase() === 'SHE' && String(row.status || '').toUpperCase() === 'FECHADA'; }).length;
      var maTotal = records.filter(function (row) { return String(row.categoria || '').toUpperCase() === 'MA'; }).length;
      return { operator: operator, sheOpen: sheOpen, sheClosed: sheClosed, maTotal: maTotal };
    });
    var sheOpen = summary.reduce(function (sum, row) { return sum + row.sheOpen; }, 0);
    var sheClosed = summary.reduce(function (sum, row) { return sum + row.sheClosed; }, 0);
    var maTotal = summary.reduce(function (sum, row) { return sum + row.maTotal; }, 0);
    var totals = category === 'SHE' ? { main: sheOpen, secondary: sheClosed } : { main: maTotal, secondary: 0 };
    var tableRows = summary.map(function (row) {
      var primary = category === 'SHE' ? row.sheOpen : row.maTotal;
      var secondary = category === 'SHE' ? row.sheClosed : 0;
      var status = category === 'SHE' ? (row.sheOpen >= 2 && row.sheClosed >= 2 ? 'OK' : 'NÃO OK') : (row.maTotal > 0 ? 'OK' : 'NÃO OK');
      return '<tr><td><strong>' + escapeHtml(row.operator.name) + '</strong></td><td>' + escapeHtml(row.operator.area) + '</td><td>' + primary + '</td><td>' + secondary + '</td><td><span class="status ' + (status === 'OK' ? 'positive' : 'warning') + '">' + status + '</span></td></tr>';
    }).join('');
    var filters = '<div class="filters"><div><label>Categoria</label><div class="tab-group">' + ['SHE', 'MA'].map(function (item) { return '<button class="outline-button" data-label-category="' + item + '" ' + (category === item ? 'style="background:#f5efe8;border-color:#ceb8a7;"' : '') + '>' + item + '</button>'; }).join('') + '</div></div>';
    if (state.user.role === 'coordinator') {
      var allOperators = teamOperators();
      filters += '<label>Operador<select id="metric-operator-filter"><option value="Todos"' + (selectedOperatorValue() === 'Todos' ? ' selected' : '') + '>Todos os operadores</option>' + allOperators.map(function (operator) { return '<option value="' + operator.id + '"' + (selectedOperatorValue() === operator.id ? ' selected' : '') + '>' + escapeHtml(operator.name) + '</option>'; }).join('') + '</select></label>';
      filters += '<label>Área / Processo<select id="area-filter"><option value="Todas">Todas</option>' + allOperators.map(function (item) { return item.area; }).filter(function (area, index, all) { return area && all.indexOf(area) === index; }).map(function (area) { return '<option value="' + escapeHtml(area) + '"' + (state.area === area ? ' selected' : '') + '>' + escapeHtml(area) + '</option>'; }).join('') + '</select></label>';
    }
    filters += '<label>Mês<select id="month-filter">' + monthOptions(true) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></label></div>';
    var heading = category === 'SHE' ? 'Etiquetas SHE' : 'Etiquetas MA';
    return '<section class="page-intro"><p class="overline red">Indicadores de qualidade</p><h2>Etiquetas</h2><p class="muted">Dados importados filtrados por operador e data.</p></section>' + filters + '<div class="summary-grid"><div><span>' + heading + '</span><strong>' + totals.main + '</strong><small>' + (category === 'SHE' ? 'Abertas' : 'Total') + '</small></div><div><span>' + (category === 'SHE' ? 'Etiquetas SHE fechadas' : 'Registros de etiquetas') + '</span><strong>' + (category === 'SHE' ? totals.secondary : filtered.length) + '</strong><small>' + (category === 'SHE' ? 'Fechadas' : 'no período') + '</small></div><div><span>Meta mensal por operador</span><strong>' + (category === 'SHE' ? '2 / 2' : '—') + '</strong><small>' + category + '</small></div><div><span>Operadores</span><strong>' + operators.length + '</strong><small>no escopo atual</small></div></div><section class="table-panel"><div class="table-heading"><div><p class="overline">' + heading + '</p><h3>' + category + '</h3></div></div><div class="table-scroll"><table><thead><tr><th>Operador</th><th>Área</th><th>' + (category === 'SHE' ? 'Abertas' : 'MA') + '</th><th>' + (category === 'SHE' ? 'Fechadas' : 'Quantidade') + '</th><th>Status</th></tr></thead><tbody>' + (tableRows || '<tr><td colspan="5">Nenhuma etiqueta no período selecionado.</td></tr>') + '</tbody></table></div></section>';
  }

  function areaGoalsPage() {
    if (portalData.hasImportedData()) return importedAreaGoalsPage();
    var rows = data.operators.filter(function (operator) { return operator.role === 'operator' && (state.area === 'Todas' || operator.area === state.area); });
    var year = state.year || '2026';
    var month = state.month || 'Abril';
    var baseFilters = '<section class="page-intro"><p class="overline red">Acompanhamento da área</p><h2>Metas da área</h2><p class="muted">Visão simples do cumprimento das metas mensais por colaborador, sem expor dados pessoais ou sensíveis.</p></section><div class="filters"><label>Área / Processo<select id="area-filter"><option value="Todas">Todas as áreas</option><option value="CAFÉ CRU">CAFÉ CRU</option><option value="MOAGEM">MOAGEM</option><option value="TORRADOR">TORRADOR</option></select></label><label>Mês<select id="month-filter">' + monthOptions(true) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></label><label>Operadores<select id="metric-operator-filter"><option value="Todos">Todos os operadores</option>' + rows.map(function (operator) { return '<option value="' + operator.id + '">' + escapeHtml(operator.name) + '</option>'; }).join('') + '</select></label></div>';
    if (!rows.length) {
      return baseFilters + '<div class="notice-banner"><span class="notice-icon">i</span><div><strong>Nenhum dado disponível</strong><p>Nenhum operador foi encontrado para o período selecionado. Ajuste os filtros e tente novamente.</p></div></div>';
    }
    var teamGoalRows = rows.map(function (operator) {
      var summary = getMonthlyGoalSummary(operator.id);
      return { operator: operator, summary: summary, general: summary.GERAL.status };
    });
    var okCount = teamGoalRows.filter(function (row) { return row.general === 'OK'; }).length;
    var notOkCount = teamGoalRows.length - okCount;
    var allGoalRate = teamGoalRows.length ? Math.round((okCount / teamGoalRows.length) * 100) : 0;
    var metrics = ['BOS', 'BOSQ', 'SHE_ABERTAS', 'SHE_FECHADAS', 'IDEIAS_ABERTAS'];
    var topStats = '<div class="summary-grid"><div><span>Operadores</span><strong>' + teamGoalRows.length + '</strong><small>' + month + ' / ' + year + '</small></div><div><span>Operadores OK</span><strong>' + okCount + '</strong><small>Meta atendida</small></div><div><span>Operadores NÃO OK</span><strong>' + notOkCount + '</strong><small>Com pendência</small></div><div><span>% da equipe</span><strong>' + allGoalRate + '%</strong><small>meta atendida</small></div></div>';
    var metricBreakdown = '<div class="detail-grid">' + metrics.map(function (key) {
      var count = teamGoalRows.filter(function (row) { return row.summary[key].status === 'OK'; }).length;
      return '<div class="detail-card"><span>' + key.replace('_', ' ').replace('SHE', 'SHE ').replace('IDEIAS', 'Ideias') + '</span><strong>' + count + '/' + teamGoalRows.length + '</strong><small>' + (count === teamGoalRows.length ? 'Todos atendidos' : 'Meta por operador') + '</small></div>';
    }).join('') + '</div>';
    return baseFilters + topStats + metricBreakdown + '<section class="table-panel"><div class="table-heading"><div><p class="overline">Performance da equipe</p><h3>Consolidado</h3></div><span class="updated">Mostrar apenas metas obrigatórias.</span></div><div class="table-scroll"><table><thead><tr><th>Colaborador</th><th>BOS</th><th>BOSQ</th><th>SHE AB.</th><th>SHE FECH.</th><th>IDEIA</th><th>Geral</th></tr></thead><tbody>' + teamGoalRows.map(function (row) {
      return '<tr><td><strong>' + escapeHtml(row.operator.name) + '</strong><small>' + escapeHtml(row.operator.area) + '</small></td><td>' + formatGoalMetricCell('BOS', row.operator) + '</td><td>' + formatGoalMetricCell('BOSQ', row.operator) + '</td><td>' + formatGoalMetricCell('SHE_ABERTAS', row.operator) + '</td><td>' + formatGoalMetricCell('SHE_FECHADAS', row.operator) + '</td><td>' + formatGoalMetricCell('IDEIAS_ABERTAS', row.operator) + '</td><td><span class="status ' + (row.general === 'OK' ? 'positive' : 'warning') + '">' + row.general + '</span></td></tr>';
    }).join('') + '</tbody></table></div></section>';
  }

  function importedAreaGoalsPage() {
    var rows = visibleOperators();
    var summaries = rows.map(function (operator) {
      var summary = getMonthlyGoalSummary(operator.id);
      return { operator: operator, summary: summary, general: summary.GERAL.status };
    });
    var okCount = summaries.filter(function (row) { return row.general === 'OK'; }).length;
    var metrics = ['BOS', 'BOSQ', 'SHE_ABERTAS', 'SHE_FECHADAS', 'IDEIAS_ABERTAS'];
    var period = state.month === 'Todos os meses' ? state.year : state.month + ' / ' + state.year;
    var stats = '<div class="summary-grid"><div><span>Operadores</span><strong>' + summaries.length + '</strong><small>' + escapeHtml(period) + '</small></div><div><span>Operadores OK</span><strong>' + okCount + '</strong><small>Meta atendida</small></div><div><span>Operadores NÃO OK</span><strong>' + (summaries.length - okCount) + '</strong><small>Com pendência</small></div><div><span>% da equipe</span><strong>' + (summaries.length ? Math.round(okCount / summaries.length * 100) : 0) + '%</strong><small>meta atendida</small></div></div>';
    var breakdown = '<div class="detail-grid">' + metrics.map(function (key) {
      var count = summaries.filter(function (row) { return row.summary[key].status === 'OK'; }).length;
      return '<div class="detail-card"><span>' + key.replace('_', ' ') + '</span><strong>' + count + '/' + summaries.length + '</strong><small>Meta por operador</small></div>';
    }).join('') + '</div>';
    var body = summaries.map(function (row) {
      return '<tr><td><strong>' + escapeHtml(row.operator.name) + '</strong><small>' + escapeHtml(row.operator.area) + '</small></td><td>' + formatGoalMetricCell('BOS', row.operator) + '</td><td>' + formatGoalMetricCell('BOSQ', row.operator) + '</td><td>' + formatGoalMetricCell('SHE_ABERTAS', row.operator) + '</td><td>' + formatGoalMetricCell('SHE_FECHADAS', row.operator) + '</td><td>' + formatGoalMetricCell('IDEIAS_ABERTAS', row.operator) + '</td><td><span class="status ' + (row.general === 'OK' ? 'positive' : 'warning') + '">' + row.general + '</span></td></tr>';
    }).join('');
    var filters = state.user.role === 'coordinator' ? coordinatorFilters() : '<div class="filters"><label>Mês<select id="month-filter">' + monthOptions(true) + '</select></label><label>Ano<select id="year-filter">' + yearOptions() + '</select></label></div>';
    return '<section class="page-intro"><p class="overline red">Acompanhamento da área</p><h2>Metas da área</h2><p class="muted">Realizados calculados a partir dos registros importados no período selecionado.</p></section>' + filters + stats + breakdown + '<section class="table-panel"><div class="table-heading"><div><p class="overline">Performance da equipe</p><h3>Consolidado</h3></div><span class="updated">' + escapeHtml(period) + '</span></div><div class="table-scroll"><table><thead><tr><th>Colaborador</th><th>BOS</th><th>BOSQ</th><th>SHE AB.</th><th>SHE FECH.</th><th>IDEIA</th><th>Geral</th></tr></thead><tbody>' + (body || '<tr><td colspan="7">Nenhum operador no período e área selecionados.</td></tr>') + '</tbody></table></div></section>';
  }

  function teamPage() {
    var sourceOperators = portalData.getOperators();
    var rows = sourceOperators.filter(function (operator) { return operator.role === 'operator' && (state.area === 'Todas' || portalData.normalizeArea(operator.area) === portalData.normalizeArea(state.area)); });
    rows = rows.map(function (operator) {
      if (!portalData.hasImportedData()) return operator;
      var summary = getMonthlyGoalSummary(operator.id);
      var passing = ['BOS', 'BOSQ', 'SHE_ABERTAS', 'SHE_FECHADAS', 'IDEIAS_ABERTAS'].filter(function (key) { return summary[key].status === 'OK'; }).length;
      return Object.assign({}, operator, { score: passing * 20, status: summary.GERAL.status });
    });
    var teamTotals = sourceOperators.filter(function (operator) { return operator.role === 'operator'; });
    var areaCounts = { 'CAFÉ CRU': 0, MOAGEM: 0, TORRADOR: 0 };
    teamTotals.forEach(function (operator) { if (areaCounts[operator.area] != null) areaCounts[operator.area] += 1; });
    return '<section class="welcome-row"><div><p class="overline red">Gestão de performance</p><h2>Minha equipe</h2><p class="muted">Selecione um operador para visualizar seus indicadores individuais.</p></div><button class="primary-button compact" data-view="overview">Ver selecionado ' + icon('arrow') + '</button></section><div class="filters"><label>Pesquisar operador<input id="operator-search" type="search" placeholder="Nome do operador..."></label><label>Mês<select id="month-filter"><option>Abril</option><option>Março</option><option>Fevereiro</option></select></label><label>Ano<select id="year-filter"><option>2026</option><option>2025</option></select></label><label>Área<select id="area-filter"><option>Todas</option><option value="CAFÉ CRU">Café Cru (' + areaCounts['CAFÉ CRU'] + ')</option><option value="MOAGEM">Moagem (' + areaCounts.MOAGEM + ')</option><option value="TORRADOR">Torrador (' + areaCounts.TORRADOR + ')</option></select></label></div><section class="table-panel team-panel"><div class="table-heading"><div><p class="overline">' + rows.length + ' operadores</p><h3>Performance individual</h3></div><span class="updated">Total da equipe: ' + teamTotals.length + '</span></div><div class="table-scroll"><table><thead><tr><th>Operador</th><th>Área</th><th>Turno</th><th>Scorecard</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(function (operator) { return '<tr data-operator-row="' + escapeHtml(operator.name + ' ' + operator.area) + '"><td><div class="table-person"><span class="avatar small-avatar">' + operator.initials + '</span><strong>' + operator.name + '</strong></div></td><td>' + operator.area + '</td><td>' + operator.shift + '</td><td><div class="score-cell"><strong>' + operator.score + '%</strong><span><i style="width:' + operator.score + '%"></i></span></div></td><td><span class="status ' + (operator.score > 90 ? 'on-track' : operator.score > 80 ? 'neutral' : 'warning') + '">' + operator.status + '</span></td><td><button class="table-action" data-select-operator="' + operator.id + '" aria-label="Ver indicadores de ' + operator.name + '">' + icon('arrow') + '</button></td></tr>'; }).join('') + '</tbody></table></div></section>';
  }

  function statusClass(status) {
    if (status === 'Atraso') return 'warning';
    if (status === 'Hora extra' || status === 'Dia compensado') return 'positive';
    return 'neutral';
  }

  function initials(name) {
    return name.split(' ').slice(0, 2).map(function (part) { return part[0]; }).join('').toUpperCase();
  }

  render();
}());
