'use client';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Trash2,
  X,
  ChartNoAxesCombined,
  Menu,
  Link as LinkIcon,
} from 'lucide-react';
import { demoState } from '@/lib/demo';
import { alertDecision } from '@/lib/rules';
import {
  money,
  cents,
  bestOffer,
  cost,
  status,
  statusLabels,
  type State,
  type Product,
  type Settings,
} from '@/lib/model';
import Modal from './dialog';
import Chart from './chart';
import ProductArt from './product-art';
const storageKey = 'pricewatch-demo-v1';
const empty: State = {
  products: [],
  settings: { email: '', emailEnabled: false, telegramChatId: '', telegramEnabled: false },
  alerts: [],
};
async function api(path: string, method = 'GET', data?: unknown) {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir.');
  return result;
}
function dateTime(at: string) {
  return new Date(at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
export default function Dashboard({ demo }: { demo: boolean }) {
  const [state, setState] = useState<State>(empty),
    [ready, setReady] = useState(false),
    [logged, setLogged] = useState(demo);
  const [view, setView] = useState<'list' | 'history' | 'alerts'>('list'),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState('all'),
    [sort, setSort] = useState('default');
  const [modal, setModal] = useState<'add' | 'settings' | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [toast, setToast] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false);
  const [password, setPassword] = useState('');
  async function reload() {
    try {
      setState(await api('products'));
      setLogged(true);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    if (demo) {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const value = JSON.parse(cached);
          if (
            !Array.isArray(value.products) ||
            !value.settings ||
            !Array.isArray(value.alerts) ||
            value.products.some(
              (p: Product) =>
                !p.name ||
                !Array.isArray(p.offers) ||
                !Number.isInteger(p.target) ||
                p.offers.some((o) => !Array.isArray(o.history)),
            )
          )
            throw new Error('Dados inválidos');
          setState(value);
        } else setState(demoState());
      } catch {
        setState(demoState());
        setToast('A demonstração foi restaurada.');
      }
      setReady(true);
    } else void reload();
  }, [demo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (demo && ready) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        setToast('Seu navegador não permitiu salvar os dados locais.');
      }
    }
  }, [demo, ready, state]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function patch(id: string, data: Partial<Product>) {
    await action(async () => {
      if (demo)
        setState((s) => ({
          ...s,
          products: s.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
        }));
      else {
        await api('products', 'PATCH', { id, ...data });
        await reload();
      }
      setToast('Produto atualizado.');
    });
  }
  async function remove(id: string) {
    await action(async () => {
      if (demo)
        setState((s) => ({
          ...s,
          products: s.products.filter((p) => p.id !== id),
          alerts: s.alerts.filter((a) => a.productId !== id),
        }));
      else {
        await api('products', 'DELETE', { id });
        await reload();
      }
      setSelected(null);
      setToast('Produto removido.');
    });
  }
  const counts = {
    hit: state.products.filter((p) => status(p) === 'hit').length,
    near: state.products.filter((p) => status(p) === 'near').length,
    active: state.products.filter((p) => !p.paused).length,
  };
  const savings = state.products.reduce((sum, p) => {
    const o = bestOffer(p);
    return sum + (o && !p.paused ? Math.max(0, p.target - cost(o, p.includeShipping)!) : 0);
  }, 0);
  const products = state.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (filter === 'all' || status(p) === filter),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'price'
          ? (bestOffer(a) ? cost(bestOffer(a)!, a.includeShipping)! : Infinity) -
            (bestOffer(b) ? cost(bestOffer(b)!, b.includeShipping)! : Infinity)
          : 0,
    );
  const current = state.products.find((p) => p.id === selected);
  const nav = (next: typeof view) => {
    setView(next);
    setMobile(false);
  };
  function simulate(p: Product) {
    const now = new Date().toISOString();
    const price = Math.max(
      1,
      Math.round(p.target * 0.94) - (p.includeShipping ? (p.offers[0]?.shipping ?? 0) : 0),
    );
    setState((s) => {
      const next = {
        ...p,
        offers: p.offers.map((o, i) =>
          i
            ? o
            : {
                ...o,
                price,
                available: true,
                error: null,
                checkedAt: now,
                history: [...o.history, { at: now, price, shipping: o.shipping, available: true }],
              },
        ),
      };
      const previousAlert = s.alerts.find((a) => a.productId === p.id);
      const decision = alertDecision(next, status(p) === 'hit', previousAlert?.at ?? null);
      return {
        ...s,
        products: s.products.map((v) => (v.id === p.id ? next : v)),
        alerts: decision.notify
          ? [
              {
                id: crypto.randomUUID(),
                productId: p.id,
                name: p.name,
                price: decision.value!,
                at: now,
                channel: 'Demonstração',
                status: 'simulated',
              },
              ...s.alerts,
            ]
          : s.alerts,
      };
    });
    setToast('Queda simulada. Nenhuma mensagem externa foi enviada.');
  }

  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <a href="/" className="brand" aria-label="PriceWatch início">
          <span className="brand-icon">
            <TrendingDown size={23} />
          </span>
          price<span>watch</span>
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">P</span>
          <div>
            Meu espaço<small>Compras mais inteligentes</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">ACOMPANHE</p>
        <nav>
          <button className={view === 'list' ? 'active' : ''} onClick={() => nav('list')}>
            <LayoutDashboard size={19} />
            Visão geral
          </button>
          <button className={view === 'history' ? 'active' : ''} onClick={() => nav('history')}>
            <ChartNoAxesCombined size={19} />
            Histórico de preços
          </button>
          <button className={view === 'alerts' ? 'active' : ''} onClick={() => nav('alerts')}>
            <Bell size={19} />
            Meus alertas<span className="nav-count">{state.alerts.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <div className="quiet-symbol">
              <BellOff size={23} />
              <span>zz</span>
            </div>
            <h3>
              Menos ruído.
              <br />
              Mais economia.
            </h3>
            <p>
              A gente acompanha.
              <br />
              Você só decide na hora certa.
            </p>
            <span>
              <span className="live-dot" />
              Só alertas na meta
            </span>
          </div>
          <button className="settings-nav" onClick={() => setModal('settings')}>
            <Settings2 size={19} />
            Preferências
          </button>
          <div className="profile">
            <span className="avatar">EU</span>
            <div>
              Meu PriceWatch<small>{demo ? 'Modo demonstração' : 'Espaço pessoal'}</small>
            </div>
            {!demo && logged && (
              <button
                className="icon-btn"
                aria-label="Sair"
                onClick={() =>
                  void action(async () => {
                    await api('session', 'DELETE');
                    setLogged(false);
                    setState(empty);
                  })
                }
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMobile(true)}
            >
              <Menu size={22} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={14} />
            <strong>
              {
                { list: 'Visão geral', history: 'Histórico de preços', alerts: 'Meus alertas' }[
                  view
                ]
              }
            </strong>
          </div>
          <div className="top-actions">
            <span className="mode-pill">
              <span className="live-dot" />
              {demo ? 'Demonstração' : 'Monitoramento pessoal'}
            </span>
            <button
              className="icon-btn bell-btn"
              aria-label="Ver alertas"
              onClick={() => setView('alerts')}
            >
              <Bell size={19} />
              {state.alerts.length > 0 && <i />}
            </button>
            <span className="avatar small">EU</span>
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button aria-label="Fechar erro" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {!ready ? (
            <div className="loading">
              <RefreshCw className="spin" /> Preparando seu espaço…
            </div>
          ) : !logged ? (
            <section className="login-card">
              <span className="eyebrow">SEU ESPAÇO PESSOAL</span>
              <h1>Bem-vindo ao PriceWatch.</h1>
              <p>Entre para acompanhar seus produtos e suas metas.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await api('session', 'POST', { password });
                    setPassword('');
                    await reload();
                  });
                }}
              >
                <label>
                  Senha do proprietário
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </label>
                <button className="btn primary" disabled={busy}>
                  Entrar <ArrowRight size={17} />
                </button>
              </form>
            </section>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">COMPRE NO SEU TEMPO</div>
                  <h1>
                    {
                      {
                        list: 'Sua próxima boa compra começa aqui.',
                        history: 'Cada preço conta uma história.',
                        alerts: 'Só o que vale a sua atenção.',
                      }[view]
                    }
                  </h1>
                  <p>
                    {
                      {
                        list: 'Você define a meta. A gente fica de olho no preço.',
                        history: 'Veja a trajetória dos preços antes de decidir.',
                        alerts: 'Um aviso na hora certa. Sem notificações a cada centavo.',
                      }[view]
                    }
                  </p>
                </div>
                <button className="btn primary" onClick={() => setModal('add')}>
                  <Plus size={18} />
                  Monitorar produto
                </button>
              </div>
              {view === 'list' && (
                <>
                  <section className="hero">
                    <div className="hero-copy">
                      <span className="hero-kicker">
                        <ShieldCheck size={15} /> SEU BOLSO, SUAS REGRAS
                      </span>
                      <h2>
                        O melhor preço
                        <br />é <em>o seu.</em>
                      </h2>
                      <p>
                        Nada de “baixou R$ 0,50”. Receba um alerta
                        <br className="desktop-br" /> só quando o preço chegar à sua meta.
                      </p>
                      <span className="hero-note">
                        <CheckCheck size={15} /> Paciência que vale a pena.
                      </span>
                    </div>
                    <div className="hero-visual" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="floating-tag">
                        <Target size={17} />
                        Sua meta, atingida.
                        <span>
                          <Check size={14} />
                        </span>
                      </div>
                      <svg viewBox="0 0 400 150" className="hero-graph">
                        <path
                          d="M0 25 55 45 90 25 145 77 190 65 230 105 275 85 330 120 380 120"
                          stroke="#c4b6f2"
                          strokeWidth="3"
                          fill="none"
                        />
                        <path
                          d="M0 120H400"
                          stroke="#9cdbbf"
                          strokeWidth="1.5"
                          strokeDasharray="5 6"
                        />
                        <circle
                          cx="330"
                          cy="120"
                          r="10"
                          fill="#bcebd4"
                          stroke="#7778a8"
                          strokeWidth="6"
                        />
                      </svg>
                      <div className="hero-price">
                        <span>PREÇO BOM É PREÇO COMBINADO</span>
                        <div>
                          <TrendingDown size={25} />
                          <strong>
                            Menos spam.
                            <br />
                            Mais controle.
                          </strong>
                        </div>
                      </div>
                    </div>
                    <span className="hero-index">01 / COMPRE MELHOR</span>
                  </section>
                  <section className="stats" aria-label="Resumo da lista">
                    <Stat
                      icon={<Package />}
                      label="Produtos monitorados"
                      value={String(counts.active).padStart(2, '0')}
                      note="De olho por você"
                    />
                    <Stat
                      icon={<Target />}
                      label="Metas atingidas"
                      value={String(counts.hit).padStart(2, '0')}
                      note="O preço que você esperava"
                      green
                    />
                    <Stat
                      icon={<Activity />}
                      label="Perto da meta"
                      value={String(counts.near).padStart(2, '0')}
                      note="Até 10% acima do alvo"
                    />
                    <Stat
                      icon={<TrendingDown />}
                      label="Abaixo das suas metas"
                      value={money(savings)}
                      note="Diferença nas ofertas atuais"
                      green
                    />
                  </section>
                  <section className="wishlist">
                    <div className="section-heading">
                      <div>
                        <h2>
                          Minha lista de desejos <span>{state.products.length}</span>
                        </h2>
                        <p>Boas compras merecem um pouco de paciência.</p>
                      </div>
                      <button
                        className="subtle-btn"
                        disabled={busy}
                        onClick={() => {
                          if (demo)
                            setToast('Dados fictícios. Abra um produto para simular uma queda.');
                          else void action(reload);
                        }}
                      >
                        <RefreshCw size={15} />
                        Atualizar painel
                      </button>
                    </div>
                    <div className="list-toolbar">
                      <div className="filters">
                        {[
                          ['all', 'Todos'],
                          ['hit', 'Meta atingida'],
                          ['near', 'Quase lá'],
                          ['paused', 'Pausados'],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className={filter === id ? 'selected' : ''}
                            onClick={() => setFilter(id)}
                          >
                            {label}
                            {id === 'all' && <span>{state.products.length}</span>}
                          </button>
                        ))}
                      </div>
                      <div className="search-sort">
                        <label className="search-field">
                          <Search size={16} />
                          <input
                            aria-label="Buscar na sua lista"
                            placeholder="Buscar na sua lista"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                        <select
                          aria-label="Ordenar produtos"
                          value={sort}
                          onChange={(e) => setSort(e.target.value)}
                        >
                          <option value="default">Mais recentes</option>
                          <option value="name">Nome A–Z</option>
                          <option value="price">Menor preço</option>
                        </select>
                      </div>
                    </div>
                    {products.length ? (
                      <div className="product-grid">
                        {products.map((p) => (
                          <ProductCard key={p.id} product={p} onOpen={() => setSelected(p.id)} />
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Heart size={32} />
                        <h3>
                          {state.products.length
                            ? 'Nenhum produto por aqui.'
                            : 'Sua primeira boa compra começa aqui.'}
                        </h3>
                        <p>
                          {state.products.length
                            ? 'Tente outro nome ou filtro.'
                            : 'Adicione um produto e diga quanto quer pagar.'}
                        </p>
                        <button
                          className="btn secondary"
                          onClick={() =>
                            state.products.length
                              ? (setSearch(''), setFilter('all'))
                              : setModal('add')
                          }
                        >
                          {state.products.length ? 'Limpar filtros' : 'Adicionar produto'}
                        </button>
                      </div>
                    )}
                  </section>
                </>
              )}
              {view === 'history' && (
                <div className="history-list">
                  {state.products.length ? (
                    state.products.map((p) => (
                      <section className="chart-panel" key={p.id}>
                        <div className="section-heading">
                          <div>
                            <h2>{p.name}</h2>
                            <p>
                              Últimos 30 dias ·{' '}
                              {p.includeShipping ? 'Produto + frete informado' : 'Somente produto'}
                            </p>
                          </div>
                          <button className="subtle-btn" onClick={() => setSelected(p.id)}>
                            Detalhes <ArrowUpRight size={15} />
                          </button>
                        </div>
                        <Chart product={p} />
                      </section>
                    ))
                  ) : (
                    <div className="empty-state">
                      Adicione um produto para começar seu histórico.
                    </div>
                  )}
                </div>
              )}
              {view === 'alerts' && (
                <section className="alerts-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Na hora certa.</h2>
                      <p>
                        Novos avisos exigem uma nova queda até a meta e um intervalo mínimo de 24h.
                      </p>
                    </div>
                    <ShieldCheck className="green-text" size={26} />
                  </div>
                  {state.alerts.length ? (
                    state.alerts.map((a) => (
                      <div className="alert-row" key={a.id}>
                        <span className="alert-icon">
                          <Target size={21} />
                        </span>
                        <div>
                          <h3>{a.name}</h3>
                          <p>
                            {money(a.price)} · {a.channel} · {dateTime(a.at)}
                          </p>
                        </div>
                        <span
                          className={`badge ${a.status === 'sent' || a.status === 'simulated' ? 'hit' : 'above'}`}
                        >
                          {{
                            simulated: 'Simulado',
                            sent: 'Enviado',
                            pending: 'Pendente',
                            sending: 'Enviando',
                            cancelled: 'Cancelado',
                            failed: 'Falhou',
                            uncertain: 'Conferir entrega',
                            expired: 'Expirado',
                          }[a.status] || a.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <BellOff size={32} />
                      <h3>Silêncio por um bom motivo.</h3>
                      <p>
                        Quando um preço atingir a meta e um canal estiver ativo, o alerta aparecerá
                        aqui.
                      </p>
                    </div>
                  )}
                  <div className="info-strip">
                    <BellOff size={17} />O modo silencioso faz parte do PriceWatch: variações acima
                    da meta nunca geram alertas.
                  </div>
                </section>
              )}
              <footer>
                <span>
                  <span className="mini-logo">
                    <TrendingDown size={14} />
                  </span>
                  pricewatch<span className="footer-divider">/</span>Seu preço. Seu momento.
                </span>
                <span>
                  {demo
                    ? 'Dados ilustrativos · nenhuma oferta ou notificação real'
                    : 'Preços sujeitos a disponibilidade e confirmação na loja'}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {modal === 'add' && (
        <AddProduct
          demo={demo}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (demo) {
              const id = crypto.randomUUID(),
                now = new Date().toISOString();
              setState((s) => ({
                ...s,
                products: [
                  {
                    id,
                    name: data.name,
                    target: data.target,
                    kind: 'generic',
                    includeShipping: data.includeShipping,
                    paused: false,
                    offers: [
                      {
                        id: crypto.randomUUID(),
                        store: 'Loja demonstrativa',
                        url: '',
                        price: data.demoPrice,
                        shipping: data.shipping,
                        available: true,
                        checkedAt: now,
                        error: null,
                        history: [
                          {
                            at: now,
                            price: data.demoPrice,
                            shipping: data.shipping,
                            available: true,
                          },
                        ],
                      },
                    ],
                  },
                  ...s.products,
                ],
              }));
            } else {
              await api('products', 'POST', data);
              await reload();
            }
            setModal(null);
            setToast(
              demo
                ? 'Produto adicionado à demonstração.'
                : 'Produto cadastrado. A primeira coleta ocorrerá no próximo ciclo.',
            );
          }}
        />
      )}
      {modal === 'settings' && (
        <Preferences
          demo={demo}
          settings={state.settings}
          onClose={() => setModal(null)}
          onSave={async (settings) => {
            if (demo) setState((s) => ({ ...s, settings }));
            else {
              await api('settings', 'PUT', settings);
              await reload();
            }
            setModal(null);
            setToast('Preferências salvas.');
          }}
        />
      )}
      {current && (
        <ProductDetails
          product={current}
          demo={demo}
          busy={busy}
          onClose={() => setSelected(null)}
          onPatch={(data) => patch(current.id, data)}
          onRemove={() => remove(current.id)}
          onSimulate={() => simulate(current)}
          onOffer={async (url, shipping) => {
            if (demo) {
              const now = new Date().toISOString();
              setState((s) => ({
                ...s,
                products: s.products.map((p) =>
                  p.id === current.id
                    ? {
                        ...p,
                        offers: [
                          ...p.offers,
                          {
                            id: crypto.randomUUID(),
                            store: 'Nova loja (demo)',
                            url: '',
                            price: Math.round(p.target * 1.12),
                            shipping,
                            available: true,
                            checkedAt: now,
                            error: null,
                            history: [],
                          },
                        ],
                      }
                    : p,
                ),
              }));
            } else {
              await api('offers', 'POST', { productId: current.id, url, shipping });
              await reload();
            }
            setToast('Oferta adicionada. Confirme que é o mesmo modelo e variante.');
          }}
          onDeleteOffer={async (id) => {
            if (demo)
              setState((s) => ({
                ...s,
                products: s.products.map((p) =>
                  p.id === current.id ? { ...p, offers: p.offers.filter((o) => o.id !== id) } : p,
                ),
              }));
            else {
              await api('offers', 'DELETE', { id, productId: current.id });
              await reload();
            }
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  note,
  green = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  green?: boolean;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${green ? 'green' : ''}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>
        {green && <span className="live-dot" />}
        {note}
      </small>
    </div>
  );
}
function ProductCard({ product: p, onOpen }: { product: Product; onOpen: () => void }) {
  const s = status(p),
    o = bestOffer(p),
    value = o ? cost(o, p.includeShipping) : null,
    delta = value !== null ? value - p.target : 0;
  return (
    <button className="product-card" onClick={onOpen}>
      <div className={`product-image bg-${p.kind}`}>
        <span className={`badge ${s}`}>
          {s === 'hit' ? <Check size={12} /> : s === 'near' ? <Activity size={12} /> : null}
          {statusLabels[s]}
        </span>
        <span className="card-heart">
          <Heart size={17} />
        </span>
        <ProductArt kind={p.kind} />
      </div>
      <div className="product-content">
        <div className="product-category">
          {
            {
              headphones: 'ÁUDIO & SOM',
              console: 'GAMES',
              coffee: 'CASA & CAFÉ',
              phone: 'SMARTPHONES',
              monitor: 'SETUP & TECNOLOGIA',
              generic: 'MINHA LISTA',
            }[p.kind]
          }
        </div>
        <h3>{p.name}</h3>
        <div className="current-price">
          <strong>{value !== null ? money(value) : 'Aguardando'}</strong>
          {delta < 0 && (
            <span>
              <ArrowDownRight size={13} />
              {Math.abs((delta / p.target) * 100).toFixed(0)}% da meta
            </span>
          )}
        </div>
        <div className="store-caption">
          {o ? (
            <>
              <span className="store-mark">{o.store.charAt(0).toLowerCase()}</span>
              {o.store}
              <span>· melhor preço</span>
            </>
          ) : (
            'Aguardando uma coleta válida'
          )}
        </div>
        <div className="target-row">
          <span>
            <Target size={14} />
            Sua meta
          </span>
          <strong>{money(p.target)}</strong>
        </div>
        <div className={`progress-track ${s}`}>
          <i
            style={{ width: `${value !== null ? Math.min(100, (p.target / value) * 100) : 0}%` }}
          />
        </div>
        <div className="card-bottom">
          <span>
            {s === 'hit'
              ? 'Chegou no seu preço!'
              : s === 'paused'
                ? 'Monitoramento pausado'
                : value !== null
                  ? `Faltam ${money(Math.max(0, delta))} para a meta`
                  : 'Sem preço válido'}
          </span>
          <span className="store-count">
            {p.offers.length} lojas
            <ChevronRight size={13} />
          </span>
        </div>
      </div>
    </button>
  );
}

type AddData = {
  name: string;
  url: string;
  target: number;
  includeShipping: boolean;
  shipping: number | null;
  demoPrice: number;
};
function AddProduct({
  demo,
  onClose,
  onSave,
}: {
  demo: boolean;
  onClose: () => void;
  onSave: (data: AddData) => Promise<void>;
}) {
  const [name, setName] = useState(''),
    [url, setUrl] = useState(''),
    [target, setTarget] = useState(''),
    [price, setPrice] = useState(''),
    [shipping, setShipping] = useState(''),
    [total, setTotal] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState('');
  async function importUrl() {
    setBusy(true);
    setError('');
    try {
      const q = await api('import', 'POST', { url });
      setName(q.name);
      setPreview(`${q.store} · ${money(q.price)} · ${q.available ? 'Disponível' : 'Indisponível'}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        url,
        target: cents(target),
        includeShipping: total,
        shipping: shipping === '' ? null : shipping === '0' ? 0 : cents(shipping),
        demoPrice: demo ? cents(price) : 0,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="De olho na próxima compra."
      description={
        demo
          ? 'Experimente com um produto e preços fictícios.'
          : 'Adicione o link direto do produto e escolha sua meta.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {!demo && (
          <label>
            Link do produto
            <div className="inline-input">
              <input
                type="url"
                placeholder="https://www.amazon.com.br/…"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                type="button"
                className="btn secondary"
                disabled={!url || busy}
                onClick={() => void importUrl()}
              >
                Identificar
              </button>
            </div>
            <small>Amazon, Magalu, Mercado Livre ou KaBuM!. Use o link completo.</small>
          </label>
        )}
        {preview && <div className="success-note">{preview}</div>}
        <label>
          Nome do produto
          <input
            required
            minLength={2}
            maxLength={180}
            placeholder="Ex.: Sony WH-1000XM5"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <small>
            {demo
              ? 'Os dados ficam apenas neste navegador.'
              : 'Confira modelo, cor e capacidade. Se a identificação falhar, preencha o nome.'}
          </small>
        </label>
        <div className="form-columns">
          <label>
            Quanto você quer pagar?{' '}
            <div className="currency-input">
              <span>R$</span>
              <input
                required
                inputMode="decimal"
                placeholder="1.500,00"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
          </label>
          {demo && (
            <label>
              Preço fictício atual
              <div className="currency-input">
                <span>R$</span>
                <input
                  required
                  inputMode="decimal"
                  placeholder="1.899,00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </label>
          )}
        </div>
        <label>
          Frete informado (opcional)
          <div className="currency-input">
            <span>R$</span>
            <input
              inputMode="decimal"
              placeholder="Deixe vazio se desconhecido"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
            />
          </div>
          <small>Informe 0 para frete grátis. O frete não é calculado por CEP nesta versão.</small>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={total} onChange={(e) => setTotal(e.target.checked)} />
          <span>Minha meta inclui produto + frete</span>
        </label>
        <div className="info-strip">
          <ShieldCheck size={19} />
          <span>Você só recebe um alerta quando o preço é igual ou menor que sua meta.</span>
        </div>
        <div className="modal-actions">
          <button className="btn secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            <Plus size={16} />
            {busy ? 'Salvando…' : 'Começar a acompanhar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Preferences({
  demo,
  settings,
  onClose,
  onSave,
}: {
  demo: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => Promise<void>;
}) {
  const [s, setS] = useState(settings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <Modal
      title="Do seu jeito. Sem spam."
      description="Escolha onde receber os alertas quando a meta for atingida."
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(s);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        {demo && (
          <div className="info-strip">Demonstração: nenhum e-mail ou mensagem será enviado.</div>
        )}
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={s.emailEnabled}
            onChange={(e) => setS({ ...s, emailEnabled: e.target.checked })}
          />
          <Mail size={18} />
          <span>Receber por e-mail</span>
        </label>
        <label>
          E-mail
          <input
            type="email"
            placeholder="voce@exemplo.com"
            required={s.emailEnabled}
            value={s.email}
            onChange={(e) => setS({ ...s, email: e.target.value })}
          />
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={s.telegramEnabled}
            onChange={(e) => setS({ ...s, telegramEnabled: e.target.checked })}
          />
          <span>Receber no Telegram</span>
        </label>
        <label>
          Chat ID do Telegram
          <input
            placeholder="Ex.: 123456789"
            pattern="-?[0-9]{1,20}"
            required={s.telegramEnabled}
            value={s.telegramChatId}
            onChange={(e) => setS({ ...s, telegramChatId: e.target.value })}
          />
          <small>
            Inicie uma conversa com seu bot antes de ativar. As credenciais dos canais são
            configuradas no servidor.
          </small>
        </label>
        <div className="quiet-setting">
          <BellOff size={24} />
          <div>
            <strong>Modo silencioso sempre ativo</strong>
            <p>
              Variações acima da meta não geram alertas. Ao desativar os dois canais, nenhum aviso
              externo é enviado.
            </p>
          </div>
          <ShieldCheck size={22} />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar preferências'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ProductDetails({
  product: p,
  demo,
  busy,
  onClose,
  onPatch,
  onRemove,
  onSimulate,
  onOffer,
  onDeleteOffer,
}: {
  product: Product;
  demo: boolean;
  busy: boolean;
  onClose: () => void;
  onPatch: (data: Partial<Product>) => Promise<void>;
  onRemove: () => Promise<void>;
  onSimulate: () => void;
  onOffer: (url: string, shipping: number | null) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
}) {
  const [target, setTarget] = useState((p.target / 100).toFixed(2).replace('.', ',')),
    [days, setDays] = useState(30),
    [add, setAdd] = useState(false),
    [url, setUrl] = useState(''),
    [shipping, setShipping] = useState(''),
    [error, setError] = useState(''),
    [localBusy, setLocalBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  async function local(fn: () => Promise<void>) {
    setLocalBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLocalBusy(false);
    }
  }
  return (
    <Modal
      title={p.name}
      description={
        demo
          ? 'Preços demonstrativos · não representam ofertas reais'
          : 'Confira se todas as ofertas são do mesmo modelo e variante.'
      }
      onClose={onClose}
      wide
    >
      {error && (
        <div role="alert" className="form-error">
          {error}
        </div>
      )}
      <div className="detail-summary">
        <span className={`badge ${status(p)}`}>{statusLabels[status(p)]}</span>
        <span>
          {p.includeShipping
            ? 'Comparando produto + frete informado'
            : 'Comparando somente o produto'}
        </span>
        <button
          className="subtle-btn"
          disabled={busy}
          onClick={() => void onPatch({ paused: !p.paused })}
        >
          {p.paused ? <Play size={14} /> : <Pause size={14} />}
          {p.paused ? 'Retomar' : 'Pausar'}
        </button>
      </div>
      <div className="detail-chart-head">
        <h3>Histórico de preços</h3>
        <select
          aria-label="Período do histórico"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>
      <Chart product={p} days={days} />
      <div className="detail-target">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void local(async () => onPatch({ target: cents(target) }));
          }}
        >
          <label>
            Sua meta{' '}
            <input
              aria-label="Editar preço-alvo"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <button className="btn secondary" disabled={busy || localBusy}>
            Salvar meta
          </button>
        </form>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={p.includeShipping}
            onChange={(e) => void onPatch({ includeShipping: e.target.checked })}
          />
          <span>Incluir frete na meta</span>
        </label>
      </div>
      <div className="section-heading offers-title">
        <h3>Comparar lojas</h3>
        <button className="subtle-btn" onClick={() => setAdd(!add)}>
          <Plus size={15} />
          Adicionar loja
        </button>
      </div>
      <div className="offer-list">
        {p.offers.map((o) => (
          <div className="offer-row" key={o.id}>
            <span className="store-logo">{o.store.charAt(0)}</span>
            <div className="offer-info">
              <strong>{o.store}</strong>
              <small>
                {o.error
                  ? 'Falha na coleta'
                  : !o.checkedAt
                    ? 'Aguardando coleta'
                    : !o.available
                      ? 'Indisponível'
                      : `Verificado: ${dateTime(o.checkedAt)}`}
              </small>
              {o.error && <small className="error-text">{o.error}</small>}
            </div>
            <div className="offer-price">
              <strong>{o.checkedAt ? money(o.price) : '—'}</strong>
              <small>
                {o.shipping === null
                  ? 'Frete desconhecido'
                  : o.shipping === 0
                    ? 'Frete grátis'
                    : `+ ${money(o.shipping)} de frete`}
              </small>
            </div>
            {o.url && (
              <a
                className="icon-btn"
                href={o.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir oferta ${o.store}`}
              >
                <ExternalLink size={16} />
              </a>
            )}
            <button
              disabled={localBusy}
              className="icon-btn"
              aria-label={`Remover oferta ${o.store}`}
              onClick={() => void local(() => onDeleteOffer(o.id))}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {add && (
        <form
          className="add-offer form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void local(async () => {
              await onOffer(url, shipping === '' ? null : shipping === '0' ? 0 : cents(shipping));
              setAdd(false);
              setUrl('');
              setShipping('');
            });
          }}
        >
          <label>
            Link da mesma variante
            <input
              type="url"
              required={!demo}
              placeholder={demo ? 'Opcional na demonstração' : 'https://…'}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label>
            Frete informado
            <input
              inputMode="decimal"
              placeholder="Desconhecido"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
            />
          </label>
          <button className="btn secondary" disabled={localBusy || busy}>
            Adicionar oferta
          </button>
        </form>
      )}
      <div className="detail-bottom">
        {confirm ? (
          <div className="delete-confirm">
            <span>Remover produto e histórico?</span>
            <button className="danger-btn" disabled={busy} onClick={() => void onRemove()}>
              Sim, remover
            </button>
            <button className="subtle-btn" onClick={() => setConfirm(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button className="danger-btn" onClick={() => setConfirm(true)}>
            <Trash2 size={15} />
            Remover produto
          </button>
        )}
        {demo && (
          <button
            className="btn secondary"
            disabled={!p.offers.length || p.paused}
            onClick={onSimulate}
          >
            <Sparkles size={15} />
            Simular queda
          </button>
        )}
      </div>
    </Modal>
  );
}
