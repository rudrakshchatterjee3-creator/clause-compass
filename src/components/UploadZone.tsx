"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { CompassIcon } from "@/components/icons/CompassIcon";

const ACCEPT = "application/pdf,text/plain,text/markdown,.pdf,.txt,.md,.markdown";

interface SampleContract {
  path: string;
  fileName: string;
  label: string;
}

const SAMPLES: SampleContract[] = [
  {
    path: "/samples/residential-lease.txt",
    fileName: "residential-lease.txt",
    label: "Residential lease",
  },
  {
    path: "/samples/freelance-services-agreement.txt",
    fileName: "freelance-services-agreement.txt",
    label: "Freelance agreement",
  },
];

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadZone({ onFileSelected }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState<string | null>(null);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) onFileSelected(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFileSelected(file);
    event.target.value = "";
  }

  async function handleSample(sample: SampleContract) {
    setSampleLoading(sample.fileName);
    try {
      const response = await fetch(sample.path);
      const text = await response.text();
      onFileSelected(new File([text], sample.fileName, { type: "text/plain" }));
    } finally {
      setSampleLoading(null);
    }
  }

  return (
    <div className="w-full max-w-xl">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-harbor bg-harbor-soft" : "border-line bg-paper-raised"
        }`}
      >
        <input
          ref={inputRef}
          id="contract-file-input"
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          className="peer sr-only"
        />
        <label
          htmlFor="contract-file-input"
          className="block cursor-pointer rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-harbor peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper-raised"
        >
          <CompassIcon className="mx-auto h-10 w-10 text-harbor" />
          <p className="mt-3 font-display text-lg font-medium text-ink">Drop a contract here</p>
          <p className="mt-1 text-sm text-ink-soft">or choose a file from your computer</p>
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 inline-flex items-center rounded-full bg-harbor px-5 py-2 text-sm font-medium text-paper-raised transition-colors hover:bg-harbor/90"
        >
          Choose file
        </button>
        <p className="mt-3 text-xs text-ink-soft">PDF, TXT, or Markdown — up to 10 MB.</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-ink-soft">Try a sample:</span>
        {SAMPLES.map((sample) => (
          <button
            key={sample.fileName}
            type="button"
            onClick={() => handleSample(sample)}
            disabled={sampleLoading !== null}
            className="rounded-full border border-line bg-paper-raised px-3 py-1.5 font-medium text-harbor transition-colors hover:border-harbor disabled:opacity-60"
          >
            {sampleLoading === sample.fileName ? "Loading…" : sample.label}
          </button>
        ))}
      </div>
    </div>
  );
}
