window.PROTOTYPE_DATA = {
  users: [],
  operators: [
    { id: 'op-demo', username: 'operator.demo', name: 'Operador de demonstração', initials: 'OD', area: 'ÁREA DEMO', function: 'Operador', shift: '', score: 0, status: 'Ativo', coordinator: 'Coordenador de demonstração' },
    { id: 'coord-demo', username: 'coordinator.demo', name: 'Coordenador de demonstração', initials: 'CD', area: 'ÁREA DEMO', function: 'Coordenação', shift: '', score: 0, status: 'Ativo', coordinator: 'Coordenador de demonstração' }
  ],
  months: ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'],
  metrics: [
    { id: 'jornada', title: 'Faltas / Jornada', icon: '◷', value: '0', detail: 'sem registros', trend: '—', tone: 'green', values: [0, 0, 0, 0, 0, 0] },
    { id: 'etiquetas', title: 'Etiquetas', icon: '◇', value: 'SHE 0 · MA 0', detail: 'Abertas 0 · Fechadas 0', trend: 'SHE/MA separados', tone: 'red', values: [0, 0, 0, 0, 0, 0] },
    { id: 'bos', title: 'BOS', icon: '▣', value: '0', detail: 'sem registros', trend: '—', tone: 'coffee', values: [0, 0, 0, 0, 0, 0] },
    { id: 'bosq', title: 'BOSQ', icon: '✓', value: '0', detail: 'sem registros', trend: '—', tone: 'green', values: [0, 0, 0, 0, 0, 0] },
    { id: 'ideias', title: 'Ideias de melhoria', icon: '✦', value: '0', detail: 'sem registros', trend: '—', tone: 'gold', values: [0, 0, 0, 0, 0, 0] }
  ],
  journey: [],
  ideas: { registered: 0, analysis: 0, approved: 0, implemented: 0, goal: 0 },
  monthlyGoals: {},
  bos: {},
  bosq: {},
  labels: []
};
