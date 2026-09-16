export interface BaselineOption {
  id: string;
  label: string;
  file: string;
}

/** Bundled "fair" baseline templates, one matching each sample contract type. */
export const COMPARE_BASELINES: readonly BaselineOption[] = [
  {
    id: "residential-lease-fair",
    label: "Fair residential lease baseline",
    file: "residential-lease-baseline.txt",
  },
  {
    id: "freelance-services-fair",
    label: "Fair freelance agreement baseline",
    file: "freelance-services-agreement-baseline.txt",
  },
];
