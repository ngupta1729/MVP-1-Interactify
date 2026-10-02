import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Interactify Beta",
  description: "The terms that apply when you use Interactify Beta.",
};

export default function TermsPage() {
  return (
    <main>
      <h1>Interactify Beta Terms of Service</h1>
      <p className="meta">Effective and last updated: October 2, 2026</p>

      <p className="intro">
        Interactify Beta (&quot;Interactify,&quot; &quot;we,&quot; &quot;us&quot;) is a
        free app, built by Wandr Labs, that runs inside ChatGPT and turns content you
        provide into interactive H5P learning activities. By using it, you agree to
        these terms.
      </p>

      <h2>1. What the service is</h2>
      <p>
        Interactify is an MCP (Model Context Protocol) tool connector for ChatGPT. It
        generates H5P content packages (quizzes, interactive books, interactive videos,
        flashcards, and other interactive formats) from content and instructions you
        provide in conversation, and lets you export the result as a standard{" "}
        <code>.h5p</code> file. It is free to use, requires no account or sign-up, and
        is currently offered as a beta — it may change, break, or be withdrawn as we
        keep developing it.
      </p>

      <h2>2. Your content</h2>
      <p>
        You retain ownership of the source material you provide (lecture notes, video
        links, vocabulary lists, and so on) and of the H5P activity Interactify
        generates from it. We don&apos;t claim any ownership over what you create or
        upload. You&apos;re responsible for having the right to use any content you
        provide — don&apos;t submit material you don&apos;t have permission to use.
      </p>

      <h2>3. Acceptable use</h2>
      <p>Don&apos;t use Interactify to generate content that is illegal, that infringes someone else&apos;s rights, or that is intended to harass, deceive, or harm others. Don&apos;t attempt to abuse, overload, or circumvent rate limits or other safeguards on the service.</p>

      <h2>4. No warranty</h2>
      <p>
        Interactify is provided &quot;as is,&quot; without warranties of any kind. We
        don&apos;t guarantee that generated activities will be free of errors, that the
        service will be uninterrupted or available at all times, or that it will meet
        your specific requirements. You&apos;re responsible for reviewing generated
        content before using it with students or anyone else.
      </p>

      <h2>5. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Wandr Labs is not liable for any
        indirect, incidental, or consequential damages arising from your use of
        Interactify. Because the service is free, our total liability for any claim
        relating to it is limited to zero.
      </p>

      <h2>6. Third-party content</h2>
      <p>
        Interactive Video activities are built around YouTube videos you supply via
        URL. We don&apos;t host, control, or vouch for the availability or content of
        third-party videos, and your use of YouTube itself is governed by YouTube&apos;s
        own terms, not these.
      </p>

      <h2>7. Changes to the service and these terms</h2>
      <p>
        We may update Interactify, or these terms, as the product develops. If we make
        a material change to these terms, we&apos;ll update the date at the top of this
        page.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these terms: see our <a href="/support">support page</a>, or
        email <a href="mailto:labswandr@gmail.com">labswandr@gmail.com</a> directly.
      </p>
    </main>
  );
}
