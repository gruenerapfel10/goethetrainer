import { MuaLogo } from "@/components/mua-logo"

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <MuaLogo className="h-8 w-auto text-white" />
            <span className="text-sm text-zinc-400">&copy; 2025 MUA. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <a href="#" className="text-zinc-400 hover:text-white">
              Terms
            </a>
            <a href="#" className="text-zinc-400 hover:text-white">
              Privacy
            </a>
            <a href="#" className="text-zinc-400 hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}