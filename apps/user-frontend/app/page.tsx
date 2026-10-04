import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 text-white">
      <h1 className="text-5xl font-bold tracking-tight">
        Decentralized Fiverr
      </h1>
      <p className="text-zinc-400 text-lg max-w-md text-center">
        Pay workers in SOL to pick the best thumbnail for your content.
      </p>
      <div className="flex gap-4 mt-4">
        <Link
          href="/login"
          className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition"
        >
          Connect Wallet
        </Link>
        <Link
          href="/dashboard"
          className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold hover:bg-zinc-800 transition"
        >
          Dashboard →
        </Link>
      </div>
    </main>
  );
}
