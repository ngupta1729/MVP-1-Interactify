import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support — Interactify Beta",
  description: "How to get help with Interactify Beta.",
};

export default function SupportPage() {
  return (
    <main>
      <h1>Interactify Beta Support</h1>
      <p className="intro">
        Interactify turns content into interactive H5P learning activities inside
        ChatGPT — quizzes, interactive books, interactive videos, flashcards, and more.
        It&apos;s free, and doesn&apos;t require an account or sign-up.
      </p>

      <h2>Get help</h2>
      <p>
        For questions, bug reports, or feedback about Interactify, email{" "}
        <strong><a href="mailto:labswandr@gmail.com">labswandr@gmail.com</a></strong>.
        We read every message and reply directly.
      </p>

      <h2>Common questions</h2>
      <ul>
        <li>
          <strong>Do I need an account?</strong> No. Interactify has no sign-up or
          login — just add the connector in ChatGPT and start asking for an activity.
        </li>
        <li>
          <strong>What can it build?</strong> Nine H5P content types: Quiz, Interactive
          Book, Interactive Video, Accordion, Dialog Cards, Fill in the Blanks, Drag the
          Words, Single Choice Set, and Crossword.
        </li>
        <li>
          <strong>Can I edit what it makes?</strong> Yes — ask for changes
          conversationally (&quot;make question 3 harder,&quot; &quot;add two more
          flashcards&quot;) and it will regenerate the activity.
        </li>
        <li>
          <strong>How do I use the result?</strong> Every activity exports as a
          standard <code>.h5p</code> file, which you can upload to an LMS, a website
          with H5P support, or h5p.com.
        </li>
      </ul>

      <h2>Other policies</h2>
      <p>
        See our <a href="/privacy">privacy policy</a> and{" "}
        <a href="/terms">terms of service</a>.
      </p>
    </main>
  );
}
