import { newE2EPage } from '@stencil/core/testing';

describe('necro-component', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<necro-component></necro-component>');

    const element = await page.find('necro-component');
    expect(element).toHaveClass('hydrated');
  });
});
