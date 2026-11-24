'use client';
import { money, type Product, cost } from '@/lib/model';
export default function Chart({ product, days = 30 }: { product: Product; days?: number }) {
  const now = Date.now();
  const colors = ['#7960d7', '#3da792', '#dc9e42', '#668dc9'];
  const series = product.offers.map((o) => ({
    store: o.store,
    samples: o.history.filter(
      (s) =>
        Date.parse(s.at) >= now - days * 86400000 &&
        s.available &&
        cost(s, product.includeShipping) !== null,
    ),
  }));
  const values = series.flatMap((s) => s.samples.map((v) => cost(v, product.includeShipping)!));
  if (!values.length)
    return <div className="empty-chart">O histórico aparecerá após a primeira coleta válida.</div>;
  const min = Math.min(product.target, ...values) * 0.92,
    max = Math.max(product.target, ...values) * 1.06;
  const y = (n: number) => 175 - ((n - min) / (max - min)) * 145;
  const first = Math.min(...series.flatMap((s) => s.samples.map((v) => Date.parse(v.at))));
  const range = Math.max(now - first, 86400000);
  const x = (at: string) => 70 + ((Date.parse(at) - first) / range) * 690;
  return (
    <div className="chart">
      <svg
        viewBox="0 0 800 225"
        role="img"
        aria-label={`Histórico de preços de ${product.name}. Meta ${money(product.target)}. Menor preço no período ${money(Math.min(...values))}.`}
      >
        {[0, 1, 2, 3].map((i) => {
          const value = min + ((max - min) * i) / 3;
          return (
            <g key={i}>
              <line
                x1="70"
                x2="770"
                y1={y(value)}
                y2={y(value)}
                stroke="#e9e9ef"
                strokeDasharray="3 4"
              />
              <text x="0" y={y(value) + 4} fill="#8b8c98" fontSize="11">
                {money(value)}
              </text>
            </g>
          );
        })}
        <line
          x1="70"
          x2="770"
          y1={y(product.target)}
          y2={y(product.target)}
          stroke="#62a58a"
          strokeDasharray="6 5"
        />
        <text x="770" y={y(product.target) - 8} textAnchor="end" fill="#398467" fontSize="11">
          Sua meta
        </text>
        {series.map((s, i) => (
          <g key={s.store + i}>
            <polyline
              points={s.samples
                .map((v) => `${x(v.at)},${y(cost(v, product.includeShipping)!)}`)
                .join(' ')}
              stroke={colors[i % colors.length]}
              strokeWidth="2.5"
              fill="none"
              strokeLinejoin="round"
            />
            {s.samples.length > 0 && (
              <circle
                cx={x(s.samples.at(-1)!.at)}
                cy={y(cost(s.samples.at(-1)!, product.includeShipping)!)}
                r="4"
                fill={colors[i % colors.length]}
              />
            )}
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <text
            key={i}
            x={70 + i * 172.5}
            y="210"
            fill="#8b8c98"
            textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
            fontSize="11"
          >
            {new Date(first + (range * i) / 4).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
            })}
          </text>
        ))}
      </svg>
      <div className="legend">
        {series.map((s, i) => (
          <span key={s.store + i}>
            <i style={{ background: colors[i % colors.length] }} />
            {s.store}
          </span>
        ))}
      </div>
    </div>
  );
}
