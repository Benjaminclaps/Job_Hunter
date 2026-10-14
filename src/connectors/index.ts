import { ashbyConnector } from "./ashby";
import { greenhouseConnector } from "./greenhouse";
import { leverConnector } from "./lever";
import type { JobConnector } from "./types";

const connectors: Record<string, JobConnector> = {
  greenhouse: greenhouseConnector,
  lever: leverConnector,
  ashby: ashbyConnector,
};

export function getConnector(kind: string): JobConnector {
  const connector = connectors[kind];
  if (!connector) throw new Error(`No existe un conector automático para ${kind}.`);
  return connector;
}

export type { NormalizedJob } from "./types";
