import { test, expect } from '@playwright/test';
test('unknown shipping cannot generate a total-mode simulated alert', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Monitorar produto' }).click();
  await page.getByLabel('Nome do produto').fill('Frete desconhecido');
  await page.getByLabel('Quanto você quer pagar?').fill('100,00');
  await page.getByLabel('Preço fictício atual').fill('150,00');
  await page.getByLabel('Minha meta inclui produto + frete').check();
  await page.getByRole('button', { name: 'Começar a acompanhar' }).click();
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name: 'Frete desconhecido' }) })
    .click();
  await page.getByRole('button', { name: 'Simular queda' }).click();
  await expect(page.getByRole('dialog')).toContainText('Sem preço válido');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('button', { name: /Meus alertas/ }).click();
  await expect(page.locator('.alert-row').filter({ hasText: 'Frete desconhecido' })).toHaveCount(0);
});
