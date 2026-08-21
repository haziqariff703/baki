'use client';

/**
 * Toast Notification System (Oracle Architecture & Impeccable Design).
 *
 * Lightweight, zero-dependency, reactive singleton store supporting:
 * - toast.success(title, options)
 * - toast.error(title, options)
 * - toast.warning(title, options)
 * - toast.info(title, options)
 * - toast.promise(promise, messages)
 * - toast.dismiss(id)
 */

import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration: number;
  action?: ToastAction;
  createdAt: number;
}

type ToastListener = (toasts: readonly ToastItem[]) => void;

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners = new Set<ToastListener>();
  private counter = 0;

  private notify() {
    const list = [...this.toasts];
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => {
        this.listeners.forEach((listener) => listener(list));
      });
    } else {
      setTimeout(() => {
        this.listeners.forEach((listener) => listener(list));
      }, 0);
    }
  }

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getToasts(): readonly ToastItem[] {
    return this.toasts;
  }

  public add(title: string, options?: ToastOptions): string {
    const id = options?.id || `toast-${Date.now()}-${++this.counter}`;
    const duration = options?.duration ?? (options?.type === 'error' ? 5500 : 4000);

    const newItem: ToastItem = {
      id,
      title,
      description: options?.description,
      type: options?.type || 'info',
      duration,
      action: options?.action,
      createdAt: Date.now(),
    };

    // Keep max 5 active toasts on screen
    this.toasts = [newItem, ...this.toasts.filter((t) => t.id !== id)].slice(0, 5);
    this.notify();

    if (duration > 0 && duration !== Infinity) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public dismiss(id?: string) {
    if (id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    } else {
      this.toasts = [];
    }
    this.notify();
  }
}

export const toastStore = new ToastStore();

export function useToastStore() {
  const [toasts, setToasts] = useState<readonly ToastItem[]>(() => toastStore.getToasts());

  useEffect(() => {
    const unsubscribe = toastStore.subscribe((newList) => {
      setToasts(newList);
    });
    return unsubscribe;
  }, []);

  return {
    toasts,
    dismiss: (id?: string) => toastStore.dismiss(id),
  };
}

export const toast = Object.assign(
  (title: string, options?: ToastOptions) => toastStore.add(title, options),
  {
    success: (title: string, options?: Omit<ToastOptions, 'type'>) =>
      toastStore.add(title, { ...options, type: 'success' }),

    error: (title: string, options?: Omit<ToastOptions, 'type'>) =>
      toastStore.add(title, { ...options, type: 'error' }),

    warning: (title: string, options?: Omit<ToastOptions, 'type'>) =>
      toastStore.add(title, { ...options, type: 'warning' }),

    info: (title: string, options?: Omit<ToastOptions, 'type'>) =>
      toastStore.add(title, { ...options, type: 'info' }),

    dismiss: (id?: string) => toastStore.dismiss(id),

    promise: async <T>(
      promise: Promise<T>,
      msgs: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: unknown) => string);
      },
    ): Promise<T> => {
      const id = toastStore.add(msgs.loading, { type: 'info', duration: Infinity });
      try {
        const data = await promise;
        const successMsg = typeof msgs.success === 'function' ? msgs.success(data) : msgs.success;
        toastStore.dismiss(id);
        toastStore.add(successMsg, { type: 'success' });
        return data;
      } catch (err) {
        const errorMsg = typeof msgs.error === 'function' ? msgs.error(err) : msgs.error;
        toastStore.dismiss(id);
        toastStore.add(errorMsg, { type: 'error' });
        throw err;
      }
    },
  },
);
