import Image from 'next/image'
import { Anchor, Shield, FileText } from 'lucide-react'

export default function ThumbnailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950">
      <div className="flex h-[675px] w-[1200px] flex-col items-center justify-center gap-4 p-16">
        {/* Logo */}
        <Image src="/galeon-logo.png" alt="Galeon" width={260} height={260} />

        {/* Title */}
        <div className="text-center">
          <h1 className="text-7xl font-bold tracking-tight text-white">Galeon</h1>
          <p className="mt-3 text-3xl font-medium text-cyan-400">
            Private payments. Full compliance.
          </p>
        </div>

        {/* Three pillars */}
        <div className="mt-4 flex gap-6">
          <div className="flex items-center gap-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-3">
            <Anchor className="h-6 w-6 text-cyan-400" />
            <span className="text-xl font-medium text-cyan-100">Stealth Addresses</span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-3">
            <Shield className="h-6 w-6 text-cyan-400" />
            <span className="text-xl font-medium text-cyan-100">Privacy Pool</span>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-3">
            <FileText className="h-6 w-6 text-emerald-400" />
            <span className="text-xl font-medium text-emerald-100">Compliance</span>
          </div>
        </div>

        {/* Tagline */}
        <p className="mt-2 text-xl text-cyan-100/60">ZK-powered &middot; Open source</p>
      </div>
    </div>
  )
}
