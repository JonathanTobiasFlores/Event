import { User } from '@/app/types/canvas';

export function getOrCreateUser(): User {
  if (typeof window === 'undefined') {
    return { id: 'anon', name: 'Anonymous' };
  }

  let id = localStorage.getItem('userId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('userId', id);
  }

  let name = localStorage.getItem('userName');
  if (!name) {
    name = prompt('Enter your name:') || 'Anonymous';
    localStorage.setItem('userName', name);
  }

  return { id, name };
}