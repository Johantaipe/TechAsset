const paths = {
  inventario: 'M3 4h18v12H3zM8 20h8m-4-4v4',
  prestamos: 'M4 7h16m-4-4 4 4-4 4m4 6H4m4-4-4 4 4 4',
  enlace: 'M5 12h14m-6-6 6 6-6 6',
  accessibility: 'M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM3 8l9 2 9-2M12 10v5m0 0-4 7m4-7 4 7',
  profile: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  chevron: 'm6 9 6 6 6-6',
  logout: 'M10 17l5-5-5-5m5 5H3m9-8h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  moon: 'M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3Z',
  total: 'M5 3h14v18H5ZM8 8h8M8 12h8M8 16h5', pending: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', approved: 'm7 12 3 3 7-7M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', rejected: 'm8 8 8 8M16 8l-8 8M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', inicio: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z', nueva: 'M12 5v14M5 12h14', ambientes: 'M3 21V5h12v16M15 10h6v11M7 9h4M7 13h4M7 17h4M1 21h22', usuarios: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M20 21v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 3a4 4 0 0 1 0 8', agenda: 'M4 5h16v16H4ZM8 3v4M16 3v4M4 11h16M8 15h2M14 15h2' };
export function Icono({ nombre }: { nombre: string }) {
 return <svg className="nav-icon icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[nombre as keyof typeof paths] || 'M5 3h14v18H5ZM8 8h8M8 12h8M8 16h5'} /></svg>;
}
