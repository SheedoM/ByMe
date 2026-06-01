import { Link } from 'react-router-dom'
import PublicNav from '../components/layout/PublicNav'
import { useLanguage } from '../i18n'

export default function Landing() {
  const { t } = useLanguage()
  const features = [
    { icon: '📤', title: t('featureUploadTitle'), desc: t('featureUploadDesc') },
    { icon: '🧠', title: t('featureLearnTitle'), desc: t('featureLearnDesc') },
    { icon: '✍', title: t('featureGenerateTitle'), desc: t('featureGenerateDesc') },
  ]

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-amber-light border border-amber/30 text-amber-dark text-xs font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
            {t('heroBadge')}
          </div>

          <h1 className="font-serif text-6xl sm:text-7xl font-light text-ink leading-[1.1] tracking-tight mb-6">
            {t('heroTitle')}
            <br />
            <span className="italic text-muted">{t('heroTitleAccent')}</span>
          </h1>

          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed mb-10">
            {t('heroCopy')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-ink text-paper
                px-8 py-4 rounded-2xl text-sm font-medium hover:bg-ink/90 transition-all
                hover:shadow-lg hover:shadow-ink/10 active:scale-[0.98]"
            >
              {t('getStartedFree')}
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-surface text-ink
                border border-border px-8 py-4 rounded-2xl text-sm font-medium
                hover:bg-border transition-all active:scale-[0.98]"
            >
              {t('navSignIn')}
            </Link>
          </div>

          <p className="text-xs text-muted mt-4">
            {t('freeTierNote')}
          </p>
        </section>

        {/* Divider */}
        <div className="border-t border-border mb-16" />

        {/* Features */}
        <section className="pb-24">
          <h2 className="font-serif text-3xl font-light text-ink text-center mb-12">
            {t('howItWorks')}
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
            {t('bottomCtaTitle')}
          </h2>
          <p className="text-muted text-sm mb-8 max-w-sm mx-auto">
            {t('bottomCtaCopy')}
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-amber text-paper px-8 py-4
              rounded-2xl text-sm font-medium hover:bg-amber-dark transition-all
              hover:shadow-lg hover:shadow-amber/20 active:scale-[0.98]"
          >
            {t('startForFree')} →
          </Link>
        </section>
      </main>
    </div>
  )
}
