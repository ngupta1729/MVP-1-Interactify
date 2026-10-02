export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal">
      <style>{`
        .legal {
          max-width: 700px;
          margin: 0 auto;
          padding: 48px 20px 80px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.65;
          color: #1c1d1f;
          background: #faf9f6;
        }
        .legal h1 { font-size: 1.8em; font-weight: 700; margin: 0 0 6px; }
        .legal .meta { color: #6b6e75; font-size: 0.9em; margin-bottom: 36px; }
        .legal h2 { font-size: 1.15em; font-weight: 700; margin: 36px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e4e1da; }
        .legal p { margin: 0 0 14px; }
        .legal ul { margin: 0 0 14px; padding-left: 1.4em; }
        .legal li { margin: 6px 0; }
        .legal a { color: #1a5fc4; }
        .legal strong { font-weight: 600; }
        .legal .intro {
          font-size: 1.05em; color: #3a3d42; border-left: 3px solid #1a5fc4;
          padding-left: 16px; margin: 24px 0 36px;
        }
      `}</style>
      {children}
    </div>
  );
}
