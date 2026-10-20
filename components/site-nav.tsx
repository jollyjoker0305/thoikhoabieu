import Link from 'next/link';

const links = [
  { href: '/', label: 'Trang chủ', id: 'home' },
  { href: '/thoi-khoa-bieu', label: 'Thời khóa biểu', id: 'schedule' },
  { href: '/bang', label: 'Note việc', id: 'board' },
] as const;

export function SiteNav({ current }: { current: (typeof links)[number]['id'] }) {
  return (
    <nav className="feature-switch" aria-label="Mục">
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={current === link.id ? 'btn btn-primary' : 'btn'}
          aria-current={current === link.id ? 'page' : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
