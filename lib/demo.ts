import type { State, Product, Kind } from './model';
export function demoState(): State {
  const now = Date.now();
  const make = (
    id: string,
    name: string,
    kind: Kind,
    target: number,
    prices: number[],
  ): Product => ({
    id,
    name,
    kind,
    target,
    includeShipping: false,
    paused: false,
    offers: prices.map((price, i) => ({
      id: `${id}-${i}`,
      store: ['Amazon', 'Mercado Livre', 'KaBuM!'][i],
      url: '',
      price,
      shipping: i ? 1990 : 0,
      available: true,
      checkedAt: new Date(now).toISOString(),
      error: null,
      history: Array.from({ length: 30 }, (_, j) => ({
        at: new Date(now - (29 - j) * 86400000).toISOString(),
        price:
          j === 29
            ? price
            : Math.round(price * (1 + (29 - j) * 0.006 + Math.sin(j * 1.7 + i) * 0.035)),
        shipping: i ? 1990 : 0,
        available: true,
      })),
    })),
  });
  return {
    products: [
      make('sony', 'Sony WH-1000XM5', 'headphones', 180000, [169900, 184990, 179990]),
      make('ps5', 'PlayStation 5 Slim Digital', 'console', 300000, [319900, 329900, 324990]),
      make('nespresso', 'Nespresso Essenza Mini', 'coffee', 50000, [64900, 62900, 67900]),
      make('iphone', 'Apple iPhone 16 · 128 GB', 'phone', 400000, [429900, 419900, 439900]),
      make('monitor', 'Monitor LG UltraGear 27”', 'monitor', 120000, [114990, 129900, 124990]),
      make('bose', 'Bose QuietComfort Ultra', 'headphones', 200000, [239900, 249900, 229900]),
    ],
    settings: { email: '', emailEnabled: false, telegramChatId: '', telegramEnabled: false },
    alerts: [
      {
        id: 'a1',
        productId: 'sony',
        name: 'Sony WH-1000XM5',
        price: 169900,
        at: new Date(now - 1200000).toISOString(),
        channel: 'Demonstração',
        status: 'simulated',
      },
      {
        id: 'a2',
        productId: 'monitor',
        name: 'Monitor LG UltraGear 27”',
        price: 114990,
        at: new Date(now - 3600000).toISOString(),
        channel: 'Demonstração',
        status: 'simulated',
      },
    ],
  };
}
