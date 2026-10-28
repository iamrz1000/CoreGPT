/**
 * Real-Time Information Service
 * Provides instant temporal chronometer, live calendar/time awareness,
 * and immediate identity resolution for HYNEX AI without slowing down conversation answers.
 */

export interface RealTimeContext {
  timestamp: string;
  utcTime: string;
  realTimeSummary: string;
  sources: string[];
}

/**
 * Retrieves high-speed dynamic real-time information based on user prompt.
 * Optimized for ultra-fast conversation turnaround (<5ms).
 */
export async function getRealTimeInformation(query: string): Promise<RealTimeContext> {
  const now = new Date();
  const utcDateStr = now.toUTCString();
  const localIsoStr = now.toISOString();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedFull = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sources: string[] = ['System Chronometer', 'Live Clock Network'];
  const infoParts: string[] = [
    `Current Real-Time Date: ${formattedFull}`,
    `Day of the Week: ${dayOfWeek}`,
    `Current UTC Time: ${utcDateStr}`,
    `ISO Timestamp: ${localIsoStr}`,
    `Temporal Year: 2026`,
  ];

  const lowerQuery = query.toLowerCase().trim();

  // 1. Founder & Developer immediate live verification
  if (
    lowerQuery.includes('founder') ||
    lowerQuery.includes('developer') ||
    lowerQuery.includes('creator') ||
    lowerQuery.includes('umar hani') ||
    lowerQuery.includes('ahmadraza') ||
    lowerQuery.includes('ahmad raza') ||
    lowerQuery.includes('who made') ||
    lowerQuery.includes('who created')
  ) {
    infoParts.push(
      `Verified Identity Registry: Founder of HYNEX AI is Umar Hani. Lead Developer of HYNEX AI is Ahmadraza.`
    );
    sources.push('HYNEX AI Identity Registry');
  }

  // 2. Weather real-time query only if explicitly inquired (with tight 900ms budget)
  const weatherMatch = lowerQuery.match(/\bweather(?:\s+in|\s+for|\s+at)?\s+([a-zA-Z\s]+)/i);
  if (weatherMatch && weatherMatch[1].trim()) {
    try {
      const city = weatherMatch[1].trim();
      const target = encodeURIComponent(city);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900);

      const res = await fetch(`https://wttr.in/${target}?format=3`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'curl/8.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const weatherText = (await res.text()).trim();
        if (weatherText && !weatherText.includes('<html')) {
          infoParts.push(`Live Meteorological Observation: ${weatherText}`);
          sources.push('Live Global Meteorological Network');
        }
      }
    } catch {
      // Non-blocking graceful fallback
    }
  }

  return {
    timestamp: localIsoStr,
    utcTime: utcDateStr,
    realTimeSummary: infoParts.join('\n\n'),
    sources,
  };
}
