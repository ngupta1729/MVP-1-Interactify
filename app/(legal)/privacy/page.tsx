import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Interactify Beta",
  description:
    "What Interactify Beta collects, why, how long it's kept, and your rights.",
};

export default function PrivacyPage() {
  return (
    <main>
      <h1>Interactify Beta Privacy Policy</h1>
      <p className="meta">Effective and last updated: October 2, 2026</p>

      <p className="intro">
        Interactify turns content into interactive H5P learning activities inside
        ChatGPT. This page explains, plainly, what data we collect when you use it,
        why, and what control you have.
      </p>

      <h2>1. What we collect</h2>
      <p>Interactify has no accounts, no sign-up, and no login. What we collect is limited to:</p>
      <ul>
        <li>
          <strong>An anonymized identifier.</strong> When you use Interactify through
          ChatGPT, OpenAI&apos;s platform provides us a per-user identifier. We never
          store that value itself — we immediately one-way hash it (combined with a
          secret only we hold) before saving anything, so the stored value cannot be
          reversed back to the original or to your ChatGPT account.
        </li>
        <li>
          <strong>Usage events.</strong> Which action you took (e.g. &quot;generated a
          quiz,&quot; &quot;downloaded a file,&quot; &quot;clicked through to
          h5p.com&quot;) and when, tied to the anonymized identifier above.
        </li>
        <li>
          <strong>A one-tap satisfaction rating.</strong> Before downloading a file,
          you&apos;re asked a single required question (&quot;How happy are you with
          this?&quot;), plus an optional free-text box. We ask this to improve the
          product — it is not a quality check on your content.
        </li>
      </ul>

      <h2>2. What we deliberately don&apos;t collect</h2>
      <p>We never collect: your name, email, or any account details; payment or financial information; government-issued ID numbers; passwords or authentication credentials; health or medical information; or your raw conversation history.</p>
      <p>
        The learning content you generate (quizzes, books, etc.) is built on demand
        and returned to you — we do not maintain a searchable archive of everyone&apos;s
        created content tied to an identity.
      </p>

      <h2>3. Why we collect it</h2>
      <p>
        Solely to understand how Interactify is actually used and to improve it —
        which content types matter, where people get stuck, whether the tool is worth
        continuing to build. We do not sell data, use it for advertising, or share it
        with anyone except the infrastructure providers described below.
      </p>

      <h2>4. Who processes it</h2>
      <p>Interactify runs on two infrastructure providers, who process data on our behalf as part of hosting the app:</p>
      <ul>
        <li><strong>Vercel</strong> — application hosting</li>
        <li><strong>Neon</strong> — database storage (events and survey responses described above)</li>
      </ul>
      <p>
        Interactify currently runs on these providers&apos; free-tier plans.
        Vercel&apos;s formal Data Processing Agreement is only issued on their paid
        Enterprise/Pro plans — it is not available to us at our current plan tier.
        We&apos;re telling you this rather than implying a level of formal contractual
        coverage we don&apos;t actually have. In practice, this affects contractual
        paperwork, not what data is collected or how carefully we try to minimize it —
        the minimization described in this policy is the actual, primary protection in
        place. Both providers operate infrastructure in the United States.
      </p>

      <h2>5. How long we keep it</h2>
      <p>
        We keep usage events and survey responses for up to <strong>12 months</strong>{" "}
        from when they&apos;re recorded. This isn&apos;t just a stated intent — an
        automated daily process permanently deletes anything older than that on its
        own; nothing is kept indefinitely &quot;just in case.&quot;
      </p>

      <h2>6. Your rights and their real limits</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, or delete
        data about you (for example, under GDPR if you&apos;re in the EU/UK, or similar
        state laws in the US). We want to be honest about a practical constraint:
        because we don&apos;t collect your name, email, or account details, we
        generally have no way to look up which anonymized records, if any, belong to
        you — there&apos;s no connection from &quot;who you are&quot; to &quot;which
        rows are yours&quot; that we can follow.
      </p>
      <p>
        If you contact us with a request, we&apos;ll do what&apos;s actually possible:
        if you can provide enough detail to plausibly identify your own records (such
        as an anonymized identifier, if you have one, or specifics about when and what
        you created), we&apos;ll search for and delete matching rows by hand. We&apos;ll
        answer questions about this policy and look into anything that seems like a
        genuine problem. We won&apos;t claim we can do more precisely than that without
        an account system in place.
      </p>

      <h2>7. Age</h2>
      <p>
        Interactify is intended for users 13 and older, consistent with ChatGPT&apos;s
        own terms. We don&apos;t knowingly collect data from anyone under 13.
      </p>

      <h2>8. Changes to this policy</h2>
      <p>
        If what we collect or why changes, we&apos;ll update this page and change the
        date at the top. We won&apos;t quietly expand what&apos;s collected without
        updating this document to match.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about this policy, or a request regarding your data: see our{" "}
        <a href="/support">support page</a>, or email{" "}
        <a href="mailto:labswandr@gmail.com">labswandr@gmail.com</a> directly.
      </p>
    </main>
  );
}
