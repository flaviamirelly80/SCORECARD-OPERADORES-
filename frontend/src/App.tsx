import { FormEvent, useState } from 'react';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      email && password
        ? 'Login pronto para ser conectado ao servidor.'
        : 'Informe seu e-mail e sua senha para entrar.',
    );
  }

  return (
    <main className="login-shell">
      <section className="brand-panel" aria-label="Identidade do portal">
        <div className="brand-mark" aria-hidden="true">
          JD
        </div>
        <p className="eyebrow">JDE Peet&apos;s</p>
        <h1>Portal de desempenho</h1>
        <p className="brand-copy">
          Acompanhe resultados, evolução e oportunidades de desenvolvimento em um só lugar.
        </p>
        <div className="coffee-line" aria-hidden="true" />
        <p className="brand-footnote">Scorecard de Operadores</p>
      </section>

      <section className="form-panel" aria-labelledby="login-title">
        <div className="form-wrap">
          <p className="eyebrow dark-eyebrow">Acesso corporativo</p>
          <h2 id="login-title">Bem-vindo de volta</h2>
          <p className="form-intro">Entre para consultar seus indicadores e sua jornada.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">E-mail ou usuário</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="seu.nome@jde.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button type="submit">Entrar</button>
            <p className="form-message" role="status" aria-live="polite">
              {message}
            </p>
          </form>

          <p className="demo-note">Use suas credenciais corporativas para acessar o portal.</p>
        </div>
      </section>
    </main>
  );
}

export default App;
