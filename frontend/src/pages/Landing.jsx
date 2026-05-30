import { Link } from 'react-router-dom'
import PublicNav from '../components/layout/PublicNav'

const features = [
  {
    icon: '📤',
    title: 'Upload once',
    desc: 'Export your LinkedIn posts and upload the CSV. That\'s all the training data we need.',
  },
  {
    icon: '🧠',
    title: 'We learn your style',
    desc: 'AI analyses your tone, structure, vocab, and patterns to build a precise style profile.',
  },
  {
    icon: '✍',
    title: 'Generate in your voice',
    desc: 'Type a topic and key points. Get a post that sounds exactly like you — not like ChatGPT.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-amber-light border border-amber/30 text-amber-dark text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
            LinkedIn post generator that actually sounds like you
          </div>

          <h1 className="font-serif text-6xl sm:text-7xl font-light text-ink leading-[1.1] tracking-tight mb-6">
            Write like you.
            <br />
            <span className="italic text-muted">Always.</span>
          </h1>

          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed mb-10">
            ByMe learns your unique LinkedIn writing style from your past posts —
            then generates new ones that are unmistakably <em>you</em>.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-ink text-paper
                px-8 py-4 rounded-2xl text-sm font-medium hover:bg-ink/90 transition-all
                hover:shadow-lg hover:shadow-ink/10 active:scale-[0.98]"
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-surface text-ink
                border border-border px-8 py-4 rounded-2xl text-sm font-medium
                hover:bg-border transition-all active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-muted mt-4">
            Free tier: 10 posts/month. No credit card needed.
          </p>
        </section>

        {/* Divider */}
        <div className="border-t border-border mb-16" />

        {/* Features */}
        <section className="pb-24">
          <h2 className="font-serif text-3xl font-light text-ink text-center mb-12">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-surface rounded-2xl p-6 hover:bg-surface/80 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-medium text-ink mb-2">{f.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="text-center pb-24 border-t border-border pt-16">
          <h2 className="font-serif text-4xl font-light text-ink mb-4">
            Ready to write like you?
          </h2>
          <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
            Upload your LinkedIn posts, choose your plan, and start generating.
            Takes less than 2 minutes.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-amber text-paper px-8 py-4
              rounded-2xl text-sm font-medium hover:bg-amber-dark transition-all
              hover:shadow-lg hover:shadow-amber/20 active:scale-[0.98]"
          >
            Start for free →
          </Link>
        </section>
      </main>
    </div>
  )
}
