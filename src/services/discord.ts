/**
 * Discord webhook routing for bug reports, feedback, and feature requests.
 */

import type { ReportType } from "../components/ReportModal";

const WEBHOOKS = {
  bugs: "https://discord.com/api/webhooks/1345984974939615252/IFjSFKBOIKxVixBH6VK9mzDiWKQH-OLMeCZHSl8B2nCH0d6_YuF3Gz9pSe_xOzJhvwU-",
  features: "https://discord.com/api/webhooks/1345985074701361162/a4nLl0QeLCb5wNe4Kqqs-CvkBi3FffNqOBcDCsPaLNSKHgEGPMZI-ywKuUEi6sweuQH_",
  changelog: "",
  telemetry: "",
} as const;

/** Route report type to the correct webhook URL. */
export function getWebhookUrl(type: ReportType): string | undefined {
  switch (type) {
    case "bug":
    case "feedback":
      return WEBHOOKS.bugs || undefined;
    case "feature":
      return WEBHOOKS.features || undefined;
    default:
      return undefined;
  }
}

/** Send a Discord embed to the appropriate webhook. */
export async function sendDiscordEmbed(
  type: ReportType,
  title: string,
  description: string,
  fields?: { name: string; value: string; inline?: boolean }[],
): Promise<boolean> {
  const url = getWebhookUrl(type);
  if (!url) return false;

  const color = type === "bug" ? 0xe74c3c : type === "feature" ? 0x3498db : 0x2ecc71;

  const payload = {
    embeds: [{
      title,
      description,
      color,
      fields: fields ?? [],
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
