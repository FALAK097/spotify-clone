'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import useDebounce from '@/hooks/useDebounce';

import Input from './Input';

const SearchInput = () => {
  const router = useRouter();
  const [value, setValue] = useState<string>('');
  const debouncedValue = useDebounce<string>(value, 500);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedValue) params.set('title', debouncedValue);
    router.push(`/search?${params.toString()}`);
  }, [debouncedValue, router]);

  return (
    <Input
      placeholder="What do you want to listen to?"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

export default SearchInput;
