'use client';

export function AppNavbar() {
  return (
    <nav className="bg-sidebar text-sidebar-foreground px-6 py-3 flex items-center justify-between flex-shrink-0 h-14 border-0">
      <div className="text-base font-semibold">Goethe Trainer</div>
      <div className="flex items-center gap-2">
        <button className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground px-3 py-2 rounded text-sm transition-colors">Profile</button>
        <button className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground px-3 py-2 rounded text-sm transition-colors">Settings</button>
      </div>
    </nav>
  );
}
