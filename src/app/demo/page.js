'use client';
import { Button } from '@/';

export default function Demo() {
  return (
    <div className="bg-black flex items-center justify-center gap-1 min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
  <Button onClick={() => alert('Clicked!')} text='1' size='sm' />
  
</div>
    
  );
}
