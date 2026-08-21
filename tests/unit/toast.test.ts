import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast, toastStore } from '@/lib/toast';

describe('Toast Notification System (Unit Tests)', () => {
  beforeEach(() => {
    toast.dismiss();
  });

  it('adds success toast with correct metadata', () => {
    const id = toast.success('Profile saved', { description: 'Settings updated successfully' });
    const toasts = toastStore.getToasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].id).toBe(id);
    expect(toasts[0].title).toBe('Profile saved');
    expect(toasts[0].description).toBe('Settings updated successfully');
    expect(toasts[0].type).toBe('success');
  });

  it('adds error toast with appropriate default duration', () => {
    toast.error('Failed to save');
    const toasts = toastStore.getToasts();

    expect(toasts.length).toBe(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].duration).toBe(5500);
  });

  it('adds warning and info toasts correctly', () => {
    toast.warning('Consent revoked');
    toast.info('Subscription paused');

    const toasts = toastStore.getToasts();
    expect(toasts.length).toBe(2);
    expect(toasts[0].type).toBe('info');
    expect(toasts[1].type).toBe('warning');
  });

  it('caps max simultaneous toasts on screen to 5', () => {
    for (let i = 1; i <= 8; i++) {
      toast.info(`Toast #${i}`);
    }

    const toasts = toastStore.getToasts();
    expect(toasts.length).toBe(5);
    expect(toasts[0].title).toBe('Toast #8');
  });

  it('supports explicit dismissal by id and clear all', () => {
    const id1 = toast.success('Item 1');
    const id2 = toast.success('Item 2');

    expect(toastStore.getToasts().length).toBe(2);

    toast.dismiss(id1);
    expect(toastStore.getToasts().length).toBe(1);
    expect(toastStore.getToasts()[0].id).toBe(id2);

    toast.dismiss();
    expect(toastStore.getToasts().length).toBe(0);
  });

  it('handles toast.promise resolution and rejection', async () => {
    const successPromise = Promise.resolve({ data: 'ok' });
    await toast.promise(successPromise, {
      loading: 'Saving...',
      success: 'Saved successfully',
      error: 'Failed to save',
    });

    const toastsAfterSuccess = toastStore.getToasts();
    expect(toastsAfterSuccess.length).toBe(1);
    expect(toastsAfterSuccess[0].type).toBe('success');
    expect(toastsAfterSuccess[0].title).toBe('Saved successfully');

    toast.dismiss();

    const failurePromise = Promise.reject(new Error('Network error'));
    await expect(
      toast.promise(failurePromise, {
        loading: 'Saving...',
        success: 'Saved successfully',
        error: (err) => `Failed: ${(err as Error).message}`,
      }),
    ).rejects.toThrow('Network error');

    const toastsAfterFailure = toastStore.getToasts();
    expect(toastsAfterFailure.length).toBe(1);
    expect(toastsAfterFailure[0].type).toBe('error');
    expect(toastsAfterFailure[0].title).toBe('Failed: Network error');
  });
});
