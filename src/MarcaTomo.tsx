/** A mesma marca tipográfica no app, no formulário e na abertura. */
export function MarcaTomo({ className = '' }: { className?: string }) {
  return <span className={`brand-logo ${className}`.trim()}>To<span>mo</span></span>;
}
