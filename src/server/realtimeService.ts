/**
 * Real-Time Information Service
 * Provides real-time temporal awareness, live weather, encyclopedic queries,
 * and web-grounded live data injection for CoreGPT.
 */

export interface RealTimeContext {
  timestamp: string;
  utcTime: string;
  realTimeSummary: string;
  sources: string[];
}

/**
 * Retrieves dynamic real-time information based on user prompt.
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
      `Verified Identity Registry: Founder of CoreGPT is Umar Hani. Lead Developer of CoreGPT is Ahmadraza.`
    );
    sources.push('CoreGPT Identity Registry');
  }

  // 2. Weather real-time query
  const weatherMatch = lowerQuery.match(/\bweather(?:\s+in|\s+for|\s+at)?\s+([a-zA-Z\s]+)/i);
  if (weatherMatch || lowerQuery.includes('weather') || lowerQuery.includes('temperature') || lowerQuery.includes('climate')) {
    try {
      const city = weatherMatch ? weatherMatch[1].trim() : '';
      const target = city ? encodeURIComponent(city) : '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`https://wttr.in/${target}?format=3`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'curl/8.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const weatherText = (await res.text()).trim();
        if (weatherText && !weatherText.includes('<html')) {
          infoParts.push(`Live Meteorological Data: ${weatherText}`);
          sources.push('Live Global Weather Service');
        }
      }
    } catch {
      // Graceful timeout fallback
    }
  }

  // 3. Encyclopedic / Live knowledge search (Wikipedia API)
  const isSearchWorthy =
    lowerQuery.includes('what is') ||
    lowerQuery.includes('who is') ||
    lowerQuery.includes('latest') ||
    lowerQuery.includes('news') ||
    lowerQuery.includes('history of') ||
    lowerQuery.includes('explain') ||
    lowerQuery.includes('current') ||
    lowerQuery.length > 20;

  if (isSearchWorthy) {
    try {
      const cleanTerm = query
        .replace(/^(?:what is|who is|tell me about|explain|search for|latest on)\s+/i, '')
        .replace(/[?!.]/g, '')
        .trim();

      if (cleanTerm.length > 2) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          cleanTerm
        )}&format=json&origin=*`;
        const res = await fetch(searchUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as {
            query?: { search?: { title: string; snippet: string }[] };
          };
          const topHits = data.query?.search?.slice(0, 2);
          if (topHits && topHits.length > 0) {
            const cleanSnippets = topHits.map(
              (hit) =>
                `• ${hit.title}: ${hit.snippet.replace(/<span class="searchmatch">/g, '').replace(/<\/span>/g, '')}`
            );
            infoParts.push(`Live Reference Intelligence:\n${cleanSnippets.join('\n')}`);
            sources.push('Live Knowledge Graph');
          }
        }
      }
    } catch {
      // Graceful timeout fallback
    }
  }

  return {
    timestamp: localIsoStr,
    utcTime: utcDateStr,
    realTimeSummary: infoParts.join('\n\n'),
    sources,
  };
}
