import { ArrowRight, BadgeCheck, CircleHelp, Handshake, MapPinned, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <>
      <section className="simple-hero">
        <div className="container simple-hero-inner">
          <span className="section-kicker">About KaamConnect</span>
          <h1>Good work brings<br /><span>neighbourhoods</span> together.</h1>
          <p>We’re building a simpler way for people in Hyderabad to discover skilled local professionals — and for good work to find its next customer.</p>
          <Link className="button button-primary" to="/search">Find a professional <ArrowRight size={17} /></Link>
        </div>
      </section>
      <section className="section-block">
        <div className="container about-values">
          <article><MapPinned size={23} /><h2>Start local</h2><p>Useful connections begin nearby. Search professionals by real location and service area.</p></article>
          <article><ShieldCheck size={23} /><h2>Make trust visible</h2><p>Profiles bring services, experience and verification status together so people can make informed choices.</p></article>
          <article><Handshake size={23} /><h2>Keep it human</h2><p>Connect directly, talk through the job, and agree on the details together.</p></article>
        </div>
      </section>
    </>
  )
}

const steps = [
  { icon: MapPinned, title: 'Search your area', text: 'Choose a service and search around your location. Browse nearby professionals sorted by distance.' },
  { icon: BadgeCheck, title: 'Compare profiles', text: 'Review services, experience, ratings and verification details before reaching out.' },
  { icon: Handshake, title: 'Connect directly', text: 'Call or message on WhatsApp to discuss the work, availability and price.' },
]

export function HowItWorksPage() {
  return (
    <>
      <section className="simple-hero soft-hero">
        <div className="container simple-hero-inner">
          <span className="section-kicker">Simple from the start</span>
          <h1>From “I need help”<br />to <span>“sorted.”</span></h1>
          <p>Find the right local professional in three straightforward steps.</p>
        </div>
      </section>
      <section className="section-block">
        <div className="container steps-grid">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article className="step-card" key={title}>
              <span className="step-number">0{index + 1}</span><span className="step-icon"><Icon size={24} /></span>
              <h2>{title}</h2><p>{text}</p>
            </article>
          ))}
        </div>
        <div className="center-cta"><Link className="button button-primary" to="/search">Find nearby professionals <ArrowRight size={17} /></Link></div>
      </section>
    </>
  )
}

const faqs = [
  ['How do I find professionals near me?', 'Open Find a professional, choose the service and radius, then use your browser location or enter coordinates. Results are ordered by distance.'],
  ['How do I contact a professional?', 'Open a profile to call the listed number or start a WhatsApp conversation. Confirm scope, schedule and price directly with the professional.'],
  ['Are all professionals verified?', 'Verification status is shown on each public profile. A verified badge is displayed only when the profile has been approved.'],
  ['Can one account be both a customer and a professional?', 'Yes. You can enable the professional role during signup or join later with your existing account.'],
  ['Can I book or pay through KaamConnect?', 'Booking and payment workflows are not available in this version. Please contact the professional directly and agree on the work before it begins.'],
]

export function FaqPage() {
  return (
    <section className="section-block faq-page">
      <div className="container faq-layout">
        <div className="faq-intro">
          <span className="section-kicker">Good to know</span>
          <h1>Questions,<br />answered.</h1>
          <p>Everything you need to get started with KaamConnect.</p>
          <span className="faq-art"><CircleHelp size={74} strokeWidth={1.2} /><Sparkles size={25} /></span>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}<span className="faq-plus">+</span></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
