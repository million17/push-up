import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg' | 'xl';
  block?: boolean;
}

export function Button({ variant = 'primary', size = 'lg', block, className = '', ...rest }: Props) {
  const cls = ['btn', `btn-${variant}`, `btn-${size}`, block ? 'btn-block' : '', className].filter(Boolean).join(' ');
  return <button type="button" className={cls} {...rest} />;
}
