import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VisualRegionEditor } from './VisualRegionEditor';

describe('VisualRegionEditor', () => {
  it('records an explicit reviewer crop as CONFIRMED', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <VisualRegionEditor
        pageImageUrl="blob:page-3"
        pageNumber={3}
        initialCrop={null}
        onConfirm={onConfirm}
      />,
    );

    await user.clear(screen.getByLabelText('Crop X'));
    await user.type(screen.getByLabelText('Crop X'), '0.1');
    await user.clear(screen.getByLabelText('Crop Y'));
    await user.type(screen.getByLabelText('Crop Y'), '0.2');
    await user.clear(screen.getByLabelText('Crop width'));
    await user.type(screen.getByLabelText('Crop width'), '0.7');
    await user.clear(screen.getByLabelText('Crop height'));
    await user.type(screen.getByLabelText('Crop height'), '0.5');

    await user.click(screen.getByRole('button', { name: 'Confirm visual region' }));

    expect(onConfirm).toHaveBeenCalledWith({
      crop: { x: 0.1, y: 0.2, width: 0.7, height: 0.5 },
      verificationState: 'CONFIRMED',
    });
  });
});
