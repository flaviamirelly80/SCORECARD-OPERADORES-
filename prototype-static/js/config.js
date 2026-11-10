window.PORTAL_CONFIG = {
  dataSource: (window.PORTAL_DATA_SOURCE === 'local' || !window.PORTAL_DATA_SOURCE) &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'local' : 'supabase',
  supabaseUrl: window.PORTAL_SUPABASE_URL || '',
  supabaseAnonKey: window.PORTAL_SUPABASE_ANON_KEY || '',
  logoPath: 'assets/logo/ChatGPT Image 24 de ago. de 2026, 14_52_54.png',
  months: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ],
  years: ['2026', '2025'],
  goalConfig: {
    monthly: {
      BOS: 5,
      BOSQ: 5,
      SHE_ABERTAS: 2,
      SHE_FECHADAS: 2,
      IDEIAS_ABERTAS: 1
    },
    required: ['BOS', 'BOSQ', 'SHE_ABERTAS', 'SHE_FECHADAS', 'IDEIAS_ABERTAS'],
    areas: ['CAFÉ CRU', 'MOAGEM', 'TORRADOR'],
    categories: ['SHE', 'MA']
  }
};
