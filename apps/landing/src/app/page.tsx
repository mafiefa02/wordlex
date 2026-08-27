export default function Home() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold">WordleX</h1>
      <p className="mt-2 text-sm">
        One word a day, in four languages. The landing page goes here.
      </p>
      <a
        className="mt-6 inline-block text-sm underline"
        href={process.env.NEXT_PUBLIC_PLAY_URL ?? "http://localhost:3001"}
      >
        Play today
      </a>
    </main>
  );
}
