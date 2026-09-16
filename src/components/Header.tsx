import { CompassIcon } from "@/components/icons/CompassIcon";

export function Header() {
  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-4 sm:px-6">
        <CompassIcon className="h-7 w-7 text-harbor" />
        <span className="font-display text-xl font-semibold tracking-tight text-ink">
          Clause Compass
        </span>
      </div>
      <div className="border-t border-line bg-brass-soft">
        <p className="mx-auto max-w-6xl px-4 py-2 text-sm text-ink-soft sm:px-6">
          <strong className="font-semibold text-ink">Information, not legal advice.</strong>{" "}
          Clause Compass explains what a document says. For decisions that matter, talk to a
          licensed attorney.
        </p>
      </div>
    </header>
  );
}
