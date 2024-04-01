import { newSpecPage } from '@stencil/core/testing';
import { NecroComponent } from '../necro-component';

describe('necro-component', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [NecroComponent],
      html: `<necro-component></necro-component>`,
    });
    expect(page.root).toEqualHtml(`
      <necro-component>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </necro-component>
    `);
  });
});
