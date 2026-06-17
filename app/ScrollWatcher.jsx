'use client';
import { useEffect } from 'react';

export default function ScrollWatcher() {
  useEffect(() => {
    let timer;
    const onScroll = () => {
      document.documentElement.classList.add('is-scrolling');
      clearTimeout(timer);
      timer = setTimeout(() => {
        document.documentElement.classList.remove('is-scrolling');
      }, 800);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(timer);
    };
  }, []);
  return null;
}
